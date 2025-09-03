# /app/services/waste_service.py

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func
from typing import List, Tuple, Optional, Dict, Any
from datetime import datetime, timedelta

from app.models_db import Item as DBItem, Container as DBContainer, Placement as DBPlacement, LogActionType, ItemStatus, Log
from app.models_api import (WasteItemResponse, WasteIdentifyResponse, WasteReturnPlanRequest,
                            WasteReturnPlanStep, WasteReturnManifestItem, WasteReturnManifest,
                            WasteReturnPlanResponse, WasteCompleteUndockingRequest, WasteCompleteUndockingResponse,
                            Position, Coordinates, RetrievalStep)
from .logging_service import create_log_entry
from .retrieval_service import get_blocking_items
import app.utils.geometry as geometry

def identify_waste_items(db: Session, include_expiring_soon: bool = True, expiring_days_threshold: int = 30) -> WasteIdentifyResponse:
    """
    Identifies and returns expired, depleted, and broken items with valid container information.
    Also includes items that are expiring soon for proactive management.
    """
    current_time = datetime.utcnow()
    current_date = current_time.date()

    # Step 1: Fetch all active items that might be expired, depleted, or broken
    active_items = db.query(DBItem).filter(
        DBItem.status == ItemStatus.ACTIVE
    ).all()

    # Step 2: Check each item for expiry, depletion, or broken status
    for item in active_items:
        try:
            # Check for expiry
            if item.expiry_date and item.expiry_date != "N/A":
                expiry_date_str = item.expiry_date
                try:
                    # Try parsing ISO format first (with timezone)
                    if 'T' in expiry_date_str:
                        expiry_date = datetime.fromisoformat(expiry_date_str.replace('Z', '+00:00')).date()
                    else:
                        # Simple date format: "2021-03-29"
                        expiry_date = datetime.strptime(expiry_date_str, "%Y-%m-%d").date()
                    
                    if expiry_date < current_date:
                        item.status = ItemStatus.WASTE_EXPIRED
                        create_log_entry(
                            db=db,
                            action_type=LogActionType.SIMULATION_EXPIRED,
                            item_id=item.item_id,
                            details={"reason": f"Expiry date {item.expiry_date} reached at {current_time}"}
                        )
                        continue  # Skip depletion check if already expired
                except (ValueError, TypeError) as e:
                    print(f"Warning: Invalid date format for item {item.item_id}: {item.expiry_date} - Error: {e}")
                    continue

            # Check for depletion (current_uses >= maximum_uses)
            if item.maximum_uses and item.maximum_uses != "N/A":
                try:
                    maximum_uses_int = int(item.maximum_uses)
                    current_uses = getattr(item, 'current_uses', 0)
                    if current_uses >= maximum_uses_int:
                        item.status = ItemStatus.WASTE_DEPLETED
                        create_log_entry(
                            db=db,
                            action_type=LogActionType.SIMULATION_DEPLETED,
                            item_id=item.item_id,
                            details={"reason": f"Usage limit reached: {current_uses}/{maximum_uses_int}"}
                        )
                except (ValueError, TypeError):
                    # Skip items with invalid maximum_uses format
                    continue

        except Exception as e:
            # Skip items with any other errors
            print(f"Warning: Error processing item {item.item_id}: {e}")
            continue

    # Commit status changes
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error committing waste status updates: {e}")
        create_log_entry(db, LogActionType.SYSTEM_ERROR, details={"error": f"Failed to update waste statuses: {e}"})

    # Step 3: Fetch all waste items (expired, depleted, broken) with their placements
    waste_items = db.query(DBItem).filter(
        DBItem.status.in_([ItemStatus.WASTE_EXPIRED, ItemStatus.WASTE_DEPLETED, ItemStatus.BROKEN])
    ).all()

    # Step 4: Also fetch items expiring soon if requested
    expiring_soon_items = []
    if include_expiring_soon:
        expiring_soon_items = db.query(DBItem).filter(
            and_(
                DBItem.status == ItemStatus.ACTIVE,
                DBItem.expiry_date != None,
                DBItem.expiry_date != "N/A"
            )
        ).all()

    print(f"Found {len(waste_items)} waste items and {len(expiring_soon_items)} items expiring soon")

    # Construct response for waste items
    waste_items_response: List[WasteItemResponse] = []
    
    # Process actual waste items
    for item in waste_items:
        placement = db.query(DBPlacement).filter(DBPlacement.item_id_fk == item.item_id).first()

        if placement:
            container_id = placement.container_id_fk
            pos = Position(
                startCoordinates=Coordinates(width=placement.start_w, depth=placement.start_d, height=placement.start_h),
                endCoordinates=Coordinates(width=placement.end_w, depth=placement.end_d, height=placement.end_h)
            )
        else:
            continue  # If no placement, skip this item

        # Determine reason based on status
        if item.status == ItemStatus.WASTE_EXPIRED:
            reason = "Expired"
        elif item.status == ItemStatus.WASTE_DEPLETED:
            reason = "Out of Uses"
        elif item.status == ItemStatus.BROKEN:
            reason = "Broken"
        else:
            reason = "Unknown"

        waste_items_response.append(WasteItemResponse(
            item_id=item.item_id,
            name=item.name,
            category=item.category,
            subcategory=item.subcategory,
            reason=reason,
            container_id=container_id,
            position=pos,
            expiry_date=item.expiry_date,
            current_uses=item.current_uses,
            maximum_uses=item.maximum_uses
        ))

    # Process items expiring soon (add them to response with special reason)
    for item in expiring_soon_items:
        placement = db.query(DBPlacement).filter(DBPlacement.item_id_fk == item.item_id).first()
        
        if placement:
            container_id = placement.container_id_fk
            pos = Position(
                startCoordinates=Coordinates(width=placement.start_w, depth=placement.start_d, height=placement.start_h),
                endCoordinates=Coordinates(width=placement.end_w, depth=placement.end_d, height=placement.end_h)
            )
            
            # Calculate days until expiry
            try:
                if 'T' in item.expiry_date:
                    expiry_date = datetime.fromisoformat(item.expiry_date.replace('Z', '+00:00')).date()
                else:
                    expiry_date = datetime.strptime(item.expiry_date, "%Y-%m-%d").date()
                
                days_until_expiry = (expiry_date - current_date).days
                if days_until_expiry <= expiring_days_threshold:
                    reason = f"Expires in {days_until_expiry} days"
                    
                    waste_items_response.append(WasteItemResponse(
                        item_id=item.item_id,
                        name=item.name,
                        category=item.category,
                        subcategory=item.subcategory,
                        reason=reason,
                        container_id=container_id,
                        position=pos,
                        expiry_date=item.expiry_date,
                        current_uses=item.current_uses,
                        maximum_uses=item.maximum_uses
                    ))
            except (ValueError, TypeError):
                continue

    print(f"Returning {len(waste_items_response)} total items (waste + expiring soon)")
    return WasteIdentifyResponse(success=True, wasteItems=waste_items_response)

