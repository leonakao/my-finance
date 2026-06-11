# Project Structure

**Analyzed:** 2026-06-11
**Root:** `/Users/leonakao/projects/personal/finance`

## Directory Tree

```text
.
├── .github/workflows/
│   └── supabase-deploy.yml
├── .specs/
│   ├── codebase/
│   ├── features/
│   ├── project/
│   └── quick/
├── inbox/
├── supabase/
│   ├── functions/
│   │   ├── _shared/
│   │   ├── import-nubank-csv/
│   │   ├── import-santander-account-pdf/
│   │   └── import-santander-pdf/
│   ├── migrations/
│   ├── config.toml
│   └── seed.sql
├── tools/
├── web/
│   ├── e2e/
│   │   └── helpers/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── styles/
│   │   └── test/
│   ├── package.json
│   ├── playwright.config.ts
│   ├── tsconfig.json
│   └── vite.config.ts
├── AGENTS.md
├── README.md
└── notion-finance.md
```

Generated/local directories such as `web/node_modules`, `web/dist`, `web/test-results`, `supabase/.temp` and Python caches are not source modules.

## Active Web Application

### Composition And Routing

- `web/src/App.tsx`: application composition, route normalization and top-level view selection.
- `web/src/main.tsx`: React bootstrap.
- `web/src/types.ts`: shared application contracts.
- `web/src/constants.ts`: domain option sets.

### Components

**Location:** `web/src/components/`

- Views: `DashboardOverviewView`, `MonthlyView`, `ImportView`, `ClassificationRulesView`, `BudgetGroupsView`.
- Projection: `MonthlyProjectionSummary`, `MonthlyProjectionBreakdown`, `MonthlyProjectionItems`.
- Transactions: `TransactionTable`, `TransactionEditModal`, classification prompts.
- Shell/auth: `WorkspaceLayout`, `SignIn`, `MissingConfig`.
- UI primitives: `components/ui/AppDialog.tsx` and `ConfirmDialog.tsx`.

### Hooks

**Location:** `web/src/hooks/`

Hooks are organized by workflow rather than by page. They own session, loading, CRUD and derived dashboard state.

### Libraries

**Location:** `web/src/lib/`

- financial calculations;
- transaction normalization/classification;
- month arithmetic;
- formatters;
- Supabase client.

### Styling

- `web/src/App.css`: feature and layout styles.
- `web/src/index.css`: style entry imports.
- `web/src/styles/`: theme, base and reusable component styles.

## Supabase

### Migrations

**Location:** `supabase/migrations/`

Eight migrations currently establish and evolve:

- profiles;
- transactions;
- external ID idempotency;
- budget groups and transaction foreign key migration;
- user classification rules;
- expanded categories;
- removal of legacy `transactions.status`.

### Edge Functions

**Location:** `supabase/functions/`

Each deployed function owns an HTTP endpoint. `_shared/` contains bank parsers and shared import stages.

### Local Configuration

- `supabase/config.toml`: local ports, Auth and runtime.
- `supabase/seed.sql`: intentionally empty.

## Tests

- Co-located unit/component tests: `web/src/**/*.test.{ts,tsx}`.
- Browser E2E tests: `web/e2e/*.spec.ts`.
- E2E helpers: `web/e2e/helpers/`.
- Import integration scenarios: `tools/test_import_*.sh`.
- Function startup check: `tools/check_supabase_functions.sh`.

## Local And Legacy Tools

**Location:** `tools/`

- active operational scripts: environment switching, Render build, E2E/function checks;
- local extractors: Nubank CSV and Santander PDF;
- archived Notion aggregators: monthly summary/dashboard.

`inbox/` stores local financial source and generated files and is ignored by Git.

## Specifications

**Location:** `.specs/`

- `project/`: roadmap and persistent state.
- `features/`: numbered feature specs, designs and tasks.
- `quick/`: small tracked changes.
- `codebase/`: this brownfield map.

## Where Capabilities Live

| Capability | UI | State/Workflow | Pure Logic | Persistence |
| --- | --- | --- | --- | --- |
| Authentication | `SignIn` | `useAuthSession`, `useAuthActions` | redirect helpers in `App.tsx` | Supabase Auth |
| Dashboard | `DashboardOverviewView` | `useDashboardState` | `financialAnalysis.ts` | `transactions`, `budget_groups` |
| Monthly analysis | `MonthlyView` and projection components | `useDashboardState` | `financialAnalysis.ts`, `monthKeys.ts` | Supabase tables |
| Transaction editing | `TransactionEditModal` | `useTransactionEditing` | `transactions.ts` | `transactions` |
| Classification rules | prompts and `ClassificationRulesView` | `useClassificationRuleManagement` | `transactions.ts` | `transaction_classification_rules` |
| Budget groups | `BudgetGroupsView` | `useBudgetGroupManagement` | normalizers in `transactions.ts` | `budget_groups` |
| Import | `ImportView`, `ImportPanel` | `useTransactionsImport` | Edge `_shared` parsers | Edge Functions -> `transactions` |
| Deployment | none | shell/GitHub Actions | none | Render and Supabase |
