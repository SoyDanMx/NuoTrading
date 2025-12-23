from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "NUO TRADE API"
    }

@router.get("/database")
async def database_health():
    """Database health check."""
    # TODO: Implement actual database connection check
    return {
        "status": "healthy",
        "database": "connected"
    }

@router.get("/redis")
async def redis_health():
    """Redis health check."""
    # TODO: Implement actual Redis connection check
    return {
        "status": "healthy",
        "redis": "connected"
    }
