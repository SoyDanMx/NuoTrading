import logging
import json
from typing import List, Dict, Any, Optional
from openai import AsyncOpenAI
import google.generativeai as genai
from anthropic import AsyncAnthropic
from app.core.config import settings
from app.services.obsidian_service import ObsidianService

logger = logging.getLogger(__name__)

class AIOrchestrator:
    """
    Advanced AI Orchestrator for NuoTrading (Skill-Based Architecture).
    Orchestrates specialized AgentSkills and multi-LLM reasoning.
    """

    def __init__(self):
        self.provider = settings.AI_PROVIDER.lower()
        self.openai_client = None
        self.gemini_model = None
        self.groq_client = None
        self.anthropic_client = None
        self.obsidian = ObsidianService()
        
        # Load available skills dynamically
        from app.agents.skills.technical import TechnicalSkill
        from app.agents.skills.sentiment import SentimentSkill
        self.skills = [
            TechnicalSkill(),
            SentimentSkill()
            # EarningsSkill(), # Phase B
            # SocialSignalSkill() # Phase A
        ]
        
        # Initialize Clients
        if settings.OPENAI_API_KEY:
            self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.gemini_model = genai.GenerativeModel('gemini-1.5-pro')
            
        if settings.GROQ_API_KEY:
            self.groq_client = AsyncOpenAI(api_key=settings.GROQ_API_KEY, base_url="https://api.groq.com/openai/v1")

        if settings.ANTHROPIC_API_KEY:
            self.anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def analyze_with_skills(self, symbol: str) -> Dict[str, Any]:
        """
        Execute all available skills, calculate weighted score, and get final LLM verdict.
        """
        skill_results = {}
        total_weight = 0.0
        weighted_score = 0.0
        
        # 1. Execute all skills
        for skill in self.skills:
            result = await skill.analyze(symbol)
            skill_results[skill.name] = result
            
            # 2. Calculate weighted score
            weighted_score += result.score * skill.weight
            total_weight += skill.weight
            
        # Normalize score if total_weight != 1.0
        if total_weight > 0:
            final_score = weighted_score / total_weight
        else:
            final_score = 50.0

        # Determine preliminary signal
        if final_score >= 85:
            preliminary_action = "BUY" # COMPRA FUERTE
        elif final_score >= 55:
            preliminary_action = "BUY"
        elif final_score <= 20:
            preliminary_action = "SELL" # VENTA FUERTE
        elif final_score <= 45:
            preliminary_action = "SELL"
        else:
            preliminary_action = "HOLD"

        # 3. Generate Final Reasoning via Multi-LLM
        prompt = self._prepare_skill_prompt(symbol, final_score, preliminary_action, skill_results)
        
        analysis = None
        if self.provider == "smart":
            analysis = await self._analyze_smart(symbol, prompt, skill_results)
        elif self.provider == "groq" and self.groq_client:
            analysis = await self._call_openai_compatible(self.groq_client, "llama-3.1-70b-versatile", prompt)
        elif self.provider == "gemini" and self.gemini_model:
            analysis = await self._analyze_with_gemini(prompt)
        elif self.provider == "anthropic" and self.anthropic_client:
            analysis = await self._analyze_with_anthropic(prompt)
        elif self.provider == "openai" and self.openai_client:
            analysis = await self._call_openai_compatible(self.openai_client, "gpt-4o", prompt)
        else:
            analysis = await self._get_best_available(prompt)

        if not analysis or "error" in analysis:
            analysis = {
                "recommendation": preliminary_action,
                "confidence": final_score,
                "reasoning": f"Basado en un score algorítmico de {final_score:.1f}/100 combinando múltiples fuentes.",
                "sentiment": "neutral"
            }

        # Override confidence with our strict algorithmic score
        analysis["confidence"] = final_score
        
        # Inject skill results into analysis
        analysis["skills_breakdown"] = {name: {"score": res.score, "signal": res.signal, "reasoning": res.reasoning} for name, res in skill_results.items()}

        # Save to Obsidian
        self.obsidian.save_analysis(symbol, analysis)

        return analysis

    def _prepare_skill_prompt(self, symbol: str, final_score: float, action: str, skill_results: Dict[str, Any]) -> str:
        skills_summary = "\\n".join([f"- {name}: Score={res.score:.1f}, Signal={res.signal}, Reason: {res.reasoning}" for name, res in skill_results.items()])
        return f"""
        Final Strategy Orchestration for {symbol}.
        
        We have processed quantitative skills and aggregated a Final Algorithmic Score of {final_score:.1f}/100.
        Preliminary Action: {action}
        
        Skill Breakdown:
        {skills_summary}
        
        As the Master AI Orchestrator, write a highly professional, 2-sentence executive summary in Spanish explaining the 'Why' behind this score.
        Do NOT change the score, just provide the reasoning.
        
        Return a JSON object:
        {{
          "recommendation": "{action}",
          "confidence": {final_score},
          "reasoning": "Resumen ejecutivo profesional en Español",
          "sentiment": "bullish"|"bearish"|"neutral"
        }}
        """

    async def _analyze_smart(self, symbol: str, prompt: str, skill_results: Dict) -> Dict:
        """
        Smart Routing Strategy: Fast tech scan + Deep logic
        Since we already ran the modular skills, we just use the fastest/best LLM for the final verdict.
        """
        if self.groq_client:
            return await self._call_openai_compatible(self.groq_client, "llama-3.1-70b-versatile", prompt)
        return await self._get_best_available(prompt)

    async def _call_openai_compatible(self, client: AsyncOpenAI, model: str, prompt: str) -> Dict:
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Error with {model}: {e}")
            return {"error": str(e)}

    async def _analyze_with_gemini(self, prompt: str) -> Dict:
        try:
            response = await self.gemini_model.generate_content_async(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Gemini error: {e}")
            return {"error": str(e)}

    async def _analyze_with_anthropic(self, prompt: str) -> Dict:
        try:
            response = await self.anthropic_client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=1024,
                system="You are a professional trader. Respond ONLY with a JSON object.",
                messages=[{"role": "user", "content": prompt}]
            )
            # Find the JSON part in the response
            content = response.content[0].text
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            if start_idx != -1 and end_idx != 0:
                json_str = content[start_idx:end_idx]
                return json.loads(json_str)
            return {"error": "Invalid JSON from Anthropic"}
        except Exception as e:
            logger.error(f"Anthropic error: {e}")
            return {"error": str(e)}

    async def _get_best_available(self, prompt: str) -> Dict:
        if self.anthropic_client: return await self._analyze_with_anthropic(prompt)
        if self.groq_client: return await self._call_openai_compatible(self.groq_client, "llama-3.1-70b-versatile", prompt)
        if self.openai_client: return await self._call_openai_compatible(self.openai_client, "gpt-4o", prompt)
        if self.gemini_model: return await self._analyze_with_gemini(prompt)
        return {"error": "No providers available"}
