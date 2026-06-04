# Project Structure

**Analyzed:** 2026-06-03

## Top Level

```text
.
├── .codex/        # config local do projeto para o agente
├── .specs/        # memoria de planejamento, codebase e features
├── inbox/         # arquivos de entrada e artefatos operacionais
├── supabase/      # schema, migrations e config do Supabase
├── tools/         # scripts locais de extracao e agregacao
├── web/           # app React + Vite
├── README.md
└── notion-finance.md
```

## Module Roles

### `tools/`

- papel: processamento batch e normalizacao financeira
- contrato: entrada por arquivo, saida por JSON e CSV, resumo no terminal
- restricao: nao depender de UI nem de schema interno do frontend

### `web/`

- papel: autenticacao, leitura e recategorizacao de transacoes
- contrato: consumir somente o schema persistido no Supabase
- restricao: nao incorporar logica pesada de ingestao

### `supabase/`

- papel: verdade canonica de dados e seguranca
- contrato: migrations reproduziveis e politicas de acesso por usuario
- restricao: qualquer mudanca de enum ou coluna deve nascer aqui

### `inbox/`

- papel: workspace operacional local
- restricao: nao versionar conteudo sensivel ou gerado

## Recommended Growth Structure

### If Python tooling grows

Migrar de scripts soltos para algo como:

```text
tools/
├── finance_rules.py
├── io_utils.py
├── extract_santander_fatura.py
├── extract_nubank_csv.py
└── ...
```

Extrair modulo compartilhado apenas quando houver duplicacao real.

### If frontend grows

Migrar de `App.jsx` central para:

```text
web/src/
├── components/
├── hooks/
├── lib/
├── pages/
├── constants/
└── App.jsx
```

Nao fazer isso antes de o crescimento justificar.
