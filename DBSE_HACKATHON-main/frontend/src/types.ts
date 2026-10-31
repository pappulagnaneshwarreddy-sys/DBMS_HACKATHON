export type Role = 'COORDINATOR' | 'WAREHOUSE' | 'RESPONDER' | 'CITIZEN';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  assigned_facility_id?: string;
  access_token: string;
}

export interface SupplyItem {
  item_code: string;
  item_name: string;
  requested_qty: number;
  approved_qty: number;
  dispatched_qty: number;
  delivered_qty: number;
  fulfillment_status: string;
}

export interface Incident {
  id: string;
  tracking_token: string;
  reporter_name: string;
  reporter_phone: string;
  latitude: number;
  longitude: number;
  address_text: string;
  severity: number;
  urgency: number;
  vulnerability_score: number;
  people_affected: number;
  priority_score: number;
  priority_breakdown?: {
    severity_factor: number;
    urgency_factor: number;
    vulnerability_factor: number;
    headcount_factor: number;
    shortage_factor: number;
    total_score: number;
    formula_version: string;
    explanation: string;
  };
  status: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  supplies: SupplyItem[];
}

export interface ShortageSummary {
  item_code: string;
  item_name: string;
  total_requested: number;
  total_delivered: number;
  outstanding_deficit: number;
  incidents_affected_count: number;
  regional_available_stock: number;
  allocation_feasibility: string;
}

export interface InventoryItem {
  id: string;
  warehouse_id: string;
  warehouse_name: string;
  item_code: string;
  item_name: string;
  category: string;
  unit: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  available_quantity: number;
  safety_stock_threshold: number;
}

export interface Dispatch {
  id: string;
  incident_id: string;
  warehouse_id: string;
  warehouse_name?: string;
  status: string;
  vehicle_type: string;
  driver_name: string;
  driver_phone: string;
  dispatched_at?: string;
  delivered_at?: string;
  items: { item_code: string; quantity: number }[];
}

export interface ResponderMission {
  id: string;
  incident_id: string;
  dispatch_id?: string;
  responder_id?: string;
  responder_name?: string;
  status: string;
  assigned_at?: string;
  completed_at?: string;
  completion_notes?: string;
  verification_code?: string;
  incident_address?: string;
  reporter_name?: string;
  reporter_phone?: string;
  severity?: number;
  priority_score?: number;
  requested_supplies: SupplyItem[];
}

export interface AccountabilityItem {
  incident_id: string;
  tracking_token: string;
  address_text: string;
  status: string;
  priority_score: number;
  total_requested: number;
  total_approved: number;
  total_dispatched: number;
  total_delivered: number;
  fulfillment_percentage: number;
  is_partially_fulfilled: boolean;
  is_fully_resolved: boolean;
  supplies: {
    item_code: string;
    item_name: string;
    requested: number;
    approved: number;
    dispatched: number;
    delivered: number;
    status: string;
  }[];
}
