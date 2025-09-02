#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'National-space-hackathon', 'backend'))

from app.database import get_db
from sqlalchemy import text

def fix_expired_status():
    """Fix expired status values in the database"""
    print("🔧 Fixing Expired Status Values")
    
    # Get database session
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Use direct SQL UPDATE to fix the status values
        result = db.execute(text("UPDATE items SET status = 'expired' WHERE status = 'EXPIRED'"))
        updated_count = result.rowcount
        
        # Commit changes
        db.commit()
        print(f"✅ Successfully updated {updated_count} items from 'EXPIRED' to 'expired'")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        next(db_gen, None)
        db.close()

if __name__ == "__main__":
    fix_expired_status()
