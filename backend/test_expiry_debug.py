#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'National-space-hackathon', 'backend'))

from app.database import get_db
from app.models_db import Item as DBItem
from datetime import datetime

def test_expiry_debug():
    """Debug the expiry logic"""
    print("🔍 Testing Expiry Logic Debug")
    
    # Get database session
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Get all items with expiry dates
        items = db.query(DBItem).filter(
            DBItem.expiry_date.isnot(None),
            DBItem.expiry_date != "N/A"
        ).limit(5).all()
        
        print(f"Found {len(items)} items with expiry dates")
        
        current_date = datetime.utcnow().date()
        print(f"Current date: {current_date}")
        
        for item in items:
            print(f"\nItem: {item.item_id} - {item.name}")
            print(f"  Status: {item.status} (type: {type(item.status)})")
            print(f"  Status value: {item.status.value} (type: {type(item.status.value)})")
            print(f"  Expiry date: {item.expiry_date} (type: {type(item.expiry_date)})")
            
            try:
                if item.expiry_date:
                    # Try to parse the date
                    expiry_date_str = str(item.expiry_date).strip()
                    print(f"  Expiry date string: '{expiry_date_str}'")
                    
                    # Try different date formats
                    date_formats = [
                        "%Y-%m-%d",           # 2021-10-07
                        "%Y-%m-%dT%H:%M:%S",  # 2021-10-07T00:00:00
                        "%Y-%m-%dT%H:%M:%S.%fZ",  # 2021-10-07T00:00:00.000Z
                        "%Y-%m-%dT%H:%M:%SZ",     # 2021-10-07T00:00:00Z
                        "%d/%m/%Y",           # 07/10/2021
                        "%m/%d/%Y",           # 10/07/2021
                    ]
                    
                    expiry_date = None
                    for date_format in date_formats:
                        try:
                            if date_format.endswith('Z'):
                                expiry_date = datetime.strptime(expiry_date_str, date_format).date()
                            else:
                                expiry_date = datetime.strptime(expiry_date_str, date_format).date()
                            print(f"  Parsed expiry date: {expiry_date} (format: {date_format})")
                            break
                        except ValueError:
                            continue
                    
                    if expiry_date:
                        is_expired = expiry_date < current_date
                        print(f"  Is expired: {is_expired}")
                        
                        # Test creating ItemInfo
                        try:
                            from app.agent.services.agent_service import AgentService
                            agent_service = AgentService()
                            item_info = agent_service._item_to_info(item, db)
                            print(f"  ✅ ItemInfo created successfully")
                            print(f"     Status in ItemInfo: {item_info.status}")
                        except Exception as e:
                            print(f"  ❌ Error creating ItemInfo: {e}")
                    else:
                        print(f"  ❌ Could not parse expiry date")
                        
            except Exception as e:
                print(f"  ❌ Error processing item: {e}")
                
    finally:
        next(db_gen, None)
        db.close()

if __name__ == "__main__":
    test_expiry_debug()
