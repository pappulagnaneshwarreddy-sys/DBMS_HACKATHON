-- ============================================================================
-- RELIEFLINK 360 - Database Systems Engineering Relational Schema (PostgreSQL 16)
-- Single Source of Truth for Incidents, Inventory, Dispatches, and Accountability
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Resource Categories (CO1: Reference Table & Domain Integrity)
CREATE TABLE IF NOT EXISTS resource_categories (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_critical BOOLEAN DEFAULT FALSE,
    default_unit VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users & Server-Side Roles (CO5: Server-Side RBAC Foundation)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('COORDINATOR', 'WAREHOUSE', 'RESPONDER', 'CITIZEN')),
    assigned_facility_id VARCHAR(100),
    phone_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Warehouses / Regional Logistics Hubs
CREATE TABLE IF NOT EXISTS warehouses (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90.0 AND 90.0),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180.0 AND 180.0),
    address TEXT NOT NULL,
    contact_phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'OPERATIONAL' CHECK (status IN ('OPERATIONAL', 'DEGRADED', 'OFFLINE')),
    capacity_cubic_meters INT DEFAULT 1000 CHECK (capacity_cubic_meters > 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Inventory Items & Stock Balances (ACID Source of Truth - CO1 & CO2)
CREATE TABLE IF NOT EXISTS inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id VARCHAR(50) NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    item_code VARCHAR(100) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL REFERENCES resource_categories(code),
    unit VARCHAR(50) NOT NULL,
    quantity_on_hand INT NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    quantity_reserved INT NOT NULL DEFAULT 0 CHECK (quantity_reserved >= 0),
    safety_stock_threshold INT NOT NULL DEFAULT 10 CHECK (safety_stock_threshold >= 0),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_warehouse_item UNIQUE (warehouse_id, item_code),
    CONSTRAINT chk_inventory_availability CHECK (quantity_on_hand >= quantity_reserved)
);

-- 5. Inventory Audit Ledger (Immutable transaction history for CO2/CO6 accountability)
CREATE TABLE IF NOT EXISTS inventory_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    warehouse_id VARCHAR(50) NOT NULL REFERENCES warehouses(id),
    item_code VARCHAR(100) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('RECEIPT', 'RESERVATION', 'DISPATCH', 'RETURN', 'ADJUSTMENT')),
    delta_quantity INT NOT NULL,
    balance_after INT NOT NULL CHECK (balance_after >= 0),
    reference_id VARCHAR(100), -- Incident ID, Dispatch ID, or PO number
    created_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Incidents / Emergency SOS Records
CREATE TABLE IF NOT EXISTS incidents (
    id VARCHAR(50) PRIMARY KEY, -- E.g., 'INC-2026-0001'
    tracking_token VARCHAR(50) UNIQUE NOT NULL, -- E.g., 'SOS-TRK-1234'
    reporter_name VARCHAR(255) NOT NULL,
    reporter_phone VARCHAR(50) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90.0 AND 90.0),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180.0 AND 180.0),
    address_text TEXT NOT NULL,
    severity INT NOT NULL CHECK (severity BETWEEN 1 AND 5),
    urgency INT NOT NULL CHECK (urgency BETWEEN 1 AND 5),
    vulnerability_score INT NOT NULL CHECK (vulnerability_score BETWEEN 1 AND 5),
    people_affected INT NOT NULL DEFAULT 1 CHECK (people_affected >= 1),
    priority_score DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (priority_score BETWEEN 0.0 AND 100.0),
    priority_breakdown JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(50) DEFAULT 'REPORTED' CHECK (status IN (
        'REPORTED', 'VERIFIED', 'IN_DISPATCH', 'IN_DELIVERY', 'PARTIALLY_FULFILLED', 'RESOLVED', 'CANCELLED'
    )),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Incident Requested vs Approved vs Dispatched vs Delivered Supplies (CO1/CO2/CO6 Invariant)
