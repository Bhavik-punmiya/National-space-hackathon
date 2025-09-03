# 🚀 Item Reservation System

A comprehensive scheduling and reservation system for the ISS Cargo Management System that allows astronauts to book items for specific time periods with conflict detection and logging.

## ✨ Features

- **Item Scheduling**: Reserve items for specific time periods
- **Conflict Detection**: Automatically detect scheduling conflicts
- **User Management**: Track who made reservations and when
- **Status Tracking**: Active, Completed, Cancelled, Expired states
- **Comprehensive Logging**: All reservation activities are logged for audit trails
- **Priority System**: Set reservation priorities (0-100)
- **Recurring Reservations**: Support for recurring booking patterns
- **Conflict Resolution**: Handle overlapping reservations gracefully

## 🏗️ Architecture

### Database Models
- **ItemReservation**: Core reservation entity with all booking details
- **Item**: Enhanced with reservation relationships
- **User**: Enhanced with reservation relationships
- **Log**: Enhanced with reservation tracking

### Service Layer
- **reservation_service.py**: Business logic for all reservation operations
- **logging_service.py**: Enhanced logging for reservation activities

### API Layer
- **reservation_routes.py**: RESTful API endpoints for reservation management

## 📡 API Endpoints

### 1. Create Reservation
```http
POST /api/reservations
Content-Type: application/json

{
  "item_id": "000001",
  "user_id": "astronaut_001",
  "purpose": "EVA Preparation",
  "start_time": "2024-01-15T10:00:00Z",
  "end_time": "2024-01-15T12:00:00Z",
  "priority": 75,
  "notes": "Preparing for spacewalk",
  "is_recurring": false
}
```

**Response:**
```json
{
  "success": true,
  "reservation_id": "uuid-here",
  "item_id": "000001",
  "user_id": "astronaut_001",
  "purpose": "EVA Preparation",
  "start_time": "2024-01-15T10:00:00Z",
  "end_time": "2024-01-15T12:00:00Z",
  "priority": 75,
  "notes": "Preparing for spacewalk",
  "status": "ACTIVE",
  "duration_hours": 2.0,
  "is_recurring": false,
  "created_at": "2024-01-15T09:00:00Z",
  "updated_at": "2024-01-15T09:00:00Z",
  "item_name": "EVA Suit",
  "user_name": "astronaut_001"
}
```

### 2. Get All Reservations
```http
GET /api/reservations?item_id=000001&user_id=astronaut_001&status=ACTIVE&limit=50&offset=0
```

### 3. Get Specific Reservation
```http
GET /api/reservations/{reservation_id}
```

### 4. Update Reservation
```http
PUT /api/reservations/{reservation_id}
Content-Type: application/json

{
  "purpose": "Updated EVA Preparation",
  "priority": 80,
  "notes": "Updated notes"
}
```

### 5. Cancel Reservation
```http
POST /api/reservations/{reservation_id}/cancel
Content-Type: application/json

{
  "user_id": "astronaut_001",
  "reason": "Mission postponed"
}
```

### 6. Complete Reservation
```http
POST /api/reservations/{reservation_id}/complete
Content-Type: application/json

{
  "user_id": "astronaut_001"
}
```

### 7. Check for Conflicts
```http
POST /api/reservations/conflicts
Content-Type: application/json

{
  "item_id": "000001",
  "start_time": "2024-01-15T10:00:00Z",
  "end_time": "2024-01-15T12:00:00Z",
  "exclude_reservation_id": "optional-uuid"
}
```

### 8. Get Item Reservations
```http
GET /api/reservations/item/{item_id}
```

### 9. Get User Reservations
```http
GET /api/reservations/user/{user_id}
```

## 🔧 Setup and Installation

### 1. Start the Backend Server
```bash
conda activate space_env
cd backend
python -m app.main
```

### 2. Test the Reservation System
```bash
# Install requests if not already installed
pip install requests

# Run the test script
python test_reservation.py
```

## 📊 Data Flow

### Reservation Creation Flow
1. **Validation**: Check if item exists and is available
2. **Conflict Detection**: Check for overlapping reservations
3. **Creation**: Create reservation record in database
4. **Logging**: Log the reservation creation activity
5. **Response**: Return reservation details with confirmation

