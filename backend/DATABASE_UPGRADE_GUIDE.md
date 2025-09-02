# Database Upgrade Guide for Enhanced Stowage Management System

## 🚀 Overview

This guide documents the comprehensive database upgrade that transforms your spaceborne stowage management system from a basic inventory tracker to a sophisticated, astronaut-aware platform with advanced analytics, user management, and item reservation capabilities.

## 📋 What's New

### 1. **Enhanced Item Management**
- **Temperature Requirements**: Track items that need cold, warm, or ambient storage
- **Hazardous Material Classification**: Identify flammable, corrosive, biohazard, toxic, radioactive, and pressurized items
- **Lot Number Tracking**: Manufacturing/batch reference tracking
- **Orientation Constraints**: Specify if items can be rotated/reoriented
- **Usage Analytics**: Track usage frequency and predict depletion
- **Enhanced Status System**: More granular status tracking (IN_USE, PLANNED, SCHEDULED, etc.)

### 2. **User Authentication & Role Management**
- **User Accounts**: Astronaut, Officer, Admin, and Guest roles
- **Activity Tracking**: Complete audit trail of who did what, when
- **Session Management**: Track user sessions and activities
- **Password Security**: Hashed password storage

### 3. **Item Reservation System** ⭐ **NEW FEATURE**
- **Astronaut Booking**: Reserve items for specific purposes and durations
- **Conflict Detection**: Prevent double-booking of items
- **Approval Workflow**: Optional approval system for reservations
- **Recurring Reservations**: Support for regular usage patterns
- **Purpose Tracking**: Document why items are reserved

### 4. **Enhanced Container Management**
- **Container Types**: CTB, Locker, Rack Bay, Free Volume, Vehicle, Trash Bag, etc.
- **Nested Containers**: Support for bags inside racks, drawers in cabinets
- **Access Difficulty**: Rate containers by accessibility (0-100 scale)
- **Mass Tracking**: Monitor container weight utilization
- **Open Face Orientation**: Specify access direction (+X, +Y, +Z, etc.)

### 5. **Advanced Logging & Analytics**
- **Rich Context**: Before/after state tracking for audit trails
- **Performance Metrics**: Execution time tracking
- **User Attribution**: Every action linked to specific users
- **Session Grouping**: Group related activities
- **Flexible Tagging**: Custom tags for categorization

## 🗄️ Database Schema Changes

### New Tables Created

#### `users` Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id VARCHAR UNIQUE NOT NULL,
    username VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    role VARCHAR NOT NULL DEFAULT 'ASTRONAUT',
    full_name VARCHAR,
    email VARCHAR,
    last_login DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT 1
);
```

#### `item_reservations` Table
```sql
CREATE TABLE item_reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reservation_id VARCHAR UNIQUE NOT NULL,
    item_id_fk VARCHAR NOT NULL,
    user_id_fk VARCHAR NOT NULL,
    purpose VARCHAR NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    duration_hours REAL NOT NULL,
    status VARCHAR NOT NULL DEFAULT 'ACTIVE',
    priority INTEGER NOT NULL DEFAULT 50,
    is_recurring BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    approved_by VARCHAR,
    conflict_resolution VARCHAR
);
```

### Enhanced Existing Tables

#### `items` Table - New Columns
- `temp_requirement`: Temperature storage requirement (COLD, AMBIENT, WARM, N/A)
- `lot_number`: Manufacturing/batch lot reference
- `current_location`: Foreign key to current container
- `orientation_allowed`: Boolean for rotation constraints
- `hazardous_class`: Hazard classification (NONE, FLAMMABLE, CORROSIVE, etc.)
- `tags_id`: JSON array of identifiers (barcode, RFID, QR)
- `maximum_uses`: Renamed from `usage_limit` for consistency
- `usage_remaining`: Decrementing usage counter
- `usage_frequency`: Average uses per day for forecasting

#### `containers` Table - New Columns
- `name`: Human-readable container name
- `type`: Container type (CTB, LOCKER, RACK_BAY, etc.)
- `open_face`: Access orientation (+X, +Y, +Z, -X, -Y, -Z)
- `max_mass`: Maximum weight capacity
- `current_mass`: Current total weight (computed)
- `access_index`: Accessibility rating (0-100)
- `parent_container_id`: For nested containers
- `is_active`: Operational status
- `description`: Additional notes
- `created_at`: Creation timestamp
- `last_accessed`: Last access time

#### `logs` Table - New Columns
- `log_id`: Unique log identifier
- `user_id_fk`: User who performed the action
- `session_id`: Session grouping
- `action_category`: Action grouping (inventory, reservation, system)
- `container_id_fk`: Related container
- `reservation_id_fk`: Related reservation
- `before_state`: State before action (JSON)
- `after_state`: State after action (JSON)
- `execution_duration_ms`: Performance tracking
- `success`: Action success status
- `error_message`: Error details
- `location`: Where action occurred
- `client_info`: Client/device information (JSON)
- `tags`: Custom tags (JSON array)

## 🔄 Migration Process

### Step 1: Backup Your Database
```bash
# The upgrade script automatically creates a backup
python migrations/upgrade_database.py --backup
```

### Step 2: Run the Upgrade
```bash
# From the backend directory
python migrations/upgrade_database.py

