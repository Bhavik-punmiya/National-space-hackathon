# /app/routes/auth_routes.py
from flask import Blueprint, request, jsonify
from app.database import get_db
from app.services.auth_service import AuthService
from app.models_api import UserCreate, LoginRequest
from app.models_db import UserRole, User
from pydantic import ValidationError
import uuid

auth_bp = Blueprint('auth_bp', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    """Handle user login."""
    db_gen = get_db()
    db = next(db_gen)
    try:
        try:
            login_data = LoginRequest(**request.get_json())
        except ValidationError as e:
            return jsonify({"success": False, "error": "Invalid request body", "details": e.errors()}), 400
        except Exception as e:
            return jsonify({"success": False, "error": f"Invalid request format: {e}"}), 400

        # Try to authenticate user
        response = AuthService.login_user(db, login_data)
        return jsonify(response.dict())

    except Exception as e:
        print(f"Error in login route: {e}")
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        next(db_gen, None)
        db.close()

@auth_bp.route('/create-test-user', methods=['POST'])
def create_test_user():
    """Create a test user if they don't exist."""
    db_gen = get_db()
    db = next(db_gen)
    try:
        try:
            data = request.get_json()
            username = data.get('username')
            password = data.get('password')
            
            if not username or not password:
                return jsonify({"success": False, "error": "Username and password are required"}), 400
                
        except Exception as e:
            return jsonify({"success": False, "error": f"Invalid request format: {e}"}), 400

        # Check if user already exists
        existing_user = db.query(User).filter(User.username == username).first()
        if existing_user:
            return jsonify({"success": False, "error": "User already exists"}), 400

        # Create test user data
        user_data = UserCreate(
            user_id=f"user_{uuid.uuid4().hex[:8]}",
            username=username,
            password=password,
            role=UserRole.ASTRONAUT,
            full_name=username.title(),
            email=f"{username}@space.station"
        )

        # Create user
        user = AuthService.create_user(db, user_data)
        
        # Return success response
        return jsonify({
            "success": True,
            "message": "Test user created successfully",
            "user": {
                "user_id": user.user_id,
                "username": user.username,
                "role": user.role.value,
                "full_name": user.full_name,
                "email": user.email
            }
        })

    except ValueError as ve:
        return jsonify({"success": False, "error": str(ve)}), 400
    except Exception as e:
        print(f"Error in create-test-user route: {e}")
        return jsonify({"success": False, "error": "An internal server error occurred."}), 500
    finally:
        next(db_gen, None)
        db.close()
