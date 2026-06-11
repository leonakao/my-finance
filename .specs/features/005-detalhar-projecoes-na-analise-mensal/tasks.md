# Detalhar Projecoes Na Analise Mensal Tasks

**Design**: `.specs/features/005-detalhar-projecoes-na-analise-mensal/design.md`
**Status**: In Progress
**Baseline unitario**: 3 arquivos, 10 testes passando em 2026-06-11

---

## Execution Plan

### Phase 1: Foundation (Sequential)

```text
T1 -> T2 -> T3 -> T4
```

### Phase 2: Presentation (Parallel)

Depois de T3, os componentes podem ser criados em paralelo.

```text
T3 -> T5
T3 -> T6
T3 -> T7
```

### Phase 3: Styling (Sequential)

```text
T5 + T6 + T7 -> T8
```

### Phase 4: Page Integration And E2E (Sequential)

```text
T4 + T5 + T6 + T7 + T8 -> T9
```

### Full Execution Map

```text
T1 -> T2 -> T3 -> T4 --------------------------┐
             ├-> T5 --┐                        |
             ├-> T6 --+-> T8 ------------------+-> T9
             └-> T7 --┘                        |
```

---

## Task Breakdown

### T1: Definir contratos da analise financeira

**What**: Adicionar os tipos de itens, agregados, totais, insight mensal e retorno combinado definidos no design.
**Where**: `web/src/types.ts`
**Depends on**: None
**Reuses**: `TransactionType`, `FinancialOverview`, `RecurringCandidate`, `BudgetGroup`
**Requirements**: MPROJ-01, MPROJ-02, MPROJ-03, MPROJ-05, MPROJ-06, MPROJ-08, MPROJ-10, MPROJ-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `RecurringCandidate` inclui contagens, ultima data observada e dia esperado
- [x] `ProjectionItemBasis`, `ProjectionLineItem`, `ProjectionGroupSummary` e `ProjectionCategorySummary` estao exportados
- [x] `MonthlyProjectionTotals`, `MonthlyProjectionInsight` e `FinancialAnalysis` estao exportados
- [x] Os tipos representam `registered` e `probable` sem introduzir estado de pagamento
- [x] `npm run typecheck` passa

**Tests**: typecheck
**Gate**: Type

**Verify**:

```bash
cd web
npm run typecheck
```

Expected: TypeScript termina com exit code `0`.

**Commit**: `feat(monthly-projection): define analysis contracts`

---

### T2: Extrair utilitarios deterministas de mes e data

**What**: Centralizar chaves locais de data, comparacao de meses, rollover mensal, ultimo dia do mes e data esperada limitada ao calendario.
**Where**: `web/src/lib/monthKeys.ts`, `web/src/lib/monthKeys.test.ts`, `web/src/lib/transactions.ts`
**Depends on**: T1
**Reuses**: `getCurrentMonthKey()`, `addMonthsToMonthKey()` e `monthParts()` atuais
**Requirements**: MPROJ-01, MPROJ-07, MPROJ-08, MPROJ-09, MPROJ-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `monthKeys.ts` exporta chaves locais sem usar `toISOString()`
- [x] Rollover entre dezembro/janeiro e deltas negativos funcionam
- [x] Dia 29, 30 ou 31 e limitado ao ultimo dia valido do mes alvo
- [x] Dias e semanas restantes usam contagem inclusiva
- [x] `transactions.ts` reutiliza os helpers sem alterar APIs publicas
- [x] Sao adicionados pelo menos 6 testes unitarios
- [x] Suite total tem pelo menos 16 testes, sem remover os 10 existentes
- [x] `npm run test && npm run typecheck` passa

**Tests**: unit
**Gate**: Unit

**Verify**:

```bash
cd web
npm run test
npm run typecheck
```

Expected: pelo menos `4` arquivos e `16` testes passam; typecheck termina com exit code `0`.

**Commit**: `refactor(monthly-projection): extract month date helpers`

---

### T3: Implementar engine combinado de projecao

