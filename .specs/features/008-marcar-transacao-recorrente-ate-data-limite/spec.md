# Marcar Transacao Recorrente Ate Data Limite Specification

## Problem Statement

A aplicacao ja projeta recorrencias provaveis com base em heuristica, mas o usuario nao consegue declarar que uma transacao especifica deve se repetir mensalmente ate uma data conhecida. Isso limita casos previsiveis como emprestimos, pensoes, mensalidades ou combinados temporarios, em que o usuario sabe com antecedencia que o mesmo valor continuara acontecendo por alguns meses e quer refletir isso na projecao sem depender apenas do historico.

O projeto tambem ja possui uma regra de importacao para compras parceladas do cartao, que representa outro tipo de compromisso futuro conhecido. Esses casos nao devem formar um trilho paralelo de previsao: parcelamentos importados e recorrencias manuais devem convergir para o mesmo modelo de dados, com transacoes futuras persistidas na propria tabela `transactions` e ligadas por um identificador comum da transacao principal.

Ao mesmo tempo, `transactions.notes` ja existe no banco, mas nao faz parte do fluxo principal de edicao e aprendizado. Falta um lugar claro para registrar o contexto de uma transacao e, quando fizer sentido, reaplicar essa mesma nota automaticamente por meio das regras de classificacao.

Por fim, se transacoes futuras conhecidas passam a ser persistidas em `transactions`, o usuario tambem precisa conseguir criar linhas manualmente para meses futuros e corrigir o planejamento quando ele estiver errado, seja excluindo uma linha criada por engano, seja marcando-a como ignorada para tirá-la dos calculos sem perder o rastro.

## Goals

- [ ] Permitir marcar uma transacao existente como recorrente mensal ate um mes limite.
- [ ] Fazer a recorrencia manual aparecer nas projecoes futuras da dashboard e da pagina `Mensal`.
- [ ] Tratar parcelamentos importados como compromissos planejados dentro do mesmo modelo de projecao.
- [ ] Evitar dupla contagem quando o mes ja tiver uma transacao registrada equivalente.
- [ ] Permitir editar a nota textual de uma transacao no fluxo normal de revisao.
- [ ] Permitir que regras de classificacao persistam uma nota opcional para replica automatica.
- [ ] Permitir criar transacoes manualmente em qualquer mes, incluindo meses futuros, para registrar fatos ou planejamentos conhecidos.
- [ ] Permitir excluir ou ignorar transacoes incorretas sem depender apenas da heuristica.
- [ ] Manter a configuracao persistida e isolada por usuario.
- [ ] Permitir revisar, editar e encerrar a recorrencia sem apagar o historico real.
- [ ] Preservar acessibilidade, navegacao por teclado, feedback de mutacao e deep link conforme `AGENTS.md`.

## Out of Scope

Explicitamente fora do MVP desta feature.

| Feature | Reason |
| --- | --- |
| Suportar frequencias nao mensais | O caso inicial e mensal, derivado do exemplo e do modelo de projecao atual. |
| Criar uma tela separada de cadastro manual de transacoes | O gatilho inicial parte da edicao de uma transacao existente. |
| Variacao de valor por mes dentro da mesma recorrencia | O MVP replica valor, tipo, categoria, grupo e descricao da transacao-base. |
| Regras avancadas como “todo dia util”, pausas temporarias ou parcelas irregulares | A primeira versao cobre repeticao mensal simples com data de fim. |
| Reclassificar automaticamente historico passado ao criar a recorrencia | A feature atua na projecao futura, nao no retroativo. |
| Editor rico, anexos ou historico versionado de notas | O MVP usa nota textual simples e unica por transacao/regra. |
| Reescrever a logica de importacao de parcelamento ja existente | O objetivo aqui e integrar conceitualmente o modelo, reaproveitando o que a feature `003` ja introduz. |
| Fluxo completo de conciliação financeira entre “ignorado” e “realizado” | O MVP cobre apenas o impacto de ignorar ou excluir na projeção e na leitura principal. |

---

## User Stories

### P1: Marcar uma transacao como recorrente mensal ate um mes limite ⭐ MVP

