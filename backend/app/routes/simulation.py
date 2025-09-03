
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

        # Use user_id from request body instead of headers
        user_id = request_data.user_id
        try:
            response_data = simulation_service.simulate_time_passage(db, request_data, user_id)
            # Convert datetime in response back to ISO string for JSON
            response_dict = response_data.dict()
            response_dict['newDate'] = response_data.new_date.isoformat()  # Use new_date from model
            
            # Convert timestamps in changes to ISO strings
            for change in response_dict['changes']['items_used']:
                change['timestamp'] = change['timestamp'].isoformat()
                # Convert remaining_uses to remainingUses for frontend compatibility
                if 'remaining_uses' in change:
                    change['remainingUses'] = change.pop('remaining_uses')
            for change in response_dict['changes']['items_expired']:
                change['timestamp'] = change['timestamp'].isoformat()
            for change in response_dict['changes']['items_depleted_today']:
                change['timestamp'] = change['timestamp'].isoformat()
            
            # Convert field names to camelCase for frontend compatibility
            response_dict['changes']['itemsUsed'] = response_dict['changes'].pop('items_used')
            response_dict['changes']['itemsExpired'] = response_dict['changes'].pop('items_expired')
            response_dict['changes']['itemsDepletedToday'] = response_dict['changes'].pop('items_depleted_today')
            
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


@sim_bp.route('/predict', methods=['GET'])
def handle_simulation_prediction():
    """Predicts what will happen during simulation without actually running it."""
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Get query parameter for prediction days
        days_ahead = int(request.args.get('days_ahead', '30'))
        
        if days_ahead <= 0 or days_ahead > 365:
            return jsonify({"success": False, "error": "days_ahead must be between 1 and 365"}), 400
        
        predictions = simulation_service.predict_simulation_outcomes(db, days_ahead)
        return jsonify({
            "success": True,
            "predictions": predictions
        })
        
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        print(f"Error in /api/simulate/predict route: {e}")
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        next(db_gen, None)
        db.close()


@sim_bp.route('/current-time', methods=['GET'])
def handle_get_current_time():
    """Gets the current simulation time."""
    try:
        current_time = simulation_service.get_current_simulation_time()
        return jsonify({
            "success": True,
            "current_simulation_time": current_time.isoformat(),
            "current_date": current_time.date().isoformat()
        })
    except Exception as e:
        print(f"Error in /api/simulate/current-time route: {e}")
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500