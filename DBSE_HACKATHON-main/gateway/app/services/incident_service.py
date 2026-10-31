import uuid
import random
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from pymongo.database import Database
from fastapi import HTTPException, status

from app.db.models import (
    Incident, IncidentSupply, IncidentActivityHistory, User,
    InventoryItem, SituationEmbedding
)
from app.schemas.incident import (
    IncidentCreateRequest, IncidentVerifyRequest, IncidentStatusUpdateRequest,
    SupplyItemRequest, TimelineEvent
)
from app.services.priority_engine import calculate_priority_score

STANDARD_ITEM_NAMES = {
    "WATER_CAN_20L": "20L Potable Water Can",
    "FOOD_PACK_FAMILY": "Emergency Family Ration Kit (3 Days)",
    "FIRST_AID_KIT": "Comprehensive Trauma First Aid Kit",
    "INSULIN_VIAL": "Refrigerated Regular Insulin (100IU/ml)",
    "OXYGEN_CYLINDER": "10L Medical Oxygen Cylinder",
    "INFLATABLE_BOAT": "6-Person Flood Rescue Raft with Oars",
    "TARPAULIN_SHEET": "Heavy Duty Waterproof Tarpaulin (12x15ft)",
    "GENERATOR_5KW": "5KW Portable Emergency Generator"
}

def generate_incident_id(db: Session) -> str:
    """Generate sequential or unique ID like INC-2026-0006."""
    count = db.query(func.count(Incident.id)).scalar() or 0
    candidate = f"INC-2026-{str(count + 1).zfill(4)}"
    while db.query(Incident).filter(Incident.id == candidate).first():
        count += 1
        candidate = f"INC-2026-{str(count + 1).zfill(4)}"
    return candidate

def generate_tracking_token(db: Session) -> str:
    """Generate unique citizen tracking token like SOS-TRK-7890."""
    while True:
        token = f"SOS-TRK-{random.randint(1000, 9999)}"
        if not db.query(Incident).filter(Incident.tracking_token == token).first():
            return token

def create_sos_incident(
    db: Session, 
    mongo_db: Database, 
    req: IncidentCreateRequest
) -> Incident:
    """
    Public Citizen SOS Ingress Pipeline:
    1. Validates citizen input & generates tracking identifiers.
    2. Executes explainable multi-variable priority scoring engine.
    3. Persists relational ticket, supply demands, and activity audit in PostgreSQL.
    4. Persists flexible narrative, telemetry, and detected hazards in MongoDB.
    """
    incident_id = generate_incident_id(db)
    tracking_token = generate_tracking_token(db)

    # 1. Calculate explainable priority score
    requested_codes = [s.item_code.upper().strip() for s in req.requested_supplies]
    priority_result = calculate_priority_score(
        severity=req.severity,
        urgency=req.urgency,
        vulnerability_score=req.vulnerability_score,
        people_affected=req.people_affected,
        requested_item_codes=requested_codes
    )

    # 2. Persist Incident in PostgreSQL
    new_incident = Incident(
        id=incident_id,
        tracking_token=tracking_token,
        reporter_name=req.reporter_name.strip(),
        reporter_phone=req.reporter_phone.strip(),
        latitude=req.latitude,
        longitude=req.longitude,
        address_text=req.address_text.strip(),
        severity=req.severity,
        urgency=req.urgency,
        vulnerability_score=req.vulnerability_score,
        people_affected=req.people_affected,
        priority_score=priority_result["total_score"],
        priority_breakdown=priority_result,
        status="REPORTED",
        notes=req.notes
    )
    db.add(new_incident)

    # 3. Persist Requested Supply Items
    for s in req.requested_supplies:
        item_code_clean = s.item_code.upper().strip()
        item_name_clean = s.item_name or STANDARD_ITEM_NAMES.get(item_code_clean, item_code_clean)
        supply_line = IncidentSupply(
            incident_id=incident_id,
            item_code=item_code_clean,
            item_name=item_name_clean,
            requested_qty=s.quantity,
            approved_qty=0,
            dispatched_qty=0,
            delivered_qty=0,
            fulfillment_status="PENDING"
        )
        db.add(supply_line)

    # 4. Record Initial Activity in Audit Log
    activity_entry = IncidentActivityHistory(
        incident_id=incident_id,
        action="SOS_REPORTED",
        previous_status=None,
        new_status="REPORTED",
        actor_id=None,
        actor_role="CITIZEN",
        description=f"Emergency SOS submitted by {req.reporter_name}. Assigned initial priority {priority_result['total_score']}/100.",
        metadata_={
            "tracking_token": tracking_token,
            "people_affected": req.people_affected,
            "priority_breakdown": priority_result
        }
    )
    db.add(activity_entry)

    db.commit()
    db.refresh(new_incident)

    # 5. Persist Unstructured Intelligence Record in MongoDB (CO3 Polyglot Persistence)
    # Detect basic hazard tags from narrative
    detected_hazards = []
    text_corpus = (req.notes or "").lower() + " " + req.address_text.lower()
    if "flood" in text_corpus or "water" in text_corpus or "submerged" in text_corpus:
        detected_hazards.append("URBAN_FLOOD_INUNDATION")
    if "electric" in text_corpus or "transformer" in text_corpus or "power" in text_corpus:
        detected_hazards.append("ELECTRICAL_HAZARD")
    if "infant" in text_corpus or "baby" in text_corpus:
        detected_hazards.append("INFANT_PRESENT")
    if "elderly" in text_corpus or "heart" in text_corpus or "oxygen" in text_corpus or "insulin" in text_corpus:
        detected_hazards.append("CRITICAL_MEDICAL_VULNERABILITY")
    if not detected_hazards:
        detected_hazards.append("EMERGENCY_FIELD_OBSERVATION")

    try:
        mongo_db.incident_intelligence.insert_one({
            "incident_id": incident_id,
            "tracking_token": tracking_token,
            "reporter_name": req.reporter_name,
            "raw_notes": req.notes,
            "detected_hazards": detected_hazards,
            "weather_telemetry": {
                "recorded_at": datetime.now(timezone.utc).isoformat(),
                "monitoring_source": "AUTOMATED_INGRESS"
            },
            "captured_at": datetime.now(timezone.utc)
        })
    except Exception as mongo_err:
        # Non-fatal logging: Relational record is single source of truth
        pass

    return new_incident

