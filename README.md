# Finanças

Este projeto guarda o fluxo local de apoio para a database `Finanças` no Notion.

Database no Notion: https://app.notion.com/p/16f280b0eba649e1802dbce74a559e1c

Resumo mensal no Notion: https://app.notion.com/p/be207194f67240b4b89693508daa7916

## Faturas Santander

Fluxo recomendado:

1. Coloque o PDF da fatura em `inbox/`.
2. Rode o extrator:

```sh
python3 tools/extract_santander_fatura.py inbox/fatura.pdf \
  --json-out inbox/fatura.santander.json \
  --csv-out inbox/fatura.santander.csv
```

3. Confira a saída do comando:

```text
transactions: 61
total: R$ 8.831,85
```

4. Compare o `total` com o total da fatura.
5. Revise categorias e descrições no JSON ou CSV quando necessário.
6. Peça para importar o JSON revisado para o Notion.

Regra importante: se a soma extraída não bater exatamente com o total da fatura,
não importar. Primeiro revisar o PDF/JSON e ajustar o parser ou as regras.

## CSVs Nubank

Para fatura do cartão Nubank:

```sh
python3 tools/extract_nubank_csv.py inbox/nubank-cartao.csv \
  --kind card \
  --invoice "Nubank cartão - referência" \
  --json-out inbox/nubank-cartao.json \
  --csv-out inbox/nubank-cartao.normalized.csv
```

Para extrato da conta Nubank:

```sh
python3 tools/extract_nubank_csv.py inbox/nubank-conta.csv \
  --kind account \
  --json-out inbox/nubank-conta.json \
  --csv-out inbox/nubank-conta.normalized.csv
```

O extrator Nubank normaliza os campos para o Notion e tenta evitar duplicidade:

- pagamento recebido no cartão fica como `Status = Ignorar`;
- estornos/devoluções de IOF ficam como `Status = Ignorar`;
- pagamento de fatura na conta fica como `Tipo = Transferência`;
- aplicações/resgates RDB ficam como `Tipo = Transferência`;
- transferências para/de conta própria ficam como `Tipo = Transferência`.
- transferências recebidas de terceiros ficam como `Tipo = Receita`.

## Regra 50-30-20

Base atual: salário de `R$ 13.410,62`.

- `50 Necessidades`: até `R$ 6.705,31`.
- `30 Desejos`: até `R$ 4.023,19`.
- `20 Futuro`: pelo menos `R$ 2.682,12`.

Classificação inicial:

- `50 Necessidades`: saúde, seguros essenciais, internet/serviços básicos, telefone/C6, mercado, carne, supermercado, combustível, pedágio e transporte necessário.
- `30 Desejos`: restaurantes, cafés, bares, delivery, lazer, compras online, assinaturas, apps e viagens opcionais.
- `20 Futuro`: aplicações, investimentos, Avenue, Banco Inter e aportes.
- `Receita`: salário e entradas que compõem renda mensal.
- `Transferência`: movimentação entre contas próprias, pagamento de fatura e resgates que não são gasto.
- `Ignorar`: estornos, créditos técnicos e pagamentos recebidos no cartão.

## Resumo mensal

Para gerar a visão agregada por mês, categoria e grupo 50-30-20:

```sh
python3 tools/build_monthly_summary.py \
  inbox/santander-2026-06.json \
  inbox/nubank-conta-2026-05.json \
  inbox/nubank-cartao-2026-06-09.json \
  --json-out inbox/resumo-mensal.json \
  --csv-out inbox/resumo-mensal.csv
```

O resumo calcula:

- soma de `Valor` por mês, categoria e grupo 50-30-20;
- `Receita do mês` usando linhas classificadas como `Receita`;
- `% da receita` como `Valor / Receita do mês * 100`;
- quantidade de transações incluídas em cada linha.

Linhas com `Status = Ignorar` são descartadas. Transferências comuns também
ficam fora do resumo, exceto quando classificadas em `20 Futuro` ou `Receita`.

## Arquivos

- `tools/extract_santander_fatura.py`: extrai lançamentos de PDFs de fatura Santander.
- `tools/extract_nubank_csv.py`: normaliza CSVs de conta e cartão Nubank.
- `tools/build_monthly_summary.py`: gera o resumo mensal para o banco `Resumo Mensal`.
- `notion-finance.md`: guarda IDs da database e data source do Notion.
- `inbox/`: entrada para PDFs e arquivos extraídos.

## Campos usados no Notion

- `Descrição`
- `Data`
- `Valor`
- `Tipo`
- `Categoria`
- `Conta`
- `Status`
- `Origem`
- `Fatura`
- `Parcela`
- `Instituição`
- `ID Externo`
- `Grupo 50-30-20`
- `Observações`
