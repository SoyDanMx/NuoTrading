from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.services.obsidian_service import ObsidianService

router = APIRouter()
obsidian = ObsidianService()

@router.get("/{symbol}")
async def get_market_memory(symbol: str, limit: int = 5):
    """Retrieve the historical market memory (Obsidian notes) for a symbol."""
    try:
        memories = obsidian.get_memory(symbol, limit)
        return {
            "symbol": symbol.upper(),
            "memories": memories,
            "count": len(memories)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
