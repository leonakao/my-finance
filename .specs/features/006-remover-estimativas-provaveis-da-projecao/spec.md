# Remover Estimativas Provaveis Da Projecao Specification

## Problem Statement

A pagina `Mensal` detalha os lancamentos registrados e as estimativas recorrentes provaveis que formam a projecao. Entretanto, uma recorrencia identificada pela heuristica pode nao acontecer em determinado mes ou pode ter deixado de existir. Hoje o usuario nao consegue retirar essa estimativa da projecao, o que pode distorcer o saldo disponivel e a sugestao de gasto semanal.

Esta feature permite ao usuario excluir apenas estimativas marcadas como `Provavel`, com efeito no mes selecionado ou naquele mes e nos meses futuros. A exclusao deve ser reversivel, persistente por usuario e nao pode apagar transacoes registradas nem modificar o historico usado para detectar recorrencias.

## Goals

- [ ] Permitir remover uma estimativa provavel somente do mes selecionado.
- [ ] Permitir remover uma estimativa provavel do mes selecionado e de todos os meses futuros.
- [ ] Recalcular imediatamente totais projetados, saldo disponivel e sugestao semanal sem a estimativa removida.
- [ ] Manter as exclusoes persistidas e isoladas por usuario.
- [ ] Permitir revisar e restaurar estimativas removidas.
- [ ] Preservar acessibilidade, navegacao por teclado, responsividade e feedback de mutacao conforme `AGENTS.md`.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Remover ou editar transacoes registradas | A feature atua exclusivamente sobre estimativas `Provavel`. |
| Alterar a heuristica que identifica recorrencias | A exclusao e aplicada ao resultado da heuristica, sem mudar seus dados de entrada ou criterios. |
| Excluir todas as ocorrencias historicas de uma recorrencia | O historico deve continuar disponivel para analise e deteccao. |
| Criar regras condicionais por valor, categoria ou grupo | O primeiro escopo identifica a recorrencia pelo tipo e descricao normalizada ja usados na projecao. |
| Gerenciar exclusoes fora da pagina `Mensal` | O fluxo inicial permanece contextual ao mes e ao detalhamento da projecao. |
| Aplicar exclusoes retroativamente a meses anteriores | A acao afeta o mes selecionado e, opcionalmente, os meses seguintes. |

---

## User Stories

### P1: Remover uma estimativa provavel do mes selecionado ⭐ MVP

**User Story**: Como usuario que sabe que uma despesa ou receita provavel nao acontecera neste mes, quero retira-la apenas desta projecao para trabalhar com valores mais realistas.

**Why P1**: Uma excecao pontual nao deve ocultar a mesma recorrencia em outros meses.

**Acceptance Criteria**:

1. WHEN o usuario visualizar um item `Provavel` na projecao mensal THEN o sistema SHALL oferecer a acao acessivel `Remover da projecao…`.
2. WHEN o usuario acionar a remocao THEN o sistema SHALL apresentar uma confirmacao com as opcoes `Somente neste mes` e `Neste e nos meses futuros`, sem executar a mutacao antes da escolha.
3. WHEN o usuario confirmar `Somente neste mes` THEN o sistema SHALL ocultar da projecao apenas a estimativa com mesmo tipo e descricao normalizada no mes selecionado.
4. WHEN a exclusao for salva THEN o sistema SHALL remover imediatamente o item dos totais de provaveis e do saldo projetado daquele mes.
5. WHEN a exclusao ocorrer no mes atual THEN o sistema SHALL recalcular imediatamente o saldo disponivel e a sugestao de gasto semanal.
6. WHEN o usuario cancelar a confirmacao THEN o sistema SHALL preservar a projecao sem criar exclusao.

**Independent Test**: Remover uma estimativa provavel somente do mes atual, confirmar sua ausencia e os totais recalculados, e verificar que a mesma recorrencia continua visivel no mes seguinte.

---

### P1: Remover uma estimativa provavel a partir do mes selecionado ⭐ MVP

**User Story**: Como usuario que sabe que uma recorrencia deixou de existir, quero retira-la do mes selecionado e dos meses futuros para que ela nao continue distorcendo minhas projecoes.

**Why P1**: Recorrencias encerradas exigem uma preferencia duradoura, sem obrigar o usuario a repetir a remocao a cada mes.

**Acceptance Criteria**:

