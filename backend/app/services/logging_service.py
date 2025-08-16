# /app/services/logging_service.py
from sqlalchemy.orm import Session
from app.models_db import Log, LogActionType, Item # Import Item to potentially fetch name if needed
from app.models_api import Position # To help type hint position details
from datetime import datetime
import json
from typing import Dict, Any, Optional, Union

def create_log_entry(
    db: Session,
    actionType: LogActionType,
    itemId: Optional[str] = None,
    userId: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    timestamp: Optional[datetime] = None
) -> Log:
    """
    Creates and saves a log entry to the database.

    Args:
        db: SQLAlchemy Session.
        actionType: The type of action performed.
        itemId: The primary item involved (if any).
        userId: The user performing the action (if applicable).
        details: A dictionary containing action-specific details.
                 This dictionary will be serialized to JSON.
        timestamp: The time the action occurred (defaults to now).

    Returns:
        The created Log object.
    """
    if timestamp is None:
        timestamp = datetime.utcnow()

    # Ensure details are serializable to JSON
    details_json_str = None
    if details:
        try:
            # Convert datetime/position objects in details to string/dict representations
            serializable_details = _make_details_serializable(details)
            details_json_str = json.dumps(serializable_details)
        except TypeError as e:
            print(f"Warning: Could not serialize log details for action {actionType}: {e}")
            # Fallback or simplified details
            fallback_details = {"error": "Serialization failed", "original_keys": list(details.keys())}
            details_json_str = json.dumps(fallback_details)
        except Exception as e:
             print(f"Error during JSON serialization for log details: {e}")
             details_json_str = json.dumps({"error": f"Unexpected serialization error: {e}"})


    log_entry = Log(
        timestamp=timestamp,
        userId=userId,
        actionType=actionType,
        item_id_fk=itemId, # Use the foreign key field name
        details_json=details_json_str
    )
    db.add(log_entry)
    # Note: Commit should happen at the end of the request/service call that uses this function.
    # db.commit() # Typically done by the caller
    # db.refresh(log_entry) # Optional: if you need the log ID immediately
    return log_entry

def _make_details_serializable(details: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively converts non-serializable types in details dict."""
    serializable = {}
    if not isinstance(details, dict):
        return details # Should not happen based on type hint, but safe check

    for key, value in details.items():
        if isinstance(value, datetime):
            serializable[key] = value.isoformat()
        elif isinstance(value, Position):
             # Assuming Position is a Pydantic model with dict() method
            serializable[key] = value.dict()
        elif isinstance(value, dict):
            serializable[key] = _make_details_serializable(value) # Recurse for nested dicts
        elif isinstance(value, list):
             # Handle lists containing potentially non-serializable items
             serializable[key] = [_make_details_serializable(item) if isinstance(item, dict) else item for item in value]
        else:
            # Assume other types are directly serializable (str, int, float, bool, None)
            serializable[key] = value
    return serializable