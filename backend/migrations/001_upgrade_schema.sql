-- Migration Script: Upgrade Database Schema for Enhanced Stowage Management
-- Version: 1.0
-- Date: 2024
-- Description: Comprehensive database upgrade with new entities, fields, and enhanced functionality

-- =============================================================================
-- PHASE 1: Create new tables first (to avoid foreign key constraint issues)
-- =============================================================================

-- Create users table
CREATE TABLE IF NOT EXISTS users (
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

-- Create item_reservations table
CREATE TABLE IF NOT EXISTS item_reservations (
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
    conflict_resolution VARCHAR,
    FOREIGN KEY (item_id_fk) REFERENCES items (item_id),
    FOREIGN KEY (user_id_fk) REFERENCES users (user_id),
    FOREIGN KEY (approved_by) REFERENCES users (user_id)
);

-- =============================================================================
-- PHASE 2: Backup existing data
-- =============================================================================

-- Create temporary backup tables
CREATE TABLE items_backup AS SELECT * FROM items;
CREATE TABLE containers_backup AS SELECT * FROM containers;
CREATE TABLE logs_backup AS SELECT * FROM logs;

-- =============================================================================
-- PHASE 3: Add new columns to existing tables
-- =============================================================================

-- Add new columns to items table
ALTER TABLE items ADD COLUMN temp_requirement VARCHAR DEFAULT 'AMBIENT';
ALTER TABLE items ADD COLUMN lot_number VARCHAR;
ALTER TABLE items ADD COLUMN current_location VARCHAR;
ALTER TABLE items ADD COLUMN orientation_allowed BOOLEAN DEFAULT 1;
ALTER TABLE items ADD COLUMN hazardous_class VARCHAR DEFAULT 'NONE';
ALTER TABLE items ADD COLUMN tags_id TEXT; -- JSON array as text
ALTER TABLE items ADD COLUMN maximum_uses INTEGER;
ALTER TABLE items ADD COLUMN usage_remaining INTEGER;
ALTER TABLE items ADD COLUMN usage_frequency REAL;

-- Add new columns to containers table
ALTER TABLE containers ADD COLUMN name VARCHAR;
ALTER TABLE containers ADD COLUMN type VARCHAR DEFAULT 'LOCKER';
ALTER TABLE containers ADD COLUMN open_face VARCHAR;
ALTER TABLE containers ADD COLUMN max_mass REAL;
ALTER TABLE containers ADD COLUMN current_mass REAL DEFAULT 0.0;
ALTER TABLE containers ADD COLUMN access_index INTEGER DEFAULT 50;
ALTER TABLE containers ADD COLUMN parent_container_id VARCHAR;
ALTER TABLE containers ADD COLUMN is_active BOOLEAN DEFAULT 1;
ALTER TABLE containers ADD COLUMN description TEXT;
ALTER TABLE containers ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE containers ADD COLUMN last_accessed DATETIME;

-- Add foreign key constraint for parent_container_id (if supported)
-- Note: SQLite doesn't support adding foreign keys to existing tables easily
-- This would need to be handled at the application level or during table recreation

-- Add new columns to logs table
ALTER TABLE logs ADD COLUMN log_id VARCHAR UNIQUE;
ALTER TABLE logs ADD COLUMN user_id_fk VARCHAR;
ALTER TABLE logs ADD COLUMN session_id VARCHAR;
ALTER TABLE logs ADD COLUMN action_category VARCHAR;
ALTER TABLE logs ADD COLUMN container_id_fk VARCHAR;
ALTER TABLE logs ADD COLUMN reservation_id_fk VARCHAR;
ALTER TABLE logs ADD COLUMN before_state TEXT; -- JSON as text
ALTER TABLE logs ADD COLUMN after_state TEXT; -- JSON as text
ALTER TABLE logs ADD COLUMN execution_duration_ms INTEGER;
ALTER TABLE logs ADD COLUMN success BOOLEAN DEFAULT 1;
ALTER TABLE logs ADD COLUMN error_message TEXT;
ALTER TABLE logs ADD COLUMN location VARCHAR;
ALTER TABLE logs ADD COLUMN client_info TEXT; -- JSON as text
ALTER TABLE logs ADD COLUMN tags TEXT; -- JSON array as text

-- =============================================================================
-- PHASE 4: Data migration and updates
-- =============================================================================

-- Migrate usage_limit to maximum_uses
UPDATE items SET maximum_uses = CAST(usage_limit AS INTEGER) 
WHERE usage_limit IS NOT NULL AND usage_limit != 'N/A' AND usage_limit != '';

-- Set usage_remaining equal to maximum_uses initially
UPDATE items SET usage_remaining = maximum_uses WHERE maximum_uses IS NOT NULL;

-- Update container names with default values if not set
UPDATE containers SET name = zone || '_' || module_id || '_' || container_id WHERE name IS NULL;

-- Generate unique log_ids for existing logs
UPDATE logs SET log_id = 'LOG_' || printf('%06d', id) WHERE log_id IS NULL;

-- Migrate userId to user_id_fk (renaming column content)
UPDATE logs SET user_id_fk = userId;

-- Migrate actionType to action_type (this requires enum value mapping)
-- Note: The enum values remain the same, so this is just a column content copy
-- The actual column rename would happen in the next phase

-- Update status values to match new enum values
UPDATE items SET status = 'IN_USE' WHERE status = 'ACTIVE' AND current_uses > 0;
UPDATE items SET status = 'ACTIVE' WHERE status = 'ACTIVE' AND (current_uses = 0 OR current_uses IS NULL);

-- =============================================================================
-- PHASE 5: Create indexes for performance
-- =============================================================================

-- Indexes for users table
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Indexes for item_reservations table
CREATE INDEX IF NOT EXISTS idx_reservations_item_id ON item_reservations(item_id_fk);
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON item_reservations(user_id_fk);
CREATE INDEX IF NOT EXISTS idx_reservations_start_time ON item_reservations(start_time);
CREATE INDEX IF NOT EXISTS idx_reservations_end_time ON item_reservations(end_time);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON item_reservations(status);

-- Additional indexes for enhanced performance
CREATE INDEX IF NOT EXISTS idx_items_temp_requirement ON items(temp_requirement);
CREATE INDEX IF NOT EXISTS idx_items_lot_number ON items(lot_number);
CREATE INDEX IF NOT EXISTS idx_items_current_location ON items(current_location);
CREATE INDEX IF NOT EXISTS idx_items_hazardous_class ON items(hazardous_class);

CREATE INDEX IF NOT EXISTS idx_containers_type ON containers(type);
CREATE INDEX IF NOT EXISTS idx_containers_parent_container_id ON containers(parent_container_id);

CREATE INDEX IF NOT EXISTS idx_logs_user_id_fk ON logs(user_id_fk);
CREATE INDEX IF NOT EXISTS idx_logs_session_id ON logs(session_id);
CREATE INDEX IF NOT EXISTS idx_logs_action_category ON logs(action_category);
CREATE INDEX IF NOT EXISTS idx_logs_container_id_fk ON logs(container_id_fk);
CREATE INDEX IF NOT EXISTS idx_logs_reservation_id_fk ON logs(reservation_id_fk);
CREATE INDEX IF NOT EXISTS idx_logs_location ON logs(location);

-- =============================================================================
-- PHASE 6: Create sample data for testing
-- =============================================================================

-- Insert sample users
INSERT OR IGNORE INTO users (user_id, username, password_hash, role, full_name, email, is_active) VALUES
('USR001', 'admin', 'hashed_password_here', 'ADMIN', 'System Administrator', 'admin@mission.space', 1),
('USR002', 'astronaut1', 'hashed_password_here', 'ASTRONAUT', 'John Doe', 'john.doe@mission.space', 1),
('USR003', 'astronaut2', 'hashed_password_here', 'ASTRONAUT', 'Jane Smith', 'jane.smith@mission.space', 1),
('USR004', 'officer1', 'hashed_password_here', 'OFFICER', 'Mission Control Officer', 'officer@mission.space', 1);

-- =============================================================================
-- PHASE 7: Validation and cleanup
-- =============================================================================

-- Verify data integrity
SELECT 'Items count:' as check_type, COUNT(*) as count FROM items
UNION ALL
SELECT 'Containers count:' as check_type, COUNT(*) as count FROM containers
UNION ALL
SELECT 'Users count:' as check_type, COUNT(*) as count FROM users
UNION ALL
SELECT 'Reservations count:' as check_type, COUNT(*) as count FROM item_reservations
UNION ALL
SELECT 'Logs count:' as check_type, COUNT(*) as count FROM logs;

-- Check for any null values in critical fields
SELECT 'Items with null item_id:' as check_type, COUNT(*) as count FROM items WHERE item_id IS NULL
UNION ALL
SELECT 'Containers with null container_id:' as check_type, COUNT(*) as count FROM containers WHERE container_id IS NULL
UNION ALL
SELECT 'Users with null user_id:' as check_type, COUNT(*) as count FROM users WHERE user_id IS NULL;

-- =============================================================================
-- NOTES FOR MANUAL REVIEW
-- =============================================================================

/*
Manual steps required after running this migration:

1. Update application code to use new field names:
   - usage_limit → maximum_uses
   - userId → user_id_fk
   - actionType → action_type

2. Implement logic for new features:
   - Item reservation system
   - Enhanced user authentication
   - Temperature requirement tracking
   - Hazardous material classification

3. Dashboard and analytics queries ready:
   - User activity tracking via logs.user_id_fk
   - Item usage patterns via usage_frequency
   - Container utilization via current_mass/max_mass
   - Reservation conflicts via overlapping time ranges

4. Consider setting up proper foreign key constraints if moving away from SQLite

5. Update API endpoints to include new fields and relationships

6. Implement reservation conflict detection logic

7. Set up automated cleanup for expired reservations
*/
