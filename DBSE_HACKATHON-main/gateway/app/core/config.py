import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "RELIEFLINK 360 API Gateway"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Database Settings
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://relieflink_admin:relieflink_dev_password_change_in_prod@localhost:5432/relieflink_db"
    )
    MONGO_URI: str = os.getenv(
        "MONGO_URI",
        "mongodb://mongo_admin:mongo_dev_password_change_in_prod@localhost:27017/relieflink_intelligence?authSource=admin"
    )
    MONGO_DB: str = os.getenv("MONGO_DB", "relieflink_intelligence")
    
    # Security Settings
    JWT_SECRET: str = os.getenv(
        "JWT_SECRET", 
        "super_secret_jwt_key_hackathon_demo_2026_change_in_production"
    )
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
    INTERNAL_SERVICE_KEY: str = os.getenv("INTERNAL_SERVICE_KEY", "relieflink_internal_mesh_token_2026")
    
    # Microservice URLs
    INVENTORY_SERVICE_URL: str = os.getenv("INVENTORY_SERVICE_URL", "http://localhost:8081")
    SIMULATOR_SERVICE_URL: str = os.getenv("SIMULATOR_SERVICE_URL", "http://localhost:5001")
    
    # CORS (Broad regex used for multi-laptop local Wi-Fi connectivity)
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ]

    model_config = SettingsConfigDict(case_sensitive=True)

settings = Settings()
