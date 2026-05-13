import logging
from typing import Dict, List, Any, Optional
from app.agents.trading_agent import TradingAgent

logger = logging.getLogger(__name__)

class AgentManager:
    """
    Manager to handle multiple TradingAgents in parallel.
    Singleton pattern to ensure one manager across the app.
    """
    _instance = None
    _agents: Dict[str, TradingAgent] = {}
    MAX_AGENTS = 10

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AgentManager, cls).__new__(cls)
        return cls._instance

    async def start_agent(self, symbol: str) -> bool:
        """Initialize and start an agent for a symbol with rate limiting."""
        symbol = symbol.upper()
        
        # Check if already running
        if symbol in self._agents and self._agents[symbol].is_running:
            return True
            
        # Rate Limiting: Max 10 agents
        running_count = len([a for a in self._agents.values() if a.is_running])
        if running_count >= self.MAX_AGENTS:
            logger.warning(f"Rate limit reached: {running_count}/{self.MAX_AGENTS} agents running.")
            raise Exception(f"Rate limit reached: Maximum {self.MAX_AGENTS} agents allowed simultaneously.")
        
        if symbol in self._agents:
            await self._agents[symbol].start()
            return True
        
        agent = TradingAgent(symbol)
        self._agents[symbol] = agent
        await agent.start()
        return True

    async def stop_agent(self, symbol: str) -> bool:
        """Stop an agent for a symbol."""
        symbol = symbol.upper()
        if symbol in self._agents:
            await self._agents[symbol].stop()
            return True
        return False

    def list_agents(self) -> List[Dict[str, Any]]:
        """Return the state of all managed agents."""
        return [agent.get_state() for agent in self._agents.values()]

    def get_agent_status(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get status of a specific agent."""
        symbol = symbol.upper()
        if symbol in self._agents:
            return self._agents[symbol].get_state()
        return None

# Global instance
agent_manager = AgentManager()
