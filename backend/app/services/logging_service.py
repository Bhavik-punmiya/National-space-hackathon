# /app/services/logging_service.py
from sqlalchemy.orm import Session
from app.models_db import Log, LogActionType, Item, User, Container, ItemReservation
from app.models_api import Position, LogResponseItem, ActivitySummary
from datetime import datetime, timezone
import json
import uuid
from typing import Dict, Any, Optional, Union, List

def create_log_entry(
    db: Session,
    action_type: LogActionType,
    user_id: Optional[str] = None,
    item_id: Optional[str] = None,
    container_id: Optional[str] = None,
    reservation_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    before_state: Optional[Dict[str, Any]] = None,
    after_state: Optional[Dict[str, Any]] = None,
    session_id: Optional[str] = None,
    action_category: Optional[str] = None,
    location: Optional[str] = None,
    client_info: Optional[Dict[str, Any]] = None,
    tags: Optional[List[str]] = None,
    execution_duration_ms: Optional[int] = None,
    success: bool = True,
    error_message: Optional[str] = None,
    timestamp: Optional[datetime] = None
) -> Log:
    """
    Creates and saves an enhanced log entry to the database with full user tracking and analytics.

    Args:
        db: SQLAlchemy Session.
        action_type: The type of action performed.
        user_id: The user performing the action.
        item_id: The primary item involved (if any).
        container_id: The container involved (if any).
        reservation_id: The reservation involved (if any).
        details: A dictionary containing action-specific details.
        before_state: State before the action (for audit trail).
        after_state: State after the action (for audit trail).
        session_id: Session identifier for grouping related actions.
        action_category: Category grouping (e.g., "inventory", "reservation", "system").
        location: Where the action occurred (zone, module, etc.).
        client_info: Client/device information.
        tags: Array of tags for flexible querying.
        execution_duration_ms: How long the action took (milliseconds).
        success: Whether the action succeeded.
        error_message: Error details if action failed.
        timestamp: The time the action occurred (defaults to now).

    Returns:
        The created Log object.
    """
    if timestamp is None:
        timestamp = datetime.now(timezone.utc)

    # Generate unique log ID if not provided
    log_id = str(uuid.uuid4())

    # Ensure details are serializable to JSON
    details_json = None
    if details:
        try:
            serializable_details = _make_details_serializable(details)
            details_json = serializable_details
        except Exception as e:
            print(f"Warning: Could not serialize log details for action {action_type}: {e}")
            details_json = {"error": "Serialization failed", "original_keys": list(details.keys())}

    # Ensure before/after states are serializable
    before_state_json = _make_details_serializable(before_state) if before_state else None
    after_state_json = _make_details_serializable(after_state) if after_state else None

    # Create the enhanced log entry
    log_entry = Log(
        log_id=log_id,
        timestamp=timestamp,
        user_id_fk=user_id,
        session_id=session_id,
        action_type=action_type,
        action_category=action_category,
        item_id_fk=item_id,
        container_id_fk=container_id,
        reservation_id_fk=reservation_id,
        details_json=details_json,
        before_state=before_state_json,
        after_state=after_state_json,
        execution_duration_ms=execution_duration_ms,
        success=success,
        error_message=error_message,
        location=location,
        client_info=client_info,
        tags=tags
    )
    
    db.add(log_entry)
    return log_entry

def create_user_activity_log(
    db: Session,
    user_id: str,
    action_type: LogActionType,
    item_id: Optional[str] = None,
    container_id: Optional[str] = None,
    purpose: Optional[str] = None,
    **kwargs
) -> Log:
    """
    Creates a log entry specifically for user activities with enhanced context.
    
    Args:
        db: SQLAlchemy Session.
        user_id: The user performing the action.
        action_type: The type of action performed.
        item_id: The item involved (if any).
        container_id: The container involved (if any).
        purpose: Purpose of the action (for reservations, usage, etc.).
        **kwargs: Additional arguments passed to create_log_entry.
    
    Returns:
        The created Log object.
    """
    # Add user context to details
    details = kwargs.get('details', {})
    if purpose:
        details['purpose'] = purpose
    
    # Add user info to details
    user = db.query(User).filter(User.user_id == user_id).first()
    if user:
        details['user_role'] = user.role.value
        details['user_name'] = user.full_name or user.username
    
    # Remove details and action_category from kwargs to avoid duplicate parameters
    kwargs.pop('details', None)
    kwargs.pop('action_category', None)
    
    return create_log_entry(
        db=db,
        action_type=action_type,
        user_id=user_id,
        item_id=item_id,
        container_id=container_id,
        details=details,
        action_category='user_activity',
        **kwargs
    )

