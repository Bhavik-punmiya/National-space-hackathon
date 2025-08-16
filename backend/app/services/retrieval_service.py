# /app/services/retrieval_service.py
from sqlalchemy.orm import Session, joinedload
from typing import List, Tuple, Optional
from app.models_db import Item as DBItem, Container as DBContainer, Placement as DBPlacement, LogActionType, ItemStatus
from app.models_api import Position, Coordinates, RetrievalStep, SearchResponse, SearchResponseItem, PlaceUpdateRequest, SuccessResponse, RetrieveRequest
from app.utils import geometry
from .logging_service import create_log_entry
from datetime import datetime

def get_blocking_items(
    target_item_id: str,
    target_pos: Position,
    container_id: str,
    db: Session
) -> List[Tuple[str, str, Position]]:
    """
    Finds items directly blocking the retrieval path of the target item.
    Returns a list of tuples: (blocker_itemId, blocker_itemName, blocker_position).
    """
    blockers: List[Tuple[str, str, Position]] = []

    # Get all *other* items currently placed in the same container
    other_placements = db.query(DBPlacement).\
        options(joinedload(DBPlacement.item)).\
        filter(
            DBPlacement.container_id_fk == container_id,
            DBPlacement.item_id_fk != target_item_id,
            DBPlacement.item.has(DBItem.status == ItemStatus.ACTIVE) # Only consider active items as blockers
        ).all()

    if not other_placements:
        return []

    for placed_other in other_placements:
        # Construct the Pydantic Position model for the potential blocker
        blocker_pos = Position(
            startCoordinates=Coordinates(width=placed_other.start_w, depth=placed_other.start_d, height=placed_other.start_h),
            endCoordinates=Coordinates(width=placed_other.end_w, depth=placed_other.end_d, height=placed_other.end_h)
        )

        # Check if this item blocks the target item's path
        if geometry.does_block(blocker_pos=blocker_pos, target_pos=target_pos):
            item_info = placed_other.item # Already loaded via joinedload
            if item_info: # Should always be true due to join
                 blockers.append((item_info.item_id, item_info.name, blocker_pos))
            else:
                 # Should not happen with joinedload unless data inconsistency
                 print(f"Warning: Item info not found for placement ID {placed_other.id}")


    # Optional: Sort blockers? e.g., by depth (closest first)
    blockers.sort(key=lambda b: b[2].startCoordinates.depth)

    return blockers


def search_for_item(db: Session, item_id: Optional[str], item_name: Optional[str], user_id: Optional[str] = None) -> SearchResponse:
    """
    Searches for an item by ID or name and determines retrieval steps.
    If multiple found by name, chooses the one easiest to retrieve (fewest direct blockers).
    Does NOT log here, logging happens during actual retrieval via /api/retrieve.
    """
    query = db.query(DBPlacement).\
        options(joinedload(DBPlacement.item), joinedload(DBPlacement.container))

    if item_id:
        query = query.filter(DBPlacement.item_id_fk == item_id)
    elif item_name:
         # Join with Item table to filter by name
         query = query.join(DBItem, DBPlacement.item_id_fk == DBItem.item_id).\
             filter(DBItem.name == item_name)
    else:
        # Should be caught by route validation, but double-check
        return SearchResponse(success=False, found=False, error="itemId or itemName is required")

    # Filter for active items only
    query = query.filter(DBItem.status == ItemStatus.ACTIVE)

    possible_placements: List[DBPlacement] = query.all()

    if not possible_placements:
        return SearchResponse(success=True, found=False)

    best_placement: Optional[DBPlacement] = None
    min_blockers = float('inf')
    best_retrieval_steps: List[RetrievalStep] = []
    found_item_details: Optional[SearchResponseItem] = None

    # Evaluate each possible placement found
    for placement in possible_placements:
        item_info = placement.item
        container_info = placement.container

        if not item_info or not container_info:
            print(f"Warning: Incomplete data for placement ID {placement.id}")
            continue # Skip if data is inconsistent

        target_pos = Position(
            startCoordinates=Coordinates(width=placement.start_w, depth=placement.start_d, height=placement.start_h),
            endCoordinates=Coordinates(width=placement.end_w, depth=placement.end_d, height=placement.end_h)
        )

        # Find direct blockers for this specific placement
        blockers = get_blocking_items(item_info.item_id, target_pos, container_info.container_id, db)
        num_blockers = len(blockers)

        # Compare with the current best option found so far
        # TODO: Add secondary sorting criteria (e.g., expiry date proximity, priority)
        if num_blockers < min_blockers:
            min_blockers = num_blockers
            best_placement = placement
            current_steps_list = []
            step_count = 1

            # Generate 'remove' or 'setAside' steps for blockers
            for blocker_id, blocker_name, _ in blockers: # Don't need blocker_pos here
                current_steps_list.append(RetrievalStep(
                    step=step_count,
                    action="setAside", # Or "remove", based on operational preference
                    item_id=blocker_id,
                    itemName=blocker_name
                ))
                step_count += 1

            # Add the 'retrieve' step for the target item
            current_steps_list.append(RetrievalStep(
                step=step_count,
                action="retrieve",
                item_id=item_info.item_id,
                itemName=item_info.name
            ))
            step_count += 1

            # TODO: Add 'placeBack' steps for blockers if required by workflow
            # for blocker_id, blocker_name, _ in reversed(blockers): # Place back in reverse order?
            #     current_steps_list.append(RetrievalStep(
            #         step=step_count,
            #         action="placeBack",
            #         item_id=blocker_id,
            #         itemName=blocker_name
            #     ))
            #     step_count += 1

            best_retrieval_steps = current_steps_list

            # Store details of the best one found so far
            found_item_details = SearchResponseItem(
                item_id=item_info.item_id,
                name=item_info.name,
                container_id=container_info.container_id,
                zone=container_info.zone,
                position=target_pos
            )

    # If loop finished and we found a best placement
    if found_item_details:
        return SearchResponse(
            success=True,
            found=True,
            item=found_item_details,
            retrievalSteps=best_retrieval_steps
        )
    else:
         # This case should technically not be reached if possible_placements was not empty
         # unless all placements had inconsistent data.
        return SearchResponse(success=True, found=False, item=None, retrievalSteps=[])


