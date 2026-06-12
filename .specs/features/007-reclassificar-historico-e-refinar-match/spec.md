# Reclassificar Historico E Refinar Match Specification

## Problem Statement

Hoje a opcao de reclassificar transacoes existentes depende do array carregado no frontend e executa updates linha a linha a partir desse estado em memoria. Isso deixa transacoes de fora quando o cliente nao carregou tudo, acopla a operacao ao limite da UI e reaplica um criterio de match ainda amplo demais para varias descricoes parecidas.

O objetivo desta feature e mover a reclassificacao historica para o backend, com aplicacao persistente sobre todas as transacoes elegiveis do usuario, e refinar o conceito de "se enquadrar" para reduzir falsos positivos sem perder o fluxo de aprendizado ja entregue na feature `002-regras-classificacao-por-usuario`.

## Goals

- [ ] Reclassificar no backend todas as transacoes existentes do usuario que combinarem com a regra escolhida.
- [ ] Remover a dependencia do estado carregado no frontend para a reclassificacao historica.
- [ ] Refinar o match das regras com filtros adicionais de contexto, alem de descricao e valor.
- [ ] Manter o contrato de importacoes futuras alinhado com o mesmo criterio usado na reclassificacao historica.
- [ ] Expor ao usuario quantas transacoes foram afetadas pela reaplicacao da regra.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Motor fuzzy, regex arbitraria ou IA para matching | A etapa atual precisa endurecer a regra com criterios deterministas e auditaveis |
| Reclassificacao automatica e silenciosa de todo o historico sempre que qualquer regra mudar | Nesta etapa a reaplicacao continua sendo uma acao explicita do usuario |
| Cobrir scripts legados em `tools/` | O fluxo ativo continua sendo `web/` + Supabase |
| Paginar, resumir ou reescrever a tela mensal inteira | O problema aqui e o contrato de reclassificacao, nao a navegacao da UI |

---

## User Stories

### P1: Reclassificacao historica roda no backend e cobre todo o historico do usuario ⭐ MVP

**User Story**: Como usuario autenticado, quero reaplicar uma regra em todas as minhas transacoes ja persistidas para que a classificacao historica nao dependa do que o frontend carregou.

**Why P1**: Esse e o nucleo da falha atual. Sem mover a operacao para o backend, a UI continua sendo uma visao parcial do historico e a reclassificacao segue incompleta.

**Acceptance Criteria**:

1. WHEN o usuario confirmar a reaplicacao de uma regra THEN o sistema SHALL executar a reclassificacao no backend, sem depender do array em memoria do frontend.
2. WHEN a regra for reaplicada THEN o sistema SHALL considerar todas as transacoes do usuario elegiveis no banco, inclusive as nao carregadas na tela atual.
3. WHEN a operacao terminar THEN o sistema SHALL retornar a quantidade de transacoes efetivamente atualizadas.
4. WHEN nenhuma transacao adicional combinar com a regra THEN o sistema SHALL retornar sucesso com contagem zero, sem erro falso.
5. WHEN a reclassificacao falhar no backend THEN o sistema SHALL preservar o estado atual da UI e informar o erro ao usuario.
6. WHEN a reclassificacao terminar com sucesso THEN o frontend SHALL recarregar os dados canonicos a partir do backend antes de mostrar o resultado final.

**Independent Test**: Criar uma regra que combine com transacoes fora do recorte visivel da tela, acionar a reaplicacao e validar no banco que todas as linhas elegiveis foram atualizadas.

---

### P1: Match da regra fica mais preciso sem perder determinismo ⭐ MVP

**User Story**: Como usuario autenticado, quero que uma regra so se aplique quando a transacao realmente pertencer ao mesmo contexto para evitar reclassificacoes indevidas.

**Why P1**: Reclassificar todo o historico com um match amplo demais so amplia o erro. O endurecimento do criterio e obrigatorio junto com a mudanca de escala.

**Acceptance Criteria**:

1. WHEN uma regra existir THEN o sistema SHALL continuar exigindo match por descricao normalizada.
2. WHEN a regra estiver no modo `description_amount` THEN o sistema SHALL continuar exigindo igualdade exata do valor monetario alem do match por descricao.
3. WHEN a regra tiver filtros adicionais preenchidos de `institution` e/ou `account` THEN o sistema SHALL exigir igualdade exata desses campos para considerar que a transacao se enquadra.
4. WHEN dois candidatos combinarem com a mesma transacao THEN o sistema SHALL manter a precedencia atual de `description_amount` antes de `description`, depois descricao normalizada mais longa e por fim `updated_at` mais recente.
5. WHEN a transacao nao satisfizer todos os filtros preenchidos pela regra THEN o sistema SHALL nao reaplicar a classificacao.
6. WHEN a regra nao tiver filtros adicionais preenchidos THEN o sistema SHALL manter compatibilidade com o comportamento atual de descricao ou descricao + valor.

