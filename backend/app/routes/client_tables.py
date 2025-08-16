# /app/routes/tables.py

from flask import Blueprint, request, jsonify
from pydantic import ValidationError
from sqlalchemy.orm import Session
from typing import Optional

# Import services, schemas, and db session getter
from app.services.tables import get_containers_service, get_items_service
from app.api.models_api_tables import (
    PaginationParams, BaseFilterParams, ItemFilterParams,
    PaginatedContainerResponse, PaginatedItemResponse, ItemStatus
)
from ..database import get_db # Use the dependency injection style getter

tables_bp = Blueprint('tables', __name__, url_prefix='/api/tables')

# --- Helper to get DB session ---
# This replaces direct use of db_session if you prefer dependency injection
def get_session() -> Session:
    """Generator function to provide a DB session."""
    db = next(get_db()) # Get the session from the generator
    try:
        yield db
    finally:
        # The get_db generator in database.py handles closing
        pass # Session is closed by the context manager in get_db

# --- Container Route ---

@tables_bp.route('/containers', methods=['GET'])
def get_containers():
    """
    API endpoint to get a list of containers with pagination and search.
    Query Params:
    - page (int, optional, default=1): Page number.
    - size (int, optional, default=10): Items per page.
    - search (str, optional): Search term for containerId or zone.
    """
    try:
        # Parse pagination and filter parameters
        page = request.args.get('page', 1, type=int)
        size = request.args.get('size', 10, type=int)
        search = request.args.get('search', None, type=str)

        # Clamp size to reasonable limits
        size = max(1, min(size, 100))
        page = max(1, page)

        pagination = PaginationParams(page=page, size=size)
        filters = BaseFilterParams(search=search)

    except (ValidationError, ValueError) as e:
        return jsonify({"error": "Invalid query parameters", "details": str(e)}), 400

    db: Session = next(get_session()) # Get DB session
    try:
        containers_dto, total_count = get_containers_service(db, pagination, filters)

        response_data = PaginatedContainerResponse(
            total=total_count,
            page=pagination.page,
            size=pagination.size,
            items=containers_dto
        )
        # Use model_dump() for Pydantic v2, dict() for v1
        return jsonify(response_data.model_dump(by_alias=True) if hasattr(response_data, 'model_dump') else response_data.dict(by_alias=True))

    except Exception as e:
        # Log the exception e
        print(f"Error fetching containers: {e}") # Basic logging
        return jsonify({"error": "An unexpected error occurred"}), 500


# --- Item Route ---

@tables_bp.route('/items', methods=['GET'])
def get_items():
    """
    API endpoint to get a list of items with pagination, search, and filters.
    Query Params:
    - page (int, optional, default=1): Page number.
    - size (int, optional, default=10): Items per page.
    - search (str, optional): Search term for item ID, name, preferred zone, container ID, current zone.
    - status (str, optional): Filter by item status (e.g., 'active', 'expired').
    - preferred_zone (str, optional): Filter by item's preferred zone.
    """
    try:
        # Parse pagination and filter parameters
        page = request.args.get('page', 1, type=int)
        size = request.args.get('size', 10, type=int)
        search = request.args.get('search', None, type=str)
        status_str = request.args.get('status', None, type=str)
        preferred_zone = request.args.get('preferred_zone', None, type=str)
        category = request.args.get('category', None, type=str)
        subcategory = request.args.get('subcategory', None, type=str)

        # Clamp size and page
        size = max(1, min(size, 100))
        page = max(1, page)

        # Validate status enum if provided
        status_enum: Optional[ItemStatus] = None
        if status_str:
            try:
                status_enum = ItemStatus(status_str.lower())
            except ValueError:
                return jsonify({"error": f"Invalid status value. Allowed values: {[s.value for s in ItemStatus]}"}), 400

        pagination = PaginationParams(page=page, size=size)
        filters = ItemFilterParams(
            search=search,
            status=status_enum,
            preferred_zone=preferred_zone,
            category=category,
            subcategory=subcategory
        )

    except (ValidationError, ValueError) as e:
        return jsonify({"error": "Invalid query parameters", "details": str(e)}), 400

    db: Session = next(get_session()) # Get DB session
    try:
        items_dto, total_count = get_items_service(db, pagination, filters)

        response_data = PaginatedItemResponse(
            total=total_count,
            page=pagination.page,
            size=pagination.size,
            items=items_dto
        )
        # Use model_dump() for Pydantic v2, dict() for v1
        return jsonify(response_data.model_dump(by_alias=True) if hasattr(response_data, 'model_dump') else response_data.dict(by_alias=True))

    except Exception as e:
        # Log the exception e
        print(f"Error fetching items: {e}") # Basic logging
        return jsonify({"error": "An unexpected error occurred"}), 500