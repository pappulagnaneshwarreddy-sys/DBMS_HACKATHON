import { useState } from 'react';
import { Radio, Search, CheckCircle2, Clock, MapPin, Package, Shield, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

const PRESETS = [
  {
    name: 'Moosarambagh Musi Basin (Apartment Inundated)',
    address: 'Flat 3B, Riverview Apartments, Moosarambagh Musi Basin, Hyderabad',
    lat: 17.3753,
    lng: 78.5085,
    severity: 5,
    urgency: 5,
    vulnerability: 5,
    headcount: 18,
    notes: 'Ground floor completely submerged due to Musi river overflow. 4 elderly heart patients and 2 infants trapped without clean water or medication.',
    supplies: [{ item_code: 'WATER_CAN_20L', quantity: 15 }, { item_code: 'FOOD_PACK_FAMILY', quantity: 18 }, { item_code: 'FIRST_AID_KIT', quantity: 3 }]
  },
  {
    name: 'Begumpet Old Airport Road (Relief Shelter Low on Food)',
    address: 'Community Hall, Begumpet Old Airport Road, Hyderabad',
    lat: 17.4447,
    lng: 78.4664,
    severity: 4,
    urgency: 4,
    vulnerability: 3,
    headcount: 45,
    notes: 'Evacuation shelter accommodating 45 displaced residents. Drinking water exhausted.',
    supplies: [{ item_code: 'WATER_CAN_20L', quantity: 30 }, { item_code: 'FOOD_PACK_FAMILY', quantity: 45 }]
  },
  {
    name: 'Nizampet Flood Corridor (School Inundated)',
    address: 'St. Jude Primary School, Nizampet Flood Corridor, Hyderabad',
    lat: 17.5169,
    lng: 78.3840,
    severity: 4,
    urgency: 5,
    vulnerability: 4,
    headcount: 25,
    notes: 'Flash flood breached perimeter wall. 25 children and teachers moved to first floor auditorium.',
    supplies: [{ item_code: 'WATER_CAN_20L', quantity: 20 }, { item_code: 'FOOD_PACK_FAMILY', quantity: 25 }]
  }
];

export default function CitizenView() {
  // SOS Form state
  const [reporterName, setReporterName] = useState('Priya Sundaram');
  const [reporterPhone, setReporterPhone] = useState('+91 98401 55667');
  const [address, setAddress] = useState('Plot 45, Beside Musi Embankment, Chaderghat, Hyderabad');
  const [lat, setLat] = useState(17.3820);
  const [lng, setLng] = useState(78.4910);
  const [severity, setSeverity] = useState(4);
  const [urgency, setUrgency] = useState(5);
  const [vulnerability, setVulnerability] = useState(4);
  const [peopleAffected, setPeopleAffected] = useState(12);
  const [notes, setNotes] = useState('Ground floor water ingress. 3 diabetic patients urgently need insulin and potable water.');
  const [waterQty, setWaterQty] = useState(10);
  const [foodQty, setFoodQty] = useState(12);
  const [medicalQty, setMedicalQty] = useState(2);
  const [insulinQty, setInsulinQty] = useState(3);

  const [submitting, setSubmitting] = useState(false);
  const [sosResult, setSosResult] = useState<any>(null);
  const [sosError, setSosError] = useState<string | null>(null);

  // Tracking state
  const [trackingTokenInput, setTrackingTokenInput] = useState('SOS-TRK-9003');
  const [trackingData, setTrackingData] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const applyPreset = (p: typeof PRESETS[0]) => {
    setAddress(p.address);
    setLat(p.lat);
    setLng(p.lng);
    setSeverity(p.severity);
    setUrgency(p.urgency);
    setVulnerability(p.vulnerability);
    setPeopleAffected(p.headcount);
    setNotes(p.notes);
  };

  const handleSosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSosError(null);
    setSosResult(null);

    const requested_supplies = [];
    if (waterQty > 0) requested_supplies.push({ item_code: 'WATER_CAN_20L', quantity: Number(waterQty) });
    if (foodQty > 0) requested_supplies.push({ item_code: 'FOOD_PACK_FAMILY', quantity: Number(foodQty) });
    if (medicalQty > 0) requested_supplies.push({ item_code: 'FIRST_AID_KIT', quantity: Number(medicalQty) });
    if (insulinQty > 0) requested_supplies.push({ item_code: 'INSULIN_VIAL', quantity: Number(insulinQty) });

    try {
      const data = await api.submitSos({
        reporter_name: reporterName,
        reporter_phone: reporterPhone,
        address_text: address,
        latitude: Number(lat),
        longitude: Number(lng),
        severity: Number(severity),
        urgency: Number(urgency),
        vulnerability_score: Number(vulnerability),
        people_affected: Number(peopleAffected),
        notes,
        requested_supplies
      });
      setSosResult(data);
      // Auto-populate tracking code
      setTrackingTokenInput(data.tracking_token);
    } catch (err: any) {
      setSosError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackLookup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!trackingTokenInput.trim()) return;
    setTrackingLoading(true);
    setTrackingError(null);
    try {
      const data = await api.trackIncident(trackingTokenInput.trim());
      setTrackingData(data);
    } catch (err: any) {
      setTrackingError(err.message || 'Tracking token not found');
      setTrackingData(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Overview Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-red)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
          <Radio size={24} color="#ef4444" />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Citizen Emergency SOS &amp; Real-Time Relief Tracker</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          Public emergency ingress for affected citizens. Zero login required for SOS distress submission.
          Every ticket is instantly assigned a public tracking code and scored with deterministic multi-variable prioritization.
        </p>
      </div>

      <div className="grid-2">
        {/* Left: SOS Ingress Form */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Shield size={18} color="#ef4444" /> Submit Emergency SOS Distress
            </h3>
            <span className="badge badge-red">PUBLIC INGRESS</span>
          </div>

          {/* Quick presets */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontSize: '0.75rem' }}>Demo Disaster Scenarios (Quick Fill):</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => applyPreset(p)}
                  style={{ fontSize: '0.72rem' }}
                >
                  {p.name.split('(')[0]}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSosSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label className="form-label">Reporter Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Contact Phone *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Physical Location / Landmark Address *</label>
              <textarea
                rows={2}
                required
                className="form-textarea"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
              <div>
                <label className="form-label">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="form-input"
                  value={lat}
                  onChange={(e) => setLat(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="form-label">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="form-input"
                  value={lng}
                  onChange={(e) => setLng(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Severity and Headcount Sliders */}
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="form-label" style={{ margin: 0 }}>Disaster Severity (1: Low &bull; 5: Extreme Life Threat):</span>
                <span className={`badge ${severity >= 4 ? 'badge-red' : severity >= 3 ? 'badge-amber' : 'badge-blue'}`}>
                  Level {severity} / 5
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#ef4444' }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Urgency (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    className="form-input"
                    value={urgency}
                    onChange={(e) => setUrgency(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Vulnerability (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    className="form-input"
                    value={vulnerability}
                    onChange={(e) => setVulnerability(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>People Trapped</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={peopleAffected}
                    onChange={(e) => setPeopleAffected(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {/* Supplies Selection */}
            <div>
              <label className="form-label">Required Emergency Relief Supplies:</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Water 20L Cans:</span>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={waterQty}
                    onChange={(e) => setWaterQty(Number(e.target.value))}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Food Ration Packs:</span>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={foodQty}
                    onChange={(e) => setFoodQty(Number(e.target.value))}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Trauma First Aid Kits:</span>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={medicalQty}
                    onChange={(e) => setMedicalQty(Number(e.target.value))}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Insulin Vials:</span>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={insulinQty}
                    onChange={(e) => setInsulinQty(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="form-label">Distress Narrative &amp; Medical Details</label>
              <textarea
                rows={2}
                className="form-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {sosError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', padding: '0.75rem', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem' }}>
                {sosError}
              </div>
            )}

            <button type="submit" disabled={submitting} className="btn btn-danger" style={{ width: '100%', padding: '0.85rem' }}>
              {submitting ? 'Transmitting to Command Center...' : 'TRANSMIT EMERGENCY SOS (INSTANT RELIEF TICKET)'}
            </button>
          </form>

          {/* SOS Submission Success Banner */}
          {sosResult && (
            <div style={{ marginTop: '1.25rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <CheckCircle2 size={18} color="#10b981" />
                <strong style={{ color: '#34d399' }}>SOS Ticket Dispatched Successfully!</strong>
              </div>
              <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div>Incident ID: <strong className="code-pill">{sosResult.id}</strong></div>
                <div>Public Tracking Code: <strong className="code-pill" style={{ color: '#60a5fa' }}>{sosResult.tracking_token}</strong></div>
                <div>Calculated Priority Score: <strong style={{ color: '#ef4444' }}>{sosResult.priority_score.toFixed(1)} / 100</strong></div>
                {sosResult.priority_breakdown && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                    Breakdown: Severity: {sosResult.priority_breakdown.severity_factor} + Urgency: {sosResult.priority_breakdown.urgency_factor} + Vulnerability: {sosResult.priority_breakdown.vulnerability_factor} + Headcount: {sosResult.priority_breakdown.headcount_factor}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Public Incident Tracker */}
        <div className="glass-panel" style={{ padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={18} color="#60a5fa" /> Track Emergency Status &amp; Relief Delivery
            </h3>
            <span className="badge badge-blue">ACCOUNTABILITY TRACKER</span>
          </div>

          <form onSubmit={handleTrackLookup} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input
              type="text"
              placeholder="e.g. SOS-TRK-9003"
              className="form-input"
              value={trackingTokenInput}
              onChange={(e) => setTrackingTokenInput(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" disabled={trackingLoading} className="btn btn-primary">
              {trackingLoading ? 'Searching...' : 'Track Ticket'}
            </button>
          </form>

          {/* Quick Tracking Presets */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Demo Tokens:</span>
            {['SOS-TRK-9001', 'SOS-TRK-9002', 'SOS-TRK-9003', 'SOS-TRK-9004', 'SOS-TRK-9005'].map((t) => (
              <button
                key={t}
                type="button"
                className="code-pill"
                onClick={() => {
                  setTrackingTokenInput(t);
                  api.trackIncident(t).then(setTrackingData).catch(() => {});
                }}
                style={{ cursor: 'pointer', border: trackingTokenInput === t ? '1px solid #60a5fa' : undefined }}
              >
                {t}
              </button>
            ))}
          </div>

          {trackingError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.75rem', borderRadius: '8px', color: '#f87171', fontSize: '0.85rem' }}>
              {trackingError}
            </div>
          )}

          {trackingData ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Ticket Header Card */}
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ticket ID:</span>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{trackingData.tracking_token}</h4>
                  </div>
                  <span className={`badge ${
                    trackingData.status === 'RESOLVED' ? 'badge-emerald' :
                    trackingData.status === 'PARTIALLY_FULFILLED' ? 'badge-amber' :
                    trackingData.status === 'IN_DISPATCH' ? 'badge-purple' : 'badge-blue'
                  }`}>
                    {trackingData.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  {trackingData.address_text}
                </div>
                <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Priority Triage Score: <strong style={{ color: '#ef4444' }}>{trackingData.priority_score.toFixed(1)} / 100</strong>
                </div>
              </div>

              {/* Relief Item Fulfillment Matrix */}
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Package size={16} color="#60a5fa" /> Relief Supply Delivery Status
                </h4>
                {trackingData.supplies && trackingData.supplies.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {trackingData.supplies.map((s: any) => {
                      const pct = Math.min(100, Math.round((s.delivered_qty / (s.requested_qty || 1)) * 100));
                      return (
                        <div key={s.item_code} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.82rem' }}>
                            <strong>{s.item_name || s.item_code}</strong>
                            <span>
                              Delivered: <strong style={{ color: s.delivered_qty >= s.requested_qty ? '#10b981' : '#f59e0b' }}>{s.delivered_qty}</strong> / {s.requested_qty}
                            </span>
                          </div>
                          <div className="progress-bar-bg">
                            <div
                              className="progress-bar-fill"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: pct === 100 ? '#10b981' : '#f59e0b'
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            <span>Approved: {s.approved_qty} &bull; Dispatched: {s.dispatched_qty}</span>
                            <span className={`badge ${s.fulfillment_status === 'FULFILLED' ? 'badge-emerald' : s.fulfillment_status === 'PARTIAL' ? 'badge-amber' : 'badge-blue'}`} style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                              {s.fulfillment_status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No supplies registered for this ticket.</p>
                )}
              </div>

              {/* Timeline Events from Database Activity History */}
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={16} color="#34d399" /> Response Activity Audit Trail
                </h4>
                {trackingData.timeline && trackingData.timeline.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {trackingData.timeline.map((evt: any, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                        <ArrowRight size={14} color="#60a5fa" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{evt.description}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                            Role: {evt.actor_role || 'CITIZEN'} &bull; {new Date(evt.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Ticket registered in command queue. Awaiting triage.</p>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              <Package size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
              <p>Enter an SOS tracking token above to view live relief fulfillment and dispatch progress.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
