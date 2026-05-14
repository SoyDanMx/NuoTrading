-- Supabase / PostgreSQL migration for Phase A: Signal Account Tracking
-- Run once in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS signal_accounts (
    handle          VARCHAR(100) PRIMARY KEY,
    followers       INTEGER      NOT NULL DEFAULT 0,
    accuracy_score  FLOAT        NOT NULL DEFAULT 0.5,
    total_signals   INTEGER      NOT NULL DEFAULT 0,
    correct_signals INTEGER      NOT NULL DEFAULT 0,
    category        VARCHAR(50)  NOT NULL DEFAULT 'general',  -- earnings | options | macro | breaking | general
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Seed with initial monitored accounts
INSERT INTO signal_accounts (handle, followers, accuracy_score, total_signals, correct_signals, category)
VALUES
    ('eWhispers',      150000,  0.72, 0, 0, 'earnings'),
    ('unusual_whales', 890000,  0.68, 0, 0, 'options'),
    ('DeItaone',       650000,  0.61, 0, 0, 'breaking'),
    ('KobeissiLetter', 420000,  0.65, 0, 0, 'macro'),
    ('zerohedge',      1200000, 0.55, 0, 0, 'macro')
ON CONFLICT (handle) DO NOTHING;

-- Table to store raw social signals for accuracy tracking
CREATE TABLE IF NOT EXISTS social_signals (
    id          BIGSERIAL    PRIMARY KEY,
    symbol      VARCHAR(20)  NOT NULL,
    source      VARCHAR(20)  NOT NULL,  -- 'reddit' | 'twitter'
    handle      VARCHAR(100),           -- twitter handle if applicable
    score       FLOAT        NOT NULL,  -- -1.0 to 1.0
    signal      VARCHAR(10)  NOT NULL,  -- BULLISH | BEARISH | NEUTRAL
    weight      FLOAT        NOT NULL DEFAULT 1.0,
    raw_text    TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_signals_symbol ON social_signals (symbol, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_signals_source ON social_signals (source, created_at DESC);
