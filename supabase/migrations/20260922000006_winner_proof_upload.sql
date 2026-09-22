-- Migration for Winner Proof Upload & Payout Tracking
-- Adds proof upload columns and payment status tracking to winners table.

-- 1. Add proof upload columns to winners table
ALTER TABLE winners
ADD COLUMN IF NOT EXISTS proof_url TEXT;

ALTER TABLE winners
ADD COLUMN IF NOT EXISTS proof_uploaded_at TIMESTAMPTZ;

-- 2. Add payment tracking columns to winners table
-- payment_status tracks the administrative payout state (unpaid → paid).
-- No real bank transfers are involved (see Assumption A-018).
ALTER TABLE winners
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'
CHECK (payment_status IN ('unpaid', 'paid'));

ALTER TABLE winners
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE winners
ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES profiles(id);

-- 3. Index for payment status queries
CREATE INDEX IF NOT EXISTS idx_winners_payment_status ON winners(payment_status);
