# RELIEFLINK 360 - API Specification & Service Contracts

---

## 1. Authentication & Role Enforcement (`gateway`)

### `POST /api/v1/auth/login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "coordinator@relieflink.org",
    "password": "demo_password"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": "u-101",
      "email": "coordinator@relieflink.org",
      "full_name": "Elena Rostova",
      "role": "COORDINATOR"
    }
  }
  ```

### `POST /api/v1/auth/register`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "volunteer@relieflink.org",
    "password": "volunteer_password_2026",
    "full_name": "Volunteer Vikram",
    "role": "RESPONDER",
    "phone_number": "+91 99000 88776"
  }
  ```
- **Response `201 Created`**: Returns access token and user profile.

### `GET /api/v1/auth/me`
- **Access**: Authenticated (Bearer JWT)
- **Response `200 OK`**: Current user profile without password hash.

---

## 2. Citizen SOS & Incident Operations (`gateway`)

### `POST /api/v1/incidents/sos`
- **Access**: Public / Citizen
- **Request Body**:
  ```json
  {
    "reporter_name": "Jane Doe",
    "reporter_phone": "+91 98765 43210",
    "latitude": 13.0827,
    "longitude": 80.2707,
    "address_text": "Block 4, Velachery Lake Road, Chennai",
    "severity": 4,
    "urgency": 5,
    "vulnerability_score": 4,
    "people_affected": 12,
    "requested_supplies": [
      { "item_code": "WATER_CAN_20L", "quantity": 10 },
      { "item_code": "FOOD_PACK_FAMILY", "quantity": 12 },
      { "item_code": "FIRST_AID_KIT", "quantity": 3 }
    ],
    "notes": "Water level reaching first floor balcony. Power cut since 6 hours."
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "id": "INC-2026-0008",
    "tracking_token": "SOS-TRK-7890",
    "status": "REPORTED",
    "priority_score": 88.5,
    "priority_breakdown": {
      "severity_factor": 20.0,
      "urgency_factor": 25.0,
      "vulnerability_factor": 16.0,
      "headcount_factor": 12.5,
      "shortage_factor": 10.0,
      "total_score": 83.5,
      "explanation": "Score 83.5/100: Severity level 4/5 (+20.0 pts); Urgency level 5/5 (+25.0 pts)..."
    },
    "created_at": "2026-10-31T00:00:00Z"
  }
  ```

### `GET /api/v1/incidents/track/{tracking_token}`
- **Access**: Public (Citizen lookup)
- **Response `200 OK`**: Full audit timeline, supply accountability breakdown, and unstructured MongoDB telemetry.

### `PATCH /api/v1/incidents/{incident_id}/verify`
- **Access**: Role `COORDINATOR` only
- **Request Body**:
  ```json
  {
    "notes": "Drone footage confirms 4ft inundation. Priority approved.",
    "priority_override": 92.5
  }
  ```
- **Response `200 OK`**: Incident with status updated to `VERIFIED`.

### `PATCH /api/v1/incidents/{incident_id}/status`
- **Access**: Role `COORDINATOR` only
- **Request Body**:
  ```json
  {
    "status": "RESOLVED",
    "notes": "Relief mission completed."
  }
  ```
- **Response `200 OK`** or **`400 Bad Request`**:
  Strictly rejected if `incident_supplies` has unfulfilled quantities (`Disaster Accountability Invariant Violation CO6`).

### `GET /api/v1/incidents/priority-queue`
- **Access**: Role `COORDINATOR` only
- **Response `200 OK`**: Active non-resolved incidents ordered by `priority_score DESC`.

### `GET /api/v1/incidents/shortages`
- **Access**: Role `COORDINATOR`, `WAREHOUSE`
- **Response `200 OK`**: Aggregated supply deficits across active incidents cross-referenced against warehouse buffers.

### `GET /api/v1/incidents/similar`
- **Access**: Role `COORDINATOR`, `RESPONDER`
- **Query Params**: `incident_id` or `query_text`, `limit` (default 5)
- **Response `200 OK`**: Nearest-neighbor incidents ranked by pgvector cosine distance (`<=>`).

---

## 3. Inventory Microservice Contract (`inventory-spring`)

### `POST /api/v1/inventory/reserve`
- **Internal Only**: Protected by `X-Internal-Service-Key`
- **Request Body**:
  ```json
  {
    "incident_id": "INC-2026-0042",
    "warehouse_id": "WH-CHENNAI-CENTRAL",
    "allocations": [
      { "item_code": "WATER_CAN_20L", "quantity": 10 },
      { "item_code": "FOOD_PACK_FAMILY", "quantity": 12 }
    ]
  }
  ```
- **ACID Behavior**: Uses `SELECT ... FOR UPDATE` row locks on stock. Returns `409 Conflict` if insufficient stock available.

---

## 4. Simulator Microservice Contract (`simulator-node`)

### `POST /api/v1/simulator/event`
- **Access**: Coordinator / Admin
- **Events**:
  - `ROAD_BLOCK`: Marks geo-segments impassable.
  - `WAREHOUSE_OUTAGE`: Disables warehouse from dispatching.
  - `SURGE`: Injects concurrent cluster of SOS reports.
- **WebSocket Feed**: `ws://localhost:5001/socket.io/?role=COORDINATOR`
