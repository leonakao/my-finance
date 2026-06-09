# Gerenciar Budget Groups Specification

## Problem Statement

Hoje `budget_group` funciona como um conjunto fixo de valores globais no schema, na UI e nas regras de classificacao. Isso impede que cada usuario adapte seus grupos, metas e organizacao financeira ao proprio modelo mental, e tambem bloqueia o tratamento correto de grupos removidos.

## Goals

- [ ] Permitir que cada usuario tenha seus proprios `budget_groups`.
- [ ] Criar automaticamente os grupos default `Necessidades`, `Desejos` e `Futuro` quando um usuario entrar no sistema pela primeira vez.
- [ ] Permitir criar, editar e excluir grupos e alterar a meta de cada grupo.
- [ ] Permitir que transacoes fiquem com `budget_group = null` quando o grupo vinculado for excluido.
- [ ] Fazer a aplicacao orientar o usuario a reclassificar transacoes orfas.
- [ ] Permitir que a organizacao por grupos seja totalmente livre, sem dependencia estrutural do modelo 50-30-20.

## Out of Scope

Escopo explicitamente excluido nesta etapa.

| Feature | Reason |
| ------- | ------ |
| Reescrever as heuristicas de classificacao de Santander e Nubank | A tarefa trata de persistencia e gestao por usuario, nao da qualidade das heuristicas |
| Suporte a grupos compartilhados entre usuarios | O modelo desejado e individual por usuario |
| Preservar a semantica 50-30-20 como estrutura obrigatoria do sistema | Os grupos passam a ser livres por usuario |
| Resolver automaticamente transacoes orfas no momento da exclusao | O comportamento desejado e deixar a reclassificacao para o usuario |
| Criar um motor generico de mapeamento automatico entre taxonomias customizadas e regras de importacao | Nesta etapa a importacao so tenta localizar os 3 grupos iniciais por nome |

---

## User Stories

### P1: Usuario gerencia seus proprios grupos ⭐ MVP

**User Story**: Como usuario autenticado, quero criar, editar e excluir meus `budget_groups` para adaptar a classificacao financeira ao meu proprio modelo.

**Why P1**: Sem isso, o app continua preso a grupos fixos no codigo e no banco, o que impede evolucao do fluxo de classificacao por usuario.

**Acceptance Criteria**:

1. WHEN um usuario autenticado acessar o app pela primeira vez THEN o sistema SHALL garantir a existencia dos grupos default `Necessidades`, `Desejos` e `Futuro` para esse usuario.
2. WHEN o usuario criar um novo grupo THEN o sistema SHALL persistir nome e meta vinculados ao `user_id` dele.
3. WHEN o usuario editar nome ou meta de um grupo THEN o sistema SHALL persistir a alteracao sem afetar grupos de outros usuarios.
4. WHEN o usuario excluir um grupo THEN o sistema SHALL remover o grupo e desvincular dele as transacoes associadas, deixando `transactions.budget_group` como `null`.
5. WHEN houver transacoes com `budget_group = null` THEN o sistema SHALL permitir que o usuario identifique que elas precisam de reclassificacao manual.
6. WHEN o usuario renomear ou substituir completamente os grupos default THEN o sistema SHALL continuar funcionando sem depender de uma semantica fixa herdada do 50-30-20.
7. WHEN a importacao automatica nao encontrar um dos grupos iniciais pelo nome THEN o sistema SHALL deixar `budget_group_id` como `null` em vez de inferir outro grupo arbitrariamente.

**Independent Test**: Criar um usuario limpo, confirmar os 3 grupos default, adicionar um grupo novo, editar sua meta, exclui-lo e verificar que as transacoes vinculadas ficaram sem grupo.

---

### P1: Dashboard e edicao respeitam grupos dinamicos ⭐ MVP

**User Story**: Como usuario autenticado, quero que o painel e a edicao de transacoes usem meus grupos reais, em vez de listas fixas no codigo.

**Why P1**: Se a UI continuar usando constantes fixas, a gestao de grupos no banco nao se reflete na experiencia do usuario.

**Acceptance Criteria**:

1. WHEN o app carregar os dados do usuario THEN o sistema SHALL buscar os `budget_groups` do proprio usuario em vez de depender de constantes fixas.
2. WHEN o usuario editar o grupo de uma transacao THEN o sistema SHALL oferecer apenas os grupos disponiveis para aquele usuario.
3. WHEN uma transacao estiver com `budget_group = null` THEN o sistema SHALL exibir esse estado de forma clara e permitir reclassificacao posterior.
4. WHEN o dashboard calcular totais por grupo THEN o sistema SHALL considerar os grupos ativos do usuario e tratar transacoes sem grupo sem quebrar a tela.
5. WHEN nao existir grupo associado a uma transacao THEN o sistema SHALL impedir que ela seja contabilizada silenciosamente como se estivesse classificada.
6. WHEN o usuario trabalhar com grupos que nao correspondem a `Necessidades`, `Desejos` e `Futuro` THEN o sistema SHALL exibir e agregar esses grupos normalmente.

