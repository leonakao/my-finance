# Marcar Transacao Recorrente Ate Data Limite Tasks

**Design**: `.specs/features/008-marcar-transacao-recorrente-ate-data-limite/design.md`
**Status**: Draft
**Baseline**: 105 testes Vitest; 32 testes Playwright; suite de imports e migrations local via Supabase

---

## Execution Plan

### Phase 1: Schema And Contracts (Sequential)

As fundacoes de schema e tipos precisam vir primeiro porque a feature inteira depende delas.

```text
T1 -> T2 -> T3 -> T4
```

### Phase 2: Mutation Flows (Parallel OK)

Depois dos contratos, os fluxos de recorrencia manual, criacao manual e regras com notas podem andar em paralelo.

```text
T4 -> T5
T4 -> T6 [P]
T4 -> T7 [P]
```

### Phase 3: Projection And Presentation (Parallel OK)

Com schema e mutacoes definidos, projecao e UI podem evoluir em paralelo, convergindo na integracao.

```text
T4 -> T8
T5 -> T9
T6 -> T9
T8 -> T9
```

### Phase 4: Import And Historical Integration (Sequential)

O fluxo de importacao e a reclassificacao precisam absorver o novo contrato de colunas e notas.

```text
T2 -> T10 -> T11
```

### Phase 5: Full Integration And Validation (Sequential)

```text
T7 + T9 + T11 -> T12 -> T13
```

### Full Execution Map

```text
T1 -> T2 -> T3 -> T4 ------------------┬-> T5
                                        ├-> T6 [P]
                                        └-> T7 [P]
T4 -----------------------------------------┐
T5 -----------------------------------------┼-> T9
T6 -----------------------------------------┤
T8 -----------------------------------------┘
T2 -> T10 -> T11 ---------------------------┐
T7 -----------------------------------------┼-> T12 -> T13
T9 -----------------------------------------┤
T11 ----------------------------------------┘
```

---

## Task Breakdown

### T1: Estender schema de `transactions` para origem e ignorar

**What**: Adicionar `origin_transaction_id`, `is_ignored` e `source_kind` em `transactions`, com constraints, indices, trigger de consistencia entre usuarios e validacao local de migration/RLS.
**Where**: `supabase/migrations/20260612110000_add_transaction_origin_link.sql`, `tools/` teste local novo ou adaptado
**Depends on**: None
**Reuses**: `set_updated_at()`, constraints de ownership ja usadas em `budget_group_id`, padrao de policies atuais
**Requirements**: RECR-03, RECR-13, RECR-14, RECR-30, RECR-34

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `origin_transaction_id` referencia `transactions.id`
- [ ] auto-referencia direta e cruzamento entre usuarios sao bloqueados
- [ ] `is_ignored` defaulta para `false`
- [ ] `source_kind` aceita os valores definidos no design
- [ ] indices por `origin_transaction_id`, `is_ignored` e `source_kind` existem
- [ ] migration sobe em banco limpo e o script local valida os contratos principais

**Tests**: migration/RLS + scenario local
**Gate**: Database

**Verify**:

```bash
supabase db reset
```

Expected: migration aplica sem erro e os checks locais da nova coluna passam.

**Commit**: `feat(transactions): add origin and ignore metadata`

---

### T2: Adicionar `notes` ao schema de `transaction_classification_rules`

**What**: Criar a migration que adiciona `notes` em `transaction_classification_rules` e valida a compatibilidade com CRUD, importacao e reclassificacao.
**Where**: `supabase/migrations/20260612111000_add_notes_to_transaction_classification_rules.sql`
**Depends on**: T1
**Reuses**: schema atual de regras e migrations recentes da feature `007`
**Requirements**: RECR-25, RECR-26, RECR-27, RECR-28, RECR-29

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] a coluna `notes text null` existe em `transaction_classification_rules`
- [ ] a migration sobe em banco limpo junto das demais
- [ ] nenhuma policy existente quebra com a nova coluna

**Tests**: migration/RLS
**Gate**: Database

**Verify**:

```bash
supabase db reset
```

Expected: banco reinicializa com a nova coluna sem erro.

**Commit**: `feat(rules): add notes column to classification rules`

---

### T3: Estender contratos TypeScript de transacao e regra

