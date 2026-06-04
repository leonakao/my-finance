# Tech Stack

**Analyzed:** 2026-06-03

## Core

- Repository shape: monorepo leve com scripts locais, frontend web e infraestrutura Supabase versionada.
- Primary languages: Python 3, JavaScript ESM, SQL.
- Package managers:
  - raiz: sem package manager central
  - `web/`: `npm` com `package-lock.json`
- Data storage:
  - arquivos locais em `inbox/` para entrada e artefatos
  - Postgres gerenciado pelo Supabase para o app atual

## Python Tooling

- Runtime: Python 3
- Dependency style: stdlib-first
- Libraries observadas:
  - `argparse`
  - `csv`
  - `json`
  - `dataclasses`
  - `decimal`
  - `pathlib`
  - `re`
  - `zlib`

## Frontend

- Framework: React `^19.2.6`
- Build tool: Vite `^8.0.12`
- Supabase client: `@supabase/supabase-js` `^2.107.0`
- Styling: CSS global simples em `web/src/index.css` e `web/src/App.css`
- State management: estado local com `useState` e efeitos com `useEffect`
- Routing: inexistente no momento
- Forms: HTML nativo controlado por React

## Quality / Dev Tooling

- Lint: ESLint `^10.3.0`
- React lint plugins:
  - `eslint-plugin-react-hooks` `^7.1.1`
  - `eslint-plugin-react-refresh` `^0.5.2`
- Frontend scripts:
  - `npm run dev`
  - `npm run build`
  - `npm run lint`
  - `npm run preview`

## Backend / Database

- Backend model: Supabase direto, sem backend customizado no repo
- Database: Postgres via Supabase
- Auth: Supabase Auth com magic link
- Authorization: RLS por `user_id`
- Schema management: SQL migration em `supabase/migrations/20260603223000_init.sql`
- Local infra config: `supabase/config.toml`

## External Integrations

- Banking inputs:
  - Santander PDF invoice
  - Nubank card CSV
  - Nubank account CSV
- Productivity / archive:
  - Notion
- BaaS:
  - Supabase

## Testing Posture

- Frontend: lint e build disponiveis
- Python scripts: validacao operacional por amostras e totais, sem suite documentada
- Database: validacao esperada via migration + comportamento RLS
