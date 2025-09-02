#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'National-space-hackathon', 'backend'))

from app.database import get_db
from sqlalchemy import text

def fix_active_status():
    """Fix ACTIVE status values to lowercase"""
    print("🔧 Fixing ACTIVE Status Values")
    
    # Get database session
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Use direct SQL UPDATE to fix the status values
        result = db.execute(text("UPDATE items SET status = 'active' WHERE status = 'ACTIVE'"))
        updated_count = result.rowcount
        
        # Commit changes
        db.commit()
        print(f"✅ Successfully updated {updated_count} items from 'ACTIVE' to 'active'")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        next(db_gen, None)
        db.close()

if __name__ == "__main__":
    fix_active_status()
