# Regras De Classificacao Por Usuario Tasks

**Design**: `.specs/features/002-regras-classificacao-por-usuario/design.md`
**Status**: In Progress

---

## Execution Plan

### Phase 1: Data Foundation (Sequential)

```text
T1 -> T2
```

### Phase 2: Import Pipeline Integration (Sequential)

```text
T2 -> T3 -> T4
```

### Phase 3: Frontend Learning And Dedicated Management Page (Sequential)

```text
T4 -> T5 -> T6
```

### Phase 4: Validation (Sequential)

```text
T6 -> T7
```

---

## Task Breakdown

### T1: Criar tabela `transaction_classification_rules` com RLS

**Status**: Completed

**What**: Adicionar migration com tabela de regras por usuario, constraints de modo de match, integridade de `budget_group_id` e politicas RLS.
**Where**: `supabase/migrations/<novo_timestamp>_create_transaction_classification_rules.sql`
**Depends on**: None
**Reuses**: `public.set_updated_at()`, padroes de `budget_groups`
**Requirement**: UCR-05, UCR-06, UCR-09, UCR-13, UCR-14, UCR-16, UCR-17, UCR-18

**Done when**:

- [x] A tabela existe com campos de match e payload de classificacao
- [x] O payload persistido da regra contem apenas `type`, `category` e `budget_group_id`
- [x] O modo `description` exige `match_amount = null`
- [x] O modo `description_amount` exige `match_amount` preenchido
- [x] A combinacao `user_id + descricao normalizada + valor` e unica para regras `description_amount`
- [x] `budget_group_id`, quando presente, e validado contra o mesmo `user_id`
- [x] RLS cobre CRUD proprio do usuario

**Tests**: none
**Gate**: schema review

---

### T2: Extrair helper compartilhado de normalizacao e match de regras

**Status**: Completed

**What**: Criar um modulo compartilhado para normalizar descricao, carregar regras e aplicar override com precedencia deterministica.
**Where**: `supabase/functions/_shared/classification-rules.ts`
**Depends on**: T1
**Reuses**: contratos de `ImportedTransaction` e helper de grupos
**Requirement**: UCR-01, UCR-03, UCR-04, UCR-05, UCR-06, UCR-07, UCR-22

**Done when**:

- [x] Existe funcao unica para normalizar descricao
- [x] Existe funcao para aplicar match parcial por descricao normalizada
- [x] Existe funcao para aplicar match parcial por descricao normalizada + valor exato
- [x] A precedencia `description_amount` > `description` > descricao mais longa > `updated_at desc` esta implementada
- [x] Casos sem match devolvem a transacao original

**Tests**:

- unitarios do helper puro, se a stack atual suportar

**Gate**: functions check

---

### T3: Integrar regras do usuario nas Edge Functions de importacao

**Status**: Completed

**What**: Ajustar os handlers de importacao para carregar regras do usuario uma vez por request e aplicar override antes do `upsert`.
**Where**: `supabase/functions/import-nubank-csv/index.ts`, `supabase/functions/import-santander-pdf/index.ts`
**Depends on**: T2
**Reuses**: parsers de `nubank.ts`, `santander.ts`, `santander-account.ts`, `resolveImportedTransactionBudgetGroups()`
**Requirement**: UCR-01, UCR-02, UCR-03, UCR-04

**Done when**:

- [x] O baseline atual continua sendo executado
- [x] As regras do usuario sao carregadas uma vez por importacao
- [x] O override acontece antes do `upsert` apenas para `type`, `category` e `budget_group_id`
- [x] O fallback para `Outros` permanece controlado pelos helpers base
- [x] O contrato persistido em `transactions` nao muda

**Tests**: none
**Gate**: `sh tools/check_supabase_functions.sh`

---

### T4: Adaptar helpers base sem quebrar o fallback atual

**Status**: Completed

**What**: Garantir que os parsers base retornem payload consistente para o novo matcher, mantendo `Outros` e `budget_group_id` opcionais como baseline.
**Where**: `supabase/functions/_shared/nubank.ts`, `supabase/functions/_shared/santander.ts`, `supabase/functions/_shared/santander-account.ts`, `supabase/functions/_shared/budget-groups.ts`
**Depends on**: T3
**Reuses**: helpers atuais de categoria, tipo, status e grupo
**Requirement**: UCR-02, UCR-04

