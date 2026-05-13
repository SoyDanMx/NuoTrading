from fastapi import APIRouter, HTTPException
from typing import Optional
from app.services.market_data import MarketDataService
from app.services.sentiment_service import SentimentService

router = APIRouter()
market_service = MarketDataService()
sentiment_service = SentimentService()

# ... existing endpoints

@router.get("/sentiment/{symbol}")
async def get_stock_sentiment(symbol: str):
    """Get AI-driven sentiment analysis for a stock."""
    try:
        sentiment = await sentiment_service.get_symbol_sentiment(symbol.upper())
        return sentiment
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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

from app.services.yfinance_service import yfinance_service

@router.get("/fundamentals/{symbol}")
async def get_stock_fundamentals(symbol: str):
    """Get rich fundamental data including insider transactions and institutional holders."""
    try:
        data = await yfinance_service.get_fundamentals(symbol)
        if "error" in data:
            raise HTTPException(status_code=400, detail=data["error"])
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/options/{symbol}")
async def get_stock_options(symbol: str):
    """Get option chain data for the nearest expiration."""
    try:
        data = await yfinance_service.get_options(symbol)
        if "error" in data:
            raise HTTPException(status_code=400, detail=data["error"])
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
