import logging
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any
import finnhub
from anthropic import AsyncAnthropic
from app.core.config import settings
import sqlalchemy
from sqlalchemy import text

logger = logging.getLogger(__name__)

class SentimentService:
    """Service for news sentiment analysis using Claude."""

    def __init__(self):
        self.anthropic = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.finnhub_client = finnhub.Client(api_key=settings.FINNHUB_API_KEY)
        self.db_engine = sqlalchemy.create_engine(settings.DATABASE_URL)

    async def get_symbol_sentiment(self, symbol: str) -> Dict[str, Any]:
        """Fetch news and analyze sentiment for a symbol."""
        symbol = symbol.upper()
        try:
            # 1. Fetch News (Using logic: news[:10])
            end_date = datetime.now().strftime('%Y-%m-%d')
            start_date = (datetime.now() - timedelta(days=15)).strftime('%Y-%m-%d')
            news = self.finnhub_client.company_news(symbol, _from=start_date, to=end_date)
            news = news[:10] if news else []

            if not news:
                return self._default_result(symbol)

            # 2. Prepare Prompt (Exact logic requested)
            noticias_text = "\n".join([f"- {n.get('headline','')}" for n in news[:10]])
            prompt = f"""Analiza el sentimiento de estas noticias para {symbol} y devuelve un veredicto consolidado.
NOTICIAS:
{noticias_text}

Debes responder ÚNICAMENTE con un objeto JSON:
{{
  "score": float (entre -1.0 y 1.0),
  "signal": "BULLISH" | "BEARISH" | "NEUTRAL"
}}
"""

            # 3. Call Claude (Using the verified Haiku 4.5 model)
            response = await self.anthropic.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=100,
                messages=[{"role": "user", "content": prompt}]
            )
            raw = response.content[0].text
            
            # Extract JSON if preamble exists
            if "{" in raw:
                raw = raw[raw.find("{"):raw.rfind("}")+1]
            
            result = json.loads(raw)
            score = float(result.get("score", 0.0))
            signal = result.get("signal", "NEUTRAL")

            # 4. Save to DB (Exact INSERT requested)
            # Table: trading.sentiment_scores (renamed to match)
            self._save_to_db(symbol, score, signal, len(news))

            return {
                "symbol": symbol,
                "sentiment_score": score,
                "signal": signal,
                "news_analyzed": len(news),
                "updated_at": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error in sentiment analysis for {symbol}: {e}")
            return self._default_result(symbol)

    def _save_to_db(self, symbol: str, score: float, signal: str, news_count: int):
        """Persist sentiment score to database using requested logic."""
        try:
            with self.db_engine.connect() as conn:
                query = text("""
                    INSERT INTO trading.sentiment_scores 
                    (symbol, score, signal, news_count, created_at) 
                    VALUES (:symbol, :score, :signal, :news_count, NOW())
                """)
                conn.execute(query, {
                    "symbol": symbol,
                    "score": score,
                    "signal": signal,
                    "news_count": news_count
                })
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to save sentiment to DB: {e}")

    def _default_result(self, symbol: str) -> Dict[str, Any]:
        """Fallback result on error (Exact logic requested)."""
        return {
            "symbol": symbol,
            "sentiment_score": 0.0,
            "signal": "NEUTRAL",
            "news_analyzed": 0,
            "updated_at": datetime.now().isoformat()
        }
