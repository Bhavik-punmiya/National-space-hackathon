from flask import Blueprint, jsonify
from app.database import db_session
from app.services.get_placement_frontend_service import PlacementFrontendService

# Create a blueprint for frontend placement routes
client_placement_bp_frontend = Blueprint('frontend_placement', __name__, url_prefix='/api/frontend')

@client_placement_bp_frontend.route('/placements', methods=['GET'])
def get_placements_frontend():
    """
    Get placement information for items and containers in a format matching 
    the frontend's expected CSV structure with enhanced fields.
    
    Returns:
        JSON response with containers and items data formatted for the frontend
    """
    try:
        response = PlacementFrontendService.get_all_placements_frontend(db_session)
        
        # Convert Pydantic model to dict for JSON response
        return jsonify(response.model_dump())  # Use model_dump() for Pydantic v2
    except Exception as e:
        # Log the error here if you have logging set up
        return jsonify({"error": str(e)}), 500