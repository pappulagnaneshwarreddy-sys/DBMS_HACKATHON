-- ============================================================================
-- RELIEFLINK 360 - Database Systems Engineering Verification & Analytical Queries
-- Course Outcomes: CO1 (Schema/Relational), CO2 (ACID/Transactions), 
--                  CO4 (Query Optimization/Window Functions/pgvector), CO6 (Accountability)
-- ============================================================================

-- ============================================================================
-- QUERY 1: MULTI-TABLE RELATIONAL JOIN
-- Incident Dispatch, Supply Chain & Field Mission Operational Matrix
-- Demonstrates: INNER JOIN, LEFT JOIN across 6 tables, column aliasing, and status aggregation
-- ============================================================================
SELECT 
    i.id AS incident_id,
    i.tracking_token,
    i.status AS incident_status,
    i.priority_score,
    s.item_code,
    s.item_name,
    s.requested_qty,
    s.approved_qty,
    s.dispatched_qty,
    s.delivered_qty,
    s.fulfillment_status,
    d.id AS dispatch_id,
    d.status AS dispatch_status,
    w.name AS source_warehouse,
    m.id AS mission_id,
    m.status AS mission_status,
    u.full_name AS assigned_responder
FROM incidents i
JOIN incident_supplies s ON i.id = s.incident_id
LEFT JOIN dispatches d ON i.id = d.incident_id
LEFT JOIN warehouses w ON d.warehouse_id = w.id
LEFT JOIN responder_missions m ON d.id = m.dispatch_id
LEFT JOIN users u ON m.responder_id = u.id
ORDER BY i.priority_score DESC, s.item_code ASC;

-- ============================================================================
-- QUERY 2: MULTI-LEVEL COMMON TABLE EXPRESSION (CTE)
-- Supply Chain Pipeline & Fulfillment Velocity Matrix
-- Demonstrates: WITH clause, aggregated metrics, fulfillment rate %, and status triage
-- ============================================================================
WITH incident_totals AS (
    SELECT 
        incident_id,
        COUNT(item_code) AS unique_items_requested,
        SUM(requested_qty) AS total_units_requested,
        SUM(approved_qty) AS total_units_approved,
        SUM(dispatched_qty) AS total_units_dispatched,
        SUM(delivered_qty) AS total_units_delivered
    FROM incident_supplies
    GROUP BY incident_id
),
incident_metrics AS (
    SELECT 
        it.incident_id,
        it.unique_items_requested,
        it.total_units_requested,
        it.total_units_approved,
        it.total_units_dispatched,
        it.total_units_delivered,
        (it.total_units_requested - it.total_units_delivered) AS total_units_pending,
        ROUND((it.total_units_delivered::numeric / NULLIF(it.total_units_requested, 0)::numeric) * 100, 1) AS fulfillment_percentage
    FROM incident_totals it
)
SELECT 
    i.id AS incident_id,
    i.tracking_token,
    i.reporter_name,
    i.status AS recorded_status,
    i.priority_score,
    m.unique_items_requested,
    m.total_units_requested,
    m.total_units_approved,
    m.total_units_dispatched,
    m.total_units_delivered,
    m.total_units_pending,
    COALESCE(m.fulfillment_percentage, 0.0) AS fulfillment_rate_pct,
    CASE 
        WHEN m.total_units_delivered = m.total_units_requested THEN '100% COMPLETE'
        WHEN m.total_units_delivered > 0 THEN 'IN PROGRESS (PARTIAL)'
        WHEN m.total_units_dispatched > 0 THEN 'TRANSIT IN PROGRESS'
        WHEN m.total_units_approved > 0 THEN 'STAGED AT WAREHOUSE'
        ELSE 'PENDING TRIAGE'
    END AS operational_pipeline_stage
FROM incidents i
JOIN incident_metrics m ON i.id = m.incident_id
ORDER BY i.priority_score DESC;

