# /app/models_db.py



import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, Enum as SQLAlchemyEnum,
    ForeignKey, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship

# Assumes you have a database.py file defining Base
# e.g., from .database import Base
# If not, you need to define Base here:
# from sqlalchemy.orm import declarative_base
# Base = declarative_base()
from .database import Base # Adjust this import if your Base is defined elsewhere

# --- Enums ---

class ItemStatus(str, enum.Enum):
    """Status of an inventory item."""
    ACTIVE = "active"         # Item is available in inventory
    WASTE_EXPIRED = "expired"   # Item marked as waste due to expiry
    WASTE_DEPLETED = "depleted" # Item marked as waste due to usage depletion
    DISPOSED = "disposed"     # Item has been physically removed (undocked)

class LogActionType(str, enum.Enum):
    """Type of action recorded in the event log."""
    PLACEMENT = "placement"             # Initial placement of a new item
    REARRANGEMENT = "rearrangement"     # Moving an existing item within/between containers
    RETRIEVAL = "retrieval"             # Item removed for use (may decrement use count)
    UPDATE_LOCATION = "update_location" # User confirms item placed back after use/manual move
    DISPOSAL_PLAN = "disposal_plan"     # Item scheduled for disposal (e.g., added to undocking list)
    DISPOSAL_COMPLETE = "disposal_complete" # Item confirmed removed (e.g., after undocking)
    SIMULATION_USE = "simulation_use"       # Use simulated (e.g., for planning)
    SIMULATION_EXPIRED = "simulation_expired" # Item marked expired by simulation/check
    SIMULATION_DEPLETED = "simulation_depleted"# Item marked depleted by simulation/check
    IMPORT = "import"                   # Bulk import of data (items, containers)
    EXPORT = "export"                   # Bulk export of data

# --- SQLAlchemy ORM Models ---
class Item(Base):
    """Represents an individual inventory item."""
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True) # Auto-incrementing primary key
    item_id = Column(String, unique=True, index=True, nullable=False) # User-defined unique ID (e.g., 000001)
    name = Column(String, index=True, nullable=False) # Human-readable name (e.g., Antibiotic_Supply_001)
    category = Column(String, index=True, nullable=False) # Item category (e.g., Medical, Food, Equipment)
    subcategory = Column(String, index=True, nullable=False) # Item subcategory (e.g., Antibiotic_Supply, Food_Packet)
    width_cm = Column(Float, nullable=False)             # Dimension in centimeters
    depth_cm = Column(Float, nullable=False)             # Dimension in centimeters
    height_cm = Column(Float, nullable=False)            # Dimension in centimeters
    mass_kg = Column(Float, nullable=False)              # Mass in kg
    priority = Column(Integer, nullable=False, default=50, index=True) # Placement/retrieval priority (e.g., 0-100)
    expiry_date = Column(String, nullable=True)          # Expiration date as string (e.g., "2026-06-12" or "N/A")
    usage_limit = Column(String, nullable=True)          # Usage limit as string (e.g., "314" or "N/A")
    current_uses = Column(Integer, nullable=False, default=0)  # Current usage count
    preferred_zone = Column(String, nullable=True, index=True) # Preferred storage zone identifier
    status = Column(SQLAlchemyEnum(ItemStatus), default=ItemStatus.ACTIVE, nullable=False, index=True) # Current status

    # Relationships
    # One-to-one relationship with Placement (an item is in one place)
    placement = relationship("Placement", back_populates="item", uselist=False, cascade="all, delete-orphan")
    # One-to-many relationship with Log (an item can appear in many logs)
    logs = relationship("Log", back_populates="item", cascade="all, delete-orphan") # Cascade delete logs if item is deleted? Decide based on requirements.

    def __repr__(self):
        return f"<Item(item_id='{self.item_id}', name='{self.name}', category='{self.category}', status='{self.status.value}')>"

class Container(Base):
    """Represents a storage container."""
    __tablename__ = "containers"

    id = Column(Integer, primary_key=True, index=True) # Auto-incrementing primary key
    zone = Column(String, index=True, nullable=False)  # Storage zone identifier (e.g., Airlock, Storage_Bay)
    module_id = Column(String, index=True, nullable=False)  # Module identifier (e.g., M1, M2, M3)
    container_id = Column(String, unique=True, index=True, nullable=False) # User-defined unique ID (e.g., M1-A001)
    width_cm = Column(Float, nullable=False)              # Internal dimension in centimeters
    depth_cm = Column(Float, nullable=False)              # Internal dimension in centimeters
    height_cm = Column(Float, nullable=False)             # Internal dimension in centimeters
    # Optional: Add constraints like max_weight, environmental controls etc.

    # Relationships
    # One-to-many relationship with Placement (a container holds many items)
    placements = relationship("Placement", back_populates="container", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Container(container_id='{self.container_id}', zone='{self.zone}', module_id='{self.module_id}')>"

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


class Log(Base):
    """Records events and actions related to items and containers."""
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True) # Auto-incrementing primary key
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True) # Timestamp of the event (UTC recommended)
    userId = Column(String, nullable=True, index=True) # Identifier for the user initiating the action (optional)
    actionType = Column(SQLAlchemyEnum(LogActionType), nullable=False, index=True) # Type of action performed
    # Foreign key to Item (optional, as some logs might not relate to a specific item)
    item_id_fk = Column(String, ForeignKey("items.item_id"), nullable=True, index=True)
    # Store detailed context as a JSON string in a Text field
    # Use Text for potentially long JSON strings, especially in SQLite/PostgreSQL. Use JSON type if DB supports it well.
    details_json = Column(Text, nullable=True)

    # Relationship (linking back to the Item object, if applicable)
    item = relationship("Item", back_populates="logs")

    def __repr__(self):
        details_preview = (self.details_json[:30] + '...') if self.details_json and len(self.details_json) > 30 else self.details_json
        return f"<Log(id={self.id}, timestamp='{self.timestamp}', action='{self.actionType.value}', item_id='{self.item_id_fk}', details='{details_preview}')>"