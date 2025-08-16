# /app/placement_service.py

import json
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple, Set

# --- Import DB models defined in models_db.py ---
# Ensure this path is correct relative to where this service file is located.
from app.models_db import (
    Item, Container, Placement, Log, LogActionType, ItemStatus
)
# --- Import API models (ensure compatibility) ---
# Ensure this path is correct.
from app.models_api import (
    PlacementRequest, PlacementResponse, PlacementResponseItem,
    RearrangementStep, Coordinates, Position, ItemCreate, ContainerCreate
)

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

# ==============================================================================
# == Core Placement Finding Logic ==============================================
# ==============================================================================

def find_spot_in_container(
    item_req: ItemCreate,  # Item dimensions and properties
    container: ContainerCreate,  # Container dimensions
    current_placements_in_container: List[Tuple[str, Coordinates, Coordinates]], # Current simulation state (itemId, start, end)
    is_high_priority: bool # Hint for placement strategy (shallow vs. deep)
) -> Optional[Tuple[Coordinates, Coordinates, Tuple[float, float, float]]]:
    """
    Tries to find a valid placement spot (position and orientation) for the item
    within the given container, avoiding overlaps with existing items.

    Args:
        item_req: The item to place.
        container: The container to place into.
        current_placements_in_container: List representing items already in the container simulation.
        is_high_priority: If True, prefers placements closer to the front (lower depth).

    Returns:
        A tuple (start_coords, end_coords, orientation_used) if a spot is found, otherwise None.
        Uses rounding to mitigate floating point issues during checks.
    """
    # Possible orientations (width_cm, depth_cm, height_cm)
    orientations = [
        (item_req.width_cm, item_req.depth_cm, item_req.height_cm), (item_req.width_cm, item_req.height_cm, item_req.depth_cm),
        (item_req.depth_cm, item_req.width_cm, item_req.height_cm), (item_req.depth_cm, item_req.height_cm, item_req.width_cm),
        (item_req.height_cm, item_req.width_cm, item_req.depth_cm), (item_req.height_cm, item_req.depth_cm, item_req.width_cm),
    ]
    precision = 3 # Decimal places for coordinate rounding and checks

    for w, d, h in orientations:
        # Basic check: Does the orientation even fit within the container dimensions?
        if w > container.width_cm + 1e-6 or d > container.depth_cm + 1e-6 or h > container.height_cm + 1e-6:
            continue

        # --- Define Search Strategy ---
        # Potential base heights: floor (0.0) and tops of existing items in the container
        possible_base_heights = sorted(list(set([0.0] + [round(p[2].height, precision) for p in current_placements_in_container])))

        # Define search increments (smaller means more thorough but slower)
        width_increment = max(container.width_cm / 20, 0.05)
        depth_increment = max(container.depth_cm / 20, 0.05)

        # Define search order for depth based on priority
        search_depths = [round(i * depth_increment, precision) for i in range(int(container.depth_cm / depth_increment) + 3)] # Added buffer
        if not is_high_priority: # Low priority: try deeper spots first (less accessible)
            search_depths.reverse()
        # High priority items implicitly try shallow depths first due to normal iteration order.

        # --- Iterate through potential starting points (Height -> Depth -> Width) ---
        for start_h_base in possible_base_heights:
            start_h = round(start_h_base, precision)
            # Check height boundary early: can item fit vertically from this base height?
            if start_h + h > container.height_cm + 1e-6:
                continue

            for start_d in search_depths:
                # Check depth boundary early: can item fit depth-wise from this starting depth?
                if start_d + d > container.depth_cm + 1e-6:
                    continue

                search_widths = [round(i * width_increment, precision) for i in range(int(container.width_cm / width_increment) + 3)] # Added buffer
                for start_w in search_widths:
                    # Check width boundary early: can item fit width-wise from this starting width?
                    if start_w + w > container.width_cm + 1e-6:
                        continue

                    # --- Candidate Spot Found - Validate ---
                    start_coords = Coordinates(width=start_w, depth=start_d, height=start_h)
                    end_coords = Coordinates(
                        width=round(start_w + w, precision),
                        depth=round(start_d + d, precision),
                        height=round(start_h + h, precision)
                    )

                    # 1. Precise Boundary Check (ensure calculated end coords are within container)
                    if (end_coords.width > container.width_cm + 1e-6 or
                        end_coords.depth > container.depth_cm + 1e-6 or
                        end_coords.height > container.height_cm + 1e-6):
                        continue

                    # 2. Overlap Check (compare against ALL other items currently in simulation for this container)
                    overlaps = False
                    for _, p_start, p_end in current_placements_in_container:
                        if boxes_overlap(start_coords, end_coords, p_start, p_end):
                            overlaps = True
                            break # No need to check further items if overlap found
                    if overlaps:
                        continue # Try the next potential spot (width, depth, height, or orientation)

                    # 3. Stability Check (Simplified)
                    #    - Must be on the floor (start_h near 0) OR
                    #    - Must have its base sufficiently supported by item(s) below.
                    #    This simplified check verifies if start_h matches the top of *any* existing item below
                    #    and if there's *some* horizontal overlap. A truly robust check would calculate
                    #    the percentage of the base area supported.
                    is_on_floor = abs(start_h) < 1e-6
                    is_supported = False
                    if not is_on_floor:
                        for p_itemId, p_start, p_end in current_placements_in_container:
                            # Check if this existing item's top matches the candidate's base height
                            if abs(p_end.height - start_h) < 1e-6:
                                # Check for horizontal overlap between the candidate base and the supporting item's top
                                base_start_w, base_end_w = start_w, end_coords.width
                                base_start_d, base_end_d = start_d, end_coords.depth
                                support_start_w, support_end_w = p_start.width, p_end.width
                                support_start_d, support_end_d = p_start.depth, p_end.depth

                                # Check if the horizontal bounding boxes overlap at all
                                if not (base_end_w <= support_start_w + 1e-6 or support_end_w <= base_start_w + 1e-6 or
                                        base_end_d <= support_start_d + 1e-6 or support_end_d <= base_start_d + 1e-6):
                                    is_supported = True
                                    break # Found at least one supporting item below
                    if not is_on_floor and not is_supported:
                        # print(f"      Stability check failed: start_h {start_h} not on floor or supported.") # Debug
                        continue # Skip floating positions

                    # --- All Checks Passed: Valid Spot Found! ---
                    # print(f"    Found spot for orientation ({w:.3f},{d:.3f},{h:.3f}) at {start_coords}") # Debug
                    return start_coords, end_coords, (w, d, h) # Return found spot and the orientation used

    # print(f"    No suitable spot found in container {container.containerId} for item {item_req.itemId} with any orientation.") # Debug
    return None # No valid spot found in this container for any orientation