**What**: Criar o engine puro que deriva overview da dashboard e insight detalhado do mes selecionado em uma unica analise.
**Where**: `web/src/lib/financialAnalysis.ts`, `web/src/lib/financialAnalysis.test.ts`, `web/src/lib/transactions.ts`, `web/src/lib/transactions.test.ts`
**Depends on**: T2
**Reuses**: heuristica atual de `buildRecurringCandidates()`, `hasPersistedRecurringMatch()` e `buildFinancialOverview()`
**Requirements**: MPROJ-01, MPROJ-02, MPROJ-03, MPROJ-04, MPROJ-05, MPROJ-06, MPROJ-08, MPROJ-09, MPROJ-10, MPROJ-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] `buildFinancialAnalysis()` retorna `overview` e `monthlyProjectionInsight`
- [x] `buildFinancialOverview()` continua disponivel e preserva os totais atuais
- [x] Receitas e despesas registradas/provaveis ficam separadas
- [x] Mes atual usa `date <= today` como realizado e `date > today` como restante registrado
- [x] Provavel com `expectedDate >= today` entra no restante quando nao houver match persistido
- [x] Transferencias nao alteram saldo nem listas de projecao
- [x] Mes futuro distante recebe insight sem ampliar os tres meses da dashboard
- [x] Saldo projetado, deficit e sugestao semanal seguem as formulas aprovadas
- [x] Itens, grupos e categorias sao ordenados conforme o design
- [x] Sao adicionados pelo menos 18 testes do engine
- [x] Suite total tem pelo menos 34 testes, sem remover cobertura existente
- [x] `npm run test && npm run typecheck` passa

**Tests**: unit
**Gate**: Unit

**Verify**:

```bash
cd web
npm run test
npm run typecheck
```

Expected: pelo menos `5` arquivos e `34` testes passam; typecheck termina com exit code `0`.

**Commit**: `feat(monthly-projection): build detailed financial analysis`

---

### T4: Expor insight mensal pelo estado derivado

**What**: Fazer `useDashboardState()` consumir o engine combinado e retornar `monthlyProjectionInsight` sem duplicar o processamento.
**Where**: `web/src/hooks/useDashboardState.ts`, `web/src/hooks/useDashboardState.test.ts`
**Depends on**: T3
**Reuses**: retorno atual de `useDashboardState()` e `activeMonth`
**Requirements**: MPROJ-01, MPROJ-07, MPROJ-08

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] O hook chama `buildFinancialAnalysis()` uma unica vez por execucao
- [x] `financialOverview` continua com o contrato atual
- [x] `monthlyProjectionInsight` e retornado para o mes ativo
- [x] Mes passado retorna insight `null`
- [x] Sao adicionados pelo menos 3 testes do estado derivado
- [x] Suite unitaria tem pelo menos 37 testes
- [x] `npm run test && npm run typecheck` passa

**Tests**: unit regression
**Gate**: Unit

**Verify**:

```bash
cd web
npm run test
npm run typecheck
```

Expected: pelo menos `6` arquivos e `37` testes passam; typecheck termina com exit code `0`.

**Commit**: `feat(monthly-projection): expose monthly insight state`

---

### T5: Criar resumo visual da projecao [P]

**What**: Criar o painel de metricas para mes atual, mes futuro, saldo positivo, saldo comprometido e deficit.
**Where**: `web/src/components/MonthlyProjectionSummary.tsx`, `web/src/components/MonthlyProjectionSummary.test.tsx`
**Depends on**: T3
**Reuses**: `panel`, `panel-header`, `eyebrow`, `positive`, `negative`, `toCurrency()`
**Requirements**: MPROJ-01, MPROJ-04, MPROJ-05, MPROJ-07, MPROJ-08, MPROJ-10, MPROJ-11

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Mes atual mostra saldo realizado, receitas restantes, despesas registradas, despesas provaveis, saldo projetado e sugestao semanal
- [x] Mes futuro mostra receitas/despesas separadas por origem e saldo projetado
- [x] Deficit usa texto explicito e sugestao semanal `R$ 0,00`
- [x] O componente usa `<section>`, heading e `<dl>` com nomes acessiveis
- [x] Status nao depende apenas de cor
- [x] Sao adicionados pelo menos 4 testes de componente
- [x] Suite isolada da branch tem pelo menos 38 testes
- [x] `npm run test && npm run typecheck` passa

**Tests**: component
**Gate**: Unit

**Verify**:

```bash
cd web
npm run test -- MonthlyProjectionSummary
npm run typecheck
```

Expected: pelo menos `4` testes do componente passam; typecheck termina com exit code `0`.

**Commit**: `feat(monthly-projection): add projection summary`

---

### T6: Criar breakdown por grupo e categoria [P]

**What**: Criar as tabelas agregadas de despesas por grupo e receitas/despesas por categoria, separando registrado, provavel e total.
**Where**: `web/src/components/MonthlyProjectionBreakdown.tsx`, `web/src/components/MonthlyProjectionBreakdown.test.tsx`
**Depends on**: T3
**Reuses**: semantica e estilos de `SummaryTable` e `CategorySection`
**Requirements**: MPROJ-01, MPROJ-05, MPROJ-06, MPROJ-07

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Resumo por grupo exibe `Registrado`, `Provavel` e `Total`
- [x] `Sem grupo` aparece por ultimo quando aplicavel
- [x] Resumo por categoria separa receitas e despesas
- [x] Cenario apenas com receitas nao renderiza tabela vazia de grupos
- [x] Tabelas possuem captions e headings hierarquicos
- [x] Sao adicionados pelo menos 4 testes de componente
- [x] Suite isolada da branch tem pelo menos 38 testes
- [x] `npm run test && npm run typecheck` passa

