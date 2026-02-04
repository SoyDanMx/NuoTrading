import finnhub
import logging
from datetime import datetime
from typing import List, Dict, Optional, Any
import pandas as pd
import time

import httpx
from app.core.config import settings

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
            if len(df) < 30:
                return {"levels": [], "current_level": None}
            
            # Use last 30 days to find swing high and low
            recent_df = df.tail(30)
            swing_high = float(recent_df['High'].max())
            swing_low = float(recent_df['Low'].min())
            current_price = float(df['Close'].iloc[-1])
            
            # Calculate price range
            price_range = swing_high - swing_low
            
            # Standard Fibonacci levels
            fib_levels = {
                "0.0": swing_high,
                "23.6": swing_high - (price_range * 0.236),
                "38.2": swing_high - (price_range * 0.382),
                "50.0": swing_high - (price_range * 0.5),
                "61.8": swing_high - (price_range * 0.618),
                "78.6": swing_high - (price_range * 0.786),
                "100.0": swing_low
            }
            
            # Determine which level current price is near
            current_level = None
            min_distance = float('inf')
            for level_name, level_price in fib_levels.items():
                distance = abs(current_price - level_price) / level_price * 100
                if distance < min_distance and distance < 3.0:  # Within 3%
                    min_distance = distance
                    current_level = level_name
            
            return {
                "levels": {k: round(v, 2) for k, v in fib_levels.items()},
                "swing_high": round(swing_high, 2),
                "swing_low": round(swing_low, 2),
                "current_price": round(current_price, 2),
                "current_level": current_level,
                "trend": "up" if current_price > swing_high - (price_range * 0.5) else "down"
            }
        except Exception as e:
            logger.warning(f"Error calculating Fibonacci levels: {e}")
            return {"levels": {}, "current_level": None}

    async def get_technical_indicators(self, symbol: str) -> Dict:
        """Calculate technical indicators using Finnhub candles."""
        try:
            # Get candles for the last 6 months
            end = int(time.time())
            start = end - (180 * 24 * 60 * 60) # 180 days
            
            res = self.finnhub_client.stock_candles(symbol.upper(), 'D', start, end)
            
            if res['s'] != 'ok':
                raise Exception(f"Insufficient historical data for {symbol} from Finnhub")
            
            # Create DataFrame
            df = pd.DataFrame({
                'Close': res['c'],
                'High': res['h'],
                'Low': res['l'],
                'Open': res['o'],
                'Volume': res['v'],
                'Timestamp': res['t']
            })
            
            if len(df) < 20:
                raise Exception(f"Insufficient candles for {symbol}")
            
            # Calculate RSI (14-day)
            rsi = self._calculate_rsi(df['Close'], period=14)
            
            # Calculate MACD
            macd_line, signal_line, macd_histogram = self._calculate_macd(df['Close'])
            
            # Calculate volume ratio
            avg_volume = df['Volume'].tail(20).mean()
            current_volume = df['Volume'].iloc[-1]
            volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1.0
            
            # Get moving averages
            sma_20 = df['Close'].rolling(window=20).mean().iloc[-1]
            sma_50 = df['Close'].rolling(window=50).mean().iloc[-1]
            
            # Calculate new advanced indicators
            support_resistance = self._calculate_support_resistance(df, period=30)
            divergence = self._detect_divergence(df, rsi, macd_histogram)
            fibonacci = self._calculate_fibonacci_levels(df)
            
            return {
                "rsi": round(float(rsi), 2),
                "macd": {
                    "value": round(float(macd_line), 4),
                    "signal": round(float(signal_line), 4),
                    "histogram": round(float(macd_histogram), 4),
                    "is_positive": float(macd_histogram) > 0
                },
                "volume": {
                    "current": int(current_volume),
                    "average": int(avg_volume),
                    "ratio": round(float(volume_ratio), 2)
                },
                "moving_averages": {
                    "sma_20": round(float(sma_20), 2),
                    "sma_50": round(float(sma_50), 2),
                    "trend": "bullish" if sma_20 > sma_50 else "bearish"
                },
                "support_resistance": support_resistance,
                "divergence": divergence,
                "fibonacci": fibonacci
            }
        except Exception as e:
            print(f"Error calculating indicators for {symbol}: {str(e)}")
            return {
                "rsi": 50.0,
                "macd": {"value": 0, "signal": 0, "histogram": 0, "is_positive": False},
                "volume": {"current": 0, "average": 0, "ratio": 1.0},
                "moving_averages": {"sma_20": 0, "sma_50": 0, "trend": "neutral"},
                "is_simulated": True
            }

    async def get_ohlcv(self, symbol: str, resolution: str = 'D', days: int = 30) -> List[Dict]:
        """Get OHLCV (candlestick) data for a symbol."""
        try:
            end = int(time.time())
            start = end - (days * 24 * 60 * 60)
            
            res = self.finnhub_client.stock_candles(symbol.upper(), resolution, start, end)
            
            if res['s'] != 'ok':
                raise Exception(f"Insufficient historical data for {symbol}")
            
            ohlcv = []
            for i in range(len(res['t'])):
                ohlcv.append({
                    "time": res['t'][i],
                    "open": float(res['o'][i]),
                    "high": float(res['h'][i]),
                    "low": float(res['l'][i]),
                    "close": float(res['c'][i]),
                    "volume": int(res['v'][i])
                })
            return ohlcv
        except Exception as e:
            print(f"Error fetching OHLCV for {symbol}: {str(e)}")
            # Fallback/Simulated data
            import random
            base_price = 150.0
            simulated = []
            now = int(time.time())
            for i in range(days):
                t = now - ((days - i) * 24 * 60 * 60)
                o = base_price + random.uniform(-2, 2)
                c = o + random.uniform(-3, 3)
                simulated.append({
                    "time": t,
                    "open": round(o, 2),
                    "high": round(max(o, c) + random.uniform(0, 1), 2),
                    "low": round(min(o, c) - random.uniform(0, 1), 2),
                    "close": round(c, 2),
                    "volume": random.randint(100000, 1000000)
                })
                base_price = c
            return simulated
    
    async def get_vix(self) -> Dict:
        """Get VIX (Volatility Index) data using Finnhub."""
        try:
            # Finnhub VIX symbol is usually ^VIX or similar, depends on provider
            # For free tier, we might need to fallback to something else or use ^VIX if supported
            quote = self.finnhub_client.quote('VIX') 
            if not quote or 'c' not in quote or quote['c'] == 0:
                # Fallback to yfinance for VIX as it's less likely to be blocked than multiple stock tickers
                import yfinance as yf
                vix = yf.Ticker("^VIX")
                hist = vix.history(period="1d")
                current_vix = hist['Close'].iloc[-1] if not hist.empty else 20.0
            else:
                current_vix = quote['c']
            
            # VIX interpretation
            if current_vix < 12:
                status = "very_low"
                risk_level = "low"
            elif current_vix < 20:
                status = "low"
                risk_level = "moderate"
            elif current_vix < 30:
                status = "elevated"
                risk_level = "high"
            else:
                status = "high"
                risk_level = "very_high"
            
            return {
                "value": round(float(current_vix), 2),
                "status": status,
                "risk_level": risk_level
            }
        except Exception as e:
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
            
            # Calculate recommendation
            recommendation = self._calculate_recommendation(indicators, vix)
            
            return {
                "symbol": symbol.upper(),
                "quote": quote,
                "indicators": indicators,
                "vix": vix,
                "recommendation": recommendation,
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
    
    def _calculate_recommendation(self, indicators: Dict, vix: Dict) -> Dict:
        """Calculate buy/sell recommendation based on indicators."""
        score = 0
        signals = []
        breakdown = []  # For beginner mode: detailed contribution per indicator
        
        # RSI Analysis (weight: 25% of 100)
        rsi = indicators.get('rsi', 50)
        rsi_contribution = 0
        if rsi < 30:
            score += 2
            rsi_contribution = 25  # Max contribution for oversold
            signals.append("RSI oversold (bullish)")
        elif rsi < 50:
            score += 1
            rsi_contribution = 12
            signals.append("RSI below neutral")
        elif rsi > 70:
            score -= 2
            rsi_contribution = -25  # Negative for overbought
            signals.append("RSI overbought (bearish)")
        elif rsi > 50:
            score -= 1
            rsi_contribution = -12
            signals.append("RSI above neutral")
        breakdown.append({
            "label": "RSI",
            "value": rsi,
            "contribution": rsi_contribution,
            "weight": 25
        })
        
        # MACD Analysis (weight: 20% of 100)
        macd = indicators.get('macd', {})
        macd_contribution = 0
        if macd.get('is_positive', False):
            score += 2
            macd_contribution = 20
            signals.append("MACD positive (bullish)")
        else:
            score -= 1
            macd_contribution = -10
            signals.append("MACD negative (bearish)")
        breakdown.append({
            "label": "MACD",
            "value": macd.get('histogram', 0),
            "contribution": macd_contribution,
            "weight": 20
        })
        
        # Moving Average Analysis (weight: 30% of 100)
        ma = indicators.get('moving_averages', {})
        ma_contribution = 0
        if ma.get('trend') == 'bullish':
            score += 1
            ma_contribution = 30
            signals.append("MA trend bullish")
        else:
            score -= 1
            ma_contribution = -15
            signals.append("MA trend bearish")
        breakdown.append({
            "label": "Medias Móviles",
            "value": 1 if ma.get('trend') == 'bullish' else -1,
            "contribution": ma_contribution,
            "weight": 30
        })
        
        # Volume Analysis (weight: 15% of 100)
        volume = indicators.get('volume', {})
        volume_ratio = volume.get('ratio', 1.0)
        volume_contribution = 0
        if volume_ratio > 1.5:
            score += 1
            volume_contribution = 15
            signals.append("High volume (strong interest)")
        elif volume_ratio < 0.7:
            score -= 1
            volume_contribution = -7
            signals.append("Low volume (weak interest)")
        breakdown.append({
            "label": "Volumen",
            "value": volume_ratio,
            "contribution": volume_contribution,
            "weight": 15
        })
        
        # VIX Analysis (weight: 10% of 100)
        vix_value = vix.get('value', 20)
        vix_contribution = 0
        if vix_value > 30:
            score -= 1
            vix_contribution = -10  # High VIX = risk
            signals.append("High VIX (market fear)")
        elif vix_value < 15:
            score += 1
            vix_contribution = 10
            signals.append("Low VIX (market calm)")
        breakdown.append({
            "label": "VIX",
            "value": vix_value,
            "contribution": vix_contribution,
            "weight": 10
        })
        
        # Support/Resistance Analysis (weight: 10% of 100)
        sr = indicators.get('support_resistance', {})
        sr_contribution = 0
        if sr.get('near_support', False):
            score += 1
            sr_contribution = 10
            signals.append("Price near support (bullish)")
        elif sr.get('near_resistance', False):
            score -= 1
            sr_contribution = -5
            signals.append("Price near resistance (bearish)")
        breakdown.append({
            "label": "Soporte/Resistencia",
            "value": sr.get('support_distance_pct', 0),
            "contribution": sr_contribution,
            "weight": 10
        })
        
        # Divergence Analysis (weight: 10% of 100)
        divergence = indicators.get('divergence', {})
        div_contribution = 0
        if divergence.get('detected', False):
            div_type = divergence.get('type')
            if div_type == 'bullish':
                score += 1
                div_contribution = 10
                signals.append("Bullish divergence detected")
            elif div_type == 'bearish':
                score -= 1
                div_contribution = -10
                signals.append("Bearish divergence detected")
        breakdown.append({
            "label": "Divergencia",
            "value": divergence.get('strength', 0),
            "contribution": div_contribution,
            "weight": 10
        })
        
        # Fibonacci Analysis (weight: 10% of 100)
        fib = indicators.get('fibonacci', {})
        fib_contribution = 0
        current_level = fib.get('current_level')
        if current_level:
            # Fibonacci levels near key retracements are significant
            if current_level in ['23.6', '38.2', '61.8']:
                score += 1
                fib_contribution = 10
                signals.append(f"Price at Fibonacci {current_level}% level")
            elif current_level == '50.0':
                fib_contribution = 0  # Neutral at 50%
        breakdown.append({
            "label": "Fibonacci",
            "value": float(current_level) if current_level else 0,
            "contribution": fib_contribution,
            "weight": 10
        })
        
        # Normalize score to 0-100
        # Base score: 50 (neutral), add contributions from all indicators
        # Total weights: RSI(25) + MACD(20) + MA(30) + Volume(15) + VIX(10) + SR(10) + Divergence(10) + Fibonacci(10) = 130
        # But we normalize contributions to sum to 100
        normalized_score = 50 + sum(b['contribution'] for b in breakdown)
        normalized_score = max(0, min(100, normalized_score))
        
        # Force MANTENER if VIX > 30 (high risk)
        if vix_value > 30:
            normalized_score = 50
            action = "MANTENER"
            color = "yellow"
            confidence = "low"
            signals.append("Mercado volátil - Mantener posición")
        # Determine recommendation
        elif normalized_score >= 70:
            action = "COMPRA FUERTE"
            color = "green"
            confidence = "high"
        elif normalized_score >= 55:
            action = "COMPRA"
            color = "lightgreen"
            confidence = "moderate"
        elif normalized_score <= 30:
            action = "VENTA FUERTE"
            color = "red"
            confidence = "high"
        elif normalized_score <= 45:
            action = "VENTA"
            color = "orange"
            confidence = "moderate"
        else:
            action = "MANTENER"
            color = "yellow"
            confidence = "low"
        
        return {
            "action": action,
            "score": score,
            "normalized_score": normalized_score,  # 0-100 for beginner mode
            "color": color,
            "confidence": confidence,
            "signals": signals,
            "breakdown": breakdown  # For beginner mode UI
        }
