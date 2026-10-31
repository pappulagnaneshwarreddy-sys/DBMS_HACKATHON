from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.db.models import User
from app.core.security import verify_password, get_password_hash
from app.schemas.auth import RegisterRequest

VALID_ROLES = {"COORDINATOR", "WAREHOUSE", "RESPONDER", "CITIZEN"}

def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """
    Authenticate a user by email and password using bcrypt verification.
    """
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user

def register_user(db: Session, req: RegisterRequest) -> User:
    """
    Register a new user account with secure bcrypt password hashing.
    Enforces unique email and valid system roles.
    """
    normalized_email = req.email.lower().strip()
    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with email '{normalized_email}' already exists"
        )

    role_upper = req.role.upper().strip()
    if role_upper not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid role '{req.role}'. Must be one of: {sorted(list(VALID_ROLES))}"
        )

    hashed_pw = get_password_hash(req.password)

    new_user = User(
        email=normalized_email,
        password_hash=hashed_pw,
        full_name=req.full_name.strip(),
        role=role_upper,
        assigned_facility_id=req.assigned_facility_id,
        phone_number=req.phone_number,
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