1. WHEN o usuario confirmar `Neste e nos meses futuros` THEN o sistema SHALL ocultar a estimativa com mesmo tipo e descricao normalizada no mes selecionado e em todos os meses posteriores.
2. WHEN a exclusao futura for aplicada THEN o sistema SHALL preservar a estimativa em meses anteriores ao mes inicial da exclusao.
3. WHEN a heuristica voltar a inferir a mesma recorrencia em um mes coberto pela exclusao THEN o sistema SHALL filtra-la antes de calcular e apresentar a projecao.
4. WHEN houver estimativas com descricoes iguais mas tipos diferentes THEN o sistema SHALL tratar receita e despesa como recorrencias distintas.
5. WHEN o usuario encerrar e reabrir a aplicacao THEN o sistema SHALL manter a exclusao aplicada.

**Independent Test**: Remover uma recorrencia com escopo futuro, verificar que ela permanece em um mes anterior e desaparece no mes escolhido e nos seguintes, inclusive apos recarregar a pagina.

---

### P1: Revisar e restaurar estimativas removidas ⭐ MVP

**User Story**: Como usuario que removeu uma estimativa por engano ou mudou de decisao, quero encontra-la e restaura-la sem perder controle sobre a projecao.

**Why P1**: A remocao afeta indicadores financeiros e precisa ser reversivel e auditavel na propria tela.

**Acceptance Criteria**:

1. WHEN o mes selecionado possuir exclusoes aplicaveis THEN o sistema SHALL exibir por padrao apenas um controle resumido `Ocultando X estimativa(s)` no detalhamento da projecao.
2. WHEN o usuario acionar o controle resumido THEN o sistema SHALL expandir a lista de estimativas removidas e informar para cada item se a exclusao vale `Somente neste mes` ou `Deste mes em diante`, sem depender apenas de cor.
3. WHEN o usuario restaurar uma exclusao mensal THEN o sistema SHALL voltar a considerar a estimativa apenas naquele mes, caso ela ainda seja produzida pela heuristica.
4. WHEN o usuario restaurar uma exclusao futura THEN o sistema SHALL remover toda a regra iniciada no mes original, voltando a considerar a recorrencia daquele ponto em diante.
5. WHEN a restauracao for concluida THEN o sistema SHALL recalcular imediatamente os totais e indicadores afetados.
6. WHEN uma remocao ou restauracao falhar THEN o sistema SHALL preservar ou recuperar o estado anterior e apresentar mensagem de erro em regiao `aria-live`.
7. WHEN uma remocao for concluida THEN o sistema SHOULD oferecer uma acao imediata de desfazer, sem substituir a secao persistente de restauracao.
8. WHEN duas ou mais exclusoes aplicaveis representarem a mesma recorrencia THEN o contador SHALL considerar uma unica estimativa oculta.

**Independent Test**: Expandir o informativo `Ocultando X estimativa(s)`, restaurar exclusoes mensal e futura, confirmar a volta dos itens e o recalculo dos indicadores; simular falha e validar rollback e feedback.

---

### P2: Manter o fluxo seguro, acessivel e responsivo

**User Story**: Como usuario de teclado ou dispositivo movel, quero remover e restaurar estimativas com controles previsiveis para nao executar alteracoes acidentais.

**Why P2**: A funcionalidade introduz mutacoes em uma area de leitura e deve preservar os guardrails de interacao do produto.

**Acceptance Criteria**:

1. WHEN o dialogo de confirmacao abrir THEN o sistema SHALL mover o foco para ele, prender o foco durante a interacao e devolver o foco ao acionador ao fechar.
2. WHEN a mutacao estiver em andamento THEN o botao acionado SHALL manter seu rotulo original, exibir indicador de carregamento e impedir envio duplicado.
3. WHEN o usuario navegar por teclado THEN todos os controles SHALL possuir nome acessivel, alvo adequado e foco visivel.
4. WHEN o usuario acessar a pagina em viewport movel THEN os controles interativos SHALL possuir alvo minimo de 44px e nao causar overflow horizontal.
5. WHEN o usuario abrir diretamente uma URL mensal com exclusoes THEN o sistema SHALL carregar a projecao e as exclusoes correspondentes sem depender de navegacao previa.
6. WHEN o usuario expandir ou recolher as estimativas removidas THEN o sistema SHALL refletir esse estado na URL e restaura-lo ao usar Voltar, Avancar ou um deep link.

**Independent Test**: Executar os fluxos de remocao, cancelamento e restauracao somente por teclado e em viewport movel, verificando foco, feedback, alvos e deep link.

