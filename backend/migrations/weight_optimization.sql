-- Weight Auto-Adjustment Migration
-- Track historical adjustments to skill weights

CREATE TABLE IF NOT EXISTS weight_adjustments (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adjusted_at       TIMESTAMPTZ DEFAULT NOW(),
    reason            VARCHAR(255),
    weights_before    JSONB NOT NULL,
    weights_after     JSONB NOT NULL,
    accuracy_snapshot JSONB NOT NULL
);

-- Add column to skill_accuracy if it doesn't exist (from previous phase)
-- Already added in accuracy_engine.sql but adding here just in case for idempotency
ALTER TABLE skill_accuracy ADD COLUMN IF NOT EXISTS current_weight FLOAT DEFAULT 0.0;

-- Track adjustment events for the audit log
CREATE INDEX IF NOT EXISTS idx_weight_adjustments_date ON weight_adjustments (adjusted_at DESC);
