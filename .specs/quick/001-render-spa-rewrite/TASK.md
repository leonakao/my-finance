# Quick Task 001: Corrigir acesso direto as rotas da SPA no Render

**Date:** 2026-06-11
**Status:** Done

## Description

Adicionar ao Static Site `my-finance-web` uma rewrite de `/*` para `/index.html` para impedir 404 ao acessar diretamente rotas como `/app/dashboard`.

## Files Changed

- `.specs/quick/001-render-spa-rewrite/TASK.md` - registra escopo e verificacao.
- `.specs/quick/001-render-spa-rewrite/SUMMARY.md` - registra a alteracao aplicada no Render.
- `.specs/project/STATE.md` - preserva a decisao operacional.

## Verification

- [x] A API do Render lista a rewrite `/*` para `/index.html`.
- [x] `https://my-finance-web-sski.onrender.com/app/dashboard` responde HTTP 200 com HTML.

## Commit

`docs(render): record SPA rewrite fix`
