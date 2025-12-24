from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class Position(Base):
    __table_args__ = {"schema": "trading"}
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("trading.user.id", ondelete="CASCADE"))
    strategy_id = Column(Integer, ForeignKey("trading.strategies.id", ondelete="SET NULL"), nullable=True)
    symbol = Column(String, nullable=False, index=True)
    side = Column(String, nullable=False)
    amount = Column(Numeric(20, 8), nullable=False)
    entry_price = Column(Numeric(20, 8), nullable=False)
    current_price = Column(Numeric(20, 8))
    unrealized_pnl = Column(Numeric(20, 8))
    is_open = Column(Boolean, default=True, index=True)
    opened_at = Column(DateTime(timezone=True), server_default=func.now())
    closed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User")
    strategy = relationship("Strategy")
