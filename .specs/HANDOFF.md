# Handoff

**Date:** 2026-06-11T16:13:22-03:00
**Feature:** `006-remover-estimativas-provaveis-da-projecao`
**Task:** Design - pausado antes da aprovacao final

## Completed

- Especificacao criada com 25 requisitos para excluir somente estimativas `Provavel`.
- Design proposto com persistencia em `projection_exclusions`, RLS, filtro compartilhado pela dashboard e pagina `Mensal`, mutacoes otimistas, rollback, desfazer e restauracao.
- UX revisada para manter removidos recolhidos sob `Ocultando X estimativa(s)`, com detalhes sob demanda e estado `removed=expanded` na URL.
- Mapeamento brownfield dos sete documentos em `.specs/codebase/` atualizado para o codigo atual.
- Baseline verificado: 53 testes Vitest, lint, typecheck e build passando.

## In Progress

- Design em status `Draft`, aguardando revisao e aprovacao do usuario.
- Arquivo principal: `.specs/features/006-remover-estimativas-provaveis-da-projecao/design.md`.

## Pending

- Revisar e aprovar o design da feature 006.
- Alterar o design para `Approved`.
- Criar `tasks.md` com dependencias, rastreabilidade e gates.
- Implementar migration, calculos, hook, UI e testes.

## Blockers

- Nenhum bloqueio tecnico. Trabalho pausado por solicitacao do usuario.

## Context

- Branch: `main`, 11 commits a frente de `origin/main`.
- Uncommitted: feature 006, sete documentos de `.specs/codebase/`, `ROADMAP.md`, `STATE.md` e este handoff.
- Decisoes relacionadas: entradas da feature 006 em `.specs/project/STATE.md`.