**Tests**: component
**Gate**: Unit

**Verify**:

```bash
cd web
npm run test -- MonthlyProjectionBreakdown
npm run typecheck
```

Expected: pelo menos `4` testes do componente passam; typecheck termina com exit code `0`.

**Commit**: `feat(monthly-projection): add projection breakdown`

---

### T7: Criar listas detalhadas de itens [P]

**What**: Criar as secoes de lancamentos registrados restantes e estimativas provaveis, incluindo base explicativa da estimativa.
**Where**: `web/src/components/MonthlyProjectionItems.tsx`, `web/src/components/MonthlyProjectionItems.test.tsx`
**Depends on**: T3
**Reuses**: `dateLabel()`, `toCurrency()`, tabelas responsivas e badges existentes
**Requirements**: MPROJ-02, MPROJ-03, MPROJ-05, MPROJ-06, MPROJ-07, MPROJ-09

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Registrados e provaveis aparecem em secoes textualmente distintas
- [x] Item registrado mostra data, tipo, categoria, grupo, valor e parcela quando existir
- [x] Item provavel mostra data estimada, valor medio e base da estimativa
- [x] Estados vazios parciais nao escondem a outra secao
- [x] Descricoes longas permanecem acessiveis
- [x] O componente nao oferece edicao de itens
- [x] Sao adicionados pelo menos 5 testes de componente
- [x] Suite isolada da branch tem pelo menos 39 testes
- [x] `npm run test && npm run typecheck` passa

**Tests**: component
**Gate**: Unit

**Verify**:

```bash
cd web
npm run test -- MonthlyProjectionItems
npm run typecheck
```

Expected: pelo menos `5` testes do componente passam; typecheck termina com exit code `0`.

**Commit**: `feat(monthly-projection): add projection item details`

---

### T8: Estilizar projecao mensal responsiva

**What**: Adicionar layout, estados, badges e responsividade para resumo, breakdown e listas, preservando tokens e acessibilidade visual.
**Where**: `web/src/App.css`, opcionalmente `web/src/styles/theme.css`
**Depends on**: T5, T6, T7
**Reuses**: tokens, paineis, grids, tabelas, breakpoints e `prefers-reduced-motion` atuais
**Requirements**: MPROJ-04, MPROJ-05, MPROJ-07

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [x] Mobile em 390px usa uma coluna e nao cria overflow da pagina
- [x] Laptop usa grid de duas ou tres colunas conforme espaco
- [x] Ultra-wide preserva largura de leitura
- [x] Valores monetarios usam numeros tabulares
- [x] Registrado/provavel possuem sinais redundantes alem de cor
- [x] Foco visivel e contraste aumentam em estados interativos
- [x] Nao existe `transition: all` nem animacao de propriedades de layout
- [x] `npm run lint && npm run typecheck && npm run build` passa

**Tests**: none (CSS; validacao funcional pertence aos componentes e ao E2E da pagina)
**Gate**: Build

**Verify**:

```bash
cd web
npm run lint
npm run typecheck
npm run build
```

Expected: todos os comandos terminam com exit code `0`.

**Commit**: `style(monthly-projection): add responsive projection layout`

---

### T9: Integrar projecao na pagina Mensal e validar fluxo completo

**What**: Conectar o insight ao `App`, compor os tres componentes na `MonthlyView`, atualizar a mensagem contextual e cobrir o fluxo com Playwright.
**Where**: `web/src/App.tsx`, `web/src/components/MonthlyView.tsx`, `web/e2e/monthly.spec.ts`, `web/e2e/dashboard.spec.ts`
**Depends on**: T4, T5, T6, T7, T8
**Reuses**: navegacao `?month=YYYY-MM`, toolbar mensal, loading, `DashboardContent`, helpers E2E existentes
**Requirements**: MPROJ-01 a MPROJ-11

**Tools**:

- MCP: Supabase local apenas para executar E2E
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Mes passado preserva a pagina atual sem bloco de projecao
- [ ] Mes atual mostra resumo, breakdown e listas antes do conteudo mensal existente
- [ ] Mes futuro mostra projecao completa sem sugestao semanal
- [ ] Item registrado restante aparece na projecao e continua na tabela mensal editavel
- [ ] Item provavel aparece somente na projecao
- [ ] Estado vazio nao oculta `DashboardContent`
- [ ] Texto de meses futuros menciona registrados e estimativas recorrentes
- [ ] URL direta e navegacao dashboard -> mensal continuam funcionando
- [ ] `monthly.spec.ts` cobre mes atual, futuro, vazio, duplicacao intencional e URL
- [ ] `dashboard.spec.ts` confirma horizonte e totais atuais sem regressao
- [ ] Suite unitaria final tem pelo menos 50 testes, sem remover os 10 existentes
- [ ] Gate completo passa