# Or do a dry run first to see what will happen
python migrations/upgrade_database.py --dry-run
```

### Step 3: Verify the Upgrade
The script will automatically validate:
- All new tables exist
- All new columns are present
- Sample data is created
- Data migration completed successfully

## 🚀 New Features Implementation

### 1. **Item Reservation System**

#### Create a Reservation
```python
from app.models_api_enhanced import ReservationCreate
from datetime import datetime, timedelta

reservation = ReservationCreate(
    item_id="000001",
    user_id="USR002",
    purpose="EVA Preparation - Oxygen tank check",
    start_time=datetime.now(),
    end_time=datetime.now() + timedelta(hours=4),
    priority=80,
    notes="Need oxygen tank for EVA prep"
)
```

#### Check for Conflicts
```python
# Check if item is available during requested time
conflict_check = ConflictCheckRequest(
    item_id="000001",
    start_time=datetime.now(),
    end_time=datetime.now() + timedelta(hours=4)
)
```

### 2. **Enhanced Search with Filters**
```python
from app.models_api_enhanced import SearchRequest, SearchFilters

search_request = SearchRequest(
    query="oxygen",
    filters=SearchFilters(
        category="Medical",
        temp_requirement=TemperatureRequirement.AMBIENT,
        hazardous_class=HazardousClass.NONE,
        expiring_within_days=30
    ),
    limit=50,
    sort_by="expiry_date",
    sort_order="asc"
)
```

### 3. **User Activity Tracking**
```python
# Get user's recent activity
user_activity = db.query(Log).filter(
    Log.user_id_fk == "USR002"
).order_by(Log.timestamp.desc()).limit(20).all()

# Get user's favorite zones
favorite_zones = db.query(Log.location).filter(
    Log.user_id_fk == "USR002"
).group_by(Log.location).order_by(
    func.count(Log.id).desc()
).limit(5).all()
```

### 4. **Container Utilization Analytics**
```python
# Get container utilization
utilization = db.query(
    Container.container_id,
    Container.name,
    Container.current_mass,
    Container.max_mass,
    func.count(Item.id).label('item_count')
).join(Item, Item.current_location == Container.container_id).group_by(
    Container.container_id
).all()

# Calculate utilization percentage
for container in utilization:
    if container.max_mass:
        container.utilization_percentage = (container.current_mass / container.max_mass) * 100
```

## 📊 Dashboard Queries

### Most Used Items
```sql
SELECT 
    i.item_id,
    i.name,
    i.category,
    COUNT(l.id) as usage_count,
    i.usage_frequency,
    i.last_used
FROM items i
LEFT JOIN logs l ON i.item_id = l.item_id_fk 
    AND l.action_type IN ('retrieval', 'in_use')
GROUP BY i.item_id
ORDER BY usage_count DESC
LIMIT 10;
```

### User Activity Summary
```sql
SELECT 
    u.user_id,
    u.full_name,
    u.role,
    COUNT(l.id) as total_actions,
    MAX(l.timestamp) as last_activity,
    COUNT(DISTINCT l.item_id_fk) as unique_items_used
FROM users u
LEFT JOIN logs l ON u.user_id = l.user_id_fk
WHERE l.timestamp >= datetime('now', '-30 days')
GROUP BY u.user_id
ORDER BY total_actions DESC;
```

### Container Heat Map
```sql
SELECT 
    c.zone,
    c.container_id,
    c.name,
    COUNT(l.id) as access_count,
    AVG(c.access_index) as avg_access_difficulty
