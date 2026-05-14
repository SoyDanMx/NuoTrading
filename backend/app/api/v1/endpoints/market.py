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
    days: str = "30" # Change to string to handle "14:0:0" cases
):
    """Get OHLCV (candlestick) data for a symbol."""
    try:
        # Robust conversion: handle cases like "14:0:0" or "30"
        days_int = int(str(days).split(':')[0])
        data = await market_service.get_ohlcv(symbol.upper(), timeframe, days_int)
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

@router.get("/category/{category}")
async def get_market_category(category: str):
    """
    Get price and performance data for a specific asset category.
    Categories: indices, etfs, crypto, forex, commodities, bonds, mx
    """
    universes = {
        "indices": ["^SPX", "^DJI", "^IXIC", "^VIX", "^MXX"],
        "etfs": ["SPY", "QQQ", "IWM", "GLD", "TLT", "VNQ", "XLF", "XLE"],
        "crypto": ["BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD", "ADA-USD"],
        "forex": ["EURUSD=X", "GBPUSD=X", "JPYUSD=X", "MXNUSD=X"],
        "commodities": ["GC=F", "CL=F", "SI=F"],
        "bonds": ["^TNX", "^TYX", "^IRX"],
        "mx": ["AMXL.MX", "WALMEX.MX", "FEMSAUBD.MX", "GFNORTEO.MX", "GMEXICOB.MX"]
    }

    category = category.lower()
    if category not in universes:
        raise HTTPException(status_code=404, detail="Category not found")

    symbols = universes[category]
    results = []
    
    for symbol in symbols:
        try:
            quote = await market_service.get_stock_quote(symbol)
            results.append({
                "symbol": symbol,
                "price": quote.get("current_price", 0.0),
                "change_pct": quote.get("percent_change", 0.0),
                "name": symbol.replace("^", "").replace("-USD", "").replace("=X", "").replace("=F", "")
            })
        except Exception as e:
            results.append({"symbol": symbol, "error": str(e)})
            
    return results
