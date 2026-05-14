import yfinance as yf
from datetime import datetime, timezone
from app.agents.skills.base import AgentSkill, SkillResult

class EarningsSkill(AgentSkill):
    @property
    def name(self) -> str:
        return "Monitor de Earnings"

    @property
    def weight(self) -> float:
        return 0.15

    async def analyze(self, symbol: str) -> SkillResult:
        try:
            import requests
            session = requests.Session()
            session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
            })
            
            t = yf.Ticker(symbol, session=session)
            calendar = t.calendar
            
            if calendar is None or calendar.empty:
                return SkillResult(
                    symbol=symbol,
                    skill_name=self.name,
                    score=0.0,
                    signal='NEUTRAL',
                    confidence=0.0,
                    reasoning="No hay datos de calendario de earnings.",
                    raw_data={}
                )
                
            # Extraer la fecha del próximo earnings
            if 'Earnings Date' in calendar.index:
                dates = calendar.loc['Earnings Date']
                # calendar.loc['Earnings Date'] can be a single date or a list/series
                if isinstance(dates, list) or hasattr(dates, 'values'):
                    earnings_date = dates[0]
                else:
                    earnings_date = dates
                    
                # Calcular días faltantes
                # Some yfinance dates are pandas datetimes with timezone
                if hasattr(earnings_date, 'tz_localize') and earnings_date.tzinfo is None:
                    earnings_date = earnings_date.tz_localize('UTC')
                
                now = datetime.now(timezone.utc)
                if hasattr(earnings_date, 'to_pydatetime'):
                    ed_dt = earnings_date.to_pydatetime()
                    if ed_dt.tzinfo is None:
                        ed_dt = ed_dt.replace(tzinfo=timezone.utc)
                else:
                    ed_dt = earnings_date # Fallback
                
                if isinstance(ed_dt, datetime):
                    days_to_earnings = (ed_dt - now).days
                    
                    if 0 <= days_to_earnings <= 3:
                        return SkillResult(
                            symbol=symbol,
                            skill_name=self.name,
                            score=0.0, # Pre-earnings implies high volatility, neutral directional bias but high confidence of movement
                            signal='NEUTRAL',
                            confidence=0.9,
                            reasoning=f"⚠️ Earnings in {days_to_earnings} days. High volatility expected.",
                            raw_data={"days_to_earnings": days_to_earnings, "date": str(ed_dt)}
                        )
            
            # Default
            return SkillResult(
                symbol=symbol,
                skill_name=self.name,
                score=0.0,
                signal='NEUTRAL',
                confidence=0.1,
                reasoning="No hay earnings inminentes.",
                raw_data={}
            )
            
        except Exception as e:
            return SkillResult(
                symbol=symbol,
                skill_name=self.name,
                score=0.0,
                signal='NEUTRAL',
                confidence=0.0,
                reasoning=f"Error analizando earnings: {str(e)}",
                raw_data={"error": str(e)}
            )
