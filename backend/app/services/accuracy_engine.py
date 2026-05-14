import logging
import json
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy import text
from app.db.session import engine
from app.core.config import settings

logger = logging.getLogger(__name__)


class AccuracyEngine:
    """
    Tracks agent predictions and evaluates them 24h later to calculate accuracy.
    Provides data for the "Danelfin-style" accuracy dashboard.
    """

    def __init__(self):
        self.db = engine

    async def record_prediction(
        self, symbol: str, signal: str,
        confidence: float, price: float,
        final_score: float, skills_breakdown: dict
    ):
        """Saves a new prediction at the moment the agent emits a signal."""
        query = text("""
            INSERT INTO signal_predictions 
            (symbol, signal, confidence, price_at_signal, final_score, skills_breakdown)
            VALUES (:symbol, :signal, :confidence, :price, :final_score, :skills)
        """)
        
        try:
            with self.db.connect() as conn:
                conn.execute(query, {
                    "symbol": symbol,
                    "signal": signal,
                    "confidence": confidence,
                    "price": price,
                    "final_score": final_score,
                    "skills": json.dumps(skills_breakdown)
                })
                conn.commit()
            logger.info(f"Prediction recorded for {symbol}: {signal} @ ${price}")
        except Exception as e:
            logger.error(f"Error recording prediction for {symbol}: {e}")

    async def evaluate_predictions(self):
        """
        Runs as a background task. 
        Evaluates predictions made more than 24h ago that haven't been evaluated yet.
        """
        from app.services.market_data import MarketDataService
        market_data = MarketDataService()
        
        # Get unevaluated predictions older than 24h
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        query = text("""
            SELECT id, symbol, signal, price_at_signal, skills_breakdown 
            FROM signal_predictions 
            WHERE evaluated_at IS NULL AND created_at <= :cutoff
        """)
        
        try:
            with self.db.connect() as conn:
                results = conn.execute(query, {"cutoff": cutoff}).fetchall()
                
                for row in results:
                    pred_id, symbol, signal, price_at_signal, skills_breakdown = row
                    
                    # Fetch current price
                    current_price = await market_data.get_current_price(symbol)
                    if not current_price:
                        continue
                        
                    change_pct = (current_price - price_at_signal) / price_at_signal
                    was_correct = self._calculate_correctness(signal, change_pct)
                    
                    # Update prediction record
                    update_query = text("""
                        UPDATE signal_predictions 
                        SET price_24h = :p24, price_change_pct = :change, 
                            was_correct = :correct, evaluated_at = NOW()
                        WHERE id = :id
                    """)
                    conn.execute(update_query, {
                        "p24": current_price,
                        "change": change_pct,
                        "correct": was_correct,
                        "id": pred_id
                    })
                    
                    # Update aggregate skill accuracy
                    await self._update_skill_accuracy(skills_breakdown, was_correct)
                    
                conn.commit()
                logger.info(f"Evaluated {len(results)} predictions.")
                
        except Exception as e:
            logger.error(f"Error evaluating predictions: {e}")

    def _calculate_correctness(self, signal: str, change_pct: float) -> bool:
        """
        Logic:
        - COMPRA/COMPRA FUERTE: Correct if price > 0.5% up
        - VENTA/VENTA FUERTE: Correct if price > 0.5% down
        - MANTENER: Correct if price moved less than 0.5% in either direction
        """
        threshold = 0.005 # 0.5%
        
        if "COMPRA" in signal:
            return change_pct > threshold
        if "VENTA" in signal:
            return change_pct < -threshold
        if signal == "MANTENER":
            return abs(change_pct) <= threshold
            
        return False

    async def _update_skill_accuracy(self, skills_breakdown: Any, was_correct: bool):
        """Updates the running accuracy score for each skill involved in the prediction."""
        if isinstance(skills_breakdown, str):
            skills = json.loads(skills_breakdown)
        else:
            skills = skills_breakdown
            
        for skill_name, score in skills.items():
            # If the skill agreed with the final direction, its accuracy is updated
            # Logic: If signal was BUY and skill score was > 0, the skill "contributed" to correctness
            # Simplified: just update all skills present in the prediction
            query = text("""
                INSERT INTO skill_accuracy (skill_name, total_predictions, correct_predictions)
                VALUES (:name, 1, :correct)
                ON CONFLICT (skill_name) DO UPDATE SET
                    total_predictions = skill_accuracy.total_predictions + 1,
                    correct_predictions = skill_accuracy.correct_predictions + :correct,
                    accuracy_score = (skill_accuracy.correct_predictions + :correct)::float / (skill_accuracy.total_predictions + 1),
                    last_updated = NOW()
            """)
            
            with self.db.connect() as conn:
                conn.execute(query, {
                    "name": skill_name,
                    "correct": 1 if was_correct else 0
                })
                conn.commit()

    async def get_accuracy_report(self, symbol: Optional[str] = None) -> Dict:
        """Generates a complete report of agent performance."""
        try:
            with self.db.connect() as conn:
                # Overall Stats
                where_clause = f"WHERE symbol = '{symbol}'" if symbol else "WHERE 1=1"
                
                overall_q = text(f"""
                    SELECT 
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE was_correct = true) as correct,
                        AVG(ABS(price_change_pct)) as avg_move
                    FROM signal_predictions 
                    {where_clause} AND evaluated_at IS NULL = false
                """)
                overall = conn.execute(overall_q).fetchone()
                
                # By Signal
                signal_q = text(f"""
                    SELECT signal, COUNT(*) as total, COUNT(*) FILTER (WHERE was_correct = true) as correct
                    FROM signal_predictions 
                    {where_clause} AND evaluated_at IS NULL = false
                    GROUP BY signal
                """)
                by_signal = conn.execute(signal_q).fetchall()
                
                # By Skill
                skill_q = text("SELECT skill_name, accuracy_score, total_predictions FROM skill_accuracy")
                by_skill = conn.execute(skill_q).fetchall()
                
                # Best/Worst Tickers
                perf_ticker_q = text("""
                    SELECT symbol, AVG(CASE WHEN was_correct THEN 1 ELSE 0 END) as acc
                    FROM signal_predictions 
                    WHERE evaluated_at IS NOT NULL
                    GROUP BY symbol
                    HAVING COUNT(*) > 2
                    ORDER BY acc DESC
                """)
                perf_tickers = conn.execute(perf_ticker_q).fetchall()
                
                return {
                    "overall_accuracy": round(float(overall.correct / overall.total), 4) if overall.total > 0 else 0.0,
                    "total_predictions": overall.total,
                    "avg_24h_move": round(float(overall.avg_move or 0), 4),
                    "by_signal": {
                        row.signal: {"accuracy": round(row.correct / row.total, 2), "count": row.total}
                        for row in by_signal
                    },
                    "by_skill": {
                        row.skill_name: {"accuracy": round(row.accuracy_score, 2), "total": row.total_predictions}
                        for row in by_skill
                    },
                    "best_symbol": perf_tickers[0].symbol if perf_tickers else "N/A",
                    "worst_symbol": perf_tickers[-1].symbol if perf_tickers else "N/A"
                }
        except Exception as e:
            logger.error(f"Error generating accuracy report: {e}")
            return {"error": str(e)}

    async def get_latest_predictions(self, symbol: Optional[str] = None, limit: int = 10) -> List[Dict]:
        """Returns the most recent evaluated predictions for display."""
        where_clause = f"WHERE symbol = '{symbol}'" if symbol else "WHERE 1=1"
        query = text(f"""
            SELECT symbol, signal, price_at_signal, price_change_pct, was_correct, created_at
            FROM signal_predictions 
            {where_clause} AND evaluated_at IS NOT NULL
            ORDER BY created_at DESC
            LIMIT :limit
        """)
        
        try:
            with self.db.connect() as conn:
                results = conn.execute(query, {"limit": limit}).fetchall()
                return [
                    {
                        "symbol": r.symbol,
                        "signal": r.signal,
                        "price": r.price_at_signal,
                        "change_pct": round(r.price_change_pct * 100, 2),
                        "was_correct": r.was_correct,
                        "date": r.created_at.isoformat()
                    }
                    for r in results
                ]
        except Exception as e:
            logger.error(f"Error fetching latest predictions: {e}")
            return []
