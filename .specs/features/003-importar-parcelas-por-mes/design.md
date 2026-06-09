# Importar Parcelas Por Mes Design

## Scope Decision

Esta feature sera implementada no fluxo ativo de importacao via Supabase Edge Functions. No estado atual do codebase, apenas `supabase/functions/_shared/santander.ts` identifica `installment` no formato `NN/NN`, entao o MVP cobre o import de cartao Santander. O desenho, porem, deve deixar a expansao mensal reaproveitavel para outras fontes que venham a expor `installment` depois.

## Current Behavior

- `parseSantanderPdf()` detecta `installment` na linha da fatura.
- A compra parcelada recebe `effectiveDate` no mes de fechamento da fatura atual.
- Apenas a parcela presente na fatura e persistida.
- O `external_id` atual usa `originalDate`, `index`, `card`, `description` e `amount`, o que evita colisoes entre compras distintas, mas ainda representa uma unica linha.

## Proposed Architecture

### 1. Expandir parcelamento em helper compartilhado

Criar um helper puro em `supabase/functions/_shared/` responsavel por:

- validar o formato `NN/NN`
- derivar o numero atual e o total de parcelas
- reconstruir a data de inicio do plano a partir da data original da compra, usando a parcela observada apenas para validacao e idempotencia
- gerar a serie completa de parcelas `01/NN` ate `NN/NN`
- clonar o payload-base alterando apenas `date`, `installment`, `notes` e `external_id`

Esse helper deve operar sobre um contrato simples:

- entrada: transacao base + data original da compra + metadata estavel para idempotencia
- saida: lista de transacoes prontas para `resolveImportedTransactionBudgetGroups()`

### 2. Preservar chave-base e derivar `external_id` por parcela

O parser precisa separar dois conceitos:

- `purchaseKey`: identidade estavel da compra parcelada, antes de apontar para uma parcela especifica
- `installmentExternalId`: identidade final da parcela sintetizada

Proposta:

```text
purchaseKey = santander-card:{originalDate}:{rowIndex}:{card}:{description}:{amount}
installmentExternalId = {purchaseKey}:installment:{NN}-{TT}
```

Com isso:

- importar `03/12` ou `04/12` reconstrui o mesmo `purchaseKey`
- cada parcela sintetizada recebe chave propria, mas deterministica
- o `upsert` continua sendo a barreira de idempotencia sem exigir schema novo

### 3. Reconstruir o cronograma a partir da parcela observada

Ao observar uma parcela `CC/TT` em uma fatura, o helper deve tratar a data original da compra como inicio canonico do plano. O numero da parcela observada serve para confirmar a posicao atual dentro do cronograma e para manter estabilidade entre importacoes sucessivas.

Para uma compra feita em outubro em `12x` que apareca na fatura de maio como parcela intermediaria, o helper calcula:

- `startDate = originalDate`
- para cada parcela `NN` de `1..TT`, soma `NN - 1` meses ao inicio
- preserva o dia original da compra, limitado por `daysInMonth()`

Esse desenho resolve dois cenarios:

- se a primeira fatura importada ja vier em maio mostrando uma compra de outubro como `08/12`, o sistema ainda reconstrói o cronograma completo de outubro a setembro
- se a compra reaparecer em fatura posterior, os mesmos meses e ids sao recalculados

### 4. Manter classificacao e budget groups no mesmo ponto do pipeline

O parser continua produzindo o payload base com:

- `type`
- `category`
- `budget_group_name`
- `status`
- `account`
- `institution`
- `source`

A expansao em parcelas ocorre antes de `resolveImportedTransactionBudgetGroups()`, para que cada parcela sintetizada siga o pipeline ja existente sem tratamento especial adicional.

## Data Flow

```text
linha da fatura Santander
  -> parseSantanderPdf()
  -> construir payload base da compra
  -> if installment valido:
       expandInstallmentSchedule(baseTransaction, purchaseMetadata)
     else:
       retornar compra simples
  -> resolveImportedTransactionBudgetGroups()
  -> upsert em transactions por (user_id, external_id)
```

## File-Level Changes

### `supabase/functions/_shared/installments.ts`

- novo helper puro para parse de `NN/NN`
- utilitario para somar meses em data ISO
- gerador de cronograma mensal completo
- gerador de `external_id` por parcela

### `supabase/functions/_shared/santander.ts`

- trocar a criacao direta de uma unica `ImportedTransaction` parcelada pela chamada ao helper
- preservar compras nao parceladas no caminho atual
- manter `notes` e `category` consistentes com o parser atual

### `supabase/functions/import-santander-pdf/index.ts`

- sem mudanca de contrato HTTP esperada
- apenas absorve o maior numero de transacoes produzidas pelo parser

## Risks And Mitigations

### Risco: duplicar compras parceladas ao importar faturas futuras

**Mitigacao**: `external_id` determinista por parcela, derivado de `purchaseKey` estavel.

### Risco: deslocar meses incorretamente em virada de ano

**Mitigacao**: concentrar a aritmetica de meses em helper puro com casos explicitos de rollover.

### Risco: mudar acidentalmente o comportamento de compras nao parceladas

**Mitigacao**: manter caminho sem `installment` praticamente intacto e cobrir validacao manual comparando contagem antes e depois para amostra sem parcelamento.

### Risco: assumir que todas as fontes suportam parcelamento

**Mitigacao**: limitar o MVP ao parser Santander cartao e deixar a API do helper opt-in para futuras fontes.

## Verification Strategy

- `sh tools/check_supabase_functions.sh`
- amostra manual com compra parcelada intermediaria, como `03/12`
- amostra manual com compra de outubro em `12x` observada na fatura de maio
- reimportacao da mesma compra em parcela seguinte, como `04/12`
- amostra manual sem parcelamento para confirmar regressao zero no caminho simples
