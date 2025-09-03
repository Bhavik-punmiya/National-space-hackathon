# /app/routes/reservation_routes.py
from flask import Blueprint, request, jsonify
from app.database import get_db
from app.services import reservation_service
from app.models_api import (
    ReservationCreate, ReservationUpdate, ConflictCheckRequest
)
from pydantic import ValidationError
from datetime import datetime

reservation_bp = Blueprint('reservation_bp', __name__, url_prefix='/api/reservations')

@reservation_bp.route('', methods=['POST'])
def create_reservation():
    """Creates a new item reservation."""
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Get user ID from request body or headers
        request_data = request.get_json()
        user_id = request_data.get('user_id') or request.headers.get("X-User-ID")
        
        if not user_id:
            return jsonify({"success": False, "error": "user_id is required"}), 400
        
        # Validate request data
        try:
            reservation_data = ReservationCreate(**request_data)
        except ValidationError as e:
            return jsonify({"success": False, "error": "Invalid request data", "details": e.errors()}), 400
        
        # Create reservation
        response_data = reservation_service.create_reservation(db, reservation_data, user_id)
        return jsonify(response_data.dict()), 201
        
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        print(f"Error in create_reservation route: {e}")
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        next(db_gen, None)
        db.close()

@reservation_bp.route('', methods=['GET'])
def get_reservations():
    """Retrieves reservations with optional filtering."""
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Get query parameters
        item_id = request.args.get('item_id')
        user_id = request.args.get('user_id')
        status = request.args.get('status')
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        
        # Get reservations
        reservations = reservation_service.get_reservations(
            db, item_id, user_id, status, limit, offset
        )
        
        return jsonify({
            "success": True,
            "reservations": [r.dict() for r in reservations],
            "count": len(reservations)
        })
        
    except Exception as e:
        print(f"Error in get_reservations route: {e}")
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        next(db_gen, None)
        db.close()

@reservation_bp.route('/<reservation_id>', methods=['GET'])
def get_reservation(reservation_id):
    """Gets a specific reservation by ID."""
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Get reservations filtered by ID
        reservations = reservation_service.get_reservations(db, limit=1)
        reservations = [r for r in reservations if r.reservation_id == reservation_id]
        
        if not reservations:
            return jsonify({"success": False, "error": "Reservation not found"}), 404
        
        return jsonify({
            "success": True,
            "reservation": reservations[0].dict()
        })
        
    except Exception as e:
        print(f"Error in get_reservation route: {e}")
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        next(db_gen, None)
        db.close()

@reservation_bp.route('/<reservation_id>', methods=['PUT'])
def update_reservation(reservation_id):
    """Updates an existing reservation."""
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Get user ID from request body or headers
        request_data = request.get_json()
        user_id = request_data.get('user_id') or request.headers.get("X-User-ID")
        
        if not user_id:
            return jsonify({"success": False, "error": "user_id is required"}), 400
        
        # Validate request data
        try:
            update_data = ReservationUpdate(**request_data)
        except ValidationError as e:
            return jsonify({"success": False, "error": "Invalid request data", "details": e.errors()}), 400
        
        # Update reservation
        response_data = reservation_service.update_reservation(db, reservation_id, update_data, user_id)
        return jsonify(response_data.dict())
        
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        print(f"Error in update_reservation route: {e}")
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        next(db_gen, None)
        db.close()

@reservation_bp.route('/<reservation_id>/cancel', methods=['POST'])
def cancel_reservation(reservation_id):
    """Cancels a reservation."""
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Get user ID and reason from request
        request_data = request.get_json() or {}
        user_id = request_data.get('user_id') or request.headers.get("X-User-ID")
        reason = request_data.get('reason')
        
        if not user_id:
            return jsonify({"success": False, "error": "user_id is required"}), 400
        
        # Cancel reservation
        response_data = reservation_service.cancel_reservation(db, reservation_id, user_id, reason)
        return jsonify(response_data.dict())
        
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        print(f"Error in cancel_reservation route: {e}")
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        next(db_gen, None)
        db.close()

@reservation_bp.route('/<reservation_id>/complete', methods=['POST'])
def complete_reservation(reservation_id):
    """Marks a reservation as completed."""
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Get user ID from request body or headers
        request_data = request.get_json() or {}
        user_id = request_data.get('user_id') or request.headers.get("X-User-ID")
        
        if not user_id:
            return jsonify({"success": False, "error": "user_id is required"}), 400
        
        # Complete reservation
        response_data = reservation_service.complete_reservation(db, reservation_id, user_id)
        return jsonify(response_data.dict())
        
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        print(f"Error in complete_reservation route: {e}")
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        next(db_gen, None)
        db.close()

@reservation_bp.route('/conflicts', methods=['POST'])
def check_conflicts():
    """Checks for scheduling conflicts for a specific item and time period."""
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Validate request data
        try:
            conflict_request = ConflictCheckRequest(**request.get_json())
        except ValidationError as e:
            return jsonify({"success": False, "error": "Invalid request data", "details": e.errors()}), 400
        
        # Check for conflicts
        conflicts = reservation_service.check_reservation_conflicts(
            db,
            conflict_request.item_id,
            conflict_request.start_time,
            conflict_request.end_time,
            conflict_request.exclude_reservation_id
        )
        
        return jsonify({
            "success": True,
            "has_conflicts": len(conflicts) > 0,
            "conflicts": [c.dict() for c in conflicts],
            "conflict_count": len(conflicts)
        })
        
    except Exception as e:
        print(f"Error in check_conflicts route: {e}")
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        next(db_gen, None)
        db.close()

@reservation_bp.route('/item/<item_id>', methods=['GET'])
def get_item_reservations(item_id):
    """Gets all reservations for a specific item."""
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Get item reservations
        reservations = reservation_service.get_item_reservations(db, item_id)
        
        return jsonify({
            "success": True,
            "item_id": item_id,
            "reservations": [r.dict() for r in reservations],
            "count": len(reservations)
        })
        
    except Exception as e:
        print(f"Error in get_item_reservations route: {e}")
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        next(db_gen, None)
        db.close()

@reservation_bp.route('/user/<user_id>', methods=['GET'])
def get_user_reservations(user_id):
    """Gets all reservations for a specific user."""
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Get user reservations
        reservations = reservation_service.get_reservations(db, user_id=user_id)
        
        return jsonify({
            "success": True,
            "user_id": user_id,
            "reservations": [r.dict() for r in reservations],
            "count": len(reservations)
        })
        
    except Exception as e:
        print(f"Error in get_user_reservations route: {e}")
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        next(db_gen, None)
        db.close()
