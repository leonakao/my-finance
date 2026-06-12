# Reclassificar Historico E Refinar Match Tasks

**Design**: `.specs/features/007-reclassificar-historico-e-refinar-match/design.md`
**Status**: Draft

---

## Execution Plan

### Phase 1: Schema And Contract Foundation (Sequential)

```text
T1 -> T2
```

### Phase 2: Backend Reclassification Flow (Sequential)

```text
T2 -> T3 -> T4
```

### Phase 3: Frontend Rule UX And Feedback (Sequential)

```text
T4 -> T5 -> T6
```

### Phase 4: Validation (Sequential)

```text
T6 -> T7
```

---

## Task Breakdown

### T1: Estender schema de regras com filtros de contexto

**What**: Adicionar migration para `match_institution` e `match_account`, com normalizacao de vazio para `null` e indices de suporte.
**Where**: `supabase/migrations/<novo_timestamp>_extend_transaction_classification_rules_match_context.sql`
**Depends on**: None
**Reuses**: `20260609130000_create_transaction_classification_rules.sql`
**Requirement**: RHM-07, RHM-09, RHM-12

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] A tabela aceita `match_institution` e `match_account`
- [ ] Regras antigas continuam validas com campos nulos
- [ ] A migration inclui indices coerentes com o novo filtro
- [ ] O schema review confirma que nao houve regressao em RLS ou unicidade existente

**Tests**: none
**Gate**: schema review

---

### T2: Refinar o contrato de match nas bibliotecas puras

**What**: Expandir os tipos e funcoes de match no frontend e no shared backend para respeitar `institution` e `account`, preservando a precedencia atual.
**Where**: `web/src/lib/transactions.ts`, `web/src/types.ts`, `supabase/functions/_shared/classification-rules.ts`
**Depends on**: T1
**Reuses**: `normalizeRuleDescription()`, `sortClassificationRules()`
**Requirement**: RHM-07, RHM-08, RHM-09, RHM-10, RHM-11, RHM-12

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] Os tipos de regra passam a carregar filtros extras opcionais
- [ ] O match exige igualdade exata de `institution` e `account` quando a regra os preencher
- [ ] A precedencia entre regras nao muda
- [ ] Os testes unitarios cobrindo os novos filtros passam sem apagar cenarios antigos
- [ ] Gate check passa com o total de testes esperado

**Tests**: unit
**Gate**: quick

---

### T3: Criar operacao backend de reclassificacao historica

**What**: Implementar uma Edge Function canonica para reaplicar uma regra sobre todas as transacoes elegiveis do usuario e retornar `updated_count`.
**Where**: `supabase/functions/reclassify-transactions-by-rule/index.ts`
**Depends on**: T2
**Reuses**: `transaction_classification_rules`, `transactions`, `supabase/functions/_shared/classification-rules.ts`
**Requirement**: RHM-01, RHM-02, RHM-03, RHM-04, RHM-05

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] A operacao recebe `rule_id` e executa no contexto do usuario autenticado
- [ ] O backend nao percorre o historico inteiro do usuario; ele empurra o filtro principal para o banco
- [ ] So linhas cujo snapshot mudaria sao atualizadas
- [ ] A implementacao prefere update em lote direto; se precisar de refinamento, ele acontece apenas sobre candidatas prefiltradas
- [ ] A resposta inclui a contagem de transacoes alteradas
- [ ] A execucao repetida e idempotente

**Tests**: none
**Gate**: `sh tools/check_supabase_functions.sh`

---

### T4: Cobrir a operacao server-side com testes de regressao

**What**: Adicionar testes que provem a cobertura do historico inteiro, os filtros extras e a idempotencia da reclassificacao pela Edge Function.
**Where**: suites relevantes em `web/src/lib/*.test.ts`, `web/src/hooks/*.test.tsx`, `web/e2e/` e/ou scripts Supabase
**Depends on**: T3
**Reuses**: matriz de `.specs/codebase/TESTING.md`
**Requirement**: RHM-01, RHM-02, RHM-03, RHM-06, RHM-08, RHM-09, RHM-10, RHM-11

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] Existe cobertura automatizada para match por conta e instituicao
- [ ] Existe cobertura automatizada para transacoes fora do recorte visivel da tela
- [ ] Existe cobertura automatizada provando que o fluxo nao depende de carregar o historico inteiro do usuario
- [ ] Existe cobertura automatizada para segunda execucao idempotente
- [ ] Gate de frontend e validacao da Edge Function passam

