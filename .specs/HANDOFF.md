# Handoff

**Date:** 2026-06-11T16:13:22-03:00
**Feature:** `006-remover-estimativas-provaveis-da-projecao`
**Task:** Tasks - planejamento concluido, pronto para Execute

## Completed

- Especificacao criada com 25 requisitos para excluir somente estimativas `Provavel`.
- Design aprovado com persistencia em `projection_exclusions`, RLS, filtro compartilhado pela dashboard e pagina `Mensal`, mutacoes otimistas, rollback, desfazer e restauracao.
- UX revisada para manter removidos recolhidos sob `Ocultando X estimativa(s)`, com detalhes sob demanda e estado `removed=expanded` na URL.
- Mapeamento brownfield dos sete documentos em `.specs/codebase/` atualizado para o codigo atual.
- Baseline verificado: 53 testes Vitest, lint, typecheck e build passando.
- `tasks.md` criado com 11 tarefas, dependencias, commits, gates e cobertura 25/25.

## In Progress

- Planejamento concluido; nenhuma implementacao da feature 006 iniciada.
- Proxima tarefa: T1, contrato persistente de exclusoes.

## Pending

- Executar T1 e validar migration, constraints e RLS no Supabase local.
- Seguir as fases e commits definidos em `tasks.md`.

## Blockers

- Nenhum bloqueio tecnico.

## Context

- Branch: `main`, 11 commits a frente de `origin/main`.
- Uncommitted: planejamento da feature 006 e alteracoes locais do usuario em categorias, parsers, migration, `App.css` e `ImportPanel.tsx`; nao reverter esse trabalho paralelo.
- Decisoes relacionadas: entradas da feature 006 em `.specs/project/STATE.md`.
