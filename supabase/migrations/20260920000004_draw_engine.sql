-- Migration for Phase 7: Draw & Reward Engine
-- Add draw_mode, total_pool_cents, and seed to draws table

ALTER TABLE draws
ADD COLUMN IF NOT EXISTS draw_mode TEXT NOT NULL DEFAULT 'random' CHECK (draw_mode IN ('random', 'algorithmic'));

ALTER TABLE draws
ADD COLUMN IF NOT EXISTS total_pool_cents INTEGER NOT NULL DEFAULT 0;

ALTER TABLE draws
ADD COLUMN IF NOT EXISTS seed TEXT;

-- Index to optimize querying draws by period and status
CREATE INDEX IF NOT EXISTS idx_draws_period_status ON draws(draw_period, status);
