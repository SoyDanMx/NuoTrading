from fastapi import APIRouter, HTTPException
from typing import List, Optional, Dict
from pydantic import BaseModel
from datetime import datetime
from app.services.market_data import MarketDataService

router = APIRouter()
market_service = MarketDataService()

class MarketData(BaseModel):
    symbol: str
    price: float
    volume: float
    timestamp: datetime

@router.get("/ticker/{symbol}")
async def get_ticker(symbol: str):
    """Get current ticker data for a symbol."""
    # TODO: Implement actual market data fetching from exchange
    return {
        "symbol": symbol.upper(),
        "price": 0.0,
        "volume": 0.0,
        "timestamp": datetime.utcnow().isoformat(),
    }

@router.get("/ohlcv/{symbol}")
async def get_ohlcv(
    symbol: str,
    timeframe: str = "D",
    days: int = 30
):
    """Get OHLCV (candlestick) data for a symbol."""
    try:
        data = await market_service.get_ohlcv(symbol.upper(), timeframe, days)
        return {
            "symbol": symbol.upper(),
            "timeframe": timeframe,
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/symbols")
async def get_symbols():
    """Get list of available trading symbols."""
    # TODO: Implement actual symbol listing from exchange
    return {
        "symbols": ["BTC/USDT", "ETH/USDT", "SOL/USDT"],
        "message": "Symbol list from exchange pending"
    }


@router.get("/finnhub-test")
async def finnhub_test(symbol: str = "AAPL"):
    """Diagnostic: returns quote and whether it came from Finnhub (real) or fallback (simulated)."""
    quote = await market_service.get_stock_quote(symbol.upper())
    return {
        "symbol": symbol.upper(),
        "real_data": not quote.get("is_simulated", False),
        "quote": quote,
    }
