import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_warehouse_inventory_rbac():
    # 1. Unauthenticated request should fail with 401
    resp = client.get("/api/v1/logistics/inventory")
    assert resp.status_code == 401

    # 2. Login as Warehouse Manager
    wh_login = client.post("/api/v1/auth/login", json={
        "email": "warehouse@relieflink.org",
        "password": "demo_warehouse_2026"
    })
    assert wh_login.status_code == 200
    wh_token = wh_login.json()["access_token"]
    wh_headers = {"Authorization": f"Bearer {wh_token}"}

    # 3. Fetch inventory
    inv_resp = client.get("/api/v1/logistics/inventory", headers=wh_headers)
    assert inv_resp.status_code == 200
    items = inv_resp.json()
    assert len(items) > 0
    first_item = items[0]
    assert "warehouse_id" in first_item
    assert "item_code" in first_item
    assert "quantity_on_hand" in first_item
    assert "available_quantity" in first_item

def test_warehouses_list():
    login = client.post("/api/v1/auth/login", json={
        "email": "coordinator@relieflink.org",
        "password": "demo_coordinator_2026"
    })
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/logistics/warehouses", headers=headers)
    assert resp.status_code == 200
    whs = resp.json()
    assert len(whs) >= 3

def test_accountability_matrix():
    login = client.post("/api/v1/auth/login", json={
        "email": "coordinator@relieflink.org",
        "password": "demo_coordinator_2026"
    })
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/logistics/accountability-matrix", headers=headers)
    assert resp.status_code == 200
    matrix = resp.json()
    assert len(matrix) >= 5
    # Verify INC-2026-0003 is flagged as partially fulfilled
    inc_3 = next((i for i in matrix if i["incident_id"] == "INC-2026-0003"), None)
    assert inc_3 is not None
    assert inc_3["is_partially_fulfilled"] is True
    assert inc_3["status"] == "PARTIALLY_FULFILLED"

def test_responder_missions_list():
    login = client.post("/api/v1/auth/login", json={
        "email": "responder@relieflink.org",
        "password": "demo_responder_2026"
    })
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/logistics/missions", headers=headers)
    assert resp.status_code == 200
    missions = resp.json()
    assert len(missions) > 0
    assert "status" in missions[0]
    assert "verification_code" in missions[0]

def test_dispatches_list():
    login = client.post("/api/v1/auth/login", json={
        "email": "warehouse@relieflink.org",
        "password": "demo_warehouse_2026"
    })
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/logistics/dispatches", headers=headers)
    assert resp.status_code == 200
    dispatches = resp.json()
    assert len(dispatches) > 0
