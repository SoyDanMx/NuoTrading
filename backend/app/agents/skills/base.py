from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

@dataclass
class SkillResult:
    symbol: str
    skill_name: str
    score: float          # -1.0 a 1.0
    signal: str           # BULLISH | BEARISH | NEUTRAL
    confidence: float     # 0.0 a 1.0
    reasoning: str        # para el panel de observabilidad
    raw_data: dict        # datos crudos para Obsidian

class AgentSkill(ABC):
    
    @property
    @abstractmethod
    def name(self) -> str:
        pass
    
    @property
    @abstractmethod
    def default_weight(self) -> float:
        """The initial weight assigned to this skill."""
        pass

    @property
    def default_weight(self) -> float:
        """
        The active weight. In production, this can be overridden 
        by the AccuracyEngine based on historical performance.
        """
        return getattr(self, "_dynamic_weight", self.default_weight)

    def set_dynamic_weight(self, value: float):
        self._dynamic_weight = value
    
    @abstractmethod
    async def analyze(self, symbol: str) -> SkillResult:
        pass
    
    async def is_available(self) -> bool:
        """Override si la skill depende de una API key externa"""
        return True
