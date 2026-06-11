# Roadmap

## Active Areas

### 1. Ingestion reliability

- Manter e ajustar os extratores de Santander e Nubank.
- Melhorar validacoes para impedir importacoes com totais inconsistentes.
- Expandir compras parceladas em transacoes mensais idempotentes no fluxo ativo de importacao.

### 2. Classification workflow

- Refinar regras de categoria, `budget_group`, `status` e transferencias.
- Reduzir retrabalho manual na revisao antes de enviar ao destino final.
- Introduzir regras de classificacao por usuario com aprendizado a partir de edicoes manuais.

### 3. Supabase application

- Evoluir o app web para leitura e edicao de transacoes com seguranca.
- Consolidar o schema e o fluxo de deploy do Supabase.

## Near-Term Backlog

- Mapear formalmente o codebase legado e atual na pasta `.specs/codebase/`.
- Definir prioridades entre fluxo Notion legado e fluxo Supabase atual.
- Documentar comandos de validacao e testes usados em cada area.
- Planejar e implementar a feature `003-importar-parcelas-por-mes` na worktree dedicada.
- Especificar a feature `005-detalhar-projecoes-na-analise-mensal` para aprofundar a leitura de projecoes na tela `Mensal`.

## Open Product Decisions

- Se o Notion continuara como destino principal ou apenas como arquivo/historico.
- Quais bancos e formatos de entrada merecem suporte de primeira classe.
- Quais metricas do painel web sao realmente canonicas.
