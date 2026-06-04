# Financas

## Vision

Centralizar o fluxo pessoal de importacao, classificacao e revisao financeira com apoio de automacoes locais, Notion e Supabase.

## Goals

- Extrair e normalizar faturas e extratos de bancos suportados.
- Revisar categorias e grupos 50-30-20 antes de enviar ou refletir dados no sistema principal.
- Manter uma interface web simples para leitura e edicao direta de transacoes no Supabase.
- Preservar o schema e as migrations do banco dentro do repositorio.

## Current Scope

- Extratores locais para Santander PDF e Nubank CSV.
- Fluxos legados de resumo mensal e painel arquivado.
- Frontend React + Vite conectado ao Supabase.
- Infraestrutura versionada do Supabase com migration inicial e seed.

## Constraints

- A soma extraida de uma fatura deve bater exatamente com o total da fatura antes de importar.
- O repositorio mistura fluxos ativos e fluxos arquivados, entao novas mudancas devem evitar reforcar caminhos legados.
- Dados financeiros exigem mudancas pequenas, verificaveis e reversiveis.

## Success Criteria

- Entradas de bancos suportados sao convertidas para formatos consistentes.
- A classificacao por categoria e grupo fica auditavel.
- O frontend consegue ler e atualizar transacoes do usuario autenticado.
- O schema do Supabase permanece reproduzivel via migration.
