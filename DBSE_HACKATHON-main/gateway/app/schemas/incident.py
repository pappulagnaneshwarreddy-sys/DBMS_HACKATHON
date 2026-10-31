from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class SupplyItemRequest(BaseModel):
    item_code: str = Field(..., min_length=1)
    quantity: int = Field(..., gt=0)
    item_name: Optional[str] = None

class SupplyItemResponse(BaseModel):
    item_code: str
    item_name: str
    requested_qty: int
    approved_qty: int
    dispatched_qty: int
    delivered_qty: int
    fulfillment_status: str

    model_config = ConfigDict(from_attributes=True)

class IncidentCreateRequest(BaseModel):
    reporter_name: str = Field(..., min_length=2)
    reporter_phone: str = Field(..., min_length=7)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    address_text: str = Field(..., min_length=5)
    severity: int = Field(..., ge=1, le=5)
    urgency: int = Field(..., ge=1, le=5)
    vulnerability_score: int = Field(1, ge=1, le=5)
    people_affected: int = Field(1, ge=1)
    notes: Optional[str] = None
    requested_supplies: List[SupplyItemRequest] = []

class PriorityBreakdown(BaseModel):
    severity_factor: float
    urgency_factor: float
    vulnerability_factor: float
    headcount_factor: float
    shortage_factor: float
    total_score: float
    formula_version: str = "RELIEFLINK-PRIORITY-v1"
    explanation: str

class IncidentResponse(BaseModel):
    id: str
    tracking_token: str
    reporter_name: str
    reporter_phone: str
    latitude: float
    longitude: float
    address_text: str
    severity: int
    urgency: int
    vulnerability_score: int
    people_affected: int
    priority_score: float
    priority_breakdown: Optional[Dict[str, Any]] = None
    status: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    supplies: List[SupplyItemResponse] = []

    model_config = ConfigDict(from_attributes=True)

class TimelineEvent(BaseModel):
    action: str
    timestamp: datetime
    description: str
    actor_role: Optional[str] = None

class IncidentTrackingResponse(BaseModel):
    incident_id: str
    tracking_token: str
    status: str
    reporter_name: str
    address_text: str
    priority_score: float
    priority_breakdown: Optional[Dict[str, Any]] = None
    supplies: List[SupplyItemResponse] = []
    timeline: List[TimelineEvent] = []
    unstructured_intel: Optional[Dict[str, Any]] = None

class IncidentVerifyRequest(BaseModel):
    notes: Optional[str] = None
    priority_override: Optional[float] = Field(None, ge=0.0, le=100.0)

class IncidentStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="REPORTED, VERIFIED, IN_DISPATCH, IN_DELIVERY, PARTIALLY_FULFILLED, RESOLVED, CANCELLED")
    notes: Optional[str] = None

class ShortageSummary(BaseModel):
    item_code: str
    item_name: str
    total_requested: int
    total_delivered: int
    outstanding_deficit: int
    incidents_affected_count: int
    regional_available_stock: int
    allocation_feasibility: str
