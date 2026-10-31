# RELIEFLINK 360 - System Architecture Specification
## Intelligent Disaster Response & Relief Accountability Network

---

## 1. Executive Summary & Product Vision
**RELIEFLINK 360** is a distributed, resilient disaster response coordination and relief accountability network designed for real-time triage, transparent resource dispatch, and end-to-end chain-of-custody tracking.

During catastrophic emergencies (floods, earthquakes, cyclones), fragmented communication leads to duplicate aid, ghost deliveries, and misallocated medical supplies. RELIEFLINK 360 solves this by unifying four distinct roles under a single verified ledger:
1. **Citizens**: Submit emergency SOS tickets with GPS coordinates, casualty counts, and specific aid needs.
2. **Coordinators**: Review prioritized incidents using an explainable multi-variable priority scoring engine and orchestrate assignments.
3. **Warehouses**: Manage inventories, reserve critical items with ACID transactional guarantees, and approve dispatches.
4. **Responders**: Execute rescue missions, log real-time transit telemetry, and submit verified fulfillment confirmations.

---

## 2. Distributed Architecture Overview

```
                                  [ Citizen Mobile / Laptop ]
                                  [ Coordinator Command Laptop ]
                                  [ Warehouse Logistics Laptop ]
                                  [ Field Responder Laptop ]
                                               │
                                               ▼
                              ┌───────────────────────────────────┐
                              │     React + TypeScript UI         │
                              │  (Vite + Dynamic Role Portals)    │
                              └─────────────────┬─────────────────┘
                                                │ REST / WebSocket
                                                ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Central Gateway (Port 8000)                              │
│  - JWT Bearer Authentication & Server-Side RBAC Enforcement                            │
│  - Citizen SOS Ingress & Public Tracking                                                │
│  - Multi-Variable Explainable Priority Engine                                          │
│  - Distributed Service Orchestration & Audit Pipeline                                   │
└──────────────┬───────────────────────────────┬───────────────────────────────┬─────────┘
               │                               │                               │
               ▼                               ▼                               ▼
┌─────────────────────────────┐ ┌─────────────────────────────┐ ┌─────────────────────────┐
│ Spring Boot Inventory       │ │ Node.js Simulator Service   │ │ MongoDB 7.0             │
│ Service (Port 8081)         │ │ (Port 5001)                 │ │ (Port 27017)            │
│ - ACID Inventory Ledger     │ │ - Road Block Simulations    │ │ - Incident Intelligence │
│ - Stock Reservation Locks   │ │ - Warehouse Outage Engine   │ │ - Drone/Field Imagery   │
│ - Verified Dispatches       │ │ - Live Surge Generation     │ │ - Unstructured Logs     │
└──────────────┬──────────────┘ └──────────────┬──────────────┘ └─────────────────────────┘
               │                               │
               ▼                               │ (Socket.IO Real-time Events)
┌──────────────────────────────────────────────▼────────────────────────────────────────┐
│                          PostgreSQL 16 with pgvector (Port 5432)                      │
│                           *** SINGLE SOURCE OF TRUTH ***                              │
│  - Core Tables: users, incidents, warehouses, inventory_items, inventory_ledger,       │
│                 dispatches, responder_missions, fulfillment_records                   │
│  - Vector Embeddings: situation_embeddings (HNSW / IVFFLAT cosine similarity)         │
│  - Relational Integrity: Foreign key constraints, row-level locks, CHECK constraints  │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Integrity & Polyglot Persistence Principles

### 3.1 PostgreSQL as the Single Source of Truth
- **ACID Guarantees**: All financial, quantity, dispatch, and state-transition operations take place within PostgreSQL transactions.
- **Stock Reservation Concurrency**: When approving a dispatch, the system issues a `SELECT ... FOR UPDATE` row lock on `inventory_items` to guarantee that concurrent dispatches across multiple warehouse stations cannot cause overselling or negative stock.
- **Relief Accountability Invariant**:
  $$\text{Requested Qty} \ge \text{Approved Qty} \ge \text{Dispatched Qty} \ge \text{Delivered Qty}$$
  An incident ticket **cannot be marked resolved** if:
  $$\sum \text{Delivered Qty} < \sum \text{Requested Qty}$$
  Such incidents remain flagged with status `PARTIALLY_FULFILLED` or `IN_DELIVERY`.

### 3.2 MongoDB for Unstructured Incident Intelligence
- **Strict Boundary**: MongoDB **never** stores inventory counts or transaction balances.
- **Document Model**: Used for fast ingestion of:
  - Raw SOS telemetry, multi-lingual audio transcripts, citizen uploaded photos.
  - Sensor streams (water level gauges, weather radar summaries).
  - Situation reports and unstructured coordinator field notes.

### 3.3 pgvector for Semantic Situation Intelligence
- Incident situation summaries are embedded into dense vector representations.
- Coordinators can query using natural language (e.g., *"severe flash flood trapping elderly patients requiring oxygen"*), performing high-speed cosine distance nearest-neighbor queries via pgvector to group related SOS incidents into unified operational clusters.

---

## 4. Multi-Variable Explainable Priority Engine

Rather than relying on black-box heuristics, RELIEFLINK 360 uses a deterministic, transparent formula that coordinators can audit:

$$\text{Priority Score } (P) = w_1 S + w_2 U + w_3 V + w_4 \log_{10}(N + 1) + w_5 R + w_6 A$$

Where:
- $S \in [1, 5]$: **Severity** (1 = Minor inconvenience, 5 = Imminent threat to life)
- $U \in [1, 5]$: **Urgency / Time-to-Harm** (1 = $>24\text{ hours}$, 5 = $<1\text{ hour}$)
- $V \in [1, 5]$: **Vulnerability Score** (Elderly, infants, hospitalized, mobility impaired)
- $N \ge 1$: **Number of People Affected**
- $R \in [1, 5]$: **Critical Resource Shortage Factor** (Potable water, blood units, insulin, rescue boats)
- $A \in [1, 5]$: **Accessibility Difficulty** (1 = Highway accessible, 5 = Completely cut off / bridge collapsed)

Weights ($w_1 = 0.25, w_2 = 0.25, w_3 = 0.20, w_4 = 0.15, w_5 = 0.10, w_6 = 0.05$) normalize the output to a score between $[0.0, 100.0]$, accompanied by a human-readable explanation breakdown.

---

## 5. Security & Authentication Architecture

1. **Server-Side Role-Based Access Control (RBAC)**:
   - Every protected API route enforces JWT verification inside the FastAPI dependency injection pipeline (`Depends(get_current_user_with_roles([...]))`).
   - Frontend UI elements reflect user permissions, but **the server rejects unauthorized actions regardless of client state**.
2. **Four Core Roles**:
   - `CITIZEN`: Public SOS submission, tracking ticket lookup.
   - `COORDINATOR`: Incident verification, priority override, resource allocation, simulator controls.
   - `WAREHOUSE`: Inventory ledger CRUD, dispatch approval, stock receipts.
   - `RESPONDER`: Mission acceptance, field check-ins, delivery photo/code confirmation.
3. **Internal Microservice Mesh Security**:
   - Gateway-to-microservice communication requires an `X-Internal-Service-Key` header to block direct external manipulation of inventory or simulator endpoints.

---

## 6. Disaster Simulator Specifications

The Node.js Simulator generates real-time disruptions to stress-test coordination:
1. **Road Blockages**: Simulates impassable transit nodes, automatically triggering mission rerouting and travel time recalculation.
2. **Warehouse Outage**: Simulates power grid loss or structural damage, forcing the coordinator to reallocate dispatches to secondary regional depots.
3. **Responder Blackout**: Simulates lost communications or vehicle breakdown, alerting coordinators to unassigned active missions.
4. **Surge Event**: Injects 10–50 concurrent SOS requests across geographical clusters to evaluate database throughput and queue prioritization under load.
