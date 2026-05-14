import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from app.services.market_data import MarketDataService
from app.services.sentiment_service import SentimentService
from app.services.ai_orchestrator import AIOrchestrator
from app.services.obsidian_service import ObsidianService
from app.services.accuracy_engine import AccuracyEngine

logger = logging.getLogger(__name__)

class AgentStatus:
    WATCHING = "WATCHING"
    ANALYZING = "ANALYZING"
    SIGNAL_READY = "SIGNAL_READY"
    EXECUTING = "EXECUTING"

class TradingAgent:
    """
    Autonomous Trading Agent for a specific ticker (Skill-Based).
    Runs a loop every 60 seconds to execute all AgentSkills in parallel.
    """

    def __init__(self, symbol: str):
        self.symbol = symbol.upper()
        self.status = AgentStatus.WATCHING
        self.is_running = False
        self.task = None
        
        self.obsidian = ObsidianService()
        self.accuracy = AccuracyEngine()
        self.skills: list[AgentSkill] = self._load_skills()
        self.last_analysis = {}
        self.market_data = MarketDataService()

    def _load_skills(self) -> list[AgentSkill]:
        """Carga todas las skills disponibles dinámicamente"""
        from app.agents.skills.technical_skill import TechnicalSkill
        from app.agents.skills.sentiment_skill import SentimentSkill
        from app.agents.skills.options_flow_skill import OptionsFlowSkill
        from app.agents.skills.earnings_skill import EarningsSkill
        from app.agents.skills.social_skill import SocialSkill
        
        return [
            TechnicalSkill(),
            SentimentSkill(),
            OptionsFlowSkill(),
            EarningsSkill(),
            SocialSkill(),
        ]

    async def start(self):
        """Start the agent loop."""
        if self.is_running:
            return
        
        self.is_running = True
        self.task = asyncio.create_task(self._run_loop())
        logger.info(f"Agent started for {self.symbol}")

    async def stop(self):
        """Stop the agent loop."""
        self.is_running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        logger.info(f"Agent stopped for {self.symbol}")

    async def _run_loop(self):
        """Main analysis loop."""
        while self.is_running:
            try:
                await self.run_cycle()
            except Exception as e:
                logger.error(f"Error in agent cycle for {self.symbol}: {e}")
            
            # Wait for 60 seconds
            await asyncio.sleep(60)

    def _score_to_signal(self, final_score: float) -> str:
        """Convierte el score (-1.0 a 1.0) a una señal."""
        if final_score >= 0.5:
            return "COMPRA FUERTE" if final_score >= 0.8 else "COMPRA"
        elif final_score <= -0.5:
            return "VENTA FUERTE" if final_score <= -0.8 else "VENTA"
        return "MANTENER"

    async def run_cycle(self) -> dict:
        self.status = AgentStatus.ANALYZING
        logger.info(f"[{self.symbol}] Analysis cycle started (Modular Skills)...")

        # Actualiza pesos dinámicos desde el AccuracyEngine
        try:
            current_weights = await self.accuracy.get_current_weights()
            if current_weights:
                for skill in self.skills:
                    if skill.name in current_weights:
                        skill.set_dynamic_weight(current_weights[skill.name])
        except Exception as e:
            logger.error(f"Error updating dynamic weights for {self.symbol}: {e}")

        # Corre todas las skills en paralelo
        results = await asyncio.gather(*[
            skill.analyze(self.symbol) 
            for skill in self.skills
            if await skill.is_available()
        ])
        
        # Score ponderado final (-1.0 a +1.0)
        total_weight = sum(s.weight for s in self.skills)
        if total_weight > 0:
            final_score = sum(
                r.score * s.weight 
                for r, s in zip(results, self.skills)
            ) / total_weight
        else:
            final_score = 0.0
            
        signal = self._score_to_signal(final_score)
        
        # Log para observabilidad (WebSocket)
        confidence_pct = int(abs(final_score) * 100)
        reasoning = " | ".join([f"{r.skill_name}: {r.signal}" for r in results if r.signal != 'NEUTRAL'])
        if not reasoning:
            reasoning = "Señales técnicas y sociales en rango neutral."
            
        self.last_analysis = {
            "symbol": self.symbol,
            "final_score": final_score,
            "signal": signal,
            "confidence": confidence_pct,
            "skills": [r.__dict__ for r in results],
            "reasoning": reasoning,
            "updated_at": datetime.now().isoformat()
        }

        # Emite si hay señal fuerte
        if abs(final_score) >= 0.5:
            self.status = AgentStatus.SIGNAL_READY
            await self._broadcast_reasoning(signal, confidence_pct, reasoning)
        else:
            self.status = AgentStatus.WATCHING
        
        # Guardar en Obsidian
        await self._save_memory(results, final_score)
        
        # Registrar en el Accuracy Engine
        try:
            current_price = await self.market_data.get_current_price(self.symbol)
            if current_price:
                await self.accuracy.record_prediction(
                    symbol=self.symbol,
                    signal=signal,
                    confidence=float(confidence_pct),
                    price=float(current_price),
                    final_score=float(final_score),
                    skills_breakdown={r.skill_name: float(r.score) for r in results}
                )
        except Exception as e:
            logger.error(f"Failed to record prediction for {self.symbol}: {e}")
            
        logger.info(f"[{self.symbol}] Cycle completed. Signal: {signal} (Score: {final_score:.2f})")
        
        return self.last_analysis

    async def _broadcast_reasoning(self, signal: str, confidence: int, reason: str):
        """Emit signal via WebSocket to all connected clients."""
        from app.core.ws_manager import manager
        
        message = {
            "type": "SIGNAL",
            "symbol": self.symbol,
            "action": signal,
            "confidence": confidence,
            "reason": reason,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"🚀 BROADCASTING SIGNAL for {self.symbol}: {signal}")
        await manager.broadcast(message)

    async def _save_memory(self, results, final_score: float):
        """Guarda la memoria del ciclo en Obsidian."""
        analysis_data = {
            "final_score": final_score,
            "signal": self._score_to_signal(final_score),
            "timestamp": datetime.now().isoformat(),
            "skills_breakdown": [r.__dict__ for r in results]
        }
        self.obsidian.save_analysis(self.symbol, analysis_data)

    def get_state(self) -> Dict[str, Any]:
        """Return agent's current state."""
        return {
            "symbol": self.symbol,
            "status": self.status,
            "is_running": self.is_running,
            "analysis": self.last_analysis,
            "updated_at": datetime.now().isoformat()
        }
