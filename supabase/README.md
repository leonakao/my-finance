# Supabase

Este diretório contém a infraestrutura versionada do projeto Supabase:

- `config.toml`: configuração local do CLI e serviços
- `migrations/`: migrations SQL versionadas
- `seed.sql`: seed opcional para ambiente local

Fluxo esperado:

1. `supabase link --project-ref <project-ref>`
2. `supabase db push` para aplicar migrations
3. conectar o repositório no dashboard do Supabase com `Working directory = .`
