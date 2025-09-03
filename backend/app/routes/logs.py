# /app/routes/logs.py
from typing import List, get_type_hints
from flask import Blueprint, request, jsonify
from app.database import get_db
from app.models_db import Log, User, Item # Import DB models for querying
from app.models_api import LogDetail, LogsResponse, LogResponseItem # Import response models
from sqlalchemy import desc, asc
from datetime import datetime
import json # To parse details_json
from datetime import datetime, timezone

logs_bp = Blueprint('logs_bp', __name__, url_prefix='/api/logs')

@logs_bp.route('', methods=['GET'])
def handle_get_logs():
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Query parameters
        start_date_str = request.args.get('startDate')
        end_date_str = request.args.get('endDate')
        item_id = request.args.get('itemId')
        user_id = request.args.get('userId')
        action_type = request.args.get('actionType')

        # Test database connection
        try:
            # Simple test query to ensure database is accessible
            test_query = db.query(Log).limit(1)
            test_query.all()
        except Exception as db_error:
            print(f"Database connection error: {db_error}")
            return jsonify({"error": "Database connection failed"}), 500

        query = db.query(Log)

        # Apply filters
        if start_date_str:
            try:
                # Parse date string (YYYY-MM-DD format)
                start_date = datetime.strptime(start_date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
                query = query.filter(Log.timestamp >= start_date)
            except ValueError:
                return jsonify({"error": f"Invalid startDate format: {start_date_str}. Use YYYY-MM-DD format."}), 400

        if end_date_str:
            try:
                # Parse date string (YYYY-MM-DD format) and set to end of day
                end_date = datetime.strptime(end_date_str, "%Y-%m-%d").replace(
                    hour=23, minute=59, second=59, microsecond=999999, tzinfo=timezone.utc
                )
                query = query.filter(Log.timestamp <= end_date)
            except ValueError:
                return jsonify({"error": f"Invalid endDate format: {end_date_str}. Use YYYY-MM-DD format."}), 400

        if item_id:
            query = query.filter(Log.item_id_fk == item_id)
        if user_id:
            query = query.filter(Log.user_id_fk == user_id)
        if action_type:
            query = query.filter(Log.action_type == action_type)

        # Get logs from DB
        logs_db = query.order_by(desc(Log.timestamp)).all()

        logs_response_items: List[LogResponseItem] = []
        for log in logs_db:
            try:
                details_dict = None
                if log.details_json:
                    try:
                        # Handle both string and dict types for details_json
                        if isinstance(log.details_json, str):
                            # Parse the JSON string
                            raw_details = json.loads(log.details_json)
                            details_dict = raw_details
                        elif isinstance(log.details_json, dict):
                            # Already a dictionary, use directly
                            details_dict = log.details_json
                        else:
                            # Convert to string representation
                            details_dict = {"raw_data": str(log.details_json)}
                    except (json.JSONDecodeError, Exception) as e:
                        print(f"Warning: Could not process details_json for log ID {log.log_id}: {e}")
                        details_dict = {"error": f"Failed to process details: {str(e)}"}

                # Get user name if available
                user_name = None
                if log.user_id_fk:
                    try:
                        user = db.query(User).filter(User.user_id == log.user_id_fk).first()
                        user_name = user.full_name or user.username if user else None
                    except Exception as user_error:
                        print(f"Warning: Could not get user info for {log.user_id_fk}: {user_error}")
                        user_name = None

                # Get item name if available
                item_name = None
                if log.item_id_fk:
                    try:
                        item = db.query(Item).filter(Item.item_id == log.item_id_fk).first()
                        item_name = item.name if item else None
                    except Exception as item_error:
                        print(f"Warning: Could not get item info for {log.item_id_fk}: {item_error}")
                        item_name = None

                # Create LogResponseItem
                logs_response_items.append(LogResponseItem(
                    log_id=log.log_id,
                    timestamp=log.timestamp,
                    user_id=log.user_id_fk,
                    session_id=log.session_id,
                    action_type=log.action_type.value,
                    action_category=log.action_category,
                    item_id=log.item_id_fk,
                    container_id=log.container_id_fk,
                    reservation_id=log.reservation_id_fk,
                    success=log.success,
                    error_message=log.error_message,
                    location=log.location,
                    details=details_dict,
                    user_name=user_name,
                    item_name=item_name
                ))
            except Exception as log_error:
                print(f"Warning: Could not process log {log.log_id if hasattr(log, 'log_id') else 'unknown'}: {log_error}")
                continue

        response_data = LogsResponse(logs=logs_response_items)
        return jsonify(response_data.dict())

    except Exception as e:
        import traceback
        print(f"Error in /api/logs route: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": f"An internal server error occurred: {str(e)}"}), 500
    finally:
        next(db_gen, None)
        db.close()