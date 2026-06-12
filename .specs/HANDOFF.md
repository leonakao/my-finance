# Handoff

**Date:** 2026-06-12T09:26:00-03:00
**Feature:** `006-remover-estimativas-provaveis-da-projecao`
**Task:** Execute - concluida

## Completed

- T1 a T10 concluidas e validadas.
- T7: `ProjectionExclusionDialog` e `AppDialog` acessivel com 6 testes direcionados.
- T8: acoes `Remover da projeção…`, disclosure `Ocultando X estimativa(s)`, restauracao e estados de saving.
- T9: composicao da `MonthlyView` com dialogo, `Desfazer` e painel controlado por rota.
- T10: integracao em `App.tsx`, `useDashboardState`, `useAuthActions`, helpers Supabase E2E e 10 testes Playwright.
- T11: rastreabilidade atualizada para 25/25 requisitos `Verified`.

## Validation

- `sh tools/test_projection_exclusions.sh` passou.
- `cd web && npm run test` passou com 105 testes Vitest.
- `cd web && npm run typecheck` passou.
- `cd web && npm run build` passou.
- `cd web && npm run test:e2e -- e2e/monthly-projection-exclusions.spec.ts --reporter=line` passou com 10 testes Playwright.

## Residual Issues

- `cd web && npm run lint` ainda falha apenas em:
  - `src/hooks/useClassificationRuleManagement.ts`
  - `src/lib/santanderAccountParser.test.ts`
- Esses erros pertencem a alteracoes paralelas fora da feature `006` e nao foram incluidos na implementacao.

## Context

- Preservar alteracoes paralelas em `ImportPanel.tsx`, `useClassificationRuleManagement.ts`, arquivos Santander e migrations nao relacionadas.
- O proximo passo seguro e revisar/commitar apenas os arquivos da feature `006` e os artefatos `.specs/`.
