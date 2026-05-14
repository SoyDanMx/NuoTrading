from abc import ABC, abstractmethod
from typing import Dict, Any, Literal
from pydantic import BaseModel

class SkillResult(BaseModel):
    score: float  # 0 to 100
    signal: Literal['BULLISH', 'BEARISH', 'NEUTRAL']
    reasoning: str
    metadata: Dict[str, Any] = {}

class AgentSkill(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the skill (e.g., 'Technical Analysis')"""
        pass

    @property
    @abstractmethod
    def weight(self) -> float:
        """Weight of this skill in the final agent decision (e.g., 0.30)"""
        pass

    @abstractmethod
    async def analyze(self, symbol: str) -> SkillResult:
        """Perform the skill-specific analysis and return a standardized result"""
        pass