CREATE TABLE IF NOT EXISTS incident_supplies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id VARCHAR(50) NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    item_code VARCHAR(100) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    requested_qty INT NOT NULL CHECK (requested_qty > 0),
    approved_qty INT NOT NULL DEFAULT 0 CHECK (approved_qty >= 0),
    dispatched_qty INT NOT NULL DEFAULT 0 CHECK (dispatched_qty >= 0),
    delivered_qty INT NOT NULL DEFAULT 0 CHECK (delivered_qty >= 0),
    fulfillment_status VARCHAR(50) DEFAULT 'PENDING' CHECK (fulfillment_status IN ('PENDING', 'PARTIAL', 'FULFILLED')),
    CONSTRAINT uq_incident_item UNIQUE (incident_id, item_code),
    CONSTRAINT chk_supply_chain_quantities CHECK (
        approved_qty <= requested_qty AND
        dispatched_qty <= approved_qty AND
        delivered_qty <= dispatched_qty
    )
);

-- 8. Dispatches from Warehouses
CREATE TABLE IF NOT EXISTS dispatches (
    id VARCHAR(50) PRIMARY KEY, -- E.g., 'DSP-2026-0001'
    incident_id VARCHAR(50) NOT NULL REFERENCES incidents(id),
    warehouse_id VARCHAR(50) NOT NULL REFERENCES warehouses(id),
    status VARCHAR(50) DEFAULT 'PREPARING' CHECK (status IN ('PREPARING', 'IN_TRANSIT', 'DELIVERED', 'FAILED')),
    vehicle_type VARCHAR(100) NOT NULL,
    driver_name VARCHAR(255) NOT NULL,
    driver_phone VARCHAR(50) NOT NULL,
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8b. Dispatch Items (Manifest of supplies packed per dispatch)
CREATE TABLE IF NOT EXISTS dispatch_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dispatch_id VARCHAR(50) NOT NULL REFERENCES dispatches(id) ON DELETE CASCADE,
    item_code VARCHAR(100) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dispatch_item UNIQUE (dispatch_id, item_code)
);

-- 9. Responder Missions
CREATE TABLE IF NOT EXISTS responder_missions (
    id VARCHAR(50) PRIMARY KEY, -- E.g., 'MSN-2026-0001'
    incident_id VARCHAR(50) NOT NULL REFERENCES incidents(id),
    dispatch_id VARCHAR(50) REFERENCES dispatches(id),
    responder_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'COMPLETED', 'ABORTED')),
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    completion_notes TEXT,
    verification_code VARCHAR(20) -- Confirmation code provided by citizen on delivery
);

-- 10. Delivery Confirmations (Fulfillment Records & Chain of Custody)
CREATE TABLE IF NOT EXISTS delivery_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id VARCHAR(50) NOT NULL REFERENCES incidents(id),
    dispatch_id VARCHAR(50) REFERENCES dispatches(id),
    mission_id VARCHAR(50) REFERENCES responder_missions(id),
    recipient_name VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(50),
    verification_code VARCHAR(20) NOT NULL,
    confirmation_type VARCHAR(50) DEFAULT 'VERIFICATION_CODE' CHECK (confirmation_type IN ('VERIFICATION_CODE', 'SIGNATURE', 'GEO_STAMP', 'OFFLINE_SYNC')),
    items_delivered JSONB NOT NULL,
    confirmed_by_user_id UUID REFERENCES users(id),
    photo_evidence_ref VARCHAR(255),
    notes TEXT,
    confirmed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. Incident Activity History (Audit Trail for Accountability)
CREATE TABLE IF NOT EXISTS incident_activity_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id VARCHAR(50) NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    actor_id UUID REFERENCES users(id),
    actor_role VARCHAR(50),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. Semantic Situation Vector Embeddings (CO4 pgvector for fast similarity clustering)
