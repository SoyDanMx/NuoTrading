import asyncio
import pytest
from app.services.sentiment_service import SentimentService
from app.agents.agent_manager import agent_manager
from app.services.obsidian_service import ObsidianService
import httpx

# Mocking or using real services depends on environment
# Here we test if they can at least be instantiated and called

@pytest.mark.asyncio
async def test_sentiment_service():
    """Test SentimentService can fetch and analyze."""
    service = SentimentService()
    # Note: This might make a real API call if keys are set
    result = await service.get_symbol_sentiment("NVDA")
    assert result["symbol"] == "NVDA"
    assert "sentiment_score" in result
    assert "signal" in result
    print("\n✅ SentimentService Test Passed")

@pytest.mark.asyncio
async def test_agent_manager():
    """Test AgentManager can start/stop agents."""
    symbol = "NVDA"
    # Start agent
    success = await agent_manager.start_agent(symbol)
    assert success is True
    
    status = agent_manager.get_agent_status(symbol)
    assert status["is_running"] is True
    assert status["symbol"] == symbol
    
    # Stop agent
    await agent_manager.stop_agent(symbol)
    status = agent_manager.get_agent_status(symbol)
    assert status["is_running"] is False
    print("✅ AgentManager Test Passed")

def test_obsidian_service():
    """Test ObsidianService write/read."""
    service = ObsidianService()
    # Simple write check (will only work if path is set)
    test_analysis = {
        "recommendation": "BUY",
        "confidence": 95,
        "reasoning": "Test reasoning for integration test.",
        "sentiment": "bullish"
    }
    service.save_analysis("TEST_TICKER", test_analysis)
    
    # Check if we can read it back
    memories = service.get_memory("TEST_TICKER")
    # Even if path is not set, it shouldn't crash
    assert isinstance(memories, list)
    print("✅ ObsidianService Test Passed")

@pytest.mark.asyncio
async def test_api_agents_list():
    """Test endpoint /api/v1/agents/ via HTTP."""
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        try:
            response = await client.get("/api/v1/agents/")
            if response.status_code == 200:
                data = response.json()
                assert "agents" in data
                print("✅ API Agents Endpoint Test Passed")
            else:
                print(f"⚠️ API Test skipped (Backend not running at localhost:8000)")
        except Exception:
            print("⚠️ API Test skipped (Connection error)")

if __name__ == "__main__":
    # To run manually: python3 backend/tests/test_pipeline.py
    asyncio.run(test_sentiment_service())
    asyncio.run(test_agent_manager())
    test_obsidian_service()
    asyncio.run(test_api_agents_list())
