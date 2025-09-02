#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'National-space-hackathon', 'backend'))

from app.database import get_db
from sqlalchemy import text

def check_status_values():
    """Check what status values are in the database"""
    print("🔍 Checking Status Values in Database")
    
    # Get database session
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Check all unique status values
        result = db.execute(text("SELECT DISTINCT status FROM items ORDER BY status"))
        status_values = result.fetchall()
        
        print(f"Found {len(status_values)} unique status values:")
        for (status,) in status_values:
            print(f"  - '{status}'")
        
        # Count items per status
        result = db.execute(text("SELECT status, COUNT(*) as count FROM items GROUP BY status ORDER BY status"))
        status_counts = result.fetchall()
        
        print(f"\nStatus counts:")
        for (status, count) in status_counts:
            print(f"  - '{status}': {count} items")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        next(db_gen, None)
        db.close()

if __name__ == "__main__":
    check_status_values()