**Independent Test**: Criar duas transacoes com a mesma descricao em contas diferentes, salvar uma regra com filtro de conta e validar que apenas a conta correspondente e reclassificada.

---

### P2: Usuario entende e controla o escopo da reaplicacao

**User Story**: Como usuario autenticado, quero ver com clareza o contexto da regra e o resultado da reaplicacao para confiar na alteracao historica.

**Why P2**: A operacao em lote afeta dados financeiros persistidos; sem transparencia, ela vira caixa-preta.

**Acceptance Criteria**:

1. WHEN o usuario criar ou editar uma regra THEN a UI SHALL exibir os filtros extras de contexto que definem o enquadramento.
2. WHEN o usuario for convidado a reaplicar a regra THEN a UI SHALL deixar claro que a acao afetara transacoes persistidas no banco, nao apenas a tela atual.
3. WHEN a regra for listada na pagina de gerenciamento THEN o sistema SHALL mostrar descricao, modo de match e filtros extras ativos.
4. WHEN a reaplicacao concluir THEN o sistema SHALL informar quantas transacoes foram reclassificadas.

**Independent Test**: Criar regra com filtro extra, confirmar que a listagem e o prompt deixam o escopo evidente e que o feedback final mostra a contagem retornada pelo backend.

---

## Edge Cases

- WHEN a regra tiver descricao vazia ou normalizacao vazia THEN o sistema SHALL impedir a persistencia da regra.
- WHEN a regra tiver `account` preenchido e a transacao tiver conta vazia THEN o sistema SHALL considerar que nao houve match.
- WHEN a regra tiver `institution` preenchido e a transacao tiver instituicao vazia THEN o sistema SHALL considerar que nao houve match.
- WHEN uma transacao ja possuir exatamente a classificacao alvo da regra THEN a reaplicacao SHALL ignora-la na contagem de atualizadas.
- WHEN o usuario disparar a reaplicacao duas vezes seguidas THEN a segunda execucao SHALL ser idempotente e retornar zero ou apenas as linhas ainda nao alinhadas.
- WHEN a tabela do frontend estiver carregada parcialmente por limite de API ou filtro local THEN o resultado da reaplicacao SHALL continuar refletindo o banco inteiro do usuario.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| RHM-01 | P1: Reclassificacao historica roda no backend e cobre todo o historico do usuario | Design | Pending |
| RHM-02 | P1: Reclassificacao historica roda no backend e cobre todo o historico do usuario | Design | Pending |
| RHM-03 | P1: Reclassificacao historica roda no backend e cobre todo o historico do usuario | Design | Pending |
| RHM-04 | P1: Reclassificacao historica roda no backend e cobre todo o historico do usuario | Design | Pending |
| RHM-05 | P1: Reclassificacao historica roda no backend e cobre todo o historico do usuario | Design | Pending |
| RHM-06 | P1: Reclassificacao historica roda no backend e cobre todo o historico do usuario | Design | Pending |
| RHM-07 | P1: Match da regra fica mais preciso sem perder determinismo | Design | Pending |
| RHM-08 | P1: Match da regra fica mais preciso sem perder determinismo | Design | Pending |
| RHM-09 | P1: Match da regra fica mais preciso sem perder determinismo | Design | Pending |
| RHM-10 | P1: Match da regra fica mais preciso sem perder determinismo | Design | Pending |
| RHM-11 | P1: Match da regra fica mais preciso sem perder determinismo | Design | Pending |
| RHM-12 | P1: Match da regra fica mais preciso sem perder determinismo | Design | Pending |
| RHM-13 | P2: Usuario entende e controla o escopo da reaplicacao | Design | Pending |
| RHM-14 | P2: Usuario entende e controla o escopo da reaplicacao | Design | Pending |
| RHM-15 | P2: Usuario entende e controla o escopo da reaplicacao | Design | Pending |
| RHM-16 | P2: Usuario entende e controla o escopo da reaplicacao | Design | Pending |

**Coverage:** 16 total, 16 mapeados em tarefas, 0 nao mapeados

## Success Criteria

- [ ] O clique de reaplicar regra deixa de depender do array `transactions` carregado no browser.
- [ ] A operacao atualiza todo o historico elegivel do usuario no banco e retorna uma contagem auditavel.
- [ ] O contrato de match passa a suportar pelo menos `institution` e `account` como filtros extras opcionais.
- [ ] Importacao futura e reclassificacao historica usam o mesmo criterio funcional de match.
- [ ] A interface deixa claro o escopo persistente da operacao.