def plan_waste_return(db: Session, request_data: WasteReturnPlanRequest, user_id: Optional[str] = None) -> WasteReturnPlanResponse:
    """
    Creates a plan to move waste items to an undocking container,
    considering both weight and volume limits and calculating retrieval steps.
    """
    undocking_container_id = request_data.undockingContainerId
    max_weight = request_data.maxWeight
    max_volume = getattr(request_data, 'maxVolume', None)  # New volume limit
    current_time = datetime.utcnow()

    # 1. Identify potential waste items
    waste_placements = db.query(DBPlacement).\
        options(joinedload(DBPlacement.item)).\
        join(DBItem, DBPlacement.item_id_fk == DBItem.item_id).\
        filter(DBItem.status.in_([ItemStatus.WASTE_EXPIRED, ItemStatus.WASTE_DEPLETED, ItemStatus.BROKEN])).\
        order_by(DBItem.priority.desc(), DBItem.item_id).all()

    # 2. Select items for the return plan (considering both weight and volume)
    selected_items_for_plan: List[DBPlacement] = []
    current_weight = 0.0
    current_volume = 0.0
    manifest_items: List[WasteReturnManifestItem] = []
    total_volume = 0.0

    for placement in waste_placements:
        item = placement.item
        
        # Calculate item volume
        pos = Position(
            startCoordinates=Coordinates(width=placement.start_w, depth=placement.start_d, height=placement.start_h),
            endCoordinates=Coordinates(width=placement.end_w, depth=placement.end_d, height=placement.end_h)
        )
        item_volume = geometry.calculate_volume(pos)
        
        # Check if item fits within limits
        weight_fits = current_weight + item.mass_kg <= max_weight
        volume_fits = max_volume is None or (current_volume + item_volume <= max_volume)
        
        if weight_fits and volume_fits:
            selected_items_for_plan.append(placement)
            current_weight += item.mass_kg
            current_volume += item_volume
            
            reason = "Expired" if item.status == ItemStatus.WASTE_EXPIRED else \
                    "Out of Uses" if item.status == ItemStatus.WASTE_DEPLETED else "Broken"
            
            manifest_items.append(WasteReturnManifestItem(
                item_id=item.item_id,
                name=item.name,
                category=item.category,
                subcategory=item.subcategory,
                reason=reason,
                mass_kg=item.mass_kg,
                volume_cm3=item_volume
            ))
            total_volume += item_volume
        else:
            # Stop adding items once limits are reached
            limit_reached = "weight" if not weight_fits else "volume"
            print(f"Max {limit_reached} limit reached. Stopping waste selection.")
            break

    # 3. Generate Movement Plan and Retrieval Steps
    return_plan_steps: List[WasteReturnPlanStep] = []
    all_retrieval_steps: List[RetrievalStep] = []
    global_step_count = 1
    movement_step_count = 1

    for placement in selected_items_for_plan:
        item = placement.item
        target_pos = Position(
            startCoordinates=Coordinates(width=placement.start_w, depth=placement.start_d, height=placement.start_h),
            endCoordinates=Coordinates(width=placement.end_w, depth=placement.end_d, height=placement.end_h)
        )
        container_id = placement.container_id_fk

        # Calculate retrieval steps for this waste item
        blockers = get_blocking_items(item.item_id, target_pos, container_id, db)

        # Add steps to remove/setAside blockers
        for blocker_id, blocker_name, _ in blockers:
            all_retrieval_steps.append(RetrievalStep(
                step=global_step_count, action="setAside", item_id=blocker_id, itemName=blocker_name
            ))
            global_step_count += 1

        # Add step to retrieve the waste item itself
        all_retrieval_steps.append(RetrievalStep(
            step=global_step_count, action="retrieve", item_id=item.item_id, itemName=item.name
        ))
        global_step_count += 1

        # Add step to the Return Plan
        return_plan_steps.append(WasteReturnPlanStep(
            step=movement_step_count,
            item_id=item.item_id,
            itemName=item.name,
            fromContainer=container_id,
            toContainer=undocking_container_id
        ))
        movement_step_count += 1

        # Log that this item is part of the plan
        create_log_entry(
            db=db,
            action_type=LogActionType.DISPOSAL_PLAN,
            user_id=user_id,
            item_id=item.item_id,
            details={
                "undockingContainerId": undocking_container_id,
                "undockingDate": request_data.undockingDate.isoformat(),
                "manifestedWeight": item.mass_kg,
                "manifestedVolume": item_volume
            }
        )

    # 4. Create Manifest
    manifest = WasteReturnManifest(
        undockingContainerId=undocking_container_id,
        undockingDate=request_data.undockingDate,
        returnItems=manifest_items,
        totalVolume=total_volume,
        totalWeight=current_weight
    )

    # Commit log entries
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise ValueError(f"Failed to log waste plan actions: {e}")

    return WasteReturnPlanResponse(
        success=True,
        returnPlan=return_plan_steps,
        retrievalSteps=all_retrieval_steps,
        returnManifest=manifest
    )

