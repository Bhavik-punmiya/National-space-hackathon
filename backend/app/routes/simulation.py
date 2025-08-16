
# /app/routes/simulation.py
import logging
from flask import Blueprint, request, jsonify
from app.database import get_db
from app.services import simulation_service
from app.models_api import SimulationRequest
from pydantic import ValidationError

sim_bp = Blueprint('sim_bp', __name__, url_prefix='/api/simulate')

@sim_bp.route('/day', methods=['POST'])
def handle_simulate_day():
    """ NOTE: Uses global in-memory time - not production safe! """
    db_gen = get_db()
    db = next(db_gen)
    try:
        try:
            request_data = SimulationRequest(**request.get_json())
        except ValidationError as e:
            return jsonify({"success": False, "error": "Invalid request body", "details": e.errors()}), 400
        except Exception as e:
             return jsonify({"success": False, "error": f"Invalid request format: {e}"}), 400

        user_id = request.headers.get("X-User-ID") # User initiating simulation
        try:
            response_data = simulation_service.simulate_time_passage(db, request_data, user_id)
            # Convert datetime in response back to ISO string for JSON
            response_dict = response_data.dict()
            response_dict['newDate'] = response_data.newDate.isoformat()
            
            # Convert timestamps in changes to ISO strings
            for change in response_dict['changes']['itemsUsed']:
                change['timestamp'] = change['timestamp'].isoformat()
            for change in response_dict['changes']['itemsExpired']:
                change['timestamp'] = change['timestamp'].isoformat()
            for change in response_dict['changes']['itemsDepletedToday']:
                change['timestamp'] = change['timestamp'].isoformat()
            
            return jsonify(response_dict)
        except Exception as e:
            db.rollback()
            logging.exception("Error in simulate_time_passage")
            return jsonify({"success": False, "error": f"Simulation failed: {e}"}), 500

    except ValueError as ve:
         db.rollback() # Rollback if simulation failed mid-way
         return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        db.rollback()
        logging.exception("Error in /api/simulate/day route")
        # Reset simulation time? Or leave inconsistent? Log error heavily.
        return jsonify({"success": False, "error": "An internal server error occurred during simulation."}), 500
    finally:
        next(db_gen, None)
        db.close()