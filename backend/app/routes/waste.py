# /app/routes/waste.py
from flask import Blueprint, request, jsonify
from app.database import get_db
from app.services import waste_service
from app.models_api import WasteReturnPlanRequest, WasteCompleteUndockingRequest
from pydantic import ValidationError


waste_bp = Blueprint('waste_bp', __name__, url_prefix='/api/waste')

@waste_bp.route('/identify', methods=['GET'])
def handle_identify_waste():
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Get query parameters for expiring soon items
        include_expiring_soon = request.args.get('include_expiring_soon', 'true').lower() == 'true'
        expiring_days_threshold = int(request.args.get('expiring_days_threshold', '30'))
        
        response_data = waste_service.identify_waste_items(
            db, 
            include_expiring_soon=include_expiring_soon,
            expiring_days_threshold=expiring_days_threshold
        )
        return jsonify(response_data.dict())
    except Exception as e:
        # Identify doesn't usually modify, but commit within service might fail
        db.rollback()
        print(f"Error in /api/waste/identify route: {e}")
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        next(db_gen, None)
        db.close()


@waste_bp.route('/return-plan', methods=['POST'])
def handle_return_plan():
    db_gen = get_db()
    db = next(db_gen)
    try:
        try:
            request_data = WasteReturnPlanRequest(**request.get_json())
        except ValidationError as e:
            return jsonify({"success": False, "error": "Invalid request body", "details": e.errors()}), 400
        except Exception as e:
             return jsonify({"success": False, "error": f"Invalid request format: {e}"}), 400


        user_id = request.headers.get("X-User-ID")
        response_data = waste_service.plan_waste_return(db, request_data, user_id)
        return jsonify(response_data.dict())

    except ValueError as ve:
         db.rollback()
         return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        db.rollback()
        print(f"Error in /api/waste/return-plan route: {e}")
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        next(db_gen, None)
        db.close()


@waste_bp.route('/complete-undocking', methods=['POST'])
def handle_complete_undocking():
    db_gen = get_db()
    db = next(db_gen)
    try:
        try:
            request_data = WasteCompleteUndockingRequest(**request.get_json())
        except ValidationError as e:
            return jsonify({"success": False, "error": "Invalid request body", "details": e.errors()}), 400
        except Exception as e:
             return jsonify({"success": False, "error": f"Invalid request format: {e}"}), 400

        user_id = request.headers.get("X-User-ID")
        response_data = waste_service.complete_undocking_process(db, request_data, user_id)
        return jsonify(response_data.dict())

    except ValueError as ve:
         db.rollback()
         return jsonify({"success": False, "error": str(ve)}), 400 # Or 404 if container not found in logs?
    except Exception as e:
        db.rollback()
        print(f"Error in /api/waste/complete-undocking route: {e}")
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        next(db_gen, None)
        db.close()


@waste_bp.route('/predict', methods=['GET'])
def handle_waste_prediction():
    """Predicts items that will become waste or need resupply in the specified number of days."""
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Get query parameter for prediction days
        days_ahead = int(request.args.get('days_ahead', '30'))
        
        if days_ahead <= 0 or days_ahead > 365:
            return jsonify({"success": False, "error": "days_ahead must be between 1 and 365"}), 400
        
        predictions = waste_service.predict_waste_and_resupply(db, days_ahead)
        return jsonify({
            "success": True,
            "predictions": predictions
        })
        
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        print(f"Error in /api/waste/predict route: {e}")
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        next(db_gen, None)
        db.close()


@waste_bp.route('/analytics', methods=['GET'])
def handle_waste_analytics():
    """Provides analytics on waste generation and patterns over the specified time period."""
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Get query parameter for analytics period
        days_back = int(request.args.get('days_back', '30'))
        
        if days_back <= 0 or days_back > 365:
            return jsonify({"success": False, "error": "days_back must be between 1 and 365"}), 400
        
        analytics = waste_service.get_waste_analytics(db, days_back)
        return jsonify({
            "success": True,
            "analytics": analytics
        })
        
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        print(f"Error in /api/waste/analytics route: {e}")
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        next(db_gen, None)
        db.close()


@waste_bp.route('/resupply-forecast', methods=['GET'])
def handle_resupply_forecast():
    """Provides detailed resupply forecasting based on usage patterns and expiry dates."""
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Get query parameters
        days_ahead = int(request.args.get('days_ahead', '30'))
        category_filter = request.args.get('category', None)
        urgency_filter = request.args.get('urgency', None)  # CRITICAL, HIGH, MEDIUM
        
        if days_ahead <= 0 or days_ahead > 365:
            return jsonify({"success": False, "error": "days_ahead must be between 1 and 365"}), 400
        
        predictions = waste_service.predict_waste_and_resupply(db, days_ahead)
        
        # Apply filters if provided
        if category_filter:
            predictions["items_expiring_soon"] = [
                item for item in predictions["items_expiring_soon"] 
                if item["category"].lower() == category_filter.lower()
            ]
            predictions["items_depleting_soon"] = [
                item for item in predictions["items_depleting_soon"] 
                if item["category"].lower() == category_filter.lower()
            ]
        
        if urgency_filter:
            if urgency_filter.upper() == "CRITICAL":
                predictions["resupply_recommendations"] = [
                    rec for rec in predictions["resupply_recommendations"] 
                    if rec["urgency"] == "CRITICAL"
                ]
            elif urgency_filter.upper() == "HIGH":
                predictions["resupply_recommendations"] = [
                    rec for rec in predictions["resupply_recommendations"] 
                    if rec["urgency"] in ["CRITICAL", "HIGH"]
                ]
        
        # Recalculate total predictions after filtering
        predictions["total_predictions"] = len(predictions["items_expiring_soon"]) + len(predictions["items_depleting_soon"])
        
        return jsonify({
            "success": True,
            "forecast": predictions,
            "filters_applied": {
                "days_ahead": days_ahead,
                "category": category_filter,
                "urgency": urgency_filter
            }
        })
        
    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        print(f"Error in /api/waste/resupply-forecast route: {e}")
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        next(db_gen, None)
        db.close()