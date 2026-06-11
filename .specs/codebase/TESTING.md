# Testing Infrastructure

**Analyzed:** 2026-06-11

## Frameworks

- Unit/component: Vitest 4.1.8.
- DOM environment: jsdom 29.
- React testing: Testing Library React 16.3 and User Event 14.6.
- E2E: Playwright 1.60.
- Import integration: POSIX shell, curl and jq against local Supabase.
- Coverage: no coverage provider, target or enforcement configured.

## Verified Baseline

Commands run on 2026-06-11:

```text
npm run test       -> 9 files, 53 tests passed
npm run lint       -> passed
npm run typecheck  -> passed
npm run build      -> passed
```

The Playwright suite currently contains 22 tests across six spec files. It was not rerun during this mapping because it requires the local Supabase stack and Function server.

## Test Organization

### Unit And Component

**Location:** co-located under `web/src/`
**Naming:** `*.test.ts` and `*.test.tsx`

Current coverage:

- `lib/financialAnalysis.test.ts`: 19 financial projection tests;
- `lib/monthKeys.test.ts`: 8 date/month tests;
- `lib/transactions.test.ts`: 4 normalization/classification tests;
- `hooks/useDashboardState.test.ts`: 3 derived state tests;
- `hooks/useTransactionEditing.test.tsx`: 3 mutation/workflow tests;
- projection component tests: 13 tests;
- `TransactionEditModal.test.tsx`: 3 form tests.

Patterns:

- fixed dates are passed explicitly to pure functions;
- financial fixtures use small transaction factories;
- React components use semantic queries (`getByRole`, `getByText`);
- hooks mock Supabase boundaries where needed;
- tests favor observable behavior over snapshots.

### E2E

**Location:** `web/e2e/`

Suites:

- `dashboard.spec.ts`: 3;
- `import.spec.ts`: 2;
- `monthly-projection.spec.ts`: 3;
- `monthly.spec.ts`: 8;
- `rules.spec.ts`: 2;
- `shell.spec.ts`: 4.

Patterns:

- each test creates a unique authenticated Supabase user;
- fixtures are inserted through an authenticated Supabase client;
- routes and UI are exercised in Chromium;
- assertions use roles, labels and visible localized text;
- `run_web_e2e.sh` starts local Edge Functions around Playwright.

### Import Integration Scenarios

**Location:** `tools/test_import_nubank_csv.sh` and `tools/test_import_santander_pdf.sh`

These scripts:

- create a unique local user;
- invoke Edge Functions over HTTP;
- run the same import twice;
- assert first insertion and second-run idempotency;
- query PostgREST for persisted rows;
- verify installment schedules and dates.

They are scenario tests, not unit tests for parser internals.

### Database

Database behavior is primarily validated indirectly through:

- migration application in local Supabase;
- RLS during authenticated E2E;
- constraints during CRUD/import flows;
- integration scripts.

There is no dedicated SQL assertion suite for every policy or constraint.

## Configuration

### Vitest

Configured in `web/vite.config.ts`:

- jsdom;
- `src/test/setup.ts`;
- excludes E2E, `node_modules` and `dist`.

### Playwright

Configured in `web/playwright.config.ts`:

- test directory `e2e`;
- 60-second timeout;
- base URL `http://127.0.0.1:4173`;
- trace retained on failure;
- Vite web server reused when already running.

`npm run test:e2e` wraps Playwright with `tools/run_web_e2e.sh`, which requires `supabase start` and starts `supabase functions serve --no-verify-jwt`.

## Commands

Run from `web/` unless noted:

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Run from repository root:

```bash
supabase start
sh tools/check_supabase_functions.sh
sh tools/test_import_nubank_csv.sh [csv-path] [account|card]
sh tools/test_import_santander_pdf.sh [pdf-path]
```

## Coverage Matrix

| Code layer | Required test | Location | Gate |
| --- | --- | --- | --- |
| Pure date/financial helper | Vitest unit | `web/src/lib/*.test.ts` | `npm run test && npm run typecheck` |
| React component | Testing Library | co-located `*.test.tsx` | `npm run test && npm run lint` |
| React hook | Vitest/Testing Library | `web/src/hooks/*.test.*` | `npm run test && npm run typecheck` |
| Route/page composition | Playwright | `web/e2e/*.spec.ts` | `npm run test:e2e` |
| Direct Supabase mutation | hook test plus E2E | hook + affected E2E suite | full frontend gate |
| Edge parser/import behavior | shell scenario; unit currently missing | `tools/test_import_*.sh` | scenario script |
| Migration/RLS | local migration plus authenticated scenario | migrations/E2E | `supabase db reset` plus affected tests |
| Python extractor | manual representative fixture; automated suite missing | `tools/` + `inbox/` | run script and reconcile totals |
| CSS-only behavior | owning component/E2E | component or E2E suite | lint/build plus visual interaction |

## Parallelism Assessment

| Test type | Parallel-safe | Isolation model | Evidence |
| --- | --- | --- | --- |
| Vitest | Yes | in-process isolated test files; pure fixtures/mocks | co-located unit tests |
| Playwright | Mostly | unique user per test namespaces database rows | `createUserSession()` generates unique email |
| Import shell scenarios | Not with identical temp names | fixed temp file paths per script and shared Function server | `tools/test_import_*.sh` |
| Database reset/migration | No | shared local database | Supabase local stack |
| Function startup check | No with another server on same port | shared local Functions port | `check_supabase_functions.sh` |

Playwright tests may run in parallel at the framework level, but all use the same local Supabase instance and can still contend on Auth/function capacity.

## Gate Levels

| Gate | When | Command |
| --- | --- | --- |
| Quick unit | pure helper/component change | `npm run test && npm run typecheck` |
| Frontend build | any frontend implementation | `npm run test && npm run lint && npm run typecheck && npm run build` |
| Frontend full | route, persistence or user flow | `npm run test && npm run lint && npm run typecheck && npm run build && npm run test:e2e` |
| Edge startup | shared/function code | `sh tools/check_supabase_functions.sh` |
| Import scenario | parser, installment or dedupe change | relevant `sh tools/test_import_*.sh` |
| Database | migration/RLS change | `supabase db reset` followed by affected frontend/scenario tests |

## CI Status

The repository GitHub workflow deploys Supabase but does not execute the test gates above. Render auto deploy also relies on local validation rather than a versioned frontend CI gate.
