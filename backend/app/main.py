from flask import Flask, jsonify
from flask_cors import CORS  # Import CORS
from .database import init_db, db_session
from .config import Config

# Import blueprints
from .routes.placement import placement_bp, client_placement_bp
from .routes.get_placement_frontend import client_placement_bp_frontend
from .routes.search_retrieve import search_retrieve_bp
from .routes.waste import waste_bp
from .routes.simulation import sim_bp
from .routes.import_export import import_export_bp
from .routes.logs import logs_bp
from .routes.client_waste import client_waste_bp
from .routes.client_simulation import client_sim_bp
from .routes.client_search_retrieve import client_search_retrieve_bp
from .routes.search_frontend import search_frontend_bp
from app.routes.client_tables import tables_bp
from app.routes.agent import agent_bp
import os
import json


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Enable CORS for all routes and origins
    CORS(app)  # Apply CORS to the entire app

    # Register Blueprints
    app.register_blueprint(placement_bp)
    app.register_blueprint(client_placement_bp)
    app.register_blueprint(client_placement_bp_frontend)
    app.register_blueprint(search_retrieve_bp)
    app.register_blueprint(waste_bp)
    app.register_blueprint(sim_bp)
    app.register_blueprint(import_export_bp)
    app.register_blueprint(logs_bp)
    app.register_blueprint(client_waste_bp)
    app.register_blueprint(client_sim_bp)
    app.register_blueprint(client_search_retrieve_bp)
    app.register_blueprint(tables_bp)
    app.register_blueprint(search_frontend_bp)
    app.register_blueprint(agent_bp)

    # Initialize the database with updated models
    init_db()

    # Optional: Add a command to initialize the database
    @app.cli.command("init-db")
    def init_db_command():
        """Clear existing data and create new tables."""
        init_db()
        print("Initialized the database with updated models.")

    # Teardown context to remove database session after each request
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db_session.remove()
        # print("DB Session removed.") # For debugging

    # Simple root endpoint
    @app.route('/')
    def index():
        return jsonify({"message": "Cargo Management API Operational - Updated for new dataset structure"})
    
    @app.route('/api/client/iss_cargo', methods=['GET'])
    def iss_cargo():
        """Endpoint for ISS Cargo Management API"""
        # Path to the JSON file
        json_file_path = os.path.join(os.getcwd(), 'generate-dataset', 'iss_data.json')

        try:
            # Read the JSON file
            with open(json_file_path, 'r') as file:
                data = json.load(file)
            return jsonify(data)
        except FileNotFoundError:
            return jsonify({"error": "File not found"}), 404
        except json.JSONDecodeError:
            return jsonify({"error": "Error decoding JSON file"}), 500
        
        

    return app

# This block allows running the app directly using `python main.py`
if __name__ == '__main__':
    app = create_app()
    # Make sure the server listens on 0.0.0.0 to be accessible from outside the Docker container
    # Use debug=True only for development, set to False in production
    app.run(host='0.0.0.0', port=8000, debug=True)