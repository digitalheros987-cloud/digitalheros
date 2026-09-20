-- Migration for Phase 8: Winner Verification & Dashboard
-- Enhances the winners table with audit snapshots, verification status, and strict RLS.

-- 1. Add audit snapshot and verification columns to winners table
ALTER TABLE winners
ADD COLUMN IF NOT EXISTS match_count INTEGER NOT NULL DEFAULT 0 CHECK (match_count >= 0 AND match_count <= 5);

ALTER TABLE winners
ADD COLUMN IF NOT EXISTS scores_snapshot INTEGER[];

ALTER TABLE winners
ADD COLUMN IF NOT EXISTS winning_numbers_snapshot INTEGER[];

ALTER TABLE winners
ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected'));

ALTER TABLE winners
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE winners
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id);

ALTER TABLE winners
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 2. Add unique constraint so a user can win at most one prize per draw (Assumption A-014)
CREATE UNIQUE INDEX IF NOT EXISTS idx_winners_draw_user ON winners(draw_id, user_id);

-- 3. Enhance Winner Row Level Security (RLS)
-- Drop the old permissive policy that let any user read all winners
DROP POLICY IF EXISTS "Users can view published winners" ON winners;

-- Users can only read their own winner records for published draws
CREATE POLICY "Users can view own winner records" ON winners
FOR SELECT USING (
    auth.uid() = user_id AND EXISTS (
        SELECT 1 FROM draws WHERE draws.id = winners.draw_id AND draws.status = 'published'
    )
);

-- Ensure Admins have full access
DROP POLICY IF EXISTS "Admins can view all winners" ON winners;
CREATE POLICY "Admins can view all winners" ON winners FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage winners" ON winners;
CREATE POLICY "Admins can manage winners" ON winners FOR ALL USING (is_admin());

-- Additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_winners_verification_status ON winners(verification_status);
CREATE INDEX IF NOT EXISTS idx_winners_created_at ON winners(created_at DESC);
