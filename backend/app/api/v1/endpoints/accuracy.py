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

@router.post("/adjust")
async def trigger_adjustment(force: bool = Query(False)):
    """Manually trigger the weight rebalancing logic."""
    result = await accuracy_engine.auto_adjust_weights(force=force)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.get("/adjustments")
async def list_adjustments(limit: int = Query(10)):
    """List historical weight adjustments."""
    from sqlalchemy import text
    query = text("SELECT * FROM weight_adjustments ORDER BY adjusted_at DESC LIMIT :limit")
    try:
        with accuracy_engine.db.connect() as conn:
            results = conn.execute(query, {"limit": limit}).fetchall()
            return [dict(row._mapping) for row in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rollback/{adjustment_id}")
async def rollback_adjustment(adjustment_id: str):
    """Revert to a previous weight state."""
    result = await accuracy_engine.rollback_adjustment(adjustment_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result