**Independent Test**: Criar grupos personalizados, recarregar o app e confirmar que filtros, selects e agregacoes usam a lista dinamica e lidam com transacoes sem grupo.

---

### P2: Metas por grupo sao configuraveis

**User Story**: Como usuario autenticado, quero alterar a meta percentual de cada grupo para adaptar o planejamento financeiro ao meu caso.

**Why P2**: As metas atuais servem apenas como ponto de partida. Se os grupos sao livres, a meta precisa ser propriedade do grupo, nao de uma estrutura fixa do produto.

**Acceptance Criteria**:

1. WHEN os grupos default forem criados THEN o sistema SHALL inicializar metas default apenas como sugestao inicial, sem tratar esses valores como regra obrigatoria de negocio.
2. WHEN o usuario alterar a meta de um grupo THEN o sistema SHALL salvar o novo valor no proprio grupo.
3. WHEN o dashboard exibir comparacoes contra meta THEN o sistema SHALL usar a meta persistida do grupo, nao um valor hardcoded no frontend.
4. WHEN um grupo nao tiver relacao com a logica original 50-30-20 THEN o sistema SHALL continuar funcionando com a meta definida para ele.

**Independent Test**: Alterar a meta de um grupo existente e confirmar que o valor salvo volta apos reload e e usado nas comparacoes do painel.

---

## Edge Cases

- WHEN um usuario excluir um grupo que ainda tem transacoes vinculadas THEN o sistema SHALL deixar essas transacoes com `budget_group = null` e sinaliza-las para reclassificacao.
- WHEN um usuario nao tiver nenhum grupo alem dos defaults THEN o sistema SHALL continuar permitindo criar novos grupos sem depender de valores globais.
- WHEN o nome de um grupo for alterado THEN o sistema SHALL preservar o vinculo das transacoes sem exigir recadastro manual.
- WHEN houver transacoes com `budget_group = null` THEN o sistema SHALL manter a tela funcional e destacar pendencia de classificacao.
- WHEN o usuario substituir completamente os grupos iniciais por uma taxonomia propria THEN o sistema SHALL continuar permitindo classificacao manual sem restaurar categorias estruturais ocultas.
- WHEN a importacao procurar por `Necessidades`, `Desejos` ou `Futuro` e nao encontrar correspondencia exata THEN o sistema SHALL importar a transacao sem grupo.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| BG-01 | P1: Usuario gerencia seus proprios grupos | Design | Pending |
| BG-02 | P1: Usuario gerencia seus proprios grupos | Design | Pending |
| BG-03 | P1: Usuario gerencia seus proprios grupos | Design | Pending |
| BG-04 | P1: Usuario gerencia seus proprios grupos | Design | Pending |
| BG-05 | P1: Usuario gerencia seus proprios grupos | Design | Pending |
| BG-15 | P1: Usuario gerencia seus proprios grupos | Design | Pending |
| BG-06 | P1: Dashboard e edicao respeitam grupos dinamicos | Design | Pending |
| BG-07 | P1: Dashboard e edicao respeitam grupos dinamicos | Design | Pending |
| BG-08 | P1: Dashboard e edicao respeitam grupos dinamicos | Design | Pending |
| BG-09 | P1: Dashboard e edicao respeitam grupos dinamicos | Design | Pending |
| BG-10 | P1: Dashboard e edicao respeitam grupos dinamicos | Design | Pending |
| BG-11 | P2: Metas por grupo sao configuraveis | Design | Pending |
| BG-12 | P2: Metas por grupo sao configuraveis | Design | Pending |
| BG-13 | P2: Metas por grupo sao configuraveis | Design | Pending |
| BG-14 | P2: Metas por grupo sao configuraveis | Design | Pending |

**Coverage:** 15 total, 0 mapeados em tarefas, 15 pendentes

## Success Criteria

- [ ] Cada usuario passa a ter sua propria lista de `budget_groups`.
- [ ] O app deixa de depender de lista fixa de grupos para exibicao e edicao.
- [ ] Excluir um grupo nao quebra integridade nem mascara transacoes sem classificacao.
- [ ] As metas por grupo deixam de ser hardcoded no frontend.
- [ ] O modelo final nao depende de semantica estrutural escondida para reconhecer grupos "especiais".
- [ ] A implementacao passa pelo gate minimo relevante: revisao de migration/schema, `npm run lint`, `npm run build` e verificacao manual do fluxo de CRUD e reclassificacao.
