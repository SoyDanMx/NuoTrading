from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from app.agents.agent_manager import agent_manager

router = APIRouter()

@router.get("/")
async def list_agents():
    """List all active agents and their status."""
    return {
        "agents": agent_manager.list_agents()
    }

@router.post("/{symbol}/start")
async def start_agent(symbol: str):
    """Start an autonomous agent for a specific ticker."""
    try:
        success = await agent_manager.start_agent(symbol)
        if success:
            return {"message": f"Agent started for {symbol.upper()}", "symbol": symbol.upper()}
        else:
            raise HTTPException(status_code=400, detail="Failed to start agent")
    except Exception as e:
        if "Rate limit reached" in str(e):
            raise HTTPException(status_code=429, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{symbol}/stop")
async def stop_agent(symbol: str):
    """Stop an autonomous agent for a specific ticker."""
    try:
        success = await agent_manager.stop_agent(symbol)
        if success:
            return {"message": f"Agent stopped for {symbol.upper()}"}
        else:
            raise HTTPException(status_code=404, detail=f"No active agent found for {symbol.upper()}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{symbol}")
async def get_agent_status(symbol: str):
    """Get status of a specific agent."""
    status = agent_manager.get_agent_status(symbol)
    if status:
        return status
    raise HTTPException(status_code=404, detail=f"No agent found for {symbol.upper()}")
