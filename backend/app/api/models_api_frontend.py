from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class ContainerFrontendResponse(BaseModel):
    """Container model matching the CSV format expected by the frontend."""
    id: str
    name: str  # Using container_id as name since original model doesn't have a name field
    type: str = "Supply Container"  # Default value, adjust as needed
    zoneId: str
    module_id: str  # Added module_id field
    capacity: int = 0  # Default value, not in original model
    width_cm: float
    depth_cm: float
    height_cm: float
    maxWeight: float = 0.0  # Default value, not in original model
    currentWeight: float = 0.0  # Default value, not in original model
    start_width: Optional[float] = None
    start_depth: Optional[float] = None
    start_height: Optional[float] = None
    end_width: Optional[float] = None
    end_depth: Optional[float] = None
    end_height: Optional[float] = None

class ItemFrontendResponse(BaseModel):
    """Item model matching what the frontend expects."""
    id: str
    name: str
    category: str
    subcategory: str
    containerId: str
    mass_kg: float
    width_cm: float
    depth_cm: float
    height_cm: float
    priority: int
    expiry_date: Optional[str] = None
    preferred_zone: Optional[str] = None
    temp_requirement: Optional[str] = None
    hazardous_class: Optional[str] = None
    maximum_uses: Optional[int] = None
    current_uses: Optional[int] = None
    usage_frequency: Optional[float] = None
    lot_number: Optional[str] = None
    orientation_allowed: Optional[bool] = None
    tags_id: Optional[List[str]] = None
    x: Optional[float] = None
    y: Optional[float] = None
    z: Optional[float] = None

class PlacementFrontendResponse(BaseModel):
    """Response model for frontend that matches the CSV format."""
    containers: List[ContainerFrontendResponse]
    items: List[ItemFrontendResponse]