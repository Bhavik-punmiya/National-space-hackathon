# /app/services/reservation_service.py
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Dict, Any
from app.models_db import Item as DBItem, Container as DBContainer, User as DBUser, ItemReservation as DBItemReservation, LogActionType, ItemStatus
from app.models_api import (
    ReservationCreate, ReservationUpdate, ReservationResponse, ReservationSummary,
    ConflictCheckRequest, ConflictCheckResponse, SuccessResponse
)
from .logging_service import create_log_entry
from datetime import datetime, timezone
import uuid

def create_reservation(
    db: Session, 
    reservation_data: ReservationCreate, 
    user_id: str
) -> ReservationResponse:
    """
    Creates a new item reservation with conflict checking and logging.
    """
    # Validate item exists and is available
    item = db.query(DBItem).filter(DBItem.item_id == reservation_data.item_id).first()
    if not item:
        raise ValueError(f"Item {reservation_data.item_id} not found")
    
    if item.status != ItemStatus.ACTIVE:
        raise ValueError(f"Item {reservation_data.item_id} is not available (status: {item.status.value})")
    
    # Check for conflicts
    conflicts = check_reservation_conflicts(
        db, 
        reservation_data.item_id, 
        reservation_data.start_time, 
        reservation_data.end_time
    )
    
    if conflicts:
        raise ValueError(f"Reservation conflicts detected: {len(conflicts)} existing reservations overlap")
    
    # Calculate duration
    duration_hours = (reservation_data.end_time - reservation_data.start_time).total_seconds() / 3600
    
    # Create reservation
    reservation = DBItemReservation(
        reservation_id=str(uuid.uuid4()),
        item_id_fk=reservation_data.item_id,
        user_id_fk=reservation_data.user_id,
        purpose=reservation_data.purpose,
        start_time=reservation_data.start_time,
        end_time=reservation_data.end_time,
        duration_hours=duration_hours,
        priority=reservation_data.priority,
        is_recurring=reservation_data.is_recurring,
        notes=reservation_data.notes,
        status="ACTIVE"
    )
    
    db.add(reservation)
    
    # Log the reservation creation
    create_log_entry(
        db=db,
        action_type=LogActionType.RESERVED,
        user_id=user_id,
        item_id=reservation_data.item_id,
        reservation_id=reservation.reservation_id,
        details={
            "purpose": reservation_data.purpose,
            "start_time": reservation_data.start_time.isoformat(),
            "end_time": reservation_data.end_time.isoformat(),
            "duration_hours": duration_hours,
            "priority": reservation_data.priority
        },
        action_category="reservation"
    )
    
    try:
        db.commit()
        db.refresh(reservation)
    except Exception as e:
        db.rollback()
        raise ValueError(f"Failed to create reservation: {e}")
    
    # Return response
    return ReservationResponse(
        reservation_id=reservation.reservation_id,
        item_id=reservation.item_id_fk,
        user_id=reservation.user_id_fk,
        purpose=reservation.purpose,
        start_time=reservation.start_time,
        end_time=reservation.end_time,
        priority=reservation.priority,
        notes=reservation.notes,
        status=reservation.status,
        duration_hours=reservation.duration_hours,
        is_recurring=reservation.is_recurring,
        created_at=reservation.created_at,
        updated_at=reservation.updated_at,
        approved_by=reservation.approved_by,
        conflict_resolution=reservation.conflict_resolution,
        item_name=item.name,
        user_name=db.query(DBUser).filter(DBUser.user_id == reservation.user_id_fk).first().username
    )

