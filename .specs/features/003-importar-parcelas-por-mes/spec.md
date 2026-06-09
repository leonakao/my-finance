# Importar Parcelas Por Mes Specification

## Problem Statement

Hoje, quando uma compra parcelada aparece na importacao ativa de cartao, o pipeline persiste apenas a parcela presente na fatura importada. Isso concentra toda a despesa no mes do fechamento atual e impede que o historico mensal reflita os meses futuros do parcelamento.

O objetivo desta feature e expandir compras parceladas em uma agenda mensal de transacoes, gerando uma linha para cada parcela do plano com base na data original da compra. A importacao precisa continuar idempotente: quando uma fatura posterior trouxer `04/12`, por exemplo, o sistema nao deve duplicar as parcelas que ja foram sintetizadas a partir de `03/12`.

## Goals

- [ ] Gerar uma transacao por mes para compras parceladas detectadas no fluxo de importacao ativo.
- [ ] Preservar o comportamento atual para compras nao parceladas.
- [ ] Garantir idempotencia entre importacoes sucessivas da mesma compra parcelada.
- [ ] Manter `type`, `category`, `status`, `budget_group` e demais classificacoes iguais em todas as parcelas geradas.
- [ ] Registrar datas e `installment` coerentes para cada mes sintetizado do parcelamento.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Alterar imports de conta corrente ou outras fontes sem indicador de parcela | O problema atual esta no fluxo que ja identifica `NN/NN` |
| Criar UX nova no frontend para editar planos de parcelamento | A demanda e de ingestao e persistencia |
| Recalcular automaticamente parcelas de dados historicos ja importados | O pedido cobre novas importacoes |
| Conciliar valores de IOF, juros rotativos ou parcelamento com encargos | O escopo assume parcelas fixas derivadas do valor importado |
| Atualizar scripts legados em `tools/*.py` nesta etapa | O fluxo ativo de importacao esta nas Edge Functions do Supabase |

---

## User Stories

### P1: Importacao sintetiza o cronograma completo da compra parcelada ⭐ MVP

**User Story**: Como usuario autenticado, quero que uma compra parcelada importada gere transacoes para todos os meses do parcelamento, para que meu historico mensal reflita o compromisso inteiro.

**Why P1**: Esse e o nucleo do problema. Sem expandir o cronograma, a visao mensal continua distorcida pelo mes da fatura importada.

**Acceptance Criteria**:

1. WHEN uma transacao importada trouxer `installment` no formato `NN/NN` THEN o sistema SHALL gerar uma transacao para cada numero de parcela de `01/NN` ate `NN/NN`.
2. WHEN o cronograma mensal for gerado THEN o sistema SHALL usar a data original da compra como inicio do plano, independentemente do mes da fatura importada.
3. WHEN o cronograma mensal for gerado THEN o sistema SHALL atribuir a cada parcela uma data correspondente ao mes correto do parcelamento, preservando o dia original quando possivel e ajustando para o ultimo dia valido do mes quando necessario.
4. WHEN o usuario importar uma fatura de maio que contenha uma compra feita em outubro em `12x` THEN o sistema SHALL gerar parcelas datadas de outubro ate setembro.
5. WHEN uma parcela sintetizada for persistida THEN o sistema SHALL preencher o campo `installment` com o numero daquela parcela no formato `NN/NN`.
6. WHEN uma compra nao tiver `installment` valido THEN o sistema SHALL manter o comportamento atual e persistir apenas uma transacao.
7. WHEN uma compra parcelada gerar multiplas transacoes THEN o sistema SHALL reutilizar o mesmo payload de classificacao em todas as parcelas, exceto pelos campos derivados de parcela e data.

**Independent Test**: Importar uma compra de outubro observada como `08/12` na fatura de maio e validar que existem 12 transacoes, com datas mensais de outubro a setembro e `installment` de `01/12` a `12/12`.

---

### P1: Importacao continua idempotente entre faturas sucessivas ⭐ MVP

**User Story**: Como usuario autenticado, quero que importar a parcela seguinte da mesma compra nao crie duplicatas, para que eu possa processar novas faturas com seguranca.

**Why P1**: Expandir o cronograma sem idempotencia tornaria o fluxo inutilizavel assim que a proxima fatura chegasse.

**Acceptance Criteria**:

