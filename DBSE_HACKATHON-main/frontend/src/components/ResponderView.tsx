import { useState, useEffect } from 'react';
import { Truck, MapPin, CheckCircle, Navigation, Shield, AlertTriangle, RefreshCw, Send, Eye } from 'lucide-react';
import { api } from '../services/api';
import { ResponderMission, AuthUser } from '../types';

interface ResponderViewProps {
  currentUser?: AuthUser | null;
}

export default function ResponderView({ currentUser }: ResponderViewProps) {
  const [missions, setMissions] = useState<ResponderMission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Delivery confirmation form state
  const [selectedMission, setSelectedMission] = useState<ResponderMission | null>(null);
  const [itemCode, setItemCode] = useState('WATER_CAN_20L');
  const [quantity, setQuantity] = useState(10);
  const [verificationCode, setVerificationCode] = useState('');
  const [recipientName, setRecipientName] = useState('Joseph Anthony (Headmaster)');
  const [confirming, setConfirming] = useState(false);

  // Field observation state
  const [obsText, setObsText] = useState('Flood waters receded 6 inches. Service lane cleared for light vehicles.');
  const [obsHazards, setObsHazards] = useState('FALLEN_TREE,WATER_LOGGING');
  const [submittingObs, setSubmittingObs] = useState(false);

  const loadMissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = currentUser?.access_token || localStorage.getItem('relieflink_token') || undefined;
      const data = await api.getMissions(token);
      setMissions(data);
      if (data.length > 0 && !selectedMission) {
        setSelectedMission(data[0]);
        setVerificationCode(data[0].verification_code || '');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch missions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMissions();
  }, [currentUser?.access_token]);

  const handleStatusChange = async (missionId: string, newStatus: string) => {
    try {
      await api.updateMissionStatus(missionId, newStatus, `Responder checked in as ${newStatus}`);
      setSuccessMsg(`Mission ${missionId} updated to ${newStatus}`);
      await loadMissions();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    }
  };

  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMission) return;
    setConfirming(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.confirmDelivery(selectedMission.id, {
        item_code: itemCode,
        quantity: Number(quantity),
        verification_code: verificationCode,
        recipient_name: recipientName
      });
      setSuccessMsg(
        `Delivery Confirmed! ${quantity} units of ${itemCode} verified. Incident status updated to: ${res.incident_status} (Fulfillment: ${res.total_delivered}/${res.total_requested}).`
      );
      await loadMissions();
    } catch (err: any) {
      setError(err.message || 'Delivery confirmation failed');
    } finally {
      setConfirming(false);
    }
  };

  const handleObservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMission) return;
    setSubmittingObs(true);
    try {
      await api.submitObservation({
        incident_id: selectedMission.incident_id,
        text: obsText,
        hazards: obsHazards.split(',').map((h) => h.trim())
      });
      setSuccessMsg(`Field observation submitted to MongoDB intelligence successfully!`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit observation');
    } finally {
      setSubmittingObs(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Overview Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-emerald)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <Truck size={24} color="#34d399" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Field Responder Rescue Operations</h2>
              <span className="badge badge-emerald">FIELD OPS</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Field rescue units manage assigned dispatches, update live navigation milestones, record on-scene supply delivery with citizen verification codes, and report unstructured telemetry.
            </p>
          </div>
          <button onClick={loadMissions} disabled={loading} className="btn btn-outline btn-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Missions
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

      {/* Assigned Missions Grid */}
      <div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Navigation size={18} color="#60a5fa" /> Active Assigned Missions
        </h3>

        <div className="grid-3">
          {missions.map((m) => (
            <div
              key={m.id}
              className="glass-panel"
              style={{
                padding: '1.25rem',
                border: selectedMission?.id === m.id ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                boxShadow: selectedMission?.id === m.id ? '0 0 15px rgba(59,130,246,0.2)' : 'none',
                cursor: 'pointer'
              }}
              onClick={() => {
                setSelectedMission(m);
                setVerificationCode(m.verification_code || '');
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <strong style={{ fontSize: '1rem' }}>{m.id}</strong>
                <span className={`badge ${
                  m.status === 'COMPLETED' ? 'badge-emerald' :
                  m.status === 'ON_SCENE' ? 'badge-amber' : 'badge-blue'
                }`}>
                  {m.status}
                </span>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
                {m.incident_address}
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Contact: {m.reporter_name} ({m.reporter_phone})
              </div>

              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                OTP Code: <strong className="code-pill" style={{ color: '#60a5fa' }}>{m.verification_code}</strong><br />
                Dispatch Ref: <span className="code-pill">{m.dispatch_id || 'DIRECT_UNIT'}</span>
              </div>

              {/* Transit Buttons */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(m.id, 'EN_ROUTE');
                  }}
                >
                  En Route
                </button>
                <button
                  type="button"
                  className="btn btn-warning btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(m.id, 'ON_SCENE');
                  }}
                >
                  On Scene
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation & Observations Grid */}
      {selectedMission && (
        <div className="grid-2">
          {/* Delivery Confirmation Form */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Shield size={18} color="#10b981" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                Confirm Delivery for {selectedMission.id} ({selectedMission.incident_id})
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Executes <code className="code-pill">fn_confirm_delivery</code>. If delivered quantity fulfills 100% of demand, status moves to RESOLVED. If partial, incident is strictly flagged as PARTIALLY_FULFILLED.
            </p>

            <form onSubmit={handleConfirmDelivery} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label">Supply Item *</label>
                  <select className="form-select" value={itemCode} onChange={(e) => setItemCode(e.target.value)}>
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
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label">Citizen Verification OTP *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="e.g. VERIFY-7890"
                  />
                </div>
                <div>
                  <label className="form-label">Recipient Name *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" disabled={confirming} className="btn btn-success" style={{ marginTop: '0.5rem' }}>
                {confirming ? 'Recording Delivery Verification...' : 'VERIFY & CONFIRM HANDOVER'}
              </button>
            </form>
          </div>

          {/* Field Observation Reporter (MongoDB) */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Eye size={18} color="#60a5fa" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Log Field Intelligence (MongoDB Store)</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Stores unstructured field conditions, hazards, and flood depth in MongoDB collection <code className="code-pill">field_observations</code>.
            </p>

            <form onSubmit={handleObservationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label className="form-label">Observation Notes *</label>
                <textarea
                  rows={3}
                  required
                  className="form-textarea"
                  value={obsText}
                  onChange={(e) => setObsText(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Detected Hazards (Comma Separated)</label>
                <input
                  type="text"
                  className="form-input"
                  value={obsHazards}
                  onChange={(e) => setObsHazards(e.target.value)}
                />
              </div>

              <button type="submit" disabled={submittingObs} className="btn btn-outline" style={{ marginTop: '0.5rem' }}>
                <Send size={16} /> {submittingObs ? 'Recording in MongoDB...' : 'Transmit Observation to Command Intel'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