**What**: Atualizar os tipos de `Transaction`, `TransactionRecord`, `TransactionEditPayload` e `ClassificationRule` para suportar `originTransactionId`, `isIgnored`, `sourceKind` e `notes` na regra.
**Where**: `web/src/types.ts`
**Depends on**: T2
**Reuses**: contratos atuais de transacao, regra e projecao
**Requirements**: RECR-23, RECR-24, RECR-30, RECR-34

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] os novos campos sao exportados em camelCase e snake_case
- [ ] payloads suportam criacao manual, recorrencia e ignorar
- [ ] `ClassificationRule` aceita `notes`
- [ ] `npm run typecheck` passa

**Tests**: none
**Gate**: quick unit

**Verify**:

```bash
cd web
npm run typecheck
```

Expected: TypeScript termina com exit code `0`.

**Commit**: `feat(types): extend transaction and rule contracts`

---

### T4: Normalizar e carregar os novos campos de transacao e regra

**What**: Atualizar normalizadores e `useTransactionsData` para ler `origin_transaction_id`, `is_ignored`, `source_kind` e `notes` de regra, incluindo testes dos hooks e helpers afetados.
**Where**: `web/src/lib/transactions.ts`, `web/src/hooks/useTransactionsData.ts`, testes co-localizados
**Depends on**: T3
**Reuses**: `normalizeTransaction()`, `normalizeClassificationRule()`, padrao atual de carga autenticada
**Requirements**: RECR-23, RECR-24, RECR-37

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `transactions` carregam os novos campos corretamente
- [ ] regras carregam `notes`
- [ ] linhas ignoradas permanecem disponiveis em memoria para auditoria, mas com flag explicita
- [ ] testes do helper e do hook cobrem a leitura dos novos campos
- [ ] gate rapido passa

**Tests**: hook + unit
**Gate**: Quick unit

**Verify**:

```bash
cd web
npm run test && npm run typecheck
```

Expected: testes e typecheck passam sem apagar cobertura existente.

**Commit**: `feat(data): load transaction origin and ignore fields`

---

### T5: Sincronizar recorrencia manual em `transactions`

**What**: Implementar o sincronizador que cria, atualiza e remove transacoes filhas futuras a partir da principal com base no mes limite.
**Where**: `web/src/hooks/useTransactionEditing.ts`, novo utilitario em `web/src/lib/` ou `web/src/hooks/`, testes co-localizados
**Depends on**: T4
**Reuses**: `monthKeys.ts`, fluxo atual de salvar edicao de transacao
**Requirements**: RECR-01, RECR-02, RECR-03, RECR-19, RECR-20, RECR-21, RECR-22

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] ativar recorrencia gera filhas futuras com `origin_transaction_id`
- [ ] a serie começa sempre no mes seguinte ao da principal
- [ ] `endMonth` igual ao mes da principal nao gera filhas
- [ ] alterar o limite cria ou remove apenas os meses necessarios
- [ ] desligar recorrencia remove apenas filhas futuras nao realizadas
- [ ] editar nota/classificacao da principal sincroniza filhas futuras derivadas
- [ ] testes do hook cobrem criacao, edicao e remocao
- [ ] gate rapido passa

**Tests**: hook
**Gate**: Quick unit

**Verify**:

```bash
cd web
npm run test && npm run typecheck
```

Expected: testes de hook passam cobrindo os fluxos de sincronizacao.

**Commit**: `feat(recurring): sync future transactions from anchor`

---

### T6: Implementar criacao manual e acoes de ignorar/excluir [P]

**What**: Criar o fluxo de mutacao para adicionar transacoes manuais em qualquer mes e expor operacoes de ignorar, restaurar e excluir uma linha.
**Where**: novo hook de gestao de transacoes ou extensao de `useTransactionEditing`, testes co-localizados
**Depends on**: T4
**Reuses**: cliente Supabase, padrao de feedback e mutacao dos hooks atuais
**Requirements**: RECR-30, RECR-31, RECR-32, RECR-33, RECR-34, RECR-35, RECR-36

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] existe mutacao para criar transacao manual com os campos do design
- [ ] existe mutacao para marcar/desmarcar `is_ignored`
- [ ] existe mutacao para excluir uma transacao
- [ ] ignorar remove a linha dos calculos sem apagar do banco
- [ ] existe caminho de restauracao da linha ignorada pela propria UI
- [ ] testes do hook cobrem create, ignore/restore e delete
- [ ] gate rapido passa

