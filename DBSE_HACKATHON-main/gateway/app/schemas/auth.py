from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, ConfigDict

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    role: str = Field("CITIZEN", description="COORDINATOR, WAREHOUSE, RESPONDER, or CITIZEN")
    assigned_facility_id: Optional[str] = None
    phone_number: Optional[str] = None

class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    assigned_facility_id: Optional[str] = None
    phone_number: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
