"""
Base Strategy Class - Foundation for trading algorithms
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Optional
from datetime import datetime

class StrategyBase(ABC):
    """Abstract base class for trading strategies."""
    
    def __init__(self, name: str, symbol: str, timeframe: str = "1h"):
        """
        Initialize strategy.
        
        Args:
            name: Strategy name
            symbol: Trading symbol (e.g., 'BTC/USDT')
            timeframe: Candlestick timeframe (e.g., '1h', '4h', '1d')
        """
        self.name = name
        self.symbol = symbol
        self.timeframe = timeframe
        self.positions = []
        self.is_running = False
    
    @abstractmethod
    async def analyze(self, data: List[Dict]) -> Dict:
        """
        Analyze market data and generate signals.
        
        Args:
            data: OHLCV data
            
        Returns:
            Dictionary with analysis results and signals
        """
        pass
    
    @abstractmethod
    async def should_enter(self, analysis: Dict) -> bool:
        """
        Determine if strategy should enter a position.
        
        Args:
            analysis: Results from analyze()
            
        Returns:
            True if should enter position
        """
        pass
    
    @abstractmethod
    async def should_exit(self, analysis: Dict, position: Dict) -> bool:
        """
        Determine if strategy should exit a position.
        
        Args:
            analysis: Results from analyze()
            position: Current position details
            
        Returns:
            True if should exit position
        """
        pass
    
    async def run(self, data: List[Dict]) -> Optional[Dict]:
        """
        Execute strategy logic.
        
        Args:
            data: OHLCV data
            
        Returns:
            Trading signal if generated, None otherwise
        """
        analysis = await self.analyze(data)
        
        # Check for entry signals
        if not self.positions and await self.should_enter(analysis):
            return {
                "action": "enter",
                "symbol": self.symbol,
                "timestamp": datetime.utcnow().isoformat(),
                "analysis": analysis,
            }
        
        # Check for exit signals
        if self.positions:
            for position in self.positions:
                if await self.should_exit(analysis, position):
                    return {
                        "action": "exit",
                        "symbol": self.symbol,
                        "position": position,
                        "timestamp": datetime.utcnow().isoformat(),
                        "analysis": analysis,
                    }
        
        return None
    
    def start(self):
        """Start the strategy."""
        self.is_running = True
    
    def stop(self):
        """Stop the strategy."""
        self.is_running = False
