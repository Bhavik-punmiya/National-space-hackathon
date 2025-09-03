# /app/models_api_tables.py

from pydantic import BaseModel, Field
from typing import List, Optional, Any
from datetime import datetime
import enum

# Import necessary enums from models_db
# Adjust path if needed
from app.models_db import ItemStatus

# --- Base Models for Pagination/Filtering ---

class PaginationParams(BaseModel):
    page: int = Field(1, ge=1, description="Page number (1-indexed)")
    size: int = Field(10, ge=1, le=100, description="Number of items per page (1-100)")

class BaseFilterParams(BaseModel):
    search: Optional[str] = Field(None, description="Search term for relevant fields")

# --- Container Models ---

class ContainerApiSchema(BaseModel):
    id: str = Field(..., alias="container_id", description="Unique identifier of the container")
    zone_id: str = Field(..., alias="zone", description="Storage zone identifier")
    module_id: str = Field(..., description="Module identifier (e.g., M1, M2, M3)")
    width_cm: float = Field(..., description="Width in centimeters")
    depth_cm: float = Field(..., description="Depth in centimeters")
    height_cm: float = Field(..., description="Height in centimeters")
    item_count: int = Field(..., description="Total number of items currently in the container")
    expired_item_count: int = Field(..., description="Number of expired items currently in the container")
    name: Optional[str] = Field(None, description="Container name")
    type: Optional[str] = Field(None, description="Container type")
    open_face: Optional[str] = Field(None, description="Access orientation")
    max_mass: Optional[float] = Field(None, description="Maximum weight capacity")
    current_mass: Optional[float] = Field(None, description="Current total mass")
    access_index: Optional[int] = Field(None, description="Access difficulty (0-100)")
    is_active: Optional[bool] = Field(None, description="Container operational status")
    description: Optional[str] = Field(None, description="Additional notes")

    class Config:
        from_attributes = True # For Pydantic V2+
        validate_by_name = True # Allow using 'container_id' and 'zone' during creation

class PaginatedContainerResponse(BaseModel):
    total: int = Field(..., description="Total number of containers matching the criteria")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Number of items per page")
    items: List[ContainerApiSchema] = Field(..., description="List of containers for the current page")

# --- Item Models ---

class ItemFilterParams(BaseFilterParams):
    status: Optional[ItemStatus] = Field(None, description="Filter by item status")
    preferred_zone: Optional[str] = Field(None, description="Filter by preferred storage zone")
    category: Optional[str] = Field(None, description="Filter by item category")
    subcategory: Optional[str] = Field(None, description="Filter by item subcategory")
    # Add other specific filters if needed

class ItemApiSchema(BaseModel):
    id: str = Field(..., alias="item_id", description="Unique identifier of the item")
    name: str
    category: str = Field(..., description="Item category (e.g., Medical, Food, Equipment)")
    subcategory: str = Field(..., description="Item subcategory (e.g., Antibiotic_Supply, Food_Packet)")
    container_id: Optional[str] = Field(None, description="ID of the container holding the item, if placed")
    quantity: int = Field(1, description="Quantity of this specific item (always 1 based on model)")
    mass_kg: float = Field(..., description="Mass in kilograms")
    expiry_date: Optional[str] = Field(None, description="Expiration date as string (e.g., '2026-06-12' or 'N/A')")
    width_cm: float = Field(..., description="Width in centimeters")
    depth_cm: float = Field(..., description="Depth in centimeters")
    height_cm: float = Field(..., description="Height in centimeters")
    priority: int
    usage_limit: Optional[str] = Field(None, description="Usage limit as string (e.g., '314' or 'N/A')")
    current_uses: int = Field(0, description="Current usage count")
    preferred_zone: Optional[str] = None
    current_zone: Optional[str] = Field(None, description="Current zone where the item is located, if placed")
    status: ItemStatus
    expired: bool = Field(..., description="True if status is WASTE_EXPIRED")
    depleted: bool = Field(..., description="True if status is WASTE_DEPLETED")
    temp_requirement: Optional[str] = Field(None, description="Temperature requirement (COLD, AMBIENT, WARM, N/A)")
    hazardous_class: Optional[str] = Field(None, description="Hazardous classification (NONE, FLAMMABLE, CORROSIVE, etc.)")

    class Config:
        from_attributes = True
        validate_by_name = True # Allow using 'item_id' and 'expiry_date'

class PaginatedItemResponse(BaseModel):
    total: int = Field(..., description="Total number of items matching the criteria")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Number of items per page")
    items: List[ItemApiSchema] = Field(..., description="List of items for the current page")