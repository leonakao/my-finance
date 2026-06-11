# Concerns

**Analyzed:** 2026-06-11

## High Priority

### 1. No Frontend CI Gate Before Deploy

**Evidence:**

- `.github/workflows/supabase-deploy.yml` only applies migrations and deploys Edge Functions.
- Render auto deploys `main`.
- Frontend lint, typecheck, unit tests and build are only documented as local commands.

**Risk:** a push can deploy a broken frontend or deploy Supabase changes without validating the web client that consumes them.

**Recommended fix:** add a pull-request/push workflow running `npm ci`, unit tests, lint, typecheck and build. Run E2E against local Supabase for changes touching routes, persistence or migrations.

### 2. Active Import Logic Has No Direct Unit Tests

**Evidence:**

- Edge shared parsers total more than 1,400 lines.
- Existing shell scenarios exercise full imports but not focused parser branches.
- `check_supabase_functions.sh` only validates startup.

**Risk:** bank format edge cases, classification changes and deduplication regressions are expensive to diagnose and can affect financial data.

**Recommended fix:** add Deno/unit fixtures for `nubank.ts`, `santander.ts`, `santander-account.ts`, `installments.ts` and classification rules. Keep shell scenarios as end-to-end reconciliation gates.

### 3. Classification And Domain Rules Are Duplicated

**Evidence:**

- categories and baseline classifications exist in frontend constants, migrations, Edge parsers and Python scripts;
- description normalization exists in both `web/src/lib/transactions.ts` and `supabase/functions/_shared/classification-rules.ts`;
- local Python behavior still includes legacy `status` and Notion group labels.

**Risk:** one runtime can classify or validate differently from another.

**Recommended fix:** define a deliberate cross-runtime contract and add contract tests/fixtures. Do not attempt runtime code sharing between browser, Deno and Python unless it reduces rather than increases complexity.

### 4. Full Client-Side Load And Aggregation

**Evidence:**

- `useTransactionsData` selects all transactions with no pagination.
- `supabase/config.toml` limits API rows to 1000 locally.
- dashboard, filters and projections recompute from the loaded array.

**Risk:** users with more than the API row limit can receive incomplete financial analysis without an obvious error; rendering and calculation cost grows linearly.

**Recommended fix:** first detect/count truncation and make the failure explicit. Then introduce pagination or server-side views/RPCs for summaries while retaining targeted detail queries.

## Medium Priority

### 5. Large Frontend Modules Bypass Complexity Limits

**Evidence:**

- `App.tsx`: 643 lines with disables for file length, function length and complexity.
- `financialAnalysis.ts`: 604 lines with multiple complexity disables.
- `transactions.ts`: 401 lines with file-length disable.

**Risk:** feature work increases coupling and makes regression review harder.

**Recommended fix:** keep new async workflows in dedicated hooks and split pure libraries by stable domain responsibility. Avoid cosmetic refactors; extract only when a feature creates a clear boundary.

### 6. Duplicate Edge Function Orchestration

**Evidence:**

- three `index.ts` files repeat auth, JSON response, group resolution, rule application, deduplication, insertion and result counting.

**Risk:** fixes to error handling or import ordering may be applied to only one bank endpoint.

**Recommended fix:** extract a small shared authenticated import runner while leaving bank-specific payload validation and parsing in each entrypoint.

### 7. Production Bundle Exceeds Vite Warning Threshold

**Evidence from 2026-06-11 build:**

```text
dist/assets/index-BNvZb3kh.js 548.74 kB minified, 157.63 kB gzip
```

Vite warns for chunks over 500 kB.

**Risk:** slower startup on low-power mobile devices and constrained networks.

**Recommended fix:** measure route-level cost, then lazy-load lower-frequency views such as import, rules and budget groups. Do not split solely to silence the warning without measuring.

### 8. README And Web README Are Stale

**Evidence:**

- root README still describes magic-link auth although implementation uses password auth;
- it lists `transactions.status`, removed by migration `20260611102000`;
- import documentation omits some active details and retains legacy Notion framing;
- `web/README.md` is still the generic Vite template.

**Risk:** operators and contributors follow incorrect schema/setup instructions.

**Recommended fix:** rewrite the application sections from migrations and current hooks; replace the template README with project-specific development instructions.

### 9. Render Configuration Is Partly Unversioned

**Evidence:**

- no `render.yaml`;
- SPA rewrite was configured remotely;
- deploy settings are documented but not enforced from repository code.

**Risk:** recreating the service or changing environments can reintroduce direct-route 404s.

**Recommended fix:** version Render blueprint/configuration if compatible with the current service, or maintain a deploy verification script that checks the rewrite and key settings.

## Lower Priority

### 10. Initial Data Queries Are Sequential

**Evidence:** `useTransactionsData` waits for groups, then rules, then transactions.

**Risk:** unnecessary startup latency.

**Recommended fix:** run independent selects concurrently after preserving clear per-source error reporting.

### 11. E2E And Integration Infrastructure Shares Local Services

**Evidence:**

- all browser tests share one Supabase instance;
- Function server and fixed local ports are shared;
- shell scenarios use fixed temporary filenames.

**Risk:** parallel runs can contend or overwrite artifacts.

**Recommended fix:** keep database rows namespaced by user, serialize service-level scenarios, and include process/test IDs in temporary paths.

### 12. Python Legacy Path Is Untested And Semantically Divergent

**Evidence:**

- no Python test framework/configuration;
- scripts retain Notion-oriented `status` and old group names;
- README marks summary/dashboard flows as archived.

**Risk:** accidental reuse produces output inconsistent with the active Supabase model.

**Recommended fix:** label archived scripts clearly in filenames/docs or move them under a legacy directory. Add fixture tests only for local extractors that remain operational.

### 13. Deployment Tool Version Is Unpinned

**Evidence:** GitHub Actions installs Supabase CLI with `version: latest`.

**Risk:** deployment behavior may change without a repository change.

**Recommended fix:** pin a tested CLI version and update intentionally.

## Security And Data Handling Notes

- RLS is the correct primary tenant boundary and is present on current user-owned tables.
- `inbox/` is ignored, which prevents local bank files from being newly tracked by default.
- `web/.env.supabase.remote` is tracked and contains a publishable key; this is acceptable only because authorization is enforced by RLS. Never place service-role keys there.
- `notion-finance.md` contains database/data-source identifiers and public Notion URLs. Treat it as operational metadata and avoid adding secrets.
- Edge Functions allow `Access-Control-Allow-Origin: *`; bearer auth still protects operations, but allowed origins should be revisited if browser abuse or credential leakage becomes a concern.
