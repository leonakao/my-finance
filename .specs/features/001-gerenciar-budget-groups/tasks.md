# Gerenciar Budget Groups Tasks

**Design**: `.specs/features/001-gerenciar-budget-groups/design.md`
**Status**: Draft

---

## Execution Plan

### Phase 1: Foundation (Sequential)

Schema e contratos canonicos primeiro.

```text
T1 -> T2
```

### Phase 2: Backend And Import Adaptation (Parallel OK)

Depois do schema pronto, adaptacoes de importacao e shape do frontend podem andar em paralelo.

```text
      /-> T3 -\
T2 ---         ---> T5
      \-> T4 -/
```

### Phase 3: UI Integration (Sequential)

CRUD de grupos e reclassificacao dependem do shape novo do frontend.

```text
T5 -> T6 -> T7
```

### Phase 4: Validation (Sequential)

```text
T7 -> T8
```

---

## Task Breakdown

### T1: Criar tabela `budget_groups` e semear defaults por usuario

**What**: Adicionar a tabela `public.budget_groups`, RLS, indices e extensao do `handle_new_user()` para criar os 3 grupos iniciais.
**Where**: `supabase/migrations/<novo_timestamp>_create_budget_groups.sql`
**Depends on**: None
**Reuses**: `supabase/migrations/20260603223000_init.sql`
**Requirement**: BG-01, BG-02, BG-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] A tabela `budget_groups` existe com `user_id`, `name` e `target_percentage`
- [ ] Existem policies RLS equivalentes ao padrao atual por `user_id`
- [ ] `handle_new_user()` garante `Necessidades`, `Desejos` e `Futuro` para usuario novo
- [ ] A migration documenta compatibilidade com dados existentes

**Tests**: none
**Gate**: schema review

---

### T2: Migrar `transactions` para `budget_group_id` nullable

**What**: Criar migration para adicionar `budget_group_id`, fazer backfill a partir do texto legado, remover o check textual e eliminar a coluna antiga ao final.
**Where**: `supabase/migrations/<novo_timestamp>_migrate_transactions_budget_group_id.sql`
**Depends on**: T1
**Reuses**: `supabase/migrations/20260603235500_rename_budget_groups.sql`
**Requirement**: BG-03, BG-04, BG-05, BG-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] `transactions.budget_group_id` referencia `budget_groups(id)` com `on delete set null`
- [ ] Registros legados `Necessidades`, `Desejos` e `Futuro` sao vinculados aos grupos seeded do mesmo usuario
- [ ] Registros legados `Receita`, `Transferência` e `Ignorar` sao convertidos para `budget_group_id = null`
- [ ] O campo textual antigo deixa de ser contrato canonico do schema
- [ ] Impacto em indices, policies e consultas existentes foi revisado

**Tests**: none
**Gate**: schema review

---

### T3: Adaptar Edge Functions para lookup por nome exato dos grupos iniciais [P]

**What**: Atualizar os helpers e handlers de importacao do Supabase para gravar `budget_group_id`, tentando localizar apenas `Necessidades`, `Desejos` e `Futuro` por nome exato; em caso contrario, salvar `null`.
**Where**: `supabase/functions/_shared/nubank.ts`, `supabase/functions/_shared/santander.ts`, `supabase/functions/_shared/santander-account.ts`, `supabase/functions/import-nubank-csv/index.ts`, `supabase/functions/import-santander-pdf/index.ts`
**Depends on**: T2
**Reuses**: heuristicas atuais de `type`, `category`, `status`
**Requirement**: BG-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Os imports deixam de escrever `budget_group` textual no contrato do banco
- [ ] O codigo tenta resolver `budget_group_id` apenas por nome exato dos 3 grupos iniciais
- [ ] Quando nao houver correspondencia exata, o import salva `budget_group_id = null`
- [ ] A logica atual de `type`, `category` e `status` permanece intacta
- [ ] Gate check passa: `sh tools/check_supabase_functions.sh`

**Tests**: none
**Gate**: functions check

---

### T4: Atualizar normalizacao e agregacao do frontend para grupos dinamicos [P]

**What**: Adaptar o carregamento e as funcoes de normalizacao/agregacao para usar `budget_group_id`, resolver nomes dinamicamente e ignorar transacoes orfas nos totais sem esconda-las.
**Where**: `web/src/App.jsx` ou modulos extraidos de `web/src/`
**Depends on**: T2
**Reuses**: `normalizeTransaction()`, `buildMonthData()`
**Requirement**: BG-06, BG-08, BG-09, BG-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O frontend carrega `budget_groups` do usuario separadamente de `transactions`
- [ ] `normalizeTransaction` passa a trabalhar com `budgetGroupId` e `budgetGroupName`
- [ ] A agregacao usa grupos dinamicos em vez de `GROUP_LABELS` fixo
- [ ] Transacoes sem grupo nao entram silenciosamente em nenhum total
- [ ] Gate check passa: `npm run lint` e `npm run build`

**Tests**: none
**Gate**: build

---

### T5: Extrair modulo de apresentacao para tabela de transacoes e seletor de grupos

**What**: Separar a tabela de transacoes de `App.jsx` e consolidar o fluxo de edicao de `budget_group_id` e exibicao de estado `Sem grupo`.
**Where**: `web/src/components/TransactionsTable.jsx`, `web/src/App.jsx`
**Depends on**: T3, T4
**Reuses**: tabela editavel atual, padrao de `handleUpdate()`
**Requirement**: BG-07, BG-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] A tabela virou componente separado
- [ ] O select de grupo lista apenas grupos do usuario
- [ ] O estado `Sem grupo` e visivel e reclassificavel
- [ ] O update de transacao persiste `budget_group_id` corretamente
- [ ] Gate check passa: `npm run lint` e `npm run build`

