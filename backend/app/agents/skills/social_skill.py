from app.agents.skills.base import AgentSkill, SkillResult

class SocialSkill(AgentSkill):
    @property
    def name(self) -> str:
        return "Señales Sociales (X/Reddit)"

    @property
    def weight(self) -> float:
        return 0.10

    async def analyze(self, symbol: str) -> SkillResult:
        return SkillResult(
            symbol=symbol,
            skill_name=self.name,
            score=0.0,
            signal='NEUTRAL',
            confidence=0.0,
            reasoning="En espera de integración (Fase A)",
            raw_data={"pending_integration": True}
        )
