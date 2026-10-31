from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import create_access_token
from app.core.dependencies import get_current_user
from app.db.models import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services.auth_service import authenticate_user, register_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenResponse, summary="User Login & JWT Issuance")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate with email and password.
    Returns a signed JWT bearer token containing user identity and assigned operational role.
    Supports all 4 seeded demo accounts.
    """
    user = authenticate_user(db, req.email, req.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    }
    access_token = create_access_token(token_data)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED, summary="New User Registration")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """
    Register a new user account with server-side role assignment and bcrypt password hashing.
    """
    user = register_user(db, req)
    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role
    }
    access_token = create_access_token(token_data)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse, summary="Get Current Authenticated User")
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Retrieve the authenticated user's profile and active role.
    Password hash is strictly excluded.
    """
    return UserResponse.model_validate(current_user)
