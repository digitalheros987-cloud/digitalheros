# Assumptions and Ambiguities

This document identifies ambiguities within the Digital Heroes PRD and outlines the proposed assumptions for implementation.

### A-001 — Draw Eligibility (Scores Required)
**PRD says:** "Users must enter their last 5 golf scores" and "Only the latest 5 scores are retained".
**Problem:** It does not specify if a user with fewer than 5 scores (e.g., a new user who only played 2 games) is eligible to enter the monthly draw.
**Proposed assumption:** A user must have exactly 5 scores recorded to participate in the draw.

### A-002 — Draw Eligibility (Subscription Status)
**PRD says:** "A fixed portion of each subscription contributes to the prize pool."
**Problem:** It does not define exactly *when* a subscription must be active to participate. Does a cancelled subscription that is still in the billing period qualify?
**Proposed assumption:** A user must have a status of `active` or `canceled` (but still within their prepaid billing period) at the exact timestamp the draw simulation is locked and executed.

### A-003 — Yearly Subscriptions in Monthly Draws
**PRD says:** "Monthly plan and yearly plan" and "Monthly cadence" for draws.
**Problem:** Does a yearly subscriber get entered into all 12 monthly draws? How does their single yearly payment contribute to the monthly prize pools?
**Proposed assumption:** Yearly subscribers are entered into every monthly draw as long as their subscription is active. Their yearly payment is amortized conceptually: 1/12th of their subscription fee contributes to the current month's prize pool.

### A-004 — Non-Jackpot Unclaimed Prizes
**PRD says:** 3-Number match (25%) and 4-Number match (35%) have "No" for Rollover.
**Problem:** What happens to the 25% or 35% of the prize pool if no user matches 3 or 4 numbers?
**Proposed assumption:** Unclaimed 3-match and 4-match amounts do NOT roll over. They remain recorded in the financial ledger for that draw as unclaimed, but are not silently redistributed or added to future prize pools. Only the 5-number jackpot rolls over.

### A-005 — Charity Payouts
**PRD says:** "Minimum contribution: 10% of subscription fee".
**Problem:** It does not specify how or when the money is actually transferred to the charities.
**Proposed assumption:** We will use a manual payout model for V1. The platform calculates and maintains a charity contribution ledger showing exactly how much is owed to each charity. Actual donations/transfers will be handled externally by the administrator. Stripe Connect will NOT be implemented for charity payouts in V1.

### A-006 — Score Modification Post-Draw
**PRD says:** "an existing entry may only be edited or deleted."
**Problem:** Can a user edit a score that was already used to win a past draw?
**Proposed assumption:** Scores are soft-locked once they are used in a completed draw, or a snapshot is taken via a `draw_entries` table.

### A-007 — Winner Verification Rejection
**PRD says:** "Admin Review: Approve or reject submission" for winner verification.
**Problem:** What happens if an admin rejects a winner's proof?
**Proposed assumption:** If rejected, the user forfeits their share of the prize. If they were the only winner in that tier, the prize is treated as unclaimed. For the 5-match tier, this means it rolls over to the next month's jackpot.

### A-008 — Tie-Breaking and Multiple Winners
**PRD says:** "Prizes split equally among multiple winners in the same tier".
**Problem:** Are there rounding issues when splitting monetary values?
**Proposed assumption:** Monetary values will be stored and calculated in cents (integers) to avoid floating-point errors. Any fractional cents remaining after a split will be retained by the platform.

### A-009 — Data Retention for Scores
**PRD says:** "Only the latest 5 scores are retained at any time".
**Problem:** If a user deletes a score, does the system restore a previously "overwritten" 6th score?
**Proposed assumption:** No. The system maintains a hard limit of 5 active scores per user. If one is deleted, they have 4 and must enter a new one to be eligible.

### A-010 — Stripe Webhook Synchronization
**PRD says:** "Real-time subscription status check on every authenticated request".
**Problem:** Depending on Stripe webhooks for real-time validation can cause race conditions if webhooks are delayed.
**Proposed assumption:** The platform will rely on a local `subscriptions` table synced via webhooks, but will also actively query the Stripe API if a user attempts a critical action and their local status appears stale.

### A-011 — The Algorithmic Draw
**PRD says:** "Algorithmic — weighted by score frequency"
**Problem:** This phrase is ambiguous. A literal interpretation using "score frequency" conflicts with the product goal of rewarding consistent players, and standard number matching mechanics don't easily adapt to weighting users directly.
**Proposed assumption:** The algorithmic draw operates differently from the random "standard lottery style" draw. Instead of generating 5 winning numbers, the algorithmic draw calculates a consistency metric for each eligible user based on their latest 5 scores, converts this into a probability/weight, and uses weighted random selection to directly select winning users. Consistency increases probability but does not make selection deterministic.

### A-012 — Subscription Simulation Architecture
**Problem:** Integrating real payment processors early can slow down application development.
**Proposed assumption:** During Phase 6, we implemented a simulated subscription system using Supabase. The `subscriptions` table tracks state. A `provider` column distinguishes `simulated` from future `stripe` subscriptions. Real payment processing is bypassed, and state transitions are handled entirely by secure Server Actions (using the Service Role key to bypass RLS), acting identically to how Stripe Webhooks will function later.

### A-013 — Prize Pool Contribution Amount
**PRD says:** "A fixed portion of each subscription contributes to the prize pool. Auto-calculation of each pool tier based on active subscriber count."
**Problem:** The PRD does not specify the exact currency amount or percentage of each subscription fee allocated to the prize pool.
**Proposed assumption:** A fixed contribution of £5.00 (500 pence / cents) per active subscriber per month contributes to the monthly prize pool. For monthly subscribers (£9.99/mo), this represents approximately 50% of the fee. For yearly subscribers (£99.90/yr amortized to £8.325/mo), the contribution is likewise 500 pence.

### A-014 — Random Mode Lottery Number Matching Semantics
**PRD says:** "Random — standard lottery-style" and "5-number match, 4-number match, 3-number match".
**Problem:** A user's 5 Stableford scores may contain duplicates (e.g. [32, 32, 35, 38, 40]), whereas a standard lottery generates 5 unique winning numbers.
**Proposed assumption:** Matching uses multiset intersection where each unique drawn winning number can be matched at most once. A participant is placed into their highest matching tier (5, 4, or 3). A participant can only win in one tier per draw.
