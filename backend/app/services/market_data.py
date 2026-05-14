import finnhub
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
import pandas as pd
import time

import httpx
from app.core.config import settings
from app.services.ai_orchestrator import AIOrchestrator
from app.services.sentiment_service import SentimentService

logger = logging.getLogger(__name__)

FINNHUB_QUOTE_URL = "https://finnhub.io/api/v1/quote"


def _safe_float(val: Any, default: float = 0.0) -> float:
    """Parse float from Finnhub response (may be None or missing)."""
    if val is None:
        return default
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


class MarketDataService:
    """Service for fetching real-time market data and technical indicators."""

    def __init__(self):
        """Initialize market data service."""
        api_key = (settings.FINNHUB_API_KEY or "").strip()
        # Finnhub muestra la clave completa (puede ser 20 o 40 caracteres según el dashboard)
        if not api_key or api_key == "demo":
            logger.warning("FINNHUB_API_KEY not set or is 'demo'. Real-time data will not be available.")
        else:
            logger.info("Finnhub API key loaded (key=%s...)", api_key[:4] if len(api_key) >= 4 else "***")
        self._api_key = api_key or "demo"
        self.finnhub_client = finnhub.Client(api_key=self._api_key)
        self.ai_orchestrator = AIOrchestrator()
        self.sentiment_service = SentimentService()

    async def _fetch_quote_http(self, symbol: str) -> Dict:
        """Fetch quote via Finnhub REST API (async, for debugging and reliability)."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(
                FINNHUB_QUOTE_URL,
                params={"symbol": symbol.upper(), "token": self._api_key},
            )
            if r.status_code != 200:
                logger.warning("Finnhub quote HTTP %s for %s: %s", r.status_code, symbol, r.text[:200])
                raise ValueError(f"Finnhub API returned {r.status_code}: {r.text[:100]}")
            data = r.json()
            if not isinstance(data, dict):
                raise ValueError("Invalid Finnhub response")
            return data

    async def get_stock_quote(self, symbol: str) -> Dict:
        """Get real-time stock quote using Finnhub."""
        symbol = symbol.upper()
        try:
            quote = await self._fetch_quote_http(symbol)
            if not quote:
                raise ValueError(f"Empty response for {symbol}")

            # Finnhub: c=current, d=change, dp=percent change, h/l/o/pc; may be None when market closed
            c = _safe_float(quote.get("c"), 0.0)
            pc = _safe_float(quote.get("pc"), c)
            # If current price is 0, use previous close (e.g. pre-market or after hours)
            if c == 0 and pc > 0:
                c = pc
            if c == 0:
                raise ValueError(f"No price data for {symbol} (c=0, pc={pc})")

            return {
                "symbol": symbol,
                "current_price": c,
                "change": _safe_float(quote.get("d"), 0.0),
                "percent_change": _safe_float(quote.get("dp"), 0.0),
                "high": _safe_float(quote.get("h"), c),
                "low": _safe_float(quote.get("l"), c),
                "open": _safe_float(quote.get("o"), c),
                "previous_close": pc,
                "timestamp": int(datetime.now().timestamp()),
            }
        except Exception as e:
            logger.warning("Finnhub quote failed for %s: %s", symbol, e)
            # Fallback to simulated data when API fails (invalid key, rate limit, etc.)
            price_map = {
                "SOXL": 43.12,
                "TSLA": 253.20,
                "NVDA": 492.25,
                "SPY": 4128.32,
                "BTC/USDT": 96500.0,
            }
            price = price_map.get(symbol, 150.0)
            return {
                "symbol": symbol,
                "current_price": price,
                "change": 0.0,
                "percent_change": 0.0,
                "high": price,
                "low": price,
                "open": price,
                "previous_close": price,
                "timestamp": int(datetime.now().timestamp()),
                "is_simulated": True,
                "market_status": "closed",
                "error": str(e),
            }

    async def get_ohlcv(self, symbol: str, timeframe: str = "D", days: int = 30) -> List[Dict]:
        """Get historical OHLCV data using yfinance."""
        symbol = symbol.upper()
        # Robust integer parsing for 'days'
        try:
            days_str = str(days).split(':')[0]
            days_int = int(days_str)
        except (ValueError, IndexError, TypeError):
            days_int = 30

        try:
            import requests
            session = requests.Session()
            session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            })
            
            import yfinance as yf
            ticker = yf.Ticker(symbol, session=session)
            # Use explicit dates to avoid period issues
            end_dt = datetime.now()
            start_dt = end_dt - timedelta(days=days_int)
            
            # Map timeframe to yfinance intervals
            interval = "1d" if timeframe == "D" else "1h" if timeframe == "60" else "1d"
            df = ticker.history(start=start_dt.strftime('%Y-%m-%d'), end=end_dt.strftime('%Y-%m-%d'), interval=interval)
            
            logger.info(f"yfinance result for {symbol}: {len(df)} rows")
            
            if df.empty:
                # 2. Fallback to Finnhub
                try:
                    logger.info(f"yfinance failed for {symbol}, trying Finnhub fallback...")
                    import time
                    res = self.finnhub_client.stock_candles(
                        symbol, 
                        resolution='D' if timeframe == 'D' else '60', 
                        _from=int(start_dt.timestamp()), 
                        to=int(end_dt.timestamp())
                    )
                    if res.get('s') == 'ok':
                        candles = [
                            {
                                "time": datetime.fromtimestamp(t).strftime('%Y-%m-%d'),
                                "open": float(o),
                                "high": float(h),
                                "low": float(l),
                                "close": float(c),
                                "volume": int(v)
                            }
                            for t, o, h, l, c, v in zip(res['t'], res['o'], res['h'], res['l'], res['c'], res['v'])
                        ]
                        logger.info(f"Finnhub fallback success for {symbol}: {len(candles)} candles")
                        return candles
                except Exception as fe:
                    logger.warning(f"Finnhub fallback failed for {symbol}: {fe}")

                # 3. Ultimate Fallback: Synthetic Data
                logger.warning(f"All APIs failed for {symbol}. Generating synthetic data...")
                import random
                quote = await self.get_stock_quote(symbol)
                base_price = quote.get('current_price', 150.0)
                
                synthetic_candles = []
                for i in range(days_int):
                    dt = datetime.now() - timedelta(days=days_int-i)
                    change = base_price * random.uniform(-0.02, 0.02)
                    open_p = base_price
                    close_p = base_price + change
                    high_p = max(open_p, close_p) + (random.random() * base_price * 0.01)
                    low_p = min(open_p, close_p) - (random.random() * base_price * 0.01)
                    
                    synthetic_candles.append({
                        "time": dt.strftime('%Y-%m-%d'),
                        "open": round(open_p, 2),
                        "high": round(high_p, 2),
                        "low": round(low_p, 2),
                        "close": round(close_p, 2),
                        "volume": random.randint(1000000, 5000000)
                    })
                    base_price = close_p
                return synthetic_candles
            
            candles = [
                {
                    "time": t.strftime('%Y-%m-%d %H:%M:%S') if timeframe != "D" else t.strftime('%Y-%m-%d'),
                    "open": float(row['Open']),
                    "high": float(row['High']),
                    "low": float(row['Low']),
                    "close": float(row['Close']),
                    "volume": int(row['Volume'])
                }
                for t, row in df.iterrows()
            ]
            return candles
        except Exception as e:
            logger.error(f"Error in get_ohlcv for {symbol}: {e}")
            return []

    async def get_stock_news(self, symbol: str) -> List[Dict]:
        """Fetch latest news for a symbol using Finnhub."""
        try:
            # Finnhub requires date range for news
            end_date = datetime.now().strftime('%Y-%m-%d')
            start_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
            
            # Using synchronous client as finnhub-python is not async
            news = self.finnhub_client.company_news(symbol.upper(), _from=start_date, to=end_date)
            return news[:10]
        except Exception as e:
            logger.warning(f"Error fetching news for {symbol}: {e}")
            return []

    def _calculate_support_resistance(self, df: pd.DataFrame, period: int = 30) -> Dict:
        """Calculate support and resistance levels from historical data."""
        try:
            # Use last N days of data
            recent_df = df.tail(period) if len(df) >= period else df
            
            # Find local minima (support) and maxima (resistance)
            highs = recent_df['High'].values
            lows = recent_df['Low'].values
            closes = recent_df['Close'].values
            
            # Simple support/resistance: min low and max high of period
            support_level = float(lows.min())
            resistance_level = float(highs.max())
            current_price = float(closes[-1])
            
            # Calculate distance to levels
            support_distance = ((current_price - support_level) / support_level) * 100
            resistance_distance = ((resistance_level - current_price) / current_price) * 100
            
            # Determine if price is near support (bullish) or resistance (bearish)
            near_support = support_distance < 5.0  # Within 5% of support
            near_resistance = resistance_distance < 5.0  # Within 5% of resistance
            
            return {
                "support_level": round(support_level, 2),
                "resistance_level": round(resistance_level, 2),
                "current_price": round(current_price, 2),
                "support_distance_pct": round(support_distance, 2),
                "resistance_distance_pct": round(resistance_distance, 2),
                "near_support": near_support,
                "near_resistance": near_resistance,
                "signal": "bullish" if near_support else "bearish" if near_resistance else "neutral"
            }
        except Exception as e:
            logger.warning(f"Error calculating support/resistance: {e}")
            return {
                "support_level": 0.0,
                "resistance_level": 0.0,
                "current_price": 0.0,
                "support_distance_pct": 0.0,
                "resistance_distance_pct": 0.0,
                "near_support": False,
                "near_resistance": False,
                "signal": "neutral"
            }
    
    def _detect_divergence(self, df: pd.DataFrame, rsi: float, macd_hist: float) -> Dict:
        """Detect divergence between price and indicators."""
        try:
            if len(df) < 20:
                return {"detected": False, "type": None, "strength": 0}
            
            # Get recent price trend (last 10 vs previous 10)
            recent_prices = df['Close'].tail(10).values
            previous_prices = df['Close'].tail(20).head(10).values
            
            price_trend_up = recent_prices[-1] > recent_prices[0]
            price_trend_down = recent_prices[-1] < recent_prices[0]
            
            # Calculate RSI for recent periods
            recent_rsi = self._calculate_rsi(df['Close'].tail(20), period=14)
            previous_rsi = self._calculate_rsi(df['Close'].tail(30).head(20), period=14)
            
            # Calculate MACD histogram trend
            macd_line, signal_line, macd_hist_series = self._calculate_macd(df['Close'].tail(30))
            recent_macd_hist = macd_hist_series.tail(10).values
            previous_macd_hist = macd_hist_series.tail(20).head(10).values
            
            macd_trend_up = recent_macd_hist[-1] > recent_macd_hist[0]
            macd_trend_down = recent_macd_hist[-1] < recent_macd_hist[0]
            
            # Detect bullish divergence: price down, RSI/MACD up
            bullish_divergence = False
            if price_trend_down and (recent_rsi > previous_rsi or macd_trend_up):
                bullish_divergence = True
            
            # Detect bearish divergence: price up, RSI/MACD down
            bearish_divergence = False
            if price_trend_up and (recent_rsi < previous_rsi or macd_trend_down):
                bearish_divergence = True
            
            if bullish_divergence:
                return {"detected": True, "type": "bullish", "strength": 75}
            elif bearish_divergence:
                return {"detected": True, "type": "bearish", "strength": 75}
            else:
                return {"detected": False, "type": None, "strength": 0}
        except Exception as e:
            logger.warning(f"Error detecting divergence: {e}")
            return {"detected": False, "type": None, "strength": 0}
    
    def _calculate_fibonacci_levels(self, df: pd.DataFrame) -> Dict:
        """Calculate Fibonacci retracement levels."""
        try:
            # Use last 60 days to find high/low
            period_df = df.tail(60)
            high = float(period_df['High'].max())
            low = float(period_df['Low'].min())
            diff = high - low
            current_price = float(df['Close'].iloc[-1])
            
            levels = {
                "0.0": high,
                "23.6": high - 0.236 * diff,
                "38.2": high - 0.382 * diff,
                "50.0": high - 0.5 * diff,
                "61.8": high - 0.618 * diff,
                "100.0": low
            }
            
            # Find nearest level
            nearest_level = "0.0"
            min_diff = float('inf')
            for lvl, val in levels.items():
                d = abs(current_price - val)
                if d < min_diff:
                    min_diff = d
                    nearest_level = lvl
            
            return {
                "levels": {k: round(v, 2) for k, v in levels.items()},
                "current_level": nearest_level,
                "price_to_level_pct": round((min_diff / current_price) * 100, 2)
            }
        except Exception as e:
            logger.warning(f"Error calculating Fibonacci: {e}")
            return {"levels": {}, "current_level": None, "price_to_level_pct": 0}

    async def get_technical_indicators(self, symbol: str) -> Dict:
        """Get technical indicators for a symbol."""
        symbol = symbol.upper()
        try:
            # Get historical data (1 year)
            end_date = int(time.time())
            start_date = end_date - (365 * 24 * 60 * 60)
            
            # For simplicity, we'll fetch from Yahoo Finance via yfinance
            # but in production we'd use TimescaleDB or Finnhub Candles
            # Setup a custom session to avoid Yahoo Finance blocks
            import requests
            session = requests.Session()
            session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            })
            
            import yfinance as yf
            ticker = yf.Ticker(symbol, session=session)
            df = ticker.history(period="1y")
            
            if df.empty:
                raise ValueError(f"No historical data for {symbol}")
            
            # Calculate RSI
            rsi = self._calculate_rsi(df['Close'])
            
            # Calculate MACD
            macd_line, signal_line, macd_hist = self._calculate_macd(df['Close'])
            
            # Moving Averages
            sma20 = float(df['Close'].rolling(window=20).mean().iloc[-1])
            sma50 = float(df['Close'].rolling(window=50).mean().iloc[-1])
            sma200 = float(df['Close'].rolling(window=200).mean().iloc[-1])
            
            # Volume Analysis
            avg_volume = float(df['Volume'].tail(20).mean())
            current_volume = float(df['Volume'].iloc[-1])
            volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1.0
            
            # Support/Resistance
            sr = self._calculate_support_resistance(df)
            
            # Divergence
            divergence = self._detect_divergence(df, rsi, macd_hist)
            
            # Fibonacci
            fib = self._calculate_fibonacci_levels(df)
            
            # Chart Data (last 30 days)
            chart_df = df.tail(30)
            chart_data = [{"time": t.strftime('%Y-%m-%d'), "value": float(v)} for t, v in zip(chart_df.index, chart_df['Close'])]
            
            # Candlestick Data
            candles = [
                {
                    "time": t.strftime('%Y-%m-%d'),
                    "open": float(o),
                    "high": float(h),
                    "low": float(l),
                    "close": float(c)
                }
                for t, o, h, l, c in zip(chart_df.index, chart_df['Open'], chart_df['High'], chart_df['Low'], chart_df['Close'])
            ]
            
            return {
                "symbol": symbol,
                "rsi": round(float(rsi), 2),
                "macd": {
                    "line": round(float(macd_line), 2),
                    "signal": round(float(signal_line), 2),
                    "histogram": round(float(macd_hist), 2)
                },
                "moving_averages": {
                    "sma20": round(sma20, 2),
                    "sma50": round(sma50, 2),
                    "sma200": round(sma200, 2)
                },
                "volume": {
                    "current": int(current_volume),
                    "average": int(avg_volume),
                    "ratio": round(volume_ratio, 2)
                },
                "support_resistance": sr,
                "divergence": divergence,
                "fibonacci": fib,
                "chart_data": chart_data,
                "candles": candles
            }
        except Exception as e:
            logger.error(f"Error fetching indicators for {symbol}: {e}")
            return {
                "symbol": symbol,
                "rsi": 50.0,
                "macd": {"line": 0, "signal": 0, "histogram": 0},
                "moving_averages": {"sma20": 0, "sma50": 0, "sma200": 0},
                "volume": {"current": 0, "average": 0, "ratio": 1.0},
                "support_resistance": {"support_level": 0, "resistance_level": 0, "signal": "neutral"},
                "divergence": {"detected": False},
                "fibonacci": {"current_level": None},
                "chart_data": [],
                "candles": []
            }

    async def get_vix(self) -> Dict:
        """Get VIX data (market volatility index)."""
        try:
            import yfinance as yf
            vix = yf.Ticker("^VIX").history(period="1d")
            if not vix.empty:
                val = float(vix['Close'].iloc[-1])
                status = "low" if val < 20 else "high" if val > 30 else "moderate"
                risk_level = "low" if val < 15 else "high" if val > 25 else "moderate"
                return {"value": round(val, 2), "status": status, "risk_level": risk_level}
            return {"value": 14.08, "status": "low", "risk_level": "moderate"}
        except Exception:
            return {"value": 14.08, "status": "low", "risk_level": "moderate"}
    
    async def get_complete_analysis(self, symbol: str) -> Dict:
        """Get complete stock analysis with all indicators."""
        try:
            # Get quote
            quote = await self.get_stock_quote(symbol)
            
            # Get technical indicators
            indicators = await self.get_technical_indicators(symbol)
            
            # Get VIX
            vix = await self.get_vix()
            
            # Get News
            news = await self.get_stock_news(symbol)
            
            # Get Sentiment (Fase 1)
            sentiment = await self.sentiment_service.get_symbol_sentiment(symbol)
            
            # Calculate recommendation
            recommendation = self._calculate_recommendation(indicators, vix, sentiment)
            
            # Get AI Insights (Skill-Based Architecture)
            ai_insights = await self.ai_orchestrator.analyze_with_skills(
                symbol=symbol
            )
            
            return {
                "symbol": symbol.upper(),
                "quote": quote,
                "indicators": indicators,
                "vix": vix,
                "news": news,
                "recommendation": recommendation,
                "ai_insights": ai_insights,
                "sentiment": sentiment,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            raise Exception(f"Error in complete analysis for {symbol}: {str(e)}")
    
    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> float:
        """Calculate RSI (Relative Strength Index)."""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi.iloc[-1] if not pd.isna(rsi.iloc[-1]) else 50.0
    
    def _calculate_macd(self, prices: pd.Series, fast=12, slow=26, signal=9):
        """Calculate MACD (Moving Average Convergence Divergence)."""
        exp1 = prices.ewm(span=fast, adjust=False).mean()
        exp2 = prices.ewm(span=slow, adjust=False).mean()
        macd_line = exp1 - exp2
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        macd_histogram = macd_line - signal_line
        
        return (
            macd_line.iloc[-1] if not pd.isna(macd_line.iloc[-1]) else 0,
            signal_line.iloc[-1] if not pd.isna(signal_line.iloc[-1]) else 0,
            macd_histogram.iloc[-1] if not pd.isna(macd_histogram.iloc[-1]) else 0
        )
    
    def _calculate_recommendation(self, indicators: Dict, vix: Dict, sentiment: Dict = None) -> Dict:
        """Calculate buy/sell recommendation based on indicators and AI sentiment."""
        score = 0
        signals = []
        breakdown = []
        
        # RSI Analysis (weight: 25% of 100)
        rsi = indicators.get('rsi', 50)
        rsi_contribution = 0
        if rsi < 30:
            rsi_contribution = 25
            signals.append("RSI en zona de sobreventa (Bullish)")
        elif rsi < 40:
            rsi_contribution = 15
        elif rsi > 70:
            rsi_contribution = -25
            signals.append("RSI en zona de sobrecompra (Bearish)")
        elif rsi > 60:
            rsi_contribution = -15
        breakdown.append({"label": "RSI", "value": rsi, "contribution": rsi_contribution, "weight": 25})
        
        # MACD Analysis (weight: 20% of 100)
        macd = indicators.get('macd', {})
        hist = macd.get('histogram', 0)
        macd_contribution = 0
        if hist > 0:
            macd_contribution = 20
            signals.append("MACD Histograma positivo (Momentum)")
        elif hist < 0:
            macd_contribution = -20
            signals.append("MACD Histograma negativo (Weakness)")
        breakdown.append({"label": "MACD", "value": hist, "contribution": macd_contribution, "weight": 20})
        
        # Sentiment Analysis (Fase 1 - weight: 30%)
        sentiment_contribution = 0
        if sentiment:
            s_score = sentiment.get('sentiment_score', 0.0)
            sentiment_contribution = int(s_score * 30)
            if sentiment.get('signal') == 'BULLISH':
                signals.append("Sentimiento de noticias Bullish")
            elif sentiment.get('signal') == 'BEARISH':
                signals.append("Sentimiento de noticias Bearish")
        breakdown.append({
            "label": "Sentimiento IA", 
            "value": sentiment.get('sentiment_score', 0) if sentiment else 0, 
            "contribution": sentiment_contribution, 
            "weight": 30
        })

        # Normalize score to 0-100
        normalized_score = 50 + rsi_contribution + macd_contribution + sentiment_contribution
        normalized_score = max(0, min(100, normalized_score))
        
        # VIX Risk Adjustment
        vix_value = vix.get('value', 20)
        if vix_value > 30:
            normalized_score = 50
            action = "MANTENER"
            color = "yellow"
            signals.append("Mercado volátil - Mantener posición")
        elif normalized_score >= 70:
            action = "COMPRA FUERTE"
            color = "green"
        elif normalized_score >= 55:
            action = "COMPRA"
            color = "lightgreen"
        elif normalized_score <= 30:
            action = "VENTA FUERTE"
            color = "red"
        elif normalized_score <= 45:
            action = "VENTA"
            color = "orange"
        else:
            action = "MANTENER"
            color = "yellow"
        
        return {
            "action": action,
            "normalized_score": normalized_score,
            "color": color,
            "signals": signals,
            "breakdown": breakdown
        }
