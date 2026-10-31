import { useState, useEffect } from 'react';
import { Server, AlertTriangle, Play, RotateCcw, Activity, CheckCircle } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { getSimulatorWsUrl } from '../config/api';

export default function SimulatorView() {
  const [disruptions, setDisruptions] = useState<{ roadBlocks: any[]; warehouseOutages: any[]; activeSurge: boolean }>({
    roadBlocks: [],
    warehouseOutages: [],
    activeSurge: false
  });
  const [eventLogs, setEventLogs] = useState<{ id: string; time: string; text: string; type: string }[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const simulatorWsUrl = getSimulatorWsUrl();
  const simulatorHttpUrl = simulatorWsUrl.replace('ws://', 'http://').replace('wss://', 'https://');

  useEffect(() => {
    let socket: Socket;
    try {
      socket = io(simulatorWsUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        timeout: 4000
      });

      socket.on('connect', () => {
        setWsConnected(true);
        addLog('WebSocket connection established with Disaster Simulator (port 5001).', 'info');
      });

      socket.on('disconnect', () => {
        setWsConnected(false);
        addLog('WebSocket disconnected from Disaster Simulator.', 'warn');
      });

      socket.on('SIMULATOR_STATE_SYNC', (data: any) => {
        if (data) {
          setDisruptions(data);
          addLog(`State synced from simulator. ${data.roadBlocks?.length || 0} active road blocks.`, 'info');
        }
      });

      socket.on('SIMULATOR_ROAD_BLOCK_ADDED', (block: any) => {
        setDisruptions((prev) => ({
          ...prev,
          roadBlocks: [block, ...prev.roadBlocks]
        }));
        addLog(`ALERT: New road blockage injected: ${block.roadName} (${block.cause})`, 'danger');
      });

      socket.on('SIMULATOR_WAREHOUSE_OUTAGE', (outage: any) => {
        setDisruptions((prev) => ({
          ...prev,
          warehouseOutages: [outage, ...prev.warehouseOutages]
        }));
        addLog(`CRITICAL: Warehouse outage reported: ${outage.warehouseId} (${outage.reason})`, 'danger');
      });

      socket.on('SIMULATOR_RESET', () => {
        setDisruptions({ roadBlocks: [], warehouseOutages: [], activeSurge: false });
        addLog('Simulator state reset: all active disruptions cleared.', 'info');
      });
    } catch {
      setWsConnected(false);
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [simulatorWsUrl]);

  const addLog = (text: string, type: string) => {
    setEventLogs((prev) => [
      { id: Math.random().toString(), time: new Date().toLocaleTimeString(), text, type },
      ...prev.slice(0, 19)
    ]);
  };

  const triggerEvent = async (eventType: string, payload: any) => {
    setTriggering(true);
    setMsg(null);
    try {
      await fetch(`${simulatorHttpUrl}/api/v1/simulator/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType, payload })
      });
      setMsg(`Simulation event dispatched: ${eventType}`);
    } catch (err: any) {
      setMsg(`Disruption trigger failed: ${err.message}`);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Overview Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-purple)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <Server size={24} color="#c084fc" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Disaster Impact &amp; Disruption Simulator</h2>
              <span className={`badge ${wsConnected ? 'badge-emerald' : 'badge-amber'}`}>
                {wsConnected ? 'WEBSOCKET CONNECTED' : 'OFFLINE'}
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Node.js microservice running on <code className="code-pill">0.0.0.0:5001</code> streaming real-time disruption events (road blockages, warehouse power failures, and emergency surges) to all laptops on LAN.
            </p>
          </div>
          <button
            onClick={() => triggerEvent('RESET_ALL', {})}
            disabled={triggering}
            className="btn btn-outline btn-sm"
          >
            <RotateCcw size={14} /> Clear Disruptions
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', color: '#93c5fd', padding: '0.85rem 1.25rem', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={16} /> {msg}
        </div>
      )}

      {/* Disruption Trigger Controls */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Play size={18} color="#f59e0b" /> Inject Synthetic Disaster Disruptions
        </h3>

        <div className="grid-3">
          {/* 1. Road Block */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', color: '#f87171' }}>
              Musi River Causeway Overtopping
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Blockades Moosarambagh Musi Causeway Bridge. Forces responder dispatches from Secunderabad Depot to detour via Chaderghat.
            </p>
            <button
              onClick={() =>
                triggerEvent('ROAD_BLOCK', {
                  roadName: 'Moosarambagh Musi Causeway Bridge',
                  latitude: 17.3753,
                  longitude: 78.5085,
                  severity: 'TOTAL_BLOCKAGE',
                  cause: 'Musi River Flood Waters Overtopping Causeway & Debris Inundation'
                })
              }
              disabled={triggering}
              className="btn btn-danger btn-sm"
              style={{ width: '100%' }}
            >
              Inject Musi Causeway Road Block
            </button>
          </div>

          {/* 2. Begumpet Underpass */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fbbf24' }}>
              Railway Underpass Flash Flood
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Simulates 4ft waterlogging at Begumpet Railway Underpass. Cuts off rapid transit from Kukatpally Depot.
            </p>
            <button
              onClick={() =>
                triggerEvent('ROAD_BLOCK', {
                  roadName: 'Begumpet Railway Underpass Corridor',
                  latitude: 17.4447,
                  longitude: 78.4664,
                  severity: 'SEVERELY_DEGRADED',
                  cause: 'Submerged Pump Failure & 4ft Urban Inundation'
                })
              }
              disabled={triggering}
              className="btn btn-warning btn-sm"
              style={{ width: '100%' }}
            >
              Inject Begumpet Underpass Breach
            </button>
          </div>

          {/* 3. Warehouse Outage */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1.25rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', color: '#c084fc' }}>
              Depot Power / Flooding Outage
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Shuts down WH-WEST-03. Diverts all pending western dispatches to Central Hub.
            </p>
            <button
              onClick={() =>
                triggerEvent('WAREHOUSE_OUTAGE', {
                  warehouseId: 'WH-WEST-03',
                  reason: 'Auxiliary Generator Diesel Contamination & Basement Flood',
                  estimatedOfflineHours: 6
                })
              }
              disabled={triggering}
              className="btn btn-outline btn-sm"
              style={{ width: '100%' }}
            >
              Simulate WH-WEST-03 Outage
            </button>
          </div>
        </div>
      </div>

      {/* Real-time State & Live Event Feed */}
      <div className="grid-2">
        {/* Active Disruptions List */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} color="#ef4444" /> Active Network Disruptions
          </h3>

          {disruptions.roadBlocks.length === 0 && disruptions.warehouseOutages.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              No active disruptions. All transit routes and warehouse depots operating normally.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {disruptions.roadBlocks.map((rb, idx) => (
                <div key={idx} style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{rb.roadName}</strong>
                    <span className="badge badge-red">{rb.severity}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Cause: {rb.cause}
                  </div>
                </div>
              ))}

              {disruptions.warehouseOutages.map((wo, idx) => (
                <div key={idx} style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <strong style={{ fontSize: '0.9rem' }}>{wo.warehouseId}</strong>
                    <span className="badge badge-amber">OUTAGE</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Reason: {wo.reason}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live WebSocket Event Audit Log */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={18} color="#60a5fa" /> Live Socket.IO Audit Stream
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '320px', overflowY: 'auto' }}>
            {eventLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  borderLeft: `3px solid ${
                    log.type === 'danger' ? '#ef4444' : log.type === 'warn' ? '#f59e0b' : '#3b82f6'
                  }`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                  <span>{log.time}</span>
                  <span className="code-pill">{log.type.toUpperCase()}</span>
                </div>
                <div style={{ marginTop: '0.2rem', color: 'var(--text-primary)' }}>{log.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
