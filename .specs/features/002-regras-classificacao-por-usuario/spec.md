# Regras De Classificacao Por Usuario Specification

## Problem Statement

Hoje a classificacao de transacoes importadas depende de regras hardcoded nos helpers de importacao em `supabase/functions/_shared/`. Isso funciona como bootstrap, mas obriga todo ajuste fino a ser refeito manualmente na UI e nao aprende com as recategorizacoes do proprio usuario.

O objetivo desta feature e manter um conjunto pequeno de regras base globais para a classificacao inicial, mas permitir que cada usuario acumule suas proprias regras persistidas. Quando o usuario corrigir uma transacao manualmente, o sistema deve oferecer a opcao de lembrar aquela classificacao para importacoes futuras, com match por nome ou por nome + valor.

## Goals

- [ ] Permitir regras de classificacao por usuario reaplicadas nas proximas importacoes.
- [ ] Manter regras base globais como bootstrap comum entre bancos suportados.
- [ ] Garantir fallback para `Outros` quando nenhuma regra base ou do usuario se aplicar.
- [ ] Oferecer aprendizado a partir da edicao manual de transacoes.
- [ ] Permitir que o usuario escolha entre lembrar por nome ou por nome + valor.
- [ ] Fazer as Edge Functions aplicarem as regras do usuario antes do upsert final em `transactions`.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Remover completamente as regras base globais | O pedido explicita a manutencao de um conjunto base compartilhado |
| Construir um motor generico de matching fuzzy, IA ou regex arbitraria | A primeira versao pode operar com descricao normalizada e valor exato |
| Permitir edicao massiva, reordenacao ou prioridade manual de regras pelo usuario | Nao e necessario para validar o fluxo de aprendizado inicial |
| Reprocessar automaticamente todo o historico ja importado apos criar uma regra | O pedido cobre proximas importacoes |
| Cobrir scripts legados em `tools/*.py` nesta etapa | O fluxo ativo de importacao autenticada passa hoje pelas Edge Functions |

---

## User Stories

### P1: Importacoes aprendem com regras do usuario ⭐ MVP

**User Story**: Como usuario autenticado, quero que novas importacoes consultem minhas regras salvas para reduzir recategorizacao manual.

**Why P1**: Esse e o nucleo do problema. Sem isso, as regras continuam centralizadas no codigo e o sistema nao melhora com o uso.

**Acceptance Criteria**:

1. WHEN uma transacao for importada THEN o sistema SHALL executar primeiro a classificacao base global do banco correspondente.
2. WHEN a classificacao base global nao encontrar correspondencia THEN o sistema SHALL definir `category = 'Outros'`.
3. WHEN existir uma regra do usuario que combine com a transacao importada THEN o sistema SHALL sobrescrever a classificacao base com os campos persistidos na regra do usuario.
4. WHEN nao existir regra do usuario compativel THEN o sistema SHALL manter o resultado da classificacao base.
5. WHEN uma regra do usuario tiver modo `nome` THEN o sistema SHALL aplicar comparacao parcial entre a descricao normalizada da transacao importada e a descricao normalizada salva na regra.
6. WHEN uma regra do usuario tiver modo `nome_valor` THEN o sistema SHALL exigir match simultaneo de comparacao parcial da descricao normalizada e igualdade exata do valor monetario.
7. WHEN duas ou mais regras do mesmo usuario combinarem com a mesma transacao THEN o sistema SHALL aplicar a regra mais especifica (`nome_valor` antes de `nome`) e, em empate, a regra criada mais recentemente.
8. WHEN uma regra do usuario conflitar com o resultado de uma regra base global THEN o sistema SHALL sempre priorizar a regra do usuario.
9. WHEN duas regras do mesmo modo combinarem com a mesma transacao THEN o sistema SHALL priorizar a descricao normalizada mais especifica, isto e, a de maior comprimento.

**Independent Test**: Importar transacoes com e sem regra do usuario, validando override, fallback para `Outros` e desempate entre `nome` e `nome_valor`.