**User Story**: Como usuario que tem um pagamento ou recebimento previsivel por alguns meses, quero marcar uma transacao ja existente como recorrente ate uma data limite para que minhas projecoes futuras reflitam esse compromisso.

**Why P1**: Sem esse fluxo, o usuario depende da heuristica ou de memoria manual para compromissos que ja conhece com precisao.

**Acceptance Criteria**:

1. WHEN o usuario abrir a edicao de uma transacao elegivel THEN o sistema SHALL oferecer um controle acessivel para marcar a transacao como `Recorrente`.
2. WHEN o usuario ativar esse controle THEN o sistema SHALL permitir informar um mes limite inclusive, mantendo valor, tipo, categoria, grupo e descricao da transacao-base como referencia da recorrencia.
3. WHEN o usuario salvar a recorrencia THEN o sistema SHALL gerar transacoes futuras em `transactions` somente para os meses posteriores ao da transacao principal, ate o mes limite inclusive, vinculadas a uma transacao principal comum.
4. WHEN a recorrencia for salva THEN o sistema SHALL recalcular imediatamente as projecoes da dashboard e da pagina `Mensal`.
5. WHEN o mes selecionado estiver entre o primeiro mes futuro coberto pela recorrencia e o mes limite inclusive THEN o sistema SHALL considerar essas transacoes futuras nas projecoes desse mes.
6. WHEN o usuario cancelar a edicao antes de salvar THEN o sistema SHALL preservar a transacao sem criar transacoes futuras adicionais.

**Independent Test**: Marcar uma despesa de junho de 2026 como recorrente ate junho de 2027 e verificar que as transacoes futuras sao persistidas em `transactions`, ligadas a uma mesma transacao principal, e passam a aparecer nos meses correspondentes.

---

### P1: Exibir recorrencias manuais como compromissos planejados na projecao ⭐ MVP

**User Story**: Como usuario que consulta meu fluxo mensal futuro, quero diferenciar o que eu mesmo declarei como recorrente do que o sistema apenas inferiu como provavel para confiar mais na projecao.

**Why P1**: Recorrencia manual e um compromisso explicitamente conhecido e nao deve competir semanticamente com a heuristica de `Provavel`.

**Acceptance Criteria**:

1. WHEN uma recorrencia manual estiver ativa para um mes futuro THEN o sistema SHALL exibi-la na projecao como transacao futura conhecida, separada dos itens `Provavel`.
2. WHEN a recorrencia manual representar uma despesa THEN o sistema SHALL inclui-la nos totais projetados de despesa, saldo liquido e agregacoes por grupo/categoria.
3. WHEN a recorrencia manual representar uma receita THEN o sistema SHALL inclui-la nos totais projetados de receita, saldo liquido e indicadores do mes atual ou futuro.
4. WHEN uma recorrencia manual e uma recorrencia heuristica representarem o mesmo compromisso no mesmo mes THEN o sistema SHALL evitar duplicidade visual e financeira, priorizando a transacao futura conhecida.
5. WHEN houver uma transacao equivalente ja persistida para o mes coberto pela recorrencia manual THEN o sistema SHALL usar apenas a linha persistida para evitar dupla contagem.
6. WHEN a projecao for recarregada em um deep link direto para um mes futuro THEN o sistema SHALL manter a mesma composicao de transacoes conhecidas e estimativas provaveis.

**Independent Test**: Criar uma recorrencia manual para um PIX mensal, abrir um mes futuro e confirmar que a transacao futura persistida entra nos totais e nao duplica um item provavel equivalente.

---

### P1: Parcelamentos importados entram no mesmo modelo de compromissos planejados ⭐ MVP

**User Story**: Como usuario que importa compras parceladas do cartao, quero que essas parcelas futuras aparecam na mesma camada conceitual de compromissos planejados usada pelas recorrencias manuais para que a projecao fique consistente e auditavel.

**Why P1**: Se parcelamento importado e recorrencia manual forem tratados por modelos distintos, a pagina `Mensal` e a dashboard acabam com regras duplicadas, semantica confusa e maior risco de dupla contagem.

**Acceptance Criteria**:

