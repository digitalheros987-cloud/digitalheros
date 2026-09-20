# Database Design

The PostgreSQL schema designed for Supabase.

## Tables

### `profiles`
Extended user data linked to Supabase Auth.
* `id` (UUID, PK) - references `auth.users`
* `email` (String)
* `full_name` (String)
* `role` (Enum: `user`, `admin`) - Default `user`
* `created_at` (Timestamp)

### `charities`
* `id` (UUID, PK)
* `name` (String)
* `description` (Text)
* `image_url` (String)
* `is_spotlight` (Boolean)
* `created_at` (Timestamp)

### `subscriptions`
Synced from Stripe webhooks.
* `id` (UUID, PK)
* `user_id` (UUID, FK -> `profiles.id`)
* `stripe_customer_id` (String)
* `stripe_subscription_id` (String, Unique)
* `status` (String) - e.g., active, canceled, past_due
* `plan_type` (Enum: `monthly`, `yearly`)
* `current_period_end` (Timestamp)
* `charity_id` (UUID, FK -> `charities.id`, Nullable)
* `charity_percentage` (Integer) - Default 10

### `scores`
Only 5 rows per user should exist. Managed by application logic.
* `id` (UUID, PK)
* `user_id` (UUID, FK -> `profiles.id`)
* `score` (Integer) - Check constraint: 1 to 45
* `date_played` (Date) - Unique constraint on `(user_id, date_played)`
* `created_at` (Timestamp)

### `draws`
Represents a monthly draw event.
* `id` (UUID, PK)
* `month_year` (String) - e.g., "2026-03"
* `status` (Enum: `simulated`, `published`)
* `logic_used` (Enum: `random`, `algorithmic`)
* `total_prize_pool_cents` (Integer)
* `winning_numbers` (Integer Array, Nullable) - Length 5 (used for random draw)
* `created_at` (Timestamp)

### `draw_entries`
Immutable snapshot of a user's scores and their calculated consistency weight (for auditing algorithmic draws) at the time a draw is published.
* `id` (UUID, PK)
* `draw_id` (UUID, FK -> `draws.id`)
* `user_id` (UUID, FK -> `profiles.id`)
* `numbers` (Integer Array) - Length 5
* `algorithmic_weight` (Float, Nullable) - Captured consistency weight if applicable

### `prize_pools`
Calculated tiers for a specific draw.
* `id` (UUID, PK)
* `draw_id` (UUID, FK -> `draws.id`)
* `match_tier` (Integer) - 5, 4, or 3
* `total_amount_cents` (Integer)
* `rollover_amount_cents` (Integer) - Amount rolled over from previous month (only applies to tier 5)
* `is_claimed` (Boolean) - True if there were winners. If false for tier 3 or 4, `total_amount_cents` remains here as an unclaimed ledger record (does not roll over).

### `winners`
Users who won a prize in a draw.
* `id` (UUID, PK)
* `draw_id` (UUID, FK -> `draws.id`)
* `user_id` (UUID, FK -> `profiles.id`)
* `match_tier` (Integer) - 5, 4, or 3
* `prize_amount_cents` (Integer)
* `proof_url` (String, Nullable)
* `status` (Enum: `pending_proof`, `reviewing`, `approved`, `rejected`, `paid`)

### `charity_contributions`
Ledger for tracking funds owed to charities. Handles the manual payout model for V1.
* `id` (UUID, PK)
* `charity_id` (UUID, FK -> `charities.id`)
* `source_subscription_id` (UUID, FK -> `subscriptions.id`)
* `amount_cents` (Integer)
* `month_year` (String)
* `created_at` (Timestamp)

## Key Constraints & Indexes
* **Row Level Security (RLS)**: Enabled on all tables.
  * `scores`: Users can only SELECT/INSERT/UPDATE/DELETE their own scores.
  * `subscriptions`: Users can only SELECT their own. Admins can SELECT/UPDATE all.
  * `charities`: Public read, Admin write.
* **Indexes**: 
  * `scores(user_id, date_played)` for fast lookup and uniqueness.
  * `subscriptions(stripe_subscription_id)` for webhook lookups.
  * `draw_entries(draw_id, user_id)` for winner calculation.