### Conflict Detection Logic
- **Time Overlap**: New reservation overlaps with existing active reservations
- **Item Status**: Item must be ACTIVE to be reserved
- **User Permissions**: User must have access to the item
- **Exclusion**: Can exclude specific reservations from conflict check

## 🗄️ Database Schema

### ItemReservation Table
```sql
CREATE TABLE item_reservations (
    id INTEGER PRIMARY KEY,
    reservation_id VARCHAR UNIQUE NOT NULL,
    item_id_fk VARCHAR NOT NULL,
    user_id_fk VARCHAR NOT NULL,
    purpose VARCHAR NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    duration_hours FLOAT NOT NULL,
    status VARCHAR DEFAULT 'ACTIVE',
    priority INTEGER DEFAULT 50,
    is_recurring BOOLEAN DEFAULT FALSE,
    notes TEXT,
    approved_by VARCHAR,
    conflict_resolution VARCHAR,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🔍 Logging and Audit

Every reservation action is logged with:
- **Action Type**: RESERVED, RESERVATION_CANCELLED, RESERVATION_COMPLETED
- **User Context**: Who performed the action
- **Item Context**: Which item was affected
- **Reservation Context**: Reservation details and changes
- **Timestamps**: When actions occurred
- **Details**: Rich context information for analytics

## 🚨 Error Handling

### Common Error Scenarios
1. **Item Not Found**: 400 Bad Request
2. **Item Not Available**: 400 Bad Request
3. **Scheduling Conflicts**: 400 Bad Request with conflict details
4. **Invalid Time Range**: 400 Bad Request
5. **User Not Found**: 400 Bad Request
6. **Reservation Not Found**: 404 Not Found
7. **Invalid Status Changes**: 400 Bad Request

### Error Response Format
```json
{
  "success": false,
  "error": "Detailed error message",
  "details": "Additional error context if available"
}
```

## 🔮 Future Enhancements

### Planned Features
- **Approval Workflow**: Multi-level approval for high-priority items
- **Recurring Patterns**: Advanced recurring reservation patterns
- **Notification System**: Email/SMS notifications for reservation changes
- **Calendar Integration**: Export reservations to calendar applications
- **Analytics Dashboard**: Reservation usage analytics and reporting
- **Mobile App**: Native mobile application for reservations

### Integration Points
- **Frontend Dashboard**: React/Next.js reservation management interface
- **Calendar Views**: Visual calendar representation of reservations
- **Conflict Resolution UI**: Interactive conflict resolution interface
- **User Management**: Enhanced user roles and permissions

## 🧪 Testing

### Manual Testing
```bash
# Test conflict detection
curl -X POST http://localhost:8000/api/reservations/conflicts \
  -H "Content-Type: application/json" \
  -d '{"item_id":"000001","start_time":"2024-01-15T10:00:00Z","end_time":"2024-01-15T12:00:00Z"}'

# Test reservation creation
curl -X POST http://localhost:8000/api/reservations \
  -H "Content-Type: application/json" \
  -d '{"item_id":"000001","user_id":"astronaut_001","purpose":"Test","start_time":"2024-01-15T10:00:00Z","end_time":"2024-01-15T12:00:00Z","priority":50}'
```

### Automated Testing
Run the comprehensive test suite:
```bash
python test_reservation.py
```

## 📝 Notes

- **Time Zones**: All times are stored in UTC
- **Duration Calculation**: Automatically calculated from start/end times
- **Status Transitions**: Only valid status transitions are allowed
- **Data Integrity**: Foreign key constraints ensure data consistency
- **Performance**: Indexed fields for fast queries and conflict detection

## 🤝 Contributing

When adding new features to the reservation system:
1. Update the service layer first
2. Add corresponding API endpoints
3. Include comprehensive logging
4. Add error handling
5. Update this documentation
6. Add tests for new functionality

## 📞 Support

For issues or questions about the reservation system:
1. Check the logs for detailed error information
2. Verify database connectivity and schema
3. Test with the provided test script
4. Review API request/response formats
5. Check user permissions and item availability
