from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict
from app.services.accuracy_engine import AccuracyEngine

router = APIRouter()
accuracy_engine = AccuracyEngine()

@router.get("/report")
async def get_overall_report(symbol: Optional[str] = None):
    """Get the overall accuracy report for the entire agent or a specific symbol."""
    report = await accuracy_engine.get_accuracy_report(symbol)
    if "error" in report:
        raise HTTPException(status_code=500, detail=report["error"])
    return report

@router.get("/predictions/{symbol}")
async def get_ticker_predictions(symbol: str, limit: int = Query(10, le=50)):
    """Get the latest evaluated predictions for a specific ticker."""
    predictions = await accuracy_engine.get_latest_predictions(symbol=symbol.upper(), limit=limit)
    return {"symbol": symbol.upper(), "predictions": predictions}

@router.post("/evaluate")
async def force_evaluation():
    """Manually trigger the evaluation of pending predictions (older than 24h)."""
    try:
        await accuracy_engine.evaluate_predictions()
        return {"message": "Evaluation process triggered successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
