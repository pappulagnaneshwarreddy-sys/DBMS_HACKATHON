# RELIEFLINK 360 - Local Wi-Fi Multi-Laptop Demonstration Guide
## 100% Offline-Ready &bull; Zero Cloud &bull; 4 Laptops on 1 Local Wi-Fi Network

This guide explains how to run the entire **RELIEFLINK 360** distributed architecture locally on one host MacBook and provide seamless access to three other laptops across the same Wi-Fi network (or mobile hotspot) without relying on any external cloud services (no Supabase, no Render, no Vercel, no Atlas).

---

## 1. How to Find Your MacBook's Local IP Address

On the host MacBook running the application:

### Quick Command (Terminal)
Open Terminal and run:
```bash
ipconfig getifaddr en0
```
*(If your Wi-Fi interface is on `en1`, run `ipconfig getifaddr en1`)*.

**Example output:**
```text
192.168.68.100
```
This IP address (`192.168.68.100` in this example) is your **Host MacBook IP**.

### Alternative (macOS Settings)
1. Open **System Settings** &rarr; **Wi-Fi**.
2. Click **Details...** next to your connected Wi-Fi network.
3. Look for the **IP address** listed under the *TCP/IP* tab.

---

## 2. Which URL the Other Laptops Should Open

Once the application is running on your host MacBook (e.g. at IP `192.168.68.100`), open Chrome, Safari, Firefox, or Edge on the other 3 laptops:

### Primary Web Application URL (All Laptops):
```text
http://<HOST_MACBOOK_IP>:5173
```
*Example for the other laptops to type in their browser:*
```text
http://192.168.68.100:5173
```

### Direct Backend Endpoints (for testing/verification):
- **FastAPI Interactive Docs (Swagger)**: `http://<HOST_MACBOOK_IP>:8000/docs`
- **Gateway Health Check**: `http://<HOST_MACBOOK_IP>:8000/health`
- **Simulator WebSocket & REST**: `http://<HOST_MACBOOK_IP>:5001/health`

> [!NOTE]
> **Zero Configuration Required for Other Laptops:**  
> The React frontend dynamically resolves the backend gateway and WebSocket host from `window.location.hostname`. When Laptop 2 opens `http://192.168.68.100:5173`, it automatically connects its API calls to `http://192.168.68.100:8000` without any manual configuration changes.

---

## 3. How to Start the Entire Application

You have two startup options depending on whether Docker Desktop is running:

