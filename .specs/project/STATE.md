# STATE

## Decisions

- A skill `tlc-spec-driven` foi instalada em `~/.codex/skills/tlc-spec-driven` em 2026-06-03.
- Este repositorio passara a usar `.specs/` como memoria persistente para planejamento e execucao.
- Nao mexer automaticamente em fluxos marcados como arquivados sem uma solicitacao explicita.
- O codebase foi remapeado integralmente em 2026-06-11 com base no frontend React/TypeScript modular, Supabase, Edge Functions, testes e deploy atuais.
- Regras canonicas de ingestao e integridade devem permanecer nas Edge Functions e/ou no schema; agregacoes e projecoes de apresentacao podem permanecer no frontend enquanto volume e complexidade forem controlados.
- Mudancas em `type`, `category` e `budget_group_id` devem ser coordenadas entre SQL, Edge Functions, frontend, ferramentas locais ainda ativas e documentacao.
- `App.tsx` permanece como composition root e roteador; novas operacoes assincronas e regras de dominio devem ser extraidas para hooks e bibliotecas dedicadas.
- Pastas de feature em `.specs/features/` devem seguir o padrao numerado `NNN-slug-da-feature`, com zero padding de 3 digitos.
- A feature `002-regras-classificacao-por-usuario` sera planejada sobre o fluxo ativo de importacao em `supabase/functions/` e nao sobre scripts legados em `tools/`.
- Para essa feature, a ordem planejada sera baseline global -> fallback `Outros` -> override por regra do usuario -> upsert em `transactions`.
- A feature `003-importar-parcelas-por-mes` sera desenvolvida na worktree `.worktrees/003-importar-parcelas-por-mes`, branch `feature/003-importar-parcelas-por-mes`.
- O MVP da feature `003-importar-parcelas-por-mes` cobre o parser de cartao Santander em `supabase/functions/_shared/santander.ts`, unico fluxo ativo que hoje expoe `installment` no formato `NN/NN`.
- A estrategia de idempotencia da feature `003-importar-parcelas-por-mes` sera gerar `external_id` determinista por parcela sintetizada, derivado de uma chave-base estavel da compra.
- A feature `005-detalhar-projecoes-na-analise-mensal` cobre a tela `Mensal` para mes atual e meses futuros, sem alterar a heuristica de projecao existente nesta etapa de planejamento.
- Para a feature `005-detalhar-projecoes-na-analise-mensal`, no mes atual a projecao considera apenas o que falta acontecer; o saldo restante sera `saldo do mes ate agora + receitas restantes - despesas restantes previstas/provaveis`; a sugestao semanal sera `saldo disponivel / semanas restantes no mes`.
- Para a feature `005-detalhar-projecoes-na-analise-mensal`, a tela `Mensal` seguira a opcao A: bloco-resumo no topo e detalhamento logo abaixo.
- O design da feature `005-detalhar-projecoes-na-analise-mensal` foi aprovado em 2026-06-11.
- Nessa feature, transacoes registradas no dia atual contam como realizadas; deficit zera a sugestao semanal; meses futuros alem do horizonte da dashboard recebem detalhe; e itens registrados podem aparecer tanto na projecao quanto na tabela mensal.
- A feature `005-detalhar-projecoes-na-analise-mensal` possui 9 tarefas planejadas, com componentes de apresentacao paralelizaveis e gate final unitario, lint, typecheck, build e Playwright.
- A feature `005-detalhar-projecoes-na-analise-mensal` foi implementada e validada em 2026-06-11 com 53 testes unitarios e 19 testes Playwright.
- A cobertura E2E da feature `005-detalhar-projecoes-na-analise-mensal` foi ampliada para 22 testes Playwright, incluindo formulas financeiras, deficit e cenario futuro apenas provavel.
- O Static Site `my-finance-web` no Render usa rewrite `/*` -> `/index.html` para suportar acesso direto as rotas da SPA sem 404.
- A feature `006-remover-estimativas-provaveis-da-projecao` atuara exclusivamente sobre itens `Provavel`, com escopo `Somente neste mes` ou `Neste e nos meses futuros`.
- Exclusoes de estimativas provaveis serao preferencias persistentes por usuario, aplicadas depois da deteccao de recorrencias, sem apagar transacoes nem alterar o historico usado pela heuristica.
- A restauracao de uma exclusao futura removera toda a regra desde seu mes inicial, mesmo quando acionada a partir de um mes posterior.
- O design da feature `006-remover-estimativas-provaveis-da-projecao` propoe uma tabela `projection_exclusions` com RLS, identidade por tipo + descricao normalizada e `month_start` combinado com escopo mensal ou futuro.
- As exclusoes da feature `006` deverao alimentar o mesmo `buildFinancialAnalysis` usado pela dashboard e pela pagina `Mensal`, evitando divergencia entre resumo, detalhe e indicadores.
- As mutacoes de exclusao e restauracao serao otimistas com rollback; a remocao tambem oferecera `Desfazer` sem expiracao automatica.
- As estimativas removidas da feature `006` ficarao recolhidas por padrao sob o controle `Ocultando X estimativa(s)`; a lista com restauracao sera exibida sob demanda e o estado aberto sera refletido na URL.
- O design da feature `006-remover-estimativas-provaveis-da-projecao` foi aprovado ao avancar para Tasks.
- A feature `006` possui 11 tarefas planejadas, 25 requisitos mapeados e gate final de migration/RLS, Vitest, lint, typecheck, build e Playwright.
- A feature `006-remover-estimativas-provaveis-da-projecao` foi implementada em 2026-06-12 com exclusoes persistentes, dialogo de escopo, painel recolhido, restauracao, `Desfazer`, URL `removed=expanded` e cobertura E2E dedicada.
- A feature `007-reclassificar-historico-e-refinar-match` foi planejada em 2026-06-12 para mover a reaplicacao de regras do frontend para uma operacao canonica no backend e adicionar filtros opcionais de `institution` e `account` ao match.

