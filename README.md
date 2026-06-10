# Finanças

Este projeto guarda o fluxo local de apoio do sistema financeiro no Notion.

Bastidores financeiros no Notion: https://app.notion.com/p/374a750128c0818eaaf5dbd63cf9e32d
Revisão de categorias no Notion: https://app.notion.com/p/374a750128c081808094f50401c8f0a0
Arquivo financeiro no Notion: https://app.notion.com/p/374a750128c08111bb3fde54f2677d62

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

- `Necessidades`: até `R$ 6.705,31`.
- `Desejos`: até `R$ 4.023,19`.
- `Futuro`: pelo menos `R$ 2.682,12`.

Classificação inicial:

- `Necessidades`: saúde, seguros essenciais, internet/serviços básicos, VERO, OpenAI/ChatGPT, Windsurf, anuidade, telefone/C6, mercado, carne, supermercado, combustível, pedágio e transporte necessário.
- `Desejos`: restaurantes, cafés, bares, delivery, lazer, compras online, assinaturas, apps e viagens opcionais.
- `Futuro`: aplicações, investimentos, Avenue, Banco Inter e aportes.
- `Receita`: salário e entradas que compõem renda mensal.
- `Transferência`: movimentação entre contas próprias, pagamento de fatura e resgates que não são gasto.
- `Ignorar`: estornos, créditos técnicos e pagamentos recebidos no cartão.

## Resumo mensal legado

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
ficam fora do resumo, exceto quando classificadas em `Futuro` ou `Receita`.

Esse fluxo antigo foi arquivado no Notion e não deve mais ser usado como
visualização principal.

## Painel financeiro arquivado

Para gerar a camada mais legível do Notion, separada entre resumo de grupos e
detalhamento por categoria:

```sh
python3 tools/build_monthly_dashboard.py \
  inbox/santander-2026-06.json \
  inbox/nubank-conta-2026-05.json \
  inbox/nubank-cartao-2026-06-09.json \
  --json-out inbox/painel-mensal.json \
  --groups-csv-out inbox/painel-grupos.csv \
  --categories-csv-out inbox/painel-categorias.csv
```

Saídas:

- `painel-grupos.csv`: uma linha por mês e grupo 50-30-20.
- `painel-categorias.csv`: uma linha por mês, grupo e categoria.
- `painel-mensal.json`: payload consolidado com as duas camadas.

Esse fluxo foi arquivado. Ele não é mais o caminho principal de leitura nem de
revisão.

## Revisão de categorias

Quando a dúvida for "o painel está certo?" ou "por que desejos está alto?",
usar a página `Revisão de Categorias`. Ela lê diretamente do banco `Finanças`
e reflete recategorizações na hora.

## Arquivos

- `tools/extract_santander_fatura.py`: extrai lançamentos de PDFs de fatura Santander.
- `tools/extract_nubank_csv.py`: normaliza CSVs de conta e cartão Nubank.
- `tools/build_monthly_summary.py`: gera o resumo mensal legado arquivado no Notion.
- `tools/build_monthly_dashboard.py`: gera o painel limpo para os bancos `Resumo 50-30-20` e `Categorias Mensais`.
- `web/`: frontend Vite + React conectado diretamente ao Supabase.
- `notion-finance.md`: guarda IDs da database e data source do Notion.
- `inbox/`: entrada para PDFs e arquivos extraídos.

## Frontend Supabase

O app em `web/` usa:

- Vite + React
- `@supabase/supabase-js`
- autenticação por magic link
- leitura direta das tabelas `transactions` e `budget_groups`
- atualização direta de `category` e `budget_group_id`

Configuração:

```sh
cd web
cp .env.example .env.local
```

Preencha:

```sh
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Ou use os atalhos versionados para alternar entre Supabase local e remoto:

```sh
npm run env:local
```

```sh
npm run env:remote
```

Esses scripts sobrescrevem `web/.env.local`. Depois da troca, reinicie o `npm run dev`.

Rodar:

```sh
npm install
npm run dev
```

O frontend sobe em `http://localhost:4173`.

Checks uteis:

```sh
cd web
npm run lint
npm run build
cd ..
sh tools/check_supabase_functions.sh
```

O check das Edge Functions exige a stack local do Supabase ativa via `supabase start`.