### Method A: Local Direct Execution (Fastest & Native)
If Docker is not running or you prefer native local processes, run each service in separate terminal tabs from the project root directory ([`DBSE_HACKATHON`](file:///Users/yashaskasula/.gemini/antigravity-ide/scratch/DBSE_HACKATHON)):

#### Step 1: Copy Environment Templates
```bash
cp .env.example .env
cp gateway/.env.example gateway/.env
cp services/simulator-node/.env.example services/simulator-node/.env
cp frontend/.env.example frontend/.env
```

#### Step 2: Start Node.js Disaster Simulator Service (Terminal 1)
```bash
cd services/simulator-node
npm run dev
```
*Listening on:* `http://0.0.0.0:5001` (Socket.IO + REST)

#### Step 3: Start FastAPI API Gateway (Terminal 2)
```bash
cd gateway
source venv/bin/activate    # or 'python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt'
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*Listening on:* `http://0.0.0.0:8000` (FastAPI with CORS enabled for all LAN IPs)

#### Step 4: Start React Frontend (Terminal 3)
```bash
cd frontend
npm run dev
```
*Listening on:* `http://0.0.0.0:5173` (Vite dev server bound to all interfaces)

---

### Method B: Docker Compose (All Services Containerized)
1. Start **Docker Desktop** on the host MacBook.
2. Run:
```bash
docker compose up --build
```
3. To run in background (detached mode):
```bash
docker compose up -d
```

> [!IMPORTANT]
> **Database Security Guarantee:**  
> In [`docker-compose.yml`](file:///Users/yashaskasula/.gemini/antigravity-ide/scratch/DBSE_HACKATHON/docker-compose.yml), PostgreSQL (`5432`) and MongoDB (`27017`) are explicitly bound only to `127.0.0.1`. Other devices on your Wi-Fi network cannot connect directly to your database ports; they can only interact via the authenticated FastAPI Gateway on port `8000`.

---

## 4. The 4 Demo Roles & Pre-Seeded Accounts

The database is pre-seeded with four dedicated demo users and scenarios:

| Laptop Station | Role | Email | Password | Primary Screen / Workflow |
| :--- | :--- | :--- | :--- | :--- |
| **Laptop #1** | **COORDINATOR** | `coordinator@relieflink.org` | `demo_coordinator_2026` | Live triage queue, explainable priority breakdown, road block simulator. |
| **Laptop #2** | **WAREHOUSE** | `warehouse@relieflink.org` | `demo_warehouse_2026` | Real-time stock ledger, ACID stock reservations, dispatch manifests. |
| **Laptop #3** | **RESPONDER** | `responder@relieflink.org` | `demo_responder_2026` | Mission assignment queue, transit check-in, fulfillment confirmation. |
| **Laptop #4** | **CITIZEN** | `citizen@relieflink.org` (or Public SOS) | `demo_citizen_2026` | Emergency SOS submission with GPS pin, live tracking ticket. |

### Accountability Verification Showcase (The Partial Fulfillment Rule):
Open tracking ticket **`SOS-TRK-9003`** on Laptop #4:
- Requested: **20 Water Cans** &amp; **25 Food Packs**
- Delivered: **10 Water Cans** &amp; **12 Food Packs**
- Status: **`PARTIALLY_FULFILLED`** (Cannot be marked resolved because aid remains pending!)

---

## 5. How to Test All Four Roles Simultaneously (Live Demo Script)

To demonstrate the distributed system to professors/evaluators:

1. **Station 4 (Citizen Laptop / Phone)**:
   - Open `http://<HOST_MACBOOK_IP>:5173`.
   - Submit a new emergency SOS ticket: select *"Riverview Apartments Flood"*, 15 people affected, request 10 water cans and 2 medical kits.
   - Note the generated tracking token (e.g., `SOS-TRK-XXXX`).
2. **Station 1 (Coordinator Laptop)**:
   - Open `http://<HOST_MACBOOK_IP>:5173` and log in as Coordinator.
   - Observe the new SOS appear in the live queue with a calculated priority score (e.g., `92.4`).
   - Click to inspect the **Explainable Priority Breakdown** (Severity + Urgency + Vulnerabilities + Headcount).
   - Click **Verify & Allocate to Central Warehouse**.
3. **Station 2 (Warehouse Laptop)**:
   - Open `http://<HOST_MACBOOK_IP>:5173` and log in as Warehouse.
   - Observe the allocation request. Click **Approve Dispatch**.
   - The database executes an atomic `SELECT ... FOR UPDATE` row lock, decrements available stock, reserves the items, and generates vehicle manifest `DSP-2026-XXXX`.
4. **Station 3 (Field Responder Laptop)**:
   - Open `http://<HOST_MACBOOK_IP>:5173` and log in as Responder.
   - Accept the new rescue mission.
   - Click **Arrived On Scene**. Enter delivered quantity (e.g., 5 cans delivered out of 10) and submit OTP confirmation.
5. **Station 4 & 1 Verification**:
   - Both the Citizen ticket on Laptop 4 and Coordinator dashboard on Laptop 1 instantly reflect **`PARTIALLY_FULFILLED`**.
   - Show evaluators that the ticket remains unresolved because unmet aid exists!

---

## 6. Troubleshooting macOS Firewall & Wi-Fi Connectivity

If the other laptops cannot load `http://<HOST_MACBOOK_IP>:5173`, follow these steps:

### Issue 1: macOS Firewall is Blocking Inbound Connections
1. On the host MacBook, open **System Settings** &rarr; **Network** &rarr; **Firewall**.
2. If Firewall is ON:
   - Click **Options...**
   - Ensure "Block all incoming connections" is **DISABLED**.
   - Add `node` and `python` (or `uvicorn` / `docker`) and set them to **"Allow incoming connections"**.
   - *Alternative for testing during the hackathon:* Temporarily turn the Firewall **OFF** for the duration of the demonstration.

### Issue 2: Wi-Fi "AP Isolation" / "Client Isolation"
Some college campus Wi-Fi networks block devices from talking directly to each other (called Client Isolation).
- **Test:** On Laptop 2, open Terminal or Command Prompt and ping the host MacBook:
  ```bash
  ping <HOST_MACBOOK_IP>
  ```
- **Solution if Ping Fails:**
  - Turn on **Personal Hotspot** on any smartphone (no mobile data required once packages are installed).
  - Connect all 4 laptops to this same mobile hotspot.
  - Re-run `ipconfig getifaddr en0` on the MacBook to find the new hotspot IP (typically `172.20.10.x` or `192.168.43.x`).
  - Open `http://<NEW_IP>:5173` on all laptops.

### Issue 3: Port Conflict (Port 5173 or 8000 already in use)
Check which process is using the port:
```bash
lsof -i :5173
lsof -i :8000
lsof -i :5001
```
Kill unwanted processes:
```bash
kill -9 <PID>
```

---

## 7. How to Stop and Restart the System

### If Running Locally in Terminal:
- Press `Ctrl + C` in each terminal tab (Frontend, Gateway, Simulator).
- To restart, simply run the corresponding `npm run dev` or `uvicorn` command again.

### If Running via Docker Compose:
```bash
# Stop all containers
docker compose down

# Stop and remove data volumes (full clean reset)
docker compose down -v

# Restart containers
docker compose up -d
```

---

## 8. 100% Offline Operation Guarantee

All core dependencies are bundled locally:
- React frontend packages are cached in `node_modules/` and bundled with Vite.
- Google Fonts (`Plus Jakarta Sans` and `JetBrains Mono`) have fallback system font stacks (`system-ui`, `-apple-system`, `monospace`).
- Vector embeddings and database tables run locally inside PostgreSQL.
- No CDN script tags or third-party cloud SDKs are required at runtime.
