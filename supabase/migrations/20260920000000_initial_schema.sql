-- Initial Schema for Digital Heroes

-- 1. Custom Types / Enums
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE account_status AS ENUM ('active', 'suspended', 'banned');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'unpaid', 'incomplete');
CREATE TYPE plan_type AS ENUM ('monthly', 'yearly');
CREATE TYPE draw_status AS ENUM ('pending', 'simulated', 'published');
CREATE TYPE winner_status AS ENUM ('pending_proof', 'reviewing', 'approved', 'rejected', 'paid', 'forfeited');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE ledger_status AS ENUM ('pending', 'paid');

-- 2. Profiles
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role user_role NOT NULL DEFAULT 'user',
    status account_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Charities
CREATE TABLE charities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_spotlight BOOLEAN NOT NULL DEFAULT false,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. User Charity Selections
CREATE TABLE user_charity_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    charity_id UUID NOT NULL REFERENCES charities(id),
    contribution_percentage INTEGER NOT NULL DEFAULT 10 CHECK (contribution_percentage >= 10 AND contribution_percentage <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL,
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    status subscription_status NOT NULL,
    plan plan_type NOT NULL,
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Golf Scores
CREATE TABLE scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    score_value INTEGER NOT NULL CHECK (score_value >= 1 AND score_value <= 45),
    date_played DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, date_played)
);

-- 7. Draws
CREATE TABLE draws (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_period TEXT NOT NULL, -- e.g., '2026-03'
    status draw_status NOT NULL DEFAULT 'pending',
    execution_timestamp TIMESTAMPTZ,
    jackpot_amount_cents INTEGER NOT NULL DEFAULT 0,
    algorithm_version TEXT,
    audit_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Draw Results / Numbers
CREATE TABLE draw_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE UNIQUE,
    winning_numbers INTEGER[] NOT NULL CHECK (array_length(winning_numbers, 1) = 5),
    algorithm_version TEXT NOT NULL,
    metadata JSONB, -- Stores specific run parameters (e.g., random seed)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Draw Entries
CREATE TABLE draw_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_eligible BOOLEAN NOT NULL,
    scores_snapshot INTEGER[] CHECK (array_length(scores_snapshot, 1) = 5),
    consistency_metric FLOAT, -- Standard deviation or similar
    draw_weight FLOAT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(draw_id, user_id)
);

-- 10. Prize Tiers
CREATE TABLE prize_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
    match_tier INTEGER NOT NULL CHECK (match_tier IN (3, 4, 5)),
    percentage_allocation INTEGER NOT NULL,
    total_amount_cents INTEGER NOT NULL,
    rollover_amount_cents INTEGER NOT NULL DEFAULT 0,
    is_claimed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(draw_id, match_tier)
);

-- 11. Winners
CREATE TABLE winners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draw_id UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    match_tier INTEGER NOT NULL CHECK (match_tier IN (3, 4, 5)),
    prize_amount_cents INTEGER NOT NULL,
    status winner_status NOT NULL DEFAULT 'pending_proof',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Winner Verifications (Proof)
CREATE TABLE winner_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    winner_id UUID NOT NULL REFERENCES winners(id) ON DELETE CASCADE UNIQUE,
    proof_url TEXT NOT NULL,
    status verification_status NOT NULL DEFAULT 'pending',
    verified_by UUID REFERENCES profiles(id),
    verified_at TIMESTAMPTZ,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Charity Contribution Ledger
CREATE TABLE charity_contribution_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    charity_id UUID NOT NULL REFERENCES charities(id),
    source_period TEXT NOT NULL, -- e.g., '2026-03'
    amount_cents INTEGER NOT NULL,
    status ledger_status NOT NULL DEFAULT 'pending',
    transaction_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Financial / Payment Records