FROM containers c
LEFT JOIN logs l ON c.container_id = l.container_id_fk
WHERE l.timestamp >= datetime('now', '-7 days')
GROUP BY c.container_id
ORDER BY access_count DESC;
```

### Expiring Items Forecast
```sql
SELECT 
    i.item_id,
    i.name,
    i.category,
    i.expiry_date,
    i.usage_frequency,
    i.usage_remaining,
    CASE 
        WHEN i.usage_frequency > 0 AND i.usage_remaining > 0
        THEN datetime('now', '+' || (i.usage_remaining / i.usage_frequency) || ' days')
        ELSE NULL
    END as predicted_depletion
FROM items i
WHERE i.expiry_date != 'N/A' 
    AND i.expiry_date != ''
    AND i.status IN ('ACTIVE', 'IN_USE')
ORDER BY i.expiry_date ASC;
```

## 🔧 API Updates Required

### 1. **Update Existing Endpoints**
- Change `usage_limit` to `maximum_uses` in all item-related APIs
- Change `userId` to `user_id` in all user-related APIs
- Change `actionType` to `action_type` in logging APIs

### 2. **New Endpoints to Implement**
- `POST /api/users` - Create user accounts
- `POST /api/auth/login` - User authentication
- `POST /api/reservations` - Create item reservations
- `GET /api/reservations/conflicts` - Check reservation conflicts
- `GET /api/analytics/dashboard` - Dashboard data
- `GET /api/analytics/user-activity` - User activity summary
- `GET /api/analytics/container-utilization` - Container utilization

### 3. **Enhanced Response Models**
All existing endpoints now return additional fields:
- Items include temperature requirements, hazardous classification, lot numbers
- Containers include type, access difficulty, mass information
- Logs include user attribution, session grouping, performance metrics

## 🚨 Important Notes

### 1. **Backward Compatibility**
- All existing data is preserved
- Existing API endpoints continue to work
- New fields have sensible defaults

### 2. **Data Migration**
- `usage_limit` values are automatically migrated to `maximum_uses`
- `usage_remaining` is set equal to `maximum_uses` initially
- Container names are auto-generated if not present
- Log IDs are generated for existing logs

### 3. **Performance Considerations**
- New indexes are created for all new fields
- JSON fields are indexed for efficient querying
- Composite indexes for common query patterns

### 4. **Security Updates**
- Password hashing for user accounts
- Role-based access control
- Session management
- Audit trail for all actions

## 🧪 Testing the Upgrade

### 1. **Run the Upgrade Script**
```bash
cd National-space-hackathon/backend
python migrations/upgrade_database.py --dry-run  # See what will happen
python migrations/upgrade_database.py            # Actually run it
```

### 2. **Verify New Features**
```bash
# Check if new tables exist
sqlite3 cargo_management.db ".tables"

# Check if new columns exist
sqlite3 cargo_management.db "PRAGMA table_info(items);"
sqlite3 cargo_management.db "PRAGMA table_info(containers);"
sqlite3 cargo_management.db "PRAGMA table_info(logs);"

# Check sample data
sqlite3 cargo_management.db "SELECT * FROM users LIMIT 5;"
```

### 3. **Test New Functionality**
- Create a test user account
- Make a test item reservation
- Check for reservation conflicts
- View enhanced item details
- Test new search filters

## 🔮 Future Enhancements

### 1. **Advanced Analytics**
- Machine learning for usage prediction
- Automated restocking recommendations
- Anomaly detection in usage patterns
- Predictive maintenance for equipment

### 2. **Integration Features**
- Calendar integration for reservations
- Email notifications for conflicts
- Mobile app for astronauts
- Real-time collaboration tools

### 3. **Operational Features**
- Automated conflict resolution
- Bulk reservation operations
- Reservation templates
- Approval workflows

## 📞 Support

If you encounter any issues during the upgrade:

1. **Check the backup**: The script creates a timestamped backup
2. **Review the logs**: Check for any error messages
3. **Validate manually**: Use the validation queries in the guide
4. **Rollback if needed**: Restore from the backup file

## 🎯 Summary

This upgrade transforms your stowage management system from a basic inventory tracker to a sophisticated, astronaut-aware platform that provides:

- **Better Item Management**: Temperature requirements, hazardous materials, lot tracking
- **User Accountability**: Complete audit trail of who used what, when
- **Resource Planning**: Item reservations prevent conflicts and enable planning
- **Enhanced Analytics**: Usage patterns, container utilization, predictive insights
- **Operational Efficiency**: Better access control, conflict detection, workflow management

The system is now ready for advanced space station operations with multiple astronauts, complex scheduling requirements, and comprehensive reporting needs.
