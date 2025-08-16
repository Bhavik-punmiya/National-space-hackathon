from flask import Blueprint, jsonify, request
from app.database import get_db
from app.services.search_service_frontend import search_items_frontend, search_containers_frontend

# Create a blueprint for frontend search routes
search_frontend_bp = Blueprint('search_frontend', __name__, url_prefix='/api/frontend')

@search_frontend_bp.route('/search', methods=['GET'])
def search():
    """
    Dynamic search endpoint for frontend.
    Supports incremental character-by-character searching across multiple entities.
    
    Query Parameters:
        q: Search query string (even partial)
        type: Type of search ('items', 'containers', or 'all')
        
    Returns:
        JSON response with search results
    """
    try:
        # Get query parameters
        query = request.args.get('q', '')
        search_type = request.args.get('type', 'all')
        
        if not query:
            return jsonify({
                "success": True,
                "query": query,
                "items": [],
                "containers": [],
                "total_count": 0
            })
        
        # Get database session
        db_gen = get_db()
        db = next(db_gen)
        
        try:
            items = []
            containers = []
            
            # Perform search based on type
            if search_type in ['items', 'all']:
                items = search_items_frontend(db, query)
            
            if search_type in ['containers', 'all']:
                containers = search_containers_frontend(db, query)
            
            # Convert to response format
            items_response = [item.dict() for item in items]
            containers_response = [container.dict() for container in containers]
            
            total_count = len(items_response) + len(containers_response)
            
            return jsonify({
                "success": True,
                "query": query,
                "items": items_response,
                "containers": containers_response,
                "total_count": total_count
            })
            
        finally:
            next(db_gen, None)
            db.close()
            
    except Exception as e:
        # Log the error here if you have logging set up
        return jsonify({
            "success": False,
            "query": request.args.get('q', ''),
            "items": [],
            "containers": [],
            "total_count": 0,
            "error": str(e)
        }), 500

# To integrate this blueprint, add the following to your main.py:
# from .routes.search_frontend import search_frontend_bp
# app.register_blueprint(search_frontend_bp)