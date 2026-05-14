import asyncio
import logging
import json
from typing import List, Dict, Any
from openai import AsyncOpenAI
import google.generativeai as genai
from anthropic import AsyncAnthropic
from app.core.config import settings
from app.services.obsidian_service import ObsidianService
from app.agents.skills.base import AgentSkill, SkillResult

logger = logging.getLogger(__name__)


def _load_skills() -> List[AgentSkill]:
    """
    Carga dinámicamente todas las Skills disponibles.
    Para agregar una nueva Skill a Fase A o B, solo agregarla aquí.
    """
    from app.agents.skills.technical_skill import TechnicalSkill
    from app.agents.skills.sentiment_skill import SentimentSkill
    from app.agents.skills.options_flow_skill import OptionsFlowSkill
    from app.agents.skills.earnings_skill import EarningsSkill
    from app.agents.skills.social_skill import SocialSkill

    return [
        TechnicalSkill(),    # weight=0.30
        SentimentSkill(),    # weight=0.25
        OptionsFlowSkill(),  # weight=0.20
        EarningsSkill(),     # weight=0.15
        SocialSkill(),       # weight=0.10
    ]


class AIOrchestrator:
    """
    Multi-LLM Orchestrator for NuoTrading.

    Flow:
      1. Execute all AgentSkills in parallel (asyncio.gather).
      2. Compute weighted score (-1.0 to +1.0).
      3. Ask Groq (fast) + Claude/GPT-4o (deep) for the executive reasoning.
      4. Save to Obsidian memory.
    """

    def __init__(self):
        self.provider = settings.AI_PROVIDER.lower()
        self.obsidian = ObsidianService()

        # Skills are loaded lazily on first analyze_with_skills() call
        # to avoid the circular: MarketDataService → AIOrchestrator → TechnicalSkill → MarketDataService
        self._skills: List[AgentSkill] = []

        # LLM Clients
        self.openai_client = None
        self.gemini_model = None
        self.groq_client = None
        self.anthropic_client = None

        if settings.OPENAI_API_KEY:
            self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.gemini_model = genai.GenerativeModel('gemini-1.5-pro')

        if settings.GROQ_API_KEY:
            self.groq_client = AsyncOpenAI(
                api_key=settings.GROQ_API_KEY,
                base_url="https://api.groq.com/openai/v1"
            )

        if settings.ANTHROPIC_API_KEY:
            self.anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    # ------------------------------------------------------------------
    # Main entry point
    # ------------------------------------------------------------------

    async def analyze_with_skills(self, symbol: str) -> Dict[str, Any]:
        """
        Execute all available skills in parallel, compute weighted score,
        then ask the LLM for the executive reasoning.
        """
        # Lazy load skills on first call (avoids circular deps at import time)
        if not self._skills:
            self._skills = _load_skills()
        # 1. Run skills in parallel, skip unavailable ones
        available_skills = [s for s in self._skills if await s.is_available()]
        results: List[SkillResult] = await asyncio.gather(
            *[skill.analyze(symbol) for skill in available_skills]
        )

        # 2. Weighted score (-1.0 to +1.0)
        total_weight = sum(s.weight for s in available_skills)
        if total_weight > 0:
            final_score = sum(
                r.score * s.weight
                for r, s in zip(results, available_skills)
            ) / total_weight
        else:
            final_score = 0.0

        final_score = max(-1.0, min(1.0, final_score))

        # 3. Map to action string
        preliminary_action = self._score_to_action(final_score)

        # 4. LLM executive reasoning
        prompt = self._build_prompt(symbol, final_score, preliminary_action, results)
        analysis = await self._call_best_llm(symbol, prompt, results)

        if not analysis or "error" in analysis:
            analysis = {
                "recommendation": preliminary_action,
                "confidence": abs(final_score),
                "reasoning": f"Score algorítmico: {final_score:.2f}. No se pudo obtener razonamiento LLM.",
                "sentiment": "neutral",
            }

        # 5. Enrich response
        analysis["final_score"] = final_score
        analysis["confidence"] = abs(final_score)
        analysis["skills_breakdown"] = {
            r.skill_name: {
                "score": r.score,
                "signal": r.signal,
                "confidence": r.confidence,
                "reasoning": r.reasoning,
                "raw_data": r.raw_data,
            }
            for r in results
        }

        # 6. Persist to Obsidian
        self.obsidian.save_analysis(symbol, analysis)

        return analysis

    # ------------------------------------------------------------------
    # Helper: score → action label
    # ------------------------------------------------------------------

    def _score_to_action(self, score: float) -> str:
        if score >= 0.8:
            return "COMPRA FUERTE"
        elif score >= 0.5:
            return "COMPRA"
        elif score <= -0.8:
            return "VENTA FUERTE"
        elif score <= -0.5:
            return "VENTA"
        return "MANTENER"

    # ------------------------------------------------------------------
    # Prompt builder
    # ------------------------------------------------------------------

    def _build_prompt(
        self,
        symbol: str,
        final_score: float,
        action: str,
        results: List[SkillResult],
    ) -> str:
        skills_summary = "\n".join(
            f"  - {r.skill_name}: score={r.score:.2f}, signal={r.signal}, "
            f"confidence={r.confidence:.2f} → {r.reasoning}"
            for r in results
        )
        return f"""
Eres el Orquestador Maestro de NuoTrading, un sistema institucional de trading.
Acabo de ejecutar {len(results)} Skills cuantitativas sobre {symbol}:

Score algorítmico final: {final_score:.2f} (rango -1.0 a +1.0)
Acción preliminar: {action}

Breakdown por Skill:
{skills_summary}

Escribe en 2 oraciones el razonamiento ejecutivo profesional en Español que explique
el "¿Por qué?" detrás de este veredicto. No cambies los números.

Responde SOLO con este JSON:
{{
  "recommendation": "{action}",
  "confidence": {abs(final_score):.4f},
  "reasoning": "<razonamiento en español>",
  "sentiment": "bullish" | "bearish" | "neutral"
}}
"""

    # ------------------------------------------------------------------
    # Smart LLM routing
    # ------------------------------------------------------------------

    async def _call_best_llm(
        self, symbol: str, prompt: str, results: List[SkillResult]
    ) -> Dict[str, Any]:
        """
        Strategy:
          - Smart mode: Groq (fast scan) → Claude/GPT-4o (deep verdict).
          - Single provider: use whatever is configured.
        """
        if self.provider == "smart":
            return await self._smart_route(prompt)
        elif self.provider == "groq" and self.groq_client:
            return await self._call_openai_compat(
                self.groq_client, "llama-3.1-70b-versatile", prompt
            )
        elif self.provider == "anthropic" and self.anthropic_client:
            return await self._call_anthropic(prompt)
        elif self.provider == "openai" and self.openai_client:
            return await self._call_openai_compat(
                self.openai_client, "gpt-4o", prompt
            )
        elif self.provider == "gemini" and self.gemini_model:
            return await self._call_gemini(prompt)
        return await self._best_available(prompt)

    async def _smart_route(self, prompt: str) -> Dict[str, Any]:
        """Groq for speed, then Claude/GPT for depth."""
        # Use Groq if available (fastest)
        if self.groq_client:
            result = await self._call_openai_compat(
                self.groq_client, "llama-3.1-70b-versatile", prompt
            )
            if "error" not in result:
                return result
        return await self._best_available(prompt)

    async def _best_available(self, prompt: str) -> Dict[str, Any]:
        if self.anthropic_client:
            return await self._call_anthropic(prompt)
        if self.groq_client:
            return await self._call_openai_compat(
                self.groq_client, "llama-3.1-70b-versatile", prompt
            )
        if self.openai_client:
            return await self._call_openai_compat(self.openai_client, "gpt-4o", prompt)
        if self.gemini_model:
            return await self._call_gemini(prompt)
        return {"error": "No LLM providers available"}

    # ------------------------------------------------------------------
    # Provider implementations
    # ------------------------------------------------------------------

    async def _call_openai_compat(
        self, client: AsyncOpenAI, model: str, prompt: str
    ) -> Dict[str, Any]:
        try:
            resp = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
            )
            return json.loads(resp.choices[0].message.content)
        except Exception as e:
            logger.error("Error with %s: %s", model, e)
            return {"error": str(e)}

    async def _call_gemini(self, prompt: str) -> Dict[str, Any]:
        try:
            resp = await self.gemini_model.generate_content_async(
                prompt,
                generation_config={"response_mime_type": "application/json"},
            )
            return json.loads(resp.text)
        except Exception as e:
            logger.error("Gemini error: %s", e)
            return {"error": str(e)}

    async def _call_anthropic(self, prompt: str) -> Dict[str, Any]:
        try:
            resp = await self.anthropic_client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=512,
                system="You are a professional trader. Respond ONLY with valid JSON.",
                messages=[{"role": "user", "content": prompt}],
            )
            content = resp.content[0].text
            start = content.find("{")
            end = content.rfind("}") + 1
            if start != -1 and end > start:
                return json.loads(content[start:end])
            return {"error": "Invalid JSON from Anthropic"}
        except Exception as e:
            logger.error("Anthropic error: %s", e)
            return {"error": str(e)}
