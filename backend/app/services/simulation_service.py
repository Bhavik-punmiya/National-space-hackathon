from sqlalchemy import or_, and_
from sqlite3 import IntegrityError
from sqlalchemy.orm import Session
from typing import List, Tuple, Optional, Dict, Any
from app.models_db import Item as DBItem, LogActionType, ItemStatus
from app.models_api import (SimulationRequest, SimulationResponse, SimulationChanges,
                            SimulationItemChange, SimulationItemUsedChange)
from .logging_service import create_log_entry
from datetime import datetime, timedelta
import logging
import sys

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Global simulation time
_CURRENT_SIMULATION_TIME = datetime.utcnow()

def get_current_simulation_time() -> datetime:
    return _CURRENT_SIMULATION_TIME

def _set_current_simulation_time(new_time: datetime):
    global _CURRENT_SIMULATION_TIME
    _CURRENT_SIMULATION_TIME = new_time

def simulate_time_passage(db: Session, request_data: SimulationRequest, user_id: Optional[str] = None) -> SimulationResponse:
    global _CURRENT_SIMULATION_TIME
    start_sim_time = _CURRENT_SIMULATION_TIME

    # Determine end simulation time
    if request_data.num_of_days and request_data.num_of_days > 0:
        end_sim_time = start_sim_time + timedelta(days=request_data.num_of_days)
    elif request_data.to_timestamp and request_data.to_timestamp > start_sim_time:
        end_sim_time = request_data.to_timestamp
    else:
        raise ValueError("Either a valid num_of_days or future to_timestamp is required.")

    logging.debug(f"Simulating from {start_sim_time} to {end_sim_time}")

    items_used_changes: List[SimulationItemUsedChange] = []
    items_expired_changes: List[SimulationItemChange] = []
    items_depleted_changes: List[SimulationItemChange] = []

    # Get items to process based on request
    item_filters = []
    for usage_request in request_data.items_to_be_used_per_day:
        if usage_request.item_id:
            item_filters.append(DBItem.item_id == usage_request.item_id)
        elif usage_request.name:
            item_filters.append(DBItem.name == usage_request.name)

    # Ensure all filters are valid before applying
    item_filters = [f for f in item_filters if f is not None]

    # Build the query
    query = db.query(DBItem).filter(DBItem.status == ItemStatus.ACTIVE)
    if len(item_filters) == 1:
        query = query.filter(item_filters[0])
    elif len(item_filters) > 1:
        query = query.filter(or_(*item_filters))

    try:
        items_to_process = query.all()
    except Exception as e:
        logging.exception("Error querying items")
        raise

    # If no specific items requested, use items with usage frequency for realistic simulation
    if not items_to_process:
        items_to_process = db.query(DBItem).filter(
            and_(
                DBItem.status == ItemStatus.ACTIVE,
                DBItem.usage_frequency != None,
                DBItem.usage_frequency > 0
            )
        ).all()
        logging.info(f"No specific items requested, using {len(items_to_process)} items with usage frequency for simulation")

    for current_day in range((end_sim_time - start_sim_time).days + 1):
        current_time = start_sim_time + timedelta(days=current_day)
        day_end = current_time.replace(hour=23, minute=59, second=59, microsecond=999999)

        # Process item usage based on frequency
        for item in items_to_process:
            if item.maximum_uses is not None and item.maximum_uses != "N/A":
                try:
                    maximum_uses_int = int(item.maximum_uses)
                    current_uses = getattr(item, 'current_uses', 0)
                    
                    # Use frequency-based usage simulation
                    usage_frequency = getattr(item, 'usage_frequency', 1.0)
                    if usage_frequency and usage_frequency > 0:
                        # Calculate if item should be used today based on frequency
                        # For example, if frequency is 0.5, item is used every 2 days
                        days_since_start = (current_time - start_sim_time).days
                        should_use_today = (days_since_start % max(1, int(1.0 / usage_frequency))) == 0
                        
                        if should_use_today and current_uses < maximum_uses_int:
                            item.current_uses = current_uses + 1
                            remaining_uses = max(0, maximum_uses_int - item.current_uses)
                            
                            if remaining_uses == 0:
                                item.status = ItemStatus.WASTE_DEPLETED
                                if not any(c.item_id == item.item_id for c in items_depleted_changes):
                                    items_depleted_changes.append(SimulationItemChange(
                                        item_id=item.item_id, 
                                        name=item.name,
                                        timestamp=current_time
                                    ))
                            
                            items_used_changes.append(SimulationItemUsedChange(
                                item_id=item.item_id, 
                                name=item.name, 
                                remaining_uses=remaining_uses,
                                timestamp=current_time
                            ))
                            
                            # Log the usage with frequency information
                            create_log_entry(
                                db=db,
                                action_type=LogActionType.SIMULATION_USE,
                                item_id=item.item_id,
                                details={
                                    "remainingUses": remaining_uses,
                                    "usage_frequency": usage_frequency,
                                    "simulation_day": current_day + 1
                                }
                            )
                            
                except (ValueError, TypeError):
                    # Skip items with invalid maximum_uses format
                    continue

        # Check for expired items
        expired_items = db.query(DBItem).filter(
            and_(
                DBItem.status == ItemStatus.ACTIVE,
                DBItem.expiry_date != None,
                DBItem.expiry_date != "N/A"
            )
        ).all()
        
        for item in expired_items:
            try:
                # Handle different date formats
                expiry_date_str = item.expiry_date
                if 'T' in expiry_date_str:
                    # ISO format: "2021-03-29T00:00:00.000Z"
                    expiry_date = datetime.fromisoformat(expiry_date_str.replace('Z', '+00:00'))
                else:
                    # Simple date format: "2021-03-29"
                    expiry_date = datetime.strptime(expiry_date_str, "%Y-%m-%d")
                
                if expiry_date <= day_end:
                    item.status = ItemStatus.WASTE_EXPIRED
                    if not any(c.item_id == item.item_id for c in items_expired_changes):
                        items_expired_changes.append(SimulationItemChange(
                            item_id=item.item_id, 
                            name=item.name,
                            timestamp=day_end
                        ))
                    create_log_entry(
                        db=db,
                        action_type=LogActionType.SIMULATION_EXPIRED,
                        item_id=item.item_id,
                        details={
                            "reason": "Item expired during simulation",
                            "simulation_day": current_day + 1,
                            "expiry_date": item.expiry_date
                        }
                    )
            except (ValueError, TypeError) as e:
                logging.warning(f"Invalid date format for item {item.item_id}: {item.expiry_date} - Error: {e}")
                continue

    _set_current_simulation_time(end_sim_time)

    return SimulationResponse(success=True, new_date=end_sim_time, changes=SimulationChanges(
        items_used=items_used_changes, 
        items_expired=items_expired_changes, 
        items_depleted_today=items_depleted_changes,
        new_date=end_sim_time
    ))

