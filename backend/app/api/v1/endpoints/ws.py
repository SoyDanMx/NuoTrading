import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.ws_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter()

@router.websocket("/signals")
async def signals_websocket(websocket: WebSocket):
    """Global WebSocket for agent signals."""
    logger.info(f"Handshake request received for signals from {websocket.client}")
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.post("/test-signal")
async def test_signal(data: dict):
    """Force a manual signal for testing UI."""
    from datetime import datetime
    message = {
        "type": "SIGNAL",
        "symbol": data.get("symbol", "TEST"),
        "action": data.get("action", "BUY"),
        "confidence": data.get("confidence", 99),
        "reason": data.get("reason", "Test signal reason"),
        "timestamp": datetime.now().isoformat()
    }
    await manager.broadcast(message)
    return {"status": "Signal broadcasted", "message": message}

@router.websocket("/{symbol}")
async def websocket_endpoint(websocket: WebSocket, symbol: str):
    """Individual stock price WebSocket."""
    await websocket.accept()
    from app.services.market_data import MarketDataService
    market_service = MarketDataService()
    
    try:
        while True:
            # Fetch real data from Finnhub (via service)
            quote = await market_service.get_stock_quote(symbol.upper())
            
            data = {
                "symbol": symbol.upper(),
                "price": quote["current_price"],
                "timestamp": quote["timestamp"],
                "change_percent": quote["percent_change"],
                "is_live": not quote.get("is_simulated", False)
            }
            
            await websocket.send_text(json.dumps(data))
            
            # If the market is closed, the price won't change. 
            # We wait 10 seconds between checks to respect free tier rate limits (60/min)
            await asyncio.sleep(10) 
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WS Error: {e}")