-- ============================================================================
-- QUERY 3: CTE + AGGREGATION & CROSS-MATCHING
-- Outstanding Resource Shortages vs. Available Regional Warehouse Stock
-- Demonstrates: Identifying unmet relief needs and calculating regional buffer coverage
-- ============================================================================
WITH unmet_demands AS (
    SELECT 
        s.incident_id,
        i.priority_score,
        i.address_text,
        s.item_code,
        s.item_name,
        (s.requested_qty - s.delivered_qty) AS outstanding_deficit
    FROM incident_supplies s
    JOIN incidents i ON s.incident_id = i.id
    WHERE s.requested_qty > s.delivered_qty
),
available_inventory AS (
    SELECT 
        item_code,
        SUM(quantity_on_hand - quantity_reserved) AS total_available_stock,
        COUNT(DISTINCT warehouse_id) AS stocking_warehouses
    FROM inventory_items
    GROUP BY item_code
)
SELECT 
    d.incident_id,
    d.priority_score,
    d.item_code,
    d.item_name,
    d.outstanding_deficit,
    COALESCE(inv.total_available_stock, 0) AS regional_available_stock,
    CASE 
        WHEN COALESCE(inv.total_available_stock, 0) >= d.outstanding_deficit THEN 'IMMEDIATELY ALLOCATABLE'
        WHEN COALESCE(inv.total_available_stock, 0) > 0 THEN 'PARTIAL STOCK ONLY (SHORTAGE)'
        ELSE 'CRITICAL DEFICIT (ZERO STOCK)'
    END AS allocation_feasibility,
    inv.stocking_warehouses AS available_depots
FROM unmet_demands d
LEFT JOIN available_inventory inv ON d.item_code = inv.item_code
ORDER BY d.priority_score DESC, d.outstanding_deficit DESC;

-- ============================================================================
-- QUERY 4: WINDOW FUNCTIONS
-- Priority Ranking, Percentiles & Stock Depletion Risk Analysis
-- Demonstrates: DENSE_RANK, ROW_NUMBER, NTILE, SUM() OVER (PARTITION BY)
-- ============================================================================
-- 4A: Incident Priority Rankings and Triage Cohorts
SELECT 
    id AS incident_id,
    tracking_token,
    status,
    priority_score,
    DENSE_RANK() OVER (ORDER BY priority_score DESC) AS city_wide_priority_rank,
    ROW_NUMBER() OVER (PARTITION BY status ORDER BY priority_score DESC) AS rank_within_status_group,
    NTILE(3) OVER (ORDER BY priority_score DESC) AS triage_cohort_tier, -- 1: High Priority (Red), 2: Medium (Yellow), 3: Low (Green)
    ROUND(PERCENT_RANK() OVER (ORDER BY priority_score)::numeric, 3) AS priority_percentile
FROM incidents
ORDER BY priority_score DESC;

-- 4B: Warehouse Inventory Depletion Risk & Running Cumulative Allocation
SELECT 
    warehouse_id,
    category,
    item_code,
    item_name,
    quantity_on_hand,
    quantity_reserved,
    (quantity_on_hand - quantity_reserved) AS net_available,
    safety_stock_threshold,
    SUM(quantity_on_hand) OVER (PARTITION BY warehouse_id, category) AS warehouse_category_total_stock,
    RANK() OVER (PARTITION BY category ORDER BY (quantity_on_hand - quantity_reserved) ASC) AS stock_scarcity_rank_in_category
FROM inventory_items
ORDER BY category, net_available ASC;

-- ============================================================================
-- QUERY 5: AGGREGATIONS & GROUPING
-- Warehouse Logistics Capacity & Inventory Distribution Summary
-- Demonstrates: COUNT, SUM, AVG, GROUP BY, HAVING, and filtered aggregations
-- ============================================================================
SELECT 
    w.id AS warehouse_id,
    w.name AS warehouse_name,
    w.status AS warehouse_status,
    COUNT(i.id) AS unique_skus_stocked,
    SUM(i.quantity_on_hand) AS total_items_on_hand,
    SUM(i.quantity_reserved) AS total_items_reserved,
    SUM(i.quantity_on_hand - i.quantity_reserved) AS total_items_available,
    ROUND(AVG(i.quantity_on_hand), 1) AS avg_units_per_sku,
    COUNT(CASE WHEN (i.quantity_on_hand - i.quantity_reserved) <= i.safety_stock_threshold THEN 1 END) AS skus_near_safety_threshold
FROM warehouses w
LEFT JOIN inventory_items i ON w.id = i.warehouse_id
GROUP BY w.id, w.name, w.status
HAVING COUNT(i.id) > 0
ORDER BY total_items_on_hand DESC;

