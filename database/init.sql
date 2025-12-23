-- Initialize TimescaleDB Extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Set timezone
SET timezone = 'UTC';

-- Enable TimescaleDB telemetry off
ALTER SYSTEM SET timescaledb.telemetry_level = off;

-- Create schema for trading data
CREATE SCHEMA IF NOT EXISTS trading;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA trading TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA trading TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA trading TO postgres;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'TimescaleDB initialized successfully';
END $$;
