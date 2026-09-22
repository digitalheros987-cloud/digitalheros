# Database Design

The PostgreSQL schema designed for Supabase.

## Tables

### `profiles`
Extended user data linked to Supabase Auth.
* `id` (UUID, PK) - references `auth.users`
* `email` (String, Unique)
* `full_name` (String)
* `role` (Enum: `user`, `admin`) - Default `user`
* `status` (Enum: `active`, `suspended`, `banned`)
* `created_at`, `updated_at` (Timestamps)

### `charities`
* `id` (UUID, PK)
* `name` (String)
* `description` (Text)
* `is_active` (Boolean) - Default true
* `is_spotlight` (Boolean) - Default false
* `image_url` (String)
* `created_at`, `updated_at` (Timestamps)

### `user_charity_selections`
Records the active charity selection for a user.
* `id` (UUID, PK)
* `user_id` (UUID, FK -> `profiles.id`, Unique)
* `charity_id` (UUID, FK -> `charities.id`)
* `contribution_percentage` (Integer) - CHECK >= 10 and <= 100
* `created_at`, `updated_at` (Timestamps)

### `subscriptions`
Synced from Stripe webhooks.
* `id` (UUID, PK)
* `user_id` (UUID, FK -> `profiles.id`)
* `stripe_customer_id` (String)
* `stripe_subscription_id` (String, Unique)
* `status` (Enum: `active`, `canceled`, `past_due`, `unpaid`, `incomplete`)
* `plan` (Enum: `monthly`, `yearly`)
* `current_period_start`, `current_period_end` (Timestamps)
* `created_at`, `updated_at` (Timestamps)

### `scores`
Managed by application logic to maintain max 5 per user.
* `id` (UUID, PK)
* `user_id` (UUID, FK -> `profiles.id`)
* `score_value` (Integer) - CHECK 1 to 45
* `date_played` (Date) - Unique constraint on `(user_id, date_played)`
* `created_at` (Timestamps)

### `draws`
Represents a monthly draw event.
* `id` (UUID, PK)
* `draw_period` (String) - e.g., "2026-03"
* `draw_mode` (String) - 'random' or 'algorithmic'
* `status` (Enum: `pending`, `simulated`, `published`)
* `execution_timestamp` (Timestamp)
* `jackpot_amount_cents` (Integer)
* `total_pool_cents` (Integer)
* `algorithm_version` (String)
* `seed` (String) - Random seed for auditability and reproducibility
* `audit_notes` (Text)
* `created_at` (Timestamps)

### `draw_results`
Stores the literal random numbers if generated, or metadata for algorithmic configuration.
* `id` (UUID, PK)
* `draw_id` (UUID, FK -> `draws.id`, Unique)
* `winning_numbers` (Integer Array) - Length 5
* `algorithm_version` (String)
* `metadata` (JSONB)
* `created_at` (Timestamps)

### `draw_entries`
Immutable snapshot of a user's scores and their calculated consistency weight (for auditing algorithmic draws) at the time a draw is published.
* `id` (UUID, PK)
* `draw_id` (UUID, FK -> `draws.id`)
* `user_id` (UUID, FK -> `profiles.id`)
* `is_eligible` (Boolean)
* `scores_snapshot` (Integer Array) - Length 5
* `consistency_metric` (Float) - e.g., standard deviation
* `draw_weight` (Float) - Calculated probability weight for selection
* `created_at` (Timestamps)
* UNIQUE constraint on `(draw_id, user_id)`

### `prize_tiers`
Calculated tiers for a specific draw.
* `id` (UUID, PK)
* `draw_id` (UUID, FK -> `draws.id`)
* `match_tier` (Integer) - 5, 4, or 3
* `percentage_allocation` (Integer)
* `total_amount_cents` (Integer)
* `rollover_amount_cents` (Integer) - Amount rolled over from previous month (only applies to tier 5)
* `is_claimed` (Boolean) - True if there were winners. If false for tier 3 or 4, `total_amount_cents` remains here as an unclaimed ledger record (does not roll over).
* `created_at` (Timestamps)