# ==============================================================================
# == Main Placement Service Function ===========================================
# ==============================================================================

def suggest_placements(db: Session, request_data: PlacementRequest, user_id: Optional[str]) -> PlacementResponse:
    """
    Suggests placements for new items, handles priority, rearrangements,
    and persists ALL changes (Items, Containers, Placements) to the database
    using the models defined in models_db.py. Logs actions.

    Process:
    1. Load existing state (placements, priorities) from DB.
    2. Simulate initial placement of new items into preferred zones.
    3. Simulate rearrangement of lower-priority items if needed for high-priority items.
    4. Simulate final placement attempt for remaining items in any available space.
    5. Persist the final simulated state (creations, updates, moves) to the database.
    6. Log all relevant actions (placement, rearrangement, failure).
    7. Return the results (placements, rearrangements, success status).
    """

    # --- Phase 0: Initialization & Data Loading ---
    print("--- Phase 0: Initializing ---")
    placements_result: List[PlacementResponseItem] = [] # Stores the *final* intended placement state for response
    rearrangements_result: List[RearrangementStep] = [] # Stores required move actions for response
    processed_item_ids: Set[str] = set() # Tracks items handled (placed or failed) during simulation
    items_failed_completely: List[str] = [] # Tracks items that could not be placed by the end

    # Prepare input data for easy access
    incoming_items_dict = {item.item_id: item for item in request_data.items}
    # Process new items in descending priority order
    sorted_incoming_items = sorted(request_data.items, key=lambda x: x.priority, reverse=True)
    # Container definitions from the request
    containers_data = {c.container_id: c for c in request_data.containers}
    container_ids = list(containers_data.keys())

    # Load current placements from DB for the relevant containers
    db_placements_by_container = get_current_placements_dict(db, container_ids)

    # Build in-memory simulation state (ContainerId -> List[Tuple[ItemId, StartCoords, EndCoords]])
    # This state will be modified during the placement and rearrangement phases.
    temp_placements_by_container: Dict[str, List[Tuple[str, Coordinates, Coordinates]]] = {cid: [] for cid in container_ids}
    existing_item_ids_in_db_placements = set()

    for cid, placements_list in db_placements_by_container.items():
        for p in placements_list:
            start_coords = Coordinates(width=p.start_w, depth=p.start_d, height=p.start_h)
            end_coords = Coordinates(width=p.end_w, depth=p.end_d, height=p.end_h)
            temp_placements_by_container[cid].append((p.item_id_fk, start_coords, end_coords))
            existing_item_ids_in_db_placements.add(p.item_id_fk)

    # Load priorities of existing items currently placed in these containers
    existing_item_priorities = get_item_priorities(db, list(existing_item_ids_in_db_placements))
    print(f"Loaded current state: {len(existing_item_ids_in_db_placements)} existing items in {len(container_ids)} containers.")

    # --- Phase 1: Initial Placement Attempt (Preferred Zones First) ---
    print("\n--- Phase 1: Attempting Preferred Zone Placements ---")
    items_requiring_placement_pass_2: List[ItemCreate] = [] # Items needing rearrangement or non-preferred placement

    for item_req in sorted_incoming_items:
        if item_req.item_id in processed_item_ids: continue # Skip if already handled (e.g., placed during rearrangement)

        print(f"Processing item: {item_req.item_id} (Priority: {item_req.priority}, PrefZone: {item_req.preferred_zone})")
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

