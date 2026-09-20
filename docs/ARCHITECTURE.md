# System Architecture

## 1. Stack Overview

* **Framework:** Next.js (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS (with Framer Motion for UI/UX animations)
* **Database & Auth:** Supabase (PostgreSQL)
* **Storage:** Supabase Storage (for winner proofs, charity images)
* **Payments:** Stripe (Inbound subscriptions only)
* **Hosting:** Vercel

## 2. Frontend Architecture
* **App Router:** Utilizing Next.js App Router for server-rendered pages and nested layouts.
* **Component Library:** Tailwind UI or Radix UI primitives mapped to custom, non-traditional golf aesthetics.
* **State Management:** React Context for localized state; Server Actions for mutations.
* **Animations:** Framer Motion for micro-interactions and the draw simulation reveal.

## 3. Backend & API Architecture
* **Server Actions:** All data mutations (score entry, profile updates, charity selection) are handled via Next.js Server Actions to ensure type safety and keep business logic on the server.
* **API Routes:** Used strictly for incoming webhooks (e.g., Stripe) and potential external integrations.
* **Separation of Concerns:** Business logic (e.g., prize calculations, draw engine) will live in `src/lib/` or `src/services/` and remain strictly independent of UI components.

## 4. Authentication & Authorization
* **Supabase Auth:** Handles user registration, login, and session management.
* **Role-Based Access Control (RBAC):**
  * `public`: Unauthenticated.
  * `subscriber`: Authenticated with an active subscription in the `subscriptions` table.
  * `admin`: Authenticated, with `role = 'admin'` mapped in the `users` profile table.
* **Data Security:** Row Level Security (RLS) policies in PostgreSQL ensure users can only query their own scores and profile data.

## 5. Stripe Integration & Payouts
* **Checkout:** Stripe Checkout Sessions used for subscribing.
* **Webhooks:** A secure endpoint (`/api/webhooks/stripe`) listens for:
  * `checkout.session.completed`
  * `invoice.payment_succeeded`
  * `customer.subscription.updated`
  * `customer.subscription.deleted`
* **Syncing:** Webhooks update the local `subscriptions` table to determine draw eligibility and UI state in real-time without pinging Stripe on every page load.
* **Charity Payouts (V1):** The platform uses a manual payout model. No Stripe Connect integration is used for outbound charity transfers. Instead, the platform maintains a precise ledger of funds owed to charities (`charity_contributions` table). Administrators are responsible for executing the external transfers based on these reports.

## 6. The Draw Engine
* **Isolation:** The draw engine is a standalone TypeScript class/module that takes a list of eligible users and their scores, applies the selected algorithm (Random vs Algorithmic), and returns the winners and prize splits. It makes no direct DB calls, allowing it to be 100% unit testable.
* **Execution:** Admins trigger the draw via a Server Action. The action fetches data, runs the engine, and then persists the results to the database.
* **Simulation:** The engine supports a "dry run" mode to fulfill the "Simulation before publish" PRD requirement.

## 7. Storage
* **Supabase Storage Buckets:**
  * `charities`: Public bucket for charity logos and featured images.
  * `winner-proofs`: Private bucket. Users can upload screenshots. Only admins and the uploader can view them (enforced via RLS).

## 8. Security & Environment
* **Secrets:** Stripe Secret Keys, Supabase Service Role keys are stored securely in Vercel environment variables and never exposed to the client.
* **Input Validation:** Zod will be used to validate all incoming data to Server Actions and API routes (e.g., ensuring scores are strictly between 1 and 45).
