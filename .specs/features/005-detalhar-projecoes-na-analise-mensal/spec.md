# Detalhar Projecoes Na Analise Mensal Specification

## Problem Statement

Hoje a pagina `Mensal` permite abrir o mes atual e meses futuros, mas nao mostra com clareza como as projecoes sao compostas. A dashboard ja resume receitas, compromissos previstos e compromissos provaveis por mes, porem o usuario precisa sair do fluxo de analise mensal para entender o total projetado e ainda assim nao consegue inspecionar os itens que formam essa projecao.

## Goals

- [ ] Expor na pagina `Mensal` um detalhamento das projecoes para o mes atual e meses futuros.
- [ ] Permitir ao usuario distinguir o que ja esta persistido na base do que e apenas estimativa recorrente.
- [ ] Preservar o fluxo atual de navegacao Dashboard -> Mensal sem obrigar o usuario a voltar para a dashboard para entender uma projecao.
- [ ] Mostrar no mes atual quanto saldo ainda resta considerando o que falta acontecer e sugerir quanto ainda pode ser gasto por semana.
- [ ] Manter a experiencia acessivel, responsiva e coerente com os guardrails definidos em `AGENTS.md`.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| --- | --- |
| Alterar a regra de negocio que calcula recorrencias provaveis | Esta feature melhora visibilidade e detalhamento, nao redefine a heuristica de projecao. |
| Criar novos indicadores na dashboard | O pedido e aprofundar a leitura dentro da pagina `Mensal`. |
| Introduzir edicao em lote de transacoes projetadas | A feature e de analise e entendimento, nao um novo fluxo de mutacao. |
| Redesenhar meses passados sem projecao | O foco e mes atual e meses futuros. |

---

## User Stories

### P1: Ver a composicao da projecao no mes analisado ⭐ MVP

**User Story**: Como usuario que revisa o mes atual ou um mes futuro, eu quero ver a composicao detalhada da projecao dentro da pagina `Mensal` para entender de onde vem o saldo projetado sem depender da dashboard.

**Why P1**: Esse e o problema central relatado pelo usuario e fecha a lacuna entre resumo e analise detalhada.

**Acceptance Criteria**:

1. WHEN o usuario abrir a pagina `Mensal` em um mes atual ou futuro THEN o sistema SHALL exibir um bloco de projecao com os totais relevantes daquele mes, incluindo receitas, despesas previstas, despesas provaveis e saldo projetado.
2. WHEN a projecao do mes tiver itens persistidos na base THEN o sistema SHALL mostrar quais lancamentos registrados compoem o total previsto do mes.
3. WHEN a projecao do mes tiver itens recorrentes inferidos THEN o sistema SHALL mostrar quais lancamentos provaveis compoem o total estimado do mes.
4. WHEN o mes analisado nao tiver nenhuma projecao THEN o sistema SHALL exibir estado vazio contextual sem ocultar o restante da pagina.

**Independent Test**: Abrir `Mensal` no mes atual e em um mes futuro com dados previstos e recorrentes, e confirmar que o usuario consegue identificar os totais e os itens que compoem cada parte da projecao.

---

### P1: Distinguir claramente registrado vs estimado ⭐ MVP

**User Story**: Como usuario que toma decisoes financeiras com base nas projecoes, eu quero diferenciar claramente o que esta registrado na base do que e apenas estimativa para avaliar risco com mais confianca.

**Why P1**: Sem essa separacao, o detalhamento perde valor operacional e pode induzir leitura incorreta do mes.

**Acceptance Criteria**:

1. WHEN a pagina mostrar dados de projecao THEN o sistema SHALL separar visualmente e textualmente os itens registrados dos itens provaveis, sem depender apenas de cor.
2. WHEN um item de projecao estiver associado a grupo de orcamento THEN o sistema SHALL preservar essa associacao no detalhamento.
3. WHEN o usuario navegar entre meses com e sem projecao THEN o sistema SHALL manter rotulos, estados e hierarquia visual consistentes.

**Independent Test**: Navegar entre dois meses com combinacoes diferentes de itens registrados e provaveis, confirmando que a diferenca entre registrado e estimado permanece obvia em todos os casos.

