from pymongo import MongoClient
from pymongo.database import Database
from app.core.config import settings

mongo_client: MongoClient = MongoClient(
    settings.MONGO_URI,
    serverSelectionTimeoutMS=3000,
    connectTimeoutMS=3000
)

def get_mongo_db() -> Database:
    """
    FastAPI dependency providing access to the MongoDB relieflink_intelligence database.
    """
    return mongo_client[settings.MONGO_DB]

def check_mongo_health() -> bool:
    """
    Ping MongoDB to check connection readiness.
    """
    try:
        mongo_client.admin.command('ping')
        return True
    except Exception:
        return False
