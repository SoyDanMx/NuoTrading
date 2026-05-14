import yfinance as yf
from datetime import datetime, timezone
from typing import Optional
from app.agents.skills.base import AgentSkill, SkillResult


def _to_aware_datetime(dt_val) -> Optional[datetime]:
    """Normalise any yfinance date value to a timezone-aware datetime."""
    try:
        if hasattr(dt_val, 'to_pydatetime'):
            dt_val = dt_val.to_pydatetime()
        if isinstance(dt_val, datetime):
            return dt_val if dt_val.tzinfo else dt_val.replace(tzinfo=timezone.utc)
    except Exception:
        pass
    return None


class EarningsSkill(AgentSkill):
    """
    Weight=0.15 — detects upcoming earnings and EPS surprises.
    If earnings < 3 days away, confidence is raised to 0.9 (volatility warning).
    """

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

            # --- Normalise calendar to a single earnings_date ----------------
            earnings_date = None

            if calendar is None:
                pass  # leave as None

            elif isinstance(calendar, dict):
                # yfinance >= 0.2: returns { 'Earnings Date': [...], ... }
                dates = calendar.get('Earnings Date', [])
                if isinstance(dates, list) and dates:
                    earnings_date = dates[0]
                elif dates:
                    earnings_date = dates

            elif hasattr(calendar, 'index') and 'Earnings Date' in calendar.index:
                # Legacy DataFrame
                dates = calendar.loc['Earnings Date']
                earnings_date = dates[0] if hasattr(dates, '__len__') else dates

            # --- Evaluate proximity ------------------------------------------
            if earnings_date is None:
                return SkillResult(
                    symbol=symbol,
                    skill_name=self.name,
                    score=0.0,
                    signal='NEUTRAL',
                    confidence=0.0,
                    reasoning="No hay datos de calendario de earnings.",
                    raw_data={}
                )

            ed_dt = _to_aware_datetime(earnings_date)

            if ed_dt is None:
                return SkillResult(
                    symbol=symbol,
                    skill_name=self.name,
                    score=0.0,
                    signal='NEUTRAL',
                    confidence=0.1,
                    reasoning="No hay earnings inminentes.",
                    raw_data={}
                )

            now = datetime.now(timezone.utc)
            days_to_earnings = (ed_dt - now).days

            if 0 <= days_to_earnings <= 3:
                return SkillResult(
                    symbol=symbol,
                    skill_name=self.name,
                    score=0.0,     # directional bias unknown pre-earnings
                    signal='NEUTRAL',
                    confidence=0.9,
                    reasoning=f"⚠️ Earnings in {days_to_earnings} days ({ed_dt.date()}). High volatility expected.",
                    raw_data={"days_to_earnings": days_to_earnings, "date": str(ed_dt)}
                )

            return SkillResult(
                symbol=symbol,
                skill_name=self.name,
                score=0.0,
                signal='NEUTRAL',
                confidence=0.1,
                reasoning=f"Próximos earnings en {days_to_earnings} días ({ed_dt.date()}).",
                raw_data={"days_to_earnings": days_to_earnings, "date": str(ed_dt)}
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
