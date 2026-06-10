# STATE

## Decisions

- A skill `tlc-spec-driven` foi instalada em `~/.codex/skills/tlc-spec-driven` em 2026-06-03.
- Este repositorio passara a usar `.specs/` como memoria persistente para planejamento e execucao.
- Nao mexer automaticamente em fluxos marcados como arquivados sem uma solicitacao explicita.
- O codebase foi mapeado com base em `tools/`, `web/` e `supabase/` em 2026-06-03.
- Regras de negocio financeiras devem permanecer no pipeline de ingestao Python e/ou no schema do Supabase, nao na UI.
- Mudancas em `type`, `category`, `budget_group` e `status` devem ser coordenadas entre SQL, Python, frontend e documentacao.
- `App.jsx` pode permanecer central enquanto houver uma unica tela simples; novas responsabilidades relevantes devem disparar modularizacao.
- Pastas de feature em `.specs/features/` devem seguir o padrao numerado `NNN-slug-da-feature`, com zero padding de 3 digitos.
- A feature `002-regras-classificacao-por-usuario` sera planejada sobre o fluxo ativo de importacao em `supabase/functions/` e nao sobre scripts legados em `tools/`.
- Para essa feature, a ordem planejada sera baseline global -> fallback `Outros` -> override por regra do usuario -> upsert em `transactions`.
- A feature `003-importar-parcelas-por-mes` sera desenvolvida na worktree `.worktrees/003-importar-parcelas-por-mes`, branch `feature/003-importar-parcelas-por-mes`.
- O MVP da feature `003-importar-parcelas-por-mes` cobre o parser de cartao Santander em `supabase/functions/_shared/santander.ts`, unico fluxo ativo que hoje expoe `installment` no formato `NN/NN`.
- A estrategia de idempotencia da feature `003-importar-parcelas-por-mes` sera gerar `external_id` determinista por parcela sintetizada, derivado de uma chave-base estavel da compra.

## Current Facts

- O repositorio possui alteracoes locais em `README.md`, `.gitignore` e a arvore `supabase/`.
- O frontend fica em `web/` e usa React + Vite + Supabase JS.
- Os extratores locais ficam em `tools/`.
- O schema real ja possui `budget_groups` e `transactions.budget_group_id` via migrations de 2026-06-09, mesmo que a documentacao anterior em `.specs/features/001-gerenciar-budget-groups/` ainda reflita um estado mais antigo.
- O parser de cartao Santander ja identifica `installment` e hoje persiste apenas a parcela presente na fatura importada.
 - O parser de cartao Santander ja identifica `installment` e hoje persiste apenas a parcela presente na fatura importada.

## Blockers

- Nenhum bloqueio registrado.

## Deferred Ideas

- Instalar skills complementares para exploracao de codigo e diagramas, se o fluxo passar a exigir isso.
- Formalizar testes automatizados para os scripts de extracao e para o frontend.
- Extrair um modulo Python compartilhado para enums e heuristicas financeiras quando a duplicacao justificar.
- Evoluir regras por usuario com filtros extras como `institution`, `account` ou `source` se o match por descricao se mostrar insuficiente.

## Preferences

- Manter mudancas pequenas e focadas, especialmente em fluxos financeiros.
