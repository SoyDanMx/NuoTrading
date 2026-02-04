"""
Market Hours Endpoint - Información sobre horarios de mercado
Basado en análisis de Robinhood
"""
from fastapi import APIRouter
from app.services.market_hours_service import MarketHoursService

router = APIRouter()
market_hours_service = MarketHoursService()

@router.get("/status")
async def get_market_status():
    """Obtener estado actual del mercado"""
    return market_hours_service.get_market_status()

@router.get("/trading-window")
async def get_trading_window():
    """Obtener ventana de trading actual"""
    return market_hours_service.get_trading_window()

@router.get("/can-trade")
async def can_trade(order_type: str = "market"):
    """Verificar si se puede operar ahora"""
    return {
        "can_trade": market_hours_service.can_trade_now(order_type),
        "order_type": order_type,
        "status": market_hours_service.get_market_status()
    }