def complete_undocking_process(db: Session, request_data: WasteCompleteUndockingRequest, user_id: Optional[str] = None) -> WasteCompleteUndockingResponse:
    """
    Removes items associated with the undocked container from the system.
    It looks for items PLANNED for disposal in that container.
    """
    undocking_container_id = request_data.undockingContainerId
    timestamp = request_data.timestamp or datetime.utcnow()

    # Find log entries indicating items were planned for disposal in this container
    planned_logs = db.query(Log).filter(
        Log.action_type == LogActionType.DISPOSAL_PLAN,
        Log.details_json.like(f'%"{undocking_container_id}"%')
    ).all()

    if not planned_logs:
        print(f"Warning: No disposal plan logs found containing container ID {undocking_container_id}.")

    items_to_remove_ids = {log.item_id_fk for log in planned_logs if log.item_id_fk}
    items_removed_count = 0

    if not items_to_remove_ids:
        print(f"No items found marked for disposal plan involving container {undocking_container_id}.")
        return WasteCompleteUndockingResponse(success=True, itemsRemoved=0)

    # Fetch items and their placements to remove/update status
    items_to_process = db.query(DBItem).filter(DBItem.item_id.in_(items_to_remove_ids)).all()

    for item in items_to_process:
        if item.status != ItemStatus.DISPOSED:
            item.status = ItemStatus.DISPOSED
            items_removed_count += 1

            # Delete its placement record as it's no longer physically placed
            placement = db.query(DBPlacement).filter(DBPlacement.item_id_fk == item.item_id).first()
            if placement:
                log_details = {
                    "undockingContainerId": undocking_container_id,
                    "originalContainer": placement.container_id_fk,
                    "reason": "Undocked"
                }
                create_log_entry(
                    db=db,
                    action_type=LogActionType.DISPOSAL_COMPLETE,
                    user_id=user_id,
                    item_id=item.item_id,
                    timestamp=timestamp,
                    details=log_details
                )
                db.delete(placement)
            else:
                create_log_entry(
                    db=db,
                    action_type=LogActionType.DISPOSAL_COMPLETE,
                    user_id=user_id,
                    item_id=item.item_id,
                    timestamp=timestamp,
                    details={"status": "Item disposed (status updated)", "warning": "Placement record not found"}
                )

    # Commit all deletions and status updates
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error committing undocking completion for container {undocking_container_id}: {e}")
        raise ValueError(f"Failed to complete undocking process: {e}")

    print(f"Completed undocking for container {undocking_container_id}. Items marked as disposed: {items_removed_count}")
    return WasteCompleteUndockingResponse(success=True, itemsRemoved=items_removed_count)

