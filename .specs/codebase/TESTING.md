# Testing

**Analyzed:** 2026-06-11

## Current State

### Python tools

- nao ha suite automatizada documentada
- a validacao hoje e operacional:
  - conferir quantidade de transacoes
  - conferir total agregado
  - revisar classificacoes e descricoes

### Frontend

- `web/package.json` expoe:
  - `npm run lint`
  - `npm run build`
  - `npm run typecheck`
  - `npm run test`
  - `npm run test:e2e`
- Vitest + Testing Library cobrem helpers, hooks e componentes.
- Playwright cobre os fluxos autenticados principais.
- Baseline em 2026-06-11: 3 arquivos e 10 testes unitarios passando.

### Database

- a integridade principal hoje vem de:
  - constraints SQL
  - indices
  - triggers
  - RLS

### Supabase Edge Functions

- nao havia check dedicado documentado para `supabase/functions/`
- o check operacional minimo passa a ser:
  - subir a stack local com `supabase start`
  - rodar `sh tools/check_supabase_functions.sh`

## Test Strategy We Should Follow

### Minimum gate for Python changes

- rodar o script alterado com uma amostra conhecida
- conferir totais e contagens no stdout
- validar um trecho do JSON gerado quando a logica de parse/classificacao mudar

### Minimum gate for frontend changes

- helper puro ou regra financeira:
  - teste unitario co-localizado
  - `npm run test`
  - `npm run typecheck`
- componente ou hook:
  - teste com Testing Library quando houver comportamento observavel
  - `npm run test`
  - `npm run typecheck`
- integracao de pagina ou navegacao:
  - Playwright no fluxo afetado
  - `npm run test:e2e`
- toda alteracao frontend:
  - `npm run lint`
  - `npm run build`

## Test Coverage Matrix

| Code layer | Required test | Parallel-safe |
| --- | --- | --- |
| Pure financial/date helper | Unit (Vitest) | Yes |
| React presentation component | Component (Testing Library) | Yes |
| React hook/state derivation | Unit/component when behavior changes | Yes |
| Page composition and routing | E2E (Playwright) | No |
| CSS-only change | None; validate through owning component/page gate | Yes |
| Type-only contract | Typecheck | Yes |

## Gate Check Commands

Run from `web/`.

| Gate | Commands |
| --- | --- |
| Type | `npm run typecheck` |
| Unit | `npm run test && npm run typecheck` |
| Build | `npm run lint && npm run typecheck && npm run build` |
| Full | `npm run test && npm run lint && npm run typecheck && npm run build && npm run test:e2e` |

### Minimum gate for Supabase changes

- revisar migration para compatibilidade com dados existentes
- validar impacto em `transactions` e policies de RLS
- manter enum/checks sincronizados com o frontend
- quando houver alteracao em `supabase/functions/`, rodar `sh tools/check_supabase_functions.sh`

## Standards To Adopt

### Short term

- criar fixtures pequenas e anonimizadas para os scripts Python
- registrar comandos de verificacao em cada feature ou quick task relevante

### Medium term

- adicionar testes de integracao para os pipelines principais de `tools/`
- ampliar testes de componentes para estados vazios, erros e acessibilidade

## Non-Negotiable Rules

- toda mudanca em regra monetaria deve ser verificada com amostra real ou fixture representativa
- toda mudanca em enum de dominio deve ser validada no banco e na UI
- nunca considerar parser concluido sem reconciliar total com a origem quando esse fluxo exigir reconciliacao