1. WHEN uma compra parcelada for expandida pela importacao THEN o sistema SHALL persistir suas parcelas futuras na mesma tabela `transactions`, usando o mesmo mecanismo de ligacao por transacao principal adotado pelas recorrencias manuais.
2. WHEN a projecao mensal ou a dashboard agregarem compromissos futuros THEN o sistema SHALL combinar recorrencias manuais e parcelamentos importados a partir da mesma base de transacoes futuras persistidas, mantendo origem identificavel.
3. WHEN um item planejado vier de parcelamento importado THEN o sistema SHALL preservar os metadados especificos de parcela, como `installment`, sem exigir o fluxo manual de recorrencia.
4. WHEN houver colisao entre um parcelamento importado e outra fonte de previsao equivalente no mesmo mes THEN o sistema SHALL evitar dupla contagem, priorizando o item mais deterministico ja persistido.
5. WHEN o usuario revisar a projecao THEN o sistema SHALL conseguir distinguir ao menos as origens `recorrencia manual`, `parcelamento importado` e `provavel por heuristica`, sem depender apenas de cor.
6. WHEN a modelagem interna evoluir THEN o sistema SHALL permitir reaproveitar o mesmo pipeline de totais, agrupamentos e deduplicacao para ambas as origens de transacao futura conhecida.

**Independent Test**: Importar uma compra parcelada e criar uma recorrencia manual em paralelo, depois abrir um mes futuro e verificar que ambos aparecem como compromissos planejados na mesma camada de projecao, com origem distinguivel e sem dupla contagem.

---

### P1: Revisar, editar e encerrar uma recorrencia manual ⭐ MVP

**User Story**: Como usuario que pode quitar antes, renegociar ou mudar de ideia, quero revisar a recorrencia criada e ajustar sua data limite ou removela sem perder meu historico de transacoes reais.

**Why P1**: Uma recorrencia temporal precisa ser controlavel ao longo do tempo; sem isso, a projecao perde confiabilidade.

**Acceptance Criteria**:

1. WHEN uma transacao ja possuir recorrencias filhas associadas THEN o sistema SHALL refletir esse estado na experiencia de edicao com os dados atuais preenchidos.
2. WHEN o usuario alterar a data limite de uma recorrencia existente THEN o sistema SHALL criar ou remover transacoes futuras conforme necessario e recalcular imediatamente as projecoes impactadas.
3. WHEN o usuario encerrar ou remover a recorrencia THEN o sistema SHALL remover apenas as transacoes futuras ainda nao realizadas cobertas por ela, sem alterar a transacao principal nem outras transacoes ja registradas.
4. WHEN o usuario reabrir a aplicacao THEN o sistema SHALL restaurar a recorrencia persistida e seu impacto nas projecoes.
5. WHEN a mutacao falhar THEN o sistema SHALL preservar ou restaurar o estado anterior e anunciar o erro em regiao `aria-live`.

**Independent Test**: Editar a data limite de uma recorrencia existente, depois removela, e verificar o recalculo imediato das projecoes antes e depois do reload.

---

### P1: Editar notas da transacao e reutiliza-las nas regras de classificacao ⭐ MVP

**User Story**: Como usuario que quer explicar o contexto de um lancamento, quero editar uma nota da transacao e opcionalmente salvar essa nota na regra de classificacao para que futuros matches ja venham documentados.

**Why P1**: A recorrencia e a classificacao ficam mais confiaveis quando a origem ou o sentido do gasto fica explicito, e isso reduz retrabalho manual em lancamentos repetidos.

**Acceptance Criteria**:

