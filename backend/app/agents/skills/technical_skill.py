from app.agents.skills.base import AgentSkill, SkillResult
from app.services.market_data import MarketDataService

class TechnicalSkill(AgentSkill):
    def __init__(self):
        self.market_data = MarketDataService()

    @property
    def name(self) -> str:
        return "Análisis Técnico"

    @property
    def weight(self) -> float:
        return 0.30

    async def analyze(self, symbol: str) -> SkillResult:
        try:
            indicators = await self.market_data.get_technical_indicators(symbol)
            
            # Map existing logic to -1.0 to 1.0 score
            score = 0.0
            reasons = []
            
            rsi = indicators.get("rsi", 50.0)
            if rsi < 30:
                score += 0.5
                reasons.append(f"RSI Oversold ({rsi})")
            elif rsi > 70:
                score -= 0.5
                reasons.append(f"RSI Overbought ({rsi})")
                
            macd = indicators.get("macd", {})
            hist = macd.get("histogram", 0.0)
            if hist > 0:
                score += 0.5
                reasons.append("MACD Bullish")
            elif hist < 0:
                score -= 0.5
                reasons.append("MACD Bearish")
                
            score = max(-1.0, min(1.0, score))
            
            if score >= 0.5:
                signal = 'BULLISH'
            elif score <= -0.5:
                signal = 'BEARISH'
            else:
                signal = 'NEUTRAL'
                
            reasoning = " | ".join(reasons) if reasons else "Neutral technicals."
            confidence = abs(score) # Confidence 0.0 to 1.0
            
            return SkillResult(
                symbol=symbol,
                skill_name=self.name,
                score=score,
                signal=signal,
                confidence=confidence,
                reasoning=reasoning,
                raw_data={"indicators": indicators}
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
