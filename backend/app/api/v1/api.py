from fastapi import APIRouter
from app.api.v1.endpoints import health, market, stocks

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(market.router, prefix="/market", tags=["market"])
api_router.include_router(stocks.router, prefix="/stocks", tags=["stocks"])
