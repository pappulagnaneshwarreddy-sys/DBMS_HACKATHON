import { getGatewayBaseUrl } from '../config/api';

const BASE_URL = getGatewayBaseUrl();

export function getAuthHeaders(token?: string) {
  const t = token || localStorage.getItem('relieflink_token');
  return {
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {})
  };
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Login failed');
    }
    return res.json();
  },

  // Incidents
  async submitSos(data: any) {
    const res = await fetch(`${BASE_URL}/api/v1/incidents/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'SOS submission failed' }));
      throw new Error(err.detail || 'SOS submission failed');
    }
    return res.json();
  },

  async trackIncident(token: string) {
    const res = await fetch(`${BASE_URL}/api/v1/incidents/track/${token}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Ticket not found' }));
      throw new Error(err.detail || 'Tracking lookup failed');
    }
    return res.json();
  },

  async getPriorityQueue(token?: string) {
    const res = await fetch(`${BASE_URL}/api/v1/incidents/priority-queue`, {
      headers: getAuthHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || `HTTP ${res.status}: Failed to fetch priority queue`);
    }
    return res.json();
  },

  async getIncidents(token?: string) {
    const res = await fetch(`${BASE_URL}/api/v1/incidents`, {
      headers: getAuthHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || `HTTP ${res.status}: Failed to fetch incidents`);
    }
    return res.json();
  },

  async verifyIncident(id: string, notes?: string, priority_override?: number, token?: string) {
    const res = await fetch(`${BASE_URL}/api/v1/incidents/${id}/verify`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ notes, priority_override })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || `HTTP ${res.status}: Verification failed`);
    }
    return res.json();
  },

  async updateIncidentStatus(id: string, status: string, notes?: string, token?: string) {
    const res = await fetch(`${BASE_URL}/api/v1/incidents/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ status, notes })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || data.error || `HTTP ${res.status}: Failed to update incident status`);
    }
    return data;
  },

  async getShortages(token?: string) {
    const res = await fetch(`${BASE_URL}/api/v1/incidents/shortages`, {
      headers: getAuthHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || `HTTP ${res.status}: Failed to fetch shortages`);
    }
    return res.json();
  },

  async getSimilarIncidents(queryText?: string, incidentId?: string, token?: string) {
    const params = new URLSearchParams();
    if (queryText) params.append('query_text', queryText);
    if (incidentId) params.append('incident_id', incidentId);
    const res = await fetch(`${BASE_URL}/api/v1/incidents/similar?${params.toString()}`, {
      headers: getAuthHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || `HTTP ${res.status}: Vector search failed`);
    }
    return res.json();
  },

  // Logistics & Warehouse
  async getWarehouses(token?: string) {
    const res = await fetch(`${BASE_URL}/api/v1/logistics/warehouses`, {
      headers: getAuthHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || `HTTP ${res.status}: Failed to fetch warehouses`);
    }
    return res.json();
  },

  async getInventory(warehouseId?: string, token?: string) {
    const url = warehouseId 
      ? `${BASE_URL}/api/v1/logistics/inventory?warehouse_id=${warehouseId}`
      : `${BASE_URL}/api/v1/logistics/inventory`;
    const res = await fetch(url, { headers: getAuthHeaders(token) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || `HTTP ${res.status}: Failed to fetch inventory`);
    }
    return res.json();
  },

  async reserveStock(data: { incident_id: string; warehouse_id: string; item_code: string; quantity: number }, token?: string) {
    const res = await fetch(`${BASE_URL}/api/v1/logistics/reserve`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.detail || json.error || `HTTP ${res.status}: Reservation failed`);
    return json;
  },

  async createDispatch(data: any, token?: string) {
    const res = await fetch(`${BASE_URL}/api/v1/logistics/dispatch`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.detail || json.error || `HTTP ${res.status}: Dispatch failed`);
    return json;
  },

  async getDispatches(token?: string) {
    const res = await fetch(`${BASE_URL}/api/v1/logistics/dispatches`, {
      headers: getAuthHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || `HTTP ${res.status}: Failed to fetch dispatches`);
    }
    return res.json();
  },

  // Responder Missions
  async getMissions(token?: string) {
    const res = await fetch(`${BASE_URL}/api/v1/logistics/missions`, {
      headers: getAuthHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || `HTTP ${res.status}: Failed to fetch missions`);
    }
    return res.json();
  },

  async assignMission(data: { incident_id: string; responder_id?: string; dispatch_id?: string; notes?: string }, token?: string) {
    const res = await fetch(`${BASE_URL}/api/v1/logistics/missions/assign`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.detail || json.error || `HTTP ${res.status}: Mission assignment failed`);
    return json;
  },

  async updateMissionStatus(missionId: string, status: string, notes?: string, token?: string) {
    const res = await fetch(`${BASE_URL}/api/v1/logistics/missions/${missionId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ status, notes })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.detail || json.error || `HTTP ${res.status}: Status update failed`);
    return json;
  },

  async confirmDelivery(missionId: string, data: any, token?: string) {
    const res = await fetch(`${BASE_URL}/api/v1/logistics/missions/${missionId}/confirm-delivery`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data)
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.detail || json.error || `HTTP ${res.status}: Delivery confirmation failed`);
    return json;
  },

  // Accountability
  async getAccountabilityMatrix(token?: string) {
    const res = await fetch(`${BASE_URL}/api/v1/logistics/accountability-matrix`, {
      headers: getAuthHeaders(token)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || `HTTP ${res.status}: Failed to fetch accountability matrix`);
    }
    return res.json();
  },

  // Intelligence
  async getIntelligence(incidentId?: string, token?: string) {
    const url = incidentId 
      ? `${BASE_URL}/api/v1/logistics/intelligence?incident_id=${incidentId}`
      : `${BASE_URL}/api/v1/logistics/intelligence`;
    const res = await fetch(url, { headers: getAuthHeaders(token) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || `HTTP ${res.status}: Failed to fetch intelligence`);
    }
    return res.json();
  },

  async submitObservation(data: any, token?: string) {
    const res = await fetch(`${BASE_URL}/api/v1/logistics/intelligence/observation`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || err.error || `HTTP ${res.status}: Observation submission failed`);
    }
    return res.json();
  }
};
