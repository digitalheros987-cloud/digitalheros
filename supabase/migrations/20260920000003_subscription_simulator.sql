-- Migration to support simulated subscriptions alongside future Stripe integration

-- Add a provider column to distinguish simulated vs real stripe subscriptions
ALTER TABLE subscriptions 
ADD COLUMN provider TEXT NOT NULL DEFAULT 'stripe';

-- Make external IDs nullable so simulated subscriptions don't require fake Stripe IDs
ALTER TABLE subscriptions 
ALTER COLUMN stripe_customer_id DROP NOT NULL;

ALTER TABLE subscriptions 
ALTER COLUMN stripe_subscription_id DROP NOT NULL;

-- Rename columns to be more generic (provider-agnostic)
ALTER TABLE subscriptions 
RENAME COLUMN stripe_customer_id TO provider_customer_id;

ALTER TABLE subscriptions 
RENAME COLUMN stripe_subscription_id TO provider_subscription_id;

-- Ensure a user can only have one active subscription at a time
CREATE UNIQUE INDEX idx_one_active_sub_per_user 
ON subscriptions (user_id) 
WHERE status = 'active';
