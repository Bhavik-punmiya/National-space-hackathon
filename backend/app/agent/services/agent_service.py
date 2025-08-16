import re
import json
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

from app.models_db import Item as DBItem, Container as DBContainer, Placement as DBPlacement, Log, LogActionType
from app.agent.models.agent_models import (
    AgentQueryRequest, AgentQueryResponse, AgentQueryType,
    CountResponse, ItemInfo, ContainerInfo, ZoneInfo,
    ExpiredItemsResponse, NearExpiryItemsResponse, TopUsedItemsResponse,
    ItemDetailsResponse, ContainerInventoryResponse, LocationResponse,
    CodeMeaningResponse, UsageTrackingResponse, ConversationContext
)

class AgentService:
    """Main service for handling AI agent queries"""
    
    def __init__(self):
        self.code_meanings = {
            "SB": {"meaning": "Sanitation Bay", "description": "Area for waste management and sanitation equipment"},
            "MB": {"meaning": "Medical Bay", "description": "Medical equipment and supplies storage"},
            "AB": {"meaning": "Airlock Bay", "description": "Airlock area for spacewalks and equipment transfer"},
            "M1": {"meaning": "Module 1", "description": "First module of the space station"},
            "M2": {"meaning": "Module 2", "description": "Second module of the space station"},
            "M3": {"meaning": "Module 3", "description": "Third module of the space station"},
        }
    
    def classify_query(self, query: str) -> Tuple[AgentQueryType, Dict[str, Any]]:
        """Classify the query type and extract parameters"""
        query_lower = query.lower()
        
        # Check for expired items first (high priority)
        if any(word in query_lower for word in ['expired', 'expiry', 'expiring', 'past due', 'out of date']):
            return AgentQueryType.EXPIRED_ITEMS, self._extract_parameters(query, AgentQueryType.EXPIRED_ITEMS)
        
        # Check for near expiry items
        elif any(word in query_lower for word in ['near', 'soon', 'going to expire', 'recently going']):
            return AgentQueryType.NEAR_EXPIRY_ITEMS, self._extract_parameters(query, AgentQueryType.NEAR_EXPIRY_ITEMS)
        
        # Check for location queries
        elif any(word in query_lower for word in ['where', 'location', 'find', 'locate']):
            return AgentQueryType.ITEM_LOCATION, self._extract_parameters(query, AgentQueryType.ITEM_LOCATION)
        
        # Check for count queries
        elif any(word in query_lower for word in ['how many', 'count', 'total', 'number']):
            if any(word in query_lower for word in ['container', 'containers']):
                return AgentQueryType.COUNT_CONTAINERS, self._extract_parameters(query, AgentQueryType.COUNT_CONTAINERS)
            elif any(word in query_lower for word in ['zone', 'zones']):
                return AgentQueryType.COUNT_ZONES, self._extract_parameters(query, AgentQueryType.COUNT_ZONES)
            elif any(word in query_lower for word in ['module', 'modules']):
                return AgentQueryType.COUNT_MODULES, self._extract_parameters(query, AgentQueryType.COUNT_MODULES)
            else:
                return AgentQueryType.COUNT_ITEMS, self._extract_parameters(query, AgentQueryType.COUNT_ITEMS)
        
        # Check for top used items
        elif any(word in query_lower for word in ['top', 'most used', 'frequently', 'popular']):
            return AgentQueryType.TOP_USED_ITEMS, self._extract_parameters(query, AgentQueryType.TOP_USED_ITEMS)
        
        # Default to count items
        return AgentQueryType.COUNT_ITEMS, self._extract_parameters(query, AgentQueryType.COUNT_ITEMS)
    
    def _extract_parameters(self, query: str, query_type: AgentQueryType) -> Dict[str, Any]:
        """Extract parameters from the query"""
        params = {}
        query_lower = query.lower()
        
        # Extract limit for top used/expiring items
        limit_match = re.search(r'top[:\s]+(\d+)', query_lower)
        if limit_match:
            params['limit'] = int(limit_match.group(1))
        
        # Extract days threshold for near expiry
        days_match = re.search(r'(\d+)[:\s]*days?', query_lower)
        if days_match:
            params['days_threshold'] = int(days_match.group(1))
        
        # Extract category
        category_match = re.search(r'(food|medical|equipment|supplies?|communication|research|experiment|space)', query_lower)
        if category_match:
            params['category'] = category_match.group(1).title()
        
        return params
    
    def process_query(self, request: AgentQueryRequest, db: Session) -> AgentQueryResponse:
        """Process the agent query and return appropriate response"""
        try:
            # Classify the query if not provided
            if not request.query_type:
                query_type, params = self.classify_query(request.query)
            else:
                query_type = request.query_type
                params = self._extract_parameters(request.query, query_type)
            
            # Route to appropriate handler
            if query_type == AgentQueryType.COUNT_ITEMS:
                response_data = self._count_items(db, params)
            elif query_type == AgentQueryType.COUNT_CONTAINERS:
                response_data = self._count_containers(db, params)
            elif query_type == AgentQueryType.COUNT_ZONES:
                response_data = self._count_zones(db, params)
            elif query_type == AgentQueryType.COUNT_MODULES:
                response_data = self._count_modules(db, params)
            elif query_type == AgentQueryType.EXPIRED_ITEMS:
                response_data = self._get_expired_items(db, params)
            elif query_type == AgentQueryType.NEAR_EXPIRY_ITEMS:
                response_data = self._get_near_expiry_items(db, params)
            elif query_type == AgentQueryType.TOP_USED_ITEMS:
                response_data = self._get_top_used_items(db, params)
            else:
                response_data = {"error": "Unknown query type"}
            
            return AgentQueryResponse(
                success=True,
                query_type=query_type,
                response_data=response_data,
                message=f"Successfully processed {query_type.value} query"
            )
            
        except Exception as e:
            return AgentQueryResponse(
                success=False,
                query_type=query_type if 'query_type' in locals() else AgentQueryType.COUNT_ITEMS,
                response_data={"error": str(e)},
                message=f"Error processing query: {str(e)}"
            )
    
    def _count_items(self, db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
        """Count items with optional filters"""
        db_query = db.query(DBItem)
        
        # Apply filters
        if 'zone' in params:
            db_query = db_query.join(DBPlacement).join(DBContainer).filter(DBContainer.zone == params['zone'])
        if 'module_id' in params:
            db_query = db_query.join(DBPlacement).join(DBContainer).filter(DBContainer.module_id == params['module_id'])
        if 'category' in params:
            db_query = db_query.filter(DBItem.category == params['category'])
        
        count = db_query.count()
        
        return CountResponse(
            count=count,
            entity_type="items",
            filter_criteria=params,
            message=f"Found {count} items"
        ).dict()
    
    def _count_containers(self, db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
        """Count containers with optional filters"""
        db_query = db.query(DBContainer)
        
        if 'zone' in params:
            db_query = db_query.filter(DBContainer.zone == params['zone'])
        if 'module_id' in params:
            db_query = db_query.filter(DBContainer.module_id == params['module_id'])
        
        count = db_query.count()
        
        return CountResponse(
            count=count,
            entity_type="containers",
            filter_criteria=params,
            message=f"Found {count} containers"
        ).dict()
    
    def _count_zones(self, db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
        """Count unique zones"""
        zones_result = db.query(DBContainer.zone).distinct().all()
        count = len(zones_result)
        
        return CountResponse(
            count=count,
            entity_type="zones",
            filter_criteria=params,
            message=f"Found {count} unique zones"
        ).dict()
    
    def _count_modules(self, db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
        """Count unique modules"""
        modules_result = db.query(DBContainer.module_id).distinct().all()
        count = len(modules_result)
        
        return CountResponse(
            count=count,
            entity_type="modules",
            filter_criteria=params,
            message=f"Found {count} unique modules"
        ).dict()
    
    def _get_expired_items(self, db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get expired items with enhanced functionality"""
        current_date = datetime.utcnow().date()
        
        # Get items with expiry dates
        db_query = db.query(DBItem).filter(
            DBItem.expiry_date.isnot(None),
            DBItem.expiry_date != "N/A"
        )
        
        # Apply category filter if specified
        if 'category' in params:
            db_query = db_query.filter(DBItem.category == params['category'])
        
        items = db_query.all()
        
        expired_items = []
        for item in items:
            try:
                if item.expiry_date:
                    expiry_date = datetime.strptime(item.expiry_date, "%Y-%m-%d").date()
                    if expiry_date < current_date:
                        item_info = self._item_to_info(item, db)
                        expired_items.append(item_info)
            except:
                continue
        
        # Check if this is a count-only request
        query_lower = params.get('query', '').lower()
        if any(word in query_lower for word in ['how many', 'count', 'number']):
            return CountResponse(
                count=len(expired_items),
                entity_type="expired items",
                filter_criteria=params,
                message=f"Found {len(expired_items)} expired items"
            ).dict()
        
        return ExpiredItemsResponse(
            count=len(expired_items),
            items=expired_items,
            message=f"Found {len(expired_items)} expired items"
        ).dict()
    
    def _get_near_expiry_items(self, db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get items near expiry with enhanced functionality"""
        days_threshold = params.get('days_threshold', 30)
        limit = params.get('limit', 10)
        current_date = datetime.utcnow().date()
        threshold_date = current_date + timedelta(days=days_threshold)
        
        db_query = db.query(DBItem).filter(
            DBItem.expiry_date.isnot(None),
            DBItem.expiry_date != "N/A"
        )
        items = db_query.all()
        
        near_expiry_items = []
        for item in items:
            try:
                if item.expiry_date:
                    expiry_date = datetime.strptime(item.expiry_date, "%Y-%m-%d").date()
                    if current_date <= expiry_date <= threshold_date:
                        item_info = self._item_to_info(item, db)
                        near_expiry_items.append(item_info)
            except:
                continue
        
        # Sort by expiry date (nearest first)
        near_expiry_items.sort(key=lambda x: x.expiry_date if x.expiry_date else "9999-12-31")
        
        # Apply limit
        if limit:
            near_expiry_items = near_expiry_items[:limit]
        
        return NearExpiryItemsResponse(
            count=len(near_expiry_items),
            items=near_expiry_items,
            days_threshold=days_threshold,
            message=f"Found {len(near_expiry_items)} items expiring within {days_threshold} days"
        ).dict()
    
    def _get_top_used_items(self, db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get top used items based on log entries"""
        limit = params.get('limit', 10)
        
        # Query logs to count usage events per item
        usage_counts = db.query(
            Log.item_id_fk,
            func.count(Log.id).label('usage_count')
        ).filter(
            Log.item_id_fk.isnot(None),
            Log.actionType.in_([LogActionType.RETRIEVAL, LogActionType.SIMULATION_USE])
        ).group_by(Log.item_id_fk).order_by(
            func.count(Log.id).desc()
        ).limit(limit).all()
        
        # Get item details for each item with usage
        top_items = []
        for item_id, usage_count in usage_counts:
            item_query = db.query(DBItem).filter(DBItem.item_id == item_id)
            item = item_query.first()
            if item:
                item_info = self._item_to_info(item, db)
                # Update the usage count to reflect actual log count
                item_info.current_uses = usage_count
                top_items.append(item_info)
        
        return TopUsedItemsResponse(
            items=top_items,
            limit=limit,
            message=f"Top {limit} most used items based on usage logs"
        ).dict()
    
    def _item_to_info(self, item: DBItem, db: Session) -> ItemInfo:
        """Convert database item to ItemInfo"""
        # Get container info
        placement_query = db.query(DBPlacement).filter(DBPlacement.item_id_fk == item.item_id)
        placement = placement_query.first()
        container_id = None
        zone = None
        if placement:
            container_query = db.query(DBContainer).filter(DBContainer.container_id == placement.container_id_fk)
            container = container_query.first()
            if container:
                container_id = container.container_id
                zone = container.zone
        
        return ItemInfo(
            item_id=item.item_id,
            name=item.name,
            category=item.category,
            subcategory=item.subcategory,
            expiry_date=item.expiry_date,
            usage_limit=item.usage_limit,
            current_uses=getattr(item, 'current_uses', 0),
            status=item.status.value,
            container_id=container_id,
            zone=zone
        )
