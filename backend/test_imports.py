#!/usr/bin/env python3

# Test file to check if all imports work correctly

try:
    print("Testing imports...")
    
    # Test database models
    print("1. Testing database models...")
    from app.models_db import Item, Container, Placement, Log
    print("   ✅ Database models imported successfully")
    
    # Test API models
    print("2. Testing API models...")
    from app.models_api import SimulationRequest, SimulationResponse
    print("   ✅ API models imported successfully")
    
    # Test frontend API models
    print("3. Testing frontend API models...")
    from app.api.models_api_frontend import ItemFrontendResponse, ContainerFrontendResponse
    print("   ✅ Frontend API models imported successfully")
    
    # Test services
    print("4. Testing services...")
    from app.services.simulation_service import simulate_time_passage
    from app.services.search_service_frontend import search_items_frontend, search_containers_frontend
    print("   ✅ Services imported successfully")
    
    # Test routes
    print("5. Testing routes...")
    from app.routes.simulation import sim_bp
    from app.routes.search_frontend import search_frontend_bp
    print("   ✅ Routes imported successfully")
    
    # Test main app
    print("6. Testing main app...")
    from app.main import create_app
    print("   ✅ Main app imported successfully")
    
    print("\n🎉 All imports successful! The server should start without issues.")
    
except Exception as e:
    print(f"\n❌ Import failed: {e}")
    import traceback
    traceback.print_exc()
