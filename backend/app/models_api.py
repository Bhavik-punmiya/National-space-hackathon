# /app/models_api.py
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
import iso8601 # Use a robust parser

# --- Coordinate and Position Models ---

class Coordinates(BaseModel):
    width: float = Field(..., ge=0)
    depth: float = Field(..., ge=0)
    height: float = Field(..., ge=0)

class Position(BaseModel):
    startCoordinates: Coordinates
    endCoordinates: Coordinates

# --- Item Models ---

class ItemBase(BaseModel):
    item_id: str
    name: str
    category: str
    subcategory: str
    width_cm: float = Field(..., gt=0)
    depth_cm: float = Field(..., gt=0)
    height_cm: float = Field(..., gt=0)
    mass_kg: float = Field(..., gt=0)
    priority: int = Field(..., ge=0, le=100)
    expiry_date: Optional[str] = None # Accept string format (e.g., "2026-06-12" or "N/A")
    usage_limit: Optional[str] = None # Accept string format (e.g., "314" or "N/A")
    preferred_zone: Optional[str] = None

class ItemCreate(ItemBase):
    pass # Inherits all fields

class ItemResponse(ItemBase):
    status: str # Use the string representation of the enum

    class Config:
        from_attributes = True # To allow creating from ORM objects

# --- Container Models ---

class ContainerBase(BaseModel):
    zone: str
    module_id: str
    container_id: str
    width_cm: float = Field(..., gt=0)
    depth_cm: float = Field(..., gt=0)
    height_cm: float = Field(..., gt=0)

class ContainerCreate(ContainerBase):
    pass

class ContainerResponse(ContainerBase):
    id: Optional[int] # Maybe not needed for API response?

    class Config:
        from_attributes = True

# --- Placement Models ---

class PlacementResponseItem(BaseModel):
    item_id: str
    container_id: str
    position: Position

class RearrangementStep(BaseModel):
    step: int
    action: str # "move", "remove", "place"
    item_id: str
    fromContainer: Optional[str] = None # Null if placing a new item initially in rearrangement
    fromPosition: Optional[Position] = None
    toContainer: str
    toPosition: Position

class PlacementRequest(BaseModel):
    items: List[ItemCreate]
    containers: List[ContainerCreate] # API expects full container details

class PlacementResponse(BaseModel):
    success: bool
    error: Optional[str] = None # Add error field for better reporting
    placements: List[PlacementResponseItem] # Use PlacementResponseItem here
    rearrangements: List[RearrangementStep]
    details: Optional[Dict] = None # Keep details for validation errors

# --- Search/Retrieval Models ---

class RetrievalStep(BaseModel):
    step: int
    action: str # "remove", "setAside", "retrieve", "placeBack"
    item_id: str
    itemName: str

class SearchResponseItem(BaseModel):
    item_id: str
    name: str
    container_id: str
    zone: str
    position: Position

class SearchResponse(BaseModel):
    success: bool
    found: bool
    item: Optional[SearchResponseItem] = None
    retrievalSteps: List[RetrievalStep] = []

class RetrieveRequest(BaseModel):
    item_id: str
    userId: Optional[str] = None
    timestamp: Optional[datetime] = None # Accept ISO string, convert to datetime

    @validator('timestamp', pre=True, always=True)
    def parse_timestamp(cls, value):
        if value is None:
            return datetime.utcnow() # Default to now if not provided
        if isinstance(value, datetime):
            return value
        try:
            return iso8601.parse_date(value)
        except iso8601.ParseError as e:
             raise ValueError(f"Invalid ISO 8601 timestamp format: {value}. Error: {e}")
        except Exception as e:
             raise ValueError(f"Error parsing timestamp '{value}': {e}")


class PlaceUpdateRequest(BaseModel):
    item_id: str
    userId: Optional[str] = None
    timestamp: Optional[datetime] = None # Accept ISO string, convert to datetime
    container_id: str
    position: Position

    @validator('timestamp', pre=True, always=True)
    def parse_timestamp(cls, value):
        if value is None:
            return datetime.utcnow() # Default to now if not provided
        if isinstance(value, datetime):
            return value
        try:
            return iso8601.parse_date(value)
        except iso8601.ParseError as e:
             raise ValueError(f"Invalid ISO 8601 timestamp format: {value}. Error: {e}")
        except Exception as e:
             raise ValueError(f"Error parsing timestamp '{value}': {e}")


class SuccessResponse(BaseModel):
    success: bool

# --- Waste Models ---

class WasteItemResponse(BaseModel):
    item_id: str
    name: str
    reason: str # "Expired", "Out of Uses"
    container_id: str
    position: Position

class WasteIdentifyResponse(BaseModel):
    success: bool
    wasteItems: List[WasteItemResponse]

