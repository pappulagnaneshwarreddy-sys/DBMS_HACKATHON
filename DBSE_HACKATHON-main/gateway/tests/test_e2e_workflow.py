import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_complete_4_role_workflow():
    # -------------------------------------------------------------------------
    # STEP 1: Verify all 4 demo accounts authenticate and receive JWTs
    # -------------------------------------------------------------------------
    roles = {
        "COORDINATOR": ("coordinator@relieflink.org", "demo_coordinator_2026"),
        "WAREHOUSE": ("warehouse@relieflink.org", "demo_warehouse_2026"),
        "RESPONDER": ("responder@relieflink.org", "demo_responder_2026"),
        "CITIZEN": ("citizen@relieflink.org", "demo_citizen_2026")
    }
    tokens = {}
    for role, (email, password) in roles.items():
        res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert res.status_code == 200, f"Login failed for {role}"
        body = res.json()
        assert body["user"]["role"] == role
        assert "access_token" in body
        tokens[role] = body["access_token"]

    coord_headers = {"Authorization": f"Bearer {tokens['COORDINATOR']}"}
    wh_headers = {"Authorization": f"Bearer {tokens['WAREHOUSE']}"}
    resp_headers = {"Authorization": f"Bearer {tokens['RESPONDER']}"}

    # -------------------------------------------------------------------------
    # STEP 2: Citizen SOS Ingress (Public, no auth needed)
    # -------------------------------------------------------------------------
    sos_res = client.post("/api/v1/incidents/sos", json={
        "reporter_name": "E2E Test Citizen",
        "reporter_phone": "+91 98401 99999",
        "latitude": 13.085,
        "longitude": 80.21,
        "address_text": "Submerged Block 7, Anna Nagar, Chennai",
        "severity": 5,
        "urgency": 5,
        "vulnerability_score": 4,
        "people_affected": 20,
        "notes": "Elderly and children stranded on terrace.",
        "requested_supplies": [
            {"item_code": "WATER_CAN_20L", "quantity": 10},
            {"item_code": "FOOD_PACK_FAMILY", "quantity": 10}
        ]
    })
    assert sos_res.status_code == 201
    sos_data = sos_res.json()
    new_inc_id = sos_data["id"]
    new_tracking_token = sos_data["tracking_token"]
    assert new_inc_id.startswith("INC-2026-")
    assert new_tracking_token.startswith("SOS-TRK-")
    assert sos_data["priority_score"] > 80.0

    # -------------------------------------------------------------------------
    # STEP 3: Public Citizen Tracking Lookup
    # -------------------------------------------------------------------------
    track_res = client.get(f"/api/v1/incidents/track/{new_tracking_token}")
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["incident_id"] == new_inc_id
    assert track_data["status"] == "REPORTED"
    assert len(track_data["supplies"]) == 2

    # -------------------------------------------------------------------------
    # STEP 4: Coordinator verifies the incident and checks priority queue
    # -------------------------------------------------------------------------
    verify_res = client.patch(
        f"/api/v1/incidents/{new_inc_id}/verify",
        headers=coord_headers,
        json={"notes": "Verified by Coordinator via aerial drone recon."}
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "VERIFIED"

    # -------------------------------------------------------------------------
    # STEP 5: Warehouse checks inventory, reserves stock, and dispatches goods
    # -------------------------------------------------------------------------
    inv_res = client.get("/api/v1/logistics/inventory?warehouse_id=WH-CENTRAL-01", headers=wh_headers)
    assert inv_res.status_code == 200
    inv_items = inv_res.json()
    water_item = next(i for i in inv_items if i["item_code"] == "WATER_CAN_20L")
    initial_avail = water_item["available_quantity"]
    assert initial_avail >= 10

    # Reserve 10 water cans and 10 food packs
    res_res = client.post("/api/v1/logistics/reserve", headers=wh_headers, json={
        "incident_id": new_inc_id,
        "warehouse_id": "WH-CENTRAL-01",
        "item_code": "WATER_CAN_20L",
        "quantity": 10
    })
    assert res_res.status_code == 200

    res_res2 = client.post("/api/v1/logistics/reserve", headers=wh_headers, json={
        "incident_id": new_inc_id,
        "warehouse_id": "WH-CENTRAL-01",
        "item_code": "FOOD_PACK_FAMILY",
        "quantity": 10
    })
    assert res_res2.status_code == 200

    # Dispatch goods
    disp_res = client.post("/api/v1/logistics/dispatch", headers=wh_headers, json={
        "incident_id": new_inc_id,
        "warehouse_id": "WH-CENTRAL-01",
        "vehicle_type": "4x4 High-Clearance Rescue Truck",
        "driver_name": "M. Kumar",
        "driver_phone": "+91 99620 11223",
        "items": [
            {"item_code": "WATER_CAN_20L", "quantity": 10},
            {"item_code": "FOOD_PACK_FAMILY", "quantity": 10}
        ]
    })
    assert disp_res.status_code == 200
    disp_data = disp_res.json()
    new_disp_id = disp_data["id"]
    assert new_disp_id.startswith("DSP-2026-")

    # -------------------------------------------------------------------------
    # STEP 6: Coordinator assigns mission to Field Responder
    # -------------------------------------------------------------------------
    mission_res = client.post("/api/v1/logistics/missions/assign", headers=coord_headers, json={
        "incident_id": new_inc_id,
        "responder_id": "33333333-3333-3333-3333-333333333333",
        "dispatch_id": new_disp_id,
        "notes": "Priority delivery to stranded citizens."
    })
    assert mission_res.status_code == 200
    mission_data = mission_res.json()
    new_mission_id = mission_data["id"]
    v_code = mission_data["verification_code"]

    # -------------------------------------------------------------------------
    # STEP 7: Responder updates status to EN_ROUTE, then ON_SCENE
    # -------------------------------------------------------------------------
    st1 = client.patch(
        f"/api/v1/logistics/missions/{new_mission_id}/status",
        headers=resp_headers,
        json={"status": "EN_ROUTE", "notes": "Navigating arterial road"}
    )
    assert st1.status_code == 200

    st2 = client.patch(
        f"/api/v1/logistics/missions/{new_mission_id}/status",
        headers=resp_headers,
        json={"status": "ON_SCENE", "notes": "Arrived at building"}
    )
    assert st2.status_code == 200

    # -------------------------------------------------------------------------
    # STEP 8: Responder confirms partial delivery (5 out of 10 water cans)
    # Proves incident moves to PARTIALLY_FULFILLED, NOT RESOLVED!
    # -------------------------------------------------------------------------
    deliv_res = client.post(
        f"/api/v1/logistics/missions/{new_mission_id}/confirm-delivery",
        headers=resp_headers,
        json={
            "item_code": "WATER_CAN_20L",
            "quantity": 5,
            "verification_code": v_code,
            "recipient_name": "Resident Representative",
            "recipient_phone": "+91 98401 99999"
        }
    )
    assert deliv_res.status_code == 200
    deliv_data = deliv_res.json()
    # Food is 0/10, Water is 5/10 -> Must be PARTIALLY_FULFILLED
    assert deliv_data["incident_status"] == "PARTIALLY_FULFILLED"
    assert deliv_data["all_fulfilled"] is False

    # -------------------------------------------------------------------------
    # STEP 9: CRITICAL CO6 INVARIANT TEST
    # Coordinator tries to prematurely mark incident RESOLVED.
    # Must be REJECTED by PostgreSQL trigger!
    # -------------------------------------------------------------------------
    resolve_attempt = client.patch(
        f"/api/v1/incidents/{new_inc_id}/status",
        headers=coord_headers,
        json={"status": "RESOLVED", "notes": "Premature attempt to resolve"}
    )
    assert resolve_attempt.status_code == 400
    err_body = resolve_attempt.json()
    error_text = err_body.get("detail", "") or err_body.get("error", "")
    assert "Disaster Accountability Invariant Violation" in error_text

    # -------------------------------------------------------------------------
    # STEP 10: Complete remaining deliveries and verify transition to RESOLVED
    # -------------------------------------------------------------------------
    # Deliver remaining 5 water cans
    client.post(
        f"/api/v1/logistics/missions/{new_mission_id}/confirm-delivery",
        headers=resp_headers,
        json={
            "item_code": "WATER_CAN_20L",
            "quantity": 5,
            "verification_code": v_code,
            "recipient_name": "Resident Representative"
        }
    )
    # Deliver 10 food packs
    fin_deliv = client.post(
        f"/api/v1/logistics/missions/{new_mission_id}/confirm-delivery",
        headers=resp_headers,
        json={
            "item_code": "FOOD_PACK_FAMILY",
            "quantity": 10,
            "verification_code": v_code,
            "recipient_name": "Resident Representative"
        }
    )
    assert fin_deliv.status_code == 200, f"Delivery failed: {fin_deliv.text}"
    fin_data = fin_deliv.json()
    assert fin_data["all_fulfilled"] is True
    assert fin_data["incident_status"] == "RESOLVED"
