from sqlalchemy import or_
from sqlite3 import IntegrityError
from sqlalchemy.orm import Session
from typing import List, Tuple, Optional
from app.models_db import Item as DBItem, LogActionType, ItemStatus
from app.models_api import (SimulationRequest, SimulationResponse, SimulationChanges,
                            SimulationItemChange, SimulationItemUsedChange)
from .logging_service import create_log_entry
from datetime import datetime, timedelta
import logging
import sys  # Import the sys module

# Configure logging (you can customize this)
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
    if request_data.numOfDays and request_data.numOfDays > 0:
        end_sim_time = start_sim_time + timedelta(days=request_data.numOfDays)
    elif request_data.toTimestamp and request_data.toTimestamp > start_sim_time:
        end_sim_time = request_data.toTimestamp
    else:
        raise ValueError("Either a valid numOfDays or future toTimestamp is required.")

    logging.debug(f"Simulating from {start_sim_time} to {end_sim_time}")

    items_used_changes: List[SimulationItemUsedChange] = []
    items_expired_changes: List[SimulationItemChange] = []
    items_depleted_changes: List[SimulationItemChange] = []

    item_filters = []
    for usage_request in request_data.itemsToBeUsedPerDay:
        if usage_request.item_id:
            item_filters.append(DBItem.item_id == usage_request.item_id)
        elif usage_request.name:
            item_filters.append(DBItem.name == usage_request.name)

    # Ensure all filters are valid before applying
    item_filters = [f for f in item_filters if f is not None]

    # Build the query
    query = db.query(DBItem).filter(DBItem.status == ItemStatus.ACTIVE) # Default filter
    if len(item_filters) == 1:
        query = query.filter(item_filters[0])
    elif len(item_filters) > 1:
        query = query.filter(or_(*item_filters))

    try:
        items_to_process = query.all()
    except Exception as e:
        logging.exception("Error querying items")
        raise

    for current_day in range((end_sim_time - start_sim_time).days + 1):
        current_time = start_sim_time + timedelta(days=current_day)
        day_end = current_time.replace(hour=23, minute=59, second=59, microsecond=999999)

        # Process item usage
        for item in items_to_process:
            if item.usage_limit is not None and item.usage_limit != "N/A":
                try:
                    usage_limit_int = int(item.usage_limit)
                    current_uses = getattr(item, 'current_uses', 0)
                    if current_uses < usage_limit_int:
                        item.current_uses = current_uses + 1
                        remaining_uses = max(0, usage_limit_int - item.current_uses)
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
                            remainingUses=remaining_uses,
                            timestamp=current_time
                        ))
                        create_log_entry(db, LogActionType.SIMULATION_USE, item.item_id, current_time, {"remainingUses": remaining_uses})
                except (ValueError, TypeError):
                    # Skip items with invalid usage_limit format
                    continue

        # Check for expired items
        expired_items = db.query(DBItem).filter(
            DBItem.status == ItemStatus.ACTIVE,
            DBItem.expiry_date != None,
            DBItem.expiry_date != "N/A"
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
                    create_log_entry(db, LogActionType.SIMULATION_EXPIRED, item.item_id, day_end, {"reason": "Item expired"})
            except (ValueError, TypeError) as e:
                logging.warning(f"Invalid date format for item {item.item_id}: {item.expiry_date} - Error: {e}")
                continue

        # Commit daily changes
        # try:
        #     db.commit()
        # except IntegrityError as e:
        #     db.rollback()
        #     logging.error(f"Database commit error on day {current_day + 1}: {e}")
        #     raise ValueError("Simulation failed due to database error.")

    _set_current_simulation_time(end_sim_time)

    return SimulationResponse(success=True, newDate=end_sim_time, changes=SimulationChanges(
        itemsUsed=items_used_changes, itemsExpired=items_expired_changes, itemsDepletedToday=items_depleted_changes
    ))