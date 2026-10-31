# Course Outcome (CO1 - CO6) Implementation Traceability Matrix
## Database Systems Engineering & Distributed Backend Development

This document establishes the academic and engineering mapping between standard **Database Systems Engineering (DBSE)** course outcomes and the specific implementations in **RELIEFLINK 360**.

---

| Course Outcome | Academic Definition & Focus | RELIEFLINK 360 Implementation Details | Source Files / Artefacts |
| :--- | :--- | :--- | :--- |
| **CO1: Data Modeling & Schema Design** | Design normalized relational schemas, define primary/foreign keys, check constraints, domain integrity, and relational algebra operations. | - Normalized 3NF PostgreSQL schema.<br>- Strict `CHECK` constraints on priority scores ($1 \le S \le 5$), latitude/longitude boundaries, and positive inventory quantities.<br>- Immutable audit ledger linking incidents, dispatches, and fulfillment records via foreign keys with cascade rules. | `database/postgres/init.sql`<br>`gateway/app/models/`<br>`docs/ARCHITECTURE.md` |
| **CO2: Transactions & Concurrency Control** | Implement ACID guarantees, transaction isolation levels, pessimistic/optimistic locking, and race condition prevention. | - Row-level locking (`SELECT ... FOR UPDATE`) during warehouse dispatch approvals to prevent overselling of relief stock.<br>- Atomic multi-table transactions encapsulating inventory decrement, dispatch record creation, and incident fulfillment status updates.<br>- Prevention of dirty reads and phantom updates under concurrent coordinator approvals. | `services/inventory-spring/`<br>`gateway/app/services/dispatch.py`<br>`database/postgres/init.sql` |
| **CO3: Polyglot Persistence & Data Distribution** | Evaluate tradeoffs between Relational (SQL) and Document (NoSQL) stores; maintain data consistency boundaries across heterogeneous storage engines. | - **PostgreSQL**: Single source of truth for transactional data (incidents, stock balances, missions, user credentials).<br>- **MongoDB**: Unstructured, flexible telemetry store for raw citizen audio/photo uploads, drone logs, and field reports.<br>- **Zero-Duplication Invariant**: Stock balances are never duplicated in MongoDB, eliminating distributed split-brain inconsistencies. | `database/postgres/init.sql`<br>`database/mongo/init-mongo.js`<br>`gateway/app/db/` |
| **CO4: Indexing & Query Optimization** | Design high-performance B-Trees, spatial/vector indexes, explain query execution plans, and implement semantic search. | - B-Tree indexes on `incident_id`, `warehouse_id`, `status`, and compound indexes on `(status, priority_score DESC)`.<br>- **pgvector Extension**: HNSW/IVFFLAT index on 384-dimensional situation vector embeddings for sub-millisecond semantic incident deduplication and grouping.<br>- Query optimization using indexed joins to generate real-time accountability matrices. | `database/postgres/init.sql`<br>`gateway/app/services/semantic_search.py` |
| **CO5: Distributed Microservices & Gateway** | Build distributed architectures with API gateways, server-side RBAC, JWT validation, service communication, and decoupling. | - **FastAPI Central Gateway**: Ingress validation, JWT authentication, role enforcement for 4 roles (`CITIZEN`, `COORDINATOR`, `WAREHOUSE`, `RESPONDER`).<br>- **Spring Boot Microservice**: Dedicated high-throughput inventory service.<br>- **Node.js Express Microservice**: Event simulation engine with WebSocket broadcasting.<br>- Internal service mesh security via secret header tokens. | `gateway/app/`<br>`services/inventory-spring/`<br>`services/simulator-node/`<br>`docker-compose.yml` |
| **CO6: Fault Tolerance & Disaster Resilience** | Design resilient systems that handle network partitions, resource shortages, event surges, and verifiable accountability. | - **Disaster Simulator**: Injects real-time road collapses, warehouse blackouts, and responder disconnects.<br>- **Relief Accountability Engine**: Strict verification comparing $\text{Requested} \ge \text{Approved} \ge \text{Dispatched} \ge \text{Delivered}$. Prevents premature resolution of partially served incidents.<br>- Health checks and graceful service degradation in Docker Compose. | `services/simulator-node/`<br>`gateway/app/services/priority.py`<br>`frontend/src/` |

---

### Verification and Evaluation Methodology for Evaluators

1. **CO1 & CO2 Test**:
   - Run concurrent dispatch requests against an item with only 5 units in stock.
   - Observe that exactly 5 units are allocated and subsequent requests fail gracefully with HTTP 409 Conflict (no negative inventory).
2. **CO3 Test**:
   - Inspect MongoDB collections and verify that zero inventory balances exist there.
   - Post an SOS with raw field attachments and verify document storage in MongoDB and relational reference in PostgreSQL.
3. **CO4 Test**:
   - Execute an `EXPLAIN ANALYZE` on vector similarity search queries using the pgvector cosine distance operator `<=>`.
4. **CO5 Test**:
   - Attempt to call coordinator dispatch endpoints using a `CITIZEN` or `RESPONDER` JWT token and verify immediate HTTP 403 Forbidden rejection.
5. **CO6 Test**:
   - Trigger a road block event from the simulator and verify that the coordinator's mission dispatch alerts show the affected route and reassigns to an alternate path.
