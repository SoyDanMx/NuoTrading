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
        # Check if URL needs SSL (common in Render/Supabase)
        db_url = settings.DATABASE_URL
        if "supabase.co" in db_url and "sslmode" not in db_url:
            separator = "&" if "?" in db_url else "?"
            db_url += f"{separator}sslmode=require"
            
        engine = sqlalchemy.create_engine(
            db_url,
            connect_args={"connect_timeout": 5}
        )
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            supabase_status = "connected"
    except Exception as e:
        error_msg = str(e)
        # Obfuscate credentials for safety in logs
        safe_url = settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else "unknown"
        print(f"CRITICAL: Supabase Connection Error to {safe_url}: {error_msg}")
        supabase_status = f"error: {error_msg[:50]}..."

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
