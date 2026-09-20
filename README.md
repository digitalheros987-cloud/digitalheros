# Digital Heroes Platform

Digital Heroes is a subscription-driven web application combining golf performance tracking, charity fundraising, and a monthly draw-based reward engine. It is built to feel emotionally engaging and modern, breaking away from traditional golf aesthetics.

## Technology Stack
* **Frontend**: Next.js (App Router), React, Tailwind CSS, Framer Motion
* **Backend**: Next.js Server Actions, API Routes
* **Database & Auth**: Supabase (PostgreSQL, GoTrue)
* **Storage**: Supabase Storage
* **Payments**: Stripe Checkout & Webhooks
* **Deployment**: Vercel

## High-Level Architecture
The platform is designed with a strict separation of concerns. UI components handle presentation and local state, while all data mutations occur securely via Next.js Server Actions. The core business logic—specifically the Draw Engine and Prize Pool calculations—is isolated in pure, unit-testable modules independent of the database and UI. Database integrity is enforced via PostgreSQL Row Level Security (RLS).

For deeper architectural details, see `docs/ARCHITECTURE.md`.

## Local Development Prerequisites
To run this project locally, you will need:
1. Node.js (v18+)
2. npm, yarn, or pnpm
3. Supabase CLI (for local database and auth testing)
4. Stripe CLI (for forwarding webhooks locally)

## Environment Variables
The following environment variables will eventually be required in `.env.local` (do not commit this file):

```env
# Next.js
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase (Public)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Supabase (Secret - Server Only)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_pub_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```
*Note: Never place real secret values in documentation or version control.*

## Documentation Reference
Before contributing, please review the complete documentation suite located in the `docs/` directory:
* [Requirements (`REQUIREMENTS.md`)](docs/REQUIREMENTS.md) - Explicit PRD requirements.
* [Assumptions (`ASSUMPTIONS.md`)](docs/ASSUMPTIONS.md) - Resolved ambiguities and edge cases.
* [Draw Algorithm (`DRAW_ALGORITHM.md`)](docs/DRAW_ALGORITHM.md) - The math behind the consistency-based draw.
* [Architecture (`ARCHITECTURE.md`)](docs/ARCHITECTURE.md) - System design and data flow.
* [Database Schema (`DATABASE.md`)](docs/DATABASE.md) - PostgreSQL tables and relations.
* [Project Structure (`PROJECT_STRUCTURE.md`)](docs/PROJECT_STRUCTURE.md) - Directory layout rules.
* [Roadmap (`ROADMAP.md`)](docs/ROADMAP.md) - Step-by-step implementation phases.

**AI Agents**: Please read `AGENTS.md` before making any code modifications.

## Development Phases
The project is being built in 18 distinct phases, starting from initialization and database design, moving through auth, payments, score management, and concluding with the draw engine and admin dashboards. See `docs/ROADMAP.md` for the current progress.
