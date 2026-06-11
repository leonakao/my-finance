# Remover Estimativas Provaveis Da Projecao Tasks

**Design**: `.specs/features/006-remover-estimativas-provaveis-da-projecao/design.md`
**Status**: Approved
**Baseline**: 9 arquivos e 53 testes Vitest; 6 arquivos e 22 testes Playwright

---

## Execution Plan

### Phase 1: Persistence And Contracts

T1 usa o banco local e permanece sequencial. Depois dele, T2 inicia os contratos do frontend.

```text
T1 -> T2 -> T3 -> T4
```

### Phase 2: Data, Mutations And Presentation

Depois dos helpers, carga, mutacoes e dialogo podem ser implementados em paralelo. O detalhe de itens depende do calculo final e precede a composicao da pagina para evitar conflito em `App.css`.

```text
T3 -> T5
T3 -> T6
T2 -> T7
T4 -> T8
```

### Phase 3: Page And Route Integration

```text
T4 + T5 + T6 + T7 + T8 -> T9 -> T10
```

### Phase 4: Validation And Closure

```text
T1 + T10 -> T11
```

### Full Execution Map

```text
T1 -> T2 -> T3 -> T4 ---------------------------┐
            |     |                             |
            |     ├-> T5 [P] -------------------|
            |     └-> T6 [P] -------------------|
            └--------> T7 [P] ------------------|
                  T4 -> T8 ----------------------+-> T9 -> T10
T1 ---------------------------------------------------------> T11
T10 --------------------------------------------------------> T11
```

---

## Task Breakdown

### T1: Criar contrato persistente de exclusoes

**What**: Criar a tabela `projection_exclusions`, constraints, indices, trigger, RLS e um cenario local que valide integridade e isolamento entre usuarios.
**Where**: `supabase/migrations/20260611120000_create_projection_exclusions.sql`, `tools/test_projection_exclusions.sh`
**Depends on**: None
**Reuses**: `public.set_updated_at()`, policies de `transaction_classification_rules`, scripts locais com curl/jq
**Requirements**: PEXC-07, PEXC-08, PEXC-10, PEXC-11, PEXC-17

**Tools**:

- MCP: Supabase apenas para inspecao remota, se necessario
- Skill: `tlc-spec-driven`
- Local: Supabase CLI, PostgREST, curl, jq

**Done when**:

- [x] A tabela aceita somente `Despesa` e `Receita`
- [x] `scope` aceita somente `month` e `from_month`
- [x] `month_start` exige o primeiro dia do mes
- [x] A chave unica impede exclusao equivalente duplicada
- [x] RLS permite CRUD proprio e bloqueia acesso entre dois usuarios
- [x] O teste local aplica a migration em banco limpo e valida constraints/RLS
- [x] O script termina com exit code `0`
- [x] A migration existente `20260611113000_add_pets_and_personal_care_categories.sql` e preservada

**Tests**: database integration
**Gate**: Database

**Verify**:

```bash
supabase db reset
sh tools/test_projection_exclusions.sh
```

Expected: migration aplicada; constraints e RLS validadas; script imprime `Teste OK.`.

**Commit**: `feat(projection-exclusions): add persistent exclusion policy`

---

### T2: Definir contratos TypeScript de exclusao

**What**: Adicionar os tipos de registro, dominio, payload, escopo e item removido, incluindo `removedProbableItems` no insight mensal.
**Where**: `web/src/types.ts`
**Depends on**: T1
**Reuses**: `TransactionType`, `ProjectionLineItem`, `MonthlyProjectionInsight`
**Requirements**: PEXC-03, PEXC-07, PEXC-10, PEXC-12, PEXC-13

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Os cinco contratos descritos no design sao exportados
- [ ] Transferencias sao excluidas do tipo de recorrencia
- [ ] O record preserva nomes snake_case da borda Supabase
- [ ] O dominio usa nomes camelCase
- [ ] `MonthlyProjectionInsight` inclui removidos sem alterar transacoes registradas
- [ ] `npm run typecheck` passa

