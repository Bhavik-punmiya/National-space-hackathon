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
        # Get all containers with enhanced fields
        containers = db_session.query(Container).filter(Container.is_active != False).all()  # Only active containers
        
        # Get all items with placements (using left join to include items without placements)
        items_with_placements = (
            db_session.query(Item, Placement, Container)
            .outerjoin(Placement, Item.item_id == Placement.item_id_fk)
            .outerjoin(Container, Placement.container_id_fk == Container.container_id)
            .all()
        )
        
        # Format containers for response with enhanced fields
        container_responses = []
        for container in containers:
            container_responses.append(
                ContainerFrontendResponse(
                    id=container.container_id,
                    name=container.name or container.container_id,  # Use actual name if available
                    type=container.type.value if container.type else "LOCKER",  # Use enhanced type field
                    zoneId=container.zone,
                    module_id=container.module_id,
                    width_cm=container.width_cm,
                    depth_cm=container.depth_cm,
                    height_cm=container.height_cm,
                    maxWeight=container.max_mass or 0.0,  # Use enhanced max_mass field
                    currentWeight=container.current_mass or 0.0  # Use enhanced current_mass field
                )
            )
        
        # Format items for response with enhanced fields
        item_responses = []
        for item, placement, container in items_with_placements:
            # Handle items without placements
            if placement is None:
                # Item not placed yet
                item_responses.append(
                    ItemFrontendResponse(
                        id=item.item_id,
                        name=item.name,
                        category=item.category,
                        subcategory=item.subcategory,
                        containerId="",  # No container assigned
                        mass_kg=item.mass_kg,
                        width_cm=item.width_cm,
                        depth_cm=item.depth_cm,
                        height_cm=item.height_cm,
                        priority=item.priority or 50,
                        expiry_date=item.expiry_date,
                        preferred_zone=item.preferred_zone,
                        temp_requirement=item.temp_requirement,
                        hazardous_class=item.hazardous_class,
                        maximum_uses=item.maximum_uses,
                        current_uses=item.current_uses or 0,
                        usage_frequency=item.usage_frequency,
                        lot_number=item.lot_number,
                        orientation_allowed=item.orientation_allowed,
                        tags_id=item.tags_id,
                        # Default position values for unplaced items
                        x=0.0,
                        y=0.0,
                        z=0.0
                    )
                )
            else:
                # Item has placement
                item_responses.append(
                    ItemFrontendResponse(
                        id=item.item_id,
                        name=item.name,
                        category=item.category,
                        subcategory=item.subcategory,
                        containerId=container.container_id if container else "",
                        mass_kg=item.mass_kg,
                        width_cm=item.width_cm,
                        depth_cm=item.depth_cm,
                        height_cm=item.height_cm,
                        priority=item.priority or 50,
                        expiry_date=item.expiry_date,
                        preferred_zone=item.preferred_zone,
                        temp_requirement=item.temp_requirement,
                        hazardous_class=item.hazardous_class,
                        maximum_uses=item.maximum_uses,
                        current_uses=item.current_uses or 0,
                        usage_frequency=item.usage_frequency,
                        lot_number=item.lot_number,
                        orientation_allowed=item.orientation_allowed,
                        tags_id=item.tags_id,
                        # Position from placement
                        x=placement.start_w,
                        y=placement.start_d,
                        z=placement.start_h
                    )
                )
        
        return PlacementFrontendResponse(
            containers=container_responses,
            items=item_responses
        )