def predict_simulation_outcomes(db: Session, days_ahead: int = 30) -> Dict[str, Any]:
    """
    Predicts what will happen during simulation without actually running it.
    Useful for planning and decision making.
    """
    current_time = get_current_simulation_time()
    future_date = current_time + timedelta(days=days_ahead)
    
    predictions = {
        "simulation_period": f"{days_ahead} days from {current_time.date()}",
        "items_likely_to_deplete": [],
        "items_likely_to_expire": [],
        "total_usage_predicted": 0,
        "waste_generation_estimate": 0
    }
    
    # Get all active items
    active_items = db.query(DBItem).filter(DBItem.status == ItemStatus.ACTIVE).all()
    
    for item in active_items:
        # Predict depletion based on usage frequency
        if item.maximum_uses and item.maximum_uses != "N/A" and item.usage_frequency and item.usage_frequency > 0:
            try:
                maximum_uses = int(item.maximum_uses)
                current_uses = item.current_uses
                remaining_uses = maximum_uses - current_uses
                
                if remaining_uses > 0:
                    # Calculate days until depletion
                    days_until_depletion = int(remaining_uses / item.usage_frequency)
                    
                    if days_until_depletion <= days_ahead:
                        predictions["items_likely_to_deplete"].append({
                            "item_id": item.item_id,
                            "name": item.name,
                            "category": item.category,
                            "current_uses": current_uses,
                            "maximum_uses": maximum_uses,
                            "remaining_uses": remaining_uses,
                            "usage_frequency": item.usage_frequency,
                            "days_until_depletion": days_until_depletion,
                            "predicted_waste_date": (current_time + timedelta(days=days_until_depletion)).date().isoformat()
                        })
                        predictions["waste_generation_estimate"] += 1
            except (ValueError, TypeError):
                continue
        
        # Predict expiry
        if item.expiry_date and item.expiry_date != "N/A":
            try:
                if 'T' in item.expiry_date:
                    expiry_date = datetime.fromisoformat(item.expiry_date.replace('Z', '+00:00'))
                else:
                    expiry_date = datetime.strptime(item.expiry_date, "%Y-%m-%d")
                
                days_until_expiry = (expiry_date - current_time).days
                
                if 0 <= days_until_expiry <= days_ahead:
                    predictions["items_likely_to_expire"].append({
                        "item_id": item.item_id,
                        "name": item.name,
                        "category": item.category,
                        "days_until_expiry": days_until_expiry,
                        "expiry_date": item.expiry_date,
                        "predicted_waste_date": expiry_date.date().isoformat()
                    })
                    predictions["waste_generation_estimate"] += 1
            except (ValueError, TypeError):
                continue
    
    # Calculate total predicted usage
    for item in predictions["items_likely_to_deplete"]:
        days_until_depletion = item["days_until_depletion"]
        usage_frequency = item["usage_frequency"]
        predicted_uses = min(days_until_depletion * usage_frequency, item["remaining_uses"])
        predictions["total_usage_predicted"] += predicted_uses
    
    return predictions