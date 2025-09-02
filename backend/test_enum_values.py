#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'National-space-hackathon', 'backend'))

from app.models_db import ItemStatus

def test_enum_values():
    """Test what the actual enum values are"""
    print("🔍 Testing Enum Values")
    
    print("ItemStatus enum values:")
    for status in ItemStatus:
        print(f"  - {status.name} = '{status.value}'")
    
    print(f"\nTesting enum creation:")
    try:
        active = ItemStatus("ACTIVE")
        print(f"  ✅ ItemStatus('ACTIVE') = {active}")
    except ValueError as e:
        print(f"  ❌ ItemStatus('ACTIVE') failed: {e}")
    
    try:
        expired = ItemStatus("WASTE_EXPIRED")
        print(f"  ✅ ItemStatus('WASTE_EXPIRED') = {expired}")
    except ValueError as e:
        print(f"  ❌ ItemStatus('WASTE_EXPIRED') failed: {e}")
    
    try:
        depleted = ItemStatus("WASTE_DEPLETED")
        print(f"  ✅ ItemStatus('WASTE_DEPLETED') = {depleted}")
    except ValueError as e:
        print(f"  ❌ ItemStatus('WASTE_DEPLETED') failed: {e}")
    
    try:
        disposed = ItemStatus("DISPOSED")
        print(f"  ✅ ItemStatus('DISPOSED') = {disposed}")
    except ValueError as e:
        print(f"  ❌ ItemStatus('DISPOSED') failed: {e}")

if __name__ == "__main__":
    test_enum_values()