**Tests**: E2E
**Gate**: Full

**Verify**:

```bash
cd web
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Expected:

- pelo menos `9` arquivos e `50` testes unitarios passam
- lint, typecheck e build terminam com exit code `0`
- todos os testes Playwright passam

**Commit**: `feat(monthly-projection): integrate detailed monthly analysis`

---

## Parallel Execution Map

```text
Phase 1:
  T1 -> T2 -> T3 -> T4

Phase 2, after T3:
  ├── T5 [P]
  ├── T6 [P]
  └── T7 [P]

Phase 3, after T5 + T6 + T7:
  T8

Phase 4, after T4 + T8:
  T9
```

Parallel constraints:

- T5, T6 e T7 alteram componentes e testes distintos.
- Cada tarefa usa apenas testes unitarios/componentes, marcados como parallel-safe em `TESTING.md`.
- T9 nao e paralela porque Playwright usa estado compartilhado da stack local.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | um contrato de tipos | Pass - granular |
| T2 | um modulo coeso de datas + adaptacao de imports | Pass - granular |
| T3 | um engine financeiro + testes do proprio engine | Pass - granular |
| T4 | um hook de estado derivado | Pass - granular |
| T5 | um componente de resumo | Pass - granular |
| T6 | um componente de breakdown | Pass - granular |
| T7 | um componente de listas | Pass - granular |
| T8 | uma camada de estilos da feature | Pass - granular |
| T9 | uma integracao vertical de pagina + E2E co-localizado | Pass - coeso |

---

## Diagram-Definition Cross-Check

| Task | Depends On In Task | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | raiz | Match |
| T2 | T1 | T1 -> T2 | Match |
| T3 | T2 | T2 -> T3 | Match |
| T4 | T3 | T3 -> T4 | Match |
| T5 | T3 | T3 -> T5 | Match |
| T6 | T3 | T3 -> T6 | Match |
| T7 | T3 | T3 -> T7 | Match |
| T8 | T5, T6, T7 | T5 + T6 + T7 -> T8 | Match |
| T9 | T4, T5, T6, T7, T8 | T4 + T5 + T6 + T7 + T8 -> T9 | Match |

All dependencies and arrows match. Parallel tasks do not depend on each other.

---

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | type-only contract | Typecheck | typecheck | OK |
| T2 | pure date helpers | Unit | unit | OK |
| T3 | pure financial engine | Unit | unit | OK |
| T4 | hook/state derivation | Unit/regression | unit regression | OK |
| T5 | React presentation component | Component | component | OK |
| T6 | React presentation component | Component | component | OK |
| T7 | React presentation component | Component | component | OK |
| T8 | CSS-only | None + owning gate | none + build | OK |
| T9 | page composition/routing | E2E | E2E | OK |

No test is deferred to a later task. T9 owns the E2E because it is the first task where the complete page composition is runnable.

---

## Requirement Coverage

| Requirement | Tasks |
| --- | --- |
| MPROJ-01 | T1, T3, T5, T6, T9 |
| MPROJ-02 | T1, T3, T7, T9 |
| MPROJ-03 | T1, T3, T7, T9 |
| MPROJ-04 | T3, T5, T8, T9 |
| MPROJ-05 | T1, T3, T5, T6, T7, T8, T9 |
| MPROJ-06 | T1, T3, T6, T7, T9 |
| MPROJ-07 | T2, T4, T5, T6, T7, T8, T9 |
| MPROJ-08 | T1, T2, T3, T4, T5, T9 |
| MPROJ-09 | T2, T3, T7, T9 |
| MPROJ-10 | T1, T3, T5, T9 |
| MPROJ-11 | T1, T2, T3, T5, T9 |

**Coverage**: 11 requisitos, 11 mapeados, 0 sem tarefa.

---

## Tool Selection Before Execute

Ferramentas recomendadas:

- T1-T8: filesystem/shell local e skill `tlc-spec-driven`
- T9: filesystem/shell local, Supabase local e skill `tlc-spec-driven`
- Context7 e web search nao sao necessarios; a implementacao usa apenas APIs e padroes ja presentes no repositorio
- Subagentes podem executar T5, T6 e T7 em paralelo durante a fase Execute

Antes de executar, confirmar se essas ferramentas recomendadas devem ser usadas ou se ha preferencia por MCPs/skills adicionais.
