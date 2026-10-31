import { useState, useEffect } from 'react';
import { Eye, Radio, Wind, Droplets, AlertTriangle, RefreshCw, Layers } from 'lucide-react';
import { api } from '../services/api';
import { AuthUser } from '../types';

interface IntelligenceViewProps {
  currentUser?: AuthUser | null;
}

export default function IntelligenceView({ currentUser }: IntelligenceViewProps) {
  const [intelData, setIntelData] = useState<{
    incident_intelligence: any[];
    field_observations: any[];
    drone_telemetry: any[];
  }>({
    incident_intelligence: [],
    field_observations: [],
    drone_telemetry: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIntel = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = currentUser?.access_token || localStorage.getItem('relieflink_token') || undefined;
      const data = await api.getIntelligence(undefined, token);
      setIntelData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch MongoDB intelligence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntel();
  }, [currentUser?.access_token]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Overview Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-emerald)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <Eye size={24} color="#34d399" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Situation Intelligence &amp; Drone Reconnaissance</h2>
              <span className="badge badge-emerald">MONGODB 7.0 DOCUMENT STORE</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Polyglot Persistence (CO3): MongoDB stores schema-less unstructured narratives, thermal drone imagery telemetry, audio transcripts, and environmental river gauges without polluting transactional relational tables.
            </p>
          </div>
          <button onClick={loadIntel} disabled={loading} className="btn btn-outline btn-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Intelligence
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', padding: '0.85rem 1.25rem', borderRadius: '8px', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* 1. Unstructured Incident Intelligence (Thermal Drone Recon & Audio Transcripts) */}
      <div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Radio size={18} color="#60a5fa" /> Aerial Drone Reconnaissance &amp; Citizen SOS Transcripts
        </h3>

        <div className="grid-2">
          {intelData.incident_intelligence.map((doc, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '1.05rem', color: '#60a5fa' }}>{doc.incident_id}</strong>
                <span className="badge badge-blue">SITREP INTEL</span>
              </div>

              {/* Thermal Recon Summary */}
              {doc.drone_recon_summary && (
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.85rem', borderRadius: '6px', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 700, color: '#fbbf24', display: 'block', marginBottom: '0.25rem' }}>
                    &bull; Drone Thermal Imaging Report:
                  </span>
                  {doc.drone_recon_summary}
                </div>
              )}

              {/* Raw Citizen Audio Transcript */}
              {doc.raw_audio_transcript && (
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', borderLeft: '3px solid #ef4444', padding: '0.75rem', borderRadius: '4px', fontSize: '0.82rem', fontStyle: 'italic', color: '#f8fafc' }}>
                  &ldquo;{doc.raw_audio_transcript}&rdquo;
                </div>
              )}

              {/* Weather Telemetry Gauges */}
              {doc.weather_telemetry && (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.04)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
                    <Droplets size={14} color="#60a5fa" />
                    <span>Rain: {doc.weather_telemetry.precipitation_mm_hr} mm/hr</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.04)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
                    <Wind size={14} color="#a855f7" />
                    <span>Wind: {doc.weather_telemetry.wind_gust_kmh} km/h</span>
                  </div>
                  {doc.weather_telemetry.river_gauge_level_meters && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.04)', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
                      <AlertTriangle size={14} color="#f59e0b" />
                      <span>River Gauge: {doc.weather_telemetry.river_gauge_level_meters}m</span>
                    </div>
                  )}
                </div>
              )}

              {/* Detected Hazards Tags */}
              {doc.detected_hazards && (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {doc.detected_hazards.map((hz: string, hIdx: number) => (
                    <span key={hIdx} className="badge badge-red" style={{ fontSize: '0.68rem' }}>
                      {hz.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Responder Field Observations */}
      <div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={18} color="#34d399" /> Real-Time Responder Field Notes (MongoDB Feed)
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {intelData.field_observations.map((obs, idx) => (
            <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <div>
                  <strong>{obs.responder_name || 'Field Rescue Unit'}</strong> &bull; Incident: <span className="code-pill">{obs.incident_id}</span>
                </div>
                <span className="badge badge-emerald">FIELD NOTE</span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0 }}>
                {obs.observation_text}
              </p>
              {obs.detected_hazards && obs.detected_hazards.length > 0 && (
                <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem' }}>
                  {obs.detected_hazards.map((h: string, i: number) => (
                    <span key={i} className="code-pill" style={{ color: '#fbbf24', fontSize: '0.72rem' }}>
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