**Tests**: hook
**Gate**: Quick unit

**Verify**:

```bash
cd web
npm run test && npm run typecheck
```

Expected: testes do fluxo de gestao passam com rollback/feedback cobertos.

**Commit**: `feat(transactions): add manual create and ignore actions`

---

### T7: Estender CRUD de regras para `notes` [P]

**What**: Permitir salvar `notes` nas regras de classificacao, incluindo aprendizado a partir da transacao e persistencia no frontend.
**Where**: `web/src/hooks/useClassificationRuleManagement.ts`, utils associados, componentes de regras e testes co-localizados
**Depends on**: T4
**Reuses**: fluxo atual de `saveClassificationRule()`, prompt de reaplicacao e formulario de regras
**Requirements**: RECR-25, RECR-26, RECR-29

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] formularios aceitam `notes` opcional
- [ ] o aprendizado a partir de transacao pode carregar a nota
- [ ] feedback deixa claro que a nota so preenche quando vazia
- [ ] testes de hook/componente cobrem save e update da regra
- [ ] gate rapido passa

**Tests**: hook + component
**Gate**: Quick unit

**Verify**:

```bash
cd web
npm run test && npm run lint
```

Expected: testes e lint passam para os componentes e hooks de regras.

**Commit**: `feat(rules): support notes on classification rules`

---

### T8: Ajustar a projecao para usar `transactions` conhecidas e respeitar `is_ignored`

**What**: Simplificar `buildFinancialAnalysis()` para tratar `transactions` como base conhecida unica, eliminar dupla contagem com `probable` e ignorar linhas marcadas com `is_ignored`.
**Where**: `web/src/lib/financialAnalysis.ts`, `web/src/lib/financialAnalysis.test.ts`
**Depends on**: T4
**Reuses**: pipeline atual de analise, `buildRecurringCandidates()`, agregadores e `projectionExclusions`
**Requirements**: RECR-04, RECR-05, RECR-07, RECR-08, RECR-09, RECR-10, RECR-11, RECR-12, RECR-15, RECR-16, RECR-17, RECR-18, RECR-33

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] transacoes conhecidas vencem sempre sobre `probable`
- [ ] linhas ignoradas saem de totais e listas principais
- [ ] parcelamento importado e recorrencia manual ficam distinguiveis pela origem
- [ ] testes unitarios cobrem precedencia, deduplicacao e `is_ignored`
- [ ] gate rapido passa

**Tests**: unit
**Gate**: Quick unit

**Verify**:

```bash
cd web
npm run test && npm run typecheck
```

Expected: testes financeiros novos e existentes passam sem regressao.

**Commit**: `feat(projection): unify known transactions pipeline`

---

### T9: Integrar UI mensal e modal com criar, recorrencia, ignorar e excluir

**What**: Adaptar `TransactionEditModal`, `TransactionTable`, `MonthlyView` e componentes relacionados para expor o novo fluxo de criacao manual, recorrencia, notas, ignorar e excluir.
**Where**: `web/src/components/TransactionEditModal.tsx`, `TransactionTable.tsx`, `MonthlyView.tsx` e testes co-localizados
**Depends on**: T5, T6, T8
**Reuses**: `AppDialog`, padroes de spinner, confirmacao, feedback e acessibilidade do app
**Requirements**: RECR-01, RECR-02, RECR-19, RECR-30, RECR-31, RECR-32, RECR-37, RECR-38, RECR-39, RECR-40, RECR-41, RECR-42

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] o modal permite editar `notes` e recorrencia
- [ ] a pagina mensal permite criar transacao manual
- [ ] linhas exibem acoes de ignorar/restaurar/excluir quando aplicavel
- [ ] existe secao ou filtro explicito para localizar e restaurar transacoes ignoradas
- [ ] excluir a principal de uma serie mostra confirmacao explicita sobre a remocao em cascata das filhas
- [ ] foco, labels, spinner e confirmacoes seguem `AGENTS.md`
- [ ] testes de componente cobrem os novos controles
- [ ] gate de frontend build passa

**Tests**: component
**Gate**: Frontend build

**Verify**:

```bash
cd web
npm run test && npm run lint && npm run typecheck && npm run build
```

