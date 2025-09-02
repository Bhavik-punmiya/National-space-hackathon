# /app/services/placement_utils.py
"""
Placement Utilities Service
==========================

This service breaks down the complex placement logic into smaller, manageable functions
for better maintainability and testing.
"""

from sqlalchemy.orm import Session
from app.models_db import Item, Container, Placement, ItemStatus, ContainerType
from app.models_api import ItemCreate, ContainerCreate, Coordinates, Position
from app.services.logging_service import create_log_entry, create_item_usage_log
from app.models_db import LogActionType
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple, Set
import math

class PlacementUtils:
    """Utility functions for placement operations."""
    
    @staticmethod
    def calculate_container_volume(container: ContainerCreate) -> float:
        """Calculate the total volume of a container in cubic centimeters."""
        return container.width_cm * container.depth_cm * container.height_cm
    
    @staticmethod
    def calculate_item_volume(item: ItemCreate) -> float:
        """Calculate the volume of an item in cubic centimeters."""
        return item.width_cm * item.depth_cm * item.height_cm
    
    @staticmethod
    def get_container_utilization(db: Session, container_id: str) -> Dict[str, float]:
        """Get current utilization statistics for a container."""
        container = db.query(Container).filter(Container.container_id == container_id).first()
        if not container:
            return {}
        
        # Get all placements in this container
        placements = db.query(Placement).filter(Placement.container_id_fk == container_id).all()
        
        total_volume = container.width_cm * container.depth_cm * container.height_cm
        used_volume = 0
        item_count = len(placements)
        
        for placement in placements:
            item = db.query(Item).filter(Item.item_id == placement.item_id_fk).first()
            if item:
                item_volume = item.width_cm * item.depth_cm * item.height_cm
                used_volume += item_volume
        
        utilization_percentage = (used_volume / total_volume) * 100 if total_volume > 0 else 0
        
        return {
            'total_volume': total_volume,
            'used_volume': used_volume,
            'available_volume': total_volume - used_volume,
            'utilization_percentage': utilization_percentage,
            'item_count': item_count
        }
    
    @staticmethod
    def check_item_fit_in_container(
        item: ItemCreate, 
        container: ContainerCreate,
        orientation: Tuple[float, float, float]
    ) -> bool:
        """Check if an item fits in a container with given orientation."""
        w, d, h = orientation
        return (w <= container.width_cm and 
                d <= container.depth_cm and 
                h <= container.height_cm)
    
    @staticmethod
    def get_item_orientations(item: ItemCreate) -> List[Tuple[float, float, float]]:
        """Get all possible orientations for an item."""
        return [
            (item.width_cm, item.depth_cm, item.height_cm),
            (item.width_cm, item.height_cm, item.depth_cm),
            (item.depth_cm, item.width_cm, item.height_cm),
            (item.depth_cm, item.height_cm, item.width_cm),
            (item.height_cm, item.width_cm, item.depth_cm),
            (item.height_cm, item.depth_cm, item.width_cm)
        ]
    
    @staticmethod
    def find_optimal_placement_spot(
        item: ItemCreate,
        container: ContainerCreate,
        existing_placements: List[Tuple[str, Coordinates, Coordinates]],
        is_high_priority: bool = False
    ) -> Optional[Tuple[Coordinates, Coordinates, Tuple[float, float, float]]]:
        """
        Find the optimal placement spot for an item in a container.
        
        Args:
            item: The item to place
            container: The container to place into
            existing_placements: Current items in the container
            is_high_priority: Whether this is a high priority item
            
        Returns:
            Tuple of (start_coords, end_coords, orientation) or None if no spot found
        """
        orientations = PlacementUtils.get_item_orientations(item)
        
        for orientation in orientations:
            if not PlacementUtils.check_item_fit_in_container(item, container, orientation):
                continue
            
            spot = PlacementUtils._find_spot_for_orientation(
                item, container, orientation, existing_placements, is_high_priority
            )
            
            if spot:
                return spot
        
        return None
    
    @staticmethod
    def _find_spot_for_orientation(
        item: ItemCreate,
        container: ContainerCreate,
        orientation: Tuple[float, float, float],
        existing_placements: List[Tuple[str, Coordinates, Coordinates]],
        is_high_priority: bool
    ) -> Optional[Tuple[Coordinates, Coordinates, Tuple[float, float, float]]]:
        """Find a spot for a specific orientation."""
        w, d, h = orientation
        
        # Define search strategy
        search_depths = PlacementUtils._get_search_depths(container.depth_cm, is_high_priority)
        search_widths = PlacementUtils._get_search_widths(container.width_cm)
        search_heights = PlacementUtils._get_search_heights(container.height_cm, existing_placements)
        
        for start_h in search_heights:
            if start_h + h > container.height_cm:
                continue
                
            for start_d in search_depths:
                if start_d + d > container.depth_cm:
                    continue
                    
                for start_w in search_widths:
                    if start_w + w > container.width_cm:
                        continue
                    
                    # Check if this spot is valid
                    start_coords = Coordinates(width=start_w, depth=start_d, height=start_h)
                    end_coords = Coordinates(
                        width=start_w + w,
                        depth=start_d + d,
                        height=start_h + h
                    )
                    
                    if PlacementUtils._is_valid_spot(start_coords, end_coords, existing_placements):
                        return start_coords, end_coords, orientation
        
        return None
    
    @staticmethod
    def _get_search_depths(container_depth: float, is_high_priority: bool) -> List[float]:
        """Get search depths based on priority."""
        increment = max(container_depth / 20, 0.05)
        depths = [round(i * increment, 3) for i in range(int(container_depth / increment) + 3)]
        
        if not is_high_priority:
            depths.reverse()  # Low priority items go deeper first
        
        return depths
    
    @staticmethod
    def _get_search_widths(container_width: float) -> List[float]:
        """Get search widths."""
        increment = max(container_width / 20, 0.05)
        return [round(i * increment, 3) for i in range(int(container_width / increment) + 3)]
    
    @staticmethod
    def _get_search_heights(container_height: float, existing_placements: List[Tuple[str, Coordinates, Coordinates]]) -> List[float]:
        """Get search heights including floor and tops of existing items."""
        heights = [0.0]  # Start with floor
        
        # Add tops of existing items
        for _, _, end_coords in existing_placements:
            heights.append(end_coords.height)
        
        # Remove duplicates and sort
        heights = sorted(list(set(heights)))
        return heights
    
    @staticmethod
    def _is_valid_spot(
        start_coords: Coordinates,
        end_coords: Coordinates,
        existing_placements: List[Tuple[str, Coordinates, Coordinates]]
    ) -> bool:
        """Check if a spot is valid (no overlaps, stable placement)."""
        # Check for overlaps
        for _, existing_start, existing_end in existing_placements:
            if PlacementUtils._boxes_overlap(start_coords, end_coords, existing_start, existing_end):
                return False
        
        # Check stability (must be on floor or supported)
        if not PlacementUtils._is_stable_placement(start_coords, end_coords, existing_placements):
            return False
        
        return True
    
    @staticmethod
    def _boxes_overlap(
        start1: Coordinates, 
        end1: Coordinates, 
        start2: Coordinates, 
        end2: Coordinates
    ) -> bool:
        """Check if two 3D bounding boxes overlap."""
        tol = 1e-6
        
        # Check for non-overlap along each axis
        no_overlap_w = end1.width <= start2.width + tol or end2.width <= start1.width + tol
        no_overlap_d = end1.depth <= start2.depth + tol or end2.depth <= start1.depth + tol
        no_overlap_h = end1.height <= start2.height + tol or end2.height <= start1.height + tol
        
        # If there is no overlap along ANY axis, the boxes don't overlap overall
        return not (no_overlap_w or no_overlap_d or no_overlap_h)
    
    @staticmethod
    def _is_stable_placement(
        start_coords: Coordinates,
        end_coords: Coordinates,
        existing_placements: List[Tuple[str, Coordinates, Coordinates]]
    ) -> bool:
        """Check if a placement is stable (on floor or supported)."""
        # Must be on floor (start_h near 0) OR supported by items below
        is_on_floor = abs(start_coords.height) < 1e-6
        
        if is_on_floor:
            return True
        
        # Check for support from items below
        for _, existing_start, existing_end in existing_placements:
            if abs(existing_end.height - start_coords.height) < 1e-6:
                # Check for horizontal overlap
                if PlacementUtils._horizontal_overlap(start_coords, end_coords, existing_start, existing_end):
                    return True
        
        return False
    
    @staticmethod
    def _horizontal_overlap(
        start1: Coordinates,
        end1: Coordinates,
        start2: Coordinates,
        end2: Coordinates
    ) -> bool:
        """Check if two 2D rectangles overlap horizontally."""
        tol = 1e-6
        
        no_overlap_w = end1.width <= start2.width + tol or end2.width <= start1.width + tol
        no_overlap_d = end1.depth <= start2.depth + tol or end2.depth <= start1.depth + tol
        
        return not (no_overlap_w or no_overlap_d)
    
    @staticmethod
    def calculate_mass_distribution(
        db: Session,
        container_id: str
    ) -> Dict[str, float]:
        """Calculate mass distribution in a container."""
        container = db.query(Container).filter(Container.container_id == container_id).first()
        if not container:
            return {}
        
        placements = db.query(Placement).filter(Placement.container_id_fk == container_id).all()
        
        total_mass = 0
        mass_by_zone = {}
        
        for placement in placements:
            item = db.query(Item).filter(Item.item_id == placement.item_id_fk).first()
            if item:
                total_mass += item.mass_kg
                
                # Calculate zone based on position
                zone = PlacementUtils._get_position_zone(placement, container)
                mass_by_zone[zone] = mass_by_zone.get(zone, 0) + item.mass_kg
        
        return {
            'total_mass': total_mass,
            'max_mass': container.max_mass or float('inf'),
            'mass_by_zone': mass_by_zone,
            'mass_utilization': (total_mass / container.max_mass * 100) if container.max_mass else 0
        }
    
    @staticmethod
    def _get_position_zone(placement: Placement, container: Container) -> str:
        """Get the zone of a placement within a container."""
        # Simple zone calculation based on depth
        depth_ratio = placement.start_d / container.depth_cm
        
        if depth_ratio < 0.33:
            return "front"
        elif depth_ratio < 0.66:
            return "middle"
        else:
            return "back"
    
    @staticmethod
    def validate_placement_constraints(
        item: ItemCreate,
        container: Container,
        position: Position
    ) -> Tuple[bool, List[str]]:
        """Validate placement against various constraints."""
        errors = []
        
        # Check temperature requirements
        if item.temp_requirement != "N/A":
            # This would need more complex logic based on container temperature zones
            pass
        
        # Check hazardous material constraints
        if item.hazardous_class != "NONE":
            # Check if container supports hazardous materials
            if container.type in [ContainerType.TRASH_BAG, ContainerType.FREE_VOLUME]:
                errors.append(f"Container type {container.type.value} does not support hazardous materials")
        
        # Check mass constraints
        if container.max_mass:
            current_mass = container.current_mass or 0
            if current_mass + item.mass_kg > container.max_mass:
                errors.append(f"Item mass {item.mass_kg}kg exceeds container capacity")
        
        # Check orientation constraints
        if not item.orientation_allowed:
            # Verify item is placed in its natural orientation
            natural_orientation = (item.width_cm, item.depth_cm, item.height_cm)
            actual_orientation = (
                position.endCoordinates.width - position.startCoordinates.width,
                position.endCoordinates.depth - position.startCoordinates.depth,
                position.endCoordinates.height - position.startCoordinates.height
            )
            
            if natural_orientation != actual_orientation:
                errors.append("Item must be placed in natural orientation")
        
        return len(errors) == 0, errors

# Convenience functions
def calculate_container_volume(container: ContainerCreate) -> float:
    """Convenience function to calculate container volume."""
    return PlacementUtils.calculate_container_volume(container)

def find_optimal_placement_spot(
    item: ItemCreate,
    container: ContainerCreate,
    existing_placements: List[Tuple[str, Coordinates, Coordinates]],
    is_high_priority: bool = False
) -> Optional[Tuple[Coordinates, Coordinates, Tuple[float, float, float]]]:
    """Convenience function to find optimal placement spot."""
    return PlacementUtils.find_optimal_placement_spot(
        item, container, existing_placements, is_high_priority
    )

def validate_placement_constraints(
    item: ItemCreate,
    container: Container,
    position: Position
) -> Tuple[bool, List[str]]:
    """Convenience function to validate placement constraints."""
    return PlacementUtils.validate_placement_constraints(item, container, position)