def create_item_usage_log(
    db: Session,
    user_id: str,
    item_id: str,
    action_type: LogActionType,
    usage_count: Optional[int] = None,
    remaining_uses: Optional[int] = None,
    **kwargs
) -> Log:
    """
    Creates a log entry specifically for item usage tracking.
    
    Args:
        db: SQLAlchemy Session.
        user_id: The user using the item.
        item_id: The item being used.
        action_type: The type of usage action.
        usage_count: Current usage count after action.
        remaining_uses: Remaining uses after action.
        **kwargs: Additional arguments passed to create_log_entry.
    
    Returns:
        The created Log object.
    """
    # Get item details for context
    item = db.query(Item).filter(Item.item_id == item_id).first()
    details = kwargs.get('details', {})
    
    if item:
        details['item_name'] = item.name
        details['item_category'] = item.category
        details['item_status'] = item.status.value
        details['current_uses'] = item.current_uses
        details['maximum_uses'] = item.maximum_uses
    
    if usage_count is not None:
        details['usage_count'] = usage_count
    if remaining_uses is not None:
        details['remaining_uses'] = remaining_uses
    
    return create_log_entry(
        db=db,
        action_type=action_type,
        user_id=user_id,
        item_id=item_id,
        details=details,
        action_category='item_usage',
        **kwargs
    )

def create_reservation_log(
    db: Session,
    user_id: str,
    reservation_id: str,
    action_type: LogActionType,
    **kwargs
) -> Log:
    """
    Creates a log entry specifically for reservation activities.
    
    Args:
        db: SQLAlchemy Session.
        user_id: The user making the reservation.
        reservation_id: The reservation ID.
        action_type: The type of reservation action.
        **kwargs: Additional arguments passed to create_log_entry.
    
    Returns:
        The created Log object.
    """
    # Get reservation details for context
    reservation = db.query(ItemReservation).filter(ItemReservation.reservation_id == reservation_id).first()
    details = kwargs.get('details', {})
    
    if reservation:
        details['purpose'] = reservation.purpose
        details['start_time'] = reservation.start_time.isoformat()
        details['end_time'] = reservation.end_time.isoformat()
        details['duration_hours'] = reservation.duration_hours
        details['priority'] = reservation.priority
        details['is_recurring'] = reservation.is_recurring
    
    return create_log_entry(
        db=db,
        action_type=action_type,
        user_id=user_id,
        reservation_id=reservation_id,
        details=details,
        action_category='reservation',
        **kwargs
    )

def get_user_activity_summary(
    db: Session,
    user_id: str,
    limit: int = 50
) -> ActivitySummary:
    """
    Gets a summary of user activity for dashboards.
    
    Args:
        db: SQLAlchemy Session.
        user_id: The user ID to get activity for.
        limit: Maximum number of recent activities to analyze.
    
    Returns:
        ActivitySummary object with user activity data.
    """
    # Get user info
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise ValueError(f"User {user_id} not found")
    
    # Get recent logs for this user
    recent_logs = db.query(Log).filter(
        Log.user_id_fk == user_id
    ).order_by(Log.timestamp.desc()).limit(limit).all()
    
    # Get most used items
    item_usage = {}
    for log in recent_logs:
        if log.item_id_fk:
            item_usage[log.item_id_fk] = item_usage.get(log.item_id_fk, 0) + 1
    
    most_used_items = sorted(item_usage.items(), key=lambda x: x[1], reverse=True)[:10]
    most_used_items = [item_id for item_id, _ in most_used_items]
    
    # Get favorite zones (from container access)
    zone_access = {}
    for log in recent_logs:
        if log.container_id_fk:
            container = db.query(Container).filter(Container.container_id == log.container_id_fk).first()
            if container:
                zone_access[container.zone] = zone_access.get(container.zone, 0) + 1
    
    favorite_zones = sorted(zone_access.items(), key=lambda x: x[1], reverse=True)[:5]
    favorite_zones = [zone for zone, _ in favorite_zones]
    
    return ActivitySummary(
        user_id=user_id,
        user_name=user.full_name or user.username,
        total_actions=len(recent_logs),
        last_activity=recent_logs[0].timestamp if recent_logs else user.created_at,
        most_used_items=most_used_items,
        favorite_zones=favorite_zones
    )

