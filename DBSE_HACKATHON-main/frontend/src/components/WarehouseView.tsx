import { useState, useEffect } from 'react';
import { Warehouse, Package, Truck, ShieldCheck, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { InventoryItem, Dispatch, AuthUser } from '../types';

interface WarehouseViewProps {
  currentUser?: AuthUser | null;
}

export default function WarehouseView({ currentUser }: WarehouseViewProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reserve form state
  const [resIncidentId, setResIncidentId] = useState('INC-2026-0002');
  const [resWarehouseId, setResWarehouseId] = useState('WH-CENTRAL-01');
  const [resItemCode, setResItemCode] = useState('WATER_CAN_20L');
  const [resQty, setResQty] = useState(10);
  const [reserving, setReserving] = useState(false);

  // Dispatch form state
  const [dispIncidentId, setDispIncidentId] = useState('INC-2026-0002');
  const [dispWarehouseId, setDispWarehouseId] = useState('WH-CENTRAL-01');
  const [dispVehicle, setDispVehicle] = useState('4x4 High-Clearance Rescue Truck');
  const [dispDriver, setDispDriver] = useState('Ravi Shankar');
  const [dispPhone, setDispPhone] = useState('+91 99620 33445');
  const [dispItemCode, setDispItemCode] = useState('WATER_CAN_20L');
  const [dispQty, setDispQty] = useState(10);
  const [dispatching, setDispatching] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = currentUser?.access_token || localStorage.getItem('relieflink_token') || undefined;
      const [invRes, dispRes] = await Promise.allSettled([
        api.getInventory(selectedWarehouseFilter || undefined, token),
        api.getDispatches(token)
      ]);
      if (invRes.status === 'fulfilled') {
        setInventory(invRes.value);
      } else {
        setError(invRes.reason?.message || 'Failed to load inventory');
      }
      if (dispRes.status === 'fulfilled') {
        setDispatches(dispRes.value);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load warehouse data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedWarehouseFilter, currentUser?.access_token]);

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    setReserving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.reserveStock({
        incident_id: resIncidentId,
        warehouse_id: resWarehouseId,
        item_code: resItemCode,
        quantity: Number(resQty)
      });
      setSuccessMsg(`Stock reserved atomically! ${res.reserved_quantity} units of ${res.item_code} allocated. Available stock remaining: ${res.remaining_available}`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Stock reservation failed');
    } finally {
      setReserving(false);
    }
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatching(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.createDispatch({
        incident_id: dispIncidentId,
        warehouse_id: dispWarehouseId,
        vehicle_type: dispVehicle,
        driver_name: dispDriver,
        driver_phone: dispPhone,
        items: [{ item_code: dispItemCode, quantity: Number(dispQty) }]
      });
      setSuccessMsg(`Dispatch manifest ${res.id} created! Vehicle ${dispVehicle} departed with ${dispQty} units of ${dispItemCode}.`);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Dispatch execution failed');
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Overview Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-amber)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <Warehouse size={24} color="#fbbf24" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Warehouse Inventory &amp; Logistics Hub</h2>
              <span className="badge badge-amber">ACID TRANSACTION SAFE</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Manages stock balances with row-level pessimistic locking (<code className="code-pill">SELECT ... FOR UPDATE</code>) to guarantee zero negative stock and zero over-allocation.
            </p>
          </div>
          <button onClick={loadData} disabled={loading} className="btn btn-outline btn-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Balances
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', padding: '0.85rem 1.25rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', padding: '0.85rem 1.25rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* 1. Inventory Balances Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={18} color="#fbbf24" /> Real-Time Warehouse Stock Balances
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Source of Truth: PostgreSQL <code className="code-pill">inventory_items</code> &bull; Available = On-Hand &minus; Reserved
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Filter Hub:</span>
            <select
              className="form-select"
              value={selectedWarehouseFilter}
              onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
              style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
            >
              <option value="">All Warehouses</option>
              <option value="WH-CENTRAL-01">WH-CENTRAL-01 (Secunderabad Central)</option>
              <option value="WH-NORTH-02">WH-NORTH-02 (Kukatpally North)</option>
              <option value="WH-WEST-03">WH-WEST-03 (Gachibowli West)</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Warehouse Hub</th>
                <th>Supply Item</th>
                <th>Category</th>
                <th>On Hand</th>
                <th>Reserved</th>
                <th>Available for Dispatch</th>
                <th>Safety Buffer</th>
                <th>Stock Status</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const isLow = item.available_quantity <= item.safety_stock_threshold;
                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.warehouse_id}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{item.warehouse_name}</div>
                    </td>
                    <td>
                      <strong>{item.item_name}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Code: {item.item_code}</div>
                    </td>
                    <td><span className="code-pill">{item.category}</span></td>
                    <td><strong>{item.quantity_on_hand}</strong> {item.unit}</td>
                    <td><span style={{ color: '#fbbf24' }}>{item.quantity_reserved}</span></td>
                    <td>
                      <strong style={{ color: item.available_quantity > 0 ? '#10b981' : '#ef4444', fontSize: '0.95rem' }}>
                        {item.available_quantity} {item.unit}
                      </strong>
                    </td>
                    <td>{item.safety_stock_threshold}</td>
                    <td>
                      <span className={`badge ${isLow ? 'badge-amber' : 'badge-emerald'}`}>
                        {isLow ? 'BUFFER ALERT' : 'OPTIMAL'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Operations Grid: Reserve & Dispatch Forms */}
      <div className="grid-2">
        {/* Reserve Stock Form */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <ShieldCheck size={18} color="#34d399" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>ACID Stock Reservation (Row Lock)</h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Calls <code className="code-pill">fn_reserve_inventory</code> with row locking to safely hold stock for an approved incident.
          </p>

          <form onSubmit={handleReserve} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label className="form-label">Incident ID *</label>
              <select className="form-select" value={resIncidentId} onChange={(e) => setResIncidentId(e.target.value)}>
                <option value="INC-2026-0001">INC-2026-0001 (Moosarambagh Musi Basin)</option>
                <option value="INC-2026-0002">INC-2026-0002 (Begumpet Old Airport Road)</option>
                <option value="INC-2026-0003">INC-2026-0003 (Nizampet Flood Corridor)</option>
                <option value="INC-2026-0005">INC-2026-0005 (Hussain Sagar Relief Camp)</option>
              </select>
            </div>

            <div>
              <label className="form-label">Warehouse Depot *</label>
              <select className="form-select" value={resWarehouseId} onChange={(e) => setResWarehouseId(e.target.value)}>
                <option value="WH-CENTRAL-01">WH-CENTRAL-01 (Secunderabad Central Depot)</option>
                <option value="WH-NORTH-02">WH-NORTH-02 (Kukatpally North Base)</option>
                <option value="WH-WEST-03">WH-WEST-03 (Gachibowli Western Depot)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="form-label">Supply Item *</label>
                <select className="form-select" value={resItemCode} onChange={(e) => setResItemCode(e.target.value)}>
                  <option value="WATER_CAN_20L">20L Potable Water Can</option>
                  <option value="FOOD_PACK_FAMILY">Family Ration Kit (3 Days)</option>
                  <option value="FIRST_AID_KIT">Trauma First Aid Kit</option>
                  <option value="INSULIN_VIAL">Insulin Vial (100IU/ml)</option>
                  <option value="OXYGEN_CYLINDER">10L Medical Oxygen Cylinder</option>
                  <option value="TARPAULIN_SHEET">Tarpaulin Waterproof Sheet</option>
                </select>
              </div>
              <div>
                <label className="form-label">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="form-input"
                  value={resQty}
                  onChange={(e) => setResQty(Number(e.target.value))}
                />
              </div>
            </div>

            <button type="submit" disabled={reserving} className="btn btn-warning" style={{ marginTop: '0.5rem' }}>
              {reserving ? 'Executing Row Lock...' : 'Lock & Reserve Stock'}
            </button>
          </form>
        </div>

        {/* Dispatch Goods Manifest */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Truck size={18} color="#60a5fa" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Dispatch Relief Goods &amp; Fleet Manifest</h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Calls <code className="code-pill">fn_dispatch_inventory</code> to convert reserved inventory into packed transit items.
          </p>

          <form onSubmit={handleDispatch} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="form-label">Target Incident *</label>
                <select className="form-select" value={dispIncidentId} onChange={(e) => setDispIncidentId(e.target.value)}>
                  <option value="INC-2026-0002">INC-2026-0002</option>
                  <option value="INC-2026-0003">INC-2026-0003</option>
                  <option value="INC-2026-0005">INC-2026-0005</option>
                  <option value="INC-2026-0001">INC-2026-0001</option>
                </select>
              </div>
              <div>
                <label className="form-label">Source Depot *</label>
                <select className="form-select" value={dispWarehouseId} onChange={(e) => setDispWarehouseId(e.target.value)}>
                  <option value="WH-CENTRAL-01">WH-CENTRAL-01</option>
                  <option value="WH-NORTH-02">WH-NORTH-02</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Transport Vehicle Type *</label>
              <select className="form-select" value={dispVehicle} onChange={(e) => setDispVehicle(e.target.value)}>
                <option value="4x4 High-Clearance Rescue Truck">4x4 High-Clearance Rescue Truck</option>
                <option value="Flatbed Relief Logistics Van">Flatbed Relief Logistics Van</option>
                <option value="Emergency Cold-Chain Ambulance">Emergency Cold-Chain Ambulance</option>
                <option value="Motorized Boat Trailer Unit">Motorized Boat Trailer Unit</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="form-label">Driver Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={dispDriver}
                  onChange={(e) => setDispDriver(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Driver Phone *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={dispPhone}
                  onChange={(e) => setDispPhone(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
              <div>
                <label className="form-label">Manifest Item *</label>
                <select className="form-select" value={dispItemCode} onChange={(e) => setDispItemCode(e.target.value)}>
                  <option value="WATER_CAN_20L">20L Potable Water Can</option>
                  <option value="FOOD_PACK_FAMILY">Family Ration Kit (3 Days)</option>
                  <option value="FIRST_AID_KIT">Trauma First Aid Kit</option>
                  <option value="INSULIN_VIAL">Insulin Vial (100IU/ml)</option>
                  <option value="OXYGEN_CYLINDER">10L Medical Oxygen Cylinder</option>
                </select>
              </div>
              <div>
                <label className="form-label">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="form-input"
                  value={dispQty}
                  onChange={(e) => setDispQty(Number(e.target.value))}
                />
              </div>
            </div>

            <button type="submit" disabled={dispatching} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
              {dispatching ? 'Packing & Dispatching...' : 'Dispatch Vehicle & Deduct Stock'}
            </button>
          </form>
        </div>
      </div>

      {/* 3. Dispatches Manifest List */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Truck size={18} color="#60a5fa" /> Active Dispatches &amp; Vehicle Manifests
        </h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Dispatch ID</th>
                <th>Target Incident</th>
                <th>Depot Hub</th>
                <th>Vehicle &amp; Driver</th>
                <th>Status</th>
                <th>Manifest Items Packed</th>
              </tr>
            </thead>
            <tbody>
              {dispatches.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.id}</strong></td>
                  <td><span className="code-pill">{d.incident_id}</span></td>
                  <td>{d.warehouse_name || d.warehouse_id}</td>
                  <td>
                    <div>{d.vehicle_type}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Driver: {d.driver_name} ({d.driver_phone})
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${d.status === 'DELIVERED' ? 'badge-emerald' : 'badge-blue'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.78rem' }}>
                      {d.items.map((it, idx) => (
                        <span key={idx}>
                          &bull; {it.item_code}: <strong>{it.quantity}</strong>
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
