# Melhorias de UI — auditoria visual (Playwright, 2026-06-10)

Auditoria feita navegando por todas as telas (login, Dashboard, Mensal, Importar, Regras, Budget groups, modal de edição, sidebar colapsada e mobile) com dados semeados. Screenshots em `/tmp/ui-audit/`.

**Prioridade** — itens também apontados na revisão manual do Leonardo: navegação entre meses, meses em minúsculo, alertas colados, input de arquivo, botão "Importar para o Supabase" (tamanho + nome), box "Área autenticada", lista de regras desalinhada, falta de loading nas ações, "Budget groups" em inglês, formulário de gestão de grupos.

## 1. Textos duplicados / redundantes

- [x] **Mensal: mês aparece duas vezes em sequência.** O toolbar mostra "junho de 2026" (`MonthlyView.tsx:57`) e o painel logo abaixo repete "junho de 2026" como h2 (`SummaryTable.tsx:31`). Trocar o título do SummaryTable por algo como "Resumo por grupo" (hoje isso é só o eyebrow).
- [x] **Introdução dupla em todas as páginas.** O header da página já tem h1 + intro (`WorkspaceLayout.tsx:185-189` + `App.tsx:73-95`), e cada view repete um `hero-panel` com h2 + parágrafo dizendo a mesma coisa (ex.: Importar tem "Envie novos arquivos com um fluxo mais claro…" e logo abaixo "Traga novos dados para a base com um fluxo mais guiado…"). Consolidar em um único bloco de contexto por página.
- [x] **Cards de categoria com título repetido "Categorias".** Os três cards na Mensal têm o mesmo h3 "Categorias" e o nome do grupo (Desejos/Futuro/Necessidades) fica só no eyebrow pequeno (`CategorySection.tsx:22-23`). Inverter: h3 = nome do grupo, eyebrow = "Categorias".
- [x] **"Budget groups" repetido 3x na página** (h1 do header, h2 do hero, h3 do painel de configuração). Diferenciar os títulos.
- [x] **Eyebrow "Área autenticada"** em todo o app (`WorkspaceLayout.tsx:186`) não agrega informação — remover ou substituir por breadcrumb.
- [x] **Célula Grupo redundante**: mostra "Sem grupo" + hint "Precisa de classificação" (`TransactionTable.tsx:108-111`) — duas mensagens para o mesmo estado; manter só o hint com estilo de badge.

## 2. Textos com erro / inconsistência de idioma

- [x] **Acentuação faltando** (inconsistente com o resto da UI):
  - "Editar classificacao" → "Editar classificação" (`TransactionEditModal.tsx:67`)
  - "Diferenca" → "Diferença" (`SummaryTable.tsx:45`)
  - "Descricao" e "Acoes" nos headers da tabela (`TransactionTable.tsx:161,166`)
  - "Sem instituicao" → "Sem instituição" (`TransactionTable.tsx:99`)
  - "Nenhum lancamento neste grupo." (`CategorySection.tsx:46`)
  - "Descricao" no formulário de regra (`ClassificationRulesView.tsx:110`)
- [x] **Mistura PT/EN**: "Budget groups" no menu, títulos e na mensagem de aviso ("…fora dos totais por budget group"). Padronizar (ex.: "Grupos de orçamento") ou assumir o termo em todo lugar com capitalização consistente.
- [x] **Vazamento de stack técnico na UI**: eyebrow "Supabase + React" no login (`SignIn.tsx:119`), copy "…revisar seus lançamentos direto no Supabase", botão "Importar para o Supabase" (`ImportPanel.tsx:65`). Usuário final não precisa saber do Supabase — trocar por "Entrar", "Importar arquivo" etc.
- [x] **Nome dos meses começa em minúsculo** ("junho de 2026") em todos os títulos — o `Intl.DateTimeFormat('pt-BR')` retorna minúsculo; capitalizar a primeira letra no `monthLabel` (`lib/formatters.ts:12-18`).

