# Concerns

## Highest-Risk Areas

### 1. Classification logic duplication

- regras de `category`, `type` e `budget_group` estao distribuidas em mais de um script
- isso aumenta risco de divergencia semantica entre fontes

**Required standard:** quando houver segunda ocorrencia relevante da mesma heuristica, extrair modulo compartilhado em Python.

### 2. Monolithic frontend container

- `web/src/App.jsx` concentra auth, data loading, aggregation, mutation e rendering
- ainda e aceitavel no tamanho atual, mas o crescimento vai tornar a tela fragil

**Required standard:** ao adicionar nova area funcional ou mais de um fluxo assinc extra, separar `App.jsx` em modulos.

### 3. Client-side aggregation as scaling bottleneck

- o app carrega transacoes e agrega tudo no cliente
- isso simplifica o stack agora, mas cresce mal com mais dados, mais filtros e mais usuarios

**Required standard:** manter agregacao no cliente apenas enquanto o volume e a UX seguirem simples.

### 4. Incomplete automated testing

- regras financeiras e parsers trabalham com dados sensiveis, mas quase toda verificacao ainda e manual

**Required standard:** toda mudanca relevante em parser, classificacao ou agregacao precisa de fixture ou amostra conhecida.

### 5. Enum drift between code and database

- categorias e grupos existem em:
  - migrations SQL
  - frontend constants
  - heuristicas Python

**Required standard:** toda alteracao nesses conjuntos deve ser feita como mudanca coordenada de dominio.

## Architectural Guardrails

- nao mover regras financeiras sensiveis para CSS/UI ou para estados ad hoc do React
- nao introduzir backend customizado sem uma necessidade concreta que o Supabase nao cubra
- nao misturar artefatos gerados em `inbox/` com codigo versionado

## Recommended Next Improvements

1. Extrair um modulo Python compartilhado para enums e heuristicas financeiras.
2. Quebrar `App.jsx` quando a proxima feature relevante entrar.
3. Criar fixtures anonimizadas para Santander e Nubank.
4. Adicionar pelo menos um checklist de verificacao por fluxo na `.specs/`.
