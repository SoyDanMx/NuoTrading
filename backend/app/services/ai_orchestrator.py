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
    Advanced AI Orchestrator for NuoTrading.
    Switches between providers (OpenAI, Gemini, Groq, Anthropic) and persists technical memory.
    """

    def __init__(self):
        self.provider = settings.AI_PROVIDER.lower()
        self.openai_client = None
        self.gemini_model = None
        self.groq_client = None
        self.anthropic_client = None
        self.obsidian = ObsidianService()
        
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

    async def analyze_market_context(
        self, 
        symbol: str, 
        price_data: Dict[str, Any], 
        indicators: Dict[str, Any], 
        news: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Orchestrates the analysis across multiple providers and saves to Obsidian.
        """
        prompt = self._prepare_prompt(symbol, price_data, indicators, news)
        
        analysis = None
        
        # Strategy: Smart Switching / Orchestration
        if self.provider == "smart":
            analysis = await self._analyze_smart(symbol, price_data, indicators, news)
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
            return self._get_simulated_analysis(symbol, price_data, indicators)

        # Enriched analysis with technical context for Obsidian
        analysis['technical_context'] = {
            "rsi": indicators.get('rsi'),
            "price": price_data.get('current_price')
        }

        # Save to Technical Memory (Obsidian)
        self.obsidian.save_analysis(symbol, analysis)

        return analysis

    def _prepare_prompt(self, symbol: str, price_data: Dict, indicators: Dict, news: List) -> str:
        news_context = "\n".join([f"- {n.get('headline')}" for n in news[:5]])
        return f"""
        Analyze {symbol} for a premium trading platform.
        Price: ${price_data.get('current_price')}
        Indicators: RSI={indicators.get('rsi')}, MACD Hist={indicators.get('macd', {}).get('histogram')}
        News: {news_context}
        
        Return a JSON object:
        {{
          "recommendation": "BUY"|"SELL"|"HOLD",
          "confidence": 0-100,
          "reasoning": "Explicación breve y profesional en Español",
          "sentiment": "bullish"|"bearish"|"neutral"
        }}
        """

    async def _analyze_smart(self, symbol: str, price_data: Dict, indicators: Dict, news: List) -> Dict:
        """
        Smart Routing Strategy:
        1. Fast Technical Scan with Groq (Llama 3.1) - Minimal latency.
        2. Deep Strategic Reasoning with Claude/GPT-4o - Highest quality.
        """
        logger.info(f"Executing Smart Routing for {symbol}...")
        
        # Step 1: Technical Summary (Groq)
        tech_prompt = f"Summarize technical indicators for {symbol}: RSI={indicators.get('rsi')}, Price=${price_data.get('current_price')}. Be concise."
        tech_summary = "Technical data processed."
        
        if self.groq_client:
            try:
                resp = await self.groq_client.chat.completions.create(
                    model="llama-3.1-70b-versatile",
                    messages=[{"role": "user", "content": tech_prompt}]
                )
                tech_summary = resp.choices[0].message.content
            except Exception as e:
                logger.warning(f"Groq phase failed in smart routing: {e}")

        # Step 2: Final Verdict (Claude / GPT-4o)
        final_prompt = f"""
        Final Strategy for {symbol}.
        Technical Analysis Summary: {tech_summary}
        Global Context (News): {json.dumps([n.get('headline') for n in news[:3]])}
        
        Provide the final trading verdict in JSON:
        {{
          "recommendation": "BUY"|"SELL"|"HOLD",
          "confidence": 0-100,
          "reasoning": "Resumen ejecutivo profesional en Español",
          "sentiment": "bullish"|"bearish"|"neutral"
        }}
        """
        
        if self.anthropic_client:
            return await self._analyze_with_anthropic(final_prompt)
        elif self.openai_client:
            return await self._call_openai_compatible(self.openai_client, "gpt-4o", final_prompt)
        
        return await self._get_best_available(final_prompt)

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
            return {"recommendation": "HOLD", "confidence": 0, "reasoning": f"Error: {str(e)}"}

    async def _analyze_with_anthropic(self, prompt: str) -> Dict:
        try:
            response = await self.anthropic_client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                system="You are a professional trader. Respond ONLY with a JSON object.",
                messages=[{"role": "user", "content": prompt}]
            )
            # Anthropic text is in content[0].text
            return json.loads(response.content[0].text)
        except Exception as e:
            logger.error(f"Anthropic error: {e}")
            return {"error": str(e)}

    async def _get_best_available(self, prompt: str) -> Dict:
        """Heuristic to choose the best available provider."""
        if self.anthropic_client: return await self._analyze_with_anthropic(prompt)
        if self.groq_client: return await self._call_openai_compatible(self.groq_client, "llama-3.1-70b-versatile", prompt)
        if self.openai_client: return await self._call_openai_compatible(self.openai_client, "gpt-4o", prompt)
        if self.gemini_model: return await self._analyze_with_gemini(prompt)
        return {"error": "No providers available"}

    def _get_simulated_analysis(self, symbol: str, price_data: Dict, indicators: Dict) -> Dict:
        return {
            "recommendation": "HOLD",
            "confidence": 0,
            "reasoning": "Error de orquestación: No hay proveedores de IA disponibles.",
            "sentiment": "neutral",
            "is_simulated": True
        }
