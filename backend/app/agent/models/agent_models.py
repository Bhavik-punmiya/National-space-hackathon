from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class AgentQueryType(str, Enum):
    """Types of queries the agent can handle"""
    COUNT_ITEMS = "count_items"
    COUNT_CONTAINERS = "count_containers"
    COUNT_ZONES = "count_zones"
    COUNT_MODULES = "count_modules"
    EXPIRED_ITEMS = "expired_items"
    NEAR_EXPIRY_ITEMS = "near_expiry_items"
    TOP_USED_ITEMS = "top_used_items"
    ITEM_DETAILS = "item_details"
    CONTAINER_INVENTORY = "container_inventory"
    ZONE_LOCATION = "zone_location"
    ITEM_LOCATION = "item_location"
    CONTAINER_LOCATION = "container_location"
    CODE_MEANING = "code_meaning"
    USAGE_TRACKING = "usage_tracking"

class AgentQueryRequest(BaseModel):
    """Request model for agent queries"""
    query: str = Field(..., description="Natural language query from user")
    query_type: Optional[AgentQueryType] = Field(None, description="Specific query type if known")
    context: Optional[List[Dict[str, Any]]] = Field(default=[], description="Previous conversation context")
    user_id: Optional[str] = Field(None, description="User ID for tracking")
    session_id: Optional[str] = Field(None, description="Session ID for context management")

class CountResponse(BaseModel):
    """Response for count queries"""
    count: int
    entity_type: str  # "items", "containers", "zones", "modules"
    filter_criteria: Optional[Dict[str, Any]] = None
    message: str

class ItemInfo(BaseModel):
    """Basic item information"""
    item_id: str
    name: str
    category: str
    subcategory: str
    expiry_date: Optional[str]
    usage_limit: Optional[str]
    current_uses: int
    status: str
    container_id: Optional[str]
    zone: Optional[str]

class ContainerInfo(BaseModel):
    """Basic container information"""
    container_id: str
    module_id: str
    zone: str
    item_count: int
    dimensions: Dict[str, float]  # width_cm, depth_cm, height_cm

class ZoneInfo(BaseModel):
    """Basic zone information"""
    zone_name: str
    module_id: str
    container_count: int
    item_count: int

class ExpiredItemsResponse(BaseModel):
    """Response for expired items query"""
    count: int
    items: List[ItemInfo]
    message: str

class NearExpiryItemsResponse(BaseModel):
    """Response for near expiry items query"""
    count: int
    items: List[ItemInfo]
    days_threshold: int
    message: str

class TopUsedItemsResponse(BaseModel):
    """Response for top used items query"""
    items: List[ItemInfo]
    limit: int
    message: str

class ItemDetailsResponse(BaseModel):
    """Response for item details query"""
    item: ItemInfo
    container: Optional[ContainerInfo]
    position: Optional[Dict[str, Any]]
    message: str

class ContainerInventoryResponse(BaseModel):
    """Response for container inventory query"""
    container: ContainerInfo
    items: List[ItemInfo]
    message: str

class LocationResponse(BaseModel):
    """Response for location queries"""
    entity_id: str
    entity_type: str  # "item", "container", "zone"
    location: Dict[str, Any]
    message: str

class CodeMeaningResponse(BaseModel):
    """Response for code meaning queries"""
    code: str
    meaning: str
    description: str
    examples: List[str]

class UsageTrackingResponse(BaseModel):
    """Response for usage tracking queries"""
    user_id: Optional[str]
    item_id: Optional[str]
    logs: List[Dict[str, Any]]
    total_usage: int
    message: str

class AgentQueryResponse(BaseModel):
    """Main response model for agent queries"""
    success: bool
    query_type: AgentQueryType
    response_data: Dict[str, Any]
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    context_updated: bool = False

class ConversationContext(BaseModel):
    """Model for maintaining conversation context"""
    session_id: str
    user_id: Optional[str]
    messages: List[Dict[str, Any]] = Field(default_factory=list)
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    max_context_length: int = 20

class VoiceQueryRequest(BaseModel):
    """Request model for voice queries"""
    audio_data: str  # Base64 encoded audio
    session_id: Optional[str] = None
    user_id: Optional[str] = None

class VoiceQueryResponse(BaseModel):
    """Response model for voice queries"""
    success: bool
    transcribed_text: str
    query_response: AgentQueryResponse
    audio_response: Optional[str] = None  # Base64 encoded audio response
    message: str