def log_item_retrieval(db: Session, request_data: RetrieveRequest) -> SuccessResponse:
    """
    Logs the retrieval of an item and decrements its usage count.
    """
    item_id = request_data.item_id
    user_id = request_data.userId
    timestamp = request_data.timestamp or datetime.utcnow() # Use provided or now

    item = db.query(DBItem).filter(DBItem.item_id == item_id).first()

    if not item:
        raise ValueError(f"Item {item_id} not found.") # Or return SuccessResponse(success=False)?

    if item.status != ItemStatus.ACTIVE:
        raise ValueError(f"Item {item_id} is not active (status: {item.status}). Cannot retrieve.")




    # --- Decrement Usage Count ---
    remaining_uses = None
    if item.usage_limit is not None and item.usage_limit != "N/A":
        try:
            usage_limit_int = int(item.usage_limit)
            current_uses = getattr(item, 'current_uses', 0)
            current_uses += 1
            item.current_uses = current_uses
            remaining_uses = usage_limit_int - current_uses
            if remaining_uses < 0:
                 # This shouldn't ideally happen if checks are done, but handle defensively
                 print(f"Warning: Item {item_id} used more times ({current_uses}) than limit ({usage_limit_int}).")
                 remaining_uses = 0 # Cap at 0
                 return SuccessResponse(success=False, error="Usage limit exceeded.")

            # --- Update Status if Depleted ---
            if remaining_uses == 0:
                item.status = ItemStatus.WASTE_DEPLETED
                action_type = LogActionType.SIMULATION_DEPLETED # Or a specific RETRIEVAL_DEPLETED? Use generic for now.
                log_details = {
                    "reason": "Usage limit reached upon retrieval",
                    "remainingUses": remaining_uses
                }
                 # Log the depletion event separately? Or combine with retrieval log? Combine for now.
                create_log_entry(
                     db=db,
                     actionType=LogActionType.SIMULATION_DEPLETED, # Specific log for status change
                     itemId=item.item_id,
                     userId=user_id, # User action caused depletion
                     timestamp=timestamp,
                     details=log_details
                )
        except (ValueError, TypeError):
            # Handle invalid usage_limit format
            print(f"Warning: Invalid usage_limit format for item {item_id}: {item.usage_limit}")
            remaining_uses = None


    # --- Log the Retrieval Action ---
    # Find current placement for logging details
    placement = db.query(DBPlacement).filter(DBPlacement.item_id_fk == item_id).first()
    log_details_retrieval = {
        "remainingUses": remaining_uses,
        "status_after": item.status.value # Log status after potential update
    }
    if placement:
        log_details_retrieval["containerId"] = placement.container_id_fk
        log_details_retrieval["position"] = Position(
             startCoordinates=Coordinates(width=placement.start_w, depth=placement.start_d, height=placement.start_h),
             endCoordinates=Coordinates(width=placement.end_w, depth=placement.end_d, height=placement.end_h)
        ).dict() # Convert to dict


    create_log_entry(
        db=db,
        actionType=LogActionType.RETRIEVAL,
        itemId=item_id,
        userId=user_id,
        timestamp=timestamp,
        details=log_details_retrieval
    )

    # Commit changes (usage count, status)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error committing item retrieval for {item_id}: {e}")
        raise ValueError(f"Failed to commit retrieval: {e}")

    return SuccessResponse(success=True)


