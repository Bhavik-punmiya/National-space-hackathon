#!/usr/bin/env python3
"""
Test script for the new waste and simulation APIs.
Run this after starting the backend server to test the new endpoints.
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:5000"
HEADERS = {
    "Content-Type": "application/json",
    "X-User-ID": "test_user_123"
}

def test_waste_identify():
    """Test the enhanced waste identification endpoint."""
    print("\n=== Testing Waste Identification ===")
    
    # Test with default parameters
    response = requests.get(f"{BASE_URL}/api/waste/identify", headers=HEADERS)
    print(f"Default identify: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {len(data.get('wasteItems', []))} waste/expiring items")
    
    # Test with custom expiring threshold
    response = requests.get(
        f"{BASE_URL}/api/waste/identify?expiring_days_threshold=7", 
        headers=HEADERS
    )
    print(f"7-day threshold: {response.status_code}")
    
    # Test without expiring soon items
    response = requests.get(
        f"{BASE_URL}/api/waste/identify?include_expiring_soon=false", 
        headers=HEADERS
    )
    print(f"Exclude expiring: {response.status_code}")

def test_waste_prediction():
    """Test the waste prediction endpoint."""
    print("\n=== Testing Waste Prediction ===")
    
    # Test 30-day prediction
    response = requests.get(f"{BASE_URL}/api/waste/predict?days_ahead=30", headers=HEADERS)
    print(f"30-day prediction: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        predictions = data.get('predictions', {})
        print(f"Total predictions: {predictions.get('total_predictions', 0)}")
        print(f"Items expiring soon: {len(predictions.get('items_expiring_soon', []))}")
        print(f"Items depleting soon: {len(predictions.get('items_depleting_soon', []))}")
        print(f"Resupply recommendations: {len(predictions.get('resupply_recommendations', []))}")
    
    # Test 7-day prediction
    response = requests.get(f"{BASE_URL}/api/waste/predict?days_ahead=7", headers=HEADERS)
    print(f"7-day prediction: {response.status_code}")

def test_waste_analytics():
    """Test the waste analytics endpoint."""
    print("\n=== Testing Waste Analytics ===")
    
    # Test 30-day analytics
    response = requests.get(f"{BASE_URL}/api/waste/analytics?days_back=30", headers=HEADERS)
    print(f"30-day analytics: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        analytics = data.get('analytics', {})
        print(f"Period: {analytics.get('period', 'Unknown')}")
        print(f"Total waste items: {analytics.get('total_waste_items', 0)}")
        print(f"Waste by reason: {len(analytics.get('waste_by_reason', {}))}")
        print(f"Waste by category: {len(analytics.get('waste_by_category', {}))}")
    
    # Test 7-day analytics
    response = requests.get(f"{BASE_URL}/api/waste/analytics?days_back=7", headers=HEADERS)
    print(f"7-day analytics: {response.status_code}")

def test_resupply_forecast():
    """Test the resupply forecast endpoint."""
    print("\n=== Testing Resupply Forecast ===")
    
    # Test basic forecast
    response = requests.get(f"{BASE_URL}/api/waste/resupply-forecast?days_ahead=30", headers=HEADERS)
    print(f"Basic forecast: {response.status_code}")
    
    # Test with category filter
    response = requests.get(
        f"{BASE_URL}/api/waste/resupply-forecast?days_ahead=30&category=Food", 
        headers=HEADERS
    )
    print(f"Food category forecast: {response.status_code}")
    
    # Test with urgency filter
    response = requests.get(
        f"{BASE_URL}/api/waste/resupply-forecast?days_ahead=30&urgency=CRITICAL", 
        headers=HEADERS
    )
    print(f"Critical urgency forecast: {response.status_code}")

def test_simulation_prediction():
    """Test the simulation prediction endpoint."""
    print("\n=== Testing Simulation Prediction ===")
    
    # Test simulation prediction
    response = requests.get(f"{BASE_URL}/api/simulate/predict?days_ahead=30", headers=HEADERS)
    print(f"Simulation prediction: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        predictions = data.get('predictions', {})
        print(f"Simulation period: {predictions.get('simulation_period', 'Unknown')}")
        print(f"Items likely to deplete: {len(predictions.get('items_likely_to_deplete', []))}")
        print(f"Items likely to expire: {len(predictions.get('items_likely_to_expire', []))}")
        print(f"Waste generation estimate: {predictions.get('waste_generation_estimate', 0)}")
    
    # Test current simulation time
    response = requests.get(f"{BASE_URL}/api/simulate/current-time", headers=HEADERS)
    print(f"Current simulation time: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Current time: {data.get('current_simulation_time', 'Unknown')}")

def test_simulation_run():
    """Test running a simulation."""
    print("\n=== Testing Simulation Run ===")
    
    # Create simulation request
    simulation_data = {
        "num_of_days": 7,
        "user_id": "test_user_123",
        "items_to_be_used_per_day": [
            {"name": "Food_Packet_001"},
            {"name": "Medical_Supply_001"}
        ]
    }
    
    response = requests.post(
        f"{BASE_URL}/api/simulate/day",
        headers=HEADERS,
        json=simulation_data
    )
    print(f"Simulation run: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"New date: {data.get('newDate', 'Unknown')}")
        changes = data.get('changes', {})
        print(f"Items used: {len(changes.get('itemsUsed', []))}")
        print(f"Items expired: {len(changes.get('itemsExpired', []))}")
        print(f"Items depleted: {len(changes.get('itemsDepletedToday', []))}")

def main():
    """Run all tests."""
    print("🚀 Testing Enhanced Waste and Simulation APIs")
    print("=" * 50)
    
    try:
        # Test all endpoints
        test_waste_identify()
        test_waste_prediction()
        test_waste_analytics()
        test_resupply_forecast()
        test_simulation_prediction()
        test_simulation_run()
        
        print("\n✅ All tests completed successfully!")
        
    except requests.exceptions.ConnectionError:
        print("\n❌ Connection failed! Make sure the backend server is running.")
        print("Run: conda activate space_env && cd National_space_hackathon/backend && python -m app.main")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")

if __name__ == "__main__":
    main()
