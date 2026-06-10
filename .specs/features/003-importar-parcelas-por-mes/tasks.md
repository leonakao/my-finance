# Importar Parcelas Por Mes Tasks

**Design**: `.specs/features/003-importar-parcelas-por-mes/design.md`
**Status**: Draft

---

## Execution Plan

### Phase 1: Shared Expansion Logic (Sequential)

```text
T1 -> T2
```

### Phase 2: Santander Integration (Sequential)

```text
T2 -> T3
```

### Phase 3: Validation (Sequential)

```text
T3 -> T4
```

---

## Task Breakdown

### T1: Criar helper compartilhado de parcelamento mensal

**What**: Adicionar um modulo puro para interpretar `NN/NN`, usar a data original da compra como inicio do cronograma, gerar datas mensais e compor `external_id` determinista por parcela.
**Where**: `supabase/functions/_shared/installments.ts`
**Depends on**: None
**Reuses**: `daysInMonth()` ou utilitario equivalente hoje usado em `santander.ts`
**Requirement**: IPL-01, IPL-02, IPL-03, IPL-06, IPL-07

**Done when**:

- [ ] Existe parser de `installment` com validacao de formato
- [ ] Existe funcao que expande uma compra parcelada em `1..total` parcelas
- [ ] Existe funcao de rollover de mes/ano reutilizavel
- [ ] Cada parcela recebe `external_id` determinista e estavel

**Tests**:

- validacao manual do helper com casos `01/01`, compra de outubro em `12x` observada em maio, e `12/12`

**Gate**: functions review

---

### T2: Integrar a expansao mensal ao parser Santander de cartao

**What**: Substituir a criacao de uma unica transacao parcelada pela expansao do cronograma completo, preservando o comportamento atual para compras simples.
**Where**: `supabase/functions/_shared/santander.ts`
**Depends on**: T1
**Reuses**: heuristicas atuais de categoria, conta, status, origem e `notes`
**Requirement**: IPL-01, IPL-03, IPL-04, IPL-05, IPL-10, IPL-11, IPL-12

**Done when**:

- [ ] Compras com `installment` valido retornam varias transacoes
- [ ] Compras sem `installment` continuam retornando uma unica transacao
- [ ] `notes` trazem data original e parcela sintetizada
- [ ] O parser continua produzindo payload compativel com `resolveImportedTransactionBudgetGroups()`

**Tests**: none
**Gate**: `sh tools/check_supabase_functions.sh`

---

### T3: Confirmar idempotencia no handler de importacao Santander

**What**: Validar que o handler atual absorve o cronograma expandido sem alterar contrato HTTP e sem gerar duplicacoes em reimportacoes sucessivas.
**Where**: `supabase/functions/import-santander-pdf/index.ts`, possivelmente comentarios curtos em `_shared/santander.ts`
**Depends on**: T2
**Reuses**: `upsert` atual em `transactions`
**Requirement**: IPL-06, IPL-07, IPL-08, IPL-09

**Done when**:

- [ ] O handler nao exige campos novos no request
- [ ] O `upsert` continua baseado em `(user_id, external_id)`
- [ ] Reimportar a compra em parcela futura converge para o mesmo conjunto final de registros
- [ ] Nao ha regressao aparente na resposta resumida do import

**Tests**:

- teste manual de dupla importacao com parcelas consecutivas da mesma compra

**Gate**: `sh tools/check_supabase_functions.sh`

---

### T4: Validar amostras reais e documentar o comportamento esperado

**What**: Executar a verificacao operacional minima e ajustar a documentacao para refletir que compras parceladas passam a gerar serie mensal completa.
**Where**: `README.md`, `supabase/functions/`, possivelmente fixture/amostra local se necessario
**Depends on**: T3
**Reuses**: checklist de validacao do projeto
**Requirement**: IPL-01 a IPL-12

**Done when**:

- [ ] O README descreve o comportamento novo de parcelamento no fluxo Santander
- [ ] Existe evidencia manual de que uma compra de outubro em `12x` observada na fatura de maio gera parcelas de outubro a setembro
- [ ] Existe evidencia manual de que `04/12` nao duplica o cronograma
- [ ] Existe evidencia manual de que compra simples continua com uma transacao

**Tests**:

- `sh tools/check_supabase_functions.sh`

**Gate**: integrated
