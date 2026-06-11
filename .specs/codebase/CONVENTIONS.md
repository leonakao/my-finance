# Code Conventions

**Analyzed:** 2026-06-11

## Naming

### Files

- React components: `PascalCase.tsx`, for example `MonthlyView.tsx`.
- Hooks: `useCamelCase.ts`, for example `useTransactionsData.ts`.
- Libraries and configuration modules: `camelCase.ts`, for example `financialAnalysis.ts`.
- Tests: co-located `*.test.ts` or `*.test.tsx`.
- Playwright: `web/e2e/*.spec.ts`.
- Edge Function directories: kebab-case with `index.ts`.
- Shared Edge modules: kebab-case, for example `classification-rules.ts`.
- Python and shell: snake_case.
- SQL migrations: UTC-like timestamp prefix plus snake_case description.

### Code Symbols

- React components and TypeScript types: PascalCase.
- Functions, hooks, props and local variables: camelCase.
- Event handlers: `handle*` or semantic callback names such as `onConfirm`.
- Constants: `UPPER_SNAKE_CASE`.
- Database columns and SQL identifiers: snake_case.
- Domain values retain Portuguese labels such as `Despesa`, `Receita` and `Transferência`.

## TypeScript

### Type Safety

- Strict TypeScript is enabled.
- `type` aliases are required by ESLint instead of `interface`.
- Type-only imports use `import type`.
- Explicit `any` is forbidden.
- External database records have snake_case record types and explicit normalizers.
- Application types use camelCase.

Examples:

- `TransactionRecord` -> `normalizeTransaction` -> `Transaction`;
- `ClassificationRuleRecord` -> `normalizeClassificationRule` -> `ClassificationRule`;
- `BudgetGroupRecord` -> `normalizeBudgetGroup` -> `BudgetGroup`.

### Imports

Observed order is generally:

1. third-party runtime imports;
2. React type imports;
3. local components/hooks;
4. local libraries/constants;
5. local types.

Type imports are separated where practical.

### Function Design

- Pure derivations live in `lib/`.
- Async data operations live in hooks.
- Components receive callbacks rather than importing persistence directly.
- Small private helpers precede exported functions.
- Functions return early for invalid or empty states.

### React

- Functional components only.
- Controlled state is held in hooks or the nearest view.
- Reusable dialogs use Radix through `AppDialog`.
- Navigation uses semantic links/buttons and manual History API updates.
- Async buttons preserve labels and show `.button-spinner`.
- Feedback uses `role="status"` or `role="alert"`.
- Components use native semantics before ARIA.

### Error Handling

- Supabase calls inspect returned `error` explicitly.
- Hooks clear prior feedback before mutations.
- Errors are lifted to shared `setError`.
- Functions HTTP handlers return JSON with explicit 400/401/405/500 statuses.
- Import invocation unwraps `FunctionsHttpError` response bodies.
- Parsing catches only expected recoverable cases; unexpected errors propagate.

### Formatting And Locale

- Currency, percentages and dates use `Intl` helpers in `formatters.ts`.
- Financial UI uses Brazilian Portuguese and BRL.
- Dates use ISO `YYYY-MM-DD` internally and localized labels at presentation.
- Month keys use `YYYY-MM`.

## ESLint-Enforced Standards

Production TypeScript enforces:

- complexity <= 10;
- nesting depth <= 3;
- files <= 300 non-comment/non-blank lines;
- functions <= 80 non-comment/non-blank lines;
- curly braces and strict equality;
- no floating promises;
- exhaustive switch checking;
- explicit function return types outside configured React exceptions;
- no browser alerts;
- no unused disable directives.

Large existing modules carry explicit disables:

- `App.tsx`;
- `financialAnalysis.ts`;
- `transactions.ts`;
- selected views/hooks with long functions.

These are exceptions, not the preferred pattern for new modules.

## CSS

- Theme tokens live in `styles/theme.css`.
- element/reset/focus rules live in `styles/base.css`.
- reusable feedback and common components live in `styles/components.css`.
- most application-specific layouts remain in `App.css`.
- classes use descriptive kebab-case.
- focus styles use `:focus-visible`.
- motion has reduced-motion handling.
- tables are wrapped for horizontal overflow.

## Edge Functions

- Entry files follow a common sequence:
  1. validate method and runtime configuration;
  2. construct authenticated Supabase client;
  3. resolve current user;
  4. parse request body;
  5. invoke bank parser;
  6. resolve groups and rules;
  7. deduplicate;
  8. insert;
  9. return operational counts.
- Shared imports use Deno/npm specifiers.
- Database payloads preserve snake_case.
- Parser outputs use a shared `ParsedImportedTransaction` contract.

## SQL

Migration order within a file generally follows:

1. table/function definitions;
2. indexes and constraints;
3. triggers;
4. RLS enablement;
5. policies;
6. data migration/backfill where required.

User-owned tables:

- reference `auth.users(id)` with `on delete cascade`;
- include `created_at` and `updated_at`;
- use `public.set_updated_at()`;
- define separate select/insert/update/delete policies.

## Python

- Python scripts use only the standard library.
- `from __future__ import annotations` is standard.
- CLI parsing uses `argparse`.
- Paths use `pathlib.Path`.
- Money uses `Decimal`, not float.
- Transport rows use frozen dataclasses.
- JSON/CSV writers are explicit pipeline stages.
- `main()` is guarded by `if __name__ == "__main__"`.

## Shell

- Scripts use `#!/bin/sh` and `set -eu`.
- Project roots are resolved relative to the script.
- temporary files use `${TMPDIR:-/tmp}`.
- background processes install cleanup traps.
- integration scripts fail with explicit operational messages.

## Comments And Documentation

- Comments are uncommon and explain non-obvious parsing or heuristic behavior.
- Complex financial and installment rules receive explanatory comments.
- Public architecture/product decisions belong in `.specs/`.
- The root README is operational but currently contains some stale schema and auth descriptions; treat code and migrations as canonical.