def get_incident_tracking(
    db: Session, 
    mongo_db: Database, 
    tracking_token: str
) -> Dict[str, Any]:
    """
    Public lookup by tracking token.
    Provides transparent audit timeline and accountability breakdown without exposing internal credentials.
    """
    incident = db.query(Incident).filter(Incident.tracking_token == tracking_token.strip()).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No emergency ticket found for tracking token '{tracking_token}'"
        )

    # Supplies breakdown
    supplies = incident.supplies

    # Timeline audit history
    timeline_logs = (
        db.query(IncidentActivityHistory)
        .filter(IncidentActivityHistory.incident_id == incident.id)
        .order_by(IncidentActivityHistory.created_at.asc())
        .all()
    )
    timeline_events = [
        TimelineEvent(
            action=log.action,
            timestamp=log.created_at,
            description=log.description,
            actor_role=log.actor_role
        )
        for log in timeline_logs
    ]

    # MongoDB unstructured intelligence (if exists)
    unstructured_intel = None
    try:
        intel_doc = mongo_db.incident_intelligence.find_one({"incident_id": incident.id})
        if intel_doc:
            intel_doc["_id"] = str(intel_doc["_id"])
            unstructured_intel = intel_doc
    except Exception:
        pass

    return {
        "incident_id": incident.id,
        "tracking_token": incident.tracking_token,
        "status": incident.status,
        "reporter_name": incident.reporter_name,
        "address_text": incident.address_text,
        "priority_score": incident.priority_score,
        "priority_breakdown": incident.priority_breakdown,
        "supplies": supplies,
        "timeline": timeline_events,
        "unstructured_intel": unstructured_intel
    }

def get_incident_by_id(db: Session, incident_id: str) -> Incident:
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{incident_id}' not found"
        )
    return incident

def list_incidents(
    db: Session,
    status_filter: Optional[str] = None,
    severity_filter: Optional[int] = None,
    limit: int = 50,
    offset: int = 0
) -> List[Incident]:
    query = db.query(Incident)
    if status_filter:
        query = query.filter(Incident.status == status_filter.upper())
    if severity_filter:
        query = query.filter(Incident.severity == severity_filter)
    
    return query.order_by(Incident.priority_score.desc()).offset(offset).limit(limit).all()

def verify_incident(
    db: Session,
    incident_id: str,
    req: IncidentVerifyRequest,
    coordinator: User
) -> Incident:
    """
    Coordinator action: Verify an incident, validate severity, and stage it for dispatch.
    """
    incident = get_incident_by_id(db, incident_id)
    old_status = incident.status

    incident.status = "VERIFIED"
    if req.priority_override is not None:
        incident.priority_score = req.priority_override
    if req.notes:
        incident.notes = (incident.notes or "") + f"\n[Coordinator Note]: {req.notes}"

    incident.updated_at = datetime.now(timezone.utc)

    # Activity history entry
    activity = IncidentActivityHistory(
        incident_id=incident.id,
        action="COORDINATOR_VERIFIED",
        previous_status=old_status,
        new_status="VERIFIED",
        actor_id=coordinator.id,
        actor_role=coordinator.role,
        description=f"Incident verified by Coordinator {coordinator.full_name}. Priority: {incident.priority_score}.",
        metadata_={"coordinator_id": str(coordinator.id), "notes": req.notes}
    )
    db.add(activity)

    db.commit()
    db.refresh(incident)
    return incident