---

### P1: Edicao manual pode gerar nova regra ⭐ MVP

**User Story**: Como usuario autenticado, quero que ao corrigir uma transacao o sistema pergunte se deve lembrar aquela classificacao para proxima vez.

**Why P1**: O aprendizado precisa nascer do fluxo de revisao que ja existe hoje, sem exigir tela administrativa antes do valor aparecer.

**Acceptance Criteria**:

1. WHEN o usuario decidir editar uma transacao THEN o sistema SHALL abrir um modal de edicao da transacao.
2. WHEN o modal abrir THEN o sistema SHALL permitir editar em conjunto apenas os campos de classificacao relevantes da transacao.
3. WHEN o usuario salvar o modal THEN o sistema SHALL persistir a transacao com um unico submit, aplicando juntos os campos editados.
4. WHEN o usuario salvar uma alteracao de classificacao no modal THEN o sistema SHALL oferecer a opcao de lembrar aquela classificacao.
5. WHEN o usuario aceitar lembrar por nome THEN o sistema SHALL criar uma regra do usuario baseada na descricao normalizada da transacao.
6. WHEN o usuario aceitar lembrar por nome + valor THEN o sistema SHALL criar uma regra do usuario baseada na descricao normalizada e no valor da transacao.
7. WHEN o usuario recusar lembrar a classificacao THEN o sistema SHALL apenas persistir a alteracao da transacao, sem criar regra.
8. WHEN a regra for criada a partir da transacao editada THEN o sistema SHALL persistir o snapshot completo da classificacao final da transacao, contendo apenas `type`, `category` e `budget_group_id`, como payload da regra.
9. WHEN a mesma regra ja existir para o usuario THEN o sistema SHALL atualizar a classificacao persistida em vez de duplicar a regra.
10. WHEN o usuario salvar uma regra no modo `nome_valor` THEN a combinacao de descricao normalizada + valor SHALL ser unica dentro do mesmo usuario.
11. WHEN um campo fizer parte da chave deterministica de importacao usada em `external_id` THEN o sistema SHALL trata-lo como nao editavel na UI.

**Independent Test**: Editar uma transacao, criar regra por `nome` e depois outra por `nome_valor`, verificando persistencia e comportamento de upsert.

---

### P2: Usuario consegue revisar e remover regras aprendidas

**User Story**: Como usuario autenticado, quero gerenciar minhas regras salvas em uma pagina separada para manter controle sobre o que sera reaplicado nas importacoes.

**Why P2**: Sem uma area dedicada, o sistema aprende mas vira caixa-preta e dificulta depuracao, manutencao e criacao manual de regras.

**Acceptance Criteria**:

1. WHEN o usuario acessar a area de gerenciamento de regras THEN o sistema SHALL exibir uma pagina separada dedicada a regras de classificacao.
2. WHEN o usuario revisar uma regra THEN o sistema SHALL exibir pelo menos descricao-base, modo de match, valor quando existir, e classificacao salva.
3. WHEN o usuario excluir uma regra THEN o sistema SHALL impedir que ela seja usada nas proximas importacoes.
4. WHEN o usuario editar uma regra existente THEN o sistema SHALL persistir a alteracao respeitando as constraints de unicidade do usuario.
5. WHEN o usuario adicionar manualmente uma nova regra THEN o sistema SHALL permitir escolher modo de match, descricao, valor opcional e classificacao resultante.
6. WHEN uma regra estiver vinculada a um `budget_group_id` removido THEN o sistema SHALL preservar a regra com `budget_group_id = null`, sem quebrar importacoes futuras.

**Independent Test**: Criar regra manualmente na pagina dedicada, editá-la, removê-la e confirmar que uma nova importação reflete cada mudança.

---

## Edge Cases

