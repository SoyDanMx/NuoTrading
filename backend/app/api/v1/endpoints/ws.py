import asyncio
import json
import random
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

@router.websocket("/{symbol}")
async def websocket_endpoint(websocket: WebSocket, symbol: str):
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
        print(f"WebSocket disconnected for {symbol}")
    except Exception as e:
        print(f"WS Error: {e}")
