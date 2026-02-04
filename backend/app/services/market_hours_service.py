"""
Market Hours Service - Gestión de horarios de mercado NYSE/NASDAQ
Basado en análisis de Robinhood: trading 24 horas y validación de horarios
"""
import logging
from datetime import datetime, time, timedelta
from typing import Dict, Optional
import pytz

logger = logging.getLogger(__name__)

logger = logging.getLogger(__name__)

class MarketHoursService:
    """Servicio para gestionar horarios de mercado NYSE/NASDAQ"""
    
    # Horarios estándar del mercado (EST/EDT)
    MARKET_OPEN = time(9, 30)  # 9:30 AM EST
    MARKET_CLOSE = time(16, 0)  # 4:00 PM EST
    PRE_MARKET_OPEN = time(4, 0)  # 4:00 AM EST
    AFTER_HOURS_CLOSE = time(20, 0)  # 8:00 PM EST
    
    # Zona horaria del mercado
    MARKET_TZ = pytz.timezone('US/Eastern')
    
    def __init__(self):
        """Inicializar servicio de horarios de mercado"""
        self._holidays = self._load_holidays()
    
    def _load_holidays(self) -> set:
        """Cargar días festivos del mercado (simplificado)"""
        # En producción, usar librería como pandas_market_calendars
        # Por ahora, días festivos comunes 2024-2025
        holidays = {
            datetime(2024, 1, 1).date(),   # New Year's Day
            datetime(2024, 1, 15).date(),  # Martin Luther King Jr. Day
            datetime(2024, 2, 19).date(),  # Presidents' Day
            datetime(2024, 3, 29).date(),  # Good Friday
            datetime(2024, 5, 27).date(),  # Memorial Day
            datetime(2024, 6, 19).date(),  # Juneteenth
            datetime(2024, 7, 4).date(),   # Independence Day
            datetime(2024, 9, 2).date(),   # Labor Day
            datetime(2024, 11, 28).date(),  # Thanksgiving
            datetime(2024, 12, 25).date(), # Christmas
            datetime(2025, 1, 1).date(),   # New Year's Day
            datetime(2025, 1, 20).date(),  # Martin Luther King Jr. Day
            datetime(2025, 2, 17).date(),  # Presidents' Day
            datetime(2025, 4, 18).date(),  # Good Friday
            datetime(2025, 5, 26).date(),  # Memorial Day
            datetime(2025, 6, 19).date(),  # Juneteenth
            datetime(2025, 7, 4).date(),   # Independence Day
            datetime(2025, 9, 1).date(),   # Labor Day
            datetime(2025, 11, 27).date(), # Thanksgiving
            datetime(2025, 12, 25).date(), # Christmas
        }
        return holidays
    
    def _is_weekend(self, dt: datetime) -> bool:
        """Verificar si es fin de semana"""
        return dt.weekday() >= 5  # Saturday = 5, Sunday = 6
    
    def _is_holiday(self, dt: datetime) -> bool:
        """Verificar si es día festivo"""
        return dt.date() in self._holidays
    
    def _is_market_day(self, dt: datetime) -> bool:
        """Verificar si es día de mercado (no fin de semana ni festivo)"""
        if self._is_weekend(dt):
            return False
        if self._is_holiday(dt):
            return False
        return True
    
    def _get_market_time(self, dt: Optional[datetime] = None) -> datetime:
        """Obtener tiempo actual en zona horaria del mercado"""
        if dt is None:
            dt = datetime.now()
        # Convertir a zona horaria del mercado
        if dt.tzinfo is None:
            dt = pytz.utc.localize(dt)
        return dt.astimezone(self.MARKET_TZ)
    
    def is_market_open(self, dt: Optional[datetime] = None) -> bool:
        """Verificar si el mercado está abierto"""
        market_dt = self._get_market_time(dt)
        
        if not self._is_market_day(market_dt):
            return False
        
        current_time = market_dt.time()
        return self.MARKET_OPEN <= current_time < self.MARKET_CLOSE
    
    def is_pre_market(self, dt: Optional[datetime] = None) -> bool:
        """Verificar si es pre-market"""
        market_dt = self._get_market_time(dt)
        
        if not self._is_market_day(market_dt):
            return False
        
        current_time = market_dt.time()
        return self.PRE_MARKET_OPEN <= current_time < self.MARKET_OPEN
    
    def is_after_hours(self, dt: Optional[datetime] = None) -> bool:
        """Verificar si es after-hours"""
        market_dt = self._get_market_time(dt)
        
        if not self._is_market_day(market_dt):
            return False
        
        current_time = market_dt.time()
        return self.MARKET_CLOSE <= current_time < self.AFTER_HOURS_CLOSE
    
    def is_extended_hours(self, dt: Optional[datetime] = None) -> bool:
        """Verificar si es extended hours (pre-market o after-hours)"""
        return self.is_pre_market(dt) or self.is_after_hours(dt)
    
    def get_market_status(self, dt: Optional[datetime] = None) -> Dict:
        """Obtener estado completo del mercado"""
        market_dt = self._get_market_time(dt)
        is_open = self.is_market_open(dt)
        is_pre = self.is_pre_market(dt)
        is_after = self.is_after_hours(dt)
        
        # Calcular próximo open/close
        next_open = self.get_next_open(market_dt)
        next_close = self.get_next_close(market_dt)
        
        return {
            "is_open": is_open,
            "is_pre_market": is_pre,
            "is_after_hours": is_after,
            "is_extended_hours": is_pre or is_after,
            "is_market_day": self._is_market_day(market_dt),
            "current_time": market_dt.isoformat(),
            "market_timezone": "US/Eastern",
            "next_open": next_open.isoformat() if next_open else None,
            "next_close": next_close.isoformat() if next_close else None,
            "market_open_time": self.MARKET_OPEN.isoformat(),
            "market_close_time": self.MARKET_CLOSE.isoformat(),
        }
    
    def get_next_open(self, dt: Optional[datetime] = None) -> Optional[datetime]:
        """Obtener próximo horario de apertura del mercado"""
        market_dt = self._get_market_time(dt)
        candidate = market_dt.replace(hour=self.MARKET_OPEN.hour, minute=self.MARKET_OPEN.minute, second=0, microsecond=0)
        
        # Si ya pasó el open de hoy, buscar el siguiente día
        if candidate <= market_dt or not self._is_market_day(candidate):
            candidate += timedelta(days=1)
            while not self._is_market_day(candidate):
                candidate += timedelta(days=1)
        
        return candidate
    
    def get_next_close(self, dt: Optional[datetime] = None) -> Optional[datetime]:
        """Obtener próximo horario de cierre del mercado"""
        market_dt = self._get_market_time(dt)
        candidate = market_dt.replace(hour=self.MARKET_CLOSE.hour, minute=self.MARKET_CLOSE.minute, second=0, microsecond=0)
        
        # Si ya pasó el close de hoy, buscar el siguiente día
        if candidate <= market_dt or not self._is_market_day(candidate):
            candidate += timedelta(days=1)
            while not self._is_market_day(candidate):
                candidate += timedelta(days=1)
            candidate = candidate.replace(hour=self.MARKET_CLOSE.hour, minute=self.MARKET_CLOSE.minute)
        
        return candidate
    
    def can_trade_now(self, order_type: str = "market") -> bool:
        """Verificar si se puede operar ahora según tipo de orden"""
        # Market orders: solo durante horas de mercado
        if order_type == "market":
            return self.is_market_open()
        
        # Limit orders: pueden crearse en cualquier momento
        if order_type == "limit":
            return self.is_market_open() or self.is_extended_hours()
        
        # Stop orders: solo durante horas de mercado
        if order_type == "stop":
            return self.is_market_open()
        
        return False
    
    def get_trading_window(self) -> Dict:
        """Obtener ventana de trading actual"""
        status = self.get_market_status()
        
        if status["is_open"]:
            return {
                "window": "regular",
                "message": "Mercado abierto",
                "can_trade": True
            }
        elif status["is_pre_market"]:
            return {
                "window": "pre_market",
                "message": "Pre-market (solo órdenes limit)",
                "can_trade": False
            }
        elif status["is_after_hours"]:
            return {
                "window": "after_hours",
                "message": "After-hours (solo órdenes limit)",
                "can_trade": False
            }
        else:
            return {
                "window": "closed",
                "message": "Mercado cerrado",
                "can_trade": False
            }
