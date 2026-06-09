# Testing

**Analyzed:** 2026-06-03

## Current State

### Python tools

- nao ha suite automatizada documentada
- a validacao hoje e operacional:
  - conferir quantidade de transacoes
  - conferir total agregado
  - revisar classificacoes e descricoes

### Frontend

- `web/package.json` expoe:
  - `npm run lint`
  - `npm run build`
- nao ha testes unitarios ou e2e configurados

### Database

- a integridade principal hoje vem de:
  - constraints SQL
  - indices
  - triggers
  - RLS

### Supabase Edge Functions

- nao havia check dedicado documentado para `supabase/functions/`
- o check operacional minimo passa a ser:
  - subir a stack local com `supabase start`
  - rodar `sh tools/check_supabase_functions.sh`

## Test Strategy We Should Follow

### Minimum gate for Python changes

- rodar o script alterado com uma amostra conhecida
- conferir totais e contagens no stdout
- validar um trecho do JSON gerado quando a logica de parse/classificacao mudar

### Minimum gate for frontend changes

- rodar `npm run lint` em `web/`
- rodar `npm run build` em `web/` quando houver alteracao de UI, estado ou integracao Supabase
- validar manualmente auth, carregamento e atualizacao de categoria/grupo quando o fluxo for tocado

### Minimum gate for Supabase changes

- revisar migration para compatibilidade com dados existentes
- validar impacto em `transactions` e policies de RLS
- manter enum/checks sincronizados com o frontend
- quando houver alteracao em `supabase/functions/`, rodar `sh tools/check_supabase_functions.sh`

## Standards To Adopt

### Short term

- criar fixtures pequenas e anonimizadas para os scripts Python
- introduzir testes unitarios para helpers puros de classificacao e agregacao
- registrar comandos de verificacao em cada feature ou quick task relevante

### Medium term

- adicionar testes de integracao para os pipelines principais de `tools/`
- adicionar pelo menos um smoke test do frontend para login/configuracao basica

## Non-Negotiable Rules

- toda mudanca em regra monetaria deve ser verificada com amostra real ou fixture representativa
- toda mudanca em enum de dominio deve ser validada no banco e na UI
- nunca considerar parser concluido sem reconciliar total com a origem quando esse fluxo exigir reconciliacao
