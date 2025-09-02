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
    CodeMeaningResponse, UsageTrackingResponse, ConversationContext,
    CategoriesListResponse, SubcategoriesListResponse, ContainerDetailsResponse
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
        
        # Check for container details queries (e.g., "M1-SB085", "container M1-SB085")
        if re.search(r'M\d+-[A-Z]{2}\d+', query.upper()):
            return AgentQueryType.CONTAINER_DETAILS, self._extract_parameters(query, AgentQueryType.CONTAINER_DETAILS)
        
        # Check for subcategories queries (more specific patterns) - must come before categories
        if any(word in query_lower for word in ['subcategories', 'subcategory']) and any(word in query_lower for word in ['under', 'for', 'in']):
            return AgentQueryType.SUBCATEGORIES_LIST, self._extract_parameters(query, AgentQueryType.SUBCATEGORIES_LIST)
        
        # Check for categories queries
        if any(word in query_lower for word in ['categories', 'category', 'types', 'what categories', 'list categories']):
            return AgentQueryType.CATEGORIES_LIST, self._extract_parameters(query, AgentQueryType.CATEGORIES_LIST)
        
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
        
        # Extract container ID for container details queries
        if query_type == AgentQueryType.CONTAINER_DETAILS:
            container_match = re.search(r'M\d+-[A-Z]{2}\d+', query.upper())
            if container_match:
                params['container_id'] = container_match.group(0)
        
        # Extract category for subcategories queries
        if query_type == AgentQueryType.SUBCATEGORIES_LIST:
            # Look for category after "under", "for", or "in"
            category_patterns = [
                r'under\s+([a-zA-Z_\s]+?)(?:\s+supplies?|\s+category|\s+items?)?$',
                r'for\s+([a-zA-Z_\s]+?)(?:\s+supplies?|\s+category|\s+items?)?$',
                r'in\s+([a-zA-Z_\s]+?)(?:\s+supplies?|\s+category|\s+items?)?$'
            ]
            
            for pattern in category_patterns:
                category_match = re.search(pattern, query_lower)
                if category_match:
                    category = category_match.group(1).strip()
                    # Map common variations to actual category names
                    category_mapping = {
                        'food': 'Food',
                        'medical': 'Medical',
                        'equipment': 'Equipment',
                        'life support system': 'Life_Support_System',
                        'life support': 'Life_Support_System',
                        'experiment sample': 'Experiment_Sample',
                        'crew supplies': 'Crew_Supplies',
                        'maintenance tools': 'Maintenance_Tools',
                        'scientific research supplies': 'Scientific_Research_Supplies',
                        'essential supplies': 'Essential_Supplies',
                        'structural and spacecraft components': 'Structural_and_Spacecraft_Components',
                        'entertainment and leisure items': 'Entertainment_and_Leisure_Items'
                    }
                    params['category'] = category_mapping.get(category.lower(), category.title())
                    break
        
        # Extract limit for top used/expiring items
        limit_match = re.search(r'top[:\s]+(\d+)', query_lower)
        if limit_match:
            params['limit'] = int(limit_match.group(1))
        
        # Extract days threshold for near expiry
        days_match = re.search(r'(\d+)[:\s]*days?', query_lower)
        if days_match:
            params['days_threshold'] = int(days_match.group(1))
        
        # Extract category for other queries
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
            elif query_type == AgentQueryType.CATEGORIES_LIST:
                response_data = self._get_categories_list(db, params)
            elif query_type == AgentQueryType.SUBCATEGORIES_LIST:
                response_data = self._get_subcategories_list(db, params)
            elif query_type == AgentQueryType.CONTAINER_DETAILS:
                response_data = self._get_container_details(db, params)
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
        from app.models_db import ItemStatus
        
        # Query items that are marked as WASTE_EXPIRED in the database
        db_query = db.query(DBItem).filter(DBItem.status == ItemStatus.WASTE_EXPIRED)
        
        # Apply category filter if specified
        if 'category' in params:
            db_query = db_query.filter(DBItem.category == params['category'])
        
        items = db_query.all()
        
        expired_items = []
        for item in items:
            item_info = self._item_to_info(item, db)
            expired_items.append(item_info)
        
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
        from app.models_db import ItemStatus
        
        days_threshold = params.get('days_threshold', 30)
        limit = params.get('limit', 10)
        current_date = datetime.utcnow().date()
        threshold_date = current_date + timedelta(days=days_threshold)
        
        # Query active items with expiry dates
        db_query = db.query(DBItem).filter(
            DBItem.status == ItemStatus.ACTIVE,
            DBItem.expiry_date.isnot(None),
            DBItem.expiry_date != "N/A"
        )
        items = db_query.all()
        
        near_expiry_items = []
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
                    
                    # If item is near expiry (current_date <= expiry_date <= threshold_date)
                    if expiry_date and current_date <= expiry_date <= threshold_date:
                        item_info = self._item_to_info(item, db)
                        near_expiry_items.append(item_info)
            except Exception as e:
                # Log the error but continue processing other items
                print(f"Error processing item {item.item_id} expiry date: {e}")
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
        from app.models_db import ItemStatus
        
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
        
        # Get item details for each item with usage (only active items)
        top_items = []
        for item_id, usage_count in usage_counts:
            item_query = db.query(DBItem).filter(
                DBItem.item_id == item_id,
                DBItem.status == ItemStatus.ACTIVE
            )
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
    
    def _get_categories_list(self, db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get list of all categories"""
        categories_result = db.query(DBItem.category).distinct().all()
        categories = [cat[0] for cat in categories_result if cat[0]]
        categories.sort()
        
        return CategoriesListResponse(
            categories=categories,
            count=len(categories),
            message=f"Found {len(categories)} unique categories"
        ).dict()
    
    def _get_subcategories_list(self, db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get list of subcategories for a specific category"""
        category = params.get('category', 'Food')
        
        # Query subcategories for the specified category
        subcategories_result = db.query(DBItem.subcategory).filter(
            DBItem.category == category
        ).distinct().all()
        
        subcategories = [sub[0] for sub in subcategories_result if sub[0]]
        subcategories.sort()
        
        return SubcategoriesListResponse(
            category=category,
            subcategories=subcategories,
            count=len(subcategories),
            message=f"Found {len(subcategories)} subcategories under {category}"
        ).dict()
    
    def _get_container_details(self, db: Session, params: Dict[str, Any]) -> Dict[str, Any]:
        """Get detailed information about a specific container"""
        container_id = params.get('container_id')
        if not container_id:
            return {"error": "Container ID not provided"}
        
        # Get container information
        container = db.query(DBContainer).filter(DBContainer.container_id == container_id).first()
        if not container:
            return {"error": f"Container {container_id} not found"}
        
        # Get zone code from container ID (e.g., M1-SB085 -> SB)
        zone_code = container_id.split('-')[1][:2]
        
        # Get items in this container
        items_query = db.query(DBItem).join(DBPlacement).filter(
            DBPlacement.container_id_fk == container_id
        )
        items = items_query.all()
        
        # Convert items to ItemInfo
        item_infos = []
        for item in items:
            item_info = self._item_to_info(item, db)
            item_infos.append(item_info)
        
        return ContainerDetailsResponse(
            container_id=container.container_id,
            module_id=container.module_id,
            zone=container.zone,
            zone_code=zone_code,
            dimensions={
                "width_cm": container.width_cm,
                "depth_cm": container.depth_cm,
                "height_cm": container.height_cm
            },
            item_count=len(item_infos),
            items=item_infos,
            message=f"Container {container_id} is located in {container.zone} (Module {container.module_id}) and contains {len(item_infos)} items"
        ).dict()
