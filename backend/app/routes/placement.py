# /app/routes/placement.py
import traceback
from flask import Blueprint, request, jsonify
from sqlalchemy.orm import Session # Import Session type hint
from datetime import datetime, timezone

from app.database import get_db # Use the generator
from app.services import placement_service
from app.services.auth_service import AuthService
from app.services.logging_service import create_user_activity_log
from app.models_db import LogActionType, UserRole
# Import the correct Pydantic models from models_api
from app.models_api import PlacementRequest, PlacementResponse
from pydantic import ValidationError

# --- Blueprint for standard API (/api/placement) ---
placement_bp = Blueprint('placement_bp', __name__, url_prefix='/api/placement')

# --- Blueprint for Frontend API (/frontend/placement) ---
client_placement_bp = Blueprint('client_placement_bp', __name__, url_prefix='/client/placement')


# === Routes for /api/placement ===

@placement_bp.route('/get-placement', methods=['GET'])
def get_placement_api(): # Renamed slightly for clarity
    """ API: Get all current placements """
    db_gen = get_db()
    db: Session = next(db_gen)  # Get the actual session object
    try:
        placements = placement_service.get_all_current_placements(db)
        response_data = [placement.dict(exclude_none=True) for placement in placements]
        return jsonify({"success": True, "placements": response_data}), 200
    except Exception as e:
        print(f"Error in /api/placement/get-placement route: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        try:
            next(db_gen, None)  # Exhaust generator
        except Exception as e:
            print(f"Error during DB generator exhaustion in API GET: {e}")


@placement_bp.route('', methods=['POST'])
def handle_placement_api(): # Renamed slightly for clarity
    """
    API: Endpoint for Placement Recommendations (System Testing).
    Receives a list of items and container definitions, returns suggested placements
    and any necessary rearrangement steps. Response format is rigid.
    
    Enhanced with user authentication and activity logging.
    """
    db_gen = get_db()
    db: Session = next(db_gen) # Get the actual session object
    try:
        # --- Enhanced User Authentication ---
        user_id = request.headers.get("X-User-ID", "system")
        auth_token = request.headers.get("Authorization")
        authenticated_user = None
        
        # Verify user if token provided
        if auth_token and auth_token.startswith("Bearer "):
            token = auth_token.split(" ")[1]
            token_data = AuthService.verify_token(token)
            if token_data:
                authenticated_user = AuthService.get_user_by_id(db, token_data.get("user_id"))
                if authenticated_user:
                    user_id = authenticated_user.user_id
                    # Check permissions for placement operations
                    if not AuthService.validate_user_permission(authenticated_user, UserRole.ASTRONAUT):
                        return jsonify({
                            "success": False, 
                            "error": "Insufficient permissions for placement operations"
                        }), 403
        
        # --- Request Validation ---
        try:
            json_data = request.get_json()
            if not json_data:
                return jsonify({"success": False, "error": "Request body must be JSON."}), 400
            request_data = PlacementRequest(**json_data)
        except ValidationError as e:
            return jsonify({"success": False, "error": "Invalid request body", "details": e.errors()}), 400
        except Exception as e:
            return jsonify({"success": False, "error": f"Invalid request format: {e}"}), 400

        # --- Log API Access ---
        create_user_activity_log(
            db=db,
            user_id=user_id,
            action_type=LogActionType.SIMULATION_USE,
            purpose='placement_api_request',
            item_id=None,
            container_id=None,
            action_category='placement',
            location=None,
            success=True,
            timestamp=datetime.now(timezone.utc),
            details={
                'action': 'placement_api_request',
                'items_count': len(request_data.items),
                'containers_count': len(request_data.containers),
                'endpoint': '/api/placement',
                'authenticated': authenticated_user is not None,
                'user_role': authenticated_user.role.value if authenticated_user else None
            }
        )

        # --- Call Enhanced Placement Service ---
        response_data: PlacementResponse = placement_service.suggest_placements(db, request_data, user_id)

        status_code = 200 if response_data.success else 207
        if response_data.error and not response_data.success and not response_data.placements and not response_data.rearrangements:
            status_code = 400

        # Return standard response format required by system tests
        return jsonify(response_data.dict(exclude_none=True)), status_code

    except ValueError as ve:
         return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        print(f"Critical Error in /api/placement route: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        try:
            next(db_gen, None) # Exhaust generator
        except Exception as e:
            print(f"Error during DB generator exhaustion in API POST: {e}")


# === Routes for /frontend/placement ===
# NOTE: These currently mirror the API logic but use the client_placement_bp
#       and can be modified independently in the future.

@client_placement_bp.route('/get-placement', methods=['GET'])
def get_placement_frontend():
    """ Frontend API: Get all current placements """
    db_gen = get_db()
    db: Session = next(db_gen)  # Get the actual session object
    try:
        placements = placement_service.get_all_current_placements(db)
        # FOR NOW: Keep response format same as API.
        # FUTURE: Modify response_data formatting here if needed for frontend.
        response_data = [placement.dict(exclude_none=True) for placement in placements]
        return jsonify({"success": True, "placements": response_data}), 200
    except Exception as e:
        print(f"Error in /frontend/placement/get-placement route: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        try:
            next(db_gen, None)  # Exhaust generator
        except Exception as e:
            print(f"Error during DB generator exhaustion in Frontend GET: {e}")


@client_placement_bp.route('/stats', methods=['GET'])
def get_module_stats():
    """ Frontend API: Get module statistics for ISS """
    db_gen = get_db()
    db: Session = next(db_gen)
    try:
        # For now, return mock data structure
        # In the future, this should query the actual database for real stats
        modules_data = {
            "module-1": {
                "totalItems": 45,
                "totalContainers": 12
            },
            "module-2": {
                "totalItems": 32,
                "totalContainers": 8
            },
            "module-3": {
                "totalItems": 67,
                "totalContainers": 15
            },
            "module-4": {
                "totalItems": 28,
                "totalContainers": 7
            },
            "module-5": {
                "totalItems": 89,
                "totalContainers": 22
            }
        }
        
        return jsonify({
            "success": True,
            "modules": modules_data
        }), 200
        
    except Exception as e:
        print(f"Error in /client/placement/stats route: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        try:
            next(db_gen, None)
        except Exception as e:
            print(f"Error during DB generator exhaustion in stats route: {e}")


@client_placement_bp.route('', methods=['POST'])
def handle_placement_frontend():
    """
    Frontend API: Endpoint for Placement Recommendations.
    Receives a list of items and container definitions, returns suggested placements
    and rearrangements. Response format can be adapted for frontend needs.
    """
    db_gen = get_db()
    db: Session = next(db_gen) # Get the actual session object
    try:
        # --- Validate Request Body (same as API for now) ---
        try:
            json_data = request.get_json()
            if not json_data:
                return jsonify({"success": False, "error": "Request body must be JSON."}), 400
            request_data = PlacementRequest(**json_data)
        except ValidationError as e:
            return jsonify({"success": False, "error": "Invalid request body", "details": e.errors()}), 400
        except Exception as e:
            return jsonify({"success": False, "error": f"Invalid request format: {e}"}), 400

        # --- Get User ID (same as API for now) ---
        user_id = request.headers.get("X-User-ID", "system")

        # --- Call Placement Service (same as API for now) ---
        response_data: PlacementResponse = placement_service.suggest_placements(db, request_data, user_id)

        # --- Format and Return Response ---
        # FOR NOW: Keep response format same as API.
        # FUTURE: Modify the structure of the jsonify() call below if needed.
        status_code = 200 if response_data.success else 207
        if response_data.error and not response_data.success and not response_data.placements and not response_data.rearrangements:
            status_code = 400

        return jsonify(response_data.dict(exclude_none=True)), status_code

    except ValueError as ve:
         return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        print(f"Critical Error in /frontend/placement route: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        try:
            next(db_gen, None) # Exhaust generator
        except Exception as e:
            print(f"Error during DB generator exhaustion in Frontend POST: {e}")