def update_incident_status(
    db: Session,
    incident_id: str,
    req: IncidentStatusUpdateRequest,
    actor: User
) -> Incident:
    """
    Update incident status with strict disaster accountability enforcement (CO6).
    Partial fulfillment must NEVER be marked as RESOLVED.
    """
    incident = get_incident_by_id(db, incident_id)
    target_status = req.status.upper().strip()

    # Invariant guard: An incident cannot be RESOLVED if supplies remain unfulfilled
    if target_status == "RESOLVED":
        unfulfilled = (
            db.query(IncidentSupply)
            .filter(IncidentSupply.incident_id == incident.id, IncidentSupply.delivered_qty < IncidentSupply.requested_qty)
            .all()
        )
        if unfulfilled:
            deficit_details = [
                f"{s.item_name} ({s.delivered_qty}/{s.requested_qty} delivered)"
                for s in unfulfilled
            ]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Disaster Accountability Invariant Violation (CO6): Cannot mark incident {incident.id} as RESOLVED while supplies remain unfulfilled: {', '.join(deficit_details)}. Status must remain PARTIALLY_FULFILLED."
            )

    old_status = incident.status
    incident.status = target_status
    if req.notes:
        incident.notes = (incident.notes or "") + f"\n[{actor.role} Status Note]: {req.notes}"
    incident.updated_at = datetime.now(timezone.utc)

    activity = IncidentActivityHistory(
        incident_id=incident.id,
        action="STATUS_UPDATED",
        previous_status=old_status,
        new_status=target_status,
        actor_id=actor.id,
        actor_role=actor.role,
        description=f"Status updated from {old_status} to {target_status} by {actor.full_name} ({actor.role}).",
        metadata_={"notes": req.notes}
    )
    db.add(activity)

    db.commit()
    db.refresh(incident)
    return incident

def get_priority_queue(db: Session) -> List[Incident]:
    """
    Coordinator Priority Triage Queue:
    Returns all non-resolved incidents ordered by priority_score DESC.
    """
    return (
        db.query(Incident)
        .filter(Incident.status.notin_(["RESOLVED", "CANCELLED"]))
        .order_by(Incident.priority_score.desc())
        .all()
    )

def get_resource_shortages_summary(db: Session) -> List[Dict[str, Any]]:
    """
    Aggregates outstanding resource shortages across all active incidents
    and joins with current regional warehouse inventory balances.
    """
    # 1. Unmet demand grouped by item_code
    unmet = (
        db.query(
            IncidentSupply.item_code,
            IncidentSupply.item_name,
            func.sum(IncidentSupply.requested_qty).label("total_req"),
            func.sum(IncidentSupply.delivered_qty).label("total_del"),
            (func.sum(IncidentSupply.requested_qty) - func.sum(IncidentSupply.delivered_qty)).label("deficit"),
            func.count(IncidentSupply.incident_id).label("incidents_count")
        )
        .join(Incident, IncidentSupply.incident_id == Incident.id)
        .filter(Incident.status.notin_(["RESOLVED", "CANCELLED"]))
        .filter(IncidentSupply.requested_qty > IncidentSupply.delivered_qty)
        .group_by(IncidentSupply.item_code, IncidentSupply.item_name)
        .all()
    )

    # 2. Available stock across all operational warehouses
    available_stock = (
        db.query(
            InventoryItem.item_code,
            func.sum(InventoryItem.quantity_on_hand - InventoryItem.quantity_reserved).label("avail")
        )
        .group_by(InventoryItem.item_code)
        .all()
    )
    stock_map = {row.item_code: (row.avail or 0) for row in available_stock}

    result = []
    for row in unmet:
        avail = stock_map.get(row.item_code, 0)
        deficit = row.deficit
        if avail >= deficit:
            feasibility = "IMMEDIATELY ALLOCATABLE"
        elif avail > 0:
            feasibility = "PARTIAL STOCK ONLY (SHORTAGE)"
        else:
            feasibility = "CRITICAL DEFICIT (ZERO STOCK)"

        result.append({
            "item_code": row.item_code,
            "item_name": row.item_name,
            "total_requested": int(row.total_req),
            "total_delivered": int(row.total_del),
            "outstanding_deficit": int(deficit),
            "incidents_affected_count": int(row.incidents_count),
            "regional_available_stock": int(avail),
            "allocation_feasibility": feasibility
        })

    return sorted(result, key=lambda x: x["outstanding_deficit"], reverse=True)
