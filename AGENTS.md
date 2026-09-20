# AI Development Rules for Digital Heroes

If you are an AI agent working on this codebase, you must adhere strictly to the following rules to ensure architectural integrity, security, and PRD compliance.

## 1. Context Before Code
* **Read the Docs**: Before modifying any feature, read the relevant documentation in `docs/`. Specifically, consult `REQUIREMENTS.md` and `ASSUMPTIONS.md`.
* **Understand the Architecture**: Review `ARCHITECTURE.md` to understand the separation of concerns (e.g., UI vs Server Actions vs Core Engine).
* **Do Not Invent Requirements**: Stick to the PRD. If a feature is not requested, do not build it.

## 2. Handling Ambiguity
* **Stop and Ask**: Do not silently change business logic. If you encounter an unresolved ambiguity that materially affects implementation, explicitly ask the user for clarification before proceeding.
* **Document Changes**: If an assumption changes or a new requirement is clarified, update `docs/ASSUMPTIONS.md` or `docs/REQUIREMENTS.md` immediately.

## 3. Architecture & Code Quality
* **Strict Separation**: Keep business logic (especially the Draw Engine and Prize Engine) strictly independent of UI components. Place core logic in `src/lib/`.
* **Server-Side Trust**: Never trust client-side authorization or data. Validate all inputs on the server using schemas (e.g., Zod) within Server Actions.
* **Scope of Changes**: Do not modify unrelated files. Keep PRs/commits tightly scoped to the current phase of the roadmap (`docs/ROADMAP.md`).
* **Explain Decisions**: If you make a significant architectural decision (e.g., choosing a specific library for a complex task), add a comment explaining *why*.

## 4. Security & Data Integrity
* **No Secrets**: Never expose secrets (Stripe keys, Supabase service keys) in the client bundle. Use environment variables properly.
* **Row Level Security (RLS)**: Ensure all new Supabase tables have strict RLS policies applied via migrations.
* **Migrations**: Keep database migrations version-controlled in `supabase/migrations/`. Do not apply structural changes directly via the Supabase UI without generating a migration file.

## 5. Testing Critical Paths
* **Financial & Draw Logic**: Write comprehensive unit tests for any logic involving money (prize pools, charity contributions) or randomness (the draw engine). These modules must be 100% testable without database side-effects.

Remember: The PRD states that handling ambiguity is part of the test. Maintain a defensive, well-documented approach to all edge cases.
