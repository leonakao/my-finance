# Reclassificar Historico E Refinar Match Context

**Gathered:** 2026-06-12
**Spec:** `.specs/features/007-reclassificar-historico-e-refinar-match/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Esta feature melhora a feature `002-regras-classificacao-por-usuario` em dois pontos: a reaplicacao de regras passa a agir sobre o historico persistido inteiro do usuario, e o criterio de enquadramento da regra ganha filtros extras de contexto para reduzir falsos positivos.

## Implementation Decisions

### Reaplicacao historica

- A reaplicacao continuara sendo uma acao explicita do usuario apos criar ou editar uma regra.
- A execucao deixara de ocorrer no frontend sobre o estado local e passara a acontecer no backend, com retorno de contagem de linhas afetadas.
- O boundary de negocio da reaplicacao historica sera uma Edge Function, nao uma RPC SQL como ponto principal de orquestracao.
- A Edge Function nao deve carregar o historico inteiro do usuario; ela deve empurrar o maximo do filtro para o banco e preferir update em lote direto.
- Depois de sucesso, o frontend recarregara os dados canonicos antes de exibir o feedback final.

### Refinamento de match

- O match por descricao normalizada continua sendo o eixo principal de compatibilidade com a feature `002`.
- O modo `description_amount` continua exigindo valor exato.
- A primeira versao do refinamento adiciona filtros opcionais de `institution` e `account` com igualdade exata.
- Regras sem filtros extras continuam validas para preservar compatibilidade com regras ja existentes.

### Transparencia na UI

- O prompt de reaplicacao deve deixar claro que a operacao atuara sobre o banco inteiro do usuario.
- A listagem de regras deve mostrar quais filtros extras fazem parte do enquadramento.

### Agent's Discretion

- A forma preferida e a Edge Function disparar update em lote direto com filtro suficiente no banco para atingir apenas as transacoes elegiveis.
- A forma alternativa aceitavel e a Edge Function buscar apenas um conjunto pequeno de candidatas ja prefiltradas pelo banco e usar TypeScript apenas para refinamento final, nunca para varrer o historico inteiro do usuario.
- O campo `source` fica deliberadamente fora do MVP desta feature; se `institution` e `account` nao forem suficientes, ele volta como proxima extensao.

## Specific References

- O problema atual esta concentrado em `web/src/hooks/useClassificationRuleManagement.ts`, onde `reclassifyExistingTransactions()` deriva os candidatos do array `transactions` e atualiza linha a linha.
- A semantica atual de match esta duplicada entre `web/src/lib/transactions.ts` e `supabase/functions/_shared/classification-rules.ts`.
- A nova implementacao nao deve repetir o erro do frontend em outra camada, isto e, substituir o array local por um `select *` do historico inteiro no servidor.
- A ideia de filtros extras para `institution`, `account` ou `source` ja aparecia como ideia adiada em `.specs/project/STATE.md`.

## Deferred Ideas

- Adicionar filtro opcional por `source` se ainda houver colisao relevante entre instituicoes/contas.
- Revisar se vale exigir match por tokens inteiros em vez de substring simples numa etapa posterior.
