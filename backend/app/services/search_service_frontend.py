from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from app.models_db import Item, Container, Placement
from app.api.models_api_frontend import ItemFrontendResponse, ContainerFrontendResponse

def search_items_frontend(db_session: Session, search_term: str) -> List[ItemFrontendResponse]:
    """
    Search for items by name, ID, or preferred zone.
    Returns items with their placement information if available.
    """
    if not search_term:
        return []

    # Build the query with joins to get placement and container info
    query = (db_session.query(Item, Placement, Container)
             .outerjoin(Placement, Item.item_id == Placement.item_id_fk)  # outer join to include items without placement
             .outerjoin(Container, Placement.container_id_fk == Container.container_id))  # outer join to include items without container

    # Apply search filters
    query = query.filter(
        or_(
            (Item.name.ilike(f"%{search_term}%")) |
            (Item.item_id.ilike(f"%{search_term}%")) |
            (Item.preferred_zone.ilike(f"%{search_term}%"))
        )
    )

    results = query.all()
    
    # Also search by container ID if the search term looks like a container ID
    if search_term.upper().startswith(('M1-', 'M2-', 'M3-')):
        container_query = (db_session.query(Item, Placement, Container)
                          .join(Placement, Item.item_id == Placement.item_id_fk)
                          .join(Container, Placement.container_id_fk == Container.container_id)
                          .filter(Container.container_id.ilike(f"%{search_term}%")))
        
        container_results = container_query.all()
        results.extend(container_results)

    # Also search by zone name
    zone_query = (db_session.query(Item, Placement, Container)
                  .outerjoin(Placement, Item.item_id == Placement.item_id_fk)
                  .outerjoin(Container, Placement.container_id_fk == Container.container_id)
                  .filter(
                      and_(
                          (Item.preferred_zone.ilike(f"%{search_term}%")) &
                          (Item.preferred_zone.isnot(None))
                      )
                  ))
    
    zone_results = zone_query.all()
    results.extend(zone_results)

    # Convert to response format
    items_response = []
    seen_item_ids = set()

    for item, placement, container in results:
        if item.item_id in seen_item_ids:
            continue
        
        seen_item_ids.add(item.item_id)
        container_id = placement.container_id_fk if placement else None
        
        # Get position coordinates if placement exists
        position_start_width = placement.start_w if placement else 0.0
        position_start_depth = placement.start_d if placement else 0.0
        position_start_height = placement.start_h if placement else 0.0
        position_end_width = placement.end_w if placement else 0.0
        position_end_depth = placement.end_d if placement else 0.0
        position_end_height = placement.end_h if placement else 0.0
        
        items_response.append(ItemFrontendResponse(
            id=item.item_id,
            name=item.name,
            category=item.category,
            subcategory=item.subcategory,
            containerId=container_id or "",
            quantity=1,
            mass_kg=item.mass_kg,
            expirationDate=item.expiry_date,
            width_cm=item.width_cm,
            depth_cm=item.depth_cm,
            height_cm=item.height_cm,
            priority=item.priority,
            usageLimit=item.usage_limit,
            usageCount=getattr(item, 'current_uses', 0),
            preferredZone=item.preferred_zone,
            position_start_width=position_start_width,
            position_start_depth=position_start_depth,
            position_start_height=position_start_height,
            position_end_width=position_end_width,
            position_end_depth=position_end_depth,
            position_end_height=position_end_height
        ))

    return items_response

def search_containers_frontend(db_session: Session, search_term: str) -> List[ContainerFrontendResponse]:
    """
    Search for containers by ID or zone.
    """
    if not search_term:
        return []

    # Search by container ID or zone
    query = (db_session.query(Container)
             .filter(
                 or_(
                     Container.container_id.ilike(f"%{search_term}%"),
                     Container.zone.ilike(f"%{search_term}%")
                 )
             ))

    results = query.all()
    
    # Convert to response format
    containers_response = []
    seen_container_ids = set()

    for container in results:
        if container.container_id in seen_container_ids:
            continue
        
        seen_container_ids.add(container.container_id)
        
        containers_response.append(ContainerFrontendResponse(
            id=container.container_id,
            name=container.container_id,  # Using ID as name
            type="Supply Container",
            zoneId=container.zone,
            module_id=container.module_id,
            capacity=0,
            width_cm=container.width_cm,
            depth_cm=container.depth_cm,
            height_cm=container.height_cm,
            maxWeight=0.0,
            currentWeight=0.0,
            start_width=None,
            start_depth=None,
            start_height=None,
            end_width=None,
            end_depth=None,
            end_height=None
        ))

    return containers_response