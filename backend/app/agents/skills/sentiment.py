from typing import Dict, Any
from app.agents.skills.base import AgentSkill, SkillResult
from app.services.sentiment_service import SentimentService

class SentimentSkill(AgentSkill):
    def __init__(self):
        self.sentiment_service = SentimentService()

    @property
    def name(self) -> str:
        return "Sentimiento Social"

    @property
    def weight(self) -> float:
        return 0.25

    async def analyze(self, symbol: str) -> SkillResult:
        """
        Analyze news sentiment and return a score.
        Score: 0-100 (0 = Extreme Fear/Bearish, 100 = Extreme Greed/Bullish)
        """
        try:
            sentiment_data = await self.sentiment_service.get_symbol_sentiment(symbol)
            
            # sentiment_score from SentimentService is -1.0 to 1.0 (or 0.0 to 1.0)
            # Assuming it's typically between 0.0 and 1.0 based on current implementation
            # We'll normalize it to 0-100
            raw_score = sentiment_data.get("sentiment_score", 0.5)
            
            # Map 0.0-1.0 to 0-100
            score = raw_score * 100.0
            score = max(0.0, min(100.0, score))
            
            signal_str = sentiment_data.get("signal", "NEUTRAL").upper()
            if signal_str not in ['BULLISH', 'BEARISH', 'NEUTRAL']:
                signal_str = 'NEUTRAL'
                
            reasoning = f"Basado en {sentiment_data.get('news_analyzed', 0)} noticias recientes."
            
            return SkillResult(
                score=score,
                signal=signal_str,  # type: ignore
                reasoning=reasoning,
                metadata={"raw_data": sentiment_data}
            )
            
        except Exception as e:
            return SkillResult(
                score=50.0,
                signal='NEUTRAL',
                reasoning=f"Error en análisis de sentimiento: {str(e)}",
                metadata={"error": str(e)}
            )
