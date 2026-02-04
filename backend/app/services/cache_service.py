"""
Cache Service - Cache inteligente con Redis
Basado en análisis de Robinhood: cache eficiente para reducir llamadas a APIs
"""
import json
import logging
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
import redis.asyncio as redis
from app.core.config import settings

logger = logging.getLogger(__name__)

class CacheService:
    """Servicio de cache inteligente con TTL dinámico"""
    
    def __init__(self):
        """Inicializar servicio de cache"""
        self.redis_client: Optional[redis.Redis] = None
        self._connected = False
    
    async def connect(self):
        """Conectar a Redis"""
        if self._connected:
            return
        
        try:
            redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379/0')
            self.redis_client = await redis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            self._connected = True
            logger.info("Redis cache connected")
        except Exception as e:
            logger.warning(f"Redis not available, cache disabled: {e}")
            self._connected = False
    
    async def disconnect(self):
        """Desconectar de Redis"""
        if self.redis_client:
            await self.redis_client.close()
            self._connected = False
    
    def _get_quote_key(self, symbol: str) -> str:
        """Obtener key de cache para quote"""
        return f"quote:{symbol.upper()}"
    
    def _get_indicators_key(self, symbol: str) -> str:
        """Obtener key de cache para indicadores"""
        return f"indicators:{symbol.upper()}"
    
    def _get_analysis_key(self, symbol: str) -> str:
        """Obtener key de cache para análisis completo"""
        return f"analysis:{symbol.upper()}"
    
    def _get_market_hours_key(self) -> str:
        """Obtener key de cache para horarios de mercado"""
        return "market:hours"
    
    async def get_cached_quote(self, symbol: str) -> Optional[Dict]:
        """Obtener quote del cache con TTL inteligente"""
        if not self._connected:
            await self.connect()
        
        if not self._connected or not self.redis_client:
            return None
        
        try:
            key = self._get_quote_key(symbol)
            cached = await self.redis_client.get(key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Error reading cache for {symbol}: {e}")
        
        return None
    
    async def cache_quote(self, symbol: str, quote: Dict, ttl: Optional[int] = None):
        """Cachear quote con TTL dinámico"""
        if not self._connected:
            await self.connect()
        
        if not self._connected or not self.redis_client:
            return
        
        try:
            key = self._get_quote_key(symbol)
            
            # TTL dinámico: corto durante horas de mercado, largo fuera de horas
            if ttl is None:
                from app.services.market_hours_service import MarketHoursService
                market_service = MarketHoursService()
                if market_service.is_market_open():
                    ttl = 5  # 5 segundos durante mercado abierto
                elif market_service.is_extended_hours():
                    ttl = 30  # 30 segundos en extended hours
                else:
                    ttl = 300  # 5 minutos cuando mercado cerrado
            
            await self.redis_client.setex(
                key,
                ttl,
                json.dumps(quote)
            )
        except Exception as e:
            logger.warning(f"Error caching quote for {symbol}: {e}")
    
    async def get_cached_indicators(self, symbol: str) -> Optional[Dict]:
        """Obtener indicadores del cache"""
        if not self._connected:
            await self.connect()
        
        if not self._connected or not self.redis_client:
            return None
        
        try:
            key = self._get_indicators_key(symbol)
            cached = await self.redis_client.get(key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Error reading indicators cache for {symbol}: {e}")
        
        return None
    
    async def cache_indicators(self, symbol: str, indicators: Dict, ttl: int = 300):
        """Cachear indicadores técnicos"""
        if not self._connected:
            await self.connect()
        
        if not self._connected or not self.redis_client:
            return
        
        try:
            key = self._get_indicators_key(symbol)
            await self.redis_client.setex(
                key,
                ttl,
                json.dumps(indicators)
            )
        except Exception as e:
            logger.warning(f"Error caching indicators for {symbol}: {e}")
    
    async def get_cached_analysis(self, symbol: str) -> Optional[Dict]:
        """Obtener análisis completo del cache"""
        if not self._connected:
            await self.connect()
        
        if not self._connected or not self.redis_client:
            return None
        
        try:
            key = self._get_analysis_key(symbol)
            cached = await self.redis_client.get(key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Error reading analysis cache for {symbol}: {e}")
        
        return None
    
    async def cache_analysis(self, symbol: str, analysis: Dict, ttl: int = 60):
        """Cachear análisis completo"""
        if not self._connected:
            await self.connect()
        
        if not self._connected or not self.redis_client:
            return
        
        try:
            key = self._get_analysis_key(symbol)
            await self.redis_client.setex(
                key,
                ttl,
                json.dumps(analysis)
            )
        except Exception as e:
            logger.warning(f"Error caching analysis for {symbol}: {e}")
    
    async def invalidate_symbol(self, symbol: str):
        """Invalidar cache de un símbolo"""
        if not self._connected:
            await self.connect()
        
        if not self._connected or not self.redis_client:
            return
        
        try:
            keys = [
                self._get_quote_key(symbol),
                self._get_indicators_key(symbol),
                self._get_analysis_key(symbol),
            ]
            await self.redis_client.delete(*keys)
        except Exception as e:
            logger.warning(f"Error invalidating cache for {symbol}: {e}")
    
    async def get_cache_stats(self) -> Dict:
        """Obtener estadísticas del cache"""
        if not self._connected:
            await self.connect()
        
        if not self._connected or not self.redis_client:
            return {"connected": False}
        
        try:
            info = await self.redis_client.info("stats")
            return {
                "connected": True,
                "keys": await self.redis_client.dbsize(),
                "hits": info.get("keyspace_hits", 0),
                "misses": info.get("keyspace_misses", 0),
            }
        except Exception as e:
            logger.warning(f"Error getting cache stats: {e}")
            return {"connected": False, "error": str(e)}
