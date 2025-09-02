import base64
import json
import requests
from typing import Optional, Dict, Any, List
from app.agent.models.agent_models import VoiceQueryRequest, VoiceQueryResponse, AgentQueryResponse

class VoiceService:
    """Service for handling voice queries and responses"""
    
    def __init__(self, ollama_url: str = "http://localhost:11434"):
        self.ollama_url = ollama_url
        self.model_name = "llama3.1:latest"
    
    def format_response_with_llm(self, api_response: dict, user_query: str, conversation_context: List[Dict[str, Any]] = None) -> str:
        """Use LLM to format API response into natural speech"""
        try:
            # Prepare context for LLM
            context_parts = []
            
            # Add conversation history if available
            if conversation_context:
                context_parts.append("Previous conversation:")
                for entry in conversation_context[-3:]:  # Last 3 exchanges
                    context_parts.append(f"User: {entry.get('user', '')}")
                    context_parts.append(f"Assistant: {entry.get('assistant', '')}")
            
            # Add current query and response
            context_parts.append(f"\nCurrent user query: {user_query}")
            context_parts.append(f"API response data: {json.dumps(api_response, indent=2)}")
            
            # Create LLM prompt
            llm_prompt = f"""
You are a helpful voice assistant for a space station inventory management system. Your task is to convert the API response data into a natural, conversational response that would be spoken to the user.

Context:
{chr(10).join(context_parts)}

Instructions:
1. Create a natural, conversational response that flows well when spoken
2. Use proper spacing and natural language (e.g., "protein bars" instead of "protein_bars")
3. Include specific location details when available (e.g., "in Sanitation Bay, Module 3, container SB001")
4. Keep responses concise but informative
5. Use a friendly, helpful tone
6. If there are multiple items, mention the most important ones first
7. Include container IDs and zone information when relevant
8. Make the response sound natural when spoken aloud
9. If the API response indicates success=False, provide a helpful error message

Please provide a natural speech response:
"""
            
            # Query Ollama
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.model_name,
                    "prompt": llm_prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "max_tokens": 300
                    }
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                formatted_response = result.get("response", "").strip()
                
                # Clean up the response
                formatted_response = formatted_response.replace("```", "").replace("**", "").strip()
                
                return formatted_response
            else:
                print(f"LLM API Error: {response.status_code}")
                return "I'm sorry, I couldn't format the response properly. Please try again."
                
        except Exception as e:
            print(f"Error formatting with LLM: {e}")
            return "I'm sorry, there was an error processing your request. Please try again."
    
    def process_voice_query(self, request: VoiceQueryRequest) -> VoiceQueryResponse:
        """Process voice query and return response"""
        try:
            # For now, return a simple response
            # In a real implementation, this would handle speech-to-text and text-to-speech
            
            query_response = AgentQueryResponse(
                success=True,
                query_type="voice_query",
                response_data={"message": "Voice query processed"},
                message="Voice query processed successfully"
            )
            
            return VoiceQueryResponse(
                success=True,
                transcribed_text="Voice query",
                query_response=query_response,
                message="Voice query processed successfully"
            )
            
        except Exception as e:
            return VoiceQueryResponse(
                success=False,
                transcribed_text="",
                query_response=AgentQueryResponse(
                    success=False,
                    query_type="voice_query",
                    response_data={"error": str(e)},
                    message=f"Error processing voice query: {str(e)}"
                ),
                message=f"Error processing voice query: {str(e)}"
            )
    
    def check_ollama_status(self) -> Dict[str, Any]:
        """Check if Ollama is running and available"""
        try:
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            if response.status_code == 200:
                return {
                    "status": "running",
                    "models_available": len(response.json().get("models", [])),
                    "url": self.ollama_url
                }
            else:
                return {
                    "status": "error",
                    "error": f"HTTP {response.status_code}",
                    "url": self.ollama_url
                }
        except requests.exceptions.ConnectionError:
            return {
                "status": "not_available",
                "error": "Connection failed",
                "url": self.ollama_url
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "url": self.ollama_url
            }
    
    def get_available_models(self) -> List[Dict[str, Any]]:
        """Get list of available Ollama models"""
        try:
            response = requests.get(f"{self.ollama_url}/api/tags", timeout=5)
            if response.status_code == 200:
                models_data = response.json().get("models", [])
                return [
                    {
                        "name": model.get("name", "Unknown"),
                        "size": model.get("size", 0),
                        "modified_at": model.get("modified_at", ""),
                        "digest": model.get("digest", "")
                    }
                    for model in models_data
                ]
            else:
                return []
        except Exception as e:
            return []