1. WHEN o usuario abrir a edicao de uma transacao THEN o sistema SHALL exibir um campo editavel de `Notas` preenchido com o valor atual persistido.
2. WHEN o usuario salvar a transacao com a nota alterada THEN o sistema SHALL persistir a nota em `transactions.notes`, junto das demais alteracoes aplicaveis.
3. WHEN o usuario criar ou atualizar uma regra de classificacao a partir de uma transacao com nota THEN o sistema SHALL permitir optar por salvar tambem essa nota na regra.
4. WHEN uma regra com nota configurada for aplicada em uma importacao futura THEN o sistema SHALL preencher `transactions.notes` automaticamente com a nota da regra apenas quando a transacao estiver sem nota.
5. WHEN o usuario reaplicar uma regra com nota ao historico THEN o sistema SHALL atualizar a nota das transacoes que se enquadrarem apenas quando elas estiverem sem nota.
6. WHEN a transacao ja tiver nota manual nao vazia THEN o sistema SHALL preserva-la e nao sobrescreve-la por causa do match da regra.
7. WHEN a regra nao tiver nota configurada THEN o sistema SHALL preservar o comportamento atual e nao sobrescrever notas existentes so por causa da classificacao.
8. WHEN a nota vier vazia ou apenas com espacos THEN o sistema SHALL persisti-la como string vazia apos trim, sem erro falso.

**Independent Test**: Editar a nota de uma transacao, salvá-la numa regra, importar ou reclassificar um item equivalente e verificar que a nova transacao recebe automaticamente a mesma nota.

---

### P1: Criar, excluir ou ignorar transacoes manualmente ⭐ MVP

**User Story**: Como usuario que quer registrar transacoes fora de importacoes e recorrencias, quero criar transacoes manualmente em qualquer mes e depois poder excluir ou ignorar linhas incorretas para manter o historico e a projecao confiaveis.

**Why P1**: Se a tabela `transactions` vira a base unica do conhecido, o usuario precisa ter meios simetricos de adicionar e corrigir esse conhecido em qualquer periodo, nao apenas no futuro.

**Acceptance Criteria**:

1. WHEN o usuario estiver em qualquer mes THEN o sistema SHALL permitir criar manualmente uma transacao com data, descricao, valor, tipo, categoria, grupo e nota.
2. WHEN o usuario salvar uma transacao manual THEN o sistema SHALL persistir essa linha em `transactions` e inclui-la imediatamente nos totais e listas do mes correspondente.
3. WHEN o usuario excluir uma transacao criada por engano THEN o sistema SHALL removê-la da base e recalcular imediatamente a projecao afetada.
4. WHEN o usuario marcar uma transacao como ignorada THEN o sistema SHALL exclui-la dos totais, agrupamentos e projeções sem precisar apagá-la fisicamente.
5. WHEN uma transacao ignorada continuar existindo no banco THEN o sistema SHALL manter sinalização explícita de que ela está ignorada, sem depender apenas de ausência visual.
6. WHEN o usuario desmarcar uma transacao ignorada THEN o sistema SHALL voltar a considerá-la imediatamente nos calculos aplicáveis.
7. WHEN a transacao ignorada ou excluída for filha de uma transacao principal THEN o sistema SHALL aplicar a ação apenas à linha escolhida, a menos que o fluxo futuro introduza uma ação explícita em lote.
8. WHEN o usuario ignorar uma transacao THEN o sistema SHALL continuar oferecendo um caminho claro para localizar e restaurar essa linha na interface.

**Independent Test**: Criar uma despesa manual em um mês passado ou atual e outra em um mês futuro, confirmar seus impactos nos totais e na projeção quando aplicável, depois marcá-las como ignoradas ou excluí-las e verificar o recálculo imediato.

---

### P2: Preservar seguranca de interacao, acessibilidade e responsividade

**User Story**: Como usuario de teclado ou mobile, quero configurar uma recorrencia sem executar mudancas acidentais ou perder contexto da transacao que estou editando.

**Why P2**: A feature adiciona mutacao e estado extra ao modal de edicao; o fluxo precisa continuar confiavel.

**Acceptance Criteria**:

1. WHEN o modal de edicao abrir THEN o sistema SHALL manter foco gerenciado conforme o padrao ja usado em `AppDialog`.
2. WHEN a recorrencia estiver sendo salva ou removida THEN o botao correspondente SHALL manter o rotulo original, exibir spinner e impedir envio duplicado.
3. WHEN houver erro de validacao na data limite THEN o sistema SHALL mostrar a mensagem inline e focar o primeiro campo invalido ao submeter.
4. WHEN o usuario navegar apenas por teclado THEN todos os controles da recorrencia SHALL possuir nome acessivel, foco visivel e ordem de tab coerente.
5. WHEN o fluxo rodar em viewport movel THEN os controles SHALL manter alvo minimo de 44px e nao causar overflow horizontal.
6. WHEN o usuario fizer alteracoes e tentar fechar o modal sem salvar THEN o sistema SHALL avisar sobre mudancas nao salvas.

