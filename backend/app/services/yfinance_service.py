import yfinance as yf
import logging
from typing import Dict, Any, List
from app.core.ws_manager import manager

logger = logging.getLogger(__name__)

# Suppress yfinance internal spam logs (like "possibly delisted")
yf_logger = logging.getLogger('yfinance')
yf_logger.setLevel(logging.CRITICAL)
# Also disable pandas warnings if any
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)

# Core portfolio / trending symbols to stream
SYMBOLS = ["NVDA", "AAPL", "TSLA", "MSFT", "GOOGL", "META", "AMZN", "NFLX"]

class YFinanceService:
    """Service integrating yfinance as the primary market data source."""

    @staticmethod
    async def start_price_stream():
        """Simulates a WebSocket stream by polling yfinance to provide real-time prices."""
        import asyncio
        import requests
        
        # Setup session with User-Agent to avoid 429 Too Many Requests
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        
        try:
            logger.info(f"Initializing yfinance price stream (polling) for {len(SYMBOLS)} symbols...")
            while True:
                tickers = yf.Tickers(" ".join(SYMBOLS), session=session)
                for symbol in SYMBOLS:
                    try:
                        ticker = tickers.tickers[symbol]
                        # fast_info is a dictionary-like object with fast access to current prices
                        current_price = ticker.fast_info.get("lastPrice", 0.0)
                        previous_close = ticker.fast_info.get("previousClose", 0.0)
                        change_pct = 0.0
                        if current_price and previous_close:
                            change_pct = ((current_price - previous_close) / previous_close) * 100
                            
                        if current_price > 0:
                            await manager.broadcast({
                                "type": "PRICE_UPDATE",
                                "symbol": symbol,
                                "price": round(current_price, 2),
                                "change_pct": round(change_pct, 2)
                            })
                    except Exception as loop_e:
                        logger.debug(f"Error polling price for {symbol}: {loop_e}")
                
                # Poll every 10 seconds to respect rate limits while maintaining "live" feel
                await asyncio.sleep(10)
                
        except Exception as e:
            logger.error(f"Error in yfinance price stream: {e}")

    @staticmethod
    async def get_fundamentals(symbol: str) -> Dict[str, Any]:
        """Fetch rich fundamental data using yfinance."""
        import requests
        session = requests.Session()
        session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})
        try:
            t = yf.Ticker(symbol.upper(), session=session)
            
            # Helper to convert pandas DataFrames to dict, or return as is if already a dict/list
            def to_serializable(obj):
                if hasattr(obj, 'to_dict'):
                    return obj.to_dict(orient='records') if hasattr(obj, 'columns') else obj.to_dict()
                return obj

            return {
                "info": dict(t.fast_info) if hasattr(t, 'fast_info') else {},
                "analyst_targets": to_serializable(t.analyst_price_targets) if hasattr(t, 'analyst_price_targets') else {},
                "recommendations": to_serializable(t.recommendations_summary) if hasattr(t, 'recommendations_summary') else [],
                "earnings_date": to_serializable(t.calendar) if hasattr(t, 'calendar') else {},
                "upgrades_downgrades": to_serializable(t.upgrades_downgrades) if hasattr(t, 'upgrades_downgrades') else [],
                "income_stmt": to_serializable(t.quarterly_income_stmt) if hasattr(t, 'quarterly_income_stmt') else {},
                "insider_transactions": to_serializable(t.insider_transactions) if hasattr(t, 'insider_transactions') else [],
                "institutional_holders": to_serializable(t.institutional_holders) if hasattr(t, 'institutional_holders') else []
            }
        except Exception as e:
            logger.error(f"Error fetching fundamentals for {symbol}: {e}")
            return {"error": str(e)}

    @staticmethod
    async def screen_stocks(min_score: int = 7) -> Any:
        """Screener using yfinance native filters."""
        try:
            # Note: yf.screen and EquityQuery are not in standard yfinance versions.
            # Using standard yfinance, we can't do server-side screening. 
            # We will return an error instructing that this requires specialized libraries.
            if hasattr(yf, 'screen') and hasattr(yf, 'EquityQuery'):
                query = yf.EquityQuery('gt', ['eodprice', 10])
                results = yf.screen(query, sortField='percentchange', sortAsc=False)
                return results
            else:
                return {"error": "yfinance screener not supported in this version."}
        except Exception as e:
            logger.error(f"Error executing stock screener: {e}")
            return {"error": str(e)}

    @staticmethod
    async def get_options(symbol: str) -> Dict[str, Any]:
        """Fetch option chains for the nearest expiration."""
        import requests
        session = requests.Session()
        session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})
        try:
            t = yf.Ticker(symbol.upper(), session=session)
            if not t.options:
                return {"error": "No options data available."}
                
            exp = t.options[0]  # Next expiration date
            chain = t.option_chain(exp)
            
            return {
                "expiration": exp,
                "calls": chain.calls.to_dict(orient='records') if hasattr(chain.calls, "to_dict") else [],
                "puts": chain.puts.to_dict(orient='records') if hasattr(chain.puts, "to_dict") else []
            }
        except Exception as e:
            logger.error(f"Error fetching options for {symbol}: {e}")
            return {"error": str(e)}

yfinance_service = YFinanceService()
