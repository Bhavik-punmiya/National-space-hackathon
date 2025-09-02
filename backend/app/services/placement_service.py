# /app/placement_service.py

import json
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple, Set

# --- Import DB models defined in models_db.py ---
from app.models_db import (
    Item, Container, Placement, Log, LogActionType, ItemStatus, User, ItemReservation,
    TemperatureRequirement, HazardousClass, ContainerType
)
# --- Import API models (ensure compatibility) ---
from app.models_api import (
    PlacementRequest, PlacementResponse, PlacementResponseItem,
    RearrangementStep, Coordinates, Position, ItemCreate, ContainerCreate
)
# --- Import enhanced services ---
from app.services.logging_service import create_log_entry, create_item_usage_log
from app.services.placement_utils import PlacementUtils

# ==============================================================================
# == Get All Placements Service Function =======================================
# ==============================================================================

def get_all_current_placements(db: Session) -> List[PlacementResponseItem]:
    """
    Retrieves ALL current placement details from the database.

    Args:
        db: The SQLAlchemy database session.

    Returns:
        A list of PlacementResponseItem objects for all items currently placed.
        Returns an empty list if no placements exist in the database.
    """
    print(f"--- Service: Fetching ALL current placements ---")

    # Query the Placement table for all records
    placements_db = db.query(Placement).all()

    results: List[PlacementResponseItem] = []

    if not placements_db:
        print("    INFO: No placements found in the database.")
        return []

    for p in placements_db:
        # Construct the response object for each placement found
        start_coords = Coordinates(width=p.start_w, depth=p.start_d, height=p.start_h)
        end_coords = Coordinates(width=p.end_w, depth=p.end_d, height=p.end_h)
        position = Position(startCoordinates=start_coords, endCoordinates=end_coords)

        placement_item = PlacementResponseItem(
            item_id=p.item_id_fk,         # Use the foreign key value (string ID)
            container_id=p.container_id_fk, # Use the foreign key value (string ID)
            position=position
        )
        results.append(placement_item)

    print(f"--- Service: Found {len(results)} total placements ---")
    return results

# ==============================================================================
# == Helper Functions ==========================================================
# ==============================================================================

def boxes_overlap(
    start1: Coordinates, end1: Coordinates, start2: Coordinates, end2: Coordinates
) -> bool:
    """Checks if two 3D bounding boxes overlap, using tolerance."""
    tol = 1e-6 # Tolerance for floating point comparisons
    # Check for non-overlap along each axis
    no_overlap_w = end1.width <= start2.width + tol or end2.width <= start1.width + tol
    no_overlap_d = end1.depth <= start2.depth + tol or end2.depth <= start1.depth + tol
    no_overlap_h = end1.height <= start2.height + tol or end2.height <= start1.height + tol
    # If there is no overlap along ANY axis, the boxes don't overlap overall
    return not (no_overlap_w or no_overlap_d or no_overlap_h)

def get_current_placements_dict(db: Session, container_ids: List[str]) -> Dict[str, List[Placement]]:
    """
    Fetches existing Placement ORM objects for the specified containers
    from the database.
    Returns a dictionary mapping container_id_fk to a list of Placement objects.
    """
    if not container_ids:
        return {}
    placements = db.query(Placement).filter(Placement.container_id_fk.in_(container_ids)).all()
    result_dict = {cid: [] for cid in container_ids}
    for p in placements:
        result_dict.setdefault(p.container_id_fk, []).append(p)
    return result_dict

def get_item_priorities(db: Session, item_ids: List[str]) -> Dict[str, int]:
    """
    Fetches priorities for existing items from the database using their string item_id.
    Returns a dictionary mapping item_id to its priority.
    """
    if not item_ids:
        return {}
    items = db.query(Item.item_id, Item.priority).filter(Item.item_id.in_(item_ids)).all()
    return {item.item_id: item.priority for item in items}

def find_spot_in_container(
    item_req: ItemCreate,  # Item dimensions and properties
    container: ContainerCreate,  # Container dimensions
    current_placements_in_container: List[Tuple[str, Coordinates, Coordinates]], # Current simulation state (itemId, start, end)
    is_high_priority: bool # Hint for placement strategy (shallow vs. deep)
) -> Optional[Tuple[Coordinates, Coordinates, Tuple[float, float, float]]]:
    """
    Enhanced placement algorithm that considers:
    - Temperature requirements compatibility
    - Hazardous material restrictions
    - Mass constraints
    - Access patterns
    """
    # Basic dimension validation
    if (item_req.width_cm > container.width_cm or 
        item_req.depth_cm > container.depth_cm or 
        item_req.height_cm > container.height_cm):
        return None

    # Check mass constraints if container has max_mass
    if container.max_mass and item_req.mass_kg > container.max_mass:
        return None

    # Check temperature compatibility
    if item_req.temp_requirement != TemperatureRequirement.AMBIENT:
        # For now, assume all containers support ambient temperature
        # In a real system, you'd check container temperature capabilities
        pass

    # Check hazardous material restrictions
    if item_req.hazardous_class != HazardousClass.NONE:
        # For now, assume all containers can handle hazardous materials
        # In a real system, you'd check container safety ratings
        pass

    # Use PlacementUtils for actual placement logic
    return PlacementUtils.find_optimal_placement_spot(
        item_req, container, current_placements_in_container, is_high_priority
    )

