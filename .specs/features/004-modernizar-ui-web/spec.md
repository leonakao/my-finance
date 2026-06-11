# Modernizar UI Web Specification

## Problem Statement

O app web atual cumpre o fluxo funcional de autenticacao, importacao, revisao e classificacao, mas a experiencia visual ainda e utilitaria, densa e pouco guiada. Isso reduz clareza, torna a navegacao menos intuitiva e aumenta o atrito em tarefas recorrentes como revisar o mes, localizar lancamentos e importar novos arquivos.

## Goals

- [ ] Tornar a interface principal mais moderna, legivel e acolhedora sem degradar a densidade util do fluxo financeiro.
- [ ] Melhorar a hierarquia visual e a navegacao entre autenticacao, dashboard, importacao e regras de classificacao.
- [ ] Reduzir atrito nas tarefas principais em desktop e mobile: entrar, importar, filtrar, revisar e editar lancamentos.
- [ ] Aplicar guardrails de acessibilidade, responsividade e feedback coerente definidos em `AGENTS.md`.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
| --- | --- |
| Novas regras de negocio financeiras | O objetivo desta feature e UX/UI, nao alterar a logica de dominio. |
| Novas fontes de importacao ou novos formatos | Amplia o escopo funcional e deve virar feature separada. |
| Mudancas no schema do Supabase | O redesign nao exige alterar contrato persistente. |
| Analytics avancado, novos graficos ou metricas canonicas | Podem surgir depois do redesign, mas nao sao requisito inicial. |

---

## User Stories

### P1: Dashboard mais claro e orientado a revisao ⭐ MVP

**User Story**: Como usuario que revisa as financas do mes, eu quero um dashboard com hierarquia visual clara e navegacao simples para entender rapidamente o estado do periodo e agir sem me perder.

**Why P1**: O dashboard e a tela central do produto e concentra o maior volume de informacao e a maior parte das acoes.

**Acceptance Criteria**:

1. WHEN o usuario autenticado abrir o dashboard THEN o sistema SHALL destacar resumo do mes, importacao e revisao com hierarquia visual evidente.
2. WHEN o usuario alternar mes, abrir regras ou sair THEN o sistema SHALL manter controles de navegacao claros, acessiveis e consistentes.
3. WHEN houver estado vazio, carregando ou erro THEN o sistema SHALL exibir feedback contextual sem quebrar o layout principal.

**Independent Test**: Abrir a aplicacao autenticado e validar que o dashboard apresenta resumo, importacao e revisao em uma ordem visual clara, com estados de loading, erro e vazio coerentes.

---

### P1: Revisao de lancamentos mais pratica ⭐ MVP

**User Story**: Como usuario que corrige categorias e grupos, eu quero localizar e editar lancamentos com menos esforco visual para revisar o mes com mais rapidez.

**Why P1**: A revisao de transacoes e o fluxo operacional mais recorrente do app.

**Acceptance Criteria**:

1. WHEN o usuario visualizar a lista de lancamentos THEN o sistema SHALL melhorar escaneabilidade de colunas, filtros e acoes sem perder informacao importante.
2. WHEN o usuario aplicar filtros ou nao encontrar resultados THEN o sistema SHALL comunicar claramente o estado atual e o proximo passo possivel.
3. WHEN um lancamento exigir classificacao ou edicao THEN o sistema SHALL destacar esse status com sinais redundantes, nao apenas por cor.

**Independent Test**: Filtrar, localizar um lancamento, identificar status de classificacao e abrir a edicao com clareza visual superior ao fluxo atual.

---

### P1: Autenticacao e entrada mais acolhedoras ⭐ MVP

**User Story**: Como usuario que entra no app esporadicamente, eu quero uma tela de autenticacao mais clara e confiavel para acessar o dashboard sem friccao.

**Why P1**: A primeira impressao e o ponto de entrada do produto; hoje a experiencia e funcional, mas pouco guiada.

**Acceptance Criteria**:

1. WHEN o usuario abrir a tela de autenticacao THEN o sistema SHALL apresentar os modos de entrada, cadastro e recuperacao com hierarquia visual clara.
2. WHEN houver validacao local ou erro remoto THEN o sistema SHALL exibir mensagens inline, acessiveis e proximas do contexto do formulario.
3. WHEN o usuario usar a tela em mobile THEN o sistema SHALL preservar legibilidade, alvos de toque adequados e inputs sem zoom acidental.

**Independent Test**: Navegar pelos modos entrar, criar conta e recuperar senha em desktop e mobile, confirmando clareza, feedback e responsividade.

---

### P2: Fluxo de importacao mais guiado

