"""
Backtesting Engine - Test strategies against historical data
"""
from typing import List, Dict
from datetime import datetime

class BacktestEngine:
    """Engine for backtesting trading strategies."""
    
    def __init__(
        self,
        initial_capital: float = 10000.0,
        commission: float = 0.001,  # 0.1% commission
    ):
        """
        Initialize backtest engine.
        
        Args:
            initial_capital: Starting capital
            commission: Trading commission rate
        """
        self.initial_capital = initial_capital
        self.commission = commission
        self.reset()
    
    def reset(self):
        """Reset backtest state."""
        self.capital = self.initial_capital
        self.positions = []
        self.trades = []
        self.equity_curve = []
    
    async def run(
        self,
        strategy,
        historical_data: List[Dict],
    ) -> Dict:
        """
        Run backtest on historical data.
        
        Args:
            strategy: Strategy instance to test
            historical_data: Historical OHLCV data
            
        Returns:
            Backtest results and metrics
        """
        self.reset()
        
        for i in range(len(historical_data)):
            # Get data up to current point
            current_data = historical_data[:i+1]
            
            # Run strategy
            signal = await strategy.run(current_data)
            
            if signal:
                await self._execute_signal(signal, historical_data[i])
            
            # Record equity
            self.equity_curve.append({
                "timestamp": historical_data[i]["timestamp"],
                "equity": self._calculate_equity(historical_data[i]["close"]),
            })
        
        return self._calculate_metrics()
    
    async def _execute_signal(self, signal: Dict, current_candle: Dict):
        """Execute a trading signal."""
        price = current_candle["close"]
        
        if signal["action"] == "enter":
            # Enter position
            position_size = self.capital * 0.95  # Use 95% of capital
            commission_cost = position_size * self.commission
            
            position = {
                "entry_price": price,
                "size": position_size - commission_cost,
                "entry_time": current_candle["timestamp"],
            }
            
            self.positions.append(position)
            self.capital -= position_size
        
        elif signal["action"] == "exit" and self.positions:
            # Exit position
            position = self.positions.pop(0)
            position_value = position["size"] * (price / position["entry_price"])
            commission_cost = position_value * self.commission
            
            self.capital += position_value - commission_cost
            
            # Record trade
            self.trades.append({
                "entry_price": position["entry_price"],
                "exit_price": price,
                "entry_time": position["entry_time"],
                "exit_time": current_candle["timestamp"],
                "profit": position_value - position["size"] - commission_cost,
            })
    
    def _calculate_equity(self, current_price: float) -> float:
        """Calculate current total equity."""
        equity = self.capital
        
        for position in self.positions:
            position_value = position["size"] * (current_price / position["entry_price"])
            equity += position_value
        
        return equity
    
    def _calculate_metrics(self) -> Dict:
        """Calculate backtest performance metrics."""
        total_trades = len(self.trades)
        winning_trades = [t for t in self.trades if t["profit"] > 0]
        losing_trades = [t for t in self.trades if t["profit"] <= 0]
        
        final_equity = self.equity_curve[-1]["equity"] if self.equity_curve else self.initial_capital
        total_return = ((final_equity - self.initial_capital) / self.initial_capital) * 100
        
        return {
            "initial_capital": self.initial_capital,
            "final_equity": final_equity,
            "total_return": total_return,
            "total_trades": total_trades,
            "winning_trades": len(winning_trades),
            "losing_trades": len(losing_trades),
            "win_rate": len(winning_trades) / total_trades * 100 if total_trades > 0 else 0,
            "trades": self.trades,
            "equity_curve": self.equity_curve,
        }
