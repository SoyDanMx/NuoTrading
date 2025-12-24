from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class Order(Base):
    __table_args__ = {"schema": "trading"}
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("trading.user.id", ondelete="CASCADE"))
    strategy_id = Column(Integer, ForeignKey("trading.strategies.id", ondelete="SET NULL"), nullable=True)
    symbol = Column(String, nullable=False, index=True)
    side = Column(String, nullable=False) # 'buy' or 'sell'
    order_type = Column(String, nullable=False) # 'market', 'limit', etc.
    amount = Column(Numeric(20, 8), nullable=False)
    price = Column(Numeric(20, 8))
    status = Column(String, nullable=False, index=True) # 'pending', 'open', 'filled', 'cancelled'
    filled_amount = Column(Numeric(20, 8), default=0)
    average_price = Column(Numeric(20, 8))
    exchange_order_id = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User")
    strategy = relationship("Strategy")
