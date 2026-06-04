# Code Conventions

**Analyzed from:** `tools/*.py`, `web/src/App.jsx`, `web/src/lib/supabase.js`, `supabase/migrations/*.sql`

## Naming Conventions

### Files

- Python scripts: `snake_case.py`
- React entry/components: `PascalCase` para componente-raiz (`App.jsx`) e `camelCase` para utilitarios (`supabase.js`)
- SQL migrations: timestamp prefix + snake case

**Examples:**

- `extract_santander_fatura.py`
- `build_monthly_dashboard.py`
- `App.jsx`
- `20260603223000_init.sql`

### Functions

- Python: `snake_case`
- React helpers and handlers: `camelCase`
- Event handlers no frontend: prefixo `handle`

**Examples:**

- `extract_text_events`
- `budget_group_for`
- `normalizeTransaction`
- `buildMonthData`
- `handleSignIn`
- `handleUpdate`

### Variables

- Python local vars: `snake_case`
- JS local vars/state: `camelCase`
- Maps e collections recebem nomes descritivos do dominio

**Examples:**

- Python: `closing_month`, `statement_year`, `grouped_amounts`
- JS: `selectedMonth`, `monthMap`, `monthTransactions`

### Constants

- Python constants: `UPPER_SNAKE_CASE`
- JS constants: `UPPER_SNAKE_CASE`

**Examples:**

- `DATE_RE`
- `MONEY_RE`
- `SPENDING_GROUPS`
- `GROUP_LABELS`
- `GROUP_TARGETS`
- `CATEGORY_OPTIONS`

## Code Organization

### Python file shape

Padrao atual observado:

1. imports
2. constants / regex
3. dataclasses
4. pure helper functions
5. pipeline functions
6. `write_*`
7. `main()`
8. `if __name__ == "__main__"`

Esse padrao deve continuar.

### React file shape

Padrao atual observado em `App.jsx`:

1. imports
2. constants
3. formatters / normalizers
4. pequenos componentes de apresentacao
5. componente container `App`

Esse formato funciona no tamanho atual, mas com um limite:

- ate 1 tela simples, pode ficar em um arquivo
- ao introduzir nova view, filtro complexo ou mais de 3 componentes stateful, separar em modulos

### SQL file shape

- criar extensoes e funcoes primeiro
- depois tabelas
- depois indices e triggers
- por fim RLS e policies

Esse fluxo esta correto e deve ser mantido.

## Type Safety And Data Contracts

### Python

- usar `@dataclass(frozen=True)` para registros transportados entre etapas
- usar `Decimal` para valores monetarios
- usar `Path` para caminhos de arquivo
- funcoes devem declarar tipos de entrada e saida

### Frontend

- como o projeto esta em JS, todo payload externo deve passar por normalizacao explicita
- `normalizeTransaction` e o padrao correto
- qualquer novo recurso que leia Supabase deve ter funcao equivalente de normalizacao

### Database

- o schema deve continuar codificando enumeracoes e checks de integridade
- evitar deixar validacoes criticas apenas na UI

## Error Handling

### Current pattern

- scripts falham naturalmente por excecao quando entrada invalida quebra contrato
- frontend captura erros assinc nos fluxos de auth e query e projeta a mensagem em `error`

### Standard to follow

- scripts Python:
  - validar pre-condicoes de entrada que sejam previsiveis
  - falhar cedo com mensagem objetiva quando a entrada nao cumpre o contrato
  - nao engolir excecoes silenciosamente, exceto em parsing oportunista e isolado
- frontend:
  - tratar cada chamada Supabase com ramo de erro explicito
  - nao atualizar estado otimista sem caminho claro de rollback

## Comments And Documentation

### Current pattern

- comentarios sao raros e usados quando a logica fica menos obvia
- docstrings curtas explicam o objetivo do script

### Standard to follow

- manter comentarios raros e utilitarios
- comentar heuristicas financeiras nao obvias e regras que parecem arbitrarias
- documentar no README ou `.specs/` qualquer regra de classificacao que afete multiplos fluxos

## Project Standards We Should Enforce

### Money handling

- nunca usar `float` em Python para valores monetarios
- no frontend, converter para `Number` apenas para exibicao e agregacao visual
- o valor persistido e transportado deve continuar saindo de fonte decimal ou numeric

### Domain vocabulary

- tratar `type`, `category`, `budget_group` e `status` como enums de dominio
- antes de criar novo valor, atualizar migration/schema, UI e documentacao juntos

### Modularity threshold

- Python: se duas regras de classificacao forem compartilhadas, extrair modulo comum em `tools/`
- React: se `App.jsx` passar a acumular novas responsabilidades, quebrar em:
  - `components/`
  - `lib/`
  - `hooks/`
  - `constants/`
