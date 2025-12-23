"""
Data Feed Service - Market data ingestion and management
"""
import ccxt
from typing import List, Dict, Optional
from datetime import datetime

class DataFeedService:
    """Service for fetching market data from exchanges."""
    
    def __init__(self, exchange_id: str = "binance"):
        """Initialize the data feed with a specific exchange."""
        self.exchange_id = exchange_id
        self.exchange = self._initialize_exchange(exchange_id)
    
    def _initialize_exchange(self, exchange_id: str):
        """Initialize CCXT exchange instance."""
        exchange_class = getattr(ccxt, exchange_id)
        return exchange_class({
            'enableRateLimit': True,
        })
    
    async def fetch_ticker(self, symbol: str) -> Dict:
        """Fetch current ticker data for a symbol."""
        try:
            ticker = self.exchange.fetch_ticker(symbol)
            return {
                "symbol": symbol,
                "price": ticker.get("last"),
                "bid": ticker.get("bid"),
                "ask": ticker.get("ask"),
                "volume": ticker.get("baseVolume"),
                "timestamp": datetime.utcnow().isoformat(),
            }
        except Exception as e:
            raise Exception(f"Error fetching ticker for {symbol}: {str(e)}")
    
    async def fetch_ohlcv(
        self, 
        symbol: str, 
        timeframe: str = "1h", 
        limit: int = 100
    ) -> List[Dict]:
        """Fetch OHLCV (candlestick) data."""
        try:
            ohlcv = self.exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
            return [
                {
                    "timestamp": candle[0],
                    "open": candle[1],
                    "high": candle[2],
                    "low": candle[3],
                    "close": candle[4],
                    "volume": candle[5],
                }
                for candle in ohlcv
            ]
        except Exception as e:
            raise Exception(f"Error fetching OHLCV for {symbol}: {str(e)}")
    
    async def fetch_markets(self) -> List[str]:
        """Fetch available trading markets/symbols."""
        try:
            markets = self.exchange.load_markets()
            return list(markets.keys())
        except Exception as e:
            raise Exception(f"Error fetching markets: {str(e)}")
