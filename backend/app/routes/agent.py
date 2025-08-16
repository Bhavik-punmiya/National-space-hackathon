from flask import Blueprint, request, jsonify
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.database import get_db
from app.agent.models.agent_models import (
    AgentQueryRequest, AgentQueryResponse, VoiceQueryRequest, VoiceQueryResponse
)
from app.agent.services.agent_service import AgentService
from app.agent.services.voice_service import VoiceService
from app.agent.services.context_service import ContextService

# Initialize services
agent_service = AgentService()
voice_service = VoiceService()
context_service = ContextService()

# Create blueprint
agent_bp = Blueprint('agent', __name__, url_prefix='/api/agent')

@agent_bp.route('/search', methods=['POST'])
def search():
    """Handle natural language queries"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        # Parse request
        query_request = AgentQueryRequest(**data)
        
        # Get database session
        db_gen = get_db()
        db = next(db_gen)
        try:
            # Process query
            response = agent_service.process_query(query_request, db)
        finally:
            next(db_gen, None)
            db.close()
        
        # Add to context if session_id provided
        if query_request.session_id:
            context_service.add_message(
                session_id=query_request.session_id,
                role="user",
                content=query_request.query,
                metadata={"query_type": response.query_type.value}
            )
            context_service.add_message(
                session_id=query_request.session_id,
                role="assistant",
                content=response.message,
                metadata={"response_data": response.response_data}
            )
        
        return jsonify(response.dict()), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@agent_bp.route('/voice', methods=['POST'])
def voice_query():
    """Handle voice queries with transcription and speech synthesis"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        # Parse request
        voice_request = VoiceQueryRequest(**data)
        
        # Generate session ID if not provided
        session_id = voice_request.session_id or str(uuid.uuid4())
        
        # Get context summary
        context_summary = context_service.get_context_summary(session_id)
        
        # Process voice query
        voice_result = voice_service.process_voice_query(
            voice_request.audio_data,
            context=context_summary
        )
        
        if not voice_result["success"]:
            return jsonify({"success": False, "error": voice_result["error"]}), 400
        
        # Get database session for agent processing
        db_gen = get_db()
        db = next(db_gen)
        try:
            # Create agent query request from transcribed text
            agent_request = AgentQueryRequest(
                query=voice_result["transcribed_text"],
                user_id=voice_request.user_id
            )
            
            # Process with agent service
            agent_response = agent_service.process_query(agent_request, db)
        finally:
            next(db_gen, None)
            db.close()
        
        # Add to context
        context_service.add_message(
            session_id=session_id,
            role="user",
            content=voice_result["transcribed_text"],
            metadata={"query_type": "voice"}
        )
        context_service.add_message(
            session_id=session_id,
            role="assistant",
            content=agent_response.message,
            metadata={"response_data": agent_response.response_data}
        )
        
        # Create response
        response = VoiceQueryResponse(
            success=True,
            transcribed_text=voice_result["transcribed_text"],
            query_response=agent_response,
            audio_response=voice_result.get("audio_response"),
            message="Voice query processed successfully"
        )
        
        return jsonify(response.dict()), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@agent_bp.route('/context/<session_id>', methods=['GET'])
def get_context(session_id):
    """Get conversation context for a session"""
    try:
        session_info = context_service.get_session_info(session_id)
        if not session_info:
            return jsonify({"success": False, "error": "Session not found"}), 404
        
        recent_messages = context_service.get_recent_messages(session_id, count=10)
        
        return jsonify({
            "success": True,
            "session_info": session_info,
            "recent_messages": recent_messages
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@agent_bp.route('/context/<session_id>', methods=['DELETE'])
def clear_context(session_id):
    """Clear conversation context for a session"""
    try:
        success = context_service.clear_session(session_id)
        if not success:
            return jsonify({"success": False, "error": "Session not found"}), 404
        
        return jsonify({"success": True, "message": "Context cleared successfully"}), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@agent_bp.route('/context', methods=['GET'])
def list_sessions():
    """List all active sessions"""
    try:
        sessions = context_service.get_all_sessions()
        return jsonify({
            "success": True,
            "sessions": sessions,
            "count": len(sessions)
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@agent_bp.route('/status', methods=['GET'])
def get_status():
    """Get status of agent services"""
    try:
        # Check Ollama status
        ollama_status = voice_service.check_ollama_status()
        
        # Get session count
        sessions = context_service.get_all_sessions()
        
        return jsonify({
            "success": True,
            "ollama_status": ollama_status,
            "active_sessions": len(sessions),
            "timestamp": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@agent_bp.route('/models', methods=['GET'])
def get_models():
    """Get available Ollama models"""
    try:
        models = voice_service.get_available_models()
        return jsonify({
            "success": True,
            "models": models
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@agent_bp.route('/cleanup', methods=['POST'])
def cleanup_sessions():
    """Clean up old sessions"""
    try:
        removed_count = context_service.cleanup_old_sessions()
        return jsonify({
            "success": True,
            "removed_sessions": removed_count,
            "message": f"Cleaned up {removed_count} old sessions"
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Health check endpoint
@agent_bp.route('/health', methods=['GET'])
def health_check():
    """Health check for agent services"""
    try:
        ollama_status = voice_service.check_ollama_status()
        
        return jsonify({
            "success": True,
            "status": "healthy",
            "ollama": ollama_status["status"],
            "timestamp": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 500