### `winners`
Users who won a prize in a draw. Contains immutable audit snapshots and verification tracking.
* `id` (UUID, PK)
* `draw_id` (UUID, FK -> `draws.id`)
* `user_id` (UUID, FK -> `profiles.id`)
* `match_tier` (Integer) - 5, 4, or 3
* `match_count` (Integer) - 3, 4, or 5 numbers matched
* `prize_amount_cents` (Integer) - Calculated payout share in cents
* `verification_status` (Text: `pending`, `verified`, `rejected`) - Administrative verification state
* `status` (Enum: `pending_proof`, `reviewing`, `approved`, `rejected`, `paid`, `forfeited`)
* `scores_snapshot` (Array of Integers) - The 5 Stableford scores evaluated at draw time
* `winning_numbers_snapshot` (Array of Integers) - The 5 winning numbers drawn
* `proof_url` (Text, nullable) - Storage path of the uploaded proof screenshot in the `winner-proofs` bucket
* `proof_uploaded_at` (Timestamp, nullable) - When the proof was uploaded
* `payment_status` (Text: `unpaid`, `paid`) - Administrative payout tracking state (no real transfers, see A-018)
* `paid_at` (Timestamp, nullable) - When the admin marked the payout as completed
* `paid_by` (UUID, FK -> `profiles.id`, nullable) - Admin who marked the payout
* `verified_at` (Timestamp) - Timestamp when admin verified or rejected the claim
* `verified_by` (UUID, FK -> `profiles.id`) - Admin who performed verification
* `admin_notes` (Text) - Audit notes or rejection reasoning
* `created_at`, `updated_at` (Timestamps)
* Unique Constraint: `(draw_id, user_id)` (A user can win at most one prize tier per draw)

### `winner_verifications`
Uploaded proof for winning claims.
* `id` (UUID, PK)
* `winner_id` (UUID, FK -> `winners.id`, Unique)
* `proof_url` (String)
* `status` (Enum: `pending`, `approved`, `rejected`)
* `verified_by` (UUID, FK -> `profiles.id`)
* `verified_at` (Timestamp)
* `admin_notes` (Text)
* `created_at`, `updated_at` (Timestamps)

### `charity_contribution_ledger`
Ledger for tracking funds owed to charities. Handles the manual payout model for V1.
* `id` (UUID, PK)
* `user_id` (UUID, FK -> `profiles.id`)
* `charity_id` (UUID, FK -> `charities.id`)
* `source_period` (String)
* `amount_cents` (Integer)
* `status` (Enum: `pending`, `paid`)
* `transaction_reference` (String)
* `created_at`, `updated_at` (Timestamps)

### `payment_records`
Financial audit log for processed Stripe payments.
* `id` (UUID, PK)
* `user_id` (UUID, FK -> `profiles.id`)
* `stripe_invoice_id` (String, Unique)
* `amount_cents` (Integer)
* `currency` (String) - Default 'usd'
* `status` (String)
* `created_at` (Timestamp)

### `audit_logs`
System and admin action auditing.
* `id` (UUID, PK)
* `actor_id` (UUID, FK -> `profiles.id`)
* `action` (String)
* `entity_type` (String)
* `entity_id` (UUID)
* `details` (JSONB)
* `created_at` (Timestamp)

## Key Constraints & Indexes
* **Row Level Security (RLS)**: Enabled on all tables.
  * Users can SELECT their own `profiles`, `subscriptions`, `scores`, `draw_entries`, `winner_verifications`, `payment_records`, and their own `winners` records for published draws (`auth.uid() = user_id`).
  * Users cannot INSERT, UPDATE, or DELETE `winners` records (tamper-proof).
  * Users can SELECT published `draws`, `draw_results`, and `prize_tiers`.
  * Admins have ALL privileges across all tables (managed via an `is_admin()` SQL function).
* **Indexes**: 
  * `scores(user_id, date_played DESC)` for fast retrieval of latest 5 scores.
  * `subscriptions(user_id)` and `subscriptions(stripe_subscription_id)`.
  * `draw_entries(draw_id)` and `draw_entries(user_id)`.
  * `winners(draw_id)` and `winners(user_id)`.
  * `charity_contribution_ledger(charity_id)` and `(status)`.