def update_item_placement(db: Session, request_data: PlaceUpdateRequest) -> SuccessResponse:
    """
    Updates the location of a single, known item after retrieval/use.
    Assumes the item exists and was previously retrieved (or is being placed initially this way).
    """
    item_id = request_data.item_id
    user_id = request_data.userId
    timestamp = request_data.timestamp or datetime.utcnow()
    new_container_id = request_data.container_id
    new_pos = request_data.position

    # --- Validate Item and Container ---
    item = db.query(DBItem).filter(DBItem.item_id == item_id).first()
    if not item:
        raise ValueError(f"Item {item_id} not found. Cannot update placement.")

    container = db.query(DBContainer).filter(DBContainer.container_id == new_container_id).first()
    if not container:
        raise ValueError(f"Target container {new_container_id} not found.")

    # --- Collision Check (Placeholder - needs proper implementation) ---
    # Fetch other items in the *target* container
    existing_placements_in_target = db.query(DBPlacement).filter(
        DBPlacement.container_id_fk == new_container_id,
        DBPlacement.item_id_fk != item_id # Exclude the item itself
    ).all()

    target_container_dims = Coordinates(width=container.width_cm, depth=container.depth_cm, height=container.height_cm)

    # Check bounds first
    if not geometry.check_bounds(new_pos, target_container_dims):
         raise ValueError(f"Proposed position for {item_id} is outside the bounds of container {new_container_id}.")

    for existing in existing_placements_in_target:
         existing_pos = Position(
             startCoordinates=Coordinates(width=existing.start_w, depth=existing.start_d, height=existing.start_h),
             endCoordinates=Coordinates(width=existing.end_w, depth=existing.end_d, height=existing.end_h)
         )
         if geometry.check_overlap(new_pos, existing_pos):
             raise ValueError(f"Proposed position for {item_id} in {new_container_id} overlaps with item {existing.item_id_fk}.") # Use 409 Conflict in route?

    print("Placement Update Collision Check Passed (basic).")

    # --- Find or Create Placement Record ---
    placement = db.query(DBPlacement).filter(DBPlacement.item_id_fk == item_id).first()
    original_container_id = None
    original_position_dict = None

    if placement:
        # Record original location for logging
        original_container_id = placement.container_id_fk
        original_position_dict = Position(
             startCoordinates=Coordinates(width=placement.start_w, depth=placement.start_d, height=placement.start_h),
             endCoordinates=Coordinates(width=placement.end_w, depth=placement.end_d, height=placement.end_h)
        ).dict()

        # Update existing placement
        placement.container_id_fk = new_container_id
        placement.start_w = new_pos.startCoordinates.width
        placement.start_d = new_pos.startCoordinates.depth
        placement.start_h = new_pos.startCoordinates.height
        placement.end_w = new_pos.endCoordinates.width
        placement.end_d = new_pos.endCoordinates.depth
        placement.end_h = new_pos.endCoordinates.height
    else:
        # Create new placement if none exists (e.g., first time placing via this API)
        placement = DBPlacement(
            item_id_fk=item_id,
            container_id_fk=new_container_id,
            start_w=new_pos.startCoordinates.width,
            start_d=new_pos.startCoordinates.depth,
            start_h=new_pos.startCoordinates.height,
            end_w=new_pos.endCoordinates.width,
            end_d=new_pos.endCoordinates.depth,
            end_h=new_pos.endCoordinates.height
        )
        db.add(placement)

     # --- Logging ---
    log_details = {
        "toContainer": new_container_id,
        "toPosition": new_pos.dict(),
    }
    if original_container_id:
         log_details["fromContainer"] = original_container_id
         log_details["fromPosition"] = original_position_dict # Already a dict
    else:
         log_details["status"] = "New placement created via /api/place"

    create_log_entry(
        db=db,
        actionType=LogActionType.UPDATE_LOCATION,
        itemId=item_id,
        userId=user_id,
        timestamp=timestamp,
        details=log_details
    )

    # Commit changes
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error committing placement update for {item_id}: {e}")
        raise ValueError(f"Failed to commit placement update: {e}")

    return SuccessResponse(success=True)