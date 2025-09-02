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
from app.models_db import Item as DBItem, ItemStatus

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

@agent_bp.route('/fix-expired-status', methods=['POST'])
def fix_expired_status():
    """Fix expired item statuses by updating them to 'EXPIRED'"""
    try:
        # Get database session
        db_gen = get_db()
        db = next(db_gen)
        try:
            current_date = datetime.utcnow().date()
            updated_count = 0
            
            # Get all items with expiry dates
            items = db.query(DBItem).filter(
                DBItem.expiry_date.isnot(None),
                DBItem.expiry_date != "N/A"
            ).all()
            
            for item in items:
                try:
                    if item.expiry_date:
                        # Handle different date formats
                        expiry_date_str = str(item.expiry_date).strip()
                        
                        # Try different date formats
                        expiry_date = None
                        date_formats = [
                            "%Y-%m-%d",           # 2021-10-07
                            "%Y-%m-%dT%H:%M:%S",  # 2021-10-07T00:00:00
                            "%Y-%m-%dT%H:%M:%S.%fZ",  # 2021-10-07T00:00:00.000Z
                            "%Y-%m-%dT%H:%M:%SZ",     # 2021-10-07T00:00:00Z
                            "%d/%m/%Y",           # 07/10/2021
                            "%m/%d/%Y",           # 10/07/2021
                        ]
                        
                        for date_format in date_formats:
                            try:
                                if date_format.endswith('Z'):
                                    # Handle timezone format
                                    expiry_date = datetime.strptime(expiry_date_str, date_format).date()
                                else:
                                    expiry_date = datetime.strptime(expiry_date_str, date_format).date()
                                break
                            except ValueError:
                                continue
                        
                        # If item is expired and status is not already expired
                        if expiry_date and expiry_date < current_date and item.status.value != "WASTE_EXPIRED":
                            item.status = ItemStatus.WASTE_EXPIRED
                            updated_count += 1
                            
                except Exception as e:
                    print(f"Error processing item {item.item_id} expiry date: {e}")
                    continue
            
            # Commit changes
            db.commit()
            
            return jsonify({
                "success": True,
                "message": f"Updated {updated_count} expired items status to WASTE_EXPIRED",
                "updated_count": updated_count,
                "timestamp": datetime.utcnow().isoformat()
            }), 200
            
        finally:
            next(db_gen, None)
            db.close()
            
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }), 500