# --- Replace/Update Phase 2 in your suggest_placements function ---

    # --- Phase 2: Rearrangement Simulation ---
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
        for container_id in preferred_container_ids:
            current_container_placements = temp_placements_by_container.get(container_id, [])
            
            # Create a simulation state without any items that are less important than our target
            # This helps check if removing those items would make enough space
            for existing_item_id, start_coords, end_coords in current_container_placements:
                # Only consider existing items with known priorities that are lower than our target
                if existing_item_id in existing_item_priorities and existing_item_priorities[existing_item_id] < high_prio_item.priority:
                    all_potential_displacees.append({
                        "item_id": existing_item_id,
                        "priority": existing_item_priorities[existing_item_id],
                        "fromContainerId": container_id,
                        "fromPosition": Position(startCoordinates=start_coords, endCoordinates=end_coords)
                    })
        
        # Sort potential displacees by priority (lowest first)
        all_potential_displacees.sort(key=lambda x: x["priority"])
        
        if not all_potential_displacees:
            print(f"    No displaceable items found for {high_prio_item.item_id}. Moving to Pass 3.")
            items_requiring_placement_pass_3.append(high_prio_item)
            continue
        
        print(f"    Found {len(all_potential_displacees)} potential items to displace")
        
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
                        
                    displacee_item = ItemCreate(**displacee_db.__dict__)
                    
                    # Try placing in containers with most space first
                    for target_container_id, _ in target_containers:
                        if target_container_id == source_container_id:
                            continue  # Don't try the container we're removing from
                            
                        target_container = containers_data[target_container_id]
                        current_target_placements = temp_placements_by_container.get(target_container_id, [])
                        
                        # Try to find spot
                        relocated_spot = find_spot_in_container(
                            displacee_item, 
                            target_container, 
                            current_target_placements,
                            False  # Lower priority placement strategy 
                        )
                        
                        if relocated_spot:
                            # Found a spot for this displacee
                            new_start, new_end, _ = relocated_spot
                            
                            # Record the move
                            rearrangement_step_counter += 1
                            move = RearrangementStep(
                                step=rearrangement_step_counter,
                                action="move",
                                item_id=displacee_id,
                                fromContainer=source_container_id,
                                fromPosition=displacee["fromPosition"],
                                toContainer=target_container_id,
                                toPosition=Position(
                                    startCoordinates=new_start,
                                    endCoordinates=new_end
                                )
                            )
                            displacement_moves.append(move)
                            
                            # Update simulation state for next items
                            temp_placements_by_container.setdefault(target_container_id, []).append(
                                (displacee_id, new_start, new_end)
                            )
                            
                            relocated = True
                            break  # Found a spot for this item
                            
                    if not relocated:
                        print(f"      Could not relocate {displacee_id}. Rearrangement failed.")
                        displacement_success = False
                        break
                
                # If all displacements worked, place the high-priority item
                if displacement_success:
                    # Add all the rearrangement steps
                    rearrangements_result.extend(displacement_moves)
                    
                    # Place the high priority item
                    hp_position = Position(startCoordinates=start_coords, endCoordinates=end_coords)
                    placements_result.append(PlacementResponseItem(
                        item_id=high_prio_item.item_id,
                        container_id=source_container_id,
                        position=hp_position
                    ))
                    
                    # Update simulation state
                    temp_placements_by_container[source_container_id].append(
                        (high_prio_item.item_id, start_coords, end_coords)
                    )
                    
                    processed_item_ids.add(high_prio_item.item_id)
                    rearrangement_done_for_this_item = True
                    rearrangement_successful = True
                    
                    print(f"    SUCCESS (Phase 2): Completed rearrangement for {high_prio_item.item_id}")
                    
                    # Update tracking for the displaced items
                    for move in displacement_moves:
                        for i, p_item in enumerate(placements_result):
                            if p_item.item_id == move.item_id:
                                placements_result[i] = PlacementResponseItem(
                                    item_id=move.item_id,
                                    container_id=move.toContainer,
                                    position=move.toPosition
                                )
                                break
                        else:
                            # If item wasn't already in placements, add it
                            placements_result.append(PlacementResponseItem(
                                item_id=move.item_id,
                                container_id=move.toContainer,
                                position=move.toPosition
                            ))
                    
                    break  # Successfully placed, don't try more container displacement strategies
                else:
                    # Rearrangement attempt failed - restore simulation state
                    print("      Rearrangement attempt failed. Restoring state.")
                    temp_placements_by_container = temp_placements_by_container.copy()  # Reset to original
        
        # Try individual item displacement if container-level displacement failed
        if not rearrangement_successful and not rearrangement_done_for_this_item:
            # If displacing entire container didn't work, try individual items
            for displacee_data in all_potential_displacees:
                processed_individual_rearrangement = False
                low_prio_item_id = displacee_data["item_id"]
                source_container_id = displacee_data["fromContainerId"]
                
                print(f"    Trying individual displacement of {low_prio_item_id}")
                
                # Verify this item exists
                low_prio_item_db = db.query(Item).filter(Item.item_id == low_prio_item_id).first()
                if not low_prio_item_db:
                    print(f"      ERROR: Missing DB data for {low_prio_item_id}. Skipping.")
                    continue
                    
                # Convert to ItemCreate format for our placement logic
                low_prio_item = ItemCreate(**low_prio_item_db.__dict__)
                
                # Create a temporary simulation state with this item removed
                temp_container_sim = temp_placements_by_container.copy()
                temp_container_sim[source_container_id] = [
                    p for p in temp_container_sim[source_container_id] 
                    if p[0] != low_prio_item_id
                ]
                
                # Does the high priority item fit now?
                container = containers_data[source_container_id]
                spot_info = find_spot_in_container(
                    high_prio_item, 
                    container, 
                    temp_container_sim[source_container_id], 
                    True
                )
                
                if spot_info:
                    # Found a spot if we remove this item. Now try to relocate it.
                    print(f"      Found spot for {high_prio_item.item_id} if {low_prio_item_id} is moved")
                    relocated = False
                    
                    # Try to relocate the displacee to any other container
                    for target_container_id, _ in target_containers:
                        if target_container_id == source_container_id:
                            continue
                            
                        target_container = containers_data[target_container_id]
                        current_target_placements = temp_placements_by_container.get(target_container_id, [])
                        
                        relocated_spot = find_spot_in_container(
                            low_prio_item, 
                            target_container, 
                            current_target_placements,
                            False
                        )
                        
                        if relocated_spot:
                            new_start, new_end, _ = relocated_spot
                            new_position = Position(
                                startCoordinates=new_start, 
                                endCoordinates=new_end
                            )
                            
                            # Record the move
                            rearrangement_step_counter += 1
                            move = RearrangementStep(
                                step=rearrangement_step_counter,
                                action="move",
                                item_id=low_prio_item_id,
                                fromContainer=source_container_id,
                                fromPosition=displacee_data["fromPosition"],
                                toContainer=target_container_id,
                                toPosition=new_position
                            )
                            rearrangements_result.append(move)
                            
                            # Update simulation state
                            temp_placements_by_container[source_container_id] = [
                                p for p in temp_placements_by_container[source_container_id] 
                                if p[0] != low_prio_item_id
                            ]
                            temp_placements_by_container.setdefault(target_container_id, []).append(
                                (low_prio_item_id, new_start, new_end)
                            )
                            
                            # Update placements_result for the moved item
                            for i, p_item in enumerate(placements_result):
                                if p_item.item_id == low_prio_item_id:
                                    placements_result[i] = PlacementResponseItem(
                                        item_id=low_prio_item_id,
                                        container_id=target_container_id,
                                        position=new_position
                                    )
                                    break
                            else:
                                placements_result.append(PlacementResponseItem(
                                    item_id=low_prio_item_id,
                                    container_id=target_container_id,
                                    position=new_position
                                ))
                            
                            # Now place the high priority item
                            hp_start, hp_end, _ = spot_info
                            hp_position = Position(
                                startCoordinates=hp_start, 
                                endCoordinates=hp_end
                            )
                            
                            placements_result.append(PlacementResponseItem(
                                item_id=high_prio_item.item_id,
                                container_id=source_container_id,
                                position=hp_position
                            ))
                            
                            temp_placements_by_container[source_container_id].append(
                                (high_prio_item.item_id, hp_start, hp_end)
                            )
                            
                            processed_item_ids.add(high_prio_item.item_id)
                            rearrangement_done_for_this_item = True
                            processed_individual_rearrangement = True
                            
                            print(f"      SUCCESS (Phase 2): Moved {low_prio_item_id} to {target_container_id}")
                            print(f"                         Placed {high_prio_item.item_id} in {source_container_id}")
                            break  # Successfully placed high priority item
                    
                    if processed_individual_rearrangement:
                        break  # Exit the displacee loop if we successfully processed
                
        # If rearrangement logic didn't work for this item, try again in final phase
        if not rearrangement_done_for_this_item:
            print(f"    All rearrangement attempts failed for {high_prio_item.item_id}. Moving to Phase 3.")
            items_requiring_placement_pass_3.append(high_prio_item)

    # --- Phase 3: Final Placement Attempt (Anywhere) ---
    print("\n--- Phase 3: Final Placement Attempt (Anywhere) ---")
    items_for_final_pass = list(items_requiring_placement_pass_3) # Items needing non-preferred spots

    for item_req in items_for_final_pass:
        if item_req.item_id in processed_item_ids: continue # Already handled

        print(f"Attempting final placement for: {item_req.item_id}")
        placed = False
        is_high_prio = item_req.priority >= 75

        # Try all containers based on the current simulation state
        for container_id in container_ids:
            if container_id not in containers_data: continue
            container = containers_data[container_id]
            current_placements_in_container = temp_placements_by_container.get(container_id, [])

            spot_info = find_spot_in_container(item_req, container, current_placements_in_container, is_high_prio)

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
        # --- Step 4.1: Upsert Containers ---
        print("  Syncing container definitions...")
        for container_id, container_req in containers_data.items():
            container_db = db.query(Container).filter(Container.container_id == container_id).first()
            if not container_db:
                container_db = Container(**container_req.dict()) # Create from API model
                db.add(container_db)
            else: # Update existing if needed
                changed = False
                if container_db.zone != container_req.zone: container_db.zone = container_req.zone; changed=True
                if abs(container_db.width_cm - container_req.width_cm) > 1e-6: container_db.width_cm = container_req.width_cm; changed=True
                if abs(container_db.depth_cm - container_req.depth_cm) > 1e-6: container_db.depth_cm = container_req.depth_cm; changed=True
                if abs(container_db.height_cm - container_req.height_cm) > 1e-6: container_db.height_cm = container_req.height_cm; changed=True
                if changed: db.add(container_db) # Mark for update only if changed

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
                item_db = Item(**item_req_data.dict(exclude_none=True), status=ItemStatus.ACTIVE)
                db.add(item_db)
                log_action_type = LogActionType.PLACEMENT # Log as placement of new item
            else: # Item EXISTS
                 if item_db.status != ItemStatus.ACTIVE: # Ensure existing item is marked active
                      print(f"    Marking existing item {item_id} as ACTIVE")
                      item_db.status = ItemStatus.ACTIVE
                      db.add(item_db)

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
                    # ... (add checks for all 6 coordinates) ...
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

            # --- 4.2.3: Log the Action ---
            if log_action_type: # Only log if an action was determined
                 log_entry = Log(
                      userId=user_id, actionType=log_action_type, item_id_fk=item_id,
                      details_json=json.dumps(log_details), # Serialize details to JSON string
                      timestamp=datetime.now(timezone.utc)
                  )
                 db.add(log_entry)

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
                         item_db = Item(**item_req_data.dict(exclude_none=True), status=ItemStatus.ACTIVE)
                         db.add(item_db)
                         # Log the FAILED PLACEMENT attempt
                         log_entry = Log(userId=user_id, actionType=LogActionType.PLACEMENT, item_id_fk=failed_item_id,
                                         details_json=json.dumps(log_details_fail), timestamp=datetime.now(timezone.utc))
                         db.add(log_entry)
                else: # Item exists, just log the placement failure
                     print(f"    Logging placement failure for existing item: {failed_item_id}")
                     log_entry = Log(userId=user_id, actionType=LogActionType.PLACEMENT, item_id_fk=failed_item_id,
                                     details_json=json.dumps(log_details_fail), timestamp=datetime.now(timezone.utc))
                     db.add(log_entry)

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