**User Story**: Como usuario que importa arquivos bancarios, eu quero um fluxo de importacao mais explicito para entender rapidamente o que enviar e o que acontece depois.

**Why P2**: Importacao e importante, mas pode ser evoluida logo apos o dashboard central estar mais forte.

**Acceptance Criteria**:

1. WHEN o usuario abrir a area de importacao THEN o sistema SHALL explicar tipo de arquivo, campos relevantes e acao principal com mais clareza.
2. WHEN o formulario estiver incompleto ou enviando THEN o sistema SHALL manter o contexto do fluxo e indicar progresso sem ambiguidade.

**Independent Test**: Selecionar um tipo de importacao, preencher campos, anexar arquivo e iniciar o envio entendendo claramente o estado do formulario.

---

### P2: Regras de classificacao com melhor organizacao

**User Story**: Como usuario que mantem regras manuais, eu quero uma tela mais organizada para criar, editar e excluir regras sem sobrecarga visual.

**Why P2**: E um fluxo secundario, mas precisa permanecer coerente com o novo sistema visual.

**Acceptance Criteria**:

1. WHEN o usuario abrir a tela de regras THEN o sistema SHALL aplicar o mesmo sistema visual e de navegacao do dashboard.
2. WHEN o usuario criar ou editar uma regra THEN o sistema SHALL agrupar campos relacionados e feedbacks de forma mais clara.

**Independent Test**: Abrir regras, iniciar criacao, editar uma regra existente e voltar ao dashboard sem quebra de consistencia visual.

---

### P3: Refinos de polimento visual

**User Story**: Como usuario frequente, eu quero microinteracoes, transicoes e detalhes visuais consistentes para a interface parecer mais refinada e agradavel.

**Why P3**: Agrega percepcao de qualidade, mas nao e necessario para o primeiro corte do redesign.

**Acceptance Criteria**:

1. WHEN elementos interativos receberem hover, focus ou abrir/fechar estados THEN o sistema SHALL usar motion sutil e acessivel, respeitando `prefers-reduced-motion`.

---

## Edge Cases

- WHEN o usuario acessar em viewport estreita THEN o sistema SHALL reorganizar layout, filtros e tabelas sem criar dead zones nem scroll horizontal acidental fora de areas controladas.
- WHEN nao houver transacoes no mes THEN o sistema SHALL oferecer estado vazio util com proximo passo claro.
- WHEN houver textos longos de descricao, instituicao ou nomes de grupos THEN o sistema SHALL preservar legibilidade com truncamento ou quebra apropriada.
- WHEN o app estiver carregando dados ou salvando mutacoes THEN o sistema SHALL manter labels originais, indicar progresso e evitar layout shift brusco.
- WHEN um modal ou prompt estiver aberto THEN o sistema SHALL gerir foco, retorno e escape conforme padroes acessiveis.

---

## Requirement Traceability

Each requirement gets a unique ID for tracking across design, tasks, and validation.

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| UI-01 | P1: Dashboard mais claro e orientado a revisao | Design | Pending |
| UI-02 | P1: Dashboard mais claro e orientado a revisao | Design | Pending |
| UI-03 | P1: Dashboard mais claro e orientado a revisao | Design | Pending |
| UI-04 | P1: Revisao de lancamentos mais pratica | Design | Pending |
| UI-05 | P1: Revisao de lancamentos mais pratica | Design | Pending |
| UI-06 | P1: Revisao de lancamentos mais pratica | Design | Pending |
| UI-07 | P1: Autenticacao e entrada mais acolhedoras | Design | Pending |
| UI-08 | P1: Autenticacao e entrada mais acolhedoras | Design | Pending |
| UI-09 | P1: Autenticacao e entrada mais acolhedoras | Design | Pending |
| UI-10 | P2: Fluxo de importacao mais guiado | - | Pending |
| UI-11 | P2: Fluxo de importacao mais guiado | - | Pending |
| UI-12 | P2: Regras de classificacao com melhor organizacao | - | Pending |
| UI-13 | P2: Regras de classificacao com melhor organizacao | - | Pending |
| UI-14 | P3: Refinos de polimento visual | - | Pending |

**Coverage:** 14 total, 0 mapped to tasks, 14 unmapped

---

## Success Criteria

How we know the feature is successful:

- [ ] A navegacao principal e compreensivel sem explicacao adicional em dashboard, auth e regras.
- [ ] Os fluxos de revisar, filtrar, editar e importar ficam visualmente mais claros em desktop e mobile.
- [ ] A interface atende os requisitos de acessibilidade e interacao descritos em `AGENTS.md`.
- [ ] O redesign preserva o comportamento atual do produto sem regressao funcional nas tarefas centrais.
