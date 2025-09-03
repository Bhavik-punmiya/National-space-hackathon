# /app/models_api.py
"""
Enhanced API Models for Advanced Stowage Management System
=========================================================

This module contains updated Pydantic models that support:
- User authentication and role management
- Item reservation/booking system  
- Enhanced item and container properties
- Advanced logging and analytics
- Temperature requirements and hazardous material classification
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum

# --- Enhanced Enums for API ---

class TemperatureRequirement(str, Enum):
    COLD = "COLD"
    AMBIENT = "AMBIENT"
    WARM = "WARM"
    N_A = "N/A"

class ItemStatus(str, Enum):
    ACTIVE = "ACTIVE"
    IN_USE = "IN_USE"
    PLANNED = "PLANNED"
    SCHEDULED = "SCHEDULED"
    WASTE_EXPIRED = "WASTE_EXPIRED"
    WASTE_DEPLETED = "WASTE_DEPLETED"
    WASTE = "WASTE"
    DISPOSED = "DISPOSED"
    LOST = "LOST"
    BROKEN = "BROKEN"

class HazardousClass(str, Enum):
    NONE = "NONE"
    FLAMMABLE = "FLAMMABLE"
    CORROSIVE = "CORROSIVE"
    BIOHAZARD = "BIOHAZARD"
    TOXIC = "TOXIC"
    RADIOACTIVE = "RADIOACTIVE"
    PRESSURIZED = "PRESSURIZED"

class ContainerType(str, Enum):
    CTB = "CTB"
    LOCKER = "LOCKER"
    RACK_BAY = "RACK_BAY"
    FREE_VOLUME = "FREE_VOLUME"
    VEHICLE = "VEHICLE"
    TRASH_BAG = "TRASH_BAG"
    DRAWER = "DRAWER"
    CABINET = "CABINET"

class UserRole(str, Enum):
    ASTRONAUT = "ASTRONAUT"
    OFFICER = "OFFICER"
    ADMIN = "ADMIN"
    GUEST = "GUEST"

class ReservationStatus(str, Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"

# --- Coordinate and Position Models ---

class Coordinates(BaseModel):
    width: float = Field(..., ge=0)
    depth: float = Field(..., ge=0)
    height: float = Field(..., ge=0)

class Position(BaseModel):
    startCoordinates: Coordinates
    endCoordinates: Coordinates

# --- Placement Models ---

class PlacementRequest(BaseModel):
    """Request model for placement operations."""
    items: List['ItemCreate']
    containers: List['ContainerCreate']

class PlacementResponseItem(BaseModel):
    """Response model for a single item placement."""
    item_id: str
    container_id: str
    position: Position

class RearrangementStep(BaseModel):
    """Model for rearrangement operations."""
    item_id: str
    from_container_id: str
    to_container_id: str
    from_position: Position
    to_position: Position
    reason: Optional[str] = None

class PlacementResponse(BaseModel):
    """Response model for placement operations."""
    success: bool
    placements: List[PlacementResponseItem] = []
    rearrangements: List[RearrangementStep] = []
    error: Optional[str] = None

# --- Retrieval and Search Models ---

class RetrievalStep(BaseModel):
    """Model for retrieval operations."""
    step: int
    action: str  # "remove", "setAside", "retrieve", "placeBack"
    item_id: str
    itemName: str

class RetrieveRequest(BaseModel):
    """Request model for item retrieval."""
    item_id: str
    user_id: str
    timestamp: Optional[datetime] = None

class PlaceUpdateRequest(BaseModel):
    """Request model for updating item placement."""
    item_id: str
    user_id: str
    container_id: str
    position: Position
    timestamp: Optional[datetime] = None

class SuccessResponse(BaseModel):
    """Generic success/error response model."""
    success: bool
    error: Optional[str] = None
    message: Optional[str] = None

# --- User Models ---

class UserBase(BaseModel):
    user_id: str
    username: str
    role: UserRole = UserRole.ASTRONAUT
    full_name: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True

class UserCreate(BaseModel):
    user_id: str
    username: str
    password: str  # Plain password for creation (will be hashed)
    role: UserRole = UserRole.ASTRONAUT
    full_name: Optional[str] = None
    email: Optional[str] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    user: Optional[UserResponse] = None
    token: Optional[str] = None  # JWT token or session ID
    message: Optional[str] = None

# --- Enhanced Item Models ---

class ItemBase(BaseModel):
    item_id: str
    name: str
    category: str
    subcategory: str
    width_cm: float = Field(..., gt=0)
    depth_cm: float = Field(..., gt=0)
    height_cm: float = Field(..., gt=0)
    mass_kg: float = Field(..., gt=0)
    priority: int = Field(50, ge=0, le=100)
    expiry_date: Optional[str] = None
    preferred_zone: Optional[str] = None
    
    # Enhanced fields
    temp_requirement: TemperatureRequirement = TemperatureRequirement.AMBIENT
    lot_number: Optional[str] = None
    orientation_allowed: bool = True
    hazardous_class: HazardousClass = HazardousClass.NONE
    tags_id: Optional[List[str]] = None  # Array of identifiers (barcode, RFID, QR)
    maximum_uses: Optional[int] = None
    usage_frequency: Optional[float] = None  # Average uses per day

class ItemCreate(ItemBase):
    current_uses: int = 0
    usage_remaining: Optional[int] = None

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    priority: Optional[int] = Field(None, ge=0, le=100)
    expiry_date: Optional[str] = None
    preferred_zone: Optional[str] = None
    temp_requirement: Optional[TemperatureRequirement] = None
    lot_number: Optional[str] = None
    orientation_allowed: Optional[bool] = None
    hazardous_class: Optional[HazardousClass] = None
    tags_id: Optional[List[str]] = None
    maximum_uses: Optional[int] = None
    usage_frequency: Optional[float] = None
    status: Optional[ItemStatus] = None

class ItemResponse(ItemBase):
    status: ItemStatus
    current_uses: int = 0
    usage_remaining: Optional[int] = None
    current_location: Optional[str] = None
    
    # Related data
    reservations: Optional[List['ReservationSummary']] = None
    
    class Config:
        from_attributes = True

# --- Enhanced Container Models ---

class ContainerBase(BaseModel):
    container_id: str
    name: str
    type: ContainerType
    zone: str
    module_id: str
    width_cm: float = Field(..., gt=0)
    depth_cm: float = Field(..., gt=0)
    height_cm: float = Field(..., gt=0)
    
    # Enhanced fields
    open_face: Optional[str] = None  # +X, +Y, +Z, -X, -Y, -Z
    max_mass: Optional[float] = None
    access_index: int = Field(50, ge=0, le=100)
    parent_container_id: Optional[str] = None
    description: Optional[str] = None

class ContainerCreate(ContainerBase):
    is_active: bool = True

class ContainerUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[ContainerType] = None
    zone: Optional[str] = None
    open_face: Optional[str] = None
    max_mass: Optional[float] = None
    access_index: Optional[int] = Field(None, ge=0, le=100)
    parent_container_id: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class ContainerResponse(ContainerBase):
    current_mass: float = 0.0
    is_active: bool = True
    created_at: datetime
    last_accessed: Optional[datetime] = None
    
    # Related data
    child_containers: Optional[List['ContainerSummary']] = None
    contained_items_count: Optional[int] = None
    
    class Config:
        from_attributes = True

class ContainerSummary(BaseModel):
    """Lightweight container info for nested relationships"""
    container_id: str
    name: str
    type: ContainerType
    zone: str

# --- Item Reservation Models ---

class ReservationBase(BaseModel):
    item_id: str
    user_id: str
    purpose: str
    start_time: datetime
    end_time: datetime
    priority: int = Field(50, ge=0, le=100)
    notes: Optional[str] = None

    @validator('end_time')
    def end_after_start(cls, v, values):
        if 'start_time' in values and v <= values['start_time']:
            raise ValueError('end_time must be after start_time')
        return v

class ReservationCreate(ReservationBase):
    is_recurring: bool = False

class ReservationUpdate(BaseModel):
    purpose: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    priority: Optional[int] = Field(None, ge=0, le=100)
    notes: Optional[str] = None
    status: Optional[ReservationStatus] = None

class ReservationResponse(ReservationBase):
    reservation_id: str
    status: ReservationStatus
    duration_hours: float
    is_recurring: bool
    created_at: datetime
    updated_at: datetime
    approved_by: Optional[str] = None
    conflict_resolution: Optional[str] = None
    
    # Related data
    item_name: Optional[str] = None
    user_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class ReservationSummary(BaseModel):
    """Lightweight reservation info for item relationships"""
    reservation_id: str
    user_id: str
    purpose: str
    start_time: datetime
    end_time: datetime
    status: ReservationStatus

class ConflictCheckRequest(BaseModel):
    item_id: str
    start_time: datetime
    end_time: datetime
    exclude_reservation_id: Optional[str] = None

class ConflictCheckResponse(BaseModel):
    has_conflict: bool
    conflicting_reservations: List[ReservationSummary] = []

# --- Enhanced Logging Models ---

class LogDetail(BaseModel):
    # Existing fields
    fromContainer: Optional[str] = None
    toContainer: Optional[str] = None
    position: Optional[Position] = None
    fromPosition: Optional[Position] = None
    toPosition: Optional[Position] = None
    reason: Optional[str] = None
    remainingUses: Optional[int] = None
    fileType: Optional[str] = None
    count: Optional[int] = None
    errors: Optional[int] = None
    undockingContainerId: Optional[str] = None
    
    # Enhanced fields
    session_id: Optional[str] = None
    execution_duration_ms: Optional[int] = None
    before_state: Optional[Dict[str, Any]] = None
    after_state: Optional[Dict[str, Any]] = None
    location: Optional[str] = None
    client_info: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None

class LogResponseItem(BaseModel):
    log_id: str
    timestamp: datetime
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    action_type: str
    action_category: Optional[str] = None
    item_id: Optional[str] = None
    container_id: Optional[str] = None
    reservation_id: Optional[str] = None
    success: bool = True
    error_message: Optional[str] = None
    location: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    
    # Related data
    user_name: Optional[str] = None
    item_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class LogsResponse(BaseModel):
    """Response model for logs retrieval."""
    logs: List[LogResponseItem] = []

class ActivitySummary(BaseModel):
    """Summary of user activity for dashboards"""
    user_id: str
    user_name: str
    total_actions: int
    last_activity: datetime
    most_used_items: List[str]
    favorite_zones: List[str]

# --- Enhanced Search and Analytics Models ---

class ItemUsageStats(BaseModel):
    item_id: str
    name: str
    category: str
    total_uses: int
    last_used: Optional[datetime] = None
    usage_frequency: Optional[float] = None
    predicted_depletion: Optional[datetime] = None

class ContainerUtilization(BaseModel):
    container_id: str
    name: str
    zone: str
    current_mass: float
    max_mass: Optional[float] = None
    utilization_percentage: Optional[float] = None
    item_count: int
    last_accessed: Optional[datetime] = None

class ZoneAnalytics(BaseModel):
    zone: str
    total_containers: int
    total_items: int
    most_accessed_container: Optional[str] = None
    average_access_index: float
    temperature_requirements: Dict[str, int]  # Count by temp requirement

class DashboardData(BaseModel):
    total_items: int
    total_containers: int
    total_users: int
    active_reservations: int
    items_by_status: Dict[str, int]
    top_used_items: List[ItemUsageStats]
    container_utilization: List[ContainerUtilization]
    zone_analytics: List[ZoneAnalytics]
    recent_activity: List[LogResponseItem]

# --- Enhanced Search Models ---

class SearchFilters(BaseModel):
    category: Optional[str] = None
    subcategory: Optional[str] = None
    status: Optional[ItemStatus] = None
    zone: Optional[str] = None
    temp_requirement: Optional[TemperatureRequirement] = None
    hazardous_class: Optional[HazardousClass] = None
    min_priority: Optional[int] = None
    max_priority: Optional[int] = None
    user_id: Optional[str] = None  # For user-specific searches
    expiring_within_days: Optional[int] = None

class SearchRequest(BaseModel):
    query: Optional[str] = None  # Free text search
    filters: Optional[SearchFilters] = None
    limit: int = Field(50, ge=1, le=1000)
    offset: int = Field(0, ge=0)
    sort_by: str = "name"  # name, priority, last_used, expiry_date
    sort_order: str = Field("asc", pattern="^(asc|desc)$")

class SearchResponseItem(BaseModel):
    item_id: str
    name: str
    category: str
    subcategory: str
    status: ItemStatus
    container_id: Optional[str] = None
    zone: Optional[str] = None
    position: Optional[Position] = None
    priority: int
    temp_requirement: TemperatureRequirement
    hazardous_class: HazardousClass
    current_uses: int
    maximum_uses: Optional[int] = None
    expiry_date: Optional[str] = None
    last_used: Optional[datetime] = None

class SearchResponse(BaseModel):
    success: bool
    total_count: int
    items: List[SearchResponseItem]
    filters_applied: Optional[SearchFilters] = None
    found: Optional[bool] = None
    item: Optional[SearchResponseItem] = None
    retrievalSteps: Optional[List[RetrievalStep]] = None

class ItemSearchResponse(BaseModel):
    """Response model for item search with retrieval steps."""
    success: bool
    found: bool
    item: Optional[SearchResponseItem] = None
    retrievalSteps: List[RetrievalStep] = []
    error: Optional[str] = None
    
# --- Waste Management Models ---

class WasteItemResponse(BaseModel):
    """Response model for waste item information."""
    item_id: str
    name: str
    category: str
    subcategory: str
    container_id: str
    position: Position
    reason: str  # "expired", "depleted", "broken", etc.
    expiry_date: Optional[str] = None
    current_uses: int
    maximum_uses: Optional[int] = None

class WasteIdentifyResponse(BaseModel):
    """Response model for waste identification."""
    success: bool
    wasteItems: List[WasteItemResponse] = []
    error: Optional[str] = None

class WasteReturnPlanRequest(BaseModel):
    """Request model for waste return planning."""
    waste_item_ids: List[str]
    undocking_container_id: str
    user_id: str
    undocking_date: datetime
    maxWeight: float
    maxVolume: Optional[float] = None  # New volume limit field

class WasteReturnPlanResponse(BaseModel):
    """Response model for waste return planning."""
    success: bool
    returnPlan: List['WasteReturnPlanStep'] = []
    retrievalSteps: List[RetrievalStep] = []
    returnManifest: Optional['WasteReturnManifest'] = None
    error: Optional[str] = None

class WasteCompleteUndockingRequest(BaseModel):
    """Request model for completing waste undocking."""
    undocking_container_id: str
    user_id: str
    timestamp: Optional[datetime] = None

class WasteReturnPlanStep(BaseModel):
    """Model for waste return plan steps."""
    step: int
    item_id: str
    itemName: str
    fromContainer: str
    toContainer: str

class WasteReturnManifestItem(BaseModel):
    """Model for waste return manifest item."""
    item_id: str
    name: str
    category: str
    subcategory: str
    reason: str
    mass_kg: float
    volume_cm3: float

class WasteReturnManifest(BaseModel):
    """Model for waste return manifest."""
    undocking_container_id: str
    undocking_date: datetime
    return_items: List['WasteReturnManifestItem']
    total_volume: float
    total_weight: float

class WasteCompleteUndockingResponse(BaseModel):
    """Response model for waste undocking completion."""
    success: bool
    items_removed: int
    error: Optional[str] = None

# --- Simulation Models ---

class SimulationRequest(BaseModel):
    """Request model for time simulation."""
    num_of_days: Optional[int] = None
    to_timestamp: Optional[datetime] = None
    items_to_be_used_per_day: List['SimulationItemUsageRequest'] = []
    user_id: str

class SimulationItemUsageRequest(BaseModel):
    """Model for simulation item usage request."""
    item_id: Optional[str] = None
    name: Optional[str] = None

# --- Import/Export Models ---

class ImportErrorDetail(BaseModel):
    """Model for import error details."""
    row: Optional[int] = None
    message: str

class ImportResponse(BaseModel):
    """Response model for import operations."""
    success: bool
    items_imported: Optional[int] = None
    containers_imported: Optional[int] = None
    errors: List[ImportErrorDetail] = []

class SimulationChanges(BaseModel):
    """Model for simulation changes."""
    items_used: List['SimulationItemUsedChange'] = []
    items_expired: List['SimulationItemChange'] = []
    items_depleted_today: List['SimulationItemChange'] = []
    new_date: datetime

class SimulationResponse(BaseModel):
    """Response model for time simulation."""
    success: bool
    new_date: datetime
    changes: SimulationChanges
    error: Optional[str] = None

class SimulationItemChange(BaseModel):
    """Model for simulation item changes."""
    item_id: str
    name: str
    timestamp: datetime

class SimulationItemUsedChange(BaseModel):
    """Model for simulation item usage changes."""
    item_id: str
    name: str
    remaining_uses: int
    timestamp: datetime

# --- Batch Operations ---

class BatchItemUpdate(BaseModel):
    item_ids: List[str]
    updates: ItemUpdate

class BatchResponse(BaseModel):
    success: bool
    updated_count: int
    failed_items: List[str] = []
    errors: List[str] = []

# Update forward references
ReservationSummary.model_rebuild()
ContainerSummary.model_rebuild()
ItemResponse.model_rebuild()
ContainerResponse.model_rebuild()
PlacementRequest.model_rebuild()
WasteReturnPlanResponse.model_rebuild()
