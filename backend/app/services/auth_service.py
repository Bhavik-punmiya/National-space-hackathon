# /app/services/auth_service.py
from sqlalchemy.orm import Session
from app.models_db import User, UserRole
from app.models_api import UserCreate, UserUpdate, LoginRequest, LoginResponse
from app.services.logging_service import create_user_activity_log
from app.models_db import LogActionType
from datetime import datetime, timezone
import hashlib
import secrets
import jwt
from typing import Optional, Dict, Any
import os

# JWT configuration
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRY_HOURS = 24

class AuthService:
    """Service for handling user authentication and authorization."""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using SHA-256."""
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        """Verify a password against its hash."""
        return AuthService.hash_password(password) == hashed
    
    @staticmethod
    def generate_token(user_id: str, role: UserRole) -> str:
        """Generate a JWT token for a user."""
        payload = {
            'user_id': user_id,
            'role': role.value,
            'exp': datetime.now(timezone.utc).timestamp() + (JWT_EXPIRY_HOURS * 3600)
        }
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    @staticmethod
    def verify_token(token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode a JWT token."""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> User:
        """Create a new user in the database."""
        # Check if user already exists
        existing_user = db.query(User).filter(
            (User.user_id == user_data.user_id) | 
            (User.username == user_data.username)
        ).first()
        
        if existing_user:
            raise ValueError("User ID or username already exists")
        
        # Hash the password
        hashed_password = AuthService.hash_password(user_data.password)
        
        # Create user object
        user = User(
            user_id=user_data.user_id,
            username=user_data.username,
            password_hash=hashed_password,
            role=user_data.role,
            full_name=user_data.full_name,
            email=user_data.email,
            created_at=datetime.now(timezone.utc),
            is_active=True
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Log user creation
        create_user_activity_log(
            db=db,
            user_id=user_data.user_id,
            action_type=LogActionType.IMPORT,  # Using IMPORT as closest match
            details={
                'action': 'user_created',
                'role': user_data.role.value,
                'created_by': 'system'
            }
        )
        
        return user
    
    @staticmethod
    def authenticate_user(db: Session, login_data: LoginRequest) -> Optional[User]:
        """Authenticate a user with username and password."""
        user = db.query(User).filter(User.username == login_data.username).first()
        
        if not user:
            return None
        
        if not AuthService.verify_password(login_data.password, user.password_hash):
            return None
        
        if not user.is_active:
            return None
        
        return user
    
    @staticmethod
    def login_user(db: Session, login_data: LoginRequest) -> LoginResponse:
        """Handle user login and return response with token."""
        user = AuthService.authenticate_user(db, login_data)
        
        if not user:
            return LoginResponse(
                success=False,
                message="Invalid username or password"
            )
        
        # Update last login
        user.last_login = datetime.now(timezone.utc)
        db.commit()
        
        # Generate token
        token = AuthService.generate_token(user.user_id, user.role)
        
        # Log successful login
        create_user_activity_log(
            db=db,
            user_id=user.user_id,
            action_type=LogActionType.IMPORT,  # Using IMPORT as closest match
            details={
                'action': 'user_login',
                'client_info': {
                    'timestamp': datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return LoginResponse(
            success=True,
            user=user,
            token=token,
            message="Login successful"
        )
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
        """Get a user by their user ID."""
        return db.query(User).filter(User.user_id == user_id).first()
    
    @staticmethod
    def get_user_by_username(db: Session, username: str) -> Optional[User]:
        """Get a user by their username."""
        return db.query(User).filter(User.username == username).first()
    
    @staticmethod
    def update_user(db: Session, user_id: str, update_data: UserUpdate) -> Optional[User]:
        """Update user information."""
        user = db.query(User).filter(User.user_id == user_id).first()
        
        if not user:
            return None
        
        # Update fields if provided
        if update_data.username is not None:
            # Check if username is already taken by another user
            existing = db.query(User).filter(
                User.username == update_data.username,
                User.user_id != user_id
            ).first()
            if existing:
                raise ValueError("Username already taken")
            user.username = update_data.username
        
        if update_data.role is not None:
            user.role = update_data.role
        
        if update_data.full_name is not None:
            user.full_name = update_data.full_name
        
        if update_data.email is not None:
            user.email = update_data.email
        
        if update_data.is_active is not None:
            user.is_active = update_data.is_active
        
        db.commit()
        db.refresh(user)
        
        # Log user update
        create_user_activity_log(
            db=db,
            user_id=user_id,
            action_type=LogActionType.IMPORT,  # Using IMPORT as closest match
            details={
                'action': 'user_updated',
                'updated_fields': [k for k, v in update_data.dict().items() if v is not None]
            }
        )
        
        return user
    
    @staticmethod
    def deactivate_user(db: Session, user_id: str) -> bool:
        """Deactivate a user account."""
        user = db.query(User).filter(User.user_id == user_id).first()
        
        if not user:
            return False
        
        user.is_active = False
        db.commit()
        
        # Log user deactivation
        create_user_activity_log(
            db=db,
            user_id=user_id,
            action_type=LogActionType.IMPORT,  # Using IMPORT as closest match
            details={
                'action': 'user_deactivated',
                'deactivated_by': 'system'
            }
        )
        
        return True
    
    @staticmethod
    def change_password(db: Session, user_id: str, old_password: str, new_password: str) -> bool:
        """Change a user's password."""
        user = db.query(User).filter(User.user_id == user_id).first()
        
        if not user:
            return False
        
        # Verify old password
        if not AuthService.verify_password(old_password, user.password_hash):
            return False
        
        # Hash and set new password
        new_hashed_password = AuthService.hash_password(new_password)
        user.password_hash = new_hashed_password
        
        db.commit()
        
        # Log password change
        create_user_activity_log(
            db=db,
            user_id=user_id,
            action_type=LogActionType.IMPORT,  # Using IMPORT as closest match
            details={
                'action': 'password_changed',
                'changed_at': datetime.now(timezone.utc).isoformat()
            }
        )
        
        return True
    
    @staticmethod
    def get_users_by_role(db: Session, role: UserRole) -> list[User]:
        """Get all users with a specific role."""
        return db.query(User).filter(User.role == role, User.is_active == True).all()
    
    @staticmethod
    def get_active_users(db: Session) -> list[User]:
        """Get all active users."""
        return db.query(User).filter(User.is_active == True).all()
    
    @staticmethod
    def validate_user_permission(user: User, required_role: UserRole) -> bool:
        """Check if a user has the required role for an action."""
        role_hierarchy = {
            UserRole.GUEST: 0,
            UserRole.ASTRONAUT: 1,
            UserRole.OFFICER: 2,
            UserRole.ADMIN: 3
        }
        
        user_level = role_hierarchy.get(user.role, 0)
        required_level = role_hierarchy.get(required_role, 0)
        
        return user_level >= required_level

# Convenience functions for backward compatibility
def create_user(db: Session, user_data: UserCreate) -> User:
    """Convenience function to create a user."""
    return AuthService.create_user(db, user_data)

def login_user(db: Session, login_data: LoginRequest) -> LoginResponse:
    """Convenience function to login a user."""
    return AuthService.login_user(db, login_data)

def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    """Convenience function to get a user by ID."""
    return AuthService.get_user_by_id(db, user_id)

def validate_user_permission(user: User, required_role: UserRole) -> bool:
    """Convenience function to validate user permissions."""
    return AuthService.validate_user_permission(user, required_role)