**Tests**: typecheck
**Gate**: Type

**Verify**:

```bash
cd web
npm run typecheck
```

Expected: TypeScript termina com exit code `0`.

**Commit**: `feat(projection-exclusions): define exclusion contracts`

---

### T3: Implementar helpers puros de exclusao

**What**: Criar normalizacao, conversao de mes, matching temporal e matching de identidade para exclusoes.
**Where**: `web/src/lib/projectionExclusions.ts`, `web/src/lib/projectionExclusions.test.ts`, `web/src/lib/financialAnalysis.ts`
**Depends on**: T2
**Reuses**: normalizacao atual de descricao em `financialAnalysis.ts`, `compareMonthKeys()`
**Requirements**: PEXC-03, PEXC-07, PEXC-08, PEXC-09, PEXC-10

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Existe uma unica normalizacao canonica para identidade de recorrencia
- [ ] `YYYY-MM` converte para `YYYY-MM-01`
- [ ] Escopo mensal corresponde somente ao mes exato
- [ ] Escopo futuro corresponde ao mes inicial e posteriores
- [ ] Tipo e descricao normalizada participam do match
- [ ] Sao adicionados pelo menos 8 testes unitarios
- [ ] Suite total tem pelo menos 61 testes, sem remover os 53 existentes
- [ ] `npm run test && npm run typecheck` passa

**Tests**: unit
**Gate**: Quick unit

**Verify**:

```bash
cd web
npm run test -- projectionExclusions
npm run typecheck
```

Expected: pelo menos 8 testes do helper passam; typecheck termina com exit code `0`.

**Commit**: `feat(projection-exclusions): add exclusion matching helpers`

---

### T4: Aplicar exclusoes ao calculo financeiro

**What**: Fazer dashboard e insight mensal filtrarem provaveis antes das agregacoes e derivarem os itens removidos restauraveis.
**Where**: `web/src/lib/financialAnalysis.ts`, `web/src/lib/financialAnalysis.test.ts`
**Depends on**: T3
**Reuses**: `buildRecurringCandidates()`, `buildOverview()`, `buildProbableItems()`, totais e summaries atuais
**Requirements**: PEXC-03, PEXC-04, PEXC-05, PEXC-07, PEXC-08, PEXC-09, PEXC-10, PEXC-12, PEXC-16, PEXC-24

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] A heuristica detecta candidatos sem consultar exclusoes
- [ ] O filtro ocorre antes dos totais de dashboard e mensal
- [ ] Escopo mensal nao afeta o mes seguinte
- [ ] Escopo futuro nao afeta meses anteriores
- [ ] Receita e despesa removidas recalculam os sinais corretos
- [ ] Saldo disponivel e sugestao semanal sao recalculados
- [ ] Exclusoes sobrepostas ocultam a recorrencia uma unica vez
- [ ] Removidos com e sem candidato atual sao derivados
- [ ] Sao adicionados pelo menos 11 testes unitarios
- [ ] Suite total tem pelo menos 72 testes
- [ ] `npm run test && npm run typecheck` passa

**Tests**: unit
**Gate**: Quick unit

**Verify**:

```bash
cd web
npm run test -- financialAnalysis
npm run typecheck
```

Expected: testes novos de escopo, dashboard, saldo e removidos passam; suite total preserva toda cobertura existente.

**Commit**: `feat(projection-exclusions): filter probable projections`

---

### T5: Carregar exclusoes no estado autenticado [P]

**What**: Carregar e normalizar `projection_exclusions` junto dos dados autenticados, expondo estado e setter.
**Where**: `web/src/hooks/useTransactionsData.ts`, `web/src/hooks/useTransactionsData.test.tsx`
**Depends on**: T3
**Reuses**: sequencia de queries e normalizadores atuais de `useTransactionsData`
**Requirements**: PEXC-11, PEXC-23

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] O hook consulta todos os campos definidos no design
- [ ] Registros passam pelo normalizador canonico
- [ ] Estado e setter sao retornados
- [ ] Falha de carga interrompe o estado de loading e informa erro
- [ ] Deep link nao depende de navegacao previa para receber exclusoes
- [ ] Sao adicionados pelo menos 3 testes do hook
- [ ] Suite total tem pelo menos 64 testes na branch isolada
- [ ] `npm run test && npm run typecheck` passa