## 3. Formatação de números e datas

- [x] **`toPercent` usa ponto decimal** ("25.60%", "0.39%") enquanto `toCurrency` usa vírgula pt-BR ("R$ 642,35") — usar `Intl.NumberFormat('pt-BR', { style: 'percent' })` (`lib/formatters.ts:8-10`).
- [x] **Datas em ISO bruto** na tabela de lançamentos ("2026-06-05") — formatar como dd/mm/aaaa (`TransactionTable.tsx:95`).
- [x] **Valor da regra com ponto**: "Nome + valor (55.90)" (`ClassificationRulesView.tsx:196`) — usar `toCurrency`.
- [x] **Colunas numéricas alinhadas à esquerda** (Valor, Total alocado, %, Meta, Diferença) — alinhar à direita para facilitar comparação.

## 4. Ícones

- [x] **Substituir "ícones" de texto da sidebar** (DS, MS, IM, RG, BG, SA, F em `WorkspaceLayout.tsx:21-25,59,124`) por ícones SVG reais (ex.: lucide-react: LayoutDashboard, Calendar, Upload, ListFilter, Target, LogOut).
- [x] **Toggle da sidebar usa "<<" / ">>"** (`WorkspaceLayout.tsx:215`) — trocar por chevrons SVG.
- [x] **Botão "Menu" mobile é texto** (`WorkspaceLayout.tsx:168-176`) — usar ícone hambúrguer.
- [x] **Ações sem ícone**: Editar/Excluir/Salvar nas tabelas e listas — adicionar ícones (lápis, lixeira) ajuda a escanear; o aviso "⚠" do feedback warning usa emoji — trocar por ícone consistente.

## 5. Espaçamento / layout

- [x] **Grid `two-up` com número ímpar de cards** deixa buraco (Mensal: card "Necessidades" sozinho com vazio à direita; Dashboard: Projeção × Simulação com alturas muito diferentes). Usar `repeat(auto-fit, minmax(...))` ou grid de 3 colunas para os grupos.
- [x] **Login: "Esqueci a senha" colado na borda inferior** do card, sem respiro após o botão Entrar — adicionar margem.
- [x] **Modal de edição: textarea de descrição muito alto** para conteúdo de 1 linha e com resize livre — reduzir e travar resize vertical.
- [x] **Tabela de lançamentos no mobile fica espremida** (colunas sobrepostas, descrições truncadas — ver `11-mobile-mensal.png`). Adicionar scroll horizontal com largura mínima ou layout de cards empilhados em telas pequenas.
- [x] **Aviso de transações sem grupo** ("2 transações confirmadas estão sem grupo…") flutua solto entre painéis — integrar ao painel de resumo ou dar destaque com ação ("Revisar agora →").
- [x] **Alertas/feedbacks aparecem colados** uns nos outros e nos painéis vizinhos (loading + erro + feedback empilham sem respiro em `MonthlyView.tsx:108-110`, `ImportView.tsx:24-25`, `ClassificationRulesView.tsx:238-239`) — dar gap consistente no `page-stack` e considerar um slot único de feedback por página.
- [x] **Lista de regras salvas toda desalinhada**: cada `rule-row` tem 3 blocos (nome, resumo tipo/categoria/grupo, ações) que não se alinham em colunas entre as linhas — o resumo vira um texto corrido sem hierarquia (`ClassificationRulesView.tsx:191-213`). Transformar em tabela real ou grid com colunas fixas e labels.
- [x] **Botão "Importar para o Supabase" maior que os inputs** do formulário, desalinhado na mesma linha (`ImportPanel.tsx:64-66`) — alinhar altura com os campos e renomear (ver item de stack técnico).
- [x] **Formulário de gestão de grupos confuso**: as linhas de edição são inputs soltos sem label (nome e meta % ficam idênticos a campos de formulário vazios, sem indicação do que é cada um) e cada linha tem Salvar/Excluir sempre visíveis (`BudgetGroupManager.tsx:82-101`). Reestruturar como tabela com cabeçalho (Nome | Meta % | Ações), edição inline com estado dirty ou modal de edição.