**Tests**: none
**Gate**: build

---

### T6: Implementar UI de CRUD de budget groups com meta editavel

**What**: Criar a area de gerenciamento de grupos para listar, criar, editar e excluir `budget_groups`, incluindo a meta percentual.
**Where**: `web/src/components/BudgetGroupManager.jsx`, `web/src/App.jsx`
**Depends on**: T5
**Reuses**: padrao atual de estado assinc e mensagens de erro/feedback
**Requirement**: BG-01, BG-02, BG-03, BG-11, BG-12

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O usuario consegue listar os proprios grupos
- [ ] O usuario consegue criar grupo com nome e meta
- [ ] O usuario consegue editar nome e meta
- [ ] O usuario consegue excluir grupo com reflexo em transacoes orfas
- [ ] Gate check passa: `npm run lint` e `npm run build`

**Tests**: none
**Gate**: build

---

### T7: Integrar feedback de transacoes orfas e metas dinamicas no dashboard

**What**: Ajustar o dashboard para exibir pendencias de classificacao e usar `target_percentage` dos grupos em vez de metas hardcoded.
**Where**: `web/src/App.jsx`, `web/src/components/BudgetGroupManager.jsx`, `web/src/components/TransactionsTable.jsx`
**Depends on**: T6
**Reuses**: cards e agregacao existentes
**Requirement**: BG-05, BG-09, BG-13, BG-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] O dashboard mostra transacoes sem grupo como pendencia visivel
- [ ] Comparacoes contra meta usam `target_percentage` persistido
- [ ] Grupos customizados aparecem normalmente nas agregacoes
- [ ] A UI continua funcional quando nao houver grupos default restantes
- [ ] Gate check passa: `npm run lint` e `npm run build`

**Tests**: none
**Gate**: build

---

### T8: Validar fluxo completo de schema, importacao e UI

**What**: Executar a verificacao integrada da feature e registrar resultados contra a spec.
**Where**: `supabase/migrations/`, `supabase/functions/`, `web/`
**Depends on**: T7
**Reuses**: checklist de validacao do projeto
**Requirement**: BG-01, BG-04, BG-07, BG-10, BG-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Migration e impacto em RLS/schema foram revisados
- [ ] `npm run lint` passa em `web/`
- [ ] `npm run build` passa em `web/`
- [ ] `sh tools/check_supabase_functions.sh` passa com a stack local do Supabase ativa
- [ ] O fluxo manual cobre onboarding/defaults, CRUD de grupos, exclusao com orfandade e importacao com fallback para `null`
- [ ] Qualquer desvio da spec fica documentado antes do merge

**Tests**: none
**Gate**: integrated

---

## Parallel Execution Map

```text
Phase 1:
  T1 -> T2

Phase 2:
  T2 complete, then:
    |- T3 [P]
    |- T4 [P]

Phase 3:
  T3 + T4 -> T5 -> T6 -> T7

Phase 4:
  T7 -> T8
```

---

## Granularity Check

| Task | Atomic? | Reason |
| ---- | ------- | ------ |
| T1 | Yes | uma migration focada na nova tabela e seed inicial |
| T2 | Yes | uma migration focada na relacao de transacoes com grupos |
| T3 | Yes | uma adaptacao coesa do contrato de importacao |
| T4 | Yes | um deliverable de shape de dados/agregacao no frontend |
| T5 | Yes | um componente e fluxo de edicao de transacoes |
| T6 | Yes | um componente/area de CRUD de grupos |
| T7 | Yes | uma integracao de UX e metas dinamicas no dashboard |
| T8 | Yes | uma etapa de validacao integrada |

## Diagram-Definition Cross-Check

| Task | Depends on in diagram | Depends on in definition | Match |
| ---- | --------------------- | ------------------------ | ----- |
| T1 | None | None | Yes |
| T2 | T1 | T1 | Yes |
| T3 | T2 | T2 | Yes |
| T4 | T2 | T2 | Yes |
| T5 | T3, T4 | T3, T4 | Yes |
| T6 | T5 | T5 | Yes |
| T7 | T6 | T6 | Yes |
| T8 | T7 | T7 | Yes |

## Test Co-location Validation

| Task | Layer touched | Required checks from TESTING.md | Included in task | Valid |
| ---- | ------------- | -------------------------------- | ---------------- | ----- |
| T1 | database | schema review, compatibility, RLS impact | schema review in done criteria | Yes |
| T2 | database | schema review, compatibility, RLS impact | schema review in done criteria | Yes |
| T3 | supabase functions | `sh tools/check_supabase_functions.sh` | functions check + import contract checks | Yes |
| T4 | frontend | `npm run lint`, `npm run build`, manual validation later | lint/build gate | Yes |
| T5 | frontend | `npm run lint`, `npm run build`, manual validation later | lint/build gate | Yes |
| T6 | frontend | `npm run lint`, `npm run build`, manual validation later | lint/build gate | Yes |
| T7 | frontend | `npm run lint`, `npm run build`, manual validation later | lint/build gate | Yes |
| T8 | integrated | manual flow + lint/build + functions check + schema review | integrated gate explicit | Yes |
