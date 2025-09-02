# /app/services/rearrangement_service.py
"""
Enhanced Rearrangement Service
=============================

This service provides advanced rearrangement functionality including:
- Strategic displacement algorithms
- Priority-based rearrangement optimization
- Analytics and reporting for rearrangement patterns
- User activity tracking for rearrangements
"""

from sqlalchemy.orm import Session
from app.models_db import Item, Container, Placement, Log, LogActionType, User
from app.models_api import ItemCreate, ContainerCreate, RearrangementStep, Position, Coordinates
from app.services.logging_service import create_log_entry, create_user_activity_log
from app.services.placement_utils import PlacementUtils
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple, Set
import uuid

class RearrangementService:
    """Service for handling complex rearrangement operations."""
    
    @staticmethod
    def analyze_displacement_candidates(
        db: Session,
        container_id: str,
        target_priority: int,
        user_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Analyze which items in a container could be displaced for higher priority items.
        
        Args:
            db: Database session
            container_id: Container to analyze
            target_priority: Priority threshold for displacement
            user_id: User performing the analysis
            
        Returns:
            List of displacement candidate information
        """
        # Get all items in the container
        placements = db.query(Placement).filter(Placement.container_id_fk == container_id).all()
        candidates = []
        
        for placement in placements:
            item = db.query(Item).filter(Item.item_id == placement.item_id_fk).first()
            if item and item.priority < target_priority:
                candidate_info = {
                    'item_id': item.item_id,
                    'item_name': item.name,
                    'priority': item.priority,
                    'mass_kg': item.mass_kg,
                    'category': item.category,
                    'status': item.status.value,
                    'temp_requirement': item.temp_requirement.value if item.temp_requirement else 'AMBIENT',
                    'hazardous_class': item.hazardous_class.value if item.hazardous_class else 'NONE',
                    'current_uses': item.current_uses,
                    'maximum_uses': item.maximum_uses,
                    'position': {
                        'start': {'w': placement.start_w, 'd': placement.start_d, 'h': placement.start_h},
                        'end': {'w': placement.end_w, 'd': placement.end_d, 'h': placement.end_h}
                    },
                    'displacement_score': RearrangementService._calculate_displacement_score(item)
                }
                candidates.append(candidate_info)
        
        # Sort by displacement score (easiest to displace first)
        candidates.sort(key=lambda x: x['displacement_score'])
        
        # Log the analysis
        if user_id:
            create_user_activity_log(
                db=db,
                user_id=user_id,
                action_type=LogActionType.SIMULATION_USE,
                container_id=container_id,
                details={
                    'action': 'displacement_analysis',
                    'target_priority': target_priority,
                    'candidates_found': len(candidates),
                    'container_id': container_id
                }
            )
        
        return candidates
    
    @staticmethod
    def _calculate_displacement_score(item: Item) -> float:
        """
        Calculate a displacement score for an item.
        Lower scores indicate easier displacement.
        """
        score = 0.0
        
        # Priority factor (lower priority = easier to displace)
        score += (100 - item.priority) * 0.5
        
        # Usage factor (less used items are easier to displace)
        if item.maximum_uses and item.current_uses:
            usage_ratio = item.current_uses / item.maximum_uses
            score += (1 - usage_ratio) * 20
        
        # Mass factor (lighter items are easier to move)
        score += max(0, 10 - item.mass_kg) * 0.1
        
        # Hazardous materials are harder to displace
        if item.hazardous_class.value != 'NONE':
            score -= 15
        
        # Temperature sensitive items are harder to displace
        if item.temp_requirement.value in ['COLD', 'WARM']:
            score -= 10
        
        return score
    
    @staticmethod
    def suggest_rearrangement_strategy(
        db: Session,
        high_priority_item: ItemCreate,
        preferred_containers: List[str],
        user_id: Optional[str] = None
    ) -> Dict:
        """
        Suggest the best rearrangement strategy for placing a high priority item.
        
        Args:
            db: Database session
            high_priority_item: Item that needs placement
            preferred_containers: List of preferred container IDs
            user_id: User requesting the strategy
            
        Returns:
            Dictionary containing strategy recommendations
        """
        strategies = []
        
        for container_id in preferred_containers:
            container = db.query(Container).filter(Container.container_id == container_id).first()
            if not container:
                continue
            
            # Analyze displacement candidates
            candidates = RearrangementService.analyze_displacement_candidates(
                db, container_id, high_priority_item.priority, user_id
            )
            
            if not candidates:
                continue
            
            # Calculate container utilization
            utilization = PlacementUtils.get_container_utilization(db, container_id)
            
            # Estimate space needed
            item_volume = PlacementUtils.calculate_item_volume(high_priority_item)
            container_volume = PlacementUtils.calculate_container_volume(container)
            
            strategy = {
                'container_id': container_id,
                'container_name': container.name,
                'zone': container.zone,
                'current_utilization': utilization.get('utilization_percentage', 0),
                'displacement_candidates': candidates[:5],  # Top 5 easiest to displace
                'estimated_displacements_needed': len([c for c in candidates if c['displacement_score'] < 50]),
                'space_analysis': {
                    'item_volume': item_volume,
                    'container_volume': container_volume,
                    'available_volume': utilization.get('available_volume', 0)
                },
                'difficulty_score': RearrangementService._calculate_strategy_difficulty(
                    candidates, utilization, high_priority_item
                )
            }
            
            strategies.append(strategy)
        
        # Sort strategies by difficulty (easiest first)
        strategies.sort(key=lambda x: x['difficulty_score'])
        
        result = {
            'high_priority_item': {
                'item_id': high_priority_item.item_id,
                'priority': high_priority_item.priority,
                'category': high_priority_item.category
            },
            'recommended_strategies': strategies,
            'analysis_timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        # Log the strategy analysis
        if user_id:
            create_user_activity_log(
                db=db,
                user_id=user_id,
                action_type=LogActionType.SIMULATION_USE,
                item_id=high_priority_item.item_id,
                details={
                    'action': 'rearrangement_strategy_analysis',
                    'strategies_found': len(strategies),
                    'preferred_containers': preferred_containers,
                    'best_strategy_container': strategies[0]['container_id'] if strategies else None
                }
            )
        
        return result
    
    @staticmethod
    def _calculate_strategy_difficulty(
        candidates: List[Dict],
        utilization: Dict,
        target_item: ItemCreate
    ) -> float:
        """Calculate difficulty score for a rearrangement strategy."""
        difficulty = 0.0
        
        # More candidates needed = higher difficulty
        difficulty += len(candidates) * 5
        
        # Higher utilization = higher difficulty
        difficulty += utilization.get('utilization_percentage', 0) * 0.3
        
        # Average displacement score of candidates
        if candidates:
            avg_displacement_score = sum(c['displacement_score'] for c in candidates) / len(candidates)
            difficulty += (100 - avg_displacement_score) * 0.2
        
        # Target item complexity
        if hasattr(target_item, 'hazardous_class') and target_item.hazardous_class.value != 'NONE':
            difficulty += 15
        
        if hasattr(target_item, 'temp_requirement') and target_item.temp_requirement.value != 'AMBIENT':
            difficulty += 10
        
        return difficulty
    
    @staticmethod
    def execute_rearrangement_plan(
        db: Session,
        rearrangement_steps: List[RearrangementStep],
        user_id: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> Dict:
        """
        Execute a planned rearrangement with full logging and validation.
        
        Args:
            db: Database session
            rearrangement_steps: List of rearrangement steps to execute
            user_id: User executing the rearrangement
            session_id: Session ID for grouping related actions
            
        Returns:
            Execution results and statistics
        """
        if not session_id:
            session_id = str(uuid.uuid4())
        
        execution_start = datetime.now(timezone.utc)
        successful_steps = 0
        failed_steps = 0
        errors = []
        
        for step in rearrangement_steps:
            try:
                # Validate step
                item = db.query(Item).filter(Item.item_id == step.item_id).first()
                if not item:
                    raise ValueError(f"Item {step.item_id} not found")
                
                from_container = db.query(Container).filter(Container.container_id == step.fromContainer).first()
                to_container = db.query(Container).filter(Container.container_id == step.toContainer).first()
                
                if not from_container or not to_container:
                    raise ValueError(f"Container not found: {step.fromContainer} or {step.toContainer}")
                
                # Update placement
                placement = db.query(Placement).filter(Placement.item_id_fk == step.item_id).first()
                if placement:
                    placement.container_id_fk = step.toContainer
                    placement.start_w = step.toPosition.startCoordinates.width
                    placement.start_d = step.toPosition.startCoordinates.depth
                    placement.start_h = step.toPosition.startCoordinates.height
                    placement.end_w = step.toPosition.endCoordinates.width
                    placement.end_d = step.toPosition.endCoordinates.depth
                    placement.end_h = step.toPosition.endCoordinates.height
                    db.add(placement)
                
                # Update item location
                item.current_location = step.toContainer
                db.add(item)
                
                # Log the rearrangement step
                create_log_entry(
                    db=db,
                    action_type=LogActionType.REARRANGEMENT,
                    user_id=user_id,
                    item_id=step.item_id,
                    container_id=step.fromContainer,
                    session_id=session_id,
                    details={
                        'step_number': step.step,
                        'action': step.action,
                        'from_container': step.fromContainer,
                        'to_container': step.toContainer,
                        'from_position': step.fromPosition.dict() if step.fromPosition else None,
                        'to_position': step.toPosition.dict() if step.toPosition else None
                    },
                    before_state={'container_id': step.fromContainer},
                    after_state={'container_id': step.toContainer},
                    action_category='rearrangement',
                    location=to_container.zone,
                    success=True
                )
                
                successful_steps += 1
                
            except Exception as e:
                failed_steps += 1
                error_msg = f"Step {step.step} failed: {str(e)}"
                errors.append(error_msg)
                
                # Log the failure
                create_log_entry(
                    db=db,
                    action_type=LogActionType.REARRANGEMENT,
                    user_id=user_id,
                    item_id=step.item_id,
                    session_id=session_id,
                    details={
                        'step_number': step.step,
                        'action': step.action,
                        'from_container': step.fromContainer,
                        'to_container': step.toContainer
                    },
                    action_category='rearrangement',
                    success=False,
                    error_message=error_msg
                )
        
        execution_end = datetime.now(timezone.utc)
        execution_duration = (execution_end - execution_start).total_seconds() * 1000  # milliseconds
        
        # Commit if all successful, rollback if any failures
        if failed_steps == 0:
            db.commit()
        else:
            db.rollback()
            raise Exception(f"Rearrangement failed: {failed_steps} steps failed")
        
        # Log the overall rearrangement session
        create_log_entry(
            db=db,
            action_type=LogActionType.REARRANGEMENT,
            user_id=user_id,
            session_id=session_id,
            details={
                'action': 'rearrangement_session_completed',
                'total_steps': len(rearrangement_steps),
                'successful_steps': successful_steps,
                'failed_steps': failed_steps,
                'errors': errors
            },
            action_category='rearrangement',
            execution_duration_ms=int(execution_duration),
            success=failed_steps == 0
        )
        
        return {
            'session_id': session_id,
            'total_steps': len(rearrangement_steps),
            'successful_steps': successful_steps,
            'failed_steps': failed_steps,
            'execution_duration_ms': execution_duration,
            'errors': errors,
            'success': failed_steps == 0
        }
    
    @staticmethod
    def get_rearrangement_history(
        db: Session,
        user_id: Optional[str] = None,
        item_id: Optional[str] = None,
        container_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """Get historical rearrangement data for analytics."""
        query = db.query(Log).filter(
            Log.action_type == LogActionType.REARRANGEMENT
        )
        
        if user_id:
            query = query.filter(Log.user_id_fk == user_id)
        if item_id:
            query = query.filter(Log.item_id_fk == item_id)
        if container_id:
            query = query.filter(Log.container_id_fk == container_id)
        
        logs = query.order_by(Log.timestamp.desc()).limit(limit).all()
        
        history = []
        for log in logs:
            entry = {
                'timestamp': log.timestamp.isoformat(),
                'user_id': log.user_id_fk,
                'item_id': log.item_id_fk,
                'container_id': log.container_id_fk,
                'session_id': log.session_id,
                'success': log.success,
                'details': log.details_json,
                'execution_duration_ms': log.execution_duration_ms
            }
            history.append(entry)
        
        return history

# Convenience functions
def analyze_displacement_candidates(
    db: Session,
    container_id: str,
    target_priority: int,
    user_id: Optional[str] = None
) -> List[Dict]:
    """Convenience function for displacement analysis."""
    return RearrangementService.analyze_displacement_candidates(
        db, container_id, target_priority, user_id
    )

def suggest_rearrangement_strategy(
    db: Session,
    high_priority_item: ItemCreate,
    preferred_containers: List[str],
    user_id: Optional[str] = None
) -> Dict:
    """Convenience function for strategy suggestions."""
    return RearrangementService.suggest_rearrangement_strategy(
        db, high_priority_item, preferred_containers, user_id
    )

def execute_rearrangement_plan(
    db: Session,
    rearrangement_steps: List[RearrangementStep],
    user_id: Optional[str] = None,
    session_id: Optional[str] = None
) -> Dict:
    """Convenience function for executing rearrangement plans."""
    return RearrangementService.execute_rearrangement_plan(
        db, rearrangement_steps, user_id, session_id
    )
