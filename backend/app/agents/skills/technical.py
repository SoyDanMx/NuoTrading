from typing import Dict, Any
from app.agents.skills.base import AgentSkill, SkillResult
class TechnicalSkill(AgentSkill):
    def __init__(self):
        pass

    @property
    def name(self) -> str:
        return "Análisis Técnico"

    @property
    def weight(self) -> float:
        return 0.30

    async def analyze(self, symbol: str) -> SkillResult:
        """
        Analyze technical indicators (RSI, MACD, etc) and return a score.
        Score: 0-100 (0 = Strong Sell, 100 = Strong Buy)
        """
        try:
            from app.services.market_data import MarketDataService
            market_data = MarketDataService()
            indicators = await market_data.get_technical_indicators(symbol)
            
            # Simple scoring logic based on RSI and MACD
            score = 50.0
            reasons = []
            
            # RSI Logic
            rsi = indicators.get("rsi", 50.0)
            if rsi < 30:
                score += 25
                reasons.append("RSI en zona de sobreventa (Bullish)")
            elif rsi > 70:
                score -= 25
                reasons.append("RSI en zona de sobrecompra (Bearish)")
                
            # MACD Logic
            macd = indicators.get("macd", {})
            hist = macd.get("histogram", 0.0)
            if hist > 0:
                score += 15
                reasons.append("MACD Histograma positivo (Momentum Alcista)")
            elif hist < 0:
                score -= 15
                reasons.append("MACD Histograma negativo (Momentum Bajista)")
                
            # Ensure score is within 0-100
            score = max(0.0, min(100.0, score))
            
            # Determine Signal
            if score >= 65:
                signal = 'BULLISH'
            elif score <= 35:
                signal = 'BEARISH'
            else:
                signal = 'NEUTRAL'
                
            reasoning = " | ".join(reasons) if reasons else "Indicadores técnicos neutrales."
            
            return SkillResult(
                score=score,
                signal=signal,
                reasoning=reasoning,
                metadata={"indicators": indicators}
            )
            
        except Exception as e:
            return SkillResult(
                score=50.0,
                signal='NEUTRAL',
                reasoning=f"Error en análisis técnico: {str(e)}",
                metadata={"error": str(e)}
            )
