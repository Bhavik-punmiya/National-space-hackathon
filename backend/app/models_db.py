# /app/models_db.py



import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Enum as SQLAlchemyEnum,
    ForeignKey, Text, UniqueConstraint, Boolean, JSON
)
from sqlalchemy.orm import relationship

# Assumes you have a database.py file defining Base
# e.g., from .database import Base
# If not, you need to define Base here:
# from sqlalchemy.orm import declarative_base
# Base = declarative_base()
from .database import Base # Adjust this import if your Base is defined elsewhere

# --- Enums ---

class TemperatureRequirement(str, enum.Enum):
    """Temperature requirements for item storage."""
    COLD = "COLD"         # Requires refrigeration
    AMBIENT = "AMBIENT"   # Room temperature storage
    WARM = "WARM"         # Requires heated environment
    N_A = "N/A"           # No specific temperature requirement

class ItemStatus(str, enum.Enum):
    """Status of an inventory item."""
    ACTIVE = "ACTIVE"                   # Item is available in inventory
    IN_USE = "IN_USE"                   # Item is currently being used
    PLANNED = "PLANNED"                 # Item is planned for future use
    SCHEDULED = "SCHEDULED"             # Item is scheduled for specific activity
    WASTE_EXPIRED = "WASTE_EXPIRED"     # Item marked as waste due to expiry
    WASTE_DEPLETED = "WASTE_DEPLETED"   # Item marked as waste due to usage depletion
    WASTE = "WASTE"                     # General waste status
    DISPOSED = "DISPOSED"               # Item has been physically removed (undocked)
    LOST = "LOST"                       # Item location unknown
    BROKEN = "BROKEN"                   # Item is damaged/non-functional

class HazardousClass(str, enum.Enum):
    """Hazardous classification for items."""
    NONE = "NONE"                 # Non-hazardous
    FLAMMABLE = "FLAMMABLE"       # Fire hazard
    CORROSIVE = "CORROSIVE"       # Chemical corrosion risk
    BIOHAZARD = "BIOHAZARD"       # Biological contamination risk
    TOXIC = "TOXIC"               # Poisonous/toxic materials
    RADIOACTIVE = "RADIOACTIVE"   # Radiation hazard
    PRESSURIZED = "PRESSURIZED"   # High pressure contents

class ContainerType(str, enum.Enum):
    """Types of storage containers."""
    CTB = "CTB"                   # Cargo Transfer Bag
    LOCKER = "LOCKER"             # Standard locker
    RACK_BAY = "RACK_BAY"         # Rack bay storage
    FREE_VOLUME = "FREE_VOLUME"   # Open storage area
    VEHICLE = "VEHICLE"           # Vehicle storage
    TRASH_BAG = "TRASH_BAG"       # Waste container
    DRAWER = "DRAWER"             # Drawer storage
    CABINET = "CABINET"           # Cabinet storage

class UserRole(str, enum.Enum):
    """User roles in the system."""
    ASTRONAUT = "ASTRONAUT"       # Crew member
    OFFICER = "OFFICER"           # Mission control officer
    ADMIN = "ADMIN"               # System administrator
    GUEST = "GUEST"               # Read-only access

class LogActionType(str, enum.Enum):
    """Type of action recorded in the event log."""
    PLACEMENT = "placement"             # Initial placement of a new item
    REARRANGEMENT = "rearrangement"     # Moving an existing item within/between containers
    RETRIEVAL = "retrieval"             # Item removed for use (may decrement use count)
    RETRIEVED_BY = "retrieved_by"       # Item retrieved by specific user
    IN_USE = "in_use"                   # Item marked as in use
    UPDATE_LOCATION = "update_location" # User confirms item placed back after use/manual move
    DISPOSAL_PLAN = "disposal_plan"     # Item scheduled for disposal (e.g., added to undocking list)
    DISPOSAL_COMPLETE = "disposal_complete" # Item confirmed removed (e.g., after undocking)
    DEPLETED = "depleted"               # Item usage depleted
    EXPIRED = "expired"                 # Item expired
    BROKEN = "broken"                   # Item marked as broken
    SIMULATION_USE = "simulation_use"       # Use simulated (e.g., for planning)
    SIMULATION_EXPIRED = "simulation_expired" # Item marked expired by simulation/check
    SIMULATION_DEPLETED = "simulation_depleted"# Item marked depleted by simulation/check
    IMPORT = "import"                   # Bulk import of data (items, containers)
    EXPORT = "export"                   # Bulk export of data
    RESERVED = "reserved"               # Item reserved for future use
    RESERVATION_CANCELLED = "reservation_cancelled" # Reservation cancelled
    RESERVATION_COMPLETED = "reservation_completed" # Reservation fulfilled

