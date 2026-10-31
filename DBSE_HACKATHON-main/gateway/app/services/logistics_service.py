import uuid
import random
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import text
from fastapi import HTTPException, status
from pymongo.database import Database

from app.db.models import (
    Warehouse, InventoryItem, Dispatch, DispatchItem,
    ResponderMission, Incident, IncidentSupply, User,
    IncidentActivityHistory
)
from app.schemas.logistics import (
    ReserveInventoryRequest, CreateDispatchRequest,
    AssignMissionRequest, MissionStatusUpdateRequest,
    ConfirmDeliveryRequest, FieldObservationCreate
)

def list_warehouses(db: Session) -> List[Dict[str, Any]]:
    whs = db.query(Warehouse).all()
    return [
        {
            "id": w.id,
            "name": w.name,
            "code": w.code,
            "latitude": w.latitude,
            "longitude": w.longitude,
            "address": w.address,
            "contact_phone": w.contact_phone,
            "status": w.status,
            "capacity_cubic_meters": w.capacity_cubic_meters
        }
        for w in whs
    ]

def get_warehouse_inventory(db: Session, warehouse_id: Optional[str] = None) -> List[Dict[str, Any]]:
    query = (
        db.query(InventoryItem, Warehouse.name.label("warehouse_name"))
        .join(Warehouse, InventoryItem.warehouse_id == Warehouse.id)
    )
    if warehouse_id:
        query = query.filter(InventoryItem.warehouse_id == warehouse_id)

    results = query.all()
    inventory_list = []
    for item, wh_name in results:
        avail = item.quantity_on_hand - item.quantity_reserved
        inventory_list.append({
            "id": str(item.id),
            "warehouse_id": item.warehouse_id,
            "warehouse_name": wh_name,
            "item_code": item.item_code,
            "item_name": item.item_name,
            "category": item.category,
            "unit": item.unit,
            "quantity_on_hand": item.quantity_on_hand,
            "quantity_reserved": item.quantity_reserved,
            "available_quantity": avail,
            "safety_stock_threshold": item.safety_stock_threshold
        })
    return inventory_list

def reserve_inventory(db: Session, req: ReserveInventoryRequest, user: User) -> Dict[str, Any]:
    # Call native PostgreSQL stored procedure with pessimistic row-level locking
    sql = text("""
        SELECT fn_reserve_inventory(
            :incident_id,
            :warehouse_id,
            :item_code,
            :quantity,
            :actor_id
        ) AS result;
    """)
    try:
        res = db.execute(sql, {
            "incident_id": req.incident_id,
            "warehouse_id": req.warehouse_id,
            "item_code": req.item_code,
            "quantity": req.quantity,
            "actor_id": user.id
        }).scalar()
        db.commit()
        return res
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Reservation failed: {str(e)}"
        )

def create_dispatch(db: Session, req: CreateDispatchRequest, user: User) -> Dict[str, Any]:
    # 1. Generate unique Dispatch ID
    next_num = random.randint(1000, 9999)
    dispatch_id = f"DSP-2026-{next_num}"

    # Verify incident exists
    inc = db.query(Incident).filter(Incident.id == req.incident_id).first()
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Incident {req.incident_id} not found")

    # 2. Create dispatch record
    new_dispatch = Dispatch(
        id=dispatch_id,
        incident_id=req.incident_id,
        warehouse_id=req.warehouse_id,
        status="PREPARING",
        vehicle_type=req.vehicle_type,
        driver_name=req.driver_name,
        driver_phone=req.driver_phone
    )
    db.add(new_dispatch)
    db.flush()

    # 3. Call stored procedure for each manifest item
    dispatched_items = []
    try:
        for itm in req.items:
            sql = text("""
                SELECT fn_dispatch_inventory(
                    :dispatch_id,
                    :incident_id,
                    :warehouse_id,
                    :item_code,
                    :quantity,
                    :actor_id
                ) AS result;
            """)
            db.execute(sql, {
                "dispatch_id": dispatch_id,
                "incident_id": req.incident_id,
                "warehouse_id": req.warehouse_id,
                "item_code": itm.item_code,
                "quantity": itm.quantity,
                "actor_id": user.id
            })
            dispatched_items.append({"item_code": itm.item_code, "quantity": itm.quantity})

        new_dispatch.status = "IN_TRANSIT"
        db.commit()
        return {
            "id": dispatch_id,
            "incident_id": req.incident_id,
            "warehouse_id": req.warehouse_id,
            "status": "IN_TRANSIT",
            "vehicle_type": req.vehicle_type,
            "driver_name": req.driver_name,
            "driver_phone": req.driver_phone,
            "items": dispatched_items
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Dispatch execution failed: {str(e)}"
        )

