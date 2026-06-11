# External Integrations

**Analyzed:** 2026-06-11

## Supabase

**Purpose:** active application backend.

### Services Used

- Auth: email/password sessions, signup, password reset and recovery.
- Postgres/PostgREST: direct CRUD for transactions, groups and rules.
- Edge Functions: authenticated bank file imports.
- Local Studio and API through Supabase CLI.

### Frontend Implementation

- Client: `web/src/lib/supabase.ts`.
- Session: `web/src/hooks/useAuthSession.ts`.
- Auth operations: `web/src/hooks/useAuthActions.ts`.
- Queries/mutations: workflow hooks under `web/src/hooks/`.
- Required browser variables:
  - `VITE_SUPABASE_URL`;
  - `VITE_SUPABASE_ANON_KEY`;
  - `VITE_SITE_URL`.

The publishable/anon key is a public client credential. Authorization depends on user JWTs and RLS, not key secrecy.

### Authentication Flow

- password sign-in via `signInWithPassword`;
- account creation via `signUp`;
- reset via `resetPasswordForEmail`;
- recovery event via `onAuthStateChange`;
- password update via `updateUser`;
- sign-out via `signOut`.

### Database Access

The frontend directly accesses:

- `budget_groups`;
- `transaction_classification_rules`;
- `transactions`.

All are user-owned and protected by RLS.

### Edge Function Invocation

`useTransactionsImport` invokes:

- `import-nubank-csv`;
- `import-santander-pdf`;
- `import-santander-account-pdf`.

Supabase JS forwards the authenticated session. Each function revalidates the bearer token through `auth.getUser()`.

## Bank File Formats

### Nubank CSV

**Locations:**

- active parser: `supabase/functions/_shared/nubank.ts`;
- local legacy parser: `tools/extract_nubank_csv.py`.

Supported active kinds:

- account CSV;
- card CSV.

The active parser classifies baseline transaction type/category/group, detects installment suffixes and produces deterministic external IDs.

### Santander Card PDF

**Locations:**

- active parser: `supabase/functions/_shared/santander.ts`;
- local extractor: `tools/extract_santander_fatura.py`.

The parser reads compressed PDF text streams directly, reconstructs rows, classifies them and expands installment schedules.

### Santander Account PDF

**Location:** `supabase/functions/_shared/santander-account.ts`.

The parser extracts account statement transactions and feeds the common import pipeline.

### Shared Import Stages

- `budget-groups.ts`: maps baseline group names to user-owned IDs.
- `classification-rules.ts`: loads and applies user overrides.
- `installments.ts`: expansion, external IDs and duplicate purchase-series detection.

## Render

**Purpose:** production static hosting for `web/`.

**Documented service:** `my-finance-web`
**URL:** `https://my-finance-web-sski.onrender.com`

Build:

```text
sh tools/build_render_static_site.sh
```

The script builds from `web/` and exposes `web/dist` as the repository-level publish directory expected by Render.

Deployment characteristics:

- branch `main`;
- auto deploy enabled;
- SPA rewrite `/* -> /index.html` configured remotely;
- public Vite environment variables configured on the Render service.

No `render.yaml` is versioned, so service settings and rewrites are partly external state.

## GitHub Actions

**Workflow:** `.github/workflows/supabase-deploy.yml`

Trigger:

- pushes to `main` changing `supabase/**` or the workflow;
- manual dispatch.

Jobs:

1. apply migrations with `supabase db push`;
2. deploy three Edge Functions in a matrix.

Required secrets:

- `SUPABASE_ACCESS_TOKEN`;
- `SUPABASE_DB_PASSWORD`;
- `SUPABASE_PROJECT_REF`.

The workflow uses `actions/checkout@v5` and `supabase/setup-cli@v2` with `latest`.

## Notion

**Purpose:** archived/legacy financial review and identifiers.

**Locations:**

- `notion-finance.md`;
- operational descriptions in `README.md`;
- local Python outputs under ignored `inbox/`.

There is no active Notion API client or webhook in the codebase. Imports to Notion are manual/legacy. The active web app uses Supabase.

## Local Supabase CLI

**Configuration:** `supabase/config.toml`

Used for:

- local database/Auth/API;
- migration application/reset;
- serving Edge Functions;
- E2E and import scenarios;
- remote linking/deployment.

Local Auth confirmations are disabled for test convenience. Production Auth behavior is configured outside this repository.

## Webhooks And Background Jobs

- No inbound webhooks are implemented.
- No queue or background worker exists.
- No cron jobs are versioned.
- All import processing occurs synchronously within the Edge Function request.
