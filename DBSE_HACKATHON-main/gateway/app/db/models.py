import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, ForeignKey, DateTime
)
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, index=True)
    assigned_facility_id = Column(String(100), nullable=True)
    phone_number = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

class ResourceCategory(Base):
    __tablename__ = "resource_categories"

    code = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_critical = Column(Boolean, default=False)
    default_unit = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now())

class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(Text, nullable=False)
    contact_phone = Column(String(50), nullable=True)
    status = Column(String(50), default="OPERATIONAL", index=True)
    capacity_cubic_meters = Column(Integer, default=1000)
    created_at = Column(DateTime(timezone=True), default=func.now())

class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    warehouse_id = Column(String(50), ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True)
    item_code = Column(String(100), nullable=False, index=True)
    item_name = Column(String(255), nullable=False)
    category = Column(String(50), ForeignKey("resource_categories.code"), nullable=False, index=True)
    unit = Column(String(50), nullable=False)
    quantity_on_hand = Column(Integer, default=0, nullable=False)
    quantity_reserved = Column(Integer, default=0, nullable=False)
    safety_stock_threshold = Column(Integer, default=10, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

class InventoryLedger(Base):
    __tablename__ = "inventory_ledger"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    warehouse_id = Column(String(50), ForeignKey("warehouses.id"), nullable=False, index=True)
    item_code = Column(String(100), nullable=False, index=True)
    transaction_type = Column(String(50), nullable=False)
    delta_quantity = Column(Integer, nullable=False)
    balance_after = Column(Integer, nullable=False)
    reference_id = Column(String(100), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now())

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(50), primary_key=True)
    tracking_token = Column(String(50), unique=True, nullable=False, index=True)
    reporter_name = Column(String(255), nullable=False)
    reporter_phone = Column(String(50), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address_text = Column(Text, nullable=False)
    severity = Column(Integer, nullable=False)
    urgency = Column(Integer, nullable=False)
    vulnerability_score = Column(Integer, nullable=False)
    people_affected = Column(Integer, default=1, nullable=False)
    priority_score = Column(Float, default=0.0, nullable=False, index=True)
    priority_breakdown = Column(JSONB, default=dict)
    status = Column(String(50), default="REPORTED", nullable=False, index=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now())
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now())

    supplies = relationship("IncidentSupply", back_populates="incident", cascade="all, delete-orphan")
    activity_logs = relationship("IncidentActivityHistory", back_populates="incident", cascade="all, delete-orphan")
    embeddings = relationship("SituationEmbedding", back_populates="incident", cascade="all, delete-orphan")

class IncidentSupply(Base):
    __tablename__ = "incident_supplies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(String(50), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    item_code = Column(String(100), nullable=False)
    item_name = Column(String(255), nullable=False)
    requested_qty = Column(Integer, nullable=False)
    approved_qty = Column(Integer, default=0, nullable=False)
    dispatched_qty = Column(Integer, default=0, nullable=False)
    delivered_qty = Column(Integer, default=0, nullable=False)
    fulfillment_status = Column(String(50), default="PENDING", nullable=False)

    incident = relationship("Incident", back_populates="supplies")

class Dispatch(Base):
    __tablename__ = "dispatches"

    id = Column(String(50), primary_key=True)
    incident_id = Column(String(50), ForeignKey("incidents.id"), nullable=False, index=True)
    warehouse_id = Column(String(50), ForeignKey("warehouses.id"), nullable=False)
    status = Column(String(50), default="PREPARING", index=True)
    vehicle_type = Column(String(100), nullable=False)
    driver_name = Column(String(255), nullable=False)
    driver_phone = Column(String(50), nullable=False)
    dispatched_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=func.now())

    items = relationship("DispatchItem", back_populates="dispatch", cascade="all, delete-orphan")

class DispatchItem(Base):
    __tablename__ = "dispatch_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dispatch_id = Column(String(50), ForeignKey("dispatches.id", ondelete="CASCADE"), nullable=False, index=True)
    item_code = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now())

    dispatch = relationship("Dispatch", back_populates="items")

class ResponderMission(Base):
    __tablename__ = "responder_missions"

    id = Column(String(50), primary_key=True)
    incident_id = Column(String(50), ForeignKey("incidents.id"), nullable=False, index=True)
    dispatch_id = Column(String(50), ForeignKey("dispatches.id"), nullable=True)
    responder_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    status = Column(String(50), default="ASSIGNED", index=True)
    assigned_at = Column(DateTime(timezone=True), default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    completion_notes = Column(Text, nullable=True)
    verification_code = Column(String(20), nullable=True)

class DeliveryConfirmation(Base):
    __tablename__ = "delivery_confirmations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(String(50), ForeignKey("incidents.id"), nullable=False, index=True)
    dispatch_id = Column(String(50), ForeignKey("dispatches.id"), nullable=True)
    mission_id = Column(String(50), ForeignKey("responder_missions.id"), nullable=True)
    recipient_name = Column(String(255), nullable=False)
    recipient_phone = Column(String(50), nullable=True)
    verification_code = Column(String(20), nullable=False)
    confirmation_type = Column(String(50), default="VERIFICATION_CODE", nullable=False)
    items_delivered = Column(JSONB, nullable=False)
    confirmed_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    photo_evidence_ref = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    confirmed_at = Column(DateTime(timezone=True), default=func.now())

class IncidentActivityHistory(Base):
    __tablename__ = "incident_activity_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(String(50), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(100), nullable=False)
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=True)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    actor_role = Column(String(50), nullable=True)
    description = Column(Text, nullable=False)
    metadata_ = Column("metadata", JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), default=func.now())

    incident = relationship("Incident", back_populates="activity_logs")

class SituationEmbedding(Base):
    __tablename__ = "situation_embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id = Column(String(50), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False, index=True)
    situation_text = Column(Text, nullable=False)
    embedding = Column(Vector(384), nullable=False)
    created_at = Column(DateTime(timezone=True), default=func.now())

    incident = relationship("Incident", back_populates="embeddings")