CREATE TABLE IF NOT EXISTS situation_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id VARCHAR(50) NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    situation_text TEXT NOT NULL,
    embedding vector(384), -- MiniLM 384-dimensional dense vector
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- Indexes for High-Performance Queries (CO4 Query Optimization)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_compound ON incidents(status, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_incident_supplies_incident ON incident_supplies(incident_id);
CREATE INDEX IF NOT EXISTS idx_inventory_lookup ON inventory_items(warehouse_id, item_code);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_ledger_item ON inventory_ledger(warehouse_id, item_code);
CREATE INDEX IF NOT EXISTS idx_dispatches_incident ON dispatches(incident_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_items_dsp ON dispatch_items(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_missions_responder ON responder_missions(responder_id, status);
CREATE INDEX IF NOT EXISTS idx_delivery_confirmations_incident ON delivery_confirmations(incident_id);
CREATE INDEX IF NOT EXISTS idx_activity_history_incident ON incident_activity_history(incident_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_situation_embeddings_hnsw ON situation_embeddings USING hnsw (embedding vector_cosine_ops);

-- ============================================================================
-- Database Triggers & Functions for Invariant Enforcement & Accountability
-- ============================================================================

-- Function 1: Invariant Guard: Partial fulfilment must NEVER automatically mark an incident resolved.
CREATE OR REPLACE FUNCTION fn_prevent_unfulfilled_incident_resolution()
RETURNS TRIGGER AS $$
DECLARE
    v_unfulfilled_count INT;
    v_total_requested INT;
    v_total_delivered INT;
BEGIN
    IF NEW.status = 'RESOLVED' THEN
        -- Check if any supply line item has delivered_qty < requested_qty
        SELECT COUNT(*), COALESCE(SUM(requested_qty), 0), COALESCE(SUM(delivered_qty), 0)
        INTO v_unfulfilled_count, v_total_requested, v_total_delivered
        FROM incident_supplies
        WHERE incident_id = NEW.id AND delivered_qty < requested_qty;

        IF v_unfulfilled_count > 0 THEN
            RAISE EXCEPTION 'Disaster Accountability Invariant Violation (CO6): Incident % has % unfulfilled or partially fulfilled supply item(s) (Total Requested: %, Delivered: %). An incident cannot be marked RESOLVED until all requested aid is 100%% delivered. Current status must remain PARTIALLY_FULFILLED.',
                NEW.id, v_unfulfilled_count, v_total_requested, v_total_delivered;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_unfulfilled_incident_resolution ON incidents;
CREATE TRIGGER trg_prevent_unfulfilled_incident_resolution
BEFORE UPDATE OF status ON incidents
FOR EACH ROW
WHEN (NEW.status = 'RESOLVED')
EXECUTE FUNCTION fn_prevent_unfulfilled_incident_resolution();

-- Function 2: Auto-maintain fulfillment_status on incident_supplies
CREATE OR REPLACE FUNCTION fn_auto_supply_fulfillment_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.delivered_qty = 0 THEN
        NEW.fulfillment_status := 'PENDING';
    ELSIF NEW.delivered_qty < NEW.requested_qty THEN
        NEW.fulfillment_status := 'PARTIAL';
    ELSE
        NEW.fulfillment_status := 'FULFILLED';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_supply_fulfillment_status ON incident_supplies;
CREATE TRIGGER trg_auto_supply_fulfillment_status
BEFORE INSERT OR UPDATE OF delivered_qty, requested_qty ON incident_supplies
FOR EACH ROW
EXECUTE FUNCTION fn_auto_supply_fulfillment_status();

-- Function 3: Auto-log incident status transitions to incident_activity_history
CREATE OR REPLACE FUNCTION fn_log_incident_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO incident_activity_history (
            incident_id, action, previous_status, new_status, description, metadata
        ) VALUES (
            NEW.id, 'SOS_REPORTED', NULL, NEW.status,
            'Incident reported by ' || NEW.reporter_name || ' with initial priority ' || ROUND(NEW.priority_score::numeric, 1),
            NEW.priority_breakdown
        );
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO incident_activity_history (
            incident_id, action, previous_status, new_status, description, metadata
        ) VALUES (
            NEW.id, 'STATUS_TRANSITION', OLD.status, NEW.status,
            'Status transitioned from ' || OLD.status || ' to ' || NEW.status,
            jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'updated_at', CURRENT_TIMESTAMP)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_incident_activity ON incidents;
CREATE TRIGGER trg_log_incident_activity
AFTER INSERT OR UPDATE OF status ON incidents
FOR EACH ROW
EXECUTE FUNCTION fn_log_incident_activity();

-- ============================================================================
-- Transaction-Safe Stored Functions for Concurrency & ACID Integrity (CO2)
-- ============================================================================

-- Function 4: Atomic Inventory Reservation with Pessimistic Row Lock (SELECT ... FOR UPDATE)
CREATE OR REPLACE FUNCTION fn_reserve_inventory(
    p_incident_id VARCHAR(50),
    p_warehouse_id VARCHAR(50),
    p_item_code VARCHAR(100),
    p_quantity INT,
    p_actor_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_on_hand INT;
    v_reserved INT;
    v_available INT;
    v_new_reserved INT;
BEGIN
    IF p_quantity <= 0 THEN
        RAISE EXCEPTION 'Reservation quantity must be strictly greater than 0 (Requested: %)', p_quantity;
    END IF;

    -- Row-level pessimistic locking on stock balance
    SELECT quantity_on_hand, quantity_reserved
    INTO v_on_hand, v_reserved
    FROM inventory_items
    WHERE warehouse_id = p_warehouse_id AND item_code = p_item_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Inventory item % does not exist in warehouse %', p_item_code, p_warehouse_id;
    END IF;

    v_available := v_on_hand - v_reserved;
    IF v_available < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock in warehouse % for item %: Available %, Requested %',
            p_warehouse_id, p_item_code, v_available, p_quantity;
    END IF;

    v_new_reserved := v_reserved + p_quantity;

    -- Update reservation balance
    UPDATE inventory_items
    SET quantity_reserved = v_new_reserved,
        updated_at = CURRENT_TIMESTAMP
    WHERE warehouse_id = p_warehouse_id AND item_code = p_item_code;

    -- Record immutable transaction in ledger
    INSERT INTO inventory_ledger (
        warehouse_id, item_code, transaction_type, delta_quantity, balance_after, reference_id, created_by, notes
    ) VALUES (
        p_warehouse_id, p_item_code, 'RESERVATION', p_quantity, v_on_hand - v_new_reserved, p_incident_id, p_actor_id,
        'Stock reserved for incident ' || p_incident_id
    );

    -- Update approved quantity on incident supply demand
    UPDATE incident_supplies
    SET approved_qty = approved_qty + p_quantity
    WHERE incident_id = p_incident_id AND item_code = p_item_code;

    RETURN jsonb_build_object(
        'status', 'SUCCESS',
        'warehouse_id', p_warehouse_id,
        'item_code', p_item_code,
        'reserved_quantity', p_quantity,
        'remaining_available', v_on_hand - v_new_reserved
    );
END;
$$ LANGUAGE plpgsql;

-- Function 5: Atomic Dispatch Execution (Converts reserved stock to dispatched goods)
CREATE OR REPLACE FUNCTION fn_dispatch_inventory(
    p_dispatch_id VARCHAR(50),
    p_incident_id VARCHAR(50),
    p_warehouse_id VARCHAR(50),
    p_item_code VARCHAR(100),
    p_quantity INT,
    p_actor_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_on_hand INT;
    v_reserved INT;
    v_new_on_hand INT;
    v_new_reserved INT;
BEGIN
    -- Row-level lock
    SELECT quantity_on_hand, quantity_reserved
    INTO v_on_hand, v_reserved
    FROM inventory_items
    WHERE warehouse_id = p_warehouse_id AND item_code = p_item_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item % not found in warehouse %', p_item_code, p_warehouse_id;
    END IF;

    IF v_reserved < p_quantity THEN
        RAISE EXCEPTION 'Cannot dispatch unreserved inventory: Reserved %, Requested to dispatch %',
            v_reserved, p_quantity;
    END IF;

    v_new_on_hand := v_on_hand - p_quantity;
    v_new_reserved := v_reserved - p_quantity;

    -- Decrement both on_hand and reserved
    UPDATE inventory_items
    SET quantity_on_hand = v_new_on_hand,
        quantity_reserved = v_new_reserved,
        updated_at = CURRENT_TIMESTAMP
    WHERE warehouse_id = p_warehouse_id AND item_code = p_item_code;

    -- Record in audit ledger
    INSERT INTO inventory_ledger (
        warehouse_id, item_code, transaction_type, delta_quantity, balance_after, reference_id, created_by, notes
    ) VALUES (
        p_warehouse_id, p_item_code, 'DISPATCH', -p_quantity, v_new_on_hand, p_dispatch_id, p_actor_id,
        'Dispatched to incident ' || p_incident_id || ' via ' || p_dispatch_id
    );

    -- Record dispatch line item
    INSERT INTO dispatch_items (dispatch_id, item_code, quantity)
    VALUES (p_dispatch_id, p_item_code, p_quantity)
    ON CONFLICT (dispatch_id, item_code) DO UPDATE
    SET quantity = dispatch_items.quantity + EXCLUDED.quantity;

    -- Update incident supplies dispatched counter
    UPDATE incident_supplies
    SET dispatched_qty = dispatched_qty + p_quantity
    WHERE incident_id = p_incident_id AND item_code = p_item_code;

    -- Update incident state to IN_DISPATCH if not already further along
    UPDATE incidents
    SET status = 'IN_DISPATCH', updated_at = CURRENT_TIMESTAMP
    WHERE id = p_incident_id AND status IN ('REPORTED', 'VERIFIED');

    RETURN jsonb_build_object(
        'status', 'DISPATCHED',
        'dispatch_id', p_dispatch_id,
        'item_code', p_item_code,
        'quantity', p_quantity,
        'warehouse_balance_after', v_new_on_hand
    );
END;
$$ LANGUAGE plpgsql;

-- Function 6: Atomic Delivery Confirmation with Partial Fulfillment Guard
CREATE OR REPLACE FUNCTION fn_confirm_delivery(
    p_incident_id VARCHAR(50),
    p_dispatch_id VARCHAR(50),
    p_mission_id VARCHAR(50),
    p_item_code VARCHAR(100),
    p_quantity INT,
    p_verification_code VARCHAR(20),
    p_recipient_name VARCHAR(255),
    p_recipient_phone VARCHAR(50),
    p_actor_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_total_req INT;
    v_total_del INT;
    v_all_fulfilled BOOLEAN;
    v_target_status VARCHAR(50);
BEGIN
    -- Increment delivered quantity on incident supply
    UPDATE incident_supplies
    SET delivered_qty = delivered_qty + p_quantity
    WHERE incident_id = p_incident_id AND item_code = p_item_code;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item % not registered on incident %', p_item_code, p_incident_id;
    END IF;

    -- Create delivery confirmation record
    INSERT INTO delivery_confirmations (
        incident_id, dispatch_id, mission_id, recipient_name, recipient_phone,
        verification_code, confirmation_type, items_delivered, confirmed_by_user_id
    ) VALUES (
        p_incident_id, p_dispatch_id, p_mission_id, p_recipient_name, p_recipient_phone,
        p_verification_code, 'VERIFICATION_CODE',
        jsonb_build_array(jsonb_build_object('item_code', p_item_code, 'quantity', p_quantity)),
        p_actor_id
    );

    -- Check overall incident fulfillment status
    SELECT 
        COALESCE(SUM(requested_qty), 0),
        COALESCE(SUM(delivered_qty), 0),
        BOOL_AND(delivered_qty >= requested_qty)
    INTO v_total_req, v_total_del, v_all_fulfilled
    FROM incident_supplies
    WHERE incident_id = p_incident_id;

    -- Strict disaster accountability rule:
    -- If all requested items are delivered -> RESOLVED
    -- If some delivered but not all -> PARTIALLY_FULFILLED
    IF v_all_fulfilled THEN
        v_target_status := 'RESOLVED';
    ELSE
        v_target_status := 'PARTIALLY_FULFILLED';
    END IF;

    UPDATE incidents
    SET status = v_target_status, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_incident_id;

    -- Update mission status if provided
    IF p_mission_id IS NOT NULL THEN
        UPDATE responder_missions
        SET status = CASE WHEN v_all_fulfilled THEN 'COMPLETED' ELSE 'ON_SCENE' END,
            completed_at = CASE WHEN v_all_fulfilled THEN CURRENT_TIMESTAMP ELSE NULL END
        WHERE id = p_mission_id;
    END IF;

    RETURN jsonb_build_object(
        'status', 'DELIVERY_RECORDED',
        'incident_id', p_incident_id,
        'incident_status', v_target_status,
        'total_requested', v_total_req,
        'total_delivered', v_total_del,
        'all_fulfilled', v_all_fulfilled
    );
END;
$$ LANGUAGE plpgsql;
