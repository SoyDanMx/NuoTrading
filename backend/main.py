from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router

app = FastAPI(
    title="NUO TRADE API",
    description="Algorithmic Trading Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(api_router, prefix="/api/v1")

import asyncio
from app.services.yfinance_service import yfinance_service

@app.on_event("startup")
async def startup_event():
    import os
    print("--- DEPLOYMENT DIAGNOSTICS ---")
    print(f"ANTHROPIC configurado: {bool(os.environ.get('ANTHROPIC_API_KEY'))}")
    print(f"GROQ configurado: {bool(os.environ.get('GROQ_API_KEY'))}")
    print(f"SUPABASE_URL configurado: {bool(os.environ.get('SUPABASE_URL'))}")
    print(f"DATABASE_URL detectada: {bool(settings.DATABASE_URL and 'supabase' in settings.DATABASE_URL)}")
    print("------------------------------")
    
    # Start the yfinance real-time price WebSocket stream in the background
    asyncio.create_task(yfinance_service.start_price_stream())

@app.get("/")
async def root():
    return {
        "message": "NUO TRADE API",
        "version": "1.0.0",
        "status": "operational"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/health/finnhub")
async def health_finnhub():
    """Check if Finnhub API key is set (does not expose the key)."""
    key = settings.FINNHUB_API_KEY or ""
    key = key.strip()
    if len(key) > 20:
        key = key[:20]
    configured = bool(key and key != "demo")
    return {
        "finnhub_configured": configured,
        "key_length": len(key) if configured else 0,
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
