#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'National-space-hackathon', 'backend'))

from app.database import get_db
from sqlalchemy import text

def fix_enum_values_lowercase():
    """Fix database values to match enum expectations (lowercase)"""
    print("🔧 Fixing Enum Values in Database to Lowercase")
    
    # Get database session
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Fix active status to lowercase
        result1 = db.execute(text("UPDATE items SET status = 'active' WHERE status = 'ACTIVE'"))
        active_updated = result1.rowcount
        
        # Fix expired status to lowercase
        result2 = db.execute(text("UPDATE items SET status = 'expired' WHERE status = 'EXPIRED'"))
        expired_updated = result2.rowcount
        
        # Commit changes
        db.commit()
        print(f"✅ Successfully updated {active_updated} items from 'ACTIVE' to 'active'")
        print(f"✅ Successfully updated {expired_updated} items from 'EXPIRED' to 'expired'")
        
        # Check final status
        result = db.execute(text("SELECT DISTINCT status FROM items ORDER BY status"))
        status_values = result.fetchall()
        print(f"\nFinal status values in database:")
        for (status,) in status_values:
            print(f"  - '{status}'")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        next(db_gen, None)
        db.close()

if __name__ == "__main__":
    fix_enum_values_lowercase()
