# /app/services/tables.py

from sqlalchemy.orm import Session, contains_eager, subqueryload, aliased
from sqlalchemy import func, or_, and_, select, case
from typing import Optional, Tuple, List
from datetime import datetime

# Import DB models and API schemas
from app.models_db import Item, Container, Placement, ItemStatus
from app.api.models_api_tables import (
    PaginationParams, BaseFilterParams, ItemFilterParams,
    ContainerApiSchema, ItemApiSchema
)

def calculate_item_status(item_db) -> ItemStatus:
    """
    Calculate the current status of an item based on its usage and expiry date.
    """
    # Check if item is disposed (status is already set to DISPOSED)
    if item_db.status == ItemStatus.DISPOSED:
        return ItemStatus.DISPOSED
    
    # Check if item is expired
    if item_db.expiry_date and item_db.expiry_date != "N/A":
        try:
            # Parse the expiry date (assuming format like "2026-06-12" or "2026-06-12T00:00:00Z")
            expiry_date_str = item_db.expiry_date
            if 'T' in expiry_date_str:
                # Handle ISO format
                expiry_date = datetime.fromisoformat(expiry_date_str.replace('Z', '+00:00'))
            else:
                # Handle simple date format
                expiry_date = datetime.strptime(expiry_date_str, '%Y-%m-%d')
            
            if expiry_date < datetime.now():
                return ItemStatus.WASTE_EXPIRED
        except (ValueError, TypeError):
            # If date parsing fails, continue to other checks
            pass
    
    # Check if item is depleted (usage limit reached)
    if item_db.maximum_uses and item_db.maximum_uses != "N/A":
        try:
            usage_limit = int(item_db.maximum_uses)
            current_uses = getattr(item_db, 'current_uses', 0)  # Get current_uses, default to 0 if not available
            
            # Check if current usage has reached or exceeded the limit
            if current_uses >= usage_limit:
                return ItemStatus.WASTE_DEPLETED
        except (ValueError, TypeError):
            # If usage parsing fails, continue to other checks
            pass
    
    # Default to active
    return ItemStatus.ACTIVE

def get_containers_service(
    db: Session,
    pagination: PaginationParams,
    filters: BaseFilterParams,
    zone_filter: Optional[str] = None,
    container_type_filter: Optional[str] = None
) -> Tuple[List[ContainerApiSchema], int]:
    """
    Fetches a paginated list of containers with counts, applying search filters.
    """
    try:
        # Base query
        query = db.query(Container)

        # --- Search ---
        if filters.search:
            search_term = f"%{filters.search.lower()}%"
            query = query.filter(
                or_(
                    func.lower(Container.container_id).ilike(search_term),
                    func.lower(Container.zone).ilike(search_term),
                    func.lower(Container.name).ilike(search_term),
                    func.lower(Container.module_id).ilike(search_term)
                )
            )
        
        # --- Zone Filter ---
        if zone_filter:
            query = query.filter(Container.zone == zone_filter)
        
        # --- Container Type Filter ---
        if container_type_filter:
            query = query.filter(Container.type == container_type_filter)

        # --- Total Count (before pagination) ---
        total_count = query.count()

        # --- Pagination ---
        query = query.offset((pagination.page - 1) * pagination.size).limit(pagination.size)

        # --- Fetch Containers ---
        containers_db = query.all()

        # --- Prepare Response DTOs ---
        results = []
        for container in containers_db:
            # Count total items in this container
            item_count = db.query(func.count(Placement.id)).filter(
                Placement.container_id_fk == container.container_id
            ).scalar()

            # Count expired items in this container
            expired_item_count = db.query(func.count(Placement.id))\
                .join(Item, Placement.item_id_fk == Item.item_id)\
                .filter(
                    Placement.container_id_fk == container.container_id, 
                    Item.status == ItemStatus.WASTE_EXPIRED
                ).scalar()

            container_dto = ContainerApiSchema(
                container_id=container.container_id,
                zone=container.zone,
                module_id=container.module_id,
                width_cm=container.width_cm,
                depth_cm=container.depth_cm,
                height_cm=container.height_cm,
                item_count=item_count or 0,
                expired_item_count=expired_item_count or 0,
                name=getattr(container, 'name', None),
                type=getattr(container, 'type', None),
                open_face=getattr(container, 'open_face', None),
                max_mass=getattr(container, 'max_mass', None),
                current_mass=getattr(container, 'current_mass', None),
                access_index=getattr(container, 'access_index', None),
                is_active=getattr(container, 'is_active', None),
                description=getattr(container, 'description', None),
            )
            results.append(container_dto)

        return results, total_count
    except Exception as e:
        print(f"Error in get_containers_service: {e}")
        raise