## Deploy no Render

O frontend também está publicado como Static Site no Render.

Serviço atual:

- nome: `my-finance-web`
- URL pública: `https://my-finance-web-sski.onrender.com`
- dashboard: `https://dashboard.render.com/static/srv-d8krrlojs32c73bng0tg`

Configuração usada no Render:

- branch: `main`
- build command: `sh tools/build_render_static_site.sh`
- publish path: `dist`
- auto deploy: habilitado

Variáveis públicas configuradas no serviço:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Sempre que o frontend mudar, validar localmente antes do push:

```sh
cd web
npm run lint
npm run typecheck
npm run build
npm test
```

Schema mínimo esperado em `transactions`:

- `id`
- `date`
- `description`
- `amount`
- `type`
- `category`
- `budget_group_id`
- `account`
- `institution`
- `status`
- `notes` ou `observations`

O app calcula no cliente:

- total por grupo no mês selecionado
- `% da receita`
- diferença contra a meta 50-30-20
- total por categoria dentro de cada grupo

Importação atual:

- painel de importação de CSV Nubank no frontend
- upload autenticado de CSV Nubank e PDF Santander (fatura e extrato) no frontend
- upload autenticado para as Edge Functions `import-nubank-csv` e `import-santander-pdf`
- upsert em `transactions` por `user_id, external_id`

## Supabase versionado

O repositório agora inclui `supabase/`, que é a base para a integração oficial
do Supabase com GitHub.

Arquivos principais:

- `supabase/config.toml`
- `supabase/migrations/20260603223000_init.sql`
- `supabase/seed.sql`

O schema inicial cria:

- `public.profiles`
- `public.transactions`
- trigger de `updated_at`
- trigger de criação automática de perfil em `auth.users`
- políticas de `RLS` para cada usuário ver e editar só os próprios dados

Campos principais de `transactions`:

- `user_id`
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
- `invoice`
- `installment`
- `external_id`
- `source`

### O que ainda preciso de você

Para ligar este diretório ao projeto Supabase real e deixar a integração
GitHub funcionando de ponta a ponta, eu preciso de:

- `project ref` do projeto Supabase
- `DB password` do projeto
- `SUPABASE_ACCESS_TOKEN` se você quiser que eu use o CLI autenticado aqui

Com isso, o fluxo fica:

```sh
supabase link --project-ref <project-ref>
supabase db push
```

Depois, no dashboard do Supabase:

- conectar o repo `leonakao/my-finance`
- usar `Working directory = .`
- habilitar `Automatic branching`

## Edge Functions

Primeira function implementada:

- `supabase/functions/import-nubank-csv`
- `supabase/functions/import-santander-pdf`

Ela recebe:

- `kind`: `account` ou `card`
- `csvText`
- `invoice` opcional
- `filename` opcional

E faz:

- parsing do CSV
- classificação com as regras atuais
- `upsert` em `public.transactions`

No caso do Santander:

- recebe `pdfBase64`
- extrai os lançamentos da fatura
- classifica
- quando a compra vier com `Parcela` no formato `NN/NN`, expande a compra em uma série mensal completa a partir da data original
- faz `upsert` em `public.transactions`

### Smoke test local da function Santander

Com a stack local do Supabase disponivel, rode:

```sh
sh tools/test_import_santander_pdf.sh
```

Esse teste usa o fixture real `inbox/santander-2026-06.pdf`, faz signup de um usuario local, chama `import-santander-pdf` duas vezes e valida:

- expansao de compras parceladas
- serie completa para compras `08/10` do fixture
- deduplicacao por `external_id` na reimportacao

### Smoke test local da function Nubank

Para validar parcelamento no CSV do Nubank com um arquivo real que contenha `Parcela NN/TT`, rode:

```sh
sh tools/test_import_nubank_csv.sh /caminho/para/Nubank.csv
```

O teste faz signup de um usuario local, chama `import-nubank-csv` duas vezes e valida:

- expansao de compras com sufixo `Parcela NN/TT`
- presenca da serie completa `01/TT` ate `TT/TT`
- deduplicacao por `external_id` na reimportacao

Arquivo compartilhado de regra:

- `supabase/functions/_shared/nubank.ts`
- `supabase/functions/_shared/santander.ts`

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
