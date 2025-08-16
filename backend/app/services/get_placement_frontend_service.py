from typing import List, Dict, Any, Tuple
from ..models_db import Container, Item, Placement
from app.api.models_api_frontend import ContainerFrontendResponse, ItemFrontendResponse, PlacementFrontendResponse

class PlacementFrontendService:
    """Service for retrieving placement information formatted for the frontend."""
    
    @staticmethod
    def get_all_placements_frontend(db_session) -> PlacementFrontendResponse:
        """
        Get all containers and their placed items in a format matching the frontend CSV.
        
        Args:
            db_session: Database session
            
        Returns:
            PlacementFrontendResponse: Object containing containers and items in frontend format
        """
        # Get all containers
        containers = db_session.query(Container).all()
        
        # Get all items with placements
        items_with_placements = (
            db_session.query(Item, Placement, Container)
            .join(Placement, Item.item_id == Placement.item_id_fk)
            .join(Container, Placement.container_id_fk == Container.container_id)
            .all()
        )
        
        # Format containers for response
        container_responses = []
        for container in containers:
            container_responses.append(
                ContainerFrontendResponse(
                    id=container.container_id,
                    name=container.container_id,  # Using container_id as name
                    zoneId=container.zone,
                    module_id=container.module_id,
                    width_cm=container.width_cm,
                    depth_cm=container.depth_cm,
                    height_cm=container.height_cm,
                    # Adding default spatial coordinates
                    start_width=0.0,
                    start_depth=0.0,
                    start_height=0.0,
                    end_width=container.width_cm,
                    end_depth=container.depth_cm,
                    end_height=container.height_cm
                )
            )
        
        # Format items for response
        item_responses = []
        for item, placement, container in items_with_placements:
            item_responses.append(
                ItemFrontendResponse(
                    id=item.item_id,
                    name=item.name,
                    category=item.category,
                    subcategory=item.subcategory,
                    containerId=container.container_id,
                    mass_kg=item.mass_kg,
                    expirationDate=item.expiry_date,
                    width_cm=item.width_cm,
                    depth_cm=item.depth_cm,
                    height_cm=item.height_cm,
                    priority=item.priority,
                    usageLimit=item.usage_limit,
                    usageCount=0,  # currentUses field was removed
                    preferredZone=item.preferred_zone,
                    position_start_width=placement.start_w,
                    position_start_depth=placement.start_d,
                    position_start_height=placement.start_h,
                    position_end_width=placement.end_w,
                    position_end_depth=placement.end_d,
                    position_end_height=placement.end_h
                )
            )
        
        return PlacementFrontendResponse(
            containers=container_responses,
            items=item_responses
        )