Expected: build frontend passa com os novos fluxos renderizados e testados.

**Commit**: `feat(monthly): expose recurring and manual transaction controls`

---

### T10: Adaptar importacao parcelada para `origin_transaction_id` e `source_kind`

**What**: Fazer o fluxo de parcelamento importado persistir a parcela principal e as derivadas com `origin_transaction_id` e `source_kind`, usando uma resolucao em duas passadas para ligar as parcelas ao `id` real da principal.
**Where**: `supabase/functions/_shared/installments.ts`, parsers/imports afetados, testes de scenario existentes
**Depends on**: T3
**Reuses**: estrategia de idempotencia e cronograma da feature `003`
**Requirements**: RECR-13, RECR-14, RECR-15, RECR-16, RECR-17, RECR-18

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] a parcela canonica principal fica identificavel
- [ ] as demais parcelas apontam para a principal
- [ ] a vinculacao usa uma segunda passada baseada no `external_id` da parcela `01/NN`
- [ ] `source_kind` distingue parcelamento importado
- [ ] idempotencia por `external_id` e preservada
- [ ] script de scenario de importacao continua passando

**Tests**: import integration
**Gate**: Import scenario

**Verify**:

```bash
sh tools/check_supabase_functions.sh
sh tools/test_import_santander_pdf.sh [pdf-path]
```

Expected: functions sobem e o scenario de parcelamento continua idempotente.

**Commit**: `feat(import): link installment transactions to origin`

---

### T11: Aplicar `notes` de regra em importacao e reclassificacao historica

**What**: Estender o backend de regras para persistir `notes` e aplicá-las apenas quando a transacao alvo estiver sem nota, tanto em importacao quanto em reaplicacao historica.
**Where**: `supabase/functions/_shared/classification-rules.ts`, `supabase/functions/reclassify-transactions-by-rule/`, migrations e testes/cenarios afetados
**Depends on**: T10
**Reuses**: contrato atual de match, endpoint de reclassificacao historica e CRUD de regras
**Requirements**: RECR-25, RECR-26, RECR-27, RECR-28, RECR-29

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] importacoes futuras preenchem `notes` apenas se vazia
- [ ] reclassificacao historica nao sobrescreve nota manual existente
- [ ] regras persistem `notes` no banco
- [ ] testes/cenarios cobrem a politica aprovada
- [ ] gates de backend relevantes passam

**Tests**: import integration + hook/frontend already co-located
**Gate**: Database + import scenario

**Verify**:

```bash
supabase db reset
sh tools/check_supabase_functions.sh
```

Expected: migration aplica e a logica de regras continua funcional com `notes`.

**Commit**: `feat(rules): apply notes without overwriting manual values`

---

### T12: Cobrir o fluxo usuario-a-usuario com E2E

**What**: Adicionar E2E para criacao manual, recorrencia, ignorar/restaurar, exclusao, origem visivel e deduplicacao com `probable`.
**Where**: `web/e2e/monthly.spec.ts` e/ou novo spec dedicado, helpers E2E
**Depends on**: T7, T9, T11
**Reuses**: helpers autenticados, fixtures de dados e padrao atual da pagina mensal
**Requirements**: RECR-06, RECR-12, RECR-18, RECR-22, RECR-29, RECR-31, RECR-32, RECR-37, RECR-38, RECR-39, RECR-40, RECR-41, RECR-42

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] existe fluxo E2E de criar transacao manual
- [ ] existe fluxo E2E de marcar recorrencia e ver impacto futuro
- [ ] existe fluxo E2E de ignorar/restaurar e excluir
- [ ] existe fluxo E2E para restaurar ignoradas a partir da propria UI
- [ ] existe fluxo E2E para exclusao da principal com confirmacao de cascata
- [ ] existe fluxo E2E de coexistencia entre transacao conhecida e `probable`
- [ ] existe cobertura E2E ou confirmacao equivalente de fluxo visivel para regra com `notes` sem sobrescrever nota manual existente
- [ ] gate frontend full passa

**Tests**: e2e
**Gate**: Frontend full

**Verify**:

```bash
cd web
npm run test:e2e
```

Expected: a suite mensal/recorrencia passa no Supabase local.

**Commit**: `test(monthly): cover recurring and manual known transactions`

---