## Current Facts

- O frontend fica em `web/` e usa React 19, TypeScript 6, Vite 8 e Supabase JS.
- A aplicacao web esta dividida em componentes, hooks e bibliotecas puras; `App.tsx` permanece como composition root e roteador History API.
- O Supabase ativo possui `profiles`, `transactions`, `budget_groups` e `transaction_classification_rules`, alem de tres Edge Functions de importacao.
- O baseline verificado em 2026-06-12 e de 105 testes Vitest passando; a suite Playwright possui 32 testes e inclui o fluxo persistente de exclusoes de projecao.
- O build frontend atual passa, mas produz um chunk principal de 548,74 kB minificado e emite o warning de tamanho do Vite.
- O GitHub Actions versionado faz deploy do Supabase, mas ainda nao executa gates automatizados do frontend.
- Os extratores locais ficam em `tools/`.
- O schema real ja possui `budget_groups` e `transactions.budget_group_id` via migrations de 2026-06-09, mesmo que a documentacao anterior em `.specs/features/001-gerenciar-budget-groups/` ainda reflita um estado mais antigo.
- Os parsers ativos de cartao Santander e Nubank expandem compras parceladas em cronogramas mensais e usam `external_id` deterministico para idempotencia.
- A dashboard mantem o horizonte resumido de tres meses, enquanto a pagina `Mensal` expoe totais, agregados e itens registrados/provaveis para o mes atual e meses futuros.

## Blockers

- `npm run lint` global ainda falha em `web/src/hooks/useClassificationRuleManagement.ts` e `web/src/lib/santanderAccountParser.test.ts`, alteracoes paralelas fora da feature `006`.

## Paused Work

- Nenhum trabalho pausado registrado.

## Deferred Ideas

- Instalar skills complementares para exploracao de codigo e diagramas, se o fluxo passar a exigir isso.
- Formalizar testes automatizados para os scripts de extracao e para o frontend.
- Extrair um modulo Python compartilhado para enums e heuristicas financeiras quando a duplicacao justificar.
- Evoluir regras por usuario com filtros extras como `institution`, `account` ou `source` se o match por descricao se mostrar insuficiente.
- Avaliar filtro adicional por `source` ou match por tokens inteiros se `institution` e `account` ainda nao reduzirem colisao o bastante na feature `007`.

## Preferences

- Manter mudancas pequenas e focadas, especialmente em fluxos financeiros.
