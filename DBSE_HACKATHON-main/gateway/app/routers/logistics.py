from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from pymongo.database import Database

from app.db.session import get_db
from app.db.mongo import get_mongo_db
from app.core.dependencies import get_current_user, require_roles
from app.db.models import User
from app.schemas.logistics import (
    WarehouseResponse, InventoryItemResponse, ReserveInventoryRequest,
    CreateDispatchRequest, DispatchResponse, AssignMissionRequest,
    MissionStatusUpdateRequest, ConfirmDeliveryRequest, ResponderMissionResponse,
    FieldObservationCreate, AccountabilitySummaryItem
)
import app.services.logistics_service as service

router = APIRouter(prefix="/logistics", tags=["Logistics, Warehouse & Field Operations"])

# -----------------------------------------------------------------------------
# 1. Warehouse & Inventory Operations
# -----------------------------------------------------------------------------

@router.get("/warehouses", response_model=List[WarehouseResponse], summary="List Warehouses")
def get_all_warehouses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["COORDINATOR", "WAREHOUSE", "RESPONDER"]))
):
    return service.list_warehouses(db)

@router.get("/inventory", response_model=List[InventoryItemResponse], summary="View Real-Time Warehouse Inventory")
def get_inventory(
    warehouse_id: Optional[str] = Query(None, description="Optional warehouse ID filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["COORDINATOR", "WAREHOUSE"]))
):
    return service.get_warehouse_inventory(db, warehouse_id=warehouse_id)

@router.post("/reserve", summary="Reserve Inventory Stock for Incident (ACID Row-Lock)")
def reserve_stock(
    req: ReserveInventoryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["COORDINATOR", "WAREHOUSE"]))
):
    return service.reserve_inventory(db, req, current_user)

@router.post("/dispatch", response_model=DispatchResponse, summary="Dispatch Supplies against Incident")
def dispatch_supplies(
    req: CreateDispatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["COORDINATOR", "WAREHOUSE"]))
):
    return service.create_dispatch(db, req, current_user)

@router.get("/dispatches", response_model=List[DispatchResponse], summary="List Dispatches & Manifests")
def list_dispatches(
    warehouse_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["COORDINATOR", "WAREHOUSE", "RESPONDER"]))
):
    return service.list_dispatches(db, warehouse_id=warehouse_id)

# -----------------------------------------------------------------------------
# 2. Responder Mission Operations
# -----------------------------------------------------------------------------

@router.get("/missions", response_model=List[ResponderMissionResponse], summary="List Assigned Missions")
def get_missions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["COORDINATOR", "RESPONDER"]))
):
    is_coord = (current_user.role == "COORDINATOR")
    responder_id = str(current_user.id) if current_user.role == "RESPONDER" else None
    return service.list_missions(db, responder_id=responder_id, is_coordinator=is_coord)

@router.post("/missions/assign", summary="Assign Mission to Responder (Coordinator Only)")
def assign_responder_mission(
    req: AssignMissionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["COORDINATOR"]))
):
    return service.assign_mission(db, req, current_user)

@router.patch("/missions/{mission_id}/status", summary="Update Responder Mission Transit Status")
def update_status(
    mission_id: str,
    req: MissionStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["COORDINATOR", "RESPONDER"]))
):
    return service.update_mission_status(db, mission_id, req, current_user)

@router.post("/missions/{mission_id}/confirm-delivery", summary="Confirm Physical Relief Delivery (OTP Guarded)")
def confirm_delivery_checkpoint(
    mission_id: str,
    req: ConfirmDeliveryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["COORDINATOR", "RESPONDER"]))
):
    return service.confirm_delivery(db, mission_id, req, current_user)

# -----------------------------------------------------------------------------
# 3. Relief Accountability Matrix
# -----------------------------------------------------------------------------

@router.get("/accountability-matrix", response_model=List[AccountabilitySummaryItem], summary="Relief Accountability Matrix")
def get_accountability(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return service.get_accountability_matrix(db)

# -----------------------------------------------------------------------------
# 4. Intelligence & Drone Field Observations (MongoDB)
# -----------------------------------------------------------------------------

@router.get("/intelligence", summary="Fetch MongoDB Unstructured Incident Intelligence")
def get_intelligence(
    incident_id: Optional[str] = Query(None),
    mongo_db: Database = Depends(get_mongo_db),
    current_user: User = Depends(get_current_user)
):
    return service.get_field_intelligence(mongo_db, incident_id=incident_id)

@router.post("/intelligence/observation", summary="Submit Responder Field Observation to MongoDB")
def submit_observation(
    req: FieldObservationCreate,
    mongo_db: Database = Depends(get_mongo_db),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["COORDINATOR", "RESPONDER"]))
):
    return service.add_field_observation(mongo_db, db, req, current_user)