- WHEN o usuario editar apenas campos que nao fazem parte da classificacao, como `notes` THEN o sistema SHALL nao oferecer prompt de aprendizado.
- WHEN o usuario abrir o modal e nao salvar alteracoes THEN o sistema SHALL nao criar nem atualizar regra.
- WHEN a transacao editada tiver `type = 'Receita'` ou `type = 'Transferência'` THEN a regra SHALL aceitar `budget_group_id = null` normalmente.
- WHEN o usuario excluir um `budget_group` antes usado em uma regra THEN o sistema SHALL manter a regra com grupo nulo e ainda reaplicar os demais campos classificados.
- WHEN a descricao importada variar apenas por caixa, espacos duplicados ou acentos previsiveis THEN o sistema SHALL usar a mesma normalizacao adotada na criacao e no match da regra.
- WHEN a importacao receber descricao vazia ou invalida THEN o sistema SHALL pular o match por regra do usuario e manter apenas a classificacao base.
- WHEN a transacao tiver sido criada por importacao THEN campos usados para compor `external_id`, como `date`, `description` e `amount` nos fluxos atuais, SHALL permanecer somente leitura no modal.
- WHEN o usuario criar ou editar uma regra manualmente com descricao muito curta ou generica THEN o sistema SHALL orientar que o match parcial pode afetar mais transacoes do que o desejado.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| UCR-01 | P1: Importacoes aprendem com regras do usuario | Design | Pending |
| UCR-02 | P1: Importacoes aprendem com regras do usuario | Design | Pending |
| UCR-03 | P1: Importacoes aprendem com regras do usuario | Design | Pending |
| UCR-04 | P1: Importacoes aprendem com regras do usuario | Design | Pending |
| UCR-05 | P1: Importacoes aprendem com regras do usuario | Design | Pending |
| UCR-06 | P1: Importacoes aprendem com regras do usuario | Design | Pending |
| UCR-07 | P1: Importacoes aprendem com regras do usuario | Design | Pending |
| UCR-22 | P1: Importacoes aprendem com regras do usuario | Design | Pending |
| UCR-08 | P1: Edicao manual pode gerar nova regra | Design | Pending |
| UCR-09 | P1: Edicao manual pode gerar nova regra | Design | Pending |
| UCR-10 | P1: Edicao manual pode gerar nova regra | Design | Pending |
| UCR-11 | P1: Edicao manual pode gerar nova regra | Design | Pending |
| UCR-12 | P1: Edicao manual pode gerar nova regra | Design | Pending |
| UCR-13 | P1: Edicao manual pode gerar nova regra | Design | Pending |
| UCR-18 | P1: Edicao manual pode gerar nova regra | Design | Pending |
| UCR-21 | P1: Edicao manual pode gerar nova regra | Design | Pending |
| UCR-14 | P2: Usuario consegue revisar e remover regras aprendidas | Design | Pending |
| UCR-15 | P2: Usuario consegue revisar e remover regras aprendidas | Design | Pending |
| UCR-16 | P2: Usuario consegue revisar e remover regras aprendidas | Design | Pending |
| UCR-17 | P2: Usuario consegue revisar e remover regras aprendidas | Design | Pending |
| UCR-19 | P2: Usuario consegue revisar e remover regras aprendidas | Design | Pending |
| UCR-20 | P2: Usuario consegue revisar e remover regras aprendidas | Design | Pending |

**Coverage:** 22 total, 0 mapeados em tarefas, 22 pendentes

## Success Criteria

- [ ] As Edge Functions passam a aplicar regras por usuario alem das heuristicas base.
- [ ] A UI oferece aprendizado contextual ao editar classificacoes.
- [ ] O sistema diferencia claramente match por `nome` e por `nome + valor`.
- [ ] Fallback para `Outros` continua consistente quando nao houver match.
- [ ] O usuario consegue adicionar, editar e excluir regras em uma pagina separada.
- [ ] A implementacao passa pelo gate minimo relevante: revisao de migration/schema, `npm run lint`, `npm run build` e `sh tools/check_supabase_functions.sh`.