## 6. Navegação / UX

- [x] **Excluir regra e excluir grupo não pedem confirmação** (`ClassificationRulesView.tsx:208`, `BudgetGroupManager.tsx:97`) — ação destrutiva direta; adicionar dialog de confirmação (já existe `AppDialog`).
- [x] **Campo "Referência da fatura" aparece desabilitado** para 3 dos 4 tipos de importação (`ImportPanel.tsx:44-54`) — ocultar quando não aplicável (como o RuleForm faz com o campo Valor) em vez de mostrar desabilitado.
- [x] **Input de arquivo nativo** mostra "Choose File" em inglês e destoa do tema escuro — estilizar com dropzone/botão customizado mostrando o nome do arquivo selecionado.
- [x] **Aviso sem grupo não tem ação** — linkar o aviso da Mensal para a tabela já filtrada por "Sem grupo".
- [x] **Navegação entre meses precisa de redesign**: a barra atual ("Mês anterior" | select | "Próximo mês" | "Voltar ao atual") ocupa muito espaço e mistura botões ghost com select (`MonthlyView.tsx:64-104`). Trocar por controle compacto: chevrons ‹ › ao redor do nome do mês, dropdown ao clicar no nome e atalho "Hoje".
- [x] **Estados de carregamento são texto puro** ("Carregando dados…") e várias ações não dão feedback nenhum enquanto rodam (salvar grupo, criar/excluir regra, trocar de mês) — adicionar skeleton nos painéis e estado de loading/spinner nos botões de ação (hoje só o Editar da tabela mostra "Salvando...").
- [x] **Simulação rápida sem estado vazio**: com 0 grupos o select fica vazio e o resultado mostra R$ 0,00 — adicionar empty state orientando criar grupos.
- [x] **Hero do Dashboard ocupa muito espaço vertical** antes dos KPIs (título em frase longa + parágrafo). Encurtar copy para dar mais densidade à primeira dobra.

## Como reproduzir a auditoria

Spec temporário com seed de dados + screenshots foi usado e removido; o fluxo era: `createUserSession()` + insert de transações variadas → login via UI → navegar pelas 5 rotas + modal + mobile capturando screenshots (requer `supabase start` e dev server na 4173).

## 7. Rodada 2 — revisão manual (2026-06-10)

- [x] **Nome do mês centralizado no seletor** — `text-align: center` + `text-align-last: center` no select do month-switcher.
- [x] **Background oscilando conforme a altura da página** — gradientes do `body` agora usam `background-attachment: fixed` (`styles/base.css`).
- [x] **Sidebar não ficava fixa ao rolar** — o grid esticava a sidebar para a altura total da página; agora `align-self: start` + `height: 100vh` + `overflow-y: auto`, mantendo nav e "Sair" sempre visíveis.
- [x] **Botões da sidebar com tamanhos diferentes / "Sair" sem padding** — `.sidebar-signout` agora espelha o `.nav-link` (min-height 52px, radius 18px, padding 8px, gap).
- [x] **Espaçamento da Simulação rápida** — espaçamento vertical entre form, resultado e nota (`.simulation-panel > * + *`).
- [x] **Erro de importação persistia entre telas** — `navigateTo` agora limpa `error` e `feedback` ao trocar de página (`App.tsx`).
- [x] **Botões da sidebar com larguras diferentes** — `.nav-link` era `inline-flex` e encolhia para o conteúdo; agora `display: flex` + `width: 100%`.
- [x] **Logo desalinhada na sidebar colapsada** — `.sidebar-brand` agora centraliza no modo colapsado, alinhando o quadrado da marca com os ícones da nav.