# --- SQLAlchemy ORM Models ---
class User(Base):
    """Represents a system user (astronaut, officer, admin)."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True, nullable=False)  # User identifier
    username = Column(String, unique=True, index=True, nullable=False) # Login username
    password_hash = Column(String, nullable=False)                     # Hashed password
    role = Column(SQLAlchemyEnum(UserRole), default=UserRole.ASTRONAUT, nullable=False, index=True)
    full_name = Column(String, nullable=True)                          # Full display name
    email = Column(String, nullable=True)                              # Contact email
    last_login = Column(DateTime, nullable=True)                       # Last login timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)          # Account status

    # Relationships
    logs = relationship("Log", back_populates="user", cascade="all, delete-orphan")
    reservations = relationship("ItemReservation", back_populates="user", foreign_keys="ItemReservation.user_id_fk", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(user_id='{self.user_id}', username='{self.username}', role='{self.role.value}')>"

class Item(Base):
    """Represents an individual inventory item."""
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True) # Auto-incrementing primary key
    item_id = Column(String, unique=True, index=True, nullable=False) # User-defined unique ID (e.g., 000001)
    name = Column(String, index=True, nullable=False) # Human-readable name (e.g., Antibiotic_Supply_001)
    category = Column(String, index=True, nullable=False) # Item category (e.g., Medical, Food, Equipment)
    subcategory = Column(String, index=True, nullable=False) # Item subcategory (e.g., Antibiotic_Supply, Food_Packet)
    
    # Physical dimensions
    width_cm = Column(Float, nullable=False)             # Dimension in centimeters
    depth_cm = Column(Float, nullable=False)             # Dimension in centimeters
    height_cm = Column(Float, nullable=False)            # Dimension in centimeters
    mass_kg = Column(Float, nullable=False)              # Mass in kg
    
    # NEW FIELDS - Storage and handling requirements
    temp_requirement = Column(SQLAlchemyEnum(TemperatureRequirement), default=TemperatureRequirement.AMBIENT, nullable=False, index=True)
    lot_number = Column(String, nullable=True, index=True)           # Manufacturing/batch lot reference
    current_location = Column(String, ForeignKey("containers.container_id"), nullable=True, index=True) # Current container location
    orientation_allowed = Column(Boolean, default=True, nullable=False) # Can item be rotated/reoriented
    hazardous_class = Column(SQLAlchemyEnum(HazardousClass), default=HazardousClass.NONE, nullable=False, index=True)
    tags_id = Column(JSON, nullable=True)                            # Multiple identifiers (barcode, RFID, QR) as JSON array
    
    # Usage and lifecycle management
    priority = Column(Integer, nullable=False, default=50, index=True) # Placement/retrieval priority (e.g., 0-100)
    expiry_date = Column(String, nullable=True)                      # Expiration date as string (e.g., "2026-06-12" or "N/A")
    maximum_uses = Column(Integer, nullable=True)                    # Maximum allowed uses (renamed from usage_limit)
    current_uses = Column(Integer, nullable=False, default=0)        # Current usage count
    usage_remaining = Column(Integer, nullable=True)                 # Decrementing counter distinct from maximum_uses
    usage_frequency = Column(Float, nullable=True)                   # Average daily/weekly uses for forecasting
    
    # Status and zone preferences
    preferred_zone = Column(String, nullable=True, index=True)       # Preferred storage zone identifier
    status = Column(SQLAlchemyEnum(ItemStatus), default=ItemStatus.ACTIVE, nullable=False, index=True) # Current status

    # Relationships
    # One-to-one relationship with Placement (an item is in one place)
    placement = relationship("Placement", back_populates="item", uselist=False, cascade="all, delete-orphan")
    # One-to-many relationship with Log (an item can appear in many logs)
    logs = relationship("Log", back_populates="item", cascade="all, delete-orphan")
    # One-to-many relationship with ItemReservation (an item can have multiple reservations)
    reservations = relationship("ItemReservation", back_populates="item", cascade="all, delete-orphan")
    # Relationship to current container
    current_container = relationship("Container", foreign_keys=[current_location])

    def __repr__(self):
        return f"<Item(item_id='{self.item_id}', name='{self.name}', category='{self.category}', status='{self.status.value}')>"

class Container(Base):
    """Represents a storage container - redesigned for enhanced functionality."""
    __tablename__ = "containers"

    id = Column(Integer, primary_key=True, index=True) # Auto-incrementing primary key
    container_id = Column(String, unique=True, index=True, nullable=False) # User-defined unique ID (e.g., M1-A001)
    name = Column(String, index=True, nullable=False)  # Human-readable name (e.g., "Node1_A2 Locker")
    type = Column(SQLAlchemyEnum(ContainerType), nullable=False, index=True) # Container type (CTB, Locker, etc.)
    zone = Column(String, index=True, nullable=False)  # Semantic zone label (e.g., "Node1_Overhead", "PMM_Rack5")
    module_id = Column(String, index=True, nullable=False)  # Module identifier (e.g., M1, M2, M3)
    
    # Physical dimensions (internal)
    width_cm = Column(Float, nullable=False)              # Internal dimension in centimeters
    depth_cm = Column(Float, nullable=False)              # Internal dimension in centimeters
    height_cm = Column(Float, nullable=False)             # Internal dimension in centimeters
    
    # NEW FIELDS - Enhanced container management
    open_face = Column(String, nullable=True)             # Orientation of access (+X, +Y, +Z, -X, -Y, -Z)
    max_mass = Column(Float, nullable=True)               # Maximum weight capacity in kg
    current_mass = Column(Float, default=0.0, nullable=False) # Current total mass (computed)
    access_index = Column(Integer, default=50, nullable=False) # Access difficulty (0-100, 0=easiest)
    parent_container_id = Column(String, ForeignKey("containers.container_id"), nullable=True, index=True) # For nested containers
    
    # Environmental and operational
    is_active = Column(Boolean, default=True, nullable=False) # Container operational status
    description = Column(Text, nullable=True)             # Additional notes or description
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_accessed = Column(DateTime, nullable=True)       # Last time container was accessed

    # Relationships
    # One-to-many relationship with Placement (a container holds many items)
    placements = relationship("Placement", back_populates="container", cascade="all, delete-orphan")
    # Self-referential relationship for nested containers
    child_containers = relationship("Container", backref="parent_container", remote_side=[container_id])
    # Items currently in this container (via current_location)
    contained_items = relationship("Item", foreign_keys="Item.current_location", backref="location_container", overlaps="current_container")

    def __repr__(self):
        return f"<Container(container_id='{self.container_id}', name='{self.name}', type='{self.type.value}', zone='{self.zone}')>"

class Placement(Base):
    """Represents the physical placement of an Item within a Container."""
    __tablename__ = "placements"

    id = Column(Integer, primary_key=True, index=True) # Auto-incrementing primary key

    # Foreign keys linking to the string IDs of Item and Container
    item_id_fk = Column(String, ForeignKey("items.item_id"), nullable=False, unique=True, index=True)
    container_id_fk = Column(String, ForeignKey("containers.container_id"), nullable=False, index=True)

    # Coordinates of the item's bounding box origin (typically front-bottom-left corner)
    # relative to the container's origin (e.g., internal front-bottom-left corner).
    start_w = Column(Float, nullable=False) # Position along the container's width axis
    start_d = Column(Float, nullable=False) # Position along the container's depth axis
    start_h = Column(Float, nullable=False) # Position along the container's height axis

    # Coordinates of the item's bounding box diagonally opposite corner from the start.
    # These implicitly define the item's orientation within the container.
    # end_w = start_w + effective_width_in_this_orientation
    # end_d = start_d + effective_depth_in_this_orientation
    # end_h = start_h + effective_height_in_this_orientation
    end_w = Column(Float, nullable=False)
    end_d = Column(Float, nullable=False)
    end_h = Column(Float, nullable=False)

    # Relationships (linking back to Item and Container objects)
    item = relationship("Item", back_populates="placement")
    container = relationship("Container", back_populates="placements")

    # Ensure an item (identified by item_id_fk) can only have one placement entry.
    __table_args__ = (UniqueConstraint('item_id_fk', name='_placement_item_id_uc'),)

    def __repr__(self):
        pos = f"({self.start_w},{self.start_d},{self.start_h})->({self.end_w},{self.end_d},{self.end_h})"
        return f"<Placement(item_id='{self.item_id_fk}', container_id='{self.container_id_fk}', pos={pos})>"

class ItemReservation(Base):
    """Represents item reservations/bookings by astronauts for specific purposes and durations."""
    __tablename__ = "item_reservations"

    id = Column(Integer, primary_key=True, index=True)
    reservation_id = Column(String, unique=True, index=True, nullable=False) # Unique reservation identifier
    
    # Foreign keys
    item_id_fk = Column(String, ForeignKey("items.item_id"), nullable=False, index=True)
    user_id_fk = Column(String, ForeignKey("users.user_id"), nullable=False, index=True)
    
    # Reservation details
    purpose = Column(String, nullable=False)              # Purpose of reservation (e.g., "EVA Preparation", "Experiment XYZ")
    start_time = Column(DateTime, nullable=False, index=True) # When reservation starts
    end_time = Column(DateTime, nullable=False, index=True)   # When reservation ends
    duration_hours = Column(Float, nullable=False)       # Duration in hours (computed from start/end)
    
    # Status and priority
    status = Column(String, default="ACTIVE", nullable=False, index=True) # ACTIVE, COMPLETED, CANCELLED, EXPIRED
    priority = Column(Integer, default=50, nullable=False) # Reservation priority (0-100)
    is_recurring = Column(Boolean, default=False, nullable=False) # Is this a recurring reservation
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    notes = Column(Text, nullable=True)                   # Additional notes about the reservation
    approved_by = Column(String, ForeignKey("users.user_id"), nullable=True) # Approver user_id if approval required
    
    # Conflict resolution
    conflict_resolution = Column(String, nullable=True)   # How conflicts with other reservations are resolved
    
    # Relationships
    item = relationship("Item", back_populates="reservations")
    user = relationship("User", back_populates="reservations", foreign_keys=[user_id_fk])
    approver = relationship("User", foreign_keys=[approved_by])

    def __repr__(self):
        return f"<ItemReservation(id='{self.reservation_id}', item='{self.item_id_fk}', user='{self.user_id_fk}', purpose='{self.purpose}', status='{self.status}')>"

class Log(Base):
    """Records events and actions related to items, containers, and user activities - Enhanced for analytics."""
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True) # Auto-incrementing primary key
    log_id = Column(String, unique=True, index=True, nullable=False) # Unique log identifier
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True) # Timestamp of the event (UTC recommended)
    
    # Enhanced user tracking
    user_id_fk = Column(String, ForeignKey("users.user_id"), nullable=True, index=True) # User who performed the action
    session_id = Column(String, nullable=True, index=True)          # Session identifier for grouping related actions
    
    # Action details
    action_type = Column(SQLAlchemyEnum(LogActionType), nullable=False, index=True) # Type of action performed
    action_category = Column(String, nullable=True, index=True)     # Category grouping (e.g., "inventory", "reservation", "system")
    
    # Entity references
    item_id_fk = Column(String, ForeignKey("items.item_id"), nullable=True, index=True) # Related item (if applicable)
    container_id_fk = Column(String, ForeignKey("containers.container_id"), nullable=True, index=True) # Related container (if applicable)
    reservation_id_fk = Column(String, ForeignKey("item_reservations.reservation_id"), nullable=True, index=True) # Related reservation (if applicable)
    
    # Enhanced context and metadata
    details_json = Column(JSON, nullable=True)                      # Structured JSON data for rich context
    before_state = Column(JSON, nullable=True)                      # State before the action (for audit trail)
    after_state = Column(JSON, nullable=True)                       # State after the action (for audit trail)
    
    # Analytics and performance tracking
    execution_duration_ms = Column(Integer, nullable=True)          # How long the action took (milliseconds)
    success = Column(Boolean, default=True, nullable=False)         # Whether the action succeeded
    error_message = Column(Text, nullable=True)                     # Error details if action failed
    
    # Location and context
    location = Column(String, nullable=True, index=True)            # Where the action occurred (zone, module, etc.)
    client_info = Column(JSON, nullable=True)                       # Client/device information
    
    # Tags for flexible categorization
    tags = Column(JSON, nullable=True)                              # Array of tags for flexible querying
    
    # Relationships
    user = relationship("User", back_populates="logs")
    item = relationship("Item", back_populates="logs")
    container = relationship("Container", foreign_keys=[container_id_fk])
    reservation = relationship("ItemReservation", foreign_keys=[reservation_id_fk])

    def __repr__(self):
        user_info = f"user={self.user_id_fk}" if self.user_id_fk else "system"
        item_info = f"item={self.item_id_fk}" if self.item_id_fk else ""
        return f"<Log(id='{self.log_id}', {user_info}, action='{self.action_type.value}', {item_info}, success={self.success})>"