---

### P2: Usar o detalhamento como apoio a revisao do mes atual

**User Story**: Como usuario que acompanha o mes em andamento, eu quero ver as projecoes junto da visao mensal para comparar rapidamente o que ja aconteceu com o que ainda pode acontecer.

**Why P2**: E um complemento valioso para o mes atual, mas depende do detalhamento base estar resolvido primeiro.

**Acceptance Criteria**:

1. WHEN o usuario abrir o mes atual THEN o sistema SHALL combinar a leitura do realizado no mes com a projecao remanescente sem apagar o contexto dos lancamentos ja registrados.
2. WHEN o mes atual contiver transacoes registradas e itens provaveis THEN o sistema SHALL apresentar ambos de forma complementar, evitando ambiguidade sobre o que ja entrou no total do mes.
3. WHEN o usuario abrir o mes atual THEN o sistema SHALL calcular o saldo ainda disponivel como `saldo do mes ate agora + receitas restantes - despesas restantes previstas/provaveis`.
4. WHEN houver saldo restante e semanas restantes no mes THEN o sistema SHALL sugerir quanto ainda pode ser gasto por semana usando `saldo disponivel / semanas restantes no mes`.

**Independent Test**: Abrir o mes atual com transacoes registradas e recorrencias projetadas e verificar que a pagina continua servindo tanto para revisao quanto para previsao.

---

## Edge Cases

- WHEN um mes futuro tiver apenas itens provaveis e nenhum item persistido THEN o sistema SHALL deixar claro que o total e totalmente estimado.
- WHEN um mes atual ou futuro tiver apenas receitas previstas THEN o sistema SHALL manter o bloco de projecao legivel e sem secoes vazias confusas.
- WHEN um item projetado nao tiver `budget_group` THEN o sistema SHALL exibir essa ausencia de forma compreensivel e consistente com a UI atual.
- WHEN descricoes de transacoes recorrentes forem longas THEN o sistema SHALL preservar legibilidade sem quebrar layout nem acessibilidade.
- WHEN o usuario navegar pelo detalhamento com teclado THEN o sistema SHALL manter foco visivel, ordem logica e sem dead ends.
- WHEN nao houver semanas restantes no mes atual THEN o sistema SHALL evitar divisao por zero e comunicar o saldo restante sem sugestao semanal enganosa.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| MPROJ-01 | P1: Ver a composicao da projecao no mes analisado | Tasks | In Tasks |
| MPROJ-02 | P1: Ver a composicao da projecao no mes analisado | Tasks | In Tasks |
| MPROJ-03 | P1: Ver a composicao da projecao no mes analisado | Tasks | In Tasks |
| MPROJ-04 | P1: Ver a composicao da projecao no mes analisado | Tasks | In Tasks |
| MPROJ-05 | P1: Distinguir claramente registrado vs estimado | Tasks | In Tasks |
| MPROJ-06 | P1: Distinguir claramente registrado vs estimado | Tasks | In Tasks |
| MPROJ-07 | P1: Distinguir claramente registrado vs estimado | Tasks | In Tasks |
| MPROJ-08 | P2: Usar o detalhamento como apoio a revisao do mes atual | Tasks | In Tasks |
| MPROJ-09 | P2: Usar o detalhamento como apoio a revisao do mes atual | Tasks | In Tasks |
| MPROJ-10 | P2: Usar o detalhamento como apoio a revisao do mes atual | Tasks | In Tasks |
| MPROJ-11 | P2: Usar o detalhamento como apoio a revisao do mes atual | Tasks | In Tasks |

**Coverage:** 11 total, 11 mapped to tasks, 0 unmapped

---

## Success Criteria

How we know the feature is successful:

- [ ] O usuario consegue abrir `Mensal` no mes atual ou futuro e entender a projecao sem voltar para a dashboard.
- [ ] A pagina deixa claro quais valores estao registrados e quais sao apenas provaveis.
- [ ] O detalhamento funciona para cenarios com itens persistidos, itens recorrentes e ausencia de projecao.
- [ ] A feature preserva acessibilidade por teclado, feedback de estado e responsividade.