### T13: Rodar gate final e atualizar rastreabilidade

**What**: Executar o gate final relevante da feature, revisar contagem de testes e atualizar `spec.md`/`tasks.md` com status finais.
**Where**: `.specs/features/008-marcar-transacao-recorrente-ate-data-limite/`, `web/`, `supabase/`, `tools/`
**Depends on**: T12
**Reuses**: padrao de fechamento de features recentes
**Requirements**: RECR-01 até RECR-42

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] migrations sobem em banco limpo
- [ ] Vitest, lint, typecheck e build passam
- [ ] Playwright relevante passa
- [ ] startup/functions e scenario de import relevante passam
- [ ] status dos requisitos e tarefas refletem o que foi entregue

**Tests**: full stack validation
**Gate**: Database + Frontend full + import scenario

**Verify**:

```bash
supabase db reset
cd web
npm run test && npm run lint && npm run typecheck && npm run build && npm run test:e2e
cd ..
sh tools/check_supabase_functions.sh
```

Expected: todos os gates da feature terminam com exit code `0`.

**Commit**: `chore(feature-008): validate and close implementation`

---

## Parallel Execution Map

```text
Phase 1:
  T1 -> T2 -> T3 -> T4

Phase 2:
  T4 complete, then:
    ├── T5
    ├── T6 [P]
    └── T7 [P]

Phase 3:
  T4 -> T8
  T5 + T6 + T8 -> T9

Phase 4:
  T3 -> T10 -> T11

Phase 5:
  T7 + T9 + T11 -> T12 -> T13
```

---

## Validation Tables

### Granularity Check

| Task | Atomic? | Reason |
| --- | --- | --- |
| T1 | Yes | one migration deliverable plus its direct schema validation |
| T2 | Yes | one schema extension for rules |
| T3 | Yes | one contract/type surface |
| T4 | Yes | one normalization/load layer |
| T5 | Yes | one recurring synchronization workflow |
| T6 | Yes | one manual transaction management workflow |
| T7 | Yes | one rule CRUD extension for `notes` |
| T8 | Yes | one pure financial projection layer |
| T9 | Yes | one UI integration layer |
| T10 | Yes | one import/installment persistence layer |
| T11 | Yes | one backend rule-application extension |
| T12 | Yes | one E2E coverage layer |
| T13 | Yes | one validation/closure pass |

### Diagram-Definition Cross-Check

| Task | Depends on in plan | Depends on in task | Match |
| --- | --- | --- | --- |
| T1 | None | None | Yes |
| T2 | T1 | T1 | Yes |
| T3 | T2 | T2 | Yes |
| T4 | T3 | T3 | Yes |
| T5 | T4 | T4 | Yes |
| T6 | T4 | T4 | Yes |
| T7 | T4 | T4 | Yes |
| T8 | T4 | T4 | Yes |
| T9 | T5, T6, T8 | T5, T6, T8 | Yes |
| T10 | T3 | T3 | Yes |
| T11 | T10 | T10 | Yes |
| T12 | T7, T9, T11 | T7, T9, T11 | Yes |
| T13 | T12 | T12 | Yes |

### Test Co-location Validation

| Task | Layer touched | Required test from matrix | Included? | Parallel-safe |
| --- | --- | --- | --- | --- |
| T1 | migration/RLS | database + scenario | Yes | No |
| T2 | migration/RLS | database | Yes | No |
| T3 | types only | none/typecheck | Yes | Yes |
| T4 | helper + hook | unit/hook | Yes | Yes |
| T5 | hook/workflow | hook | Yes | Yes |
| T6 | hook/workflow | hook + E2E later | Yes | Yes |
| T7 | hook + component | hook/component | Yes | Yes |
| T8 | pure financial helper | unit | Yes | Yes |
| T9 | React components | component + frontend build | Yes | Yes |
| T10 | import behavior | shell scenario | Yes | No |
| T11 | backend import/reclassify | database + scenario | Yes | No |
| T12 | route/page composition | E2E | Yes | Mostly |
| T13 | cross-layer closure | full gates | Yes | No |

---

## Recommended Tools For Execution

For this task set, the default stack is enough:

- MCPs: NONE required
- Skills: `tlc-spec-driven`

If you want, o próximo passo é eu aprovar internamente este plano e começar a executar pela T1.  