**Tests**: hook unit/component
**Gate**: Quick unit

**Verify**:

```bash
cd web
npm run test -- useTransactionsData
npm run typecheck
```

Expected: pelo menos 3 testes do hook passam; typecheck termina com exit code `0`.

**Commit**: `feat(projection-exclusions): load user exclusions`

---

### T6: Criar hook de mutacoes otimistas [P]

**What**: Implementar criacao, restauracao, desfazer, reconciliacao de conflito e rollback de exclusoes.
**Where**: `web/src/hooks/useProjectionExclusionManagement.ts`, `web/src/hooks/useProjectionExclusionManagement.test.tsx`
**Depends on**: T3
**Reuses**: padroes de Supabase, saving, erro e feedback dos hooks de regras e grupos
**Requirements**: PEXC-04, PEXC-05, PEXC-11, PEXC-14, PEXC-15, PEXC-16, PEXC-17, PEXC-18, PEXC-20

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Insert otimista usa ID temporario e reconcilia a resposta
- [ ] Falha de insert restaura estado anterior
- [ ] Conflito de unicidade nao duplica exclusoes
- [ ] Restore remove pelo ID original e faz rollback em falha
- [ ] Desfazer restaura exatamente a ultima exclusao criada
- [ ] Estado de saving impede envio duplicado
- [ ] Feedback de sucesso e erro e atualizado de modo previsivel
- [ ] Sao adicionados pelo menos 7 testes do hook
- [ ] Suite total tem pelo menos 68 testes na branch isolada
- [ ] `npm run test && npm run typecheck` passa

**Tests**: hook unit/component
**Gate**: Quick unit

**Verify**:

```bash
cd web
npm run test -- useProjectionExclusionManagement
npm run typecheck
```

Expected: pelo menos 7 testes passam, incluindo ambos os rollbacks e desfazer.

**Commit**: `feat(projection-exclusions): manage optimistic mutations`

---

### T7: Criar dialogo acessivel de escopo [P]

**What**: Criar o dialogo que confirma remocao mensal ou futura com opcao menos abrangente selecionada por padrao.
**Where**: `web/src/components/ProjectionExclusionDialog.tsx`, `web/src/components/ProjectionExclusionDialog.test.tsx`
**Depends on**: T2
**Reuses**: `AppDialog`, spinner, botoes e formatadores existentes
**Requirements**: PEXC-01, PEXC-02, PEXC-06, PEXC-19, PEXC-20, PEXC-21, PEXC-22

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Dialogo usa `fieldset`, `legend` e radios com labels clicaveis
- [ ] `Somente neste mes` inicia selecionado
- [ ] Cancelar nao dispara mutacao
- [ ] Confirmar envia o escopo selecionado
- [ ] Loading preserva o rotulo original e mostra spinner
- [ ] Foco inicial, trap, Escape e retorno ao acionador seguem `AppDialog`
- [ ] Sao adicionados pelo menos 5 testes de componente
- [ ] Suite total tem pelo menos 58 testes na branch isolada
- [ ] `npm run test && npm run lint && npm run typecheck` passa

**Tests**: component
**Gate**: Frontend build

**Verify**:

```bash
cd web
npm run test -- ProjectionExclusionDialog
npm run lint
npm run typecheck
```

Expected: pelo menos 5 testes passam; lint e typecheck terminam com exit code `0`.

**Commit**: `feat(projection-exclusions): add scope confirmation dialog`

---

### T8: Adicionar acoes e painel recolhido aos itens

