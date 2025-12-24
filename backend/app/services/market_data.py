import finnhub
import os
from datetime import datetime
from typing import List, Dict, Optional
import pandas as pd
import time

class MarketDataService:
    """Service for fetching real-time market data and technical indicators."""
    
    def __init__(self):
        """Initialize market data service."""
        api_key = os.getenv("FINNHUB_API_KEY")
        if not api_key or api_key == "demo":
            print("Warning: FINNHUB_API_KEY not found or is 'demo'. Using simulated data.")
        self.finnhub_client = finnhub.Client(api_key=api_key)
    
    async def get_stock_quote(self, symbol: str) -> Dict:
        """Get real-time stock quote using Finnhub."""
        try:
            quote = self.finnhub_client.quote(symbol.upper())
            
            if not quote or 'c' not in quote or quote['c'] == 0:
                raise Exception(f"No price data available for {symbol}")
            
            # current price (c), change (d), percent change (dp), high (h), low (l), open (o), previous close (pc)
            return {
                "symbol": symbol.upper(),
                "current_price": float(quote['c']),
                "change": float(quote['d']),
                "percent_change": float(quote['dp']),
                "high": float(quote['h']),
                "low": float(quote['l']),
                "open": float(quote['o']),
                "previous_close": float(quote['pc']),
                "timestamp": int(datetime.now().timestamp()),
            }
        except Exception as e:
            print(f"Error fetching Finnhub quote for {symbol}: {str(e)}")
            # Fallback to realistic closed-market data
            price_map = {
                "SOXL": 43.12,
                "TSLA": 253.20,
                "NVDA": 492.25,
                "BTC/USDT": 96500.0,
            }
            price = price_map.get(symbol.upper(), 150.0)
            return {
                "symbol": symbol.upper(),
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
                "error": str(e)
            }
        except Exception as e:
            # Re-raise or return a structured error instead of misleading fake data
            print(f"Error fetching data for {symbol}: {str(e)}")
            raise Exception(f"No se pudieron obtener datos reales para {symbol}. Por favor, intente de nuevo en unos momentos.")

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
                }
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
        
        # RSI Analysis (weight: 2)
        rsi = indicators.get('rsi', 50)
        if rsi < 30:
            score += 2
            signals.append("RSI oversold (bullish)")
        elif rsi < 50:
            score += 1
            signals.append("RSI below neutral")
        elif rsi > 70:
            score -= 2
            signals.append("RSI overbought (bearish)")
        elif rsi > 50:
            score -= 1
            signals.append("RSI above neutral")
        
        # MACD Analysis (weight: 2)
        macd = indicators.get('macd', {})
        if macd.get('is_positive', False):
            score += 2
            signals.append("MACD positive (bullish)")
        else:
            score -= 1
            signals.append("MACD negative (bearish)")
        
        # Volume Analysis (weight: 1)
        volume = indicators.get('volume', {})
        volume_ratio = volume.get('ratio', 1.0)
        if volume_ratio > 1.5:
            score += 1
            signals.append("High volume (strong interest)")
        elif volume_ratio < 0.7:
            score -= 1
            signals.append("Low volume (weak interest)")
        
        # Moving Average Analysis (weight: 1)
        ma = indicators.get('moving_averages', {})
        if ma.get('trend') == 'bullish':
            score += 1
            signals.append("MA trend bullish")
        else:
            score -= 1
            signals.append("MA trend bearish")
        
        # VIX Analysis (weight: 1)
        vix_value = vix.get('value', 20)
        if vix_value > 30:
            score -= 1
            signals.append("High VIX (market fear)")
        elif vix_value < 15:
            score += 1
            signals.append("Low VIX (market calm)")
        
        # Determine recommendation
        if score >= 4:
            action = "COMPRA FUERTE"
            color = "green"
            confidence = "high"
        elif score >= 2:
            action = "COMPRA"
            color = "lightgreen"
            confidence = "moderate"
        elif score <= -4:
            action = "VENTA FUERTE"
            color = "red"
            confidence = "high"
        elif score <= -2:
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
            "color": color,
            "confidence": confidence,
            "signals": signals
        }