## Edge Cases

- WHEN uma exclusao se referir a uma recorrencia que a heuristica nao produz mais THEN o sistema SHALL mante-la restauravel sem inserir um item artificial na projecao.
- WHEN houver uma exclusao mensal e uma exclusao futura aplicaveis ao mesmo item e mes THEN o sistema SHALL ocultar o item uma unica vez e permitir gerenciar cada registro sem duplicar valores.
- WHEN duas estimativas possuirem a mesma descricao normalizada e o mesmo tipo no mesmo mes THEN o sistema SHALL trata-las como uma unica recorrencia, seguindo a identidade atual da heuristica.
- WHEN uma estimativa removida tiver descricao longa THEN o painel expandido SHALL preservar o conteudo acessivel e impedir quebra de layout.
- WHEN o mes selecionado nao possuir estimativas removidas THEN o sistema SHALL omitir a secao, sem exibir um estado vazio desnecessario.
- WHEN o usuario nao estiver autenticado ou tentar acessar exclusao de outro usuario THEN o banco SHALL negar leitura e mutacao por RLS.
- WHEN uma mutacao concorrente tentar criar a mesma exclusao THEN o sistema SHALL manter apenas um registro equivalente por usuario, recorrencia, escopo e mes inicial.
- WHEN uma estimativa de receita for removida THEN o sistema SHALL recalcular os indicadores com a mesma regra usada para despesas, respeitando o sinal financeiro do tipo.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PEXC-01 | P1: Remover do mes selecionado | Tasks | Mapped |
| PEXC-02 | P1: Remover do mes selecionado | Tasks | Mapped |
| PEXC-03 | P1: Remover do mes selecionado | Tasks | Mapped |
| PEXC-04 | P1: Remover do mes selecionado | Tasks | Mapped |
| PEXC-05 | P1: Remover do mes selecionado | Tasks | Mapped |
| PEXC-06 | P1: Remover do mes selecionado | Tasks | Mapped |
| PEXC-07 | P1: Remover a partir do mes | Tasks | Mapped |
| PEXC-08 | P1: Remover a partir do mes | Tasks | Mapped |
| PEXC-09 | P1: Remover a partir do mes | Tasks | Mapped |
| PEXC-10 | P1: Remover a partir do mes | Tasks | Mapped |
| PEXC-11 | P1: Remover a partir do mes | Tasks | Mapped |
| PEXC-12 | P1: Revisar e restaurar | Tasks | Mapped |
| PEXC-13 | P1: Revisar e restaurar | Tasks | Mapped |
| PEXC-14 | P1: Revisar e restaurar | Tasks | Mapped |
| PEXC-15 | P1: Revisar e restaurar | Tasks | Mapped |
| PEXC-16 | P1: Revisar e restaurar | Tasks | Mapped |
| PEXC-17 | P1: Revisar e restaurar | Tasks | Mapped |
| PEXC-18 | P1: Revisar e restaurar | Tasks | Mapped |
| PEXC-19 | P2: Fluxo seguro e acessivel | Tasks | Mapped |
| PEXC-20 | P2: Fluxo seguro e acessivel | Tasks | Mapped |
| PEXC-21 | P2: Fluxo seguro e acessivel | Tasks | Mapped |
| PEXC-22 | P2: Fluxo seguro e acessivel | Tasks | Mapped |
| PEXC-23 | P2: Fluxo seguro e acessivel | Tasks | Mapped |
| PEXC-24 | P1: Revisar e restaurar | Tasks | Mapped |
| PEXC-25 | P2: Fluxo seguro e acessivel | Tasks | Mapped |

**Coverage:** 25 total, 25 mapeados em tarefas, 0 pendentes

## Success Criteria

- [ ] O usuario consegue retirar uma estimativa provavel apenas de um mes sem afetar os seguintes.
- [ ] O usuario consegue retirar uma estimativa provavel do mes selecionado em diante sem afetar meses anteriores.
- [ ] Exclusoes sobrevivem ao reload, respeitam isolamento por usuario e nao alteram transacoes registradas.
- [ ] Totais da projecao, saldo disponivel e sugestao semanal refletem imediatamente remocoes e restauracoes.
- [ ] Toda exclusao pode ser revisada e restaurada na pagina `Mensal`.
- [ ] Os fluxos principais possuem cobertura unitaria e E2E para os dois escopos, restauracao, persistencia, falha e acessibilidade basica.
