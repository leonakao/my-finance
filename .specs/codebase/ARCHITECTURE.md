# Architecture

**Analyzed:** 2026-06-11
**Pattern:** modular single-page frontend over Supabase, with serverless import functions and separate legacy batch tools.

## High-Level Structure

```text
Browser
  |
  +-- React SPA
  |     +-- components: presentation and interaction
  |     +-- hooks: async workflows and application state
  |     +-- lib: normalization, filtering and financial calculations
  |     +-- manual History API router
  |
  +-- Supabase JS
        +-- Auth
        +-- PostgREST CRUD
        +-- Edge Function invocation
                 |
                 +-- parse bank file
                 +-- resolve budget groups
                 +-- apply user rules
                 +-- expand/deduplicate installments
                 +-- insert transactions

Supabase Postgres
  +-- migrations define schema and RLS
  +-- user_id is the ownership boundary

Local/legacy workflow
  bank files -> Python tools -> JSON/CSV in inbox -> archived Notion flow
```

## Frontend Architecture

### Application Composition

**Location:** `web/src/App.tsx`

`App` remains the composition root. It owns route/session-level state, initializes hooks and selects the current authenticated view. Business operations are delegated to hooks and pure libraries.

Authenticated routes:

- `/app/dashboard`;
- `/app/mensal`;
- `/app/importar`;
- `/app/regras`;
- `/app/budget-groups`.

Routing uses `window.history.pushState`, `replaceState` and `popstate`. Monthly state is deep-linked through `?month=YYYY-MM`.

### Hook-Oriented Application Services

**Location:** `web/src/hooks/`

Observed responsibilities:

- `useAuthSession`: session bootstrap and recovery event handling;
- `useAuthActions`: sign-in, signup, reset, password update and logout cleanup;
- `useTransactionsData`: initial queries and normalized application state;
- `useDashboardState`: derived filters, month data and financial analysis;
- `useTransactionsImport`: file conversion and Edge Function invocation;
- `useTransactionEditing`: transaction classification edits and learning prompt;
- `useClassificationRuleManagement`: rule CRUD and historical reclassification;
- `useBudgetGroupManagement`: budget group CRUD and orphan reconciliation.

This is a pragmatic application-service layer rather than a formal domain layer.

### Pure Domain And Presentation Logic

**Location:** `web/src/lib/`

- `transactions.ts`: normalization, classification matching, filters and monthly grouping.
- `financialAnalysis.ts`: recurring candidate detection, dashboard projections and monthly projection detail.
- `monthKeys.ts`: local month/date arithmetic.
- `formatters.ts`: locale-aware BRL, percentage, month and date formatting.
- `supabase.ts`: client creation and configuration guard.

Financial projections are computed client-side from the complete transaction list. Recurring candidates use recent history, exclude transfers/installments and suppress estimates when a matching persisted transaction exists.

### Component Organization

**Location:** `web/src/components/`

Views compose focused components:

- dashboard overview;
- monthly projection summary, breakdown and items;
- transaction tables and edit dialog;
- classification rule management;
- budget group management;
- import flow;
- authenticated workspace shell.

Radix-backed primitives live in `components/ui/`.

## Data Flows

### Authentication

1. `useAuthSession` calls `supabase.auth.getSession()`.
2. `onAuthStateChange` updates session and detects password recovery.
3. Unauthenticated users are normalized to `/login`.
4. Auth actions call Supabase Auth directly.
5. Logout clears user-owned frontend collections and selected month.

### Initial Data Load

1. An authenticated session triggers `useTransactionsData`.
2. The hook loads `budget_groups`.
3. It loads `transaction_classification_rules`.
4. It loads `transactions`, ordered by date descending.
5. Database rows pass through explicit normalizers.
6. React state feeds `useDashboardState`.

The queries are currently sequential and the transaction query is not paginated.

### Monthly Analysis And Projection

1. Transactions are normalized and decorated with group names.
2. `buildMonthData` builds realized monthly aggregates.
3. `buildFinancialAnalysis` creates summaries and recurring candidates.
4. `buildOverview` generates the three-month dashboard horizon.
5. `buildMonthlyProjectionInsight` generates detailed current/future month items.
6. Current-month indicators combine realized balance with remaining registered/probable items.
7. `MonthlyView` renders summary, breakdown, item detail and the realized transaction table.

### Transaction Editing And Rule Learning

1. A user opens `TransactionEditModal`.
2. `useTransactionEditing` persists type/category/group changes.
3. If classification changed, a learning prompt can create a user rule.
4. `useClassificationRuleManagement` upserts the rule.
5. The user may reclassify matching historical transactions.
6. Edge Functions apply the same persisted rules to later imports.

### Import Pipeline

1. `ImportPanel` accepts Nubank CSV or Santander PDF.
2. `useTransactionsImport` reads text or converts the PDF to base64.
3. The matching Edge Function authenticates the bearer token.
4. A bank-specific parser produces normalized candidate transactions.
5. Shared code resolves named budget groups to user-owned IDs.
6. User classification rules override baseline classification.
7. Ignored rows and previously imported external IDs are removed.
8. Installment schedules are expanded and duplicate purchase series are detected.
9. Remaining rows are inserted into `transactions`.
10. The frontend reloads all application data.

### Database Deployment

1. A push to `main` touching `supabase/**` triggers GitHub Actions.
2. The workflow links the configured Supabase project.
3. `supabase db push` applies migrations.
4. Three Edge Functions deploy in a matrix after migrations succeed.

Frontend production deployment is handled separately by Render auto deploy.

## Database Boundary

Supabase is both persistence and authorization boundary.

- `transactions.user_id`, `budget_groups.user_id` and rule `user_id` isolate tenants.
- RLS policies allow authenticated users to operate only on owned rows.
- triggers maintain `updated_at`.
- checks constrain transaction types, categories and rule modes.
- user creation seeds default 50/30/20 budget groups.
- imported transactions use `external_id` for idempotency.

## Local And Legacy Boundary

`tools/` is not imported by the SPA or Edge Functions. It remains an operational/legacy path for local extraction and archived Notion outputs.

The active product path is:

```text
web -> Supabase Auth/PostgREST/Functions -> Postgres
```

The legacy path is:

```text
local files -> Python -> inbox JSON/CSV -> Notion/manual review
```

## Module Boundaries

- Components should not issue Supabase queries directly.
- Hooks own asynchronous workflows and state mutation.
- `lib/` owns pure transformations and financial calculations.
- migrations own schema integrity and RLS.
- Edge entrypoints own HTTP/auth orchestration.
- Edge `_shared` modules own bank parsing and import rules.
- Python tools remain independent of the active runtime.
