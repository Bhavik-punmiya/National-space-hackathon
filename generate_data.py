# Enhanced Data Generation Script for Space Station Inventory Management
# =======================================================================
# This script generates CSV files compatible with the enhanced database models:
# 1) containers.csv – containers with enhanced management features
# 2) items.csv – inventory items with enhanced properties and lifecycle management
#
# Updated to match enhanced models_db.py with new fields:
# - Temperature requirements, hazardous classification
# - Enhanced usage tracking, lot numbers, tags
# - Container access indices, mass limits, operational status

import random
import math
import pandas as pd
import json
from datetime import datetime, timedelta
from itertools import count

random.seed(42)

# ----------------------------
# ENHANCED ENUMS (from models_db.py)
# ----------------------------

# Temperature Requirements
TEMPERATURE_REQUIREMENTS = ["COLD", "AMBIENT", "WARM", "N/A"]

# Hazardous Classifications  
HAZARDOUS_CLASSES = ["NONE", "FLAMMABLE", "CORROSIVE", "BIOHAZARD", "TOXIC", "RADIOACTIVE", "PRESSURIZED"]

# Container Types
CONTAINER_TYPES = ["CTB", "LOCKER", "RACK_BAY", "FREE_VOLUME", "VEHICLE", "TRASH_BAG", "DRAWER", "CABINET"]

# Item Status Options
ITEM_STATUSES = ["ACTIVE", "IN_USE", "PLANNED", "SCHEDULED", "WASTE_EXPIRED", "WASTE_DEPLETED", "WASTE", "DISPOSED", "LOST", "BROKEN"]

# Access Face Orientations
ACCESS_FACES = ["+X", "+Y", "+Z", "-X", "-Y", "-Z"]

# ----------------------------
# Zones / Bays (from your list)
# ----------------------------
zones = [
    "Airlock",
    "Cockpit",
    "Command_Center",
    "Crew_Quarters",
    "Engine_Bay",
    "Engineering_Bay",
    "External_Storage",
    "Greenhouse",
    "Lab",
    "Life_Support",
    "Maintenance_Bay",
    "Medical_Bay",
    "Power_Bay",
    "Sanitation_Bay",
    "Storage_Bay",
]

# Random container counts per zone (50-100 total containers)
# Each zone gets a random number of containers
zone_container_counts = {}
total_containers = random.randint(50, 100)
remaining_containers = total_containers

