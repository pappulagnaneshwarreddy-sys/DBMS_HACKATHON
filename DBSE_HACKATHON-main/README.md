# RELIEFLINK 360
### Intelligent Disaster Response & Relief Accountability Network
> **Database Systems Engineering & Distributed Backend Systems | Hackathon Edition**

[![CI Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/yashu-cyber/DBSE_HACKATHON)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20pgvector-blue)](https://www.postgresql.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0%20Intelligence-green)](https://www.mongodb.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Gateway-009688)](https://fastapi.tiangolo.com/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2%20ACID-brightgreen)](https://spring.io/projects/spring-boot)

---

## 1. Project Overview

**RELIEFLINK 360** is an enterprise-grade, distributed disaster response coordination system engineered to provide transparent, verifiable relief delivery during major catastrophic events. It unifies four critical roles across four separate stations:
- **Coordinator**: Live incident triage, explainable multi-variable priority engine, resource allocation, and disaster simulator.
- **Warehouse**: ACID inventory management with pessimistic row locking (`SELECT FOR UPDATE`), dispatch approvals, and ledger audit.
- **Responder**: Field mission management, GPS check-in, obstacle logging, and verified fulfillment confirmation.
- **Citizen**: Emergency SOS reporting, location pinning, vulnerability reporting, and live tracking ticket with partial fulfillment status.

### The Relief Accountability Invariant
$$\text{Requested Qty} \ge \text{Approved Qty} \ge \text{Dispatched Qty} \ge \text{Delivered Qty}$$
An emergency incident **cannot be marked resolved** if any requested item has unmet deliveries ($\sum \text{Delivered} < \sum \text{Requested}$). Partially fulfilled incidents remain flagged and prioritized until completely served.

---

## 2. System Architecture

```
                                [ Citizen Mobile / Laptop ]
                                [ Coordinator Command Laptop ]
                                [ Warehouse Logistics Laptop ]
                                [ Field Responder Laptop ]
                                              │
                                              ▼
                             ┌─────────────────────────────────┐
                             │     React + TypeScript UI       │
                             │  (Vite + Dynamic Role Portals)  │
                             └────────────────┬────────────────┘
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
│                 dispatches, responder_missions, incident_supplies                     │
│  - Vector Embeddings: situation_embeddings (HNSW / IVFFLAT cosine similarity)         │
│  - Relational Integrity: Foreign key constraints, row-level locks, CHECK constraints  │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Academic Traceability: Course Outcomes (CO1 - CO6)

| Outcome | Focus Area | Specific RELIEFLINK 360 Implementation |
| :--- | :--- | :--- |
| **CO1** | **Data Modeling & Schema** | 3NF PostgreSQL schema with strict check constraints on coordinates, status states, and positive quantities. Link: [`database/postgres/init.sql`](file:///Users/yashaskasula/.gemini/antigravity-ide/scratch/DBSE_HACKATHON/database/postgres/init.sql). |
| **CO2** | **ACID & Concurrency** | Pessimistic row locking (`SELECT FOR UPDATE`) on stock reservation to prevent overselling relief items during concurrent dispatch approvals. |
| **CO3** | **Polyglot Persistence** | Strict boundary: PostgreSQL is the single source of truth for stock and dispatches. MongoDB holds unstructured audio transcripts and drone imagery. **No conflicting stock data in MongoDB**. |
| **CO4** | **Indexing & Search** | Compound B-Trees `(status, priority_score DESC)` and 384-dimensional vector embeddings with pgvector for natural language incident triage. |
| **CO5** | **Distributed Gateway** | FastAPI gateway enforcing server-side RBAC and JWT validation. Internal microservice mesh authenticated with secret header keys. |
| **CO6** | **Resilience & Accountability** | Disaster Simulator (road blocks, warehouse outages, surges) + mathematical relief accountability invariant. |

Full academic matrix available in [`docs/TRACEABILITY_MATRIX.md`](file:///Users/yashaskasula/.gemini/antigravity-ide/scratch/DBSE_HACKATHON/docs/TRACEABILITY_MATRIX.md).

---

## 4. Multi-Laptop Demo Roles & Credentials

For tomorrow's multi-laptop demonstration running on a single host MacBook across the local Wi-Fi network (no public cloud or tunnel required):

> [!TIP]
> Complete walkthrough, network troubleshooting, and live 4-laptop demonstration steps are documented in **[`LOCAL_DEMO_GUIDE.md`](file:///Users/yashaskasula/.gemini/antigravity-ide/scratch/DBSE_HACKATHON/LOCAL_DEMO_GUIDE.md)**.

| Role | Target Station | Demo Email | Plaintext Demo Password |
| :--- | :--- | :--- | :--- |
| **COORDINATOR** | Laptop 1 (Command) | `coordinator@relieflink.org` | `demo_coordinator_2026` |
| **WAREHOUSE** | Laptop 2 (Depot) | `warehouse@relieflink.org` | `demo_warehouse_2026` |
| **RESPONDER** | Laptop 3 (Field) | `responder@relieflink.org` | `demo_responder_2026` |
| **CITIZEN** | Laptop 4 / Mobile | `citizen@relieflink.org` (or Public SOS) | `demo_citizen_2026` |

Pre-seeded tracking ticket demonstrating the partial fulfillment rule: **`SOS-TRK-9003`** (20 requested, 10 delivered, status `PARTIALLY_FULFILLED`).

---


## 5. Repository Directory Structure

```
DBSE_HACKATHON/
├── .github/workflows/ci.yml       # GitHub Actions CI pipeline
├── .env.example                   # Master safe environment template
├── .gitignore                     # Monorepo ignore configuration
├── README.md                      # Master documentation & guide
├── docker-compose.yml             # Full-stack container orchestration
├── docs/
│   ├── ARCHITECTURE.md            # Deep-dive architecture & data flows
│   ├── TRACEABILITY_MATRIX.md     # CO1 - CO6 course outcome matrix
│   ├── MILESTONES.md              # Hackathon implementation roadmap
│   └── API_SPEC.md                # Inter-service REST & WebSocket contracts
├── database/
│   ├── postgres/
│   │   ├── init.sql               # PostgreSQL 3NF schema, constraints & pgvector
│   │   └── seed_demo_data.sql     # Pre-seeded demo users, warehouses, incidents
│   └── mongo/
│       └── init-mongo.js          # MongoDB collections & drone telemetry seeds
├── gateway/
│   ├── .env.example
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── core/config.py         # Pydantic settings & environment binding
│       └── main.py                # FastAPI gateway entrypoint & health checks
├── services/
│   ├── inventory-spring/          # Spring Boot 3.2 PostgreSQL inventory service
│   │   ├── pom.xml
│   │   ├── Dockerfile
│   │   └── src/
│   └── simulator-node/            # Node.js + Socket.IO disaster simulator
│       ├── package.json
│       ├── Dockerfile
│       └── src/index.js
└── frontend/                      # React + TypeScript + Vite UI
    ├── package.json
    ├── vite.config.ts
    ├── Dockerfile
    └── src/
        ├── App.tsx                # Role portal switcher & system status
        ├── index.css              # Custom design system tokens
        └── main.tsx
```

---

## 6. Local Quickstart (Without Docker)

You can run each service individually on your local environment:

### Step 1: Copy Environment Templates
```bash
cp .env.example .env
cp gateway/.env.example gateway/.env
cp services/simulator-node/.env.example services/simulator-node/.env
cp frontend/.env.example frontend/.env
```

### Step 2: Gateway (FastAPI)
```bash
cd gateway
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 3: Simulator Service (Node.js)
```bash
cd services/simulator-node
npm install
npm run dev
```

### Step 4: Frontend (React + TypeScript)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 7. Containerized Quickstart (Docker Compose)

Once Docker Desktop is active:
```bash
docker compose up --build
```
This automatically boots PostgreSQL with pgvector, MongoDB 7, FastAPI Gateway, Spring Boot inventory service, Node.js simulator, and the React frontend.

---

## 8. Milestone 2 Database Engine Verification

To start only the database engines and execute the complete verification test suite:

```bash
# 1. Start PostgreSQL (pgvector) and MongoDB 7.0
docker compose up -d postgres mongo

# 2. Run the PostgreSQL Verification Suite (Joins, CTEs, Window Functions, Invariant Checks, pgvector)
docker exec -i relieflink-postgres psql -U relieflink_admin -d relieflink_db < database/postgres/verification_queries.sql

# 3. Verify MongoDB Geospatial 2dsphere and Schema-less Documents
docker exec -i relieflink-mongo mongosh -u mongo_admin -p mongo_dev_password_change_in_prod --authenticationDatabase admin relieflink_intelligence --eval "
db.drone_telemetry.find({ location: { \$near: { \$geometry: { type: 'Point', coordinates: [80.2100, 13.0850] }, \$maxDistance: 5000 } } }).pretty();
"
```

> [!NOTE]
> Full architectural details, invariant trigger proofs, pgvector HNSW query execution plans, and test outputs are documented in **[`docs/DATABASE_ENGINE.md`](file:///Users/yashaskasula/.gemini/antigravity-ide/scratch/DBSE_HACKATHON/docs/DATABASE_ENGINE.md)**.

