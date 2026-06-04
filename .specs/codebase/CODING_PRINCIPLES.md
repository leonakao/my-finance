# Coding Principles

## Purpose

Estes principios complementam as convencoes observadas no repo. Eles sao prescritivos e devem orientar novas mudancas.

## 1. Preserve domain truth

- Regras de dinheiro, categoria e grupo nao podem nascer soltas na UI.
- Se uma regra afeta o significado do dado, ela deve existir no pipeline de ingestao ou no schema.

## 2. Prefer explicit normalization

- Toda entrada externa deve passar por uma etapa visivel de normalizacao.
- Nao propagar payload bruto de CSV, PDF parseado ou Supabase diretamente pela aplicacao.

## 3. Keep financial code auditable

- Funcoes de classificacao devem ser deterministicas e pequenas.
- Totais e contagens devem ser reproduziveis a partir do artefato de origem.
- Mudancas em parser devem ser verificadas contra exemplos reais ou fixtures.

## 4. Use the lightest architecture that still holds

- O projeto nao precisa de abstrações extras antes de o volume justificar.
- Separar modulos quando houver nova responsabilidade, nao por antecipacao.

## 5. Coordinate domain changes across layers

- Mudou enum de categoria, grupo, status ou tipo:
  - atualizar SQL
  - atualizar scripts Python
  - atualizar frontend
  - atualizar docs

## 6. Favor pure functions around business rules

- Parse, classificacao, agregacao e formatacao devem ficar em funcoes puras sempre que possivel.
- I/O deve ficar nas bordas: CLI, leitura/escrita de arquivo, chamadas Supabase.

## 7. Fail early on broken contracts

- Se a entrada nao respeita o formato esperado, falhar com mensagem clara.
- Nao mascarar erros de integridade em fluxos financeiros.
