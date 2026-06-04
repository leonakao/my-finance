# STATE

## Decisions

- A skill `tlc-spec-driven` foi instalada em `~/.codex/skills/tlc-spec-driven` em 2026-06-03.
- Este repositorio passara a usar `.specs/` como memoria persistente para planejamento e execucao.
- Nao mexer automaticamente em fluxos marcados como arquivados sem uma solicitacao explicita.
- O codebase foi mapeado com base em `tools/`, `web/` e `supabase/` em 2026-06-03.
- Regras de negocio financeiras devem permanecer no pipeline de ingestao Python e/ou no schema do Supabase, nao na UI.
- Mudancas em `type`, `category`, `budget_group` e `status` devem ser coordenadas entre SQL, Python, frontend e documentacao.
- `App.jsx` pode permanecer central enquanto houver uma unica tela simples; novas responsabilidades relevantes devem disparar modularizacao.

## Current Facts

- O repositorio possui alteracoes locais em `README.md`, `.gitignore` e a arvore `supabase/`.
- O frontend fica em `web/` e usa React + Vite + Supabase JS.
- Os extratores locais ficam em `tools/`.

## Blockers

- Nenhum bloqueio registrado.

## Deferred Ideas

- Instalar skills complementares para exploracao de codigo e diagramas, se o fluxo passar a exigir isso.
- Formalizar testes automatizados para os scripts de extracao e para o frontend.
- Extrair um modulo Python compartilhado para enums e heuristicas financeiras quando a duplicacao justificar.

## Preferences

- Manter mudancas pequenas e focadas, especialmente em fluxos financeiros.
