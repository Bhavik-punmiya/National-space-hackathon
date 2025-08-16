# /app/services/import_export_service.py
import io
import pandas as pd
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Any, Optional
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename
from app.models_db import Item as DBItem, Container as DBContainer, Placement as DBPlacement, LogActionType
from app.models_api import ImportResponse, ImportErrorDetail
from .logging_service import create_log_entry

def export_containers(db: Session, user_id: Optional[str] = None) -> io.BytesIO:
    """Exports the current container data as a CSV file in a BytesIO buffer."""
    containers = db.query(DBContainer).all()

    output = io.StringIO()
    columns = ['ContainerID', 'Zone', 'ModuleID', 'Width', 'Depth', 'Height']
    data = []
    for c in containers:
        data.append({
            'ContainerID': c.container_id,
            'Zone': c.zone,
            'ModuleID': c.module_id,
            'Width': c.width_cm,
            'Depth': c.depth_cm,
            'Height': c.height_cm
        })

    df = pd.DataFrame(data, columns=columns)
    df.to_csv(output, index=False, lineterminator='\n')  # Use lineterminator for consistency

    # Log export action
    create_log_entry(
        db=db,
        actionType=LogActionType.EXPORT,
        userId=user_id,
        details={"exportType": "containers", "containerCount": len(containers)}
    )
    try:
        db.commit()  # Commit log
    except Exception as e:
        db.rollback()
        print(f"Error committing export log: {e}")  # Log error but still return data

    # Return as BytesIO for Flask send_file
    return io.BytesIO(output.getvalue().encode('utf-8'))