class WasteReturnPlanRequest(BaseModel):
    undockingContainerId: str
    undockingDate: datetime # Expect ISO format
    maxWeight: float = Field(..., gt=0)

    @validator('undockingDate', pre=True, always=True)
    def parse_undocking_date(cls, value):
        if isinstance(value, datetime):
            return value
        try:
            return iso8601.parse_date(value)
        except iso8601.ParseError as e:
             raise ValueError(f"Invalid ISO 8601 date format: {value}. Error: {e}")
        except Exception as e:
             raise ValueError(f"Error parsing date '{value}': {e}")


class WasteReturnPlanStep(BaseModel):
    step: int
    item_id: str
    itemName: str
    fromContainer: str
    toContainer: str # Should always be the undockingContainerId

class WasteReturnManifestItem(BaseModel):
    item_id: str
    name: str
    reason: str

class WasteReturnManifest(BaseModel):
    undockingContainerId: str
    undockingDate: datetime # Return as datetime object
    returnItems: List[WasteReturnManifestItem]
    totalVolume: float
    totalWeight: float

class WasteReturnPlanResponse(BaseModel):
    success: bool
    returnPlan: List[WasteReturnPlanStep]
    retrievalSteps: List[RetrievalStep] # Steps to get the waste items out
    returnManifest: WasteReturnManifest

class WasteCompleteUndockingRequest(BaseModel):
    undockingContainerId: str
    timestamp: Optional[datetime] = None # Expect ISO format

    @validator('timestamp', pre=True, always=True)
    def parse_timestamp(cls, value):
        if value is None:
            return datetime.utcnow() # Default to now
        if isinstance(value, datetime):
            return value
        try:
            return iso8601.parse_date(value)
        except iso8601.ParseError as e:
             raise ValueError(f"Invalid ISO 8601 timestamp format: {value}. Error: {e}")
        except Exception as e:
             raise ValueError(f"Error parsing timestamp '{value}': {e}")

class WasteCompleteUndockingResponse(BaseModel):
    success: bool
    itemsRemoved: int

# --- Simulation Models ---

class SimulationItemUsage(BaseModel):
    item_id: Optional[str] = None
    name: Optional[str] = None

    @validator('name')
    def check_id_or_name(cls, name, values):
        if not values.get('item_id') and not name:
            raise ValueError('Either item_id or name must be provided for itemsToBeUsedPerDay')
        return name

class SimulationRequest(BaseModel):
    numOfDays: Optional[int] = Field(None, ge=1)
    toTimestamp: Optional[datetime] = None  # Expect ISO format
    itemsToBeUsedPerDay: List[SimulationItemUsage] = []

    @validator('toTimestamp', pre=True, always=True)
    def parse_to_timestamp(cls, value):
        if value is None:
            return None
        if isinstance(value, datetime):
            return value
        try:
            return iso8601.parse_date(value)
        except iso8601.ParseError as e:
            raise ValueError(f"Invalid ISO 8601 timestamp format: {value}. Error: {e}")
        except Exception as e:
            raise ValueError(f"Error parsing timestamp '{value}': {e}")

    @validator('toTimestamp')
    def check_days_or_timestamp(cls, toTimestamp, values):
        if not values.get('numOfDays') and not toTimestamp:
            raise ValueError('Either numOfDays or toTimestamp must be provided')
        if values.get('numOfDays') and toTimestamp:
            raise ValueError('Provide either numOfDays or toTimestamp, not both')
        return toTimestamp

    @validator('itemsToBeUsedPerDay', each_item=True)
    def validate_items_to_be_used(cls, item):
        if not item.item_id and not item.name:
            raise ValueError('Each item in itemsToBeUsedPerDay must have either item_id or name')
        return item

class SimulationItemChange(BaseModel):
    item_id: str
    name: str
    timestamp: datetime  # Add timestamp for when the change occurred

class SimulationItemUsedChange(SimulationItemChange):
     remainingUses: Optional[int] # None if usage_limit was null

class SimulationChanges(BaseModel):
    itemsUsed: List[SimulationItemUsedChange]
    itemsExpired: List[SimulationItemChange]
    itemsDepletedToday: List[SimulationItemChange]

class SimulationResponse(BaseModel):
    success: bool
    newDate: datetime # Return current simulated date as datetime
    changes: SimulationChanges

# --- Import/Export Models ---

class ImportErrorDetail(BaseModel):
    row: Optional[int] = None # Row number in CSV (if applicable)
    message: str

class ImportResponse(BaseModel):
    success: bool
    itemsImported: Optional[int] = None # For items import
    containersImported: Optional[int] = None # For containers import
    errors: List[ImportErrorDetail]

# --- Logging Models ---

class LogDetail(BaseModel):
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
    # Add any other specific details needed per action type

class LogResponseItem(BaseModel):
    timestamp: datetime
    userId: Optional[str] = None
    actionType: str # Enum value as string
    item_id: Optional[str] = None # Changed from item_id_fk
    details: Optional[Dict[str, Any]] = None # Keep as dict for flexibility, validate on creation

    class Config:
        from_attributes = True
        # Handle potential JSON string in details_json
        # json_encoders = {
        #     dict: lambda v: json.dumps(v) if isinstance(v, dict) else v,
        # }

class LogsResponse(BaseModel):
    logs: List[LogResponseItem]