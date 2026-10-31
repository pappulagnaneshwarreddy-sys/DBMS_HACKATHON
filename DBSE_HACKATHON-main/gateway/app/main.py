import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import DBAPIError, IntegrityError

from app.core.config import settings
from app.routers import auth, incidents, system, logistics

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("relieflink-gateway")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description=(
        "**RELIEFLINK 360** Intelligent Disaster Response & Relief Accountability Network API Gateway.\n\n"
        "Features:\n"
        "- **Server-Side RBAC**: Role enforcement across Coordinator, Warehouse, Responder, and Citizen.\n"
        "- **Citizen SOS Ingress**: Rapid emergency intake with explainable priority scoring.\n"
        "- **Polyglot Persistence**: PostgreSQL 16 (single source of truth) + MongoDB 7.0 (flexible telemetry).\n"
        "- **Semantic Intelligence**: Cosine nearest-neighbor searches via pgvector HNSW index.\n"
        "- **Relief Accountability**: Strict invariant preventing premature resolution of partially served incidents."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Robust CORS for Local Wi-Fi Network Multi-Laptop Demonstration
# Allows any device on the local network (e.g. http://192.168.x.x:5173 or localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler for Database Invariant & Constraint Violations
@app.exception_handler(DBAPIError)
async def dbapi_exception_handler(request: Request, exc: DBAPIError):
    orig_msg = str(exc.orig) if hasattr(exc, "orig") else str(exc)
    logger.warning(f"Database constraint / trigger exception caught: {orig_msg}")

    # Extract user-friendly trigger message if accountability invariant violated
    if "Disaster Accountability Invariant Violation" in orig_msg or "trg_prevent_unfulfilled" in orig_msg:
        # Strip internal postgres prefixes for clean API output
        detail_msg = orig_msg.split("CONTEXT:")[0].replace("ERROR:", "").strip()
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "error": "Disaster Accountability Invariant Violation (CO6)",
                "detail": detail_msg
            }
        )
    elif "chk_inventory_availability" in orig_msg:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "error": "Inventory Invariant Violation",
                "detail": "Requested operation violates non-negative inventory constraint (quantity_on_hand >= quantity_reserved)."
            }
        )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "Database Execution Error", "detail": "An internal database error occurred."}
    )

# Include Routers
app.include_router(system.router)
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(incidents.router, prefix=settings.API_V1_PREFIX)
app.include_router(logistics.router, prefix=settings.API_V1_PREFIX)

@app.get("/", tags=["System"])
def root():
    return {
        "message": "Welcome to RELIEFLINK 360 API Gateway (Local Distributed LAN Mode)",
        "version": settings.VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi_spec": "/openapi.json",
        "endpoints": {
            "auth": f"{settings.API_V1_PREFIX}/auth",
            "incidents": f"{settings.API_V1_PREFIX}/incidents",
            "health": "/health",
            "readiness": "/ready"
        }
    }
