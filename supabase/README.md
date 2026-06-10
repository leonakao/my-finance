# Supabase

Este diretório contém a infraestrutura versionada do projeto Supabase:

- `config.toml`: configuração local do CLI e serviços
- `migrations/`: migrations SQL versionadas
- `seed.sql`: seed opcional para ambiente local

Fluxo esperado:

1. `supabase link --project-ref <project-ref>`
2. `supabase db push` para aplicar migrations
3. conectar o repositório no dashboard do Supabase com `Working directory = .`

## Automacao via GitHub Actions

O repositório agora inclui `.github/workflows/supabase-deploy.yml`.

Na `main`, ele faz:

1. aplicar migrations com `supabase db push`
2. deployar as Edge Functions `import-nubank-csv` e `import-santander-pdf`

Secrets esperados no GitHub:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