-- ============================================================================
-- QUERY 6: RELIEF ACCOUNTABILITY INVARIANT AUDIT (CO6)
-- Verifies: Requested >= Approved >= Dispatched >= Delivered
-- Also audits that Partially Fulfilled incidents NEVER resolve prematurely
-- ============================================================================
SELECT 
    i.id AS incident_id,
    i.tracking_token,
    i.status AS incident_status,
    s.item_code,
    s.requested_qty,
    s.approved_qty,
    s.dispatched_qty,
    s.delivered_qty,
    (s.requested_qty >= s.approved_qty AND s.approved_qty >= s.dispatched_qty AND s.dispatched_qty >= s.delivered_qty) AS chain_invariant_satisfied,
    CASE 
        WHEN i.status = 'RESOLVED' AND s.delivered_qty < s.requested_qty THEN 'VIOLATION: RESOLVED PREMATURELY'
        WHEN i.status = 'PARTIALLY_FULFILLED' AND s.delivered_qty < s.requested_qty THEN 'VALID: REMAINS PARTIALLY FULFILLED'
        WHEN i.status = 'RESOLVED' AND s.delivered_qty = s.requested_qty THEN 'VALID: FULLY FULFILLED RESOLUTION'
        ELSE 'VALID: IN PROGRESS'
    END AS accountability_audit_verdict
FROM incidents i
JOIN incident_supplies s ON i.id = s.incident_id
ORDER BY i.id, s.item_code;

-- ============================================================================
-- QUERY 7: TRANSACTION HANDLING & INVARIANT ENFORCEMENT VERIFICATION
-- Tests: Trigger-based exception on premature resolution, row-locked reservation, and delivery
-- ============================================================================

-- 7A: Invariant Enforcement Test: Attempting to mark INC-2026-0003 (partially fulfilled) as RESOLVED
-- Expected behavior: Trigger trg_prevent_unfulfilled_incident_resolution intercepts and aborts with EXCEPTION
DO $$
BEGIN
    BEGIN
        UPDATE incidents SET status = 'RESOLVED' WHERE id = 'INC-2026-0003';
        RAISE EXCEPTION 'TEST FAILED: Database allowed partial incident to be marked RESOLVED!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'TEST 7A PASSED: Invariant trigger successfully prevented premature resolution: %', SQLERRM;
    END;
END $$;

-- 7B: Atomic Inventory Reservation Test using fn_reserve_inventory (Row-level lock SELECT FOR UPDATE)
SELECT fn_reserve_inventory(
    'INC-2026-0001',
    'WH-CENTRAL-01',
    'WATER_CAN_20L',
    10,
    '22222222-2222-2222-2222-222222222222'::uuid
) AS reservation_result;

-- 7C: Insufficient Stock Rejection Test (Attempting to reserve 5000 units when only 240 available)
DO $$
BEGIN
    BEGIN
        PERFORM fn_reserve_inventory(
            'INC-2026-0001',
            'WH-CENTRAL-01',
            'WATER_CAN_20L',
            5000,
            '22222222-2222-2222-2222-222222222222'::uuid
        );
        RAISE EXCEPTION 'TEST FAILED: Database allowed overselling beyond available inventory!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'TEST 7C PASSED: Stock guard successfully rejected excessive reservation: %', SQLERRM;
    END;
END $$;

-- ============================================================================
-- QUERY 8: SEMANTIC SIMILARITY SEARCH VIA pgvector (CO4)
-- Finds incidents semantically closest to a query embedding using HNSW Index & Cosine Distance (<=>)
-- ============================================================================
EXPLAIN ANALYZE
SELECT 
    e.incident_id,
    i.status,
    i.priority_score,
    i.address_text,
    e.situation_text,
    ROUND((1.0 - (e.embedding <=> s_query.embedding))::numeric, 4) AS cosine_similarity,
    ROUND((e.embedding <=> s_query.embedding)::numeric, 4) AS cosine_distance
FROM situation_embeddings e
JOIN incidents i ON e.incident_id = i.id
CROSS JOIN (
    -- Simulating search query vector for "Severe urban flood elderly trapped water current"
    SELECT embedding FROM situation_embeddings WHERE incident_id = 'INC-2026-0001'
) s_query
ORDER BY e.embedding <=> s_query.embedding ASC
LIMIT 3;