def list_dispatches(db: Session, warehouse_id: Optional[str] = None) -> List[Dict[str, Any]]:
    query = (
        db.query(Dispatch, Warehouse.name.label("warehouse_name"))
        .join(Warehouse, Dispatch.warehouse_id == Warehouse.id)
        .order_by(Dispatch.created_at.desc())
    )
    if warehouse_id:
        query = query.filter(Dispatch.warehouse_id == warehouse_id)

    results = query.all()
    dispatch_list = []
    for d, wh_name in results:
        items = db.query(DispatchItem).filter(DispatchItem.dispatch_id == d.id).all()
        dispatch_list.append({
            "id": d.id,
            "incident_id": d.incident_id,
            "warehouse_id": d.warehouse_id,
            "warehouse_name": wh_name,
            "status": d.status,
            "vehicle_type": d.vehicle_type,
            "driver_name": d.driver_name,
            "driver_phone": d.driver_phone,
            "dispatched_at": d.dispatched_at,
            "delivered_at": d.delivered_at,
            "items": [{"item_code": it.item_code, "quantity": it.quantity} for it in items]
        })
    return dispatch_list

def list_missions(db: Session, responder_id: Optional[str] = None, is_coordinator: bool = False) -> List[Dict[str, Any]]:
    query = (
        db.query(ResponderMission, Incident, User.full_name.label("responder_name"))
        .join(Incident, ResponderMission.incident_id == Incident.id)
        .outerjoin(User, ResponderMission.responder_id == User.id)
        .order_by(ResponderMission.assigned_at.desc())
    )
    if not is_coordinator and responder_id:
        query = query.filter(ResponderMission.responder_id == responder_id)

    missions = query.all()
    mission_list = []
    for m, inc, resp_name in missions:
        supplies = db.query(IncidentSupply).filter(IncidentSupply.incident_id == inc.id).all()
        mission_list.append({
            "id": m.id,
            "incident_id": m.incident_id,
            "dispatch_id": m.dispatch_id,
            "responder_id": str(m.responder_id) if m.responder_id else None,
            "responder_name": resp_name,
            "status": m.status,
            "assigned_at": m.assigned_at,
            "completed_at": m.completed_at,
            "completion_notes": m.completion_notes,
            "verification_code": m.verification_code,
            "incident_address": inc.address_text,
            "reporter_name": inc.reporter_name,
            "reporter_phone": inc.reporter_phone,
            "severity": inc.severity,
            "priority_score": inc.priority_score,
            "requested_supplies": [
                {
                    "item_code": s.item_code,
                    "item_name": s.item_name,
                    "requested_qty": s.requested_qty,
                    "approved_qty": s.approved_qty,
                    "dispatched_qty": s.dispatched_qty,
                    "delivered_qty": s.delivered_qty,
                    "fulfillment_status": s.fulfillment_status
                }
                for s in supplies
            ]
        })
    return mission_list

def assign_mission(db: Session, req: AssignMissionRequest, user: User) -> Dict[str, Any]:
    mission_id = f"MSN-2026-{random.randint(1000, 9999)}"
    v_code = f"VERIFY-{random.randint(1000, 9999)}"

    inc = db.query(Incident).filter(Incident.id == req.incident_id).first()
    if not inc:
        raise HTTPException(status_code=404, detail=f"Incident {req.incident_id} not found")

    target_responder_id = None
    if req.responder_id:
        try:
            target_responder_id = uuid.UUID(req.responder_id)
        except ValueError:
            pass

    mission = ResponderMission(
        id=mission_id,
        incident_id=req.incident_id,
        dispatch_id=req.dispatch_id,
        responder_id=target_responder_id,
        status="ASSIGNED",
        verification_code=v_code,
        completion_notes=req.notes
    )
    db.add(mission)
    
    # Log activity history
    log = IncidentActivityHistory(
        incident_id=req.incident_id,
        action="MISSION_ASSIGNED",
        previous_status=inc.status,
        new_status=inc.status,
        actor_id=user.id,
        actor_role=user.role,
        description=f"Rescue mission {mission_id} assigned. Verification OTP: {v_code}"
    )
    db.add(log)
    db.commit()

    return {
        "id": mission_id,
        "incident_id": req.incident_id,
        "status": "ASSIGNED",
        "verification_code": v_code,
        "message": "Mission assigned successfully"
    }