**What**: Evoluir o detalhe de provaveis com acao de remocao e o controle expansivel `Ocultando X estimativa(s)` com restauracao.
**Where**: `web/src/components/MonthlyProjectionItems.tsx`, `web/src/components/MonthlyProjectionItems.test.tsx`, `web/src/App.css`
**Depends on**: T4
**Reuses**: tabelas atuais, badges, formatadores, estilos de foco e spinner
**Requirements**: PEXC-01, PEXC-12, PEXC-13, PEXC-14, PEXC-15, PEXC-20, PEXC-21, PEXC-22, PEXC-24

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Apenas linhas provaveis oferecem `Remover da projecao…`
- [ ] Nome acessivel da acao inclui a descricao
- [ ] Controle recolhido conta recorrencias distintas
- [ ] `aria-expanded` e `aria-controls` refletem o painel
- [ ] Painel mostra descricao, tipo, valor atual, escopo e mes inicial
- [ ] Item sem candidato atual permanece restauravel
- [ ] Restore envia o ID correto e mostra estado de saving
- [ ] Mobile possui alvos de 44px, sem overflow indesejado e com textos longos resilientes
- [ ] Alteracoes existentes do usuario em `App.css` e demais arquivos fora da feature sao preservadas
- [ ] Sao adicionados pelo menos 7 testes ao componente
- [ ] Suite total tem pelo menos 79 testes
- [ ] `npm run test && npm run lint && npm run typecheck && npm run build` passa

**Tests**: component
**Gate**: Frontend build

**Verify**:

```bash
cd web
npm run test -- MonthlyProjectionItems
npm run lint
npm run typecheck
npm run build
```

Expected: todos os testes do componente passam e o build termina com exit code `0`.

**Commit**: `feat(projection-exclusions): add removal disclosure controls`

---

### T9: Compor fluxo na pagina mensal

**What**: Coordenar item selecionado, dialogo, handlers, desfazer e painel expandido na `MonthlyView`.
**Where**: `web/src/components/MonthlyView.tsx`, `web/src/components/MonthlyView.test.tsx`
**Depends on**: T4, T5, T6, T7, T8
**Reuses**: feedback global, `ProjectionExclusionDialog`, `MonthlyProjectionItems`
**Requirements**: PEXC-02, PEXC-04, PEXC-05, PEXC-06, PEXC-14, PEXC-15, PEXC-16, PEXC-17, PEXC-18, PEXC-20

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] A linha provavel abre o dialogo com o item correto
- [ ] Confirmacao monta payload com mes, tipo e descricao normalizada
- [ ] Cancelamento preserva a projecao
- [ ] Remocao fecha o dialogo somente quando a mutacao inicia corretamente
- [ ] Feedback `Desfazer` chama a ultima exclusao criada
- [ ] Restauracao e saving sao propagados ao detalhe
- [ ] Estado aberto do painel e controlado por prop/callback para a camada de rota
- [ ] Sao adicionados pelo menos 5 testes de composicao
- [ ] Suite total tem pelo menos 84 testes
- [ ] `npm run test && npm run lint && npm run typecheck && npm run build` passa

**Tests**: component/page composition
**Gate**: Frontend build

**Verify**:

```bash
cd web
npm run test -- MonthlyView
npm run lint
npm run typecheck
npm run build
```

Expected: pelo menos 5 testes de composicao passam; build termina com exit code `0`.

**Commit**: `feat(projection-exclusions): compose monthly removal flow`

---

### T10: Integrar estado global, rota e E2E

