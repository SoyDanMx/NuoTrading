from fastapi import APIRouter, Depends, HTTPException
from typing import List, Any
from sqlalchemy.orm import Session
from app.api.deps import get_db
# I'll check health.py for get_db or core
router = APIRouter()

@router.get("")
async def get_portfolio():
    """Get summarized portfolio."""
    # Mock data for now to show on the compact UI
    return {
        "balance": 12500.50,
        "pnl_daily": 345.20,
        "pnl_percent": 2.8,
        "positions": [
            {"symbol": "SOXL", "amount": 100, "entry": 42.50, "current": 43.12, "pnl": 62.00},
            {"symbol": "TSLA", "amount": 10, "entry": 240.10, "current": 253.20, "pnl": 131.00},
            {"symbol": "NVDA", "amount": 5, "entry": 480.00, "current": 492.25, "pnl": 61.25}
        ]
    }
