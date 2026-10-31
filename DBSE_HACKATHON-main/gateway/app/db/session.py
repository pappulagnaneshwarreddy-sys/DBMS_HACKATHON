from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
from typing import Generator

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db() -> Generator:
    """
    FastAPI dependency yielding a thread-local SQLAlchemy database session.
    Automatically handles commit/rollback and ensures session closure.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