def update_mission_status(db: Session, mission_id: str, req: MissionStatusUpdateRequest, user: User) -> Dict[str, Any]:
    mission = db.query(ResponderMission).filter(ResponderMission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail=f"Mission {mission_id} not found")

    old_status = mission.status
    mission.status = req.status
    if req.notes:
        mission.completion_notes = req.notes

    # Log in incident activity history
    log = IncidentActivityHistory(
        incident_id=mission.incident_id,
        action=f"MISSION_{req.status}",
        previous_status=old_status,
        new_status=req.status,
        actor_id=user.id,
        actor_role=user.role,
        description=f"Mission {mission_id} transitioned from {old_status} to {req.status}. Notes: {req.notes or 'None'}"
    )
    db.add(log)
    db.commit()
    return {"id": mission_id, "status": mission.status, "message": f"Mission status updated to {req.status}"}

def confirm_delivery(db: Session, mission_id: str, req: ConfirmDeliveryRequest, user: User) -> Dict[str, Any]:
    mission = db.query(ResponderMission).filter(ResponderMission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail=f"Mission {mission_id} not found")

    # Verify that the provided verification code matches either the mission's code or matches the demo
    if mission.verification_code and mission.verification_code.strip() != req.verification_code.strip():
        # Reject invalid OTP
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid verification code '{req.verification_code}'. Verification OTP does not match mission code."
        )

    # Call native PostgreSQL stored procedure
    sql = text("""
        SELECT fn_confirm_delivery(
            :incident_id,
            :dispatch_id,
            :mission_id,
            :item_code,
            :quantity,
            :verification_code,
            :recipient_name,
            :recipient_phone,
            :actor_id
        ) AS result;
    """)

    try:
        res = db.execute(sql, {
            "incident_id": mission.incident_id,
            "dispatch_id": mission.dispatch_id,
            "mission_id": mission.id,
            "item_code": req.item_code,
            "quantity": req.quantity,
            "verification_code": req.verification_code,
            "recipient_name": req.recipient_name,
            "recipient_phone": req.recipient_phone or "+91 98400 00000",
            "actor_id": user.id
        }).scalar()
        db.commit()
        return res
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Delivery confirmation failed: {str(e)}"
        )

def get_accountability_matrix(db: Session) -> List[Dict[str, Any]]:
    incidents = db.query(Incident).order_by(Incident.priority_score.desc()).all()
    matrix = []
    for inc in incidents:
        supplies = db.query(IncidentSupply).filter(IncidentSupply.incident_id == inc.id).all()
        tot_req = sum(s.requested_qty for s in supplies)
        tot_app = sum(s.approved_qty for s in supplies)
        tot_dsp = sum(s.dispatched_qty for s in supplies)
        tot_del = sum(s.delivered_qty for s in supplies)

        pct = round((tot_del / tot_req * 100.0), 1) if tot_req > 0 else 100.0
        is_partial = tot_del > 0 and tot_del < tot_req

        matrix.append({
            "incident_id": inc.id,
            "tracking_token": inc.tracking_token,
            "address_text": inc.address_text,
            "status": inc.status,
            "priority_score": inc.priority_score,
            "total_requested": tot_req,
            "total_approved": tot_app,
            "total_dispatched": tot_dsp,
            "total_delivered": tot_del,
            "fulfillment_percentage": pct,
            "is_partially_fulfilled": is_partial,
            "is_fully_resolved": inc.status == "RESOLVED",
            "supplies": [
                {
                    "item_code": s.item_code,
                    "item_name": s.item_name,
                    "requested": s.requested_qty,
                    "approved": s.approved_qty,
                    "dispatched": s.dispatched_qty,
                    "delivered": s.delivered_qty,
                    "status": s.fulfillment_status
                }
                for s in supplies
            ]
        })
    return matrix

def get_field_intelligence(mongo_db: Database, incident_id: Optional[str] = None) -> Dict[str, Any]:
    intel_filter = {"incident_id": incident_id} if incident_id else {}
    intel_docs = list(mongo_db["incident_intelligence"].find(intel_filter, {"_id": 0}).limit(20))
    obs_docs = list(mongo_db["field_observations"].find(intel_filter, {"_id": 0}).sort("logged_at", -1).limit(20))
    drone_docs = list(mongo_db["drone_telemetry"].find({}, {"_id": 0}).sort("timestamp", -1).limit(10))
    return {
        "incident_intelligence": intel_docs,
        "field_observations": obs_docs,
        "drone_telemetry": drone_docs
    }

def add_field_observation(mongo_db: Database, db: Session, req: FieldObservationCreate, user: User) -> Dict[str, Any]:
    doc = {
        "incident_id": req.incident_id,
        "responder_id": str(user.id),
        "responder_name": user.full_name,
        "observation_text": req.text,
        "detected_hazards": req.hazards,
        "location": {
            "type": "Point",
            "coordinates": [req.longitude or 80.21, req.latitude or 12.98]
        },
        "logged_at": datetime.now()
    }
    mongo_db["field_observations"].insert_one(doc)
    doc.pop("_id", None)
    return doc
