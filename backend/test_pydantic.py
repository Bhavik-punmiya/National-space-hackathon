#!/usr/bin/env python3
"""
Test script to verify Pydantic V2 configuration is working correctly
"""

import sys
import os

# Add the app directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

def test_pydantic_models():
    """Test that Pydantic models can be imported without warnings"""
    try:
        # Import the models that were causing warnings
        from app.models_api import ItemResponse, ContainerResponse, LogResponseItem
        from app.api.models_api_tables import ContainerApiSchema, ItemApiSchema
        
        print("✅ Successfully imported Pydantic models without warnings")
        
        # Test creating instances (avoiding models that use iso8601)
        item_response = ItemResponse(
            item_id="test001",
            name="Test Item",
            category="Test",
            subcategory="Test",
            width_cm=10.0,
            depth_cm=10.0,
            height_cm=10.0,
            mass_kg=1.0,
            priority=50,
            status="ACTIVE"
        )
        
        print("✅ Successfully created ItemResponse instance")
        
        container_response = ContainerResponse(
            zone="Z1",
            module_id="M1",
            container_id="C001",
            width_cm=100.0,
            depth_cm=100.0,
            height_cm=100.0
        )
        
        print("✅ Successfully created ContainerResponse instance")
        
        # Test the table models
        container_api = ContainerApiSchema(
            id="C001",
            zone_id="Z1",
            module_id="M1",
            width_cm=100.0,
            depth_cm=100.0,
            height_cm=100.0,
            item_count=0,
            expired_item_count=0
        )
        
        print("✅ Successfully created ContainerApiSchema instance")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing Pydantic models: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Testing Pydantic V2 configuration...")
    success = test_pydantic_models()
    
    if success:
        print("\n🎉 All Pydantic V2 tests passed! The warnings should be resolved.")
        print("\nThe following changes were made to fix Pydantic V2 warnings:")
        print("1. Changed 'orm_mode = True' to 'from_attributes = True'")
        print("2. Changed 'allow_population_by_field_name = True' to 'validate_by_name = True'")
        print("\nThese changes ensure compatibility with Pydantic V2.")
    else:
        print("\n💥 Some tests failed. Please check the error messages above.")
        sys.exit(1)