**What**: Conectar carga, calculo, mutacoes, logout e `removed=expanded` no composition root, adicionando cobertura Playwright completa do fluxo persistente.
**Where**: `web/src/App.tsx`, `web/src/hooks/useDashboardState.ts`, `web/src/hooks/useDashboardState.test.ts`, `web/src/hooks/useAuthActions.ts`, `web/e2e/helpers/supabase.ts`, `web/e2e/monthly-projection-exclusions.spec.ts`
**Depends on**: T9
**Reuses**: `writePathWithSearch()`, `popstate`, `createUserSession()`, seeds de transacao
**Requirements**: PEXC-03, PEXC-04, PEXC-05, PEXC-07, PEXC-08, PEXC-09, PEXC-11, PEXC-16, PEXC-17, PEXC-19, PEXC-21, PEXC-22, PEXC-23, PEXC-25

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`
- Local: Supabase CLI, Playwright

**Done when**:

- [ ] `useDashboardState` recebe exclusoes e usa um unico `buildFinancialAnalysis`
- [ ] `App` compoe carga, mutation hook e pagina sem implementar matching
- [ ] Logout limpa exclusoes e estado de desfazer
- [ ] `removed=expanded` preserva `month` e responde a Voltar/Avancar
- [ ] Deep link carrega exclusoes sem navegacao anterior
- [ ] E2E cobre escopo mensal, escopo futuro, dashboard, persistencia e restauracao
- [ ] E2E cobre contador recolhido, URL, teclado, mobile e rollback de rede
- [ ] Sao adicionados pelo menos 2 testes unitarios de estado e 10 testes Playwright
- [ ] Suite Vitest tem pelo menos 86 testes
- [ ] Suite Playwright tem pelo menos 32 testes
- [ ] Alteracoes existentes do usuario em categorias, parsers, migration, `App.css` e `ImportPanel.tsx` sao preservadas
- [ ] Gate frontend completo passa

**Tests**: unit plus E2E
**Gate**: Frontend full

**Verify**:

```bash
supabase start
cd web
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Expected: pelo menos 86 testes Vitest e 32 testes Playwright passam; lint, typecheck e build terminam com exit code `0`.

**Commit**: `feat(projection-exclusions): integrate persistent monthly flow`

---

### T11: Validar requisitos e encerrar feature

**What**: Executar o gate final, auditar os 25 requisitos e atualizar especificacao, tasks, estado e handoff com resultados reais.
**Where**: `.specs/features/006-remover-estimativas-provaveis-da-projecao/spec.md`, `.specs/features/006-remover-estimativas-provaveis-da-projecao/tasks.md`, `.specs/project/STATE.md`, `.specs/HANDOFF.md`
**Depends on**: T1, T10
**Reuses**: gates e matriz de testes do mapeamento brownfield
**Requirements**: PEXC-01 a PEXC-25

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`
- Local: Supabase CLI, Playwright

**Done when**:

- [ ] Migration e RLS passam no cenario local
- [ ] Todos os gates frontend passam sem testes removidos ou desabilitados
- [ ] Cada requisito possui tarefa e evidencia de verificacao
- [ ] Spec registra `Verified` somente para requisitos comprovados
- [ ] Tasks registra resultados e commits reais
- [ ] `STATE.md` registra conclusao ou bloqueio objetivo
- [ ] Handoff deixa de apontar design como trabalho pausado

**Tests**: full regression and requirement audit
**Gate**: Database plus Frontend full

**Verify**:

```bash
supabase db reset
sh tools/test_projection_exclusions.sh
cd web
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Expected: banco, suite Vitest, suite Playwright, lint, typecheck e build passam; cobertura da spec fica 25/25.

**Commit**: `docs(projection-exclusions): verify feature delivery`

---

## Parallel Execution Map

```text
Phase 1:
  T1 -> T2 -> T3 -> T4

Phase 2:
  apos T3:
    +-- T5 [P]
    +-- T6 [P]
    +-- T7 [P]
  apos T4:
    +-- T8

Phase 3:
  T4, T5, T6, T7, T8 -> T9 -> T10

Phase 4:
  T1, T10 -> T11
```

T5, T6 e T7 podem executar em paralelo porque modificam arquivos distintos e usam apenas Vitest, marcado como paralelo-seguro. T8 permanece fora desse grupo porque altera `App.css`, ja modificado pelo usuario, e deve ser integrado cuidadosamente antes da composicao da pagina.

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | Um contrato persistente com seu teste de banco | OK |
| T2 | Um conjunto coeso de tipos em um arquivo | OK |
| T3 | Um modulo puro com testes | OK |
| T4 | Uma regra financeira canonica com testes | OK |
| T5 | Um hook de carga com testes | OK |
| T6 | Um hook de mutacao com testes | OK |
| T7 | Um dialogo com testes | OK |
| T8 | Um componente de detalhe com estilos e testes | OK |
| T9 | Uma composicao de pagina com testes | OK |
| T10 | Uma integracao de rota/persistencia com E2E co-localizado | OK |
| T11 | Um gate de verificacao e fechamento | OK |