**Tests**: integration
**Gate**: full

---

### T5: Trocar a reclassificacao local por chamada canonica ao backend

**What**: Remover a dependencia de `transactions` em memoria no hook de gerenciamento de regras e chamar a operacao backend seguida de reload canonico.
**Where**: `web/src/hooks/useClassificationRuleManagement.ts`, `web/src/hooks/useTransactionsData.ts`
**Depends on**: T4
**Reuses**: `loadTransactions()`, feedback atual da UI
**Requirement**: RHM-01, RHM-03, RHM-04, RHM-05, RHM-06

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] `reclassifyExistingTransactions()` deixa de derivar candidatos do array local
- [ ] O hook chama a operacao backend e aguarda `updated_count`
- [ ] A UI recarrega dados canonicos antes de mostrar sucesso
- [ ] O erro de backend nao deixa a UI em estado parcialmente aplicado
- [ ] Os testes do hook cobrem sucesso, zero alteracoes e falha

**Tests**: unit
**Gate**: quick

---

### T6: Expor filtros extras e copy de escopo persistente na UI

**What**: Ajustar formulários, listagem e prompt para mostrar `institution` e `account` como parte do enquadramento e deixar claro que a reaplicacao age no historico persistido.
**Where**: componentes de regras, prompt de reclassificacao e componentes relacionados
**Depends on**: T5
**Reuses**: `ReclassificationPromptModal.tsx`, pagina `/app/regras`
**Requirement**: RHM-13, RHM-14, RHM-15, RHM-16

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] A regra mostra filtros extras ativos na listagem
- [ ] O formulario permite criar/editar/remover esses filtros
- [ ] O prompt informa que a operacao atualiza transacoes persistidas no banco
- [ ] A UI segue os padroes de acessibilidade e loading ja adotados no app
- [ ] Os testes/componentes atualizados passam

**Tests**: unit
**Gate**: quick

---

### T7: Validar o fluxo completo de regra, reaplicacao e reload canonico

**What**: Executar o gate final cobrindo schema, matcher, operacao backend, feedback da UI e fluxo completo de reaplicacao.
**Where**: `supabase/`, `web/`
**Depends on**: T6
**Reuses**: comandos de `.specs/codebase/TESTING.md`
**Requirement**: RHM-01 a RHM-16

**Tools**:

- MCP: `filesystem`
- Skill: NONE

**Done when**:

- [ ] `npm run test` passa em `web/`
- [ ] `npm run lint` passa em `web/`
- [ ] `npm run typecheck` passa em `web/`
- [ ] `npm run build` passa em `web/`
- [ ] `npm run test:e2e` cobre o fluxo ajustado
- [ ] A validacao de banco ou scenario equivalente cobre a operacao server-side

**Tests**: integration
**Gate**: full

---

## Diagram-Definition Cross-Check

| Task | Diagram position | Depends on field | Result |
| ---- | ---------------- | ---------------- | ------ |
| T1 | Phase 1 start | None | OK |
| T2 | After T1 | T1 | OK |
| T3 | After T2 | T2 | OK |
| T4 | After T3 | T3 | OK |
| T5 | After T4 | T4 | OK |
| T6 | After T5 | T5 | OK |
| T7 | After T6 | T6 | OK |

## Test Co-location Validation

| Task | Code layer | Required test from matrix | Included in task | Result |
| ---- | ---------- | ------------------------- | ---------------- | ------ |
| T1 | migration/schema | none + schema review | yes | OK |
| T2 | pure libs/types | unit | yes | OK |
| T3 | edge function | none + functions check | yes | OK |
| T4 | backend/frontend flow validation | integration | yes | OK |
| T5 | hook workflow | unit | yes | OK |
| T6 | component/form UX | unit | yes | OK |
| T7 | end-to-end flow | integration/full | yes | OK |
