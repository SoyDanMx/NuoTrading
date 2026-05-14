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
        try:
            sentiment_data = await self.sentiment_service.get_symbol_sentiment(symbol)
            
            # Assuming sentiment_score is between 0.0 and 1.0, map to -1.0 to 1.0
            # If it's already -1.0 to 1.0, we just use it.
            raw_score = sentiment_data.get("sentiment_score", 0.0)
            if raw_score >= 0 and raw_score <= 1.0:
                # scale 0 to 1 -> -1 to 1
                score = (raw_score * 2) - 1.0
            else:
                score = max(-1.0, min(1.0, raw_score))
                
            signal_str = sentiment_data.get("signal", "NEUTRAL").upper()
            if signal_str not in ['BULLISH', 'BEARISH', 'NEUTRAL']:
                signal_str = 'NEUTRAL'
                
            reasoning = f"Basado en {sentiment_data.get('news_analyzed', 0)} noticias."
            confidence = abs(score)
            
            return SkillResult(
                symbol=symbol,
                skill_name=self.name,
                score=score,
                signal=signal_str, # type: ignore
                confidence=confidence,
                reasoning=reasoning,
                raw_data=sentiment_data
            )
            
        except Exception as e:
            return SkillResult(
                symbol=symbol,
                skill_name=self.name,
                score=0.0,
                signal='NEUTRAL',
                confidence=0.0,
                reasoning=f"Error: {str(e)}",
                raw_data={"error": str(e)}
            )
