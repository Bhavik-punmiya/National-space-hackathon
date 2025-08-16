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
    """Item model matching the CSV format expected by the frontend."""
    id: str
    name: str
    category: str  # Item category (e.g., Medical, Food, Equipment)
    subcategory: str  # Item subcategory (e.g., Antibiotic_Supply, Food_Packet)
    containerId: str
    quantity: int = 1  # Default value, not in original model
    mass_kg: float
    expirationDate: Optional[str] = None  # Changed to string to handle "N/A" values
    width_cm: float
    depth_cm: float
    height_cm: float
    priority: int
    usageLimit: Optional[str] = None  # Changed to string to handle "N/A" values
    usageCount: int = 0
    preferredZone: Optional[str] = None
    position_start_width: float
    position_start_depth: float
    position_start_height: float
    position_end_width: float
    position_end_depth: float
    position_end_height: float

class PlacementFrontendResponse(BaseModel):
    """Response model for frontend that matches the CSV format."""
    containers: List[ContainerFrontendResponse]
    items: List[ItemFrontendResponse]