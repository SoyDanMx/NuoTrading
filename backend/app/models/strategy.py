from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base_class import Base

class Strategy(Base):
    __table_args__ = {"schema": "trading"}
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("trading.user.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    description = Column(String)
    symbol = Column(String, nullable=False, index=True)
    timeframe = Column(String, nullable=False)
    is_active = Column(Boolean, default=False)
    parameters = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="strategies")
