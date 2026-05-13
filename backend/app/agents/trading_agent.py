import asyncio
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from app.services.market_data import MarketDataService
from app.services.sentiment_service import SentimentService
from app.services.ai_orchestrator import AIOrchestrator
from app.services.obsidian_service import ObsidianService

logger = logging.getLogger(__name__)

class AgentStatus:
    WATCHING = "WATCHING"
    ANALYZING = "ANALYZING"
    SIGNAL_READY = "SIGNAL_READY"
    EXECUTING = "EXECUTING"

class TradingAgent:
    """
    Autonomous Trading Agent for a specific ticker.
    Runs a loop every 60 seconds to analyze market context.
    """

    def __init__(self, symbol: str):
        self.symbol = symbol.upper()
        self.status = AgentStatus.WATCHING
        self.is_running = False
        self.task = None
        
        # Services
        self.market_data = MarketDataService()
        self.sentiment_service = SentimentService()
        self.ai_orchestrator = AIOrchestrator()
        self.obsidian = ObsidianService()
        
        self.last_analysis = {}

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
                await self._analyze_cycle()
            except Exception as e:
                logger.error(f"Error in agent cycle for {self.symbol}: {e}")
            
            # Wait for 60 seconds
            await asyncio.sleep(60)

    async def _analyze_cycle(self):
        """Single analysis cycle."""
        self.status = AgentStatus.ANALYZING
        logger.info(f"[{self.symbol}] Analysis cycle started...")

        # 1. Fetch Technical Data (RSI, MACD, etc)
        # Using existing get_stock_quote and simulated indicators if needed
        quote = await self.market_data.get_stock_quote(self.symbol)
        # Assuming we have a way to get indicators (mocking for now if service is pending)
        indicators = {
            "rsi": 55, # Fallback
            "macd": {"histogram": 0.5},
            "current_price": quote.get("price", 0)
        }

        # 2. Fetch Sentiment Score (Phase 1)
        sentiment = await self.sentiment_service.get_symbol_sentiment(self.symbol)
        
        # 3. Call AIOrchestrator for final verdict
        # Enriquecemos los datos para el orquestador
        analysis = await self.ai_orchestrator.analyze_market_context(
            symbol=self.symbol,
            price_data={"current_price": quote.get("price", 0)},
            indicators=indicators,
            news=[] # Handled internally by AIOrchestrator if needed
        )

        self.last_analysis = analysis
        score = analysis.get("confidence", 0)
        recommendation = analysis.get("recommendation", "HOLD")

        # 4. Emit Signal (Check thresholds > 80 or < 20)
        if (recommendation == "BUY" and score >= 80) or (recommendation == "SELL" and score <= 20):
            self.status = AgentStatus.SIGNAL_READY
            await self._emit_signal(recommendation, score, analysis.get("reasoning"))
        else:
            self.status = AgentStatus.WATCHING

        # 5. Save Decision to Obsidian
        self.obsidian.save_analysis(self.symbol, analysis)
        
        logger.info(f"[{self.symbol}] Cycle completed. Status: {self.status}, Signal: {recommendation} ({score}%)")

    async def _emit_signal(self, signal: str, confidence: int, reason: str):
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

    def get_state(self) -> Dict[str, Any]:
        """Return agent's current state."""
        return {
            "symbol": self.symbol,
            "status": self.status,
            "is_running": self.is_running,
            "last_decision": self.last_analysis.get("recommendation", "N/A"),
            "confidence": self.last_analysis.get("confidence", 0),
            "updated_at": datetime.now().isoformat()
        }