**Independent Test**: Configurar, editar e remover a recorrencia em viewport movel e somente com teclado, validando foco, feedback, spinner e protecao contra perda acidental.

## Edge Cases

- WHEN a transacao for do tipo `Transferência` THEN o sistema SHALL impedir marcacao como recorrente nesta feature inicial.
- WHEN a data limite for anterior ao mes da transacao-base THEN o sistema SHALL bloquear o salvamento com erro inline.
- WHEN a data limite for igual ao mes da transacao-base THEN o sistema SHALL aceitar a configuracao, mas nao gerar transacoes filhas porque nao existe mes futuro coberto.
- WHEN a transacao-base tiver descricao longa ou conteudo incomum THEN o sistema SHALL preservar legibilidade e impedir quebra do modal ou da tabela de projecao.
- WHEN o usuario editar depois a classificacao da transacao-base THEN o sistema SHALL manter a recorrencia coerente com a classificacao vigente definida para ela ou exigir uma atualizacao explicita, sem duplicar regras conflitantes.
- WHEN a nota da transacao tiver texto longo THEN o sistema SHALL permitir quebra de linha, preservar o conteudo e evitar overflow ou perda silenciosa.
- WHEN o usuario editar manualmente a nota de uma transacao que depois receberia match de uma regra com nota THEN o sistema SHALL preservar a nota manual existente e aplicar a nota da regra somente em transacoes sem nota.
- WHEN um parcelamento importado e uma recorrencia manual puderem representar o mesmo compromisso financeiro THEN o sistema SHALL ter regra canonica de precedencia e deduplicacao definida no design.
- WHEN o usuario ignorar a transacao principal de uma serie THEN o sistema SHALL ignorar apenas a linha principal e preservar as filhas sem propagacao implícita.
- WHEN o usuario excluir a transacao principal de uma serie THEN o sistema SHALL exigir confirmação explícita informando que as filhas derivadas também serão removidas por cascata.
- WHEN o usuario tentar excluir uma transacao importada ou derivada ainda relevante THEN o sistema SHALL pedir confirmacao ou oferecer alternativa de ignorar.
- WHEN duas recorrencias manuais equivalentes cobrirem o mesmo mes THEN o sistema SHALL impedir dupla contagem por restricao de integridade ou deduplicacao canonica.
- WHEN a transacao-base for removida do banco ou ficar inacessivel THEN o sistema SHALL impedir transacoes filhas orfas por constraint ou tratamento consistente de cascata.
- WHEN a recorrencia cobrir um mes que ja tenha item provavel e item registrado equivalentes THEN o sistema SHALL continuar mostrando somente o item registrado.
- WHEN o usuario nao estiver autenticado ou tentar mutar recorrencias de outro usuario THEN o banco SHALL negar acesso por RLS.

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| RECR-01 | P1: Marcar recorrencia ate data limite | Design | Pending |
| RECR-02 | P1: Marcar recorrencia ate data limite | Design | Pending |
| RECR-03 | P1: Marcar recorrencia ate data limite | Design | Pending |
| RECR-04 | P1: Marcar recorrencia ate data limite | Design | Pending |
| RECR-05 | P1: Marcar recorrencia ate data limite | Design | Pending |
| RECR-06 | P1: Marcar recorrencia ate data limite | Design | Pending |
| RECR-07 | P1: Exibir como planejado explicito | Design | Pending |
| RECR-08 | P1: Exibir como planejado explicito | Design | Pending |
| RECR-09 | P1: Exibir como planejado explicito | Design | Pending |
| RECR-10 | P1: Exibir como planejado explicito | Design | Pending |
| RECR-11 | P1: Exibir como planejado explicito | Design | Pending |
| RECR-12 | P1: Exibir como planejado explicito | Design | Pending |
| RECR-13 | P1: Parcelamentos importados no mesmo modelo | Design | Pending |
| RECR-14 | P1: Parcelamentos importados no mesmo modelo | Design | Pending |
| RECR-15 | P1: Parcelamentos importados no mesmo modelo | Design | Pending |
| RECR-16 | P1: Parcelamentos importados no mesmo modelo | Design | Pending |
| RECR-17 | P1: Parcelamentos importados no mesmo modelo | Design | Pending |
| RECR-18 | P1: Parcelamentos importados no mesmo modelo | Design | Pending |
| RECR-19 | P1: Revisar, editar e encerrar | Design | Pending |
| RECR-20 | P1: Revisar, editar e encerrar | Design | Pending |
| RECR-21 | P1: Revisar, editar e encerrar | Design | Pending |
| RECR-22 | P1: Revisar, editar e encerrar | Design | Pending |
| RECR-23 | P1: Editar notas e reutiliza-las em regras | Design | Pending |
| RECR-24 | P1: Editar notas e reutiliza-las em regras | Design | Pending |
| RECR-25 | P1: Editar notas e reutiliza-las em regras | Design | Pending |
| RECR-26 | P1: Editar notas e reutiliza-las em regras | Design | Pending |
| RECR-27 | P1: Editar notas e reutiliza-las em regras | Design | Pending |
| RECR-28 | P1: Editar notas e reutiliza-las em regras | Design | Pending |
| RECR-29 | P1: Editar notas e reutiliza-las em regras | Design | Pending |
| RECR-30 | P1: Criar, excluir ou ignorar transacoes planejadas | Design | Pending |
| RECR-31 | P1: Criar, excluir ou ignorar transacoes planejadas | Design | Pending |
| RECR-32 | P1: Criar, excluir ou ignorar transacoes planejadas | Design | Pending |
| RECR-33 | P1: Criar, excluir ou ignorar transacoes planejadas | Design | Pending |
| RECR-34 | P1: Criar, excluir ou ignorar transacoes planejadas | Design | Pending |
| RECR-35 | P1: Criar, excluir ou ignorar transacoes planejadas | Design | Pending |
| RECR-36 | P1: Criar, excluir ou ignorar transacoes planejadas | Design | Pending |
| RECR-37 | P2: Fluxo seguro e acessivel | Design | Pending |
| RECR-38 | P2: Fluxo seguro e acessivel | Design | Pending |
| RECR-39 | P2: Fluxo seguro e acessivel | Design | Pending |
| RECR-40 | P2: Fluxo seguro e acessivel | Design | Pending |
| RECR-41 | P2: Fluxo seguro e acessivel | Design | Pending |
| RECR-42 | P2: Fluxo seguro e acessivel | Design | Pending |

