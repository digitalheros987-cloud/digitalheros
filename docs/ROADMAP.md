# Development Roadmap

This roadmap breaks down the implementation of the Digital Heroes platform into logical, verifiable phases.

## Phase 1: Project Initialization
* **Objective**: Setup Next.js, Tailwind, TypeScript, and ESLint.
* **Files**: `package.json`, `tailwind.config.ts`, `tsconfig.json`.
* **Dependencies**: React, Next.js, Tailwind CSS.
* **Completion Criteria**: Dev server runs locally showing a blank page with Tailwind styles working.

## Phase 2: Database and Migrations
* **Objective**: Define Supabase SQL schema and Row Level Security (RLS) policies.
* **Files**: `supabase/migrations/0001_initial_schema.sql`.
* **Dependencies**: Supabase CLI.
* **Completion Criteria**: Local Supabase instance runs, tables are created, RLS blocks unauthorized reads.

## Phase 3: Authentication & Authorization
* **Objective**: Implement user signup/login and role-based routing (Admin vs User).
* **Files**: `src/app/(auth)/*`, `src/lib/db/*`, middleware for route protection.
* **Dependencies**: `@supabase/ssr`, `@supabase/supabase-js`.
* **Completion Criteria**: Users can register, login, logout, and admins can access `/admin` while normal users are redirected.

## Phase 4: User Profiles
* **Objective**: Allow users to edit basic profile details.
* **Files**: `src/app/(dashboard)/profile/*`, `src/actions/profile.ts`.
* **Completion Criteria**: Users can update their name and view their email.

## Phase 5: Subscription & Payment System
* **Objective**: Integrate Stripe checkout, customer portal, and webhook listener.
* **Files**: `src/app/api/webhooks/stripe/route.ts`, `src/actions/subscriptions.ts`, `src/lib/stripe/*`.
* **Dependencies**: `stripe`.
* **Tests Required**: Webhook event processing tests.
* **Completion Criteria**: Users can subscribe (monthly/yearly), subscriptions table updates via webhooks, cancelled subs revert to inactive at period end.

## Phase 6: Score Management
* **Objective**: Build the 5-score rolling logic interface.
* **Files**: `src/app/(dashboard)/scores/*`, `src/actions/scores.ts`.
* **Tests Required**: Validation (1-45), date uniqueness, oldest-replacement logic.
* **Completion Criteria**: Users can add, edit, delete scores; system strictly enforces max 5 scores per user.

## Phase 7: Charity System
* **Objective**: CRUD for charities (admin) and selection for users.
* **Files**: `src/app/(admin)/charities/*`, `src/app/charities/*`, `src/actions/charities.ts`.
* **Completion Criteria**: Admins can add charities with images; users can view directory and select a charity in their dashboard.

## Phase 7: Draw & Reward Engine (Completed)
* **Objective**: Implement the isolated random and algorithmic draw math, prize pool calculations, tier splits (40/35/25), rollover jackpot, simulation, and admin-controlled publishing.
* **Files**: `src/lib/draw/*`, `src/actions/draws.ts`, `src/lib/services/draws.ts`, `src/components/draws/*`, `src/app/(dashboard)/draws/page.tsx`.
* **Tests**: Pure unit tests in `tests/draw-engine.test.mjs` (27 assertions); live database integration tests in `tests/draws.test.mjs` (20 assertions).
* **Completion Criteria**: ✅ Complete. Both random and algorithmic modes functional, simulation does not alter published history, admin publishing creates immutable snapshots and winners.

## Phase 10: Winner Verification
* **Objective**: Allow winners to upload proof; allow admins to approve/reject.
* **Files**: `src/app/(dashboard)/winnings/*`, `src/app/(admin)/winners/*`.
* **Dependencies**: Supabase Storage.
* **Completion Criteria**: Winners see upload prompt; admins can view image and toggle status to `approved`/`rejected`/`paid`.

## Phase 11: User Dashboard
* **Objective**: Aggregate user data (subscription status, scores, selected charity, winnings) into a single view.
* **Files**: `src/app/(dashboard)/page.tsx`.
* **Completion Criteria**: All dashboard requirements from PRD §10 are met.

## Phase 12: Admin Dashboard
* **Objective**: Aggregate platform data (total users, prize pool, charity totals, draw stats).
* **Files**: `src/app/(admin)/page.tsx`.
* **Completion Criteria**: Admin can view high-level metrics and navigate to specific management pages.

## Phase 13: Reports & Analytics
* **Objective**: Detailed data exports or views for charity payouts and draw audits.
* **Files**: `src/app/(admin)/reports/*`.
* **Completion Criteria**: Admins can see exactly how much is owed to each charity per month.

## Phase 14: UI/UX Polish
* **Objective**: Implement the "emotion-driven", non-traditional golf aesthetic.
* **Files**: `src/components/*`, `src/styles/*`.
* **Dependencies**: `framer-motion`.
* **Completion Criteria**: Subtle animations added, layout matches PRD design directives.

## Phase 15: Automated Testing
* **Objective**: Full E2E and critical path testing.
* **Files**: `tests/*`.
* **Dependencies**: Playwright or Cypress.
* **Completion Criteria**: Critical flows (signup -> subscribe -> enter scores) pass automatically.

## Phase 16: Security Review
* **Objective**: Audit RLS policies and Server Action inputs.
* **Completion Criteria**: All DB tables have secure RLS; all inputs validated via Zod.

## Phase 17: Deployment
* **Objective**: Push to Vercel, connect production Supabase and Stripe.
* **Completion Criteria**: Live URL accessible, production webhooks firing correctly.

## Phase 18: Final PRD Compliance Audit
* **Objective**: Cross-reference shipped product against `REQUIREMENTS.md`.
* **Completion Criteria**: All explicit requirements and agreed-upon assumptions met.
