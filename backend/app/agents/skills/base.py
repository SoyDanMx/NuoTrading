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
    def weight(self) -> float:
        pass
    
    @abstractmethod
    async def analyze(self, symbol: str) -> SkillResult:
        pass
    
    async def is_available(self) -> bool:
        """Override si la skill depende de una API key externa"""
        return True
