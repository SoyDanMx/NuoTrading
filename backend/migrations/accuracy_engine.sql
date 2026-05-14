-- Accuracy Engine Migration
-- Track agent predictions and evaluate success after 24h

CREATE TABLE IF NOT EXISTS signal_predictions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol           VARCHAR(20) NOT NULL,
    signal           VARCHAR(20) NOT NULL,        -- COMPRA | VENTA | MANTENER
    confidence       FLOAT       NOT NULL,
    price_at_signal  FLOAT       NOT NULL,
    final_score      FLOAT       NOT NULL,
    skills_breakdown JSONB       NOT NULL,         -- { "Technical": 0.8, "Sentiment": -0.2, ... }
    sources          JSONB       DEFAULT '{}'::jsonb,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    
    -- Evaluation data (filled 24h later)
    price_24h        FLOAT,
    price_change_pct FLOAT,
    was_correct      BOOLEAN,
    evaluated_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS skill_accuracy (
    skill_name           VARCHAR(100) PRIMARY KEY,
    total_predictions    INTEGER DEFAULT 0,
    correct_predictions  INTEGER DEFAULT 0,
    accuracy_score       FLOAT   DEFAULT 0.0,
    avg_confidence       FLOAT   DEFAULT 0.0,
    current_weight       FLOAT   DEFAULT 0.0,
    last_updated         TIMESTAMPTZ DEFAULT NOW()
);

-- Index for unevaluated predictions
CREATE INDEX IF NOT EXISTS idx_predictions_unevaluated 
ON signal_predictions (created_at) 
WHERE evaluated_at IS NULL;

-- Initial seed for skills if they don't exist
INSERT INTO skill_accuracy (skill_name, current_weight) VALUES
    ('Análisis Técnico', 0.30),
    ('Sentimiento Social', 0.25),
    ('Flujo de Opciones', 0.20),
    ('Monitor de Earnings', 0.15),
    ('Señales Sociales (X/Reddit)', 0.10)
ON CONFLICT (skill_name) DO UPDATE SET current_weight = EXCLUDED.current_weight;
