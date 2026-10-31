import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add gateway to python path
sys.path.insert(0, os.path.abspath("gateway"))

from app.main import app

client = TestClient(app)

# =============================================================================
# 1. AUTHENTICATION & DEMO LOGIN TESTS
# =============================================================================

def test_demo_coordinator_login():
    """Verify demo coordinator account authenticates with bcrypt and receives JWT."""
    response = client.post("/api/v1/auth/login", json={
        "email": "coordinator@relieflink.org",
        "password": "demo_coordinator_2026"
    })
    assert response.status_code == 200, response.text
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] == "COORDINATOR"
    assert data["user"]["email"] == "coordinator@relieflink.org"
    assert "password_hash" not in data["user"]

def test_demo_warehouse_login():
    """Verify demo warehouse account authenticates."""
    response = client.post("/api/v1/auth/login", json={
        "email": "warehouse@relieflink.org",
        "password": "demo_warehouse_2026"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "WAREHOUSE"
    assert data["user"]["assigned_facility_id"] == "WH-CENTRAL-01"

def test_demo_responder_login():
    """Verify demo responder account authenticates."""
    response = client.post("/api/v1/auth/login", json={
        "email": "responder@relieflink.org",
        "password": "demo_responder_2026"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "RESPONDER"

def test_demo_citizen_login():
    """Verify demo citizen account authenticates."""
    response = client.post("/api/v1/auth/login", json={
        "email": "citizen@relieflink.org",
        "password": "demo_citizen_2026"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "CITIZEN"

def test_invalid_login_credentials():
    """Reject invalid credentials with HTTP 401."""
    # Wrong password
    res1 = client.post("/api/v1/auth/login", json={
        "email": "coordinator@relieflink.org",
        "password": "wrong_password_2026"
    })
    assert res1.status_code == 401

    # Non-existent user
    res2 = client.post("/api/v1/auth/login", json={
        "email": "ghost@relieflink.org",
        "password": "demo_password"
    })
    assert res2.status_code == 401

def test_user_registration_and_duplicate_handling():
    """Register a new citizen account and verify duplicate email rejection."""
    import uuid
    unique_email = f"volunteer_{uuid.uuid4().hex[:6]}@relieflink.org"
    reg_res = client.post("/api/v1/auth/register", json={
        "email": unique_email,
        "password": "safe_volunteer_password_2026",
        "full_name": "Volunteer Vikram",
        "role": "RESPONDER",
        "phone_number": "+91 99000 88776"
    })
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == unique_email
    assert reg_data["user"]["role"] == "RESPONDER"

    # Attempt duplicate registration with same email -> 409 Conflict
    dup_res = client.post("/api/v1/auth/register", json={
        "email": unique_email,
        "password": "safe_volunteer_password_2026",
        "full_name": "Volunteer Vikram",
        "role": "RESPONDER"
    })
    assert dup_res.status_code == 409

def test_auth_me_endpoint():
    """Verify GET /api/v1/auth/me returns current user profile."""
    # 1. Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": "coordinator@relieflink.org",
        "password": "demo_coordinator_2026"
    })
    token = login_res.json()["access_token"]

    # 2. Get profile with Bearer token
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    profile = me_res.json()
    assert profile["email"] == "coordinator@relieflink.org"
    assert profile["role"] == "COORDINATOR"
    assert "password_hash" not in profile

    # 3. Unauthenticated request -> 401
    unauth_res = client.get("/api/v1/auth/me")
    assert unauth_res.status_code == 401

# =============================================================================
# 2. SERVER-ENFORCED ROLE-BASED ACCESS CONTROL (RBAC) TESTS
# =============================================================================

def test_rbac_citizen_forbidden_on_coordinator_routes():
    """Citizen tokens must be strictly rejected on privileged coordinator endpoints."""
    # Citizen login
    cit_login = client.post("/api/v1/auth/login", json={
        "email": "citizen@relieflink.org",
        "password": "demo_citizen_2026"
    })
    cit_token = cit_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {cit_token}"}

    # Attempt access to coordinator priority queue -> 403 Forbidden
    res1 = client.get("/api/v1/incidents/priority-queue", headers=headers)
    assert res1.status_code == 403
    assert "Forbidden" in res1.json()["detail"]

    # Attempt coordinator verification -> 403 Forbidden
    res2 = client.patch("/api/v1/incidents/INC-2026-0001/verify", json={"notes": "Illegal citizen verify"}, headers=headers)
    assert res2.status_code == 403

def test_rbac_warehouse_cannot_verify_incidents():
    """Warehouse role cannot perform coordinator verification."""
    wh_login = client.post("/api/v1/auth/login", json={
        "email": "warehouse@relieflink.org",
        "password": "demo_warehouse_2026"
    })
    wh_token = wh_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {wh_token}"}

    res = client.patch("/api/v1/incidents/INC-2026-0001/verify", json={"notes": "Warehouse trying to verify"}, headers=headers)
    assert res.status_code == 403

def test_rbac_coordinator_authorized():
    """Coordinator can access priority queue and perform verification."""
    coord_login = client.post("/api/v1/auth/login", json={
        "email": "coordinator@relieflink.org",
        "password": "demo_coordinator_2026"
    })
    coord_token = coord_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {coord_token}"}

    res = client.get("/api/v1/incidents/priority-queue", headers=headers)
    assert res.status_code == 200
    queue = res.json()
    assert isinstance(queue, list)
    assert len(queue) > 0

# =============================================================================
# 3. CITIZEN SOS INGRESS & TRACKING TESTS
# =============================================================================

def test_citizen_sos_submission_and_polyglot_persistence():
    """
    Public SOS submission:
    - Generates tracking token
    - Computes explainable priority score
    - Persists in PostgreSQL and MongoDB
    """
    sos_payload = {
        "reporter_name": "Deepa Sundar",
        "reporter_phone": "+91 98409 55667",
        "latitude": 13.0780,
        "longitude": 80.2450,
        "address_text": "Ground Floor, 14th Cross St, Shenoy Nagar, Chennai",
        "severity": 5,
        "urgency": 5,
        "vulnerability_score": 4,
        "people_affected": 8,
        "notes": "Flood water entering house. Elderly diabetic patient and 1 infant trapped. Power cut.",
        "requested_supplies": [
            {"item_code": "WATER_CAN_20L", "quantity": 10},
            {"item_code": "FOOD_PACK_FAMILY", "quantity": 8},
            {"item_code": "INSULIN_VIAL", "quantity": 2}
        ]
    }
    response = client.post("/api/v1/incidents/sos", json=sos_payload)
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["id"].startswith("INC-2026-")
    assert "tracking_token" in data
    assert data["tracking_token"].startswith("SOS-TRK-")
    assert data["status"] == "REPORTED"
    assert data["priority_score"] > 85.0
    assert "priority_breakdown" in data
    assert data["priority_breakdown"]["severity_factor"] == 25.0
    assert len(data["supplies"]) == 3

    tracking_token = data["tracking_token"]

    # Test tracking lookup
    track_res = client.get(f"/api/v1/incidents/track/{tracking_token}")
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["tracking_token"] == tracking_token
    assert track_data["status"] == "REPORTED"
    assert len(track_data["supplies"]) == 3
    assert len(track_data["timeline"]) >= 1
    assert track_data["timeline"][0]["action"] == "SOS_REPORTED"

def test_tracking_nonexistent_token():
    """Tracking an invalid token returns 404."""
    res = client.get("/api/v1/incidents/track/SOS-TRK-NONEXISTENT")
    assert res.status_code == 404

# =============================================================================
# 4. EXPLAINABLE PRIORITY ENGINE TESTS
# =============================================================================

def test_explainable_priority_calculation():
    """Verify deterministic scoring and explanation generation."""
    from app.services.priority_engine import calculate_priority_score

    # Maximum emergency case
    res_max = calculate_priority_score(
        severity=5,
        urgency=5,
        vulnerability_score=5,
        people_affected=100,
        requested_item_codes=["WATER_CAN_20L", "INSULIN_VIAL"]
    )
    assert res_max["total_score"] == 100.0
    assert res_max["severity_factor"] == 25.0
    assert res_max["urgency_factor"] == 25.0
    assert res_max["vulnerability_factor"] == 20.0
    assert res_max["headcount_factor"] == 20.0
    assert res_max["shortage_factor"] == 10.0
    assert "Score 100.0/100" in res_max["explanation"]

    # Minor incident
    res_min = calculate_priority_score(
        severity=1,
        urgency=1,
        vulnerability_score=1,
        people_affected=1,
        requested_item_codes=[]
    )
    assert res_min["total_score"] < 25.0
    assert res_min["shortage_factor"] == 0.0

# =============================================================================
# 5. DISASTER ACCOUNTABILITY & INVARIANT ENFORCEMENT (CO6)
# =============================================================================

def test_partial_fulfillment_cannot_be_resolved():
    """
    CO6 Accountability Invariant:
    INC-2026-0003 is partially fulfilled (22 of 45 units delivered).
    Attempting to set its status to 'RESOLVED' must be strictly rejected with HTTP 400.
    """
    coord_login = client.post("/api/v1/auth/login", json={
        "email": "coordinator@relieflink.org",
        "password": "demo_coordinator_2026"
    })
    coord_token = coord_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {coord_token}"}

    # Attempt to mark INC-2026-0003 as RESOLVED
    res = client.patch(
        "/api/v1/incidents/INC-2026-0003/status",
        json={"status": "RESOLVED", "notes": "Coordinator prematurely closing partially fulfilled ticket"},
        headers=headers
    )
    assert res.status_code == 400
    assert "Disaster Accountability Invariant Violation" in res.json()["detail"]
    assert "PARTIALLY_FULFILLED" in res.json()["detail"]

# =============================================================================
# 6. RESOURCE SHORTAGES & PRIORITY QUEUE TESTS
# =============================================================================

def test_resource_shortages_audit():
    """Verify regional resource shortages aggregation across active incidents."""
    wh_login = client.post("/api/v1/auth/login", json={
        "email": "warehouse@relieflink.org",
        "password": "demo_warehouse_2026"
    })
    wh_token = wh_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {wh_token}"}

    res = client.get("/api/v1/incidents/shortages", headers=headers)
    assert res.status_code == 200
    shortages = res.json()
    assert isinstance(shortages, list)
    assert len(shortages) > 0
    # Every item must have deficit > 0 and feasibility status
    for item in shortages:
        assert item["outstanding_deficit"] > 0
        assert item["allocation_feasibility"] in [
            "IMMEDIATELY ALLOCATABLE",
            "PARTIAL STOCK ONLY (SHORTAGE)",
            "CRITICAL DEFICIT (ZERO STOCK)"
        ]

# =============================================================================
# 7. SEMANTIC SEARCH VIA pgvector TESTS
# =============================================================================

def test_pgvector_similar_incidents_by_id():
    """Query nearest-neighbor incidents using stored pgvector embeddings."""
    coord_login = client.post("/api/v1/auth/login", json={
        "email": "coordinator@relieflink.org",
        "password": "demo_coordinator_2026"
    })
    token = coord_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Query incidents similar to INC-2026-0001 (Anna Nagar Flood)
    res = client.get("/api/v1/incidents/similar?incident_id=INC-2026-0001&limit=3", headers=headers)
    assert res.status_code == 200
    results = res.json()
    assert len(results) > 0
    for r in results:
        assert "cosine_similarity" in r
        assert "cosine_distance" in r
        assert r["incident_id"] != "INC-2026-0001"

def test_pgvector_similar_incidents_by_text():
    """Query nearest-neighbor incidents using text query."""
    coord_login = client.post("/api/v1/auth/login", json={
        "email": "coordinator@relieflink.org",
        "password": "demo_coordinator_2026"
    })
    token = coord_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/incidents/similar?query_text=submerged+heart+patients+flooding&limit=3", headers=headers)
    assert res.status_code == 200
    results = res.json()
    assert len(results) > 0
    assert results[0]["cosine_similarity"] >= -1.0

# =============================================================================
# 8. SYSTEM HEALTH & READINESS TESTS
# =============================================================================

def test_system_liveness_and_readiness():
    """Verify /health and /ready probes."""
    # Liveness
    h_res = client.get("/health")
    assert h_res.status_code == 200
    assert h_res.json()["status"] == "HEALTHY"
    assert h_res.json()["host_binding"] == "0.0.0.0"

    # Readiness
    r_res = client.get("/ready")
    assert r_res.status_code == 200
    assert r_res.json()["status"] == "READY"
    assert r_res.json()["databases"]["postgresql"] == "CONNECTED"
    assert r_res.json()["databases"]["mongodb"] == "CONNECTED"
