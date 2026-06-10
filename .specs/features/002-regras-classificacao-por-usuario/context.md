# Regras De Classificacao Por Usuario Context

## Source Decision

Contexto capturado a partir do pedido de 2026-06-09.

## Confirmed Product Decisions

- Devemos manter algumas regras base globais no pipeline de importacao.
- Regras do usuario sempre tem prioridade sobre regras base globais quando houver conflito.
- O que nao se encaixar nas regras base deve entrar como `Outros`.
- Quando o usuario editar uma transacao, o sistema deve perguntar se deseja lembrar aquela classificacao.
- O usuario deve poder lembrar pelo nome ou pelo nome + valor.
- Importacoes futuras devem passar por uma etapa que valida se a transacao se encaixa em alguma classificacao do usuario.
- O usuario deve conseguir gerenciar as regras em uma pagina separada, incluindo adicionar, editar e excluir.
- A edicao de transacao deve acontecer em modal com submit unico, e a regra aprendida deve salvar o conjunto completo da classificacao.
- Campos usados na chave deterministica de importacao nao devem ser editaveis para nao quebrar `external_id` e a idempotencia de reimportacao.
- Regras por `nome` e `nome + valor` usarao comparacao parcial sobre descricao normalizada; no modo `nome + valor`, o valor continua exato.
- Quando duas regras do mesmo modo combinarem, a descricao normalizada mais especifica, isto e, mais longa, deve vencer.

## Planning Assumptions Adopted

- A regra aprendida vai persistir o snapshot final da classificacao da transacao no momento do aceite do usuario, incluindo apenas `type`, `category` e `budget_group_id`.
- A ordem de execucao sera: parse -> heuristica base -> fallback `Outros` -> override por regra do usuario -> upsert em `transactions`.
- A primeira versao vai usar comparacao parcial sobre descricao normalizada e valor exato para regras `nome + valor`, sem regex ou fuzzy matching.
- O fluxo de aprendizado sera acionado a partir do salvamento do modal quando houver mudanca no conjunto de classificacao, nao em edicoes isoladas de campos neutros como `notes`.
- Para transacoes importadas, assumir `date`, `description` e `amount` como somente leitura, pois hoje entram na composicao de `external_id` em parte dos imports.
- A feature sera planejada sobre o fluxo ativo em `supabase/functions/` e `web/`, sem expandir o escopo para scripts legados em `tools/`.

## Open Questions Left Intentionally Deferred

- Se deveremos adicionar filtros extras ao match por usuario, como `institution`, `account` ou `source`.
- Se regras do usuario criadas a partir de categorias antigas devem ser invalidadas quando a taxonomia mudar.