def export_items(db: Session, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """Exports the current item data as JSON."""
    items = db.query(DBItem).all()

    data = []
    for item in items:
        data.append({
            'ItemID': item.item_id,
            'Name': item.name,
            'Category': item.category,
            'Subcategory': item.subcategory,
            'Width': item.width_cm,
            'Depth': item.depth_cm,
            'Height': item.height_cm,
            'Mass': item.mass_kg,
            'Priority': item.priority,
            'ExpiryDate': item.expiry_date,
            'UsageLimit': item.usage_limit,
            'PreferredZone': item.preferred_zone,
            'Status': item.status,
            'CurrentUses': item.current_uses
            
        })

    # Log export action
    create_log_entry(
        db=db,
        actionType=LogActionType.EXPORT,
        userId=user_id,
        details={"exportType": "items", "itemCount": len(items)}
    )
    try:
        db.commit()  # Commit log
    except Exception as e:
        db.rollback()
        print(f"Error committing export log: {e}")  # Log error but still return data

    return data


def import_items_from_csv(db: Session, file: FileStorage, user_id: Optional[str] = None) -> ImportResponse:
    """Imports item data from a CSV file."""
    filename = secure_filename(file.filename)
    if not filename.lower().endswith('.csv'):
        return ImportResponse(success=False, errors=[ImportErrorDetail(message="Invalid file type. Please upload a CSV file.")])

    items_imported_count = 0
    errors: List[ImportErrorDetail] = []

    try:
        # Read CSV using pandas - handle potential encoding issues
        try:
            df = pd.read_csv(file.stream, encoding='utf-8')
        except UnicodeDecodeError:
             file.stream.seek(0) # Reset stream position
             df = pd.read_csv(file.stream, encoding='latin-1') # Try alternative encoding


        # --- Define Expected Columns (Case Insensitive) ---
        # Adjust these based on the exact expected CSV format
        required_columns = {
            'itemid': 'item_id', 'name': 'name', 'category': 'category', 'subcategory': 'subcategory',
            'width_cm': 'width_cm', 'depth_cm': 'depth_cm', 'height_cm': 'height_cm', 
            'mass_kg': 'mass_kg', 'priority': 'priority'
        }
        optional_columns = {
            'expiry_date': 'expiry_date', 'usage_limit': 'usage_limit', 'preferred_zone': 'preferred_zone',
            'current_uses': 'current_uses'
        }
        df.columns = df.columns.str.lower().str.replace(' ', '').str.replace('_', '') # Normalize column names

        missing_req = [col for col in required_columns.keys() if col not in df.columns]
        if missing_req:
            return ImportResponse(success=False, errors=[ImportErrorDetail(message=f"Missing required columns: {missing_req}")])

        # --- Process Each Row ---
        for row_num, row in df.iterrows():
            current_row_errors = []
            item_data = {}

            # --- Extract and Validate Required Fields ---
            try:
                item_data['item_id'] = str(row[required_columns['itemid']]).strip()
                item_data['name'] = str(row[required_columns['name']]).strip()
                item_data['category'] = str(row[required_columns['category']]).strip()
                item_data['subcategory'] = str(row[required_columns['subcategory']]).strip()
                item_data['width_cm'] = float(row[required_columns['width_cm']])
                item_data['depth_cm'] = float(row[required_columns['depth_cm']])
                item_data['height_cm'] = float(row[required_columns['height_cm']])
                item_data['mass_kg'] = float(row[required_columns['mass_kg']])
                item_data['priority'] = int(row[required_columns['priority']])

                # --- Extract Optional Fields ---
                if 'expirydate' in df.columns:
                    expiry_val = row['expirydate']
                    if pd.isna(expiry_val) or expiry_val == '' or str(expiry_val).lower() == 'na':
                        item_data['expiry_date'] = "N/A"
                    else:
                        item_data['expiry_date'] = str(expiry_val).strip()
                else:
                    item_data['expiry_date'] = "N/A"

                if 'usagelimit' in df.columns:
                    usage_val = row['usagelimit']
                    if pd.isna(usage_val) or usage_val == '' or str(usage_val).lower() == 'na':
                        item_data['usage_limit'] = "N/A"
                    else:
                        item_data['usage_limit'] = str(usage_val).strip()
                else:
                    item_data['usage_limit'] = "N/A"

                if 'preferredzone' in df.columns:
                    zone_val = row['preferredzone']
                    if pd.isna(zone_val) or zone_val == '':
                        item_data['preferred_zone'] = None
                    else:
                        item_data['preferred_zone'] = str(zone_val).strip()
                else:
                    item_data['preferred_zone'] = None

                if 'currentuses' in df.columns:
                    current_uses_val = row['currentuses']
                    if pd.isna(current_uses_val) or current_uses_val == '':
                        item_data['current_uses'] = 0
                    else:
                        item_data['current_uses'] = int(current_uses_val)
                else:
                    item_data['current_uses'] = 0

                # --- Validation ---
                if item_data['priority'] < 0 or item_data['priority'] > 100:
                    current_row_errors.append("Priority must be between 0 and 100")
                if item_data['width_cm'] <= 0 or item_data['depth_cm'] <= 0 or item_data['height_cm'] <= 0:
                    current_row_errors.append("Dimensions must be positive")
                if item_data['mass_kg'] <= 0:
                    current_row_errors.append("Mass must be positive")

            except (ValueError, TypeError) as e:
                 current_row_errors.append(f"Data type error: {e}")


            if current_row_errors:
                 errors.append(ImportErrorDetail(row=row_num, message="; ".join(current_row_errors)))
                 continue # Skip this row

            # --- Upsert Logic (Update if exists, else Create) ---
            existing_item = db.query(DBItem).filter(DBItem.item_id == item_data['item_id']).first()
            if existing_item:
                 # Update existing item (be careful what you update)
                 existing_item.name = item_data['name']
                 existing_item.category = item_data['category']
                 existing_item.subcategory = item_data['subcategory']
                 existing_item.width_cm = item_data['width_cm']
                 existing_item.depth_cm = item_data['depth_cm']
                 existing_item.height_cm = item_data['height_cm']
                 existing_item.mass_kg = item_data['mass_kg']
                 existing_item.priority = item_data['priority']
                 existing_item.expiry_date = item_data.get('expiry_date')
                 existing_item.usage_limit = item_data.get('usage_limit')
                 existing_item.preferred_zone = item_data.get('preferred_zone')
                 existing_item.current_uses = item_data.get('current_uses')
                 # Should status or current_uses be reset on import? Assume not.
                 print(f"Updated item: {item_data['item_id']}")
            else:
                 # Create new item
                 new_item = DBItem(**item_data)
                 db.add(new_item)
                 items_imported_count += 1
                 print(f"Created new item: {item_data['item_id']}")

        # --- Commit changes after processing all rows ---
        if items_imported_count > 0 or any(db.dirty): # Check if there's anything to commit
             try:
                 db.commit()
             except Exception as e:
                 db.rollback()
                 errors.append(ImportErrorDetail(message=f"Database commit failed: {e}"))
                 # Mark overall success as false if commit fails
                 success_status = False
             else:
                  success_status = len(errors) == 0 # Success only if no errors occurred
        else:
             success_status = len(errors) == 0 # Success if no errors, even if nothing imported

        # Log the import action
        create_log_entry(
            db=db,
            actionType=LogActionType.IMPORT,
            userId=user_id,
            details={
                "fileType": "items",
                "fileName": filename,
                "count": items_imported_count,
                "errors": len(errors)
            }
        )
        db.commit() # Commit the log entry


        return ImportResponse(success=success_status, itemsImported=items_imported_count, errors=errors)


    except pd.errors.ParserError as e:
        errors.append(ImportErrorDetail(message=f"CSV Parsing Error: {e}"))
        return ImportResponse(success=False, errors=errors)
    except Exception as e:
        db.rollback() # Rollback any partial additions
        errors.append(ImportErrorDetail(message=f"An unexpected error occurred: {e}"))
        # Log the error if possible
        try:
            create_log_entry(db, LogActionType.SYSTEM_ERROR, userId=user_id, details={"error": f"Item Import Failed: {e}", "fileName": filename})
            db.commit()
        except:
            db.rollback() # Rollback log commit if it fails
        return ImportResponse(success=False, errors=errors)


def import_containers_from_csv(db: Session, file: FileStorage, user_id: Optional[str] = None) -> ImportResponse:
    """Imports container data from a CSV file."""
    filename = secure_filename(file.filename)
    if not filename.lower().endswith('.csv'):
        return ImportResponse(success=False, errors=[ImportErrorDetail(message="Invalid file type. Please upload a CSV file.")])

    containers_imported_count = 0
    errors: List[ImportErrorDetail] = []

    try:
        try:
            df = pd.read_csv(file.stream, encoding='utf-8')
        except UnicodeDecodeError:
            file.stream.seek(0)
            df = pd.read_csv(file.stream, encoding='latin-1')

        # --- Define Expected Columns (Case Insensitive) ---
        required_columns = {
            'container_id': 'container_id', 
            'zone': 'zone', 
            'module_id': 'module_id',
            'width_cm': 'width_cm', 
            'depth_cm': 'depth_cm', 
            'height_cm': 'height_cm'
        }
        df.columns = df.columns.str.lower().str.replace(' ', '').str.replace('_', '')

        missing_req = [col for col in required_columns.keys() if col not in df.columns]
        if missing_req:
            return ImportResponse(success=False, errors=[ImportErrorDetail(message=f"Missing required columns: {missing_req}")])

        # --- Process Each Row ---
        for row_num, row in df.iterrows():
            current_row_errors = []
            cont_data = {}

            try:
                cont_data['container_id'] = str(row[required_columns['containerid']]).strip()
                cont_data['zone'] = str(row[required_columns['zone']]).strip()
                cont_data['module_id'] = str(row[required_columns['moduleid']]).strip()
                cont_data['width_cm'] = float(row[required_columns['widthcm']])
                cont_data['depth_cm'] = float(row[required_columns['depthcm']])
                cont_data['height_cm'] = float(row[required_columns['heightcm']])

                # --- Validation ---
                if cont_data['width_cm'] <= 0 or cont_data['depth_cm'] <= 0 or cont_data['height_cm'] <= 0:
                    current_row_errors.append("Dimensions must be positive")

            except (ValueError, TypeError) as e:
                current_row_errors.append(f"Data type error: {e}")

            if current_row_errors:
                errors.append(ImportErrorDetail(row=row_num, message="; ".join(current_row_errors)))
                continue

            # --- Upsert Logic ---
            existing_cont = db.query(DBContainer).filter(DBContainer.container_id == cont_data['container_id']).first()
            if existing_cont:
                 # Update existing container
                 existing_cont.zone = cont_data['zone']
                 existing_cont.module_id = cont_data['module_id']
                 existing_cont.width_cm = cont_data['width_cm']
                 existing_cont.depth_cm = cont_data['depth_cm']
                 existing_cont.height_cm = cont_data['height_cm']
                 print(f"Updated container: {cont_data['container_id']}")
            else:
                 # Create new container
                 new_cont = DBContainer(**cont_data)
                 db.add(new_cont)
                 containers_imported_count += 1
                 print(f"Created new container: {cont_data['container_id']}")


        # --- Commit changes ---
        if containers_imported_count > 0 or any(db.dirty):
            try:
                 db.commit()
            except Exception as e:
                 db.rollback()
                 errors.append(ImportErrorDetail(message=f"Database commit failed: {e}"))
                 success_status = False
            else:
                 success_status = len(errors) == 0
        else:
             success_status = len(errors) == 0


        # Log import action
        create_log_entry(
            db=db,
            actionType=LogActionType.IMPORT,
            userId=user_id,
            details={
                "fileType": "containers",
                "fileName": filename,
                "count": containers_imported_count,
                "errors": len(errors)
            }
        )
        db.commit() # Commit log


        return ImportResponse(success=success_status, containersImported=containers_imported_count, errors=errors)

    except pd.errors.ParserError as e:
        errors.append(ImportErrorDetail(message=f"CSV Parsing Error: {e}"))
        return ImportResponse(success=False, errors=errors)
    except Exception as e:
        db.rollback()
        errors.append(ImportErrorDetail(message=f"An unexpected error occurred: {e}"))
        try:
             create_log_entry(db, LogActionType.SYSTEM_ERROR, userId=user_id, details={"error": f"Container Import Failed: {e}", "fileName": filename})
             db.commit()
        except:
             db.rollback()
        return ImportResponse(success=False, errors=errors)


def export_current_arrangement(db: Session, user_id: Optional[str] = None) -> io.BytesIO:
    """Exports the current item placements as a CSV file in a BytesIO buffer."""
    placements = db.query(DBPlacement).options(joinedload(DBPlacement.item)).all()

    output = io.StringIO()
    # Define columns as per requirement
    columns = ['ItemID', 'ContainerID', 'Coordinates(W1,D1,H1)', 'Coordinates(W2,D2,H2)']
    data = []
    for p in placements:
         # Format coordinates as required string
         coord1 = f"({p.start_w},{p.start_d},{p.start_h})"
         coord2 = f"({p.end_w},{p.end_d},{p.end_h})"
         data.append({
             'ItemID': p.item_id_fk,
             'ContainerID': p.container_id_fk,
             'Coordinates(W1,D1,H1)': coord1,
             'Coordinates(W2,D2,H2)': coord2
         })

    df = pd.DataFrame(data, columns=columns)
    df.to_csv(output, index=False, lineterminator='\n') # Use lineterminator for consistency

    # Log export action
    create_log_entry(
        db=db,
        actionType=LogActionType.EXPORT,
        userId=user_id,
        details={"exportType": "arrangement", "itemCount": len(placements)}
    )
    try:
        db.commit() # Commit log
    except Exception as e:
        db.rollback()
        print(f"Error committing export log: {e}") # Log error but still return data


    # Return as BytesIO for Flask send_file
    return io.BytesIO(output.getvalue().encode('utf-8'))