---

## Diagram-Definition Cross-Check

| Task | Depends on | Diagram shows | Status |
| --- | --- | --- | --- |
| T1 | None | Inicio | Match |
| T2 | T1 | T1 -> T2 | Match |
| T3 | T2 | T2 -> T3 | Match |
| T4 | T3 | T3 -> T4 | Match |
| T5 | T3 | T3 -> T5 | Match |
| T6 | T3 | T3 -> T6 | Match |
| T7 | T2 | T2 -> T7 | Match |
| T8 | T4 | T4 -> T8 | Match |
| T9 | T4, T5, T6, T7, T8 | cinco entradas -> T9 | Match |
| T10 | T9 | T9 -> T10 | Match |
| T11 | T1, T10 | T1 + T10 -> T11 | Match |

---

## Test Co-location Validation

| Task | Layer | Matrix requires | Task says | Status |
| --- | --- | --- | --- | --- |
| T1 | Migration/RLS | local migration + authenticated scenario | database integration | OK |
| T2 | Type contract | typecheck | typecheck | OK |
| T3 | Pure helper | Vitest unit | unit | OK |
| T4 | Financial helper | Vitest unit | unit | OK |
| T5 | React hook | Vitest/Testing Library | hook unit/component | OK |
| T6 | Direct Supabase mutation hook | hook test + later E2E | hook unit/component; E2E in integration task | OK |
| T7 | React component | Testing Library | component | OK |
| T8 | React component + CSS | component plus build | component | OK |
| T9 | Page composition | component/E2E | component; route E2E becomes runnable in T10 | OK |
| T10 | Route + persistence | unit + Playwright | unit plus E2E | OK |
| T11 | Full system | database + full frontend | full regression | OK |

T6 nao adia sua verificacao: o hook possui testes completos com Supabase mockado. T10 adiciona o E2E exigido quando a integracao real de rota e banco passa a existir. T9 testa a composicao isolada; T10 e a primeira tarefa em que URL, `App` e Supabase estao conectados e, portanto, inclui o Playwright no mesmo limite de implementacao.

---

## Requirement Traceability

| Requirement | Tasks |
| --- | --- |
| PEXC-01 | T7, T8, T11 |
| PEXC-02 | T7, T9, T11 |
| PEXC-03 | T2, T3, T4, T10, T11 |
| PEXC-04 | T4, T6, T9, T10, T11 |
| PEXC-05 | T4, T6, T9, T10, T11 |
| PEXC-06 | T7, T9, T11 |
| PEXC-07 | T1, T3, T4, T10, T11 |
| PEXC-08 | T1, T3, T4, T10, T11 |
| PEXC-09 | T3, T4, T10, T11 |
| PEXC-10 | T1, T2, T3, T4, T11 |
| PEXC-11 | T1, T5, T6, T10, T11 |
| PEXC-12 | T2, T4, T8, T11 |
| PEXC-13 | T2, T8, T11 |
| PEXC-14 | T6, T8, T9, T11 |
| PEXC-15 | T6, T8, T9, T11 |
| PEXC-16 | T4, T6, T9, T10, T11 |
| PEXC-17 | T1, T6, T9, T10, T11 |
| PEXC-18 | T6, T9, T11 |
| PEXC-19 | T7, T10, T11 |
| PEXC-20 | T6, T7, T8, T9, T11 |
| PEXC-21 | T7, T8, T10, T11 |
| PEXC-22 | T7, T8, T10, T11 |
| PEXC-23 | T5, T10, T11 |
| PEXC-24 | T4, T8, T11 |
| PEXC-25 | T10, T11 |

**Coverage:** 25 requisitos, 25 mapeados, 0 sem tarefa.
