import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from app.agent.models.agent_models import ConversationContext

class ContextService:
    """Service for managing conversation context and history"""
    
    def __init__(self, max_context_length: int = 20, max_session_age_hours: int = 24):
        self.max_context_length = max_context_length
        self.max_session_age_hours = max_session_age_hours
        self.sessions: Dict[str, ConversationContext] = {}
    
    def get_or_create_session(self, session_id: str, user_id: Optional[str] = None) -> ConversationContext:
        """Get existing session or create a new one"""
        if session_id in self.sessions:
            session = self.sessions[session_id]
            # Check if session is too old
            if datetime.utcnow() - session.last_updated > timedelta(hours=self.max_session_age_hours):
                # Create new session
                session = ConversationContext(
                    session_id=session_id,
                    user_id=user_id,
                    max_context_length=self.max_context_length
                )
                self.sessions[session_id] = session
            else:
                # Update last accessed time
                session.last_updated = datetime.utcnow()
        else:
            # Create new session
            session = ConversationContext(
                session_id=session_id,
                user_id=user_id,
                max_context_length=self.max_context_length
            )
            self.sessions[session_id] = session
        
        return session
    
    def add_message(self, session_id: str, role: str, content: str, metadata: Optional[Dict[str, Any]] = None) -> ConversationContext:
        """Add a message to the conversation context"""
        session = self.get_or_create_session(session_id)
        
        message = {
            "role": role,  # "user", "assistant", "system"
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": metadata or {}
        }
        
        session.messages.append(message)
        
        # Maintain max context length
        if len(session.messages) > self.max_context_length:
            session.messages = session.messages[-self.max_context_length:]
        
        session.last_updated = datetime.utcnow()
        return session
    
    def get_context_summary(self, session_id: str) -> str:
        """Get a summary of the conversation context for AI processing"""
        session = self.get_or_create_session(session_id)
        
        if not session.messages:
            return ""
        
        # Create a summary of recent messages
        summary_parts = []
        for msg in session.messages[-10:]:  # Last 10 messages
            role = msg["role"]
            content = msg["content"]
            summary_parts.append(f"{role}: {content}")
        
        return "\n".join(summary_parts)
    
    def get_recent_messages(self, session_id: str, count: int = 5) -> List[Dict[str, Any]]:
        """Get recent messages from the session"""
        session = self.get_or_create_session(session_id)
        return session.messages[-count:] if session.messages else []
    
    def clear_session(self, session_id: str) -> bool:
        """Clear a session's context"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False
    
    def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a session"""
        if session_id not in self.sessions:
            return None
        
        session = self.sessions[session_id]
        return {
            "session_id": session.session_id,
            "user_id": session.user_id,
            "message_count": len(session.messages),
            "last_updated": session.last_updated.isoformat(),
            "max_context_length": session.max_context_length
        }
    
    def get_all_sessions(self) -> List[Dict[str, Any]]:
        """Get information about all active sessions"""
        sessions_info = []
        for session_id, session in self.sessions.items():
            sessions_info.append(self.get_session_info(session_id))
        return sessions_info
    
    def cleanup_old_sessions(self) -> int:
        """Remove sessions that are too old"""
        current_time = datetime.utcnow()
        sessions_to_remove = []
        
        for session_id, session in self.sessions.items():
            if current_time - session.last_updated > timedelta(hours=self.max_session_age_hours):
                sessions_to_remove.append(session_id)
        
        for session_id in sessions_to_remove:
            del self.sessions[session_id]
        
        return len(sessions_to_remove)
