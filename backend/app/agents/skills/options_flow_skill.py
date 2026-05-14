import yfinance as yf
from app.agents.skills.base import AgentSkill, SkillResult

class OptionsFlowSkill(AgentSkill):
    @property
    def name(self) -> str:
        return "Flujo de Opciones"

    @property
    def default_weight(self) -> float:
        return 0.20

    async def analyze(self, symbol: str) -> SkillResult:
        try:
            # En producción se debería usar un session con User-Agent
            import requests
            session = requests.Session()
            session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
            })
            
            t = yf.Ticker(symbol, session=session)
            expirations = t.options
            
            if not expirations:
                return SkillResult(
                    symbol=symbol,
                    skill_name=self.name,
                    score=0.0,
                    signal='NEUTRAL',
                    confidence=0.0,
                    reasoning="No hay opciones disponibles.",
                    raw_data={}
                )
                
            # Analizar la expiración más cercana
            chain = t.option_chain(expirations[0])
            puts_volume = chain.puts['volume'].sum() if not chain.puts.empty else 0
            calls_volume = chain.calls['volume'].sum() if not chain.calls.empty else 0
            
            if calls_volume == 0:
                put_call_ratio = 2.0 # Arbitrary high number if no calls
            else:
                put_call_ratio = puts_volume / calls_volume
                
            score = 0.0
            if put_call_ratio > 1.2:
                score = -0.8
                signal = 'BEARISH'
                reasoning = f"P/C Ratio Alto ({put_call_ratio:.2f}) indica miedo/cobertura."
            elif put_call_ratio < 0.8:
                score = 0.8
                signal = 'BULLISH'
                reasoning = f"P/C Ratio Bajo ({put_call_ratio:.2f}) indica optimismo."
            else:
                signal = 'NEUTRAL'
                reasoning = f"P/C Ratio Neutral ({put_call_ratio:.2f})."
                
            return SkillResult(
                symbol=symbol,
                skill_name=self.name,
                score=score,
                signal=signal,
                confidence=abs(score),
                reasoning=reasoning,
                raw_data={
                    "puts_volume": float(puts_volume),
                    "calls_volume": float(calls_volume),
                    "put_call_ratio": float(put_call_ratio)
                }
            )
            
        except Exception as e:
            return SkillResult(
                symbol=symbol,
                skill_name=self.name,
                score=0.0,
                signal='NEUTRAL',
                confidence=0.0,
                reasoning=f"Error analizando opciones: {str(e)}",
                raw_data={"error": str(e)}
            )
