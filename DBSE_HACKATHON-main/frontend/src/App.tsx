import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Radio, 
  Truck, 
  Warehouse, 
  Activity, 
  CheckCircle2,
  Wifi,
  Laptop,
  Server,
  Layers,
  Eye,
  UserCheck
} from 'lucide-react';
import { getGatewayBaseUrl } from './config/api';
import { api } from './services/api';
import { Role, AuthUser } from './types';

import CitizenView from './components/CitizenView';
import CoordinatorView from './components/CoordinatorView';
import WarehouseView from './components/WarehouseView';
import ResponderView from './components/ResponderView';
import AccountabilityView from './components/AccountabilityView';
import SimulatorView from './components/SimulatorView';
import IntelligenceView from './components/IntelligenceView';

type Tab = 'CITIZEN' | 'COORDINATOR' | 'WAREHOUSE' | 'RESPONDER' | 'ACCOUNTABILITY' | 'SIMULATOR' | 'INTELLIGENCE';

const DEMO_ACCOUNTS: Record<Role, { email: string; pass: string; name: string; title: string; defaultTab: Tab }> = {
  COORDINATOR: {
    email: 'coordinator@relieflink.org',
    pass: 'demo_coordinator_2026',
    name: 'Dr. Elena Rostova',
    title: 'Chief Disaster Incident Commander',
    defaultTab: 'COORDINATOR'
  },
  WAREHOUSE: {
    email: 'warehouse@relieflink.org',
    pass: 'demo_warehouse_2026',
    name: 'Marcus Vance',
    title: 'Central Depot Logistics Manager',
    defaultTab: 'WAREHOUSE'
  },
  RESPONDER: {
    email: 'responder@relieflink.org',
    pass: 'demo_responder_2026',
    name: 'Capt. Sarah Chen',
    title: 'Rescue Unit #4 Lead Responder',
    defaultTab: 'RESPONDER'
  },
  CITIZEN: {
    email: 'citizen@relieflink.org',
    pass: 'demo_citizen_2026',
    name: 'Aarav Patel',
    title: 'Displaced Citizen / Public Reporter',
    defaultTab: 'CITIZEN'
  }
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('COORDINATOR');
  const [activeTab, setActiveTab] = useState<Tab>('COORDINATOR');
  const [gatewayStatus, setGatewayStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [wsStatus, setWsStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [authLoading, setAuthLoading] = useState(true);

  const apiGatewayUrl = getGatewayBaseUrl();
  const detectedHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  // 1. Health check gateway & simulator
  useEffect(() => {
    let isMounted = true;
    const checkServices = () => {
      fetch(`${apiGatewayUrl}/health`)
        .then((res) => (res.ok ? setGatewayStatus('online') : setGatewayStatus('offline')))
        .catch(() => isMounted && setGatewayStatus('offline'));

      fetch(`${apiGatewayUrl.replace(':8000', ':5001')}/health`)
        .then((res) => (res.ok ? setWsStatus('online') : setWsStatus('offline')))
        .catch(() => isMounted && setWsStatus('offline'));
    };

    checkServices();
    const interval = setInterval(checkServices, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [apiGatewayUrl]);

  // 2. Perform 1-click Demo Login
  const handleRoleSwitch = async (role: Role) => {
    setSelectedRole(role);
    const demo = DEMO_ACCOUNTS[role];
    setAuthLoading(true);
    try {
      const authData = await api.login(demo.email, demo.pass);
      const user: AuthUser = {
        id: authData.user.id,
        email: authData.user.email,
        full_name: authData.user.full_name,
        role: authData.user.role,
        assigned_facility_id: authData.user.assigned_facility_id,
        access_token: authData.access_token
      };
      localStorage.setItem('relieflink_token', authData.access_token);
      setCurrentUser(user);
      setActiveTab(demo.defaultTab);
    } catch (err) {
      console.error('Auto demo login failed:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  // Auto-login as Coordinator on first mount
  useEffect(() => {
    handleRoleSwitch('COORDINATOR');
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Banner & Header */}
      <header style={{ 
        borderBottom: '1px solid var(--border-color)', 
        padding: '0.75rem 2rem',
        background: 'rgba(10, 15, 29, 0.9)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #ef4444, #b91c1c)', 
              padding: '0.5rem', 
              borderRadius: '8px', 
              display: 'flex',
              boxShadow: '0 0 15px rgba(239,68,68,0.4)'
            }}>
              <ShieldAlert size={26} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>RELIEFLINK 360</h1>
                <span className="badge badge-red">LOCAL LAN DEMO</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Intelligent Disaster Response &amp; Relief Accountability Network
              </p>
            </div>
          </div>

          {/* Network Health Indicators */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Host IP Pill */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              padding: '0.3rem 0.65rem', 
              background: 'rgba(255,255,255,0.04)', 
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              fontSize: '0.75rem'
            }}>
              <Wifi size={14} color="#60a5fa" />
              <span>Host: <strong className="code-pill">{detectedHost}</strong></span>
            </div>

            {/* Gateway status */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              padding: '0.3rem 0.65rem', 
              background: 'rgba(255,255,255,0.04)', 
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              fontSize: '0.75rem'
            }}>
              <span style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: gatewayStatus === 'online' ? '#10b981' : '#ef4444' 
              }}></span>
              <span>FastAPI (8000)</span>
            </div>

            {/* Simulator status */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              padding: '0.3rem 0.65rem', 
              background: 'rgba(255,255,255,0.04)', 
              borderRadius: '20px',
              border: '1px solid var(--border-color)',
              fontSize: '0.75rem'
            }}>
              <span style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: wsStatus === 'online' ? '#10b981' : '#ef4444' 
              }}></span>
              <span>Simulator (5001)</span>
            </div>

            {/* Active User Chip */}
            {currentUser && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                padding: '0.3rem 0.75rem', 
                background: 'rgba(59, 130, 246, 0.12)', 
                borderRadius: '20px',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                fontSize: '0.75rem'
              }}>
                <UserCheck size={14} color="#60a5fa" />
                <span>{currentUser.full_name} (<strong style={{ color: '#60a5fa' }}>{currentUser.role}</strong>)</span>
              </div>
            )}
          </div>
        </div>

        {/* 1-Click Role Switcher Bar */}
        <div style={{ maxWidth: '1440px', margin: '0.75rem auto 0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.65rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Laptop size={15} color="var(--text-muted)" />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>1-CLICK DEMO ROLE LOGIN:</span>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {(['COORDINATOR', 'WAREHOUSE', 'RESPONDER', 'CITIZEN'] as Role[]).map((r) => {
                const isActive = selectedRole === r;
                return (
                  <button
                    key={r}
                    id={`demo-role-${r.toLowerCase()}`}
                    onClick={() => handleRoleSwitch(r)}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '6px',
                      border: isActive ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                      background: isActive ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.03)',
                      color: isActive ? '#fff' : 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {r === 'COORDINATOR' && '👨‍💼 Coordinator'}
                    {r === 'WAREHOUSE' && '🏢 Warehouse'}
                    {r === 'RESPONDER' && '🚒 Responder'}
                    {r === 'CITIZEN' && '🚨 Citizen'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Navigation */}
          <nav style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {[
              { id: 'CITIZEN', label: '🚨 Citizen SOS', icon: Radio },
              { id: 'COORDINATOR', label: '🎯 Command Center', icon: Activity },
              { id: 'WAREHOUSE', label: '🏢 Warehouse Hub', icon: Warehouse },
              { id: 'RESPONDER', label: '🚒 Field Responder', icon: Truck },
              { id: 'ACCOUNTABILITY', label: '⚖️ Accountability (CO6)', icon: Layers },
              { id: 'SIMULATOR', label: '⚡ Simulator (WS)', icon: Server },
              { id: 'INTELLIGENCE', label: '🛰️ Intelligence (Mongo)', icon: Eye }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id.toLowerCase()}`}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: isActive ? 'var(--accent-blue)' : 'transparent',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: '1440px', margin: '0 auto', width: '100%', padding: '1.75rem 2rem' }}>
        {authLoading && !currentUser && activeTab !== 'CITIZEN' && activeTab !== 'SIMULATOR' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '320px', gap: '1.25rem' }}>
            <div className="animate-spin" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(59,130,246,0.2)', borderTopColor: '#3b82f6' }} />
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
              Connecting {selectedRole} Session &amp; Initializing Relieflink 360 Security Context...
            </div>
          </div>
        ) : (
          <>
            {/* Active Tab View Rendering */}
            {activeTab === 'CITIZEN' && <CitizenView />}
            {activeTab === 'COORDINATOR' && <CoordinatorView currentUser={currentUser} />}
            {activeTab === 'WAREHOUSE' && <WarehouseView currentUser={currentUser} />}
            {activeTab === 'RESPONDER' && <ResponderView currentUser={currentUser} />}
            {activeTab === 'ACCOUNTABILITY' && <AccountabilityView currentUser={currentUser} />}
            {activeTab === 'SIMULATOR' && <SimulatorView />}
            {activeTab === 'INTELLIGENCE' && <IntelligenceView currentUser={currentUser} />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer style={{ 
        borderTop: '1px solid var(--border-color)', 
        padding: '0.85rem 2rem', 
        fontSize: '0.75rem', 
        color: 'var(--text-muted)',
        background: 'rgba(10, 15, 29, 0.95)'
      }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            RELIEFLINK 360 &copy; 2026 &bull; University Hackathon Distributed Disaster Response System &bull; Host: <span className="code-pill">{detectedHost}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><CheckCircle2 size={12} color="#10b981" /> CO1 Relational 3NF</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><CheckCircle2 size={12} color="#10b981" /> CO2 ACID Locks</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><CheckCircle2 size={12} color="#10b981" /> CO3 Polyglot Persist</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><CheckCircle2 size={12} color="#10b981" /> CO4 pgvector Cosine</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><CheckCircle2 size={12} color="#10b981" /> CO5 RBAC Security</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><CheckCircle2 size={12} color="#10b981" /> CO6 Accountability Guard</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
