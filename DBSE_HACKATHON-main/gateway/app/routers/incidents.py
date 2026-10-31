from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from pymongo.database import Database

from app.db.session import get_db
from app.db.mongo import get_mongo_db
from app.core.dependencies import get_current_user, require_roles
from app.db.models import User
from app.schemas.incident import (
    IncidentCreateRequest, IncidentResponse, IncidentTrackingResponse,
    IncidentVerifyRequest, IncidentStatusUpdateRequest, ShortageSummary
)
from app.schemas.semantic import SimilarIncidentResponse
from app.services.incident_service import (
    create_sos_incident, get_incident_tracking, get_incident_by_id,
    list_incidents, verify_incident, update_incident_status,
    get_priority_queue, get_resource_shortages_summary
)
from app.services.semantic_service import find_similar_incidents

router = APIRouter(prefix="/incidents", tags=["Incidents & SOS Operations"])

# -----------------------------------------------------------------------------
# 1. Citizen Public Endpoints (No Authentication Required)
# -----------------------------------------------------------------------------

@router.post(
    "/sos",
    response_model=IncidentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Citizen Emergency SOS Ingress"
)
def submit_sos_ticket(
    req: IncidentCreateRequest,
    db: Session = Depends(get_db),
    mongo_db: Database = Depends(get_mongo_db)
):
    """
    Public Citizen SOS Ingress:
    Submits emergency location, casualty counts, and aid requirements.
    Calculates explainable priority score, persists relational state in PostgreSQL,
    and stores unstructured narratives in MongoDB.
    """
    incident = create_sos_incident(db, mongo_db, req)
    return IncidentResponse.model_validate(incident)

@router.get(
    "/track/{tracking_token}",
    response_model=IncidentTrackingResponse,
    summary="Public Citizen Incident Tracker"
)
def track_emergency_ticket(
    tracking_token: str,
    db: Session = Depends(get_db),
    mongo_db: Database = Depends(get_mongo_db)
):
    """
    Public lookup by tracking token (e.g., 'SOS-TRK-9003').
    Returns real-time status, requested vs delivered supplies, and timeline audit trail.
    """
    return get_incident_tracking(db, mongo_db, tracking_token)

# -----------------------------------------------------------------------------
# 2. Coordinator & Operations Analytical Endpoints
# -----------------------------------------------------------------------------

@router.get(
    "/priority-queue",
    response_model=List[IncidentResponse],
    summary="Coordinator Priority Triage Queue"
)
def get_triage_priority_queue(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["COORDINATOR"]))
):
    """
    Coordinator-only endpoint:
    Returns all active, unfulfilled disaster incidents ordered by explainable priority score DESC.
    """
    incidents = get_priority_queue(db)
    return [IncidentResponse.model_validate(inc) for inc in incidents]

@router.get(
    "/shortages",
    response_model=List[ShortageSummary],
    summary="Regional Resource Shortages Audit"
)
def get_resource_shortages(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["COORDINATOR", "WAREHOUSE"]))
):
    """
    CO6 Relief Accountability & CO1 Relational Aggregation:
    Aggregates outstanding supply deficits across all active incidents and cross-references
    available inventory in regional warehouses to calculate allocation feasibility.
    """
    return get_resource_shortages_summary(db)

@router.get(
    "/similar",
    response_model=List[SimilarIncidentResponse],
    summary="Semantic Incident Similarity Search (pgvector)"
)
def get_similar_incidents(
    incident_id: Optional[str] = Query(None, description="Existing incident ID to match against"),
    query_text: Optional[str] = Query(None, description="Natural language search query"),
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["COORDINATOR", "RESPONDER"]))
):
    """
    CO4 High-Performance Vector Similarity Search:
    Executes native PostgreSQL cosine distance (<=>) nearest-neighbor queries via pgvector HNSW index.
    Can search using an existing incident's stored embedding or a natural language text query.
    """
    return find_similar_incidents(db, incident_id=incident_id, query_text=query_text, limit=limit)

# -----------------------------------------------------------------------------
# 3. Incident Listing & Detail Operations
# -----------------------------------------------------------------------------

@router.get(
    "",
    response_model=List[IncidentResponse],
    summary="List Disaster Incidents"
)
def list_disaster_incidents(
    status: Optional[str] = Query(None, description="Filter by status: REPORTED, VERIFIED, IN_DISPATCH, etc."),
    severity: Optional[int] = Query(None, ge=1, le=5, description="Filter by severity level 1-5"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["COORDINATOR", "WAREHOUSE", "RESPONDER"]))
):
    """
    List disaster incidents with optional status and severity filtering, ordered by priority score DESC.
    """
    incidents = list_incidents(db, status_filter=status, severity_filter=severity, limit=limit, offset=offset)
    return [IncidentResponse.model_validate(inc) for inc in incidents]

@router.get(
    "/{incident_id}",
    response_model=IncidentResponse,
    summary="Get Incident Details by ID"
)
def get_incident_details(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve full relational details for an incident, including supply allocations and fulfillment states.
    """
    incident = get_incident_by_id(db, incident_id)
    return IncidentResponse.model_validate(incident)

@router.patch(
    "/{incident_id}/verify",
    response_model=IncidentResponse,
    summary="Coordinator Verify Incident"
)
def coordinator_verify_incident(
    incident_id: str,
    req: IncidentVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["COORDINATOR"]))
):
    """
    Coordinator-only action:
    Verifies citizen SOS reports, applies optional priority overrides, and authorizes logistics staging.
    """
    incident = verify_incident(db, incident_id, req, current_user)
    return IncidentResponse.model_validate(incident)

@router.patch(
    "/{incident_id}/status",
    response_model=IncidentResponse,
    summary="Update Incident Status"
)
def update_disaster_status(
    incident_id: str,
    req: IncidentStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["COORDINATOR"]))
):
    """
    Coordinator-only action:
    Updates incident operational status.
    Strict Disaster Accountability (CO6): Rejects transition to 'RESOLVED' if requested supplies remain partially fulfilled.
    """
    incident = update_incident_status(db, incident_id, req, current_user)
    return IncidentResponse.model_validate(incident)
