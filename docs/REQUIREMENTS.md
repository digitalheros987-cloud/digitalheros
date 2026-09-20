# Platform Requirements

This document outlines the functional and technical requirements for the Digital Heroes platform, based on the provided Product Requirements Document (PRD).

## 1. Explicit PRD Requirements

### 1.1 User Roles & Access
* **Public Visitor**: Can view the platform concept, explore charities, understand draw mechanics, and initiate subscription. Restricted from platform features.
* **Registered Subscriber**: Can manage profile/settings, enter/edit golf scores, select charity recipient, view participation & winnings, and upload winner proof.
* **Administrator**: Can manage users/subscriptions, configure/run draws, manage charity listings, verify winners/payouts, and access reports/analytics.

### 1.2 Subscriptions & Payments
* Must support Monthly and Yearly (discounted) plans.
* Must integrate with Stripe (or equivalent PCI-compliant provider).
* Must handle subscription lifecycles: renewal, cancellation, and lapsed states.
* Must validate subscription status in real-time on every authenticated request.

### 1.3 Score Management
* Users must enter their latest 5 golf scores.
* Scores must be in Stableford format (range: 1–45).
* Each score must include a date. Only one score entry is permitted per date.
* Only the latest 5 scores are retained; new scores automatically replace the oldest stored score.
* Scores display in reverse chronological order.
* Duplicate scores for the same date are not allowed; existing entries can only be edited or deleted.

### 1.4 Charity System
* Users must select a charity during signup.
* Minimum contribution is 10% of the subscription fee.
* Users can voluntarily increase their charity percentage.
* Must support independent donations not tied to gameplay.
* Charity directory must have a listing page with search/filter.
* Charity profiles must include description, images, and upcoming events.
* Homepage must feature a spotlight charity section.

### 1.5 Draw & Reward System
* **Draw Types**: 5-number match, 4-number match, 3-number match.
* **Draw Logic**: 
  * Random (standard lottery style).
  * Algorithmic (weighted by score frequency).
* **Operations**: Monthly cadence, admin controls publishing, simulation required before publishing, jackpot rolls over if unclaimed.
* **Prize Pool Distribution**:
  * 5-Number Match: 40% (Jackpot rolls over if unclaimed)
  * 4-Number Match: 35% (No rollover)
  * 3-Number Match: 25% (No rollover)
* Prize pool tiers are auto-calculated based on active subscriber count.
* Prizes are split equally among multiple winners in the same tier.

### 1.6 Winner Verification
* Applies to winners only.
* Users must upload a screenshot of scores from their golf platform as proof.
* Admins must approve or reject the submission.
* Payment states must track "Pending" to "Paid".

### 1.7 Dashboards
* **User Dashboard**: Must show subscription status (active/inactive/renewal date), score entry/edit interface, selected charity and contribution percentage, participation summary (draws entered, upcoming draws), and winnings overview (total won, current payment status).
* **Admin Dashboard**: 
  * User management (view/edit profiles, edit scores, manage subscriptions)
  * Draw management (configure logic, run simulations, publish results)
  * Charity management (add, edit, delete, manage media)
  * Winners management (view list, verify submissions, mark payouts as completed)
  * Reports & analytics (total users, total prize pool, charity contribution totals, draw statistics)

### 1.8 UI/UX Requirements
* Emotion-driven design, avoiding traditional golf clichés (fairways, plaid, club imagery).
* Clean, modern interface with subtle transitions and micro-interactions.
* Prominent and persuasive subscribe CTA.
* Clearly communicate the value proposition on the homepage.
* Responsive design on mobile and desktop.

### 1.9 Technical & Deployment
* **Frontend/Backend**: Live website (publicly accessible).
* **Database**: Backend connected (e.g., Supabase) with proper schema.
* **Deployment Constraints**: Must deploy to new Vercel account, new Supabase project, with properly configured environment variables.
* Clean, structured, well-commented codebase.

---

## 2. Proposed Assumptions (Ambiguities Addressed)

Since the PRD is deliberately ambiguous in certain areas, the following assumptions form the basis of the initial architecture. These will be further detailed in `ASSUMPTIONS.md`.

* **The "Lottery Numbers"**: A user's 5 retained golf scores (values 1-45) naturally act as their 5 "lottery numbers" for the draw.
* **Draw Eligibility**: A user is only eligible for a draw if they have an active subscription *and* have exactly 5 scores entered at the time of the draw.
* **Unclaimed Tiers**: If no user matches 3 or 4 numbers, their respective prize pool shares (25% and 35%) are retained by the platform (or optionally diverted to a charity pool), since the PRD explicitly states "No rollover" for these tiers.
* **Charity Contribution Timing**: Charity contributions are accumulated virtually and paid out manually or batched monthly, rather than processing micro-transactions on every subscription payment.
* **Algorithmic Draw**: To favor "consistency", the algorithm will use a weighting mechanism based on user score variance, rather than purely random number generation. (See `DRAW_ALGORITHM.md`).
