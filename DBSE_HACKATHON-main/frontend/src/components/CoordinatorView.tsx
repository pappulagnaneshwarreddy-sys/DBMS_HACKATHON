import { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  RefreshCw,
  Sparkles,
  Layers,
  MapPin,
  Users,
  Compass
} from 'lucide-react';
import { api } from '../services/api';
import { Incident, ShortageSummary, AuthUser } from '../types';

interface CoordinatorViewProps {
  currentUser?: AuthUser | null;
}

export default function CoordinatorView({ currentUser }: CoordinatorViewProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [shortages, setShortages] = useState<ShortageSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Verification modal / action state
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const verifyNotes = 'Incident verified via drone recon and citizen telephone contact. Life-critical.';
  const [verifying, setVerifying] = useState(false);

  // Mission assignment modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignNotes, setAssignNotes] = useState('Deliver water and ration packs via high-clearance rescue vehicle.');
  const [assigning, setAssigning] = useState(false);

  // Vector Search state (pgvector)
  const [searchQuery, setSearchQuery] = useState('elderly trapped insulin water flood');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = currentUser?.access_token || localStorage.getItem('relieflink_token') || undefined;
      const [queueRes, shortageRes] = await Promise.allSettled([
        api.getPriorityQueue(token),
        api.getShortages(token)
      ]);

      if (queueRes.status === 'fulfilled') {
        setIncidents(queueRes.value);
      } else {
        console.error('Priority queue fetch error:', queueRes.reason);
        setError(queueRes.reason?.message || 'Failed to fetch priority queue');
      }

      if (shortageRes.status === 'fulfilled') {
        setShortages(shortageRes.value);
      } else {
        console.warn('Shortages fetch error:', shortageRes.reason);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch coordinator data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.access_token]);

  const handleVerify = async (id: string) => {
    setVerifying(true);
    setError(null);
    try {
      const token = currentUser?.access_token || localStorage.getItem('relieflink_token') || undefined;
      await api.verifyIncident(id, verifyNotes, undefined, token);
      setSuccessMsg(`Incident ${id} successfully verified and authorized for logistics!`);
      setSelectedIncident(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleAssignMission = async () => {
    if (!selectedIncident) return;
    setAssigning(true);
    setError(null);
    try {
      const token = currentUser?.access_token || localStorage.getItem('relieflink_token') || undefined;
      const res = await api.assignMission({
        incident_id: selectedIncident.id,
        responder_id: '33333333-3333-3333-3333-333333333333', // Captain Sarah Chen demo account
        notes: assignNotes
      }, token);
      setSuccessMsg(`Rescue Mission ${res.id} created! Verification OTP: ${res.verification_code}`);
      setAssignModalOpen(false);
      setSelectedIncident(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Mission assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  const handleVectorSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const token = currentUser?.access_token || localStorage.getItem('relieflink_token') || undefined;
      const res = await api.getSimilarIncidents(searchQuery.trim(), undefined, token);
      setSearchResults(res);
    } catch (err: any) {
      setError(err.message || 'Vector search failed');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-blue)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <Activity size={24} color="#60a5fa" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Coordinator Strategic Command Center</h2>
              <span className="badge badge-blue">HQ COMMAND</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Real-time multi-variable triage queue, explainable deterministic priority scoring, dispatch authorization, and regional shortage feasibility.
            </p>
          </div>
          <button onClick={loadData} disabled={loading} className="btn btn-outline btn-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Queue
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
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* 1. Priority Triage Queue */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Compass size={18} color="#60a5fa" /> Priority-Ranked Disaster Triage Queue
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Deterministic Formula: Score = Severity (25%) + Urgency (25%) + Vulnerability (20%) + Casualties (20%) + Supply Shortages (10%)
            </span>
          </div>
          <span className="badge badge-red">{incidents.length} ACTIVE INCIDENTS</span>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Priority Score</th>
                <th>Incident &amp; Location</th>
                <th>Reporter / Phone</th>
                <th>Headcount &amp; Risk</th>
                <th>Status</th>
                <th>Requested Supplies</th>
                <th>Coordinator Actions</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr key={inc.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span className="badge badge-red" style={{ fontSize: '0.85rem', padding: '0.25rem 0.6rem' }}>
                        {inc.priority_score.toFixed(1)} / 100
                      </span>
                      {inc.priority_breakdown && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          S:{inc.priority_breakdown.severity_factor} U:{inc.priority_breakdown.urgency_factor} V:{inc.priority_breakdown.vulnerability_factor}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <strong>{inc.id}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <MapPin size={12} /> {inc.address_text}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Track: <span className="code-pill">{inc.tracking_token}</span>
                    </div>
                  </td>
                  <td>
                    <div>{inc.reporter_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{inc.reporter_phone}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                      <Users size={14} color="#f59e0b" />
                      <strong>{inc.people_affected}</strong> trapped
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Sev: {inc.severity}/5 &bull; Urg: {inc.urgency}/5 &bull; Vuln: {inc.vulnerability_score}/5
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      inc.status === 'REPORTED' ? 'badge-red' :
                      inc.status === 'VERIFIED' ? 'badge-blue' :
                      inc.status === 'IN_DISPATCH' ? 'badge-purple' :
                      inc.status === 'PARTIALLY_FULFILLED' ? 'badge-amber' : 'badge-emerald'
                    }`}>
                      {inc.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.75rem' }}>
                      {inc.supplies.map((s, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <span>{s.item_name || s.item_code}:</span>
                          <strong>{s.delivered_qty} / {s.requested_qty}</strong>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {inc.status === 'REPORTED' && (
                        <button
                          onClick={() => {
                            setSelectedIncident(inc);
                            handleVerify(inc.id);
                          }}
                          disabled={verifying}
                          className="btn btn-primary btn-sm"
                        >
                          Verify SOS
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedIncident(inc);
                          setAssignModalOpen(true);
                        }}
                        className="btn btn-outline btn-sm"
                      >
                        Assign Mission
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Regional Shortages & Allocation Feasibility (CO6 & CO1) */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Layers size={18} color="#f59e0b" /> Regional Supply Shortages &amp; Stock Feasibility Audit
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Aggregates regional demand against real inventory stored in PostgreSQL warehouses.
            </p>
          </div>
          <span className="badge badge-amber">LOGISTICS READINESS</span>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Relief Supply Item</th>
                <th>Total Demanded</th>
                <th>Total Delivered</th>
                <th>Outstanding Deficit</th>
                <th>Incidents Affected</th>
                <th>Regional Stock Available</th>
                <th>Allocation Feasibility</th>
              </tr>
            </thead>
            <tbody>
              {shortages.map((st) => (
                <tr key={st.item_code}>
                  <td><strong>{st.item_name}</strong> ({st.item_code})</td>
                  <td>{st.total_requested}</td>
                  <td>{st.total_delivered}</td>
                  <td><strong style={{ color: '#ef4444' }}>{st.outstanding_deficit}</strong></td>
                  <td>{st.incidents_affected_count}</td>
                  <td><strong style={{ color: '#10b981' }}>{st.regional_available_stock}</strong></td>
                  <td>
                    <span className={`badge ${
                      st.allocation_feasibility === 'IMMEDIATELY_FEASIBLE' ? 'badge-emerald' :
                      st.allocation_feasibility === 'PARTIALLY_FEASIBLE' ? 'badge-amber' : 'badge-red'
                    }`}>
                      {st.allocation_feasibility.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Semantic Incident Similarity Search via pgvector (CO4) */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} color="#a855f7" /> Semantic Intelligence Search (pgvector HNSW Cosine Search)
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Native PostgreSQL cosine distance (<code className="code-pill">&lt;=&gt;</code>) index retrieval across 384-dimensional situation vectors.
            </p>
          </div>
          <span className="badge badge-purple">NATIVE PGVECTOR</span>
        </div>

        <form onSubmit={handleVectorSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <input
            type="text"
            className="form-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search situations (e.g. insulin patients flood water trapped)..."
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={searching} className="btn btn-primary">
            <Search size={16} /> {searching ? 'Searching Embeddings...' : 'Semantic Search'}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {searchResults.map((r, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <strong>{r.incident_id}</strong> &bull; <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{r.address_text}</span>
                  </div>
                  <span className="badge badge-purple">Cosine Similarity: {(r.similarity_score * 100).toFixed(1)}%</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                  Situation Match: &ldquo;{r.situation_text}&rdquo;
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assign Mission Modal */}
      {assignModalOpen && selectedIncident && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '520px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem' }}>
              Assign Rescue Mission for {selectedIncident.id}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Target Location: <strong>{selectedIncident.address_text}</strong><br />
              Casualties Trapped: <strong>{selectedIncident.people_affected}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label className="form-label">Assign Field Responder Unit:</label>
                <select className="form-select" defaultValue="33333333-3333-3333-3333-333333333333">
                  <option value="33333333-3333-3333-3333-333333333333">
                    Capt. Sarah Chen (Rescue Unit #4 - Coastal Rapid Response)
                  </option>
                </select>
              </div>

              <div>
                <label className="form-label">Tactical Mission Instructions:</label>
                <textarea
                  rows={3}
                  className="form-textarea"
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setAssignModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assigning}
                className="btn btn-primary"
                onClick={handleAssignMission}
              >
                {assigning ? 'Dispatching...' : 'Deploy Mission & Generate OTP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
