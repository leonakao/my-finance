# Tech Stack

**Analyzed:** 2026-06-11

## Core

- Primary application: single-page financial web app backed directly by Supabase.
- Frontend language: TypeScript 6 with strict mode, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- Frontend runtime: browser ES2022 modules.
- Edge runtime: Supabase Edge Functions on Deno.
- Local tooling: Python 3 scripts and POSIX shell scripts.
- Package manager: npm with `web/package-lock.json`; no Node version is pinned in the repository.

## Frontend

- UI framework: React 19.2.
- Rendering: React DOM 19.2.
- Build/dev server: Vite 8.
- UI primitives: Radix Dialog and Tooltip.
- Icons: Lucide React.
- Styling: global CSS split between `App.css` and `src/styles/{theme,base,components}.css`.
- State management: React hooks and derived state; no external state library.
- Routing: manual History API routing in `App.tsx`, with authenticated paths and `?month=YYYY-MM`.
- Forms: native controlled React forms; no form library.
- Data access: `@supabase/supabase-js` 2.107.

## Data And Backend

- Database: Supabase Postgres 17 in local configuration.
- Authentication: Supabase Auth with email/password, signup, password reset and recovery.
- API styles:
  - direct PostgREST access through Supabase JS for CRUD;
  - Supabase Functions invocation for imports;
  - no custom long-running backend service.
- Authorization: Postgres Row Level Security on user-owned tables.
- Schema management: timestamped SQL migrations in `supabase/migrations/`.
- Current user tables:
  - `profiles`;
  - `transactions`;
  - `budget_groups`;
  - `transaction_classification_rules`.

## Edge Functions

- `import-nubank-csv`: Nubank account/card CSV parsing.
- `import-santander-pdf`: Santander card invoice PDF parsing.
- `import-santander-account-pdf`: Santander account statement PDF parsing.
- Shared modules cover budget group resolution, user classification rules, installment expansion and duplicate detection.
- Third-party Edge dependency: `pako` 2.1 for compressed PDF streams.

## Local And Legacy Tools

- Python standard library only; no `requirements.txt` or `pyproject.toml`.
- Local extractors:
  - Santander card PDF;
  - Nubank CSV.
- Archived summarizers:
  - monthly summary;
  - monthly dashboard for the former Notion workflow.
- Shell scripts manage environments, Render builds, local Supabase checks and import scenarios.

## Testing

- Unit/component: Vitest 4.1 with jsdom.
- React tests: Testing Library React 16.3 and User Event 14.6.
- E2E: Playwright 1.60.
- Database/integration scenarios: shell + curl + jq against local Supabase.
- Current verified baseline on 2026-06-11:
  - 9 Vitest files;
  - 53 Vitest tests passing;
  - 6 Playwright spec files containing 22 tests.
- No coverage reporter or enforced coverage threshold is configured.

## Quality Tooling

- ESLint 10 with type-aware TypeScript rules.
- TypeScript compiler as a no-emit typecheck gate.
- Strict limits for complexity, depth, file size and function size, with explicit exceptions in some large modules.
- GitHub Actions deploys Supabase migrations and Edge Functions on changes to `supabase/**`.
- No repository workflow currently runs frontend lint, typecheck, unit or E2E tests.

## External Services

- Supabase: database, Auth, PostgREST and Edge Functions.
- Render: static hosting for the web app.
- GitHub Actions: Supabase deployment.
- Notion: archived/legacy financial views and identifiers; not the active web application datastore.

## Configuration

- Frontend environment:
  - `VITE_SUPABASE_URL`;
  - `VITE_SUPABASE_ANON_KEY`;
  - `VITE_SITE_URL`.
- Local Supabase ports:
  - API `54321`;
  - database `54322`;
  - Studio `54323`.
- Production frontend URL documented as `https://my-finance-web-sski.onrender.com`.
