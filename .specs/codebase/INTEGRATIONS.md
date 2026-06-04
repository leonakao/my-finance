# Integrations

## Banking Inputs

### Santander invoice PDF

- entrada: PDF de fatura em `inbox/`
- processamento: `tools/extract_santander_fatura.py`
- saida: JSON principal e CSV opcional
- risco principal: parsing heuristico de PDF e classificacao por descricao

### Nubank card/account CSV

- entrada: CSV de fatura ou conta
- processamento: `tools/extract_nubank_csv.py`
- saida: JSON principal e CSV opcional
- risco principal: regras de tipo/categoria/grupo espalhadas por heuristica textual

## Notion

- usado como apoio operacional e historico
- o README referencia paginas e bases externas
- padrao recomendado: tratar Notion como consumidor operacional, nao como origem canonica de regras

## Supabase

### Auth

- magic link via `supabase.auth.signInWithOtp`
- sessao observada e atualizada com `onAuthStateChange`

### Database

- tabela principal: `public.transactions`
- tabela de perfil: `public.profiles`
- acesso restrito por `auth.uid() = user_id`

### Frontend contract

- variaveis esperadas:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- campos usados hoje no app:
  - `id`
  - `date`
  - `description`
  - `amount`
  - `type`
  - `category`
  - `budget_group`
  - `account`
  - `institution`
  - `status`
  - `notes`
  - `observations`

## Integration Standards

- toda integracao externa deve ter funcao clara de normalizacao antes de entrar no fluxo principal
- toda mudanca de contrato com Supabase deve atualizar migration, frontend e documentacao juntos
- toda regra de importacao bancaria deve continuar auditavel por arquivo de origem
