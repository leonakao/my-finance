# Architecture

**Pattern:** modular por area, com separacao clara entre ingestao local, leitura/edicao web e infraestrutura de dados.

## High-Level Structure

```text
bank files / PDFs / CSVs
        |
        v
tools/*.py
  - extracao
  - normalizacao
  - agregacao
        |
        +--> JSON / CSV em inbox/
        |
        +--> revisao manual / importacao

web/ React app
        |
        v
Supabase JS client
        |
        v
public.transactions + public.profiles
        |
        v
RLS garante isolamento por usuario
```

## Architectural Modules

### 1. Local ingestion pipeline

**Location:** `tools/`

**Purpose:** transformar arquivos brutos em estruturas normalizadas e auditaveis.

**Implementation pattern:**

- cada script tem CLI propria via `argparse`
- parseia entrada para dataclasses imutaveis
- escreve JSON como payload principal
- opcionalmente escreve CSV derivado
- imprime um resumo operacional no stdout

**Examples:**

- `tools/extract_santander_fatura.py`
- `tools/extract_nubank_csv.py`
- `tools/build_monthly_summary.py`
- `tools/build_monthly_dashboard.py`

### 2. Thin client web over Supabase

**Location:** `web/src/`

**Purpose:** autenticar o usuario, ler `transactions`, calcular agregados no cliente e permitir recategorizacao leve.

**Implementation pattern:**

- `web/src/lib/supabase.js` encapsula a criacao do client
- `web/src/App.jsx` concentra autenticacao, query, transformacao e renderizacao
- componentes internos no mesmo arquivo dividem a UI por secao
- agregacoes mensais sao calculadas no cliente a partir da lista completa carregada

**Boundary rule:** o frontend atual e um cliente direto do banco, nao uma camada de dominio completa.

### 3. Database as policy boundary

**Location:** `supabase/`

**Purpose:** centralizar o schema canonico e as regras de acesso.

**Implementation pattern:**

- migration inicial cria tabelas, triggers, indices e policies
- `transactions.user_id` e o eixo de isolamento
- checks no schema restringem valores de `type`, `category`, `budget_group` e `status`
- triggers padronizam `updated_at`

## Data Flows

### Financial ingestion flow

1. arquivo bruto entra em `inbox/`
2. script de `tools/` extrai ou normaliza os dados
3. script gera JSON estruturado e, opcionalmente, CSV
4. operador revisa totais, categorias e grupos
5. dados seguem para o destino operacional

### Dashboard flow

1. usuario faz login por magic link
2. app obtem sessao via Supabase Auth
3. app consulta `transactions`
4. `normalizeTransaction` converte payload do banco para shape da UI
5. `buildMonthData` agrega receita, grupos e categorias por mes
6. UI renderiza resumo e tabela editavel
7. alteracoes de categoria/grupo executam `update` direto em `transactions`

## Organization Pattern

**Current approach:** separacao por runtime e responsabilidade.

- `tools/`: automacao batch, sem dependencia do app web
- `web/`: experiencia interativa de leitura e edicao
- `supabase/`: contrato persistente de dados

Isso e bom para o tamanho atual do projeto. O que falta nao e uma nova arquitetura, e sim endurecer as fronteiras.

## Standards To Follow

### Keep business rules canonical in one place per runtime

- Regras de classificacao financeira hoje aparecem em mais de um script.
- Regra futura: dentro de Python, extrair heuristicas compartilhadas para um modulo comum quando duas ou mais ferramentas precisarem da mesma logica.
- Regra futura: no frontend, tratar a tabela `transactions` como fonte de verdade e evitar recodificar regras de negocio que pertencem ao pipeline de ingestao.

### Preserve the three-layer boundary

- `tools/` nao deve depender do frontend.
- `web/` nao deve importar arquivos operacionais de `inbox/`.
- `supabase/` deve continuar sendo o unico lugar do schema canonico.

### Prefer compute-near-source for stable rules

- classificacao e normalizacao pertencem ao pipeline de ingestao
- validacao de acesso e enumeracoes pertencem ao banco
- agregacoes de apresentacao podem ficar no cliente enquanto o volume for pequeno

### Promote server-side aggregation only when needed

- enquanto o volume de transacoes for baixo/moderado, `buildMonthData` no cliente e aceitavel
- se a tabela crescer ou o app ganhar mais visoes, mover agregacoes para view SQL, RPC ou camada backend dedicada
