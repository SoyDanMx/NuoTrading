from fastapi import APIRouter
from app.agents.agent_manager import agent_manager
from app.core.config import settings
import sqlalchemy
from sqlalchemy import text
from datetime import datetime
import httpx

router = APIRouter()

@router.get("/")
async def health_check():
    """Enriched health check for NuoTrading pipeline."""
    
    # 1. Check Supabase (Database)
    supabase_status = "disconnected"
    try:
        engine = sqlalchemy.create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            supabase_status = "connected"
    except Exception as e:
        print(f"DEBUG: Supabase Connection Error: {str(e)}")
        supabase_status = "error"

    # 2. Check Agents
    agents_running = 0
    try:
        agents_running = len([a for a in agent_manager.list_agents() if a['is_running']])
    except Exception:
        pass

    # 3. Check Providers (Robust check)
    def check_key(key: str) -> str:
        # Check if key is set and not just empty or "demo"
        if key and len(key.strip()) > 5:
            return "connected"
        return "not_configured"

    anthropic_status = check_key(settings.ANTHROPIC_API_KEY)
    groq_status = check_key(settings.GROQ_API_KEY)
    finnhub_status = check_key(settings.FINNHUB_API_KEY)

    return {
        "status": "ok" if supabase_status == "connected" else "degraded",
        "timestamp": datetime.now().isoformat(),
        "environment": settings.ENVIRONMENT,
        "agents_running": agents_running,
        "supabase": supabase_status,
        "anthropic": anthropic_status,
        "groq": groq_status,
        "finnhub": finnhub_status,
        "last_sentiment_analysis": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