def get_items_service(
    db: Session,
    pagination: PaginationParams,
    filters: ItemFilterParams
) -> Tuple[List[ItemApiSchema], int]:
    """
    Fetches a paginated list of items, applying search and specific filters.
    Includes placement information if available.
    """
    print(f"DEBUG: Starting get_items_service with pagination={pagination}, filters={filters}")
    try:
        # --- Base Query with Joins ---
        # We need info from Item, Placement (optional), and Container (optional)
        # Use outer join to include items that are not placed
        print("DEBUG: Building base query with joins")
        query = db.query(
            Item,
            Placement.container_id_fk,
            Container.zone.label("currentZone") # Alias Container.zone to avoid name clash if needed elsewhere
        ).outerjoin(
            Placement, Item.item_id == Placement.item_id_fk
        ).outerjoin(
            Container, Placement.container_id_fk == Container.container_id
        )
        print("DEBUG: Base query built successfully")

        # --- Filtering ---
        if filters.status:
            query = query.filter(Item.status == filters.status)
        if filters.preferred_zone:
            # Handle empty string search for preferred_zone if needed
            if filters.preferred_zone == "":
                 query = query.filter(or_(Item.preferred_zone == "", Item.preferred_zone == None))
            else:
                query = query.filter(Item.preferred_zone == filters.preferred_zone)
        if filters.category:
            query = query.filter(Item.category == filters.category)
        if filters.subcategory:
            query = query.filter(Item.subcategory == filters.subcategory)


        # --- Search ---
        if filters.search:
            search_term = f"%{filters.search.lower()}%"
            # Search across Item fields and related Container fields
            query = query.filter(
                or_(
                    func.lower(Item.item_id).ilike(search_term),
                    func.lower(Item.name).ilike(search_term),
                    func.lower(Item.category).ilike(search_term),
                    func.lower(Item.subcategory).ilike(search_term),
                    func.lower(Item.preferred_zone).ilike(search_term),
                    # Search container_id and zone only if item is placed (via Placement/Container join)
                    and_(Placement.container_id_fk != None, func.lower(Placement.container_id_fk).ilike(search_term)),
                    and_(Container.zone != None, func.lower(Container.zone).ilike(search_term)),
                )
            )

        # --- Total Count (before pagination) ---
        # Need to be careful with count() after joins, sometimes requires distinct
        # Using count on the primary key of the main table (Item) is safer
        print("DEBUG: Building count query")
        count_query = db.query(func.count(Item.id)).select_from(Item)
        # Re-apply joins and filters for the count query
        count_query = count_query.outerjoin(
            Placement, Item.item_id == Placement.item_id_fk
        ).outerjoin(
            Container, Placement.container_id_fk == Container.container_id
        )
        print("DEBUG: Count query built successfully")
        if filters.status:
            count_query = count_query.filter(Item.status == filters.status)
        if filters.preferred_zone:
             if filters.preferred_zone == "":
                 count_query = count_query.filter(or_(Item.preferred_zone == "", Item.preferred_zone == None))
             else:
                count_query = count_query.filter(Item.preferred_zone == filters.preferred_zone)
        if filters.category:
            count_query = count_query.filter(Item.category == filters.category)
        if filters.subcategory:
            count_query = count_query.filter(Item.subcategory == filters.subcategory)
        if filters.search:
            search_term = f"%{filters.search.lower()}%"
            count_query = count_query.filter(
                 or_(
                    func.lower(Item.item_id).ilike(search_term),
                    func.lower(Item.name).ilike(search_term),
                    func.lower(Item.category).ilike(search_term),
                    func.lower(Item.subcategory).ilike(search_term),
                    func.lower(Item.preferred_zone).ilike(search_term),
                    and_(Placement.container_id_fk != None, func.lower(Placement.container_id_fk).ilike(search_term)),
                    and_(Container.zone != None, func.lower(Container.zone).ilike(search_term)),
                )
            )

        print("DEBUG: Executing count query")
        total_count = count_query.scalar() or 0
        print(f"DEBUG: Total count result: {total_count}")


        # --- Ordering (Optional - add if needed, e.g., by name or priority) ---
        # query = query.order_by(Item.name) # Example ordering

        # --- Pagination ---
        print("DEBUG: Applying pagination")
        query = query.offset((pagination.page - 1) * pagination.size).limit(pagination.size)

        # --- Fetch Data ---
        print("DEBUG: Executing main query")
        results_db = query.all() # Returns tuples: (Item, container_id_fk, currentZone)
        print(f"DEBUG: Query returned {len(results_db)} results")

        # --- Prepare Response DTOs ---
        print("DEBUG: Starting to process results into DTOs")
        items_dto: List[ItemApiSchema] = []
        for i, (item_db, container_id_fk, current_zone) in enumerate(results_db):
            print(f"DEBUG: Processing item {i+1}: {item_db.item_id} - {item_db.name}")
            
            print(f"DEBUG: item_db.expiry_date = {item_db.expiry_date}, type = {type(item_db.expiry_date)}")
            print(f"DEBUG: item_db.maximum_uses = {item_db.maximum_uses}, type = {type(item_db.maximum_uses)}")
            print(f"DEBUG: item_db.width_cm = {item_db.width_cm}, type = {type(item_db.width_cm)}")
            print(f"DEBUG: item_db.mass_kg = {item_db.mass_kg}, type = {type(item_db.mass_kg)}")
            
            # Calculate the current status based on usage and expiry
            calculated_status = calculate_item_status(item_db)
            
            item_dto = ItemApiSchema(
                item_id=item_db.item_id,
                name=item_db.name,
                category=item_db.category,
                subcategory=item_db.subcategory,
                container_id=container_id_fk, # Directly from the query result
                quantity=1, # As per assumption
                mass_kg=item_db.mass_kg,
                expiry_date=item_db.expiry_date,  # Use the direct field name
                width_cm=item_db.width_cm,
                depth_cm=item_db.depth_cm,
                height_cm=item_db.height_cm,
                priority=item_db.priority,
                usage_limit=str(item_db.maximum_uses) if item_db.maximum_uses else None,  # Map maximum_uses to usage_limit
                current_uses=getattr(item_db, 'current_uses', 0),  # Get current_uses, default to 0
                preferred_zone=item_db.preferred_zone,
                current_zone=current_zone, # Directly from the query result alias
                status=calculated_status,  # Use calculated status instead of stored status
                expired=(calculated_status == ItemStatus.WASTE_EXPIRED),
                depleted=(calculated_status == ItemStatus.WASTE_DEPLETED),
                temp_requirement=getattr(item_db, 'temp_requirement', None),
                hazardous_class=getattr(item_db, 'hazardous_class', None),
            )
            items_dto.append(item_dto)

        print(f"DEBUG: Successfully processed {len(items_dto)} items")
        return items_dto, total_count
    except Exception as e:
        print(f"ERROR in get_items_service: {e}")
        print(f"ERROR type: {type(e)}")
        import traceback
        print(f"ERROR traceback: {traceback.format_exc()}")
        raise