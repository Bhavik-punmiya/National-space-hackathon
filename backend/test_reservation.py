#!/usr/bin/env python3
"""
Simple test script for the reservation system.
Run this after starting the backend server.
"""

import requests
import json
from datetime import datetime, timedelta

# Base URL for the API
BASE_URL = "http://localhost:8000"

def test_reservation_system():
    """Test the reservation system endpoints."""
    
    print("🧪 Testing Reservation System...")
    print("=" * 50)
    
    # Test data
    test_item_id = "000001"  # Assuming this item exists
    test_user_id = "astronaut_001"  # Assuming this user exists
    
    # Test 1: Check for conflicts
    print("\n1️⃣ Testing Conflict Check...")
    start_time = datetime.now() + timedelta(hours=1)
    end_time = start_time + timedelta(hours=2)
    
    conflict_data = {
        "item_id": test_item_id,
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat()
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/reservations/conflicts", 
                               json=conflict_data)
        print(f"✅ Conflict Check Response: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"❌ Conflict Check Failed: {e}")
    
    # Test 2: Create a reservation
    print("\n2️⃣ Testing Create Reservation...")
    reservation_data = {
        "item_id": test_item_id,
        "user_id": test_user_id,
        "purpose": "EVA Preparation",
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "priority": 75,
        "notes": "Test reservation for EVA preparation",
        "is_recurring": False
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/reservations", 
                               json=reservation_data)
        print(f"✅ Create Reservation Response: {response.status_code}")
        if response.status_code == 201:
            reservation = response.json()
            print(f"   Created Reservation ID: {reservation.get('reservation_id')}")
            reservation_id = reservation.get('reservation_id')
        else:
            print(f"   Response: {response.json()}")
            return
    except Exception as e:
        print(f"❌ Create Reservation Failed: {e}")
        return
    
    # Test 3: Get all reservations
    print("\n3️⃣ Testing Get Reservations...")
    try:
        response = requests.get(f"{BASE_URL}/api/reservations")
        print(f"✅ Get Reservations Response: {response.status_code}")
        print(f"   Found {response.json().get('count', 0)} reservations")
    except Exception as e:
        print(f"❌ Get Reservations Failed: {e}")
    
    # Test 4: Get specific reservation
    print("\n4️⃣ Testing Get Specific Reservation...")
    try:
        response = requests.get(f"{BASE_URL}/api/reservations/{reservation_id}")
        print(f"✅ Get Specific Reservation Response: {response.status_code}")
        if response.status_code == 200:
            print(f"   Reservation Purpose: {response.json().get('reservation', {}).get('purpose')}")
    except Exception as e:
        print(f"❌ Get Specific Reservation Failed: {e}")
    
    # Test 5: Update reservation
    print("\n5️⃣ Testing Update Reservation...")
    update_data = {
        "notes": "Updated notes for EVA preparation",
        "priority": 80
    }
    
    try:
        response = requests.put(f"{BASE_URL}/api/reservations/{reservation_id}", 
                              json=update_data)
        print(f"✅ Update Reservation Response: {response.status_code}")
        if response.status_code == 200:
            print(f"   Updated Priority: {response.json().get('priority')}")
    except Exception as e:
        print(f"❌ Update Reservation Failed: {e}")
    
    # Test 6: Get item reservations
    print("\n6️⃣ Testing Get Item Reservations...")
    try:
        response = requests.get(f"{BASE_URL}/api/reservations/item/{test_item_id}")
        print(f"✅ Get Item Reservations Response: {response.status_code}")
        print(f"   Found {response.json().get('count', 0)} reservations for item")
    except Exception as e:
        print(f"❌ Get Item Reservations Failed: {e}")
    
    # Test 7: Complete reservation
    print("\n7️⃣ Testing Complete Reservation...")
    try:
        response = requests.post(f"{BASE_URL}/api/reservations/{reservation_id}/complete", 
                               json={"user_id": test_user_id})
        print(f"✅ Complete Reservation Response: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"❌ Complete Reservation Failed: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Reservation System Test Complete!")
    print("\n📋 API Endpoints Tested:")
    print("   POST /api/reservations/conflicts")
    print("   POST /api/reservations")
    print("   GET /api/reservations")
    print("   GET /api/reservations/{id}")
    print("   PUT /api/reservations/{id}")
    print("   GET /api/reservations/item/{item_id}")
    print("   POST /api/reservations/{id}/complete")

if __name__ == "__main__":
    test_reservation_system()
