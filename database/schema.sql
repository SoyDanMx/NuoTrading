-- =====================================================
-- NUO TRADE Database Schema
-- =====================================================

-- Users Table
CREATE TABLE IF NOT EXISTS trading.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON trading.users(email);
CREATE INDEX idx_users_username ON trading.users(username);

-- Trading Strategies Table
CREATE TABLE IF NOT EXISTS trading.strategies (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES trading.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    symbol VARCHAR(50) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    parameters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_strategies_user_id ON trading.strategies(user_id);
CREATE INDEX idx_strategies_symbol ON trading.strategies(symbol);

-- Orders Table
CREATE TABLE IF NOT EXISTS trading.orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES trading.users(id) ON DELETE CASCADE,
    strategy_id INTEGER REFERENCES trading.strategies(id) ON DELETE SET NULL,
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL, -- 'buy' or 'sell'
    order_type VARCHAR(20) NOT NULL, -- 'market', 'limit', etc.
    amount DECIMAL(20, 8) NOT NULL,
    price DECIMAL(20, 8),
    status VARCHAR(20) NOT NULL, -- 'pending', 'open', 'filled', 'cancelled'
    filled_amount DECIMAL(20, 8) DEFAULT 0,
    average_price DECIMAL(20, 8),
    exchange_order_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON trading.orders(user_id);
CREATE INDEX idx_orders_strategy_id ON trading.orders(strategy_id);
CREATE INDEX idx_orders_symbol ON trading.orders(symbol);
CREATE INDEX idx_orders_status ON trading.orders(status);

-- Positions Table
CREATE TABLE IF NOT EXISTS trading.positions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES trading.users(id) ON DELETE CASCADE,
    strategy_id INTEGER REFERENCES trading.strategies(id) ON DELETE SET NULL,
    symbol VARCHAR(50) NOT NULL,
    side VARCHAR(10) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    entry_price DECIMAL(20, 8) NOT NULL,
    current_price DECIMAL(20, 8),
    unrealized_pnl DECIMAL(20, 8),
    is_open BOOLEAN DEFAULT TRUE,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_positions_user_id ON trading.positions(user_id);
CREATE INDEX idx_positions_symbol ON trading.positions(symbol);
CREATE INDEX idx_positions_is_open ON trading.positions(is_open);

-- OHLCV (Market Data) Table - Time-series optimized
CREATE TABLE IF NOT EXISTS trading.ohlcv (
    time TIMESTAMP WITH TIME ZONE NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    open DECIMAL(20, 8) NOT NULL,
    high DECIMAL(20, 8) NOT NULL,
    low DECIMAL(20, 8) NOT NULL,
    close DECIMAL(20, 8) NOT NULL,
    volume DECIMAL(30, 8) NOT NULL,
    PRIMARY KEY (time, symbol, timeframe)
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('trading.ohlcv', 'time', if_not_exists => TRUE);

-- Create indexes for OHLCV
CREATE INDEX idx_ohlcv_symbol_time ON trading.ohlcv(symbol, time DESC);
CREATE INDEX idx_ohlcv_timeframe ON trading.ohlcv(timeframe);

-- Add compression policy (compress data older than 7 days)
ALTER TABLE trading.ohlcv SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'symbol,timeframe'
);

SELECT add_compression_policy('trading.ohlcv', INTERVAL '7 days', if_not_exists => TRUE);

-- Add retention policy (keep data for 2 years)
SELECT add_retention_policy('trading.ohlcv', INTERVAL '2 years', if_not_exists => TRUE);

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS trading.performance_metrics (
    id SERIAL PRIMARY KEY,
    strategy_id INTEGER REFERENCES trading.strategies(id) ON DELETE CASCADE,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    total_profit DECIMAL(20, 8) DEFAULT 0,
    total_loss DECIMAL(20, 8) DEFAULT 0,
    win_rate DECIMAL(5, 2),
    sharpe_ratio DECIMAL(10, 4),
    max_drawdown DECIMAL(10, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_performance_strategy_id ON trading.performance_metrics(strategy_id);
CREATE INDEX idx_performance_period ON trading.performance_metrics(period_start, period_end);

-- Backtest Results Table
CREATE TABLE IF NOT EXISTS trading.backtest_results (
    id SERIAL PRIMARY KEY,
    strategy_id INTEGER REFERENCES trading.strategies(id) ON DELETE CASCADE,
    symbol VARCHAR(50) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    initial_capital DECIMAL(20, 8) NOT NULL,
    final_equity DECIMAL(20, 8) NOT NULL,
    total_return DECIMAL(10, 4),
    total_trades INTEGER,
    win_rate DECIMAL(5, 2),
    results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_backtest_strategy_id ON trading.backtest_results(strategy_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION trading.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON trading.users
    FOR EACH ROW EXECUTE FUNCTION trading.update_updated_at_column();

CREATE TRIGGER update_strategies_updated_at BEFORE UPDATE ON trading.strategies
    FOR EACH ROW EXECUTE FUNCTION trading.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON trading.orders
    FOR EACH ROW EXECUTE FUNCTION trading.update_updated_at_column();

-- Log schema creation
DO $$
BEGIN
    RAISE NOTICE 'Database schema created successfully';
END $$;