def get_reservations(
    db: Session,
    item_id: Optional[str] = None,
    user_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> List[ReservationResponse]:
    """
    Retrieves reservations with optional filtering.
    """
    query = db.query(DBItemReservation).options(
        joinedload(DBItemReservation.item),
        joinedload(DBItemReservation.user)
    )
    
    if item_id:
        query = query.filter(DBItemReservation.item_id_fk == item_id)
    if user_id:
        query = query.filter(DBItemReservation.user_id_fk == user_id)
    if status:
        query = query.filter(DBItemReservation.status == status)
    
    reservations = query.order_by(DBItemReservation.start_time.desc()).offset(offset).limit(limit).all()
    
    result = []
    for reservation in reservations:
        result.append(ReservationResponse(
            reservation_id=reservation.reservation_id,
            item_id=reservation.item_id_fk,
            user_id=reservation.user_id_fk,
            purpose=reservation.purpose,
            start_time=reservation.start_time,
            end_time=reservation.end_time,
            priority=reservation.priority,
            notes=reservation.notes,
            status=reservation.status,
            duration_hours=reservation.duration_hours,
            is_recurring=reservation.is_recurring,
            created_at=reservation.created_at,
            updated_at=reservation.updated_at,
            approved_by=reservation.approved_by,
            conflict_resolution=reservation.conflict_resolution,
            item_name=reservation.item.name if reservation.item else None,
            user_name=reservation.user.username if reservation.user else None
        ))
    
    return result

def update_reservation(
    db: Session,
    reservation_id: str,
    update_data: ReservationUpdate,
    user_id: str
) -> ReservationResponse:
    """
    Updates an existing reservation.
    """
    reservation = db.query(DBItemReservation).filter(
        DBItemReservation.reservation_id == reservation_id
    ).first()
    
    if not reservation:
        raise ValueError(f"Reservation {reservation_id} not found")
    
    # Store original values for logging
    original_data = {
        "purpose": reservation.purpose,
        "start_time": reservation.start_time,
        "end_time": reservation.end_time,
        "priority": reservation.priority,
        "notes": reservation.notes,
        "status": reservation.status
    }
    
    # Update fields if provided
    if update_data.purpose is not None:
        reservation.purpose = update_data.purpose
    if update_data.start_time is not None:
        reservation.start_time = update_data.start_time
    if update_data.end_time is not None:
        reservation.end_time = update_data.end_time
    if update_data.priority is not None:
        reservation.priority = update_data.priority
    if update_data.notes is not None:
        reservation.notes = update_data.notes
    if update_data.status is not None:
        reservation.status = update_data.status
    
    # Recalculate duration if times changed
    if update_data.start_time is not None or update_data.end_time is not None:
        reservation.duration_hours = (reservation.end_time - reservation.start_time).total_seconds() / 3600
    
    # Update timestamp
    reservation.updated_at = datetime.now(timezone.utc)
    
    # Log the update
    create_log_entry(
        db=db,
        action_type=LogActionType.RESERVED,  # Reuse RESERVED for updates
        user_id=user_id,
        item_id=reservation.item_id_fk,
        reservation_id=reservation.reservation_id,
        details={
            "action": "update",
            "original": original_data,
            "updated": {
                "purpose": reservation.purpose,
                "start_time": reservation.start_time.isoformat(),
                "end_time": reservation.end_time.isoformat(),
                "priority": reservation.priority,
                "notes": reservation.notes,
                "status": reservation.status
            }
        },
        action_category="reservation"
    )
    
    try:
        db.commit()
        db.refresh(reservation)
    except Exception as e:
        db.rollback()
        raise ValueError(f"Failed to update reservation: {e}")
    
    # Return updated response
    return ReservationResponse(
        reservation_id=reservation.reservation_id,
        item_id=reservation.item_id_fk,
        user_id=reservation.user_id_fk,
        purpose=reservation.purpose,
        start_time=reservation.start_time,
        end_time=reservation.end_time,
        priority=reservation.priority,
        notes=reservation.notes,
        status=reservation.status,
        duration_hours=reservation.duration_hours,
        is_recurring=reservation.is_recurring,
        created_at=reservation.created_at,
        updated_at=reservation.updated_at,
        approved_by=reservation.approved_by,
        conflict_resolution=reservation.conflict_resolution,
        item_name=db.query(DBItem).filter(DBItem.item_id == reservation.item_id_fk).first().name,
        user_name=db.query(DBUser).filter(DBUser.user_id == reservation.user_id_fk).first().username
    )

def cancel_reservation(
    db: Session,
    reservation_id: str,
    user_id: str,
    reason: Optional[str] = None
) -> SuccessResponse:
    """
    Cancels a reservation.
    """
    reservation = db.query(DBItemReservation).filter(
        DBItemReservation.reservation_id == reservation_id
    ).first()
    
    if not reservation:
        raise ValueError(f"Reservation {reservation_id} not found")
    
    if reservation.status != "ACTIVE":
        raise ValueError(f"Reservation {reservation_id} cannot be cancelled (status: {reservation.status})")
    
    # Update status
    reservation.status = "CANCELLED"
    reservation.updated_at = datetime.now(timezone.utc)
    
    # Log the cancellation
    create_log_entry(
        db=db,
        action_type=LogActionType.RESERVATION_CANCELLED,
        user_id=user_id,
        item_id=reservation.item_id_fk,
        reservation_id=reservation.reservation_id,
        details={
            "reason": reason or "User cancelled",
            "original_status": "ACTIVE",
            "new_status": "CANCELLED"
        },
        action_category="reservation"
    )
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise ValueError(f"Failed to cancel reservation: {e}")
    
    return SuccessResponse(success=True, message="Reservation cancelled successfully")

def check_reservation_conflicts(
    db: Session,
    item_id: str,
    start_time: datetime,
    end_time: datetime,
    exclude_reservation_id: Optional[str] = None
) -> List[ReservationSummary]:
    """
    Checks for scheduling conflicts for a specific item and time period.
    """
    query = db.query(DBItemReservation).filter(
        DBItemReservation.item_id_fk == item_id,
        DBItemReservation.status == "ACTIVE"
    )
    
    if exclude_reservation_id:
        query = query.filter(DBItemReservation.reservation_id != exclude_reservation_id)
    
    # Check for overlapping reservations
    # Overlap occurs when:
    # - new start < existing end AND new end > existing start
    overlapping_reservations = query.filter(
        (start_time < DBItemReservation.end_time) & (end_time > DBItemReservation.start_time)
    ).all()
    
    conflicts = []
    for reservation in overlapping_reservations:
        conflicts.append(ReservationSummary(
            reservation_id=reservation.reservation_id,
            user_id=reservation.user_id_fk,
            purpose=reservation.purpose,
            start_time=reservation.start_time,
            end_time=reservation.end_time,
            status=reservation.status
        ))
    
    return conflicts

def get_item_reservations(
    db: Session,
    item_id: str
) -> List[ReservationSummary]:
    """
    Gets all reservations for a specific item.
    """
    reservations = db.query(DBItemReservation).filter(
        DBItemReservation.item_id_fk == item_id,
        DBItemReservation.status == "ACTIVE"
    ).order_by(DBItemReservation.start_time).all()
    
    return [
        ReservationSummary(
            reservation_id=r.reservation_id,
            user_id=r.user_id_fk,
            purpose=r.purpose,
            start_time=r.start_time,
            end_time=r.end_time,
            status=r.status
        )
        for r in reservations
    ]

def complete_reservation(
    db: Session,
    reservation_id: str,
    user_id: str
) -> SuccessResponse:
    """
    Marks a reservation as completed.
    """
    reservation = db.query(DBItemReservation).filter(
        DBItemReservation.reservation_id == reservation_id
    ).first()
    
    if not reservation:
        raise ValueError(f"Reservation {reservation_id} not found")
    
    if reservation.status != "ACTIVE":
        raise ValueError(f"Reservation {reservation_id} cannot be completed (status: {reservation.status})")
    
    # Update status
    reservation.status = "COMPLETED"
    reservation.updated_at = datetime.now(timezone.utc)
    
    # Log the completion
    create_log_entry(
        db=db,
        action_type=LogActionType.RESERVATION_COMPLETED,
        user_id=user_id,
        item_id=reservation.item_id_fk,
        reservation_id=reservation.reservation_id,
        details={
            "completion_time": datetime.now(timezone.utc).isoformat()
        },
        action_category="reservation"
    )
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise ValueError(f"Failed to complete reservation: {e}")
    
    return SuccessResponse(success=True, message="Reservation marked as completed")