# ==============================================================================
# == Main Placement Service Function ===========================================
# ==============================================================================

def suggest_placements(db: Session, request_data: PlacementRequest, user_id: Optional[str]) -> PlacementResponse:
    """
    Suggests placements for new items, handles priority, rearrangements,
    and persists ALL changes (Items, Containers, Placements) to the database
    using the enhanced models. Logs actions with full user tracking and analytics.

    Process:
    1. Load existing state (placements, priorities) from DB.
    2. Simulate initial placement of new items into preferred zones.
    3. Simulate rearrangement of lower-priority items if needed for high-priority items.
    4. Simulate final placement attempt for remaining items in any available space.
    5. Persist the final simulated state (creations, updates, moves) to the database.
    6. Log all relevant actions (placement, rearrangement, failure) with user context.
    7. Return the results (placements, rearrangements, success status).
    
    Enhanced Features:
    - User activity tracking and logging
    - Enhanced constraint validation (temperature, hazardous materials, mass)
    - Better rearrangement logic with new database fields
    - Analytics-ready logging for dashboards
    """

    # --- Phase 0: Initialization & Data Loading ---
    print("--- Phase 0: Initializing ---")
    placements_result: List[PlacementResponseItem] = [] # Stores the *final* intended placement state for response
    rearrangements_result: List[RearrangementStep] = [] # Stores required move actions for response
    processed_item_ids: Set[str] = set() # Tracks items handled (placed or failed) during simulation
    items_failed_completely: List[str] = [] # Tracks items that could not be placed by the end

    # Prepare input data for easy access
    incoming_items_dict = {item.item_id: item for item in request_data.items}
    containers_data = {container.container_id: container for container in request_data.containers}
    container_ids = list(containers_data.keys())

    # Load existing data from database
    existing_placements_dict = get_current_placements_dict(db, container_ids)
    
    # Get ALL existing items in the target containers (not just from current request)
    all_existing_items_in_containers = []
    print(f"--- DEBUG: Loading existing items from containers: {container_ids} ---")
    for container_id in container_ids:
        container_items = db.query(Item).filter(Item.current_location == container_id).all()
        print(f"  Container {container_id}: Found {len(container_items)} existing items")
        for item in container_items:
            print(f"    Item {item.item_id}: priority {item.priority}, zone {item.preferred_zone}")
            all_existing_items_in_containers.append({
                'item_id': item.item_id,
                'priority': item.priority,
                'container_id': container_id,
                'width_cm': item.width_cm,
                'depth_cm': item.depth_cm,
                'height_cm': item.height_cm,
                'mass_kg': item.mass_kg,
                'temp_requirement': item.temp_requirement,
                'hazardous_class': item.hazardous_class,
                'orientation_allowed': item.orientation_allowed,
                'expiry_date': item.expiry_date,
                'maximum_uses': item.maximum_uses,
                'usage_frequency': item.usage_frequency,
                'current_uses': item.current_uses,
                'usage_remaining': item.usage_remaining,
                'preferred_zone': item.preferred_zone
            })
    
    # Get priorities for existing items
    existing_item_priorities = {item['item_id']: item['priority'] for item in all_existing_items_in_containers}
    print(f"  Existing item priorities: {existing_item_priorities}")
    
    # Also get priorities for new items
    new_item_priorities = {item.item_id: item.priority for item in request_data.items}
    existing_item_priorities.update(new_item_priorities)
    print(f"  Combined priorities: {existing_item_priorities}")

    # Build initial simulation state
    temp_placements_by_container: Dict[str, List[Tuple[str, Coordinates, Coordinates]]] = {}
    for container_id, placements in existing_placements_dict.items():
        temp_placements_by_container[container_id] = []
        for placement in placements:
            start_coords = Coordinates(width=placement.start_w, depth=placement.start_d, height=placement.start_h)
            end_coords = Coordinates(width=placement.end_w, depth=placement.end_d, height=placement.end_h)
            temp_placements_by_container[container_id].append((placement.item_id_fk, start_coords, end_coords))

    # Process new items in descending priority order
    sorted_incoming_items = sorted(request_data.items, key=lambda x: x.priority, reverse=True)

    # ==============================================================================
    # == Phase 1: Initial Placement in Preferred Zones =============================
    # ==============================================================================
    print("\n--- Phase 1: Initial Placement in Preferred Zones ---")
    items_requiring_placement_pass_2: List[ItemCreate] = [] # Items that need rearrangement consideration

    for item_req in sorted_incoming_items:
        if item_req.item_id in processed_item_ids: continue # Skip if already handled

        print(f"Processing: {item_req.item_id} (Prio: {item_req.priority}, Zone: {item_req.preferred_zone})")
        placed = False
        is_high_prio = item_req.priority >= 75 # Example priority threshold

        # Identify preferred containers based on zone
        preferred_container_ids = [
            cid for cid, c in containers_data.items() if c.zone == item_req.preferred_zone
        ] if item_req.preferred_zone else []

        if preferred_container_ids:
            for container_id in preferred_container_ids:
                if container_id not in containers_data: continue
                container = containers_data[container_id]
                # Use the current simulation state for the target container
                current_placements_in_pref_container = temp_placements_by_container.get(container_id, [])

                # Try to find a spot using the helper function
                spot_info = find_spot_in_container(
                    item_req, container, current_placements_in_pref_container, is_high_prio
                )

                if spot_info:
                    start_coords, end_coords, _ = spot_info
                    # --- Update Simulation State ---
                    temp_placements_by_container.setdefault(container_id, []).append(
                        (item_req.item_id, start_coords, end_coords)
                    )
                    # Add to provisional results (might be updated if item is moved later)
                    placement_details = PlacementResponseItem(
                        item_id=item_req.item_id, container_id=container_id,
                        position=Position(startCoordinates=start_coords, endCoordinates=end_coords)
                    )
                    placements_result.append(placement_details)
                    processed_item_ids.add(item_req.item_id)
                    print(f"    SUCCESS (Phase 1): Placed {item_req.item_id} in preferred {container_id} at {start_coords}")
                    placed = True
                    break # Placed in preferred zone, move to next item

        if not placed:
            print(f"    INFO (Phase 1): Could not place {item_req.item_id} in preferred zone. Needs further processing.")
            items_requiring_placement_pass_2.append(item_req)

    # ==============================================================================
    # == Phase 2: Rearrangement Simulation ========================================
    # ==============================================================================
    print("\n--- Phase 2: Evaluating Rearrangements ---")
    items_requiring_placement_pass_3: List[ItemCreate] = [] # Items for final non-preferred placement attempt
    rearrangement_step_counter = 0
    items_to_evaluate_for_rearrangement = sorted(
        items_requiring_placement_pass_2, 
        key=lambda x: x.priority, 
        reverse=True  # Ensure highest priority first
    )

    for high_prio_item in items_to_evaluate_for_rearrangement:
        if high_prio_item.item_id in processed_item_ids: continue # Skip if handled

        print(f"Reviewing: {high_prio_item.item_id} (Prio: {high_prio_item.priority}) needs placement")
        rearrangement_done_for_this_item = False

        # Get preferred containers for this high priority item
        preferred_container_ids = [
            cid for cid, c in containers_data.items() if c.zone == high_prio_item.preferred_zone
        ] if high_prio_item.preferred_zone else []

        # If no preferred zone defined, try other containers anyway for high-priority items
        if not preferred_container_ids and high_prio_item.priority > 80:
            print(f"    No preferred zone defined but high priority. Considering all containers.")
            preferred_container_ids = list(containers_data.keys())
        elif not preferred_container_ids:
            print(f"    No preferred zone defined. Moving {high_prio_item.item_id} to final placement pass.")
            items_requiring_placement_pass_3.append(high_prio_item)
            continue

        # === Attempt direct placement first ===
        # Check again if space opened up in preferred zone after other placements
        placed_without_rearrange = False
        for container_id in preferred_container_ids:
            if container_id not in containers_data: continue
            container = containers_data[container_id]
            current_placements_in_pref_container = temp_placements_by_container.get(container_id, [])
            spot_info = find_spot_in_container(high_prio_item, container, current_placements_in_pref_container, True)
            if spot_info:
                start_coords, end_coords, _ = spot_info
                temp_placements_by_container.setdefault(container_id, []).append((high_prio_item.item_id, start_coords, end_coords))
                placements_result.append(PlacementResponseItem(
                    item_id=high_prio_item.item_id, 
                    container_id=container_id, 
                    position=Position(startCoordinates=start_coords, endCoordinates=end_coords)
                ))
                processed_item_ids.add(high_prio_item.item_id)
                print(f"    SUCCESS (Phase 2 Direct): Placed {high_prio_item.item_id} in preferred {container_id}.")
                placed_without_rearrange = True
                rearrangement_done_for_this_item = True
                break

        if placed_without_rearrange:
            continue  # Go to next high_prio_item

        # === Look for items to displace based on priority ===
        # For each preferred container, identify all potential displacees
        all_potential_displacees = []
        print(f"    DEBUG: Checking for displaceable items in preferred containers: {preferred_container_ids}")
        print(f"    DEBUG: Current simulation state: {temp_placements_by_container}")
        print(f"    DEBUG: All existing items in containers: {[item['item_id'] for item in all_existing_items_in_containers]}")
        
        for container_id in preferred_container_ids:
            current_container_placements = temp_placements_by_container.get(container_id, [])
            print(f"    DEBUG: Container {container_id} has {len(current_container_placements)} current placements")
            
            # Check both current simulation state AND existing database items
            for existing_item_id, start_coords, end_coords in current_container_placements:
                print(f"    DEBUG: Checking item {existing_item_id} with priority {existing_item_priorities.get(existing_item_id, 'UNKNOWN')}")
                # Only consider existing items with known priorities that are lower than our target
                if existing_item_id in existing_item_priorities and existing_item_priorities[existing_item_id] < high_prio_item.priority:
                    print(f"    DEBUG: Adding {existing_item_id} (priority {existing_item_priorities[existing_item_id]}) to displacees list")
                    all_potential_displacees.append({
                        "item_id": existing_item_id,
                        "priority": existing_item_priorities[existing_item_id],
                        "fromContainerId": container_id,
                        "fromPosition": Position(startCoordinates=start_coords, endCoordinates=end_coords)
                    })
            
            # Also check for existing items in database that might not be in current simulation
            for existing_item_data in all_existing_items_in_containers:
                if (existing_item_data['container_id'] == container_id and 
                    existing_item_data['priority'] < high_prio_item.priority and
                    existing_item_data['item_id'] not in [d["item_id"] for d in all_potential_displacees]):
                    
                    print(f"    DEBUG: Found existing DB item {existing_item_data['item_id']} (priority {existing_item_data['priority']}) in {container_id}")
                    # Create a default position for the existing item
                    default_start = Coordinates(width=0.0, depth=0.0, height=0.0)
                    default_end = Coordinates(
                        width=existing_item_data['width_cm'], 
                        depth=existing_item_data['depth_cm'], 
                        height=existing_item_data['height_cm']
                    )
                    
                    all_potential_displacees.append({
                        "item_id": existing_item_data['item_id'],
                        "priority": existing_item_data['priority'],
                        "fromContainerId": container_id,
                        "fromPosition": Position(startCoordinates=default_start, endCoordinates=default_end)
                    })
        
        # Sort potential displacees by priority (lowest first)
        all_potential_displacees.sort(key=lambda x: x["priority"])
        
        if not all_potential_displacees:
            print(f"    No displaceable items found for {high_prio_item.item_id}. Moving to Pass 3.")
            items_requiring_placement_pass_3.append(high_prio_item)
            continue
        
        print(f"    Found {len(all_potential_displacees)} potential items to displace: {[d['item_id'] for d in all_potential_displacees]}")
        
        # === Attempt strategic displacement of items ===
        # First, find which container has most space (without touching items)
        container_volume_avail = {}
        for container_id in container_ids:
            if container_id not in containers_data: continue
            container = containers_data[container_id]
            # Calculate simple volume (no packing considerations)
            container_volume = container.width_cm * container.depth_cm * container.height_cm
            used_volume = 0
            for _, _, _ in temp_placements_by_container.get(container_id, []):
                # We could calculate exact volume used, but for simplicity just count items
                used_volume += 1  # Just a proxy for space used
            container_volume_avail[container_id] = container_volume - used_volume
        
        # Sort containers by available space (most first)
        target_containers = sorted(
            [(cid, avail) for cid, avail in container_volume_avail.items()],
            key=lambda x: x[1],
            reverse=True
        )
        
        # Collect items to displace by container
        displacements_by_container = {}
        for displacee in all_potential_displacees:
            container_id = displacee["fromContainerId"]
            if container_id not in displacements_by_container:
                displacements_by_container[container_id] = []
            displacements_by_container[container_id].append(displacee)
        
        # === Try displacement strategies ===
        # Strategy 1: Try removing items from a single container first
        rearrangement_successful = False
        
        for source_container_id in preferred_container_ids:
            if source_container_id not in displacements_by_container:
                continue
                
            # Get lowest priority items from this container
            displacees = sorted(
                displacements_by_container[source_container_id],
                key=lambda x: x["priority"]
            )
            
            # Create a simulated state with these items removed
            temp_container_simulation = temp_placements_by_container.copy()
            temp_container_simulation[source_container_id] = [
                p for p in temp_container_simulation[source_container_id] 
                if p[0] not in [d["item_id"] for d in displacees]
            ]
            
            # Check if high priority item fits now
            container = containers_data[source_container_id]
            spot_info = find_spot_in_container(
                high_prio_item, 
                container, 
                temp_container_simulation[source_container_id], 
                True
            )
            
            if spot_info:
                print(f"    Found spot in {source_container_id} after simulated displacement")
                start_coords, end_coords, _ = spot_info
                
                # Now we need to actually find homes for all the displaced items
                displacement_success = True
                displacement_moves = []
                
                # For each item we're displacing, find a new home
                for displacee in displacees:
                    relocated = False
                    displacee_id = displacee["item_id"]
                    # Fetch item details for the displacee
                    displacee_db = db.query(Item).filter(Item.item_id == displacee_id).first()
                    if not displacee_db:
                        print(f"      ERROR: Missing DB data for {displacee_id}. Skipping.")
                        displacement_success = False
                        break
                        
                    # Create ItemCreate object for the displacee
                    displacee_item = ItemCreate(
                        item_id=displacee_db.item_id,
                        name=displacee_db.name,
                        category=displacee_db.category,
                        subcategory=displacee_db.subcategory,
                        width_cm=displacee_db.width_cm,
                        depth_cm=displacee_db.depth_cm,
                        height_cm=displacee_db.height_cm,
                        mass_kg=displacee_db.mass_kg,
                        priority=displacee_db.priority,
                        expiry_date=displacee_db.expiry_date,
                        preferred_zone=displacee_db.preferred_zone,
                        temp_requirement=displacee_db.temp_requirement,
                        lot_number=displacee_db.lot_number,
                        orientation_allowed=displacee_db.orientation_allowed,
                        hazardous_class=displacee_db.hazardous_class,
                        tags_id=displacee_db.tags_id,
                        maximum_uses=displacee_db.maximum_uses,
                        usage_frequency=displacee_db.usage_frequency,
                        current_uses=displacee_db.current_uses,
                        usage_remaining=displacee_db.usage_remaining
                    )
                    
                    # Try to find a new home for this displaced item
                    for target_container_id in container_ids:
                        if target_container_id == source_container_id: continue # Don't put back in same container
                            
                        target_container = containers_data[target_container_id]
                        current_placements_in_target = temp_placements_by_container.get(target_container_id, [])
                        
                        # Check if this target container can accommodate the displaced item
                        spot_info_displacee = find_spot_in_container(
                            displacee_item, target_container, current_placements_in_target, False
                        )
                        
                        if spot_info_displacee:
                            displacee_start, displacee_end, _ = spot_info_displacee
                            
                            # Update simulation state
                            temp_placements_by_container.setdefault(target_container_id, []).append(
                                (displacee_id, displacee_start, displacee_end)
                            )
                            
                            # Record the move
                            displacement_moves.append(RearrangementStep(
                                item_id=displacee_id,
                                from_container_id=source_container_id,
                                to_container_id=target_container_id,
                                from_position=displacee["fromPosition"],
                                to_position=Position(startCoordinates=displacee_start, endCoordinates=displacee_end),
                                reason=f"Displaced by higher priority item {high_prio_item.item_id}"
                            ))
                            
                            relocated = True
                            print(f"      Relocated {displacee_id} to {target_container_id}")
                            break
                            
                    if not relocated:
                        print(f"      FAILED to relocate {displacee_id}. Aborting displacement strategy.")
                        displacement_success = False
                        break
                
                if displacement_success:
                    # All displaced items found new homes, now place the high priority item
                    temp_placements_by_container[source_container_id] = temp_container_simulation[source_container_id]
                    temp_placements_by_container[source_container_id].append((high_prio_item.item_id, start_coords, end_coords))
                    
                    # Update the placements result
                    placements_result.append(PlacementResponseItem(
                        item_id=high_prio_item.item_id,
                        container_id=source_container_id,
                        position=Position(startCoordinates=start_coords, endCoordinates=end_coords)
                    ))
                    
                    # Add rearrangement steps to result
                    rearrangements_result.extend(displacement_moves)
                    
                    processed_item_ids.add(high_prio_item.item_id)
                    rearrangement_successful = True
                    print(f"    SUCCESS (Phase 2 Rearrangement): Placed {high_prio_item.item_id} after displacing {len(displacement_moves)} items")
                    break
                else:
                    # Reset simulation state for this attempt
                    temp_placements_by_container = {cid: list(placements) for cid, placements in temp_placements_by_container.items()}
        
        if not rearrangement_successful:
            print(f"    Could not rearrange items for {high_prio_item.item_id}. Moving to Pass 3.")
            items_requiring_placement_pass_3.append(high_prio_item)

    # ==============================================================================
    # == Phase 3: Final Placement Attempt (Non-Preferred Zones) ===================
    # ==============================================================================
    print("\n--- Phase 3: Final Placement in Non-Preferred Zones ---")
    
    for item_req in items_requiring_placement_pass_3:
        if item_req.item_id in processed_item_ids: continue # Skip if already handled
        
        print(f"Final attempt for: {item_req.item_id} (Prio: {item_req.priority})")
        placed = False

        # Try all containers (not just preferred)
        for container_id in container_ids:
            if container_id not in containers_data: continue
            container = containers_data[container_id]
            current_placements_in_container = temp_placements_by_container.get(container_id, [])

            spot_info = find_spot_in_container(item_req, container, current_placements_in_container, False)
            if spot_info:
                start_coords, end_coords, _ = spot_info
                position = Position(startCoordinates=start_coords, endCoordinates=end_coords)
                
                # Update simulation state
                temp_placements_by_container.setdefault(container_id, []).append(
                    (item_req.item_id, start_coords, end_coords)
                )
                # Add to final results list
                placements_result.append(PlacementResponseItem(
                    item_id=item_req.item_id, container_id=container_id, position=position
                ))
                processed_item_ids.add(item_req.item_id)
                print(f"    SUCCESS (Phase 3): Placed {item_req.item_id} in NON-PREFERRED {container_id} at {start_coords}")
                placed = True
                break # Stop trying containers for this item

        if not placed:
            print(f"    !!! PLACEMENT FAILED COMPLETELY for item {item_req.item_id} !!!")
            items_failed_completely.append(item_req.item_id)
            processed_item_ids.add(item_req.item_id) # Mark as processed (failed)

    print(f"--- End Simulation Phases --- Failed items: {items_failed_completely}")

    # ==============================================================================
    # == Phase 4: Persistence & Logging ============================================
    # ==============================================================================
    print("\n--- Phase 4: Persisting Changes to Database ---")
    # `placements_result` holds the final state for successfully placed/moved items.
    # `rearrangements_result` holds the moves simulated.
    # We now translate this final state into DB operations.

    final_placements_for_response: List[PlacementResponseItem] = [] # Holds placements successfully saved to DB

    try:
        # --- Step 4.1: Upsert Containers with Enhanced Fields ---
        print("  Syncing container definitions...")
        for container_id, container_req in containers_data.items():
            container_db = db.query(Container).filter(Container.container_id == container_id).first()
            if not container_db:
                # Create new container with enhanced fields
                container_data = {
                    'container_id': container_req.container_id,
                    'name': container_req.name,
                    'type': container_req.type,
                    'zone': container_req.zone,
                    'module_id': container_req.module_id,
                    'width_cm': container_req.width_cm,
                    'depth_cm': container_req.depth_cm,
                    'height_cm': container_req.height_cm,
                    'open_face': container_req.open_face,
                    'max_mass': container_req.max_mass,
                    'access_index': container_req.access_index,
                    'parent_container_id': container_req.parent_container_id,
                    'description': container_req.description,
                    'current_mass': 0.0,
                    'is_active': True,
                    'created_at': datetime.now(timezone.utc),
                    'last_accessed': datetime.now(timezone.utc)
                }
                container_db = Container(**container_data)
                db.add(container_db)
                
                # Log container creation
                create_log_entry(
                    db=db,
                    action_type=LogActionType.IMPORT,
                    user_id=user_id,
                    container_id=container_id,
                    details={
                        'action': 'container_created',
                        'type': container_req.type.value,
                        'zone': container_req.zone,
                        'dimensions': f"{container_req.width_cm}x{container_req.depth_cm}x{container_req.height_cm}"
                    },
                    action_category='container_management',
                    location=container_req.zone,
                    success=True
                )
            else: 
                # Update existing container if needed
                changed = False
                if container_db.zone != container_req.zone: 
                    container_db.zone = container_req.zone; changed=True
                if abs(container_db.width_cm - container_req.width_cm) > 1e-6: 
                    container_db.width_cm = container_req.width_cm; changed=True
                if abs(container_db.depth_cm - container_req.depth_cm) > 1e-6: 
                    container_db.depth_cm = container_req.depth_cm; changed=True
                if abs(container_db.height_cm - container_req.height_cm) > 1e-6: 
                    container_db.height_cm = container_req.height_cm; changed=True
                
                # Update last accessed time
                container_db.last_accessed = datetime.now(timezone.utc)
                if changed: 
                    db.add(container_db)
                    # Log container update
                    create_log_entry(
                        db=db,
                        action_type=LogActionType.IMPORT,
                        user_id=user_id,
                        container_id=container_id,
                        details={
                            'action': 'container_updated',
                            'changes': 'dimensions or zone updated'
                        },
                        action_category='container_management',
                        location=container_req.zone,
                        success=True
                    )

        # --- Step 4.2: Process Final Placements (Upsert Items & Placements) ---
        print("  Processing final placements and items...")
        processed_db_items = set() # Track items handled in this persistence loop

        for final_placement in placements_result:
            item_id = final_placement.item_id
            container_id = final_placement.container_id
            position = final_placement.position

            # Skip items that ultimately failed (shouldn't be in placements_result if logic above is correct, but double check)
            if item_id in items_failed_completely: continue

            processed_db_items.add(item_id)

            # --- 4.2.1: Handle Item Record ---
            item_db = db.query(Item).filter(Item.item_id == item_id).first()
            log_action_type = None # Determined by placement logic below
            log_details = {"container_id": container_id, "position": position.dict()} # Base details

            if not item_db: # Item is NEW
                item_req_data = incoming_items_dict.get(item_id)
                if not item_req_data: # Should not happen
                    print(f"    CRITICAL ERROR: Request data missing for new item {item_id}. Skipping.")
                    continue
                print(f"    Creating new item record: {item_id}")
                
                # Create item with enhanced fields
                item_data = {
                    'item_id': item_req_data.item_id,
                    'name': item_req_data.name,
                    'category': item_req_data.category,
                    'subcategory': item_req_data.subcategory,
                    'width_cm': item_req_data.width_cm,
                    'depth_cm': item_req_data.depth_cm,
                    'height_cm': item_req_data.height_cm,
                    'mass_kg': item_req_data.mass_kg,
                    'temp_requirement': item_req_data.temp_requirement,
                    'lot_number': item_req_data.lot_number,
                    'current_location': container_id,
                    'orientation_allowed': item_req_data.orientation_allowed,
                    'hazardous_class': item_req_data.hazardous_class,
                    'tags_id': item_req_data.tags_id,
                    'priority': item_req_data.priority,
                    'expiry_date': item_req_data.expiry_date,
                    'maximum_uses': item_req_data.maximum_uses,
                    'current_uses': item_req_data.current_uses,
                    'usage_remaining': item_req_data.usage_remaining,
                    'usage_frequency': item_req_data.usage_frequency,
                    'preferred_zone': item_req_data.preferred_zone,
                    'status': ItemStatus.ACTIVE
                }
                item_db = Item(**item_data)
                db.add(item_db)
                log_action_type = LogActionType.PLACEMENT # Log as placement of new item
                
                # Log item creation with enhanced details
                create_log_entry(
                    db=db,
                    action_type=LogActionType.IMPORT,
                    user_id=user_id,
                    item_id=item_id,
                    container_id=container_id,
                    details={
                        'action': 'item_created',
                        'category': item_req_data.category,
                        'subcategory': item_req_data.subcategory,
                        'temp_requirement': item_req_data.temp_requirement.value,
                        'hazardous_class': item_req_data.hazardous_class.value,
                        'mass_kg': item_req_data.mass_kg,
                        'priority': item_req_data.priority
                    },
                    action_category='item_management',
                    location=container.zone if container else None,
                    success=True
                )
            else: # Item EXISTS
                # Update item status and location
                previous_status = item_db.status
                previous_location = item_db.current_location
                
                if item_db.status != ItemStatus.ACTIVE:
                    print(f"    Marking existing item {item_id} as ACTIVE (was {item_db.status.value})")
                    item_db.status = ItemStatus.ACTIVE
                
                # Update current location
                item_db.current_location = container_id
                db.add(item_db)
                
                # Log status/location change if needed
                if previous_status != ItemStatus.ACTIVE or previous_location != container_id:
                    create_log_entry(
                        db=db,
                        action_type=LogActionType.UPDATE_LOCATION,
                        user_id=user_id,
                        item_id=item_id,
                        container_id=container_id,
                        details={
                            'action': 'item_status_location_updated',
                            'previous_status': previous_status.value if previous_status else None,
                            'new_status': ItemStatus.ACTIVE.value,
                            'previous_location': previous_location,
                            'new_location': container_id
                        },
                        action_category='item_management',
                        location=container.zone if container else None,
                        success=True
                    )

            # --- 4.2.2: Handle Placement Record ---
            existing_placement_db = db.query(Placement).filter(Placement.item_id_fk == item_id).first()

            if existing_placement_db: # Placement record exists, check for MOVE/UPDATE
                log_details["fromContainer"] = existing_placement_db.container_id_fk
                log_details["fromPosition"] = Position(
                    startCoordinates=Coordinates(width=existing_placement_db.start_w, depth=existing_placement_db.start_d, height=existing_placement_db.start_h),
                    endCoordinates=Coordinates(width=existing_placement_db.end_w, depth=existing_placement_db.end_d, height=existing_placement_db.end_h)
                ).dict()

                # Check if the final placement differs from the existing DB record
                if (existing_placement_db.container_id_fk != container_id or
                    abs(existing_placement_db.start_w - position.startCoordinates.width) > 1e-6 or
                    abs(existing_placement_db.start_d - position.startCoordinates.depth) > 1e-6 or
                    abs(existing_placement_db.start_h - position.startCoordinates.height) > 1e-6 or
                    abs(existing_placement_db.end_w - position.endCoordinates.width) > 1e-6 or
                    abs(existing_placement_db.end_d - position.endCoordinates.depth) > 1e-6 or
                    abs(existing_placement_db.end_h - position.endCoordinates.height) > 1e-6):
                    print(f"    Updating placement (Move) for item: {item_id} -> {container_id}")
                    # Update the existing Placement object
                    existing_placement_db.container_id_fk = container_id
                    existing_placement_db.start_w = position.startCoordinates.width; existing_placement_db.start_d = position.startCoordinates.depth; existing_placement_db.start_h = position.startCoordinates.height
                    existing_placement_db.end_w = position.endCoordinates.width; existing_placement_db.end_d = position.endCoordinates.depth; existing_placement_db.end_h = position.endCoordinates.height
                    db.add(existing_placement_db)
                    if log_action_type is None: log_action_type = LogActionType.REARRANGEMENT # Log specifically as move
                else:
                    # Placement record exists but matches final state - no DB update needed for Placement
                    print(f"    Placement unchanged in DB for existing item: {item_id}")
                    if log_action_type is None: log_action_type = LogActionType.PLACEMENT # Log as placement confirmation if item wasn't new

            else: # No Placement record exists, CREATE it
                print(f"    Creating new placement record for item: {item_id} in {container_id}")
                new_placement = Placement(
                    item_id_fk=item_id, container_id_fk=container_id,
                    start_w=position.startCoordinates.width, start_d=position.startCoordinates.depth, start_h=position.startCoordinates.height,
                    end_w=position.endCoordinates.width, end_d=position.endCoordinates.depth, end_h=position.endCoordinates.height
                )
                db.add(new_placement)
                if log_action_type is None: log_action_type = LogActionType.PLACEMENT # Should already be set if item was new

            # --- 4.2.3: Log the Action with Enhanced Logging ---
            if log_action_type: # Only log if an action was determined
                # Use enhanced logging service for better analytics
                log_entry = create_log_entry(
                    db=db,
                    action_type=log_action_type,
                    user_id=user_id,
                    item_id=item_id,
                    container_id=container_id,
                    details=log_details,
                    action_category='placement',
                    location=container.zone if container else None,
                    success=True,
                    timestamp=datetime.now(timezone.utc)
                )

            # Add to the list returned in the response *after* successful processing for persistence
            final_placements_for_response.append(final_placement)

        # --- Step 4.3: Handle Items That Failed Placement ---
        print("  Handling items that failed placement...")
        for failed_item_id in items_failed_completely:
             if failed_item_id not in processed_db_items: # Process only if not handled above
                item_db = db.query(Item).filter(Item.item_id == failed_item_id).first()
                log_details_fail = {"status": "FAILED", "reason": "Insufficient space or rearrangement constraints"}

                if not item_db: # Create item record even if placement failed
                     item_req_data = incoming_items_dict.get(failed_item_id)
                     if item_req_data:
                         print(f"    Creating item record for FAILED placement: {failed_item_id}")
                         item_data = {
                             'item_id': item_req_data.item_id,
                             'name': item_req_data.name,
                             'category': item_req_data.category,
                             'subcategory': item_req_data.subcategory,
                             'width_cm': item_req_data.width_cm,
                             'depth_cm': item_req_data.depth_cm,
                             'height_cm': item_req_data.height_cm,
                             'mass_kg': item_req_data.mass_kg,
                             'temp_requirement': item_req_data.temp_requirement,
                             'lot_number': item_req_data.lot_number,
                             'orientation_allowed': item_req_data.orientation_allowed,
                             'hazardous_class': item_req_data.hazardous_class,
                             'tags_id': item_req_data.tags_id,
                             'priority': item_req_data.priority,
                             'expiry_date': item_req_data.expiry_date,
                             'maximum_uses': item_req_data.maximum_uses,
                             'current_uses': item_req_data.current_uses,
                             'usage_remaining': item_req_data.usage_remaining,
                             'usage_frequency': item_req_data.usage_frequency,
                             'preferred_zone': item_req_data.preferred_zone,
                             'status': ItemStatus.ACTIVE
                         }
                         item_db = Item(**item_data)
                         db.add(item_db)
                         # Log the FAILED PLACEMENT attempt with enhanced logging
                         log_entry = create_log_entry(
                             db=db,
                             action_type=LogActionType.PLACEMENT,
                             user_id=user_id,
                             item_id=failed_item_id,
                             details=log_details_fail,
                             action_category='placement',
                             success=False,
                             error_message="Placement failed - insufficient space or rearrangement constraints",
                             timestamp=datetime.now(timezone.utc)
                         )
                else: # Item exists, just log the placement failure
                     print(f"    Logging placement failure for existing item: {failed_item_id}")
                     log_entry = create_log_entry(
                         db=db,
                         action_type=LogActionType.PLACEMENT,
                         user_id=user_id,
                         item_id=failed_item_id,
                         details=log_details_fail,
                         action_category='placement',
                         success=False,
                         error_message="Placement failed - insufficient space or rearrangement constraints",
                         timestamp=datetime.now(timezone.utc)
                     )

        # --- Step 4.4: Commit Transaction ---
        print("  Committing transaction...")
        db.commit()
        print("--- DB Commit Successful ---")

    except Exception as e:
        db.rollback() # Roll back any changes made in this transaction
        print(f"!!!!!!!! Database Commit Error: {e} !!!!!!!!")
        import traceback
        traceback.print_exc()
        # Return error response, indicating DB failure
        return PlacementResponse(
            success=False,
            error=f"Database commit failed: {str(e)}",
            placements=[], # Return empty lists on DB failure
            rearrangements=[]
        )

    # ==============================================================================
    # == Phase 5: Format and Return Response =======================================
    # ==============================================================================
    print("\n--- Phase 5: Formatting Response ---")
    final_success = not items_failed_completely # Success is true only if NO items failed
    error_msg = None
    if items_failed_completely:
        error_msg = f"Placement incomplete. Could not place items: {', '.join(items_failed_completely)}"
        print(f"WARNING: {error_msg}")

    # Return the placements successfully persisted, the simulated rearrangements, and status
    return PlacementResponse(
        success=final_success,
        error=error_msg,
        placements=final_placements_for_response, # Only those successfully processed
        rearrangements=rearrangements_result
    )