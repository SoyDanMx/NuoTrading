from fastapi import APIRouter, HTTPException
from typing import Optional
from app.services.market_data import MarketDataService

router = APIRouter()
market_service = MarketDataService()

@router.get("/quote/{symbol}")
async def get_stock_quote(symbol: str):
    """Get real-time stock quote."""
    try:
        quote = await market_service.get_stock_quote(symbol.upper())
        return quote
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/indicators/{symbol}")
async def get_technical_indicators(symbol: str):
    """Get technical indicators for a stock."""
    try:
        indicators = await market_service.get_technical_indicators(symbol.upper())
        return indicators
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/vix")
async def get_vix():
    """Get VIX (Volatility Index) data."""
    try:
        vix = await market_service.get_vix()
        return vix
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/analysis/{symbol}")
async def get_complete_analysis(symbol: str):
    """Get complete stock analysis with all indicators and recommendation."""
    try:
        analysis = await market_service.get_complete_analysis(symbol.upper())
        return analysis
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
