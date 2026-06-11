# Detalhar Projecoes Na Analise Mensal Context

**Gathered:** 2026-06-11
**Spec:** `.specs/features/005-detalhar-projecoes-na-analise-mensal/spec.md`
**Status:** Approved for tasks

---

## Feature Boundary

Esta feature adiciona na tela `Mensal` um detalhamento das projecoes do mes atual e dos meses futuros, separando itens registrados e provaveis, sem alterar a heuristica atual de projecao. No mes atual, tambem adiciona indicadores de saldo restante e sugestao de gasto semanal com base apenas no que ainda falta acontecer.

---

## Implementation Decisions

### Escopo temporal da projecao no mes atual

- No mes atual, a projecao deve considerar apenas o que ainda falta acontecer.
- Meses futuros continuam mostrando a projecao completa daquele mes.

### Forma do detalhamento

- Itens provaveis devem aparecer de duas formas:
- Lista detalhada item a item.
- Agrupamentos resumidos por categoria e/ou grupo para leitura rapida.
- Itens registrados na base devem permanecer distinguiveis dos itens estimados.

### Indicadores adicionais no mes atual

- O saldo disponivel do mes atual deve ser calculado como `saldo do mes ate agora + receitas restantes - despesas restantes previstas/provaveis`.
- A sugestao de quanto ainda pode gastar por semana deve ser calculada como `saldo disponivel / semanas restantes no mes`.

### Layout e posicionamento

- A tela `Mensal` deve seguir a Proposta A.
- Logo abaixo do seletor de mes entra um bloco-resumo de projecao para o mes atual e meses futuros.
- Abaixo do bloco-resumo entram as secoes de detalhe, separando lancamentos registrados e estimativas provaveis.
- O bloco superior deve concentrar os indicadores mais rapidos de leitura, incluindo saldo restante e sugestao semanal no mes atual.

### Decisoes tecnicas aprovadas

- Transacoes registradas com data igual ao dia atual sao consideradas realizadas.
- Quando houver deficit projetado, a sugestao semanal exibida sera `R$ 0,00`.
- A analise detalhada funciona para meses futuros alem dos tres meses resumidos na dashboard.
- Um item registrado restante aparece no bloco de projecao e tambem na tabela mensal existente.
- A duplicacao e intencional: a projecao explica a composicao futura; a tabela mensal preserva revisao e edicao.

### Agent's Discretion

- Definir os rotulos exatos dos indicadores financeiros, desde que deixem claro registrado vs provavel e respeitem a linguagem atual do app.
- Definir o tratamento visual quando o saldo restante for zero ou negativo, sem depender apenas de cor.

---

## Specific References

- O usuario quer que a dashboard deixe de ser o unico lugar com visao resumida de projecoes.
- O detalhamento na `Mensal` deve servir para inspecionar melhor o mes atual e os meses futuros.

---

## Deferred Ideas

- Nenhuma — discussao encerrada dentro do escopo da feature.