CREATE TABLE payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_invoice_id TEXT NOT NULL UNIQUE,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL, -- Stripe status
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_scores_user_id ON scores(user_id);
CREATE INDEX idx_scores_date_played ON scores(date_played DESC);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_sub_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_draw_entries_draw_id ON draw_entries(draw_id);
CREATE INDEX idx_draw_entries_user_id ON draw_entries(user_id);
CREATE INDEX idx_winners_draw_id ON winners(draw_id);
CREATE INDEX idx_winners_user_id ON winners(user_id);
CREATE INDEX idx_ledger_charity_id ON charity_contribution_ledger(charity_id);
CREATE INDEX idx_ledger_status ON charity_contribution_ledger(status);

-- Security: Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_charity_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE draw_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE winner_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE charity_contribution_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create helper function for admin check
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles RLS
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (is_admin());

-- Charities RLS
CREATE POLICY "Anyone can view active charities" ON charities FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "Admins can manage charities" ON charities FOR ALL USING (is_admin());

-- User Charity Selections RLS
CREATE POLICY "Users can view own charity selection" ON user_charity_selections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own charity selection" ON user_charity_selections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own charity selection" ON user_charity_selections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all charity selections" ON user_charity_selections FOR SELECT USING (is_admin());

-- Subscriptions RLS
CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all subscriptions" ON subscriptions FOR SELECT USING (is_admin());

-- Scores RLS
CREATE POLICY "Users can view own scores" ON scores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scores" ON scores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scores" ON scores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scores" ON scores FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all scores" ON scores FOR SELECT USING (is_admin());

-- Draws RLS (Users can only see published draws)
CREATE POLICY "Users can view published draws" ON draws FOR SELECT USING (status = 'published');
CREATE POLICY "Admins can view all draws" ON draws FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage draws" ON draws FOR ALL USING (is_admin());

-- Draw Results RLS
CREATE POLICY "Users can view published draw results" ON draw_results FOR SELECT USING (
    EXISTS (SELECT 1 FROM draws WHERE draws.id = draw_results.draw_id AND draws.status = 'published')
);
CREATE POLICY "Admins can manage draw results" ON draw_results FOR ALL USING (is_admin());

-- Draw Entries RLS
CREATE POLICY "Users can view own draw entries" ON draw_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all draw entries" ON draw_entries FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage draw entries" ON draw_entries FOR ALL USING (is_admin());

-- Prize Tiers RLS
CREATE POLICY "Users can view published prize tiers" ON prize_tiers FOR SELECT USING (
    EXISTS (SELECT 1 FROM draws WHERE draws.id = prize_tiers.draw_id AND draws.status = 'published')
);
CREATE POLICY "Admins can manage prize tiers" ON prize_tiers FOR ALL USING (is_admin());

-- Winners RLS
CREATE POLICY "Users can view published winners" ON winners FOR SELECT USING (
    EXISTS (SELECT 1 FROM draws WHERE draws.id = winners.draw_id AND draws.status = 'published')
);
CREATE POLICY "Admins can view all winners" ON winners FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage winners" ON winners FOR ALL USING (is_admin());

-- Winner Verifications RLS
CREATE POLICY "Users can view own verifications" ON winner_verifications FOR SELECT USING (
    EXISTS (SELECT 1 FROM winners WHERE winners.id = winner_verifications.winner_id AND winners.user_id = auth.uid())
);
CREATE POLICY "Users can insert own verifications" ON winner_verifications FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM winners WHERE winners.id = winner_verifications.winner_id AND winners.user_id = auth.uid())
);
CREATE POLICY "Admins can view all verifications" ON winner_verifications FOR SELECT USING (is_admin());
CREATE POLICY "Admins can manage verifications" ON winner_verifications FOR ALL USING (is_admin());

-- Charity Ledger RLS
CREATE POLICY "Admins can manage ledger" ON charity_contribution_ledger FOR ALL USING (is_admin());

-- Payment Records RLS
CREATE POLICY "Users can view own payments" ON payment_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all payments" ON payment_records FOR SELECT USING (is_admin());

-- Audit Logs RLS
CREATE POLICY "Admins can view audit logs" ON audit_logs FOR SELECT USING (is_admin());
-- System inserts logs via service role, so no user insert policy needed.