**Done when**:

- [x] Nao ha duplicacao do matcher nas implementacoes de banco
- [x] O baseline continua devolvendo `Outros` quando necessario
- [x] O baseline continua resolvendo grupos default quando aplicavel
- [x] As alteracoes nao conflitam com os edits locais ja existentes nesses arquivos

**Tests**: none
**Gate**: `sh tools/check_supabase_functions.sh`

---

### T5: Implementar prompt de aprendizado em `useTransactionEditing`

**Status**: Completed

**What**: Trocar a edicao inline por um modal de edicao com submit unico, detectar mudancas no snapshot de classificacao e abrir um prompt para lembrar ou nao a classificacao.
**Where**: `web/src/hooks/useTransactionEditing.js`, `web/src/components/TransactionTable.jsx`, possivelmente `web/src/App.jsx` e novos componentes de modal/prompt
**Depends on**: T4
**Reuses**: fluxo atual de update de transacoes
**Requirement**: UCR-08, UCR-09, UCR-10, UCR-11, UCR-12, UCR-21

**Done when**:

- [x] A tabela deixa de salvar campos de classificacao inline
- [x] A edicao da transacao abre um modal com os campos relevantes
- [x] O modal expoe como editaveis apenas `type`, `category` e `budget_group_id`
- [x] Campos usados na composicao atual de `external_id` aparecem como somente leitura
- [x] O modal salva a transacao com um unico submit
- [x] O prompt aparece apenas quando o snapshot de classificacao mudou
- [x] O usuario pode dispensar o prompt
- [x] O usuario pode escolher `nome` ou `nome + valor`
- [x] A copia da interface deixa claro o impacto em importacoes futuras
- [x] O fluxo nao interrompe a persistencia da transacao editada

**Tests**: none
**Gate**: `npm run lint` e `npm run build`

---

### T6: Persistir regras e criar pagina separada de gerenciamento

**Status**: Completed

**What**: Criar o fluxo de upsert da regra aprendida e uma pagina separada para listar, adicionar, editar e excluir regras do usuario.
**Where**: `web/src/hooks/useTransactionsData.js`, `web/src/App.jsx`, novos componentes e hooks em `web/src/components/` e `web/src/hooks/`
**Depends on**: T5
**Reuses**: Supabase JS client, paineis atuais
**Requirement**: UCR-13, UCR-14, UCR-15, UCR-16, UCR-17, UCR-18, UCR-19, UCR-20

**Done when**:

- [x] O aceite do prompt cria ou atualiza uma regra sem duplicar o mesmo match
- [x] O aceite em `nome + valor` faz upsert na combinacao unica do usuario em vez de duplicar regra
- [x] Existe uma pagina separada para gerenciamento de regras
- [x] As regras aparecem com descricao, modo, valor quando existir e classificacao
- [x] O usuario consegue adicionar regra manualmente
- [x] O usuario consegue editar regra existente
- [x] O usuario consegue excluir uma regra
- [x] A UI orienta o usuario quando a descricao da regra puder gerar match parcial amplo demais
- [x] Regras com `budget_group_id = null` continuam visiveis e validas

**Tests**: none
**Gate**: `npm run lint` e `npm run build`

---

### T7: Validar o fluxo completo de aprendizado e reuso

**Status**: In Progress

**What**: Executar verificacao integrada do schema, importacao, prompt de aprendizado e reaplicacao da regra em nova importacao.
**Where**: `supabase/`, `web/`
**Depends on**: T6
**Reuses**: checklist de validacao do projeto
**Requirement**: UCR-01 a UCR-17

**Done when**:

- [x] Migration e RLS foram revisados
- [x] `sh tools/check_supabase_functions.sh` passa
- [x] `npm run lint` passa em `web/`
- [x] `npm run build` passa em `web/`
- [ ] O teste manual cobre criacao de regra por `nome`
- [ ] O teste manual cobre criacao de regra por `nome + valor`
- [ ] O teste manual cobre exclusao da regra e perda do override

**Tests**: none
**Gate**: integrated
