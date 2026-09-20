# Project Structure

Proposed directory structure for the Next.js (App Router) application.

```text
/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/             # Auth routes (login, signup)
│   │   ├── (dashboard)/        # Protected user dashboard routes
│   │   ├── (admin)/            # Protected admin routes
│   │   ├── api/                # API routes
│   │   │   └── webhooks/       # Stripe webhook listener
│   │   ├── charities/          # Public charity directory
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Public homepage
│   │
│   ├── components/             # Reusable UI components
│   │   ├── ui/                 # Base UI primitives (buttons, inputs)
│   │   ├── forms/              # Reusable forms (score entry, settings)
│   │   ├── dashboard/          # Dashboard-specific components
│   │   ├── admin/              # Admin-specific components
│   │   └── shared/             # Layout components (navbar, footer)
│   │
│   ├── lib/                    # Business logic and pure functions
│   │   ├── draw-engine/        # The isolated draw algorithm and tests
│   │   │   ├── index.ts        # Engine entry point
│   │   │   ├── algorithm.ts    # Probability and math logic
│   │   │   └── engine.test.ts  # Unit tests for the draw engine
│   │   ├── prize-pool/         # Prize calculation logic
│   │   ├── db/                 # Supabase client instantiation
│   │   ├── stripe/             # Stripe client instantiation
│   │   └── utils.ts            # General utility functions
│   │
│   ├── actions/                # Next.js Server Actions (Mutations)
│   │   ├── scores.ts           # Add/edit/delete score actions
│   │   ├── subscriptions.ts    # Manage subscription actions
│   │   ├── charities.ts        # Admin charity actions
│   │   └── draw.ts             # Admin draw execution actions
│   │
│   ├── types/                  # TypeScript interfaces and types
│   │   └── index.ts            # Global types (database row types)
│   │
│   └── styles/                 # Global styles
│       └── globals.css         # Tailwind directives
│
├── supabase/                   # Supabase configuration & migrations
│   ├── migrations/             # SQL migration files
│   └── config.toml             # Local development config
│
├── tests/                      # E2E and integration tests
├── .env.example                # Environment variable template
├── tailwind.config.ts          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
└── package.json
```

## Structure Rules
1. **No Business Logic in UI Components**: Components in `src/components` should only handle presentation and local state. Complex calculations belong in `src/lib`.
2. **Server Actions for Mutations**: All database writes from the client must go through Server Actions in `src/actions`, which handle validation and authorization.
3. **Isolated Testing**: The `draw-engine` and `prize-pool` must have zero side effects (no direct DB calls inside the core logic) to allow comprehensive unit testing.
