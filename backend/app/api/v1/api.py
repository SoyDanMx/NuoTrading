from fastapi import APIRouter
from app.api.v1.endpoints import health, market, stocks, portfolio, ws, market_hours

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(market.router, prefix="/market", tags=["market"])
api_router.include_router(stocks.router, prefix="/stocks", tags=["stocks"])
api_router.include_router(portfolio.router, prefix="/portfolio", tags=["portfolio"])
api_router.include_router(ws.router, prefix="/ws", tags=["websocket"])
api_router.include_router(market_hours.router, prefix="/market-hours", tags=["market-hours"])