1. WHEN a mesma compra parcelada reaparecer em uma fatura futura THEN o sistema SHALL gerar os mesmos `external_id`s deterministas para cada parcela sintetizada.
2. WHEN o `upsert` encontrar uma parcela ja existente da mesma compra THEN o sistema SHALL atualizar ou manter o registro existente, sem criar duplicata.
3. WHEN a compra reaparecer em outra parcela intermediaria, como `04/12` apos `03/12` THEN o sistema SHALL continuar resultando em exatamente `12` parcelas persistidas para aquela compra.
4. WHEN duas compras distintas tiverem mesma descricao e valor no mesmo cartao THEN o sistema SHALL continuar diferenciando-as a partir da chave-base ja usada pelo parser, incluindo a data original da compra.

**Independent Test**: Importar a mesma compra primeiro como `03/12` e depois como `04/12`, verificando que a contagem final permanece constante e sem duplicacoes.

---

### P2: Observabilidade basica do parcelamento sintetizado

**User Story**: Como usuario autenticado, quero entender de onde cada parcela sintetizada veio, para facilitar auditoria da importacao.

**Why P2**: Quando a importacao passa a criar linhas futuras, a rastreabilidade minima evita confusao durante a revisao manual.

**Acceptance Criteria**:

1. WHEN uma transacao parcelada for sintetizada THEN o sistema SHALL registrar em `notes` a data original da compra e a parcela correspondente.
2. WHEN o cronograma for gerado a partir de uma parcela intermediaria, como `03/12` THEN o sistema SHALL manter em `notes` que a origem foi uma importacao de fatura e nao uma compra avulsa manual.
3. WHEN uma transacao nao for parcelada THEN o sistema SHALL manter a mensagem atual de `notes`, sem enriquecimento desnecessario.

**Independent Test**: Revisar o campo `notes` de parcelas sintetizadas e de uma compra simples na mesma importacao.

## Edge Cases

- WHEN a compra original ocorrer em um dia que nao existe em algum mes futuro, como dia `31`, THEN o sistema SHALL ajustar a data daquela parcela para o ultimo dia valido do mes correspondente.
- WHEN a importacao detectar `01/01` THEN o sistema SHALL gerar apenas uma transacao e manter compatibilidade com o fluxo nao parcelado.
- WHEN o texto `installment` estiver ausente, vazio ou fora do formato `NN/NN` THEN o sistema SHALL ignorar a expansao mensal.
- WHEN a parcela detectada for intermediaria, como `08/12` na fatura de maio de uma compra iniciada em outubro, THEN o sistema SHALL reconstruir tambem as parcelas anteriores e posteriores para manter o cronograma completo.
- WHEN houver uma importacao repetida do mesmo arquivo THEN o sistema SHALL continuar convergindo para o mesmo conjunto final de transacoes devido ao `upsert` por `external_id`.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| IPL-01 | P1: Importacao sintetiza o cronograma completo da compra parcelada | Design | Pending |
| IPL-02 | P1: Importacao sintetiza o cronograma completo da compra parcelada | Design | Pending |
| IPL-03 | P1: Importacao sintetiza o cronograma completo da compra parcelada | Design | Pending |
| IPL-04 | P1: Importacao sintetiza o cronograma completo da compra parcelada | Design | Pending |
| IPL-05 | P1: Importacao sintetiza o cronograma completo da compra parcelada | Design | Pending |
| IPL-06 | P1: Importacao sintetiza o cronograma completo da compra parcelada | Design | Pending |
| IPL-07 | P1: Importacao continua idempotente entre faturas sucessivas | Design | Pending |
| IPL-08 | P1: Importacao continua idempotente entre faturas sucessivas | Design | Pending |
| IPL-09 | P1: Importacao continua idempotente entre faturas sucessivas | Design | Pending |
| IPL-10 | P1: Importacao continua idempotente entre faturas sucessivas | Design | Pending |
| IPL-11 | P2: Observabilidade basica do parcelamento sintetizado | Design | Pending |
| IPL-12 | P2: Observabilidade basica do parcelamento sintetizado | Design | Pending |
| IPL-13 | P2: Observabilidade basica do parcelamento sintetizado | Design | Pending |

**Coverage:** 13 total, 0 mapeados em tarefas, 13 pendentes

## Success Criteria

- [ ] O import de cartao Santander passa a expandir compras parceladas em uma serie mensal completa.
- [ ] Compras sem parcelamento continuam produzindo uma unica transacao.
- [ ] Importar parcelas sucessivas da mesma compra nao cria duplicatas.
- [ ] `notes` e `installment` passam a refletir a parcela sintetizada corretamente.
- [ ] A implementacao passa pelo gate minimo relevante: revisao manual do parser, `sh tools/check_supabase_functions.sh` e validacao operacional com amostra representativa.