**Coverage:** 42 total, 42 mapeados em requisitos, 0 pendentes

## Success Criteria

- [ ] O usuario consegue transformar uma transacao existente em uma recorrencia mensal com data limite inclusive.
- [ ] A recorrencia manual aparece nas projecoes futuras como compromisso planejado explicito, distinto de `Provavel`.
- [ ] Parcelamentos importados usam o mesmo modelo conceitual de compromissos planejados da projecao.
- [ ] O sistema evita dupla contagem com heuristica e com transacoes reais ja registradas no mesmo mes.
- [ ] O usuario consegue editar notas diretamente na transacao sem sair do fluxo principal.
- [ ] Regras de classificacao podem replicar notas automaticamente em importacoes e reaplicacoes historicas.
- [ ] O usuario consegue criar transacoes manuais em qualquer mes para representar fatos ou planejamentos conhecidos.
- [ ] O usuario consegue excluir ou ignorar transacoes incorretas com efeito imediato nos calculos.
- [ ] O usuario consegue revisar, editar e encerrar a recorrencia sem afetar o historico real.
- [ ] A configuracao persiste por usuario e sobrevive a reload e deep links.
- [ ] Os fluxos principais possuem cobertura unitaria e E2E para criacao, edicao, encerramento, deduplicacao e acessibilidade basica.