def predict_waste_and_resupply(db: Session, days_ahead: int = 30) -> Dict[str, Any]:
    """
    Predicts items that will become waste or need resupply in the specified number of days.
    Uses logs and item properties to make predictions.
    """
    current_time = datetime.utcnow()
    future_date = current_time + timedelta(days=days_ahead)
    
    predictions = {
        "items_expiring_soon": [],
        "items_depleting_soon": [],
        "resupply_recommendations": [],
        "total_predictions": 0
    }
    
    # 1. Predict items expiring soon
    active_items = db.query(DBItem).filter(
        and_(
            DBItem.status == ItemStatus.ACTIVE,
            DBItem.expiry_date != None,
            DBItem.expiry_date != "N/A"
        )
    ).all()
    
    for item in active_items:
        try:
            if 'T' in item.expiry_date:
                expiry_date = datetime.fromisoformat(item.expiry_date.replace('Z', '+00:00'))
            else:
                expiry_date = datetime.strptime(item.expiry_date, "%Y-%m-%d")
            
            days_until_expiry = (expiry_date - current_time).days
            
            if 0 <= days_until_expiry <= days_ahead:
                predictions["items_expiring_soon"].append({
                    "item_id": item.item_id,
                    "name": item.name,
                    "category": item.category,
                    "subcategory": item.subcategory,
                    "days_until_expiry": days_until_expiry,
                    "expiry_date": item.expiry_date,
                    "priority": item.priority,
                    "recommendation": "Consume this item first" if days_until_expiry <= 7 else f"Plan to use within {days_until_expiry} days"
                })
        except (ValueError, TypeError):
            continue
    
    # 2. Predict items depleting soon based on usage frequency
    items_with_usage = db.query(DBItem).filter(
        and_(
            DBItem.status == ItemStatus.ACTIVE,
            DBItem.maximum_uses != None,
            DBItem.maximum_uses != "N/A",
            DBItem.usage_frequency != None,
            DBItem.usage_frequency > 0
        )
    ).all()
    
    for item in items_with_usage:
        try:
            maximum_uses = int(item.maximum_uses)
            current_uses = item.current_uses
            usage_frequency = item.usage_frequency
            
            remaining_uses = maximum_uses - current_uses
            if remaining_uses > 0:
                # Calculate days until depletion based on usage frequency
                days_until_depletion = int(remaining_uses / usage_frequency)
                
                if days_until_depletion <= days_ahead:
                    predictions["items_depleting_soon"].append({
                        "item_id": item.item_id,
                        "name": item.name,
                        "category": item.category,
                        "subcategory": item.subcategory,
                        "current_uses": current_uses,
                        "maximum_uses": maximum_uses,
                        "remaining_uses": remaining_uses,
                        "usage_frequency": usage_frequency,
                        "days_until_depletion": days_until_depletion,
                        "recommendation": f"Resupply needed in {days_until_depletion} days"
                    })
        except (ValueError, TypeError):
            continue
    
    # 3. Generate resupply recommendations
    for item in predictions["items_depleting_soon"]:
        if item["days_until_depletion"] <= 14:  # Critical threshold
            predictions["resupply_recommendations"].append({
                "item_id": item["item_id"],
                "name": item["name"],
                "category": item["category"],
                "urgency": "CRITICAL" if item["days_until_depletion"] <= 7 else "HIGH",
                "days_until_depletion": item["days_until_depletion"],
                "recommended_quantity": "Immediate resupply required"
            })
    
    predictions["total_predictions"] = len(predictions["items_expiring_soon"]) + len(predictions["items_depleting_soon"])
    
    return predictions