def get_logs_by_filters(
    db: Session,
    user_id: Optional[str] = None,
    item_id: Optional[str] = None,
    container_id: Optional[str] = None,
    action_type: Optional[LogActionType] = None,
    action_category: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    success_only: Optional[bool] = None,
    limit: int = 100,
    offset: int = 0
) -> List[LogResponseItem]:
    """
    Gets logs with various filters for analytics and reporting.
    
    Args:
        db: SQLAlchemy Session.
        user_id: Filter by specific user.
        item_id: Filter by specific item.
        container_id: Filter by specific container.
        action_type: Filter by action type.
        action_category: Filter by action category.
        start_date: Filter logs after this date.
        end_date: Filter logs before this date.
        success_only: Filter by success status.
        limit: Maximum number of logs to return.
        offset: Number of logs to skip.
    
    Returns:
        List of LogResponseItem objects.
    """
    query = db.query(Log)
    
    # Apply filters
    if user_id:
        query = query.filter(Log.user_id_fk == user_id)
    if item_id:
        query = query.filter(Log.item_id_fk == item_id)
    if container_id:
        query = query.filter(Log.container_id_fk == container_id)
    if action_type:
        query = query.filter(Log.action_type == action_type)
    if action_category:
        query = query.filter(Log.action_category == action_category)
    if start_date:
        query = query.filter(Log.timestamp >= start_date)
    if end_date:
        query = query.filter(Log.timestamp <= end_date)
    if success_only is not None:
        query = query.filter(Log.success == success_only)
    
    # Order by timestamp and apply pagination
    logs = query.order_by(Log.timestamp.desc()).offset(offset).limit(limit).all()
    
    # Convert to response format
    result = []
    for log in logs:
        # Get related data for enhanced response
        user_name = None
        if log.user_id_fk:
            user = db.query(User).filter(User.user_id == log.user_id_fk).first()
            user_name = user.full_name or user.username if user else None
        
        item_name = None
        if log.item_id_fk:
            item = db.query(Item).filter(Item.item_id == log.item_id_fk).first()
            item_name = item.name if item else None
        
        log_response = LogResponseItem(
            log_id=log.log_id,
            timestamp=log.timestamp,
            user_id=log.user_id_fk,
            session_id=log.session_id,
            action_type=log.action_type.value,
            action_category=log.action_category,
            item_id=log.item_id_fk,
            container_id=log.container_id_fk,
            reservation_id=log.reservation_id_fk,
            success=log.success,
            error_message=log.error_message,
            location=log.location,
            details=log.details_json,
            user_name=user_name,
            item_name=item_name
        )
        result.append(log_response)
    
    return result

def _make_details_serializable(details: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively converts non-serializable types in details dict."""
    if not details:
        return details
    
    serializable = {}
    for key, value in details.items():
        if isinstance(value, datetime):
            serializable[key] = value.isoformat()
        elif hasattr(value, 'dict'):  # Pydantic models
            serializable[key] = value.dict()
        elif isinstance(value, dict):
            serializable[key] = _make_details_serializable(value)
        elif isinstance(value, list):
            serializable[key] = [_make_details_serializable(item) if isinstance(item, dict) else item for item in value]
        else:
            # Assume other types are directly serializable
            serializable[key] = value
    return serializable

# Legacy function for backward compatibility
def create_log_entry_legacy(
    db: Session,
    actionType: LogActionType,
    itemId: Optional[str] = None,
    userId: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    timestamp: Optional[datetime] = None
) -> Log:
    """
    Legacy function for backward compatibility.
    Maps old parameters to new create_log_entry function.
    """
    return create_log_entry(
        db=db,
        action_type=actionType,
        user_id=userId,
        item_id=itemId,
        details=details,
        timestamp=timestamp
    )