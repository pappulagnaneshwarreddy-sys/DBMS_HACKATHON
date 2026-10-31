from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class WarehouseResponse(BaseModel):
    id: str
    name: str
    code: str
    latitude: float
    longitude: float
    address: str
    contact_phone: Optional[str] = None
    status: str
    capacity_cubic_meters: int

    model_config = ConfigDict(from_attributes=True)

class InventoryItemResponse(BaseModel):
    id: str
    warehouse_id: str
    warehouse_name: Optional[str] = None
    item_code: str
    item_name: str
    category: str
    unit: str
    quantity_on_hand: int
    quantity_reserved: int
    available_quantity: int
    safety_stock_threshold: int

    model_config = ConfigDict(from_attributes=True)

class ReserveInventoryRequest(BaseModel):
    incident_id: str = Field(..., min_length=1)
    warehouse_id: str = Field(..., min_length=1)
    item_code: str = Field(..., min_length=1)
    quantity: int = Field(..., gt=0)

class DispatchItemManifest(BaseModel):
    item_code: str
    quantity: int = Field(..., gt=0)
    item_name: Optional[str] = None

class CreateDispatchRequest(BaseModel):
    incident_id: str
    warehouse_id: str
    vehicle_type: str = Field(..., min_length=2)
    driver_name: str = Field(..., min_length=2)
    driver_phone: str = Field(..., min_length=5)
    items: List[DispatchItemManifest] = Field(..., min_length=1)

class DispatchResponse(BaseModel):
    id: str
    incident_id: str
    warehouse_id: str
    warehouse_name: Optional[str] = None
    status: str
    vehicle_type: str
    driver_name: str
    driver_phone: str
    dispatched_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    items: List[DispatchItemManifest] = []

    model_config = ConfigDict(from_attributes=True)

class AssignMissionRequest(BaseModel):
    incident_id: str
    responder_id: Optional[str] = None
    dispatch_id: Optional[str] = None
    notes: Optional[str] = None

class MissionStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="ASSIGNED, EN_ROUTE, ON_SCENE, COMPLETED, ABORTED")
    notes: Optional[str] = None

class ConfirmDeliveryRequest(BaseModel):
    item_code: str
    quantity: int = Field(..., gt=0)
    verification_code: str = Field(..., min_length=1)
    recipient_name: str = Field(..., min_length=2)
    recipient_phone: Optional[str] = None
    notes: Optional[str] = None

class ResponderMissionResponse(BaseModel):
    id: str
    incident_id: str
    dispatch_id: Optional[str] = None
    responder_id: Optional[str] = None
    responder_name: Optional[str] = None
    status: str
    assigned_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    completion_notes: Optional[str] = None
    verification_code: Optional[str] = None
    incident_address: Optional[str] = None
    reporter_name: Optional[str] = None
    reporter_phone: Optional[str] = None
    severity: Optional[int] = None
    priority_score: Optional[float] = None
    requested_supplies: List[Dict[str, Any]] = []

    model_config = ConfigDict(from_attributes=True)

class DeliveryConfirmationResponse(BaseModel):
    id: str
    incident_id: str
    dispatch_id: Optional[str] = None
    mission_id: Optional[str] = None
    recipient_name: str
    verification_code: str
    items_delivered: Any
    confirmed_at: Optional[datetime] = None

class FieldObservationCreate(BaseModel):
    incident_id: str
    text: str
    hazards: List[str] = []
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class AccountabilitySummaryItem(BaseModel):
    incident_id: str
    tracking_token: str
    address_text: str
    status: str
    priority_score: float
    total_requested: int
    total_approved: int
    total_dispatched: int
    total_delivered: int
    fulfillment_percentage: float
    is_partially_fulfilled: bool
    is_fully_resolved: bool
    supplies: List[Dict[str, Any]]
