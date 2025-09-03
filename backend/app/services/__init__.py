# /app/services/__init__.py

# Import all services to make them available
from . import waste_service
from . import simulation_service
from . import logging_service
from . import placement_service
from . import retrieval_service

# Make specific functions available at package level
__all__ = [
    'waste_service',
    'simulation_service', 
    'logging_service',
    'placement_service',
    'retrieval_service'
]