def get_waste_analytics(db: Session, days_back: int = 30) -> Dict[str, Any]:
    """
    Provides analytics on waste generation and patterns over the specified time period.
    """
    current_time = datetime.utcnow()
    start_date = current_time - timedelta(days=days_back)
    
    analytics = {
        "period": f"Last {days_back} days",
        "total_waste_items": 0,
        "waste_by_reason": {},
        "waste_by_category": {},
        "waste_by_container": {},
        "daily_waste_trend": [],
        "top_waste_generators": []
    }
    
    # Get waste-related logs
    waste_logs = db.query(Log).filter(
        and_(
            Log.action_type.in_([
                LogActionType.SIMULATION_EXPIRED,
                LogActionType.SIMULATION_DEPLETED,
                LogActionType.DISPOSAL_COMPLETE
            ]),
            Log.timestamp >= start_date
        )
    ).order_by(Log.timestamp).all()
    
    # Analyze waste patterns
    for log in waste_logs:
        analytics["total_waste_items"] += 1
        
        # Categorize by reason
        reason = log.action_type.value
        analytics["waste_by_reason"][reason] = analytics["waste_by_reason"].get(reason, 0) + 1
        
        # Get item details for category analysis
        if log.item_id_fk:
            item = db.query(DBItem).filter(DBItem.item_id == log.item_id_fk).first()
            if item:
                category = item.category
                analytics["waste_by_category"][category] = analytics["waste_by_category"].get(category, 0) + 1
        
        # Get container details
        if log.container_id_fk:
            container = db.query(DBContainer).filter(DBContainer.container_id == log.container_id_fk).first()
            if container:
                container_name = container.name
                analytics["waste_by_container"][container_name] = analytics["waste_by_container"].get(container_name, 0) + 1
    
    # Generate daily trend
    current_date = start_date.date()
    for i in range(days_back):
        date = current_date + timedelta(days=i)
        daily_count = len([log for log in waste_logs if log.timestamp.date() == date])
        analytics["daily_waste_trend"].append({
            "date": date.isoformat(),
            "waste_count": daily_count
        })
    
    # Get top waste generators (containers with most waste)
    analytics["top_waste_generators"] = sorted(
        analytics["waste_by_container"].items(),
        key=lambda x: x[1],
        reverse=True
    )[:10]
    
    return analytics