# Distribute containers randomly across zones
for i, zone in enumerate(zones):
    if i == len(zones) - 1:  # Last zone gets remaining containers
        zone_container_counts[zone] = remaining_containers
    else:
        # Random number between 1 and remaining containers divided by remaining zones
        max_per_zone = max(1, remaining_containers // (len(zones) - i))
        containers_in_zone = random.randint(1, max_per_zone)
        zone_container_counts[zone] = containers_in_zone
        remaining_containers -= containers_in_zone

print(f"Total containers to generate: {total_containers}")
print("Containers per zone:", zone_container_counts)

# ----------------------------
# Category -> Subcategories
# ----------------------------
categories = {
    "Medical": [
        "Antibiotic_Supply",
        "Emergency_Oxygen_Mask",
        "First_Aid_Kit",
        "Medical_Scanner",
    ],
    "Food": [
        "Food_Packet",
        "Protein_Bars",
        "Water_Bottle",
        "Water_Purification_Unit",
    ],
    "Equipment": [
        "3D_Printer",
        "Battery_Pack",
        "Circuit_Board",
        "Space_Suit",
        "EV_Suit_Battery",
        "Gyroscope_Module",
        "Tether_Reel",
        "Helmet_Visor",
        "Lab_Microscope",
        "Laptop",
        "LED_Work_Light",
        "Navigation_Module",
        "Scientific_Sensor",
        "Solar_Panel",
        "Tool_Kit",
        "Vacuum_Sealed_Tools",
    ],
    "Experiment_Sample": [
        "Asteroid_Sample_Container",
        "Microgravity_Lab_Kit",
        "Research_Samples",
        "Seed_Packets",
    ],
    "Life_Support_System": [
        "Fire_Extinguisher",
        "Radiation_Shield",
        "CO2_Scrubber",
        "Cooling_System",
        "Emergency_Beacon",
        "Oxygen_Cylinder",
        "Pressure_Regulator",
        "Waste_Management_Kit",
        "Communication_Device",
        "Handheld_Spectrometer",
        "Thruster_Fuel",
    ],
    # Broader ISS-style groups you listed
    "Crew_Supplies": [
        "Personal_Hygiene_Products",
        "Clothing",
        "Medical_Supplies",
    ],
    "Maintenance_Tools": [
        "Screwdrivers",
        "Drills",
        "Spacewalk_Tools",
    ],
    "Scientific_Research_Supplies": [
        "Scientific_Instruments",
        "Sensors",
        "Sample_Storage_Containers",
        "Data_Storage_Devices",
    ],
    "Essential_Supplies": [
        "Oxygen_Tanks",
        "Carbon_Dioxide_Scrubbers",
        "Water_Filtration_System",
        "Waste_Disposal_Systems",
        "Gym_Equipment",
    ],
    "Structural_and_Spacecraft_Components": [
        "Spare_Parts",
        "Panels",
        "Beams",
        "Replacement_Hardware_for_Modules",
        "Docking_Ports_and_Connections",
    ],
    "Entertainment_and_Leisure_Items": [
        "Books",
        "Movies_Music_Devices",
        "Recreation_Materials",
    ],
}

# ---------------------------------
# Helpers for sizes / masses / zones
# ---------------------------------
def zone_code(z):
    # Two-letter code from words' initials (Sanitation_Bay -> SB)
    parts = z.split("_")
    return "".join(p[0].upper() for p in parts)

def choose_preferred_zone(category, subcategory):
    mapping = {
        "Medical": "Medical_Bay",
        "Food": "Storage_Bay",
        "Equipment": "Engineering_Bay",
        "Experiment_Sample": "Lab",
        "Life_Support_System": "Life_Support",
        "Crew_Supplies": "Crew_Quarters",
        "Maintenance_Tools": "Maintenance_Bay",
        "Scientific_Research_Supplies": "Lab",
        "Essential_Supplies": "Life_Support",
        "Structural_and_Spacecraft_Components": "Engineering_Bay",
        "Entertainment_and_Leisure_Items": "Crew_Quarters",
    }
    # small special cases
    if subcategory in {"Space_Suit", "EV_Suit_Battery"}:
        return "Airlock"
    if "Water" in subcategory and category == "Food":
        return "Storage_Bay"
    return mapping.get(category, "Storage_Bay")

def rand_size(category):
    # width, depth, height in cm based on rough category
    if category in {"Food", "Medical"}:
        return (
            round(random.uniform(8, 40), 1),
            round(random.uniform(8, 40), 1),
            round(random.uniform(4, 30), 1),
        )
    if category in {"Experiment_Sample"}:
        return (
            round(random.uniform(15, 45), 1),
            round(random.uniform(15, 45), 1),
            round(random.uniform(10, 35), 1),
        )
    if category in {"Equipment", "Structural_and_Spacecraft_Components"}:
        return (
            round(random.uniform(20, 150), 1),
            round(random.uniform(20, 150), 1),
            round(random.uniform(10, 120), 1),
        )
    if category in {"Life_Support_System", "Essential_Supplies"}:
        return (
            round(random.uniform(30, 200), 1),
            round(random.uniform(25, 150), 1),
            round(random.uniform(20, 220), 1),
        )
    # catch-all
    return (
        round(random.uniform(10, 80), 1),
        round(random.uniform(10, 80), 1),
        round(random.uniform(5, 60), 1),
    )

def rand_mass(category):
    if category in {"Food"}:
        return round(random.uniform(0.2, 5.0), 2)
    if category in {"Medical"}:
        return round(random.uniform(0.1, 8.0), 2)
    if category in {"Experiment_Sample"}:
        return round(random.uniform(0.5, 6.0), 2)
    if category in {"Equipment"}:
        return round(random.uniform(1.0, 60.0), 2)
    if category in {"Life_Support_System", "Essential_Supplies"}:
        return round(random.uniform(2.0, 120.0), 2)
    if category in {"Structural_and_Spacecraft_Components"}:
        return round(random.uniform(2.0, 150.0), 2)
    return round(random.uniform(0.3, 20.0), 2)

def rand_priority(category):
    base = {
        "Medical": (70, 100),
        "Life_Support_System": (80, 100),
        "Food": (60, 95),
        "Experiment_Sample": (55, 90),
        "Equipment": (50, 90),
        "Essential_Supplies": (65, 100),
        "Maintenance_Tools": (45, 85),
        "Scientific_Research_Supplies": (55, 90),
        "Structural_and_Spacecraft_Components": (50, 90),
        "Entertainment_and_Leisure_Items": (20, 60),
        "Crew_Supplies": (40, 80),
    }.get(category, (40, 80))
    return random.randint(*base)

def rand_expiry(category):
    if category in {"Food", "Medical"}:
        start = datetime.now() + timedelta(days=random.randint(30, 900))
        return start.date().isoformat()
    # Some consumables under Life Support might have checks/expiry
    if category in {"Life_Support_System"} and random.random() < 0.25:
        start = datetime.now() + timedelta(days=random.randint(180, 1800))
        return start.date().isoformat()
    return "N/A"

def rand_usage_limit(category):
    if category in {"Food", "Medical"}:
        return random.randint(1, 5000)
    if category in {"Experiment_Sample"}:
        return random.randint(50, 5000)
    if category in {"Maintenance_Tools", "Equipment"}:
        return random.randint(100, 10000)
    # non-consumable or continuous-use
    return None  # Changed from "N/A" to None for database compatibility

# ----------------------------
# NEW ENHANCED FIELD GENERATORS
# ----------------------------

def rand_temperature_requirement(category, subcategory):
    """Generate temperature requirement based on item type."""
    if category == "Medical":
        # Medical items more likely to need special temperature
        return random.choices(
            TEMPERATURE_REQUIREMENTS,
            weights=[30, 50, 15, 5]  # COLD, AMBIENT, WARM, N/A
        )[0]
    elif category == "Food":
        # Food items often need cold storage
        return random.choices(
            TEMPERATURE_REQUIREMENTS,
            weights=[60, 35, 2, 3]  # COLD, AMBIENT, WARM, N/A
        )[0]
    elif subcategory in {"Oxygen_Cylinder", "Thruster_Fuel", "Battery_Pack"}:
        # Some items need ambient or specific temperatures
        return random.choices(
            TEMPERATURE_REQUIREMENTS,
            weights=[5, 80, 10, 5]  # COLD, AMBIENT, WARM, N/A
        )[0]
    else:
        # Most equipment is ambient
        return random.choices(
            TEMPERATURE_REQUIREMENTS,
            weights=[5, 85, 5, 5]  # COLD, AMBIENT, WARM, N/A
        )[0]

def rand_hazardous_class(category, subcategory):
    """Generate hazardous classification based on item type."""
    if subcategory in {"Thruster_Fuel", "Battery_Pack"}:
        return random.choices(
            ["FLAMMABLE", "TOXIC", "PRESSURIZED"],
            weights=[50, 30, 20]
        )[0]
    elif subcategory in {"Fire_Extinguisher", "CO2_Scrubber"}:
        return random.choices(
            ["PRESSURIZED", "CORROSIVE", "NONE"],
            weights=[60, 20, 20]
        )[0]
    elif category == "Medical" and random.random() < 0.15:
        # Some medical items might be biohazard
        return "BIOHAZARD"
    elif category in {"Life_Support_System", "Essential_Supplies"} and random.random() < 0.10:
        # Some life support items might be hazardous
        return random.choice(["TOXIC", "CORROSIVE", "PRESSURIZED"])
    else:
        # Most items are non-hazardous
        return "NONE"

def rand_lot_number():
    """Generate a realistic lot number."""
    year = random.choice([2024, 2025, 2026])
    batch = random.randint(1, 999)
    return f"LOT{year}-{batch:03d}"

def rand_tags_id():
    """Generate realistic identification tags."""
    tags = []
    
    # Barcode (always present)
    barcode = f"BAR{random.randint(100000, 999999)}"
    tags.append(barcode)
    
    # RFID (80% chance)
    if random.random() < 0.8:
        rfid = f"RFID{random.randint(10000, 99999)}"
        tags.append(rfid)
    
    # QR Code (30% chance)
    if random.random() < 0.3:
        qr = f"QR{random.randint(1000, 9999)}"
        tags.append(qr)
    
    return tags

def rand_usage_frequency(category):
    """Generate realistic usage frequency (uses per day)."""
    if category == "Food":
        return round(random.uniform(0.5, 3.0), 2)  # Food used regularly
    elif category == "Medical":
        return round(random.uniform(0.1, 0.8), 2)  # Medical used less frequently
    elif category in {"Maintenance_Tools", "Equipment"}:
        return round(random.uniform(0.05, 1.5), 2)  # Tools used occasionally
    elif category == "Life_Support_System":
        return round(random.uniform(0.01, 0.3), 2)  # Life support used rarely but critically
    else:
        return round(random.uniform(0.02, 0.5), 2)  # Other items

def rand_item_status():
    """Generate realistic item status."""
    return random.choices(
        ITEM_STATUSES,
        weights=[70, 10, 5, 3, 2, 2, 2, 1, 2, 3]  # Mostly ACTIVE, some variety
    )[0]

def rand_container_type(zone):
    """Generate appropriate container type based on zone."""
    zone_containers = {
        "Storage_Bay": ["RACK_BAY", "LOCKER", "CTB"],
        "External_Storage": ["VEHICLE", "RACK_BAY", "FREE_VOLUME"],
        "Medical_Bay": ["LOCKER", "DRAWER", "CABINET"],
        "Lab": ["DRAWER", "CABINET", "LOCKER"],
        "Engineering_Bay": ["RACK_BAY", "LOCKER", "DRAWER"],
        "Crew_Quarters": ["LOCKER", "DRAWER", "CTB"],
        "Sanitation_Bay": ["CABINET", "LOCKER", "TRASH_BAG"],
        "Airlock": ["LOCKER", "RACK_BAY"],
        "Life_Support": ["RACK_BAY", "CABINET"],
        "Maintenance_Bay": ["RACK_BAY", "LOCKER", "DRAWER"],
    }
    
    if zone in zone_containers:
        return random.choice(zone_containers[zone])
    else:
        return random.choice(CONTAINER_TYPES)

def rand_access_index(container_type, zone):
    """Generate realistic access difficulty index (0-100, 0=easiest)."""
    base_difficulty = {
        "External_Storage": (60, 90),
        "Engineering_Bay": (40, 70),
        "Storage_Bay": (20, 50),
        "Medical_Bay": (10, 30),
        "Lab": (15, 40),
        "Crew_Quarters": (5, 25),
        "Airlock": (25, 60),
    }.get(zone, (20, 60))
    
    # Container type modifiers
    type_modifier = {
        "DRAWER": -10,
        "LOCKER": -5,
        "CABINET": 0,
        "CTB": 5,
        "RACK_BAY": 10,
        "FREE_VOLUME": 20,
        "VEHICLE": 25,
        "TRASH_BAG": -15,
    }.get(container_type, 0)
    
    difficulty = random.randint(*base_difficulty) + type_modifier
    return max(0, min(100, difficulty))  # Clamp to 0-100

# ---------------------------------
# ENHANCED CONTAINERS
# ---------------------------------
def gen_containers():
    rows = []
    container_counter = 1  # Global counter for unique container IDs
    
    for z in zones:
        n = zone_container_counts[z]  # Use the random distribution
        zc = zone_code(z)
        for i in range(1, n + 1):
            # sizes: zone-dependent
            if z in {"Storage_Bay", "External_Storage"}:
                w, d, h = random.uniform(50, 150), random.uniform(50, 150), random.uniform(150, 260)
            elif z in {"Sanitation_Bay"}:
                w, d, h = random.uniform(25, 100), random.uniform(40, 90), random.uniform(180, 220)
            elif z in {"Engineering_Bay", "Maintenance_Bay", "Life_Support"}:
                w, d, h = random.uniform(60, 200), random.uniform(50, 180), random.uniform(120, 240)
            else:
                w, d, h = random.uniform(30, 140), random.uniform(30, 140), random.uniform(60, 240)

            # Random module number (1-3)
            module_num = random.randint(1, 3)
            # Container ID format: M{module_num}-{zone_code}{container_number:03d}
            container_id = f"M{module_num}-{zc}{container_counter:03d}"  # e.g., M1-SB001
            module_id = f"M{module_num}"  # e.g., M1
            
            # Enhanced container properties
            container_type = rand_container_type(z)
            access_index = rand_access_index(container_type, z)
            
            # Calculate realistic max mass based on size and type
            volume_liters = (w * d * h) / 1000  # Convert cm³ to liters
            max_mass = round(volume_liters * random.uniform(0.5, 2.0), 1)  # Reasonable mass limit
            
            # Generate container name
            container_name = f"{z.replace('_', ' ')} {container_type.replace('_', ' ').title()} {i:02d}"
            
            rows.append({
                "container_id": container_id,
                "name": container_name,
                "type": container_type,
                "zone": z,
                "module_id": module_id,
                "width_cm": round(w, 1),
                "depth_cm": round(d, 1),
                "height_cm": round(h, 1),
                "open_face": random.choice(ACCESS_FACES),
                "max_mass": max_mass,
                "current_mass": 0.0,  # Start empty
                "access_index": access_index,
                "parent_container_id": None,  # Could be enhanced later for nested containers
                "is_active": random.choices([True, False], weights=[95, 5])[0],  # 95% active
                "description": f"{container_type.replace('_', ' ').title()} in {z.replace('_', ' ')} for storage",
                "created_at": datetime.now().isoformat(),
                "last_accessed": None,  # Will be set when items are placed
            })
            container_counter += 1
    return pd.DataFrame(rows)

# ---------------------------------
# ENHANCED ITEMS
# ---------------------------------
def gen_items():
    rows = []
    next_id = count(1)
    
    # Generate 500-2000 items randomly
    total_items = random.randint(500, 1000)
    print(f"Total items to generate: {total_items}")
    
    # Calculate items per category based on total
    items_per_category = {}
    remaining_items = total_items
    
    for i, (cat, subs) in enumerate(categories.items()):
        if i == len(categories) - 1:  # Last category gets remaining items
            items_per_category[cat] = remaining_items
        else:
            # Random distribution per category
            max_per_category = max(10, remaining_items // (len(categories) - i))
            items_in_category = random.randint(10, max_per_category)
            items_per_category[cat] = items_in_category
            remaining_items -= items_in_category
    
    print("Items per category:", items_per_category)
    
    for cat, subs in categories.items():
        items_for_category = items_per_category[cat]
        items_per_subcategory = max(1, items_for_category // len(subs))
        
        for sub in subs:
            # Random number of items per subcategory
            k = random.randint(1, items_per_subcategory * 2)  # Vary the number
            for j in range(1, k + 1):
                iid = f"{next(next_id):06d}"
                name = f"{sub}_{j:03d}"
                w, d, h = rand_size(cat)
                mass = rand_mass(cat)
                priority = rand_priority(cat)
                expiry = rand_expiry(cat)
                usage_limit = rand_usage_limit(cat)
                pref_zone = choose_preferred_zone(cat, sub)
                
                # Enhanced fields
                temp_req = rand_temperature_requirement(cat, sub)
                hazardous = rand_hazardous_class(cat, sub)
                lot_num = rand_lot_number()
                tags = rand_tags_id()
                usage_freq = rand_usage_frequency(cat)
                item_status = rand_item_status()
                
                # Calculate current usage and remaining usage
                max_uses = usage_limit if usage_limit else None
                if max_uses:
                    current_uses = random.randint(0, max_uses // 2)  # Use up to half
                    usage_remaining = max_uses - current_uses
                else:
                    current_uses = 0
                    usage_remaining = None

                rows.append({
                    "item_id": iid,
                    "name": name,
                    "category": cat,
                    "subcategory": sub,
                    "width_cm": w,
                    "depth_cm": d,
                    "height_cm": h,
                    "mass_kg": mass,
                    "temp_requirement": temp_req,
                    "lot_number": lot_num,
                    "current_location": None,  # Will be set when placed
                    "orientation_allowed": random.choices([True, False], weights=[85, 15])[0],  # 85% allow rotation
                    "hazardous_class": hazardous,
                    "tags_id": json.dumps(tags),  # Store as JSON string
                    "priority": priority,
                    "expiry_date": expiry,
                    "maximum_uses": max_uses,
                    "current_uses": current_uses,
                    "usage_remaining": usage_remaining,
                    "usage_frequency": usage_freq,
                    "preferred_zone": pref_zone,
                    "status": item_status,
                })
    return pd.DataFrame(rows)

print("\n" + "="*80)
print("GENERATING ENHANCED DATA FOR SPACE STATION INVENTORY MANAGEMENT")
print("="*80)

containers_df = gen_containers()
items_df = gen_items()

# Save files
containers_path = "./enhanced_containers.csv"
items_path = "./enhanced_items.csv"
containers_df.to_csv(containers_path, index=False)
items_df.to_csv(items_path, index=False)

# Display summary statistics
print(f"\n📊 GENERATION SUMMARY:")
print(f"   Containers: {len(containers_df)} across {len(zones)} zones")
print(f"   Items: {len(items_df)} across {len(categories)} categories")

print(f"\n🏗️  CONTAINER BREAKDOWN:")
container_summary = containers_df.groupby(['zone', 'type']).size().reset_index(name='count')
for _, row in container_summary.head(10).iterrows():
    print(f"   {row['zone']} - {row['type']}: {row['count']} containers")

print(f"\n📦 ITEM BREAKDOWN:")
item_summary = items_df.groupby(['category', 'temp_requirement']).size().reset_index(name='count')
for _, row in item_summary.head(10).iterrows():
    print(f"   {row['category']} ({row['temp_requirement']}): {row['count']} items")

print(f"\n🧪 ENHANCED FEATURES:")
print(f"   Temperature Requirements: {items_df['temp_requirement'].value_counts().to_dict()}")
print(f"   Hazardous Classifications: {items_df['hazardous_class'].value_counts().to_dict()}")
print(f"   Container Types: {containers_df['type'].value_counts().to_dict()}")

# Display preview of generated data
print(f"\n📋 PREVIEW: Enhanced Containers")
print(containers_df[['container_id', 'name', 'type', 'zone', 'max_mass', 'access_index']].head(5))

print(f"\n📋 PREVIEW: Enhanced Items")
print(items_df[['item_id', 'name', 'category', 'temp_requirement', 'hazardous_class', 'priority', 'status']].head(5))

print(f"\n✅ FILES SAVED:")
print(f"   📁 {containers_path}")
print(f"   📁 {items_path}")
print(f"\n🚀 Ready for import into enhanced database models!")
print("="*80)
