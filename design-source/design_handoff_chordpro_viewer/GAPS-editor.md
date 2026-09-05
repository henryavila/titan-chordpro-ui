# Titan Chordpro UI — camada de edição: o que ficou aberto

Estado de `Titan Chordpro UI.dc.html` (view + edit no mesmo componente, prop `mode`).
O viewer `Chordpro Viewer v2.dc.html` fica intacto como referência da leitura ratificada.

## Decisões que este protótipo tomou (revisar)

- **Um toque = texto.** Toque na linha abre a letra para edição; bloco só é selecionado pela
  alça `⋮⋮` na margem (arrastar = reordenar). Escolha do operador, 2026-08-29.
- **Copiar harmonia = área de transferência persistente.** Copia uma vez, cola em vários blocos
  até dispensar. Posições relativas: offset do acorde é proporcional ao tamanho da linha destino.
- **Chrome de edição:** barra superior com meta editável + dirty/undo/salvar/ler; barra inferior
  única (thumb-first) com Inserir / Fonte / tipografia / tema; barra contextual só com bloco
  selecionado (transpose de seção, copiar harmonia, adicionar acorde, TAB, imagem, duplicar, excluir).
- **Modo dual: dois grupos, uma cifra.** Pôr o capo ativa o modo dual — a mesma folha serve quem
  está com capotraste e quem não está, sem hierarquia entre eles. Cada acorde vira uma pilha de
  duas faixas, ambas no mesmo tamanho e peso, separadas por canal de cor: cinza em cima (com capo),
  verde embaixo (sem capo). Cada grupo corre o olho por uma faixa só, a música inteira, e ninguém
  transpõe de cabeça — o que nem o parêntese ao lado (`F#(G)`, que empilhava duas leituras no
  mesmo ponto) nem o dicionário no topo resolviam. Legenda com os dois pontos coloridos no começo;
  o botão da barra passa a ler “Dual · capo 3”. Sai pelo × ou pelo switch “Modo dual”.
- **Custo:** a linha de acordes fica ~2,55× a altura da fonte de acorde (contra 1,4×), então cabe
  menos música na tela em modo dual. O PDF ainda imprime uma cifra só.
- **Cor:** `--capo` (cinza) entrou como par do `--chord` (verde) nos dois temas — testamos azul
  como segundo acento e o cinza leu melhor: separa os canais sem disputar com o verde.
- **Auto-rolagem corrigida pelo dual.** A regra é "a música inteira em X segundos", e o dual
  estica a página ~17%. Com `{duration}` a velocidade já é altura/segundos e se corrige sozinha;
  sem `{duration}` (px/s por BPM) ela passaria a terminar depois, então a velocidade sobe na
  proporção da altura extra — calculada como uma faixa de acorde a mais por linha que tem acorde.
  Medido: altura +16,5%, velocidade +19,4% — o tempo total não muda ao ligar o dual.
- **Lentes:** botão na própria barra de leitura (o chip solto no canto não era encontrado);
  o painel guarda Nashville e o filtro de comentários.
- **Source pane:** gaveta inferior redimensionável; abre fechando a barra de edição (source é
  caminho paralelo, não simultâneo). Chips de diretiva inserem no cursor; lint conta
  `{soc}/{eoc}`, `{sot}/{eot}` e colchetes.
- **Entrar em edit** desliga ajuste e zera transpose global, com toast dizendo isso.

## Revisão de 2026-08-29 — corrigido nesta rodada

Bugs de estrutura e de estado encontrados na leitura do código contra o spec:

- **Refrão perdia as diretivas.** `{soc}/{eoc}` não geram linha no parser, então o alcance do
  bloco (`li0..li1`) cobria só as linhas de letra: excluir levava o miolo e deixava o par órfão
  (o bloco seguinte era engolido pelo refrão), mover quebrava a estrutura e duplicar repetia
  dentro do mesmo refrão. Agora, quando o par embala um único bloco, o alcance inclui as
  diretivas — excluir/mover/duplicar/inserir operam no refrão inteiro. Com linha em branco no
  meio do par (dois blocos no mesmo `{soc}`) o comportamento antigo continua, por ambiguidade.
- **“Descartar” apagava o que já tinha sido salvo:** voltava para a fonte do host, não para o
  último `onSave`. Agora volta ao último salvo e pede confirmação (dois toques, 4s).
- **Esc não cancelava a meta:** o `blur` disparado pelo Esc gravava o texto cancelado.
- **Flags presas comiam o próximo toque:** `skipCommit` (Esc na letra, sem blur no unmount) e
  `pillGuard` (click engolido depois do pointerup da pílula) ficavam ligadas e descartavam a
  edição seguinte. Guarda de pílula agora é por tempo.
- **TAB sem `{eot}`:** o splice do “Aplicar” comia uma linha a mais.
- **Trocar de cifra com rascunho** avisa em toast em vez de descartar em silêncio; sair da edição
  com rascunho avisa e o chip de leitura passa a dizer “Editar · rascunho”.
- **Botão “Fonte” renderizava com fundo quebrado** — `srcBg`/`srcBorder` nunca eram entregues
  pelo `renderVals`.
- **Comentário de ensaio agora é editável no lugar** (rótulo e itens do painel de execução): o
  próprio menu Inserir criava `{c:(NOVA INDICAÇÃO)}` que só dava para renomear pelo source.
- **Reordenar sem arrastar:** ↑/↓ na barra do bloco e Alt+↑/↓ — o arraste era o único caminho.
- **Pílula operável por teclado:** Enter edita, ←/→ movem de sílaba.
- **Refazer** (↻, Ctrl+Shift+Z / Ctrl+Y) e **Ctrl+S** para salvar, inclusive com o cursor no source.
- **Inserir dá feedback:** o menu diz onde o bloco entra (“Depois de X” / “No fim da cifra”) e o
  bloco novo entra selecionado e rolado para a vista. Acorde novo abre o editor já preenchido
  em vez de plantar em silêncio o primeiro acorde da música.
- **Trocar ≠ inserir imagem:** “Inserir → Partitura” não sobrescreve mais a imagem selecionada.
- **Lint sempre ligado na edição:** ponto vermelho no botão Fonte quando há diretiva sem par
  (antes só contava com o painel aberto).
- **Faixa da pílula** deixou de crescer com o bias (sobra morta em cada linha); posição vem da
  altura real da pílula. Bloco arrastado escurece; alça tem `aria-pressed`; diálogos de acorde,
  partitura e TAB ganharam `aria-modal`.
- **Rótulo + bloco são uma unidade.** Um `{c:(REFRÃO)}` colado na linha imediatamente acima
  de uma estrofe/refrão é o nome daquele bloco: mover, duplicar e excluir levam os dois juntos,
  a seleção contorna o par e soltar entre rótulo e corpo ancora no rótulo. Comment separado por
  linha em branco continua sendo bloco independente.
- **Primeira visita na edição** tem dica única (`cpv:editSeen`) com as três regras de toque.

## Limites conhecidos

- **PDF ignora blocos de imagem.** O export herdado (jsPDF) desenha meta, cifra, comments e TAB;
  partitura embutida não entra. Decidir se o PDF deve carregar a imagem ou apontar para ela.
- **Reordenar bloco move linhas do source** (`li0..li1`) e garante uma linha vazia depois.
- **TAB:** ferramentas são compasso vazio / repetir último / limpar casas, operando em texto. Não
  há edição por casa (clicar na corda e digitar a casa).
- **Imagem:** `{image: caminho}` é a diretiva provisória do mock; a real é engenharia. O picker
  lista os 4 exemplos do operador no lugar do file picker do host.
- **Meta:** só título, subtítulo, tom e BPM são editáveis no lugar. `{time}`, `{duration}` e
  `{capo}` só pelo source.
- **Undo** é pilha de source (50 passos) e vive na sessão; o host não recebe eventos de dirty
  ainda — `onSave(source)` é o único gancho.
- **Mobile real não validado.** Layout responde em 360–430px por wrap, mas arrastar acorde e
  arrastar bloco com o dedo precisa de teste em dispositivo.

## Camada de dois modos — `Titan Chordpro UI v2.dc.html` (2026-08-30)

Spec: `design_handoff_chordpro_viewer/SPEC-modos-edicao.md`. O v1 fica intacto como referência
do editor de modo único.

Implementado:

- **Três camadas.** `officialSource()` (BD do consumer, no mock a fixture ou o último save do
  modo "para todos") → overlay ancorado → `baseSource()` efetiva. O overlay é diff por linha
  (LCS) em operações `{type, at, anchor, before, after, ctx}`, gravado em `cpv:my:{songId}`.
  A reaplicação busca pelo conteúdo original a partir do índice antigo, em leque — mexer
  acima não desloca o ajuste.
- **`ctx` de leitura** viaja com cada operação (transpose, capo, dual no momento da criação) e
  aparece no painel ("Feito lendo +2 semitons · capo 3"). Como a edição é sempre feita no tom
  escrito (entrar em edit zera o transpose), a normalização é no-op hoje — o campo existe para
  quando houver troca rápida de acorde na própria leitura.
- **Modos.** Prop `modes` (`both|local|content|none`) decide o que existe para aquele usuário.
  Com os dois, o chip Editar abre a escolha ("Só para mim" / "Para todos"); com um, entra direto.
  Sem alternador dentro da edição — sai e entra de novo.
- **Chrome por modo.** Badge e borda distintos; local grava sozinho ("salvo neste celular") e tem
  "Voltar ao original"; conteúdo tem "Salvar para todos" em vermelho e salvar JÁ publica.
  No local, meta, Inserir, Fonte, excluir bloco, TAB e partitura ficam fora.
- **Leitura.** Pill "Minha versão · N ajustes" / "Original" — alternar é leitura, não desfaz nada.
  `⋯` abre o painel com revert por item, fixar tom/capo (op `tune`) e sugerir.
- **Atualização.** Versão oficial ≠ `baseVersion` do overlay → diálogo item por item, com
  comparação lado a lado nas colisões. Ajuste que o responsável aceitou é detectado como
  absorvido e sai do overlay sem virar conflito consigo mesmo.
- **Sugestões.** Envia o overlay inteiro para `cpv:sug`, sem status para o autor. Fila do
  responsável em três níveis (cifras → pedidos → ajustes), aceitar/recusar por item; aceitar
  grava no oficial e sobe a versão.
- **Ponto na linha divergente** em leitura e em edição: botão de 16px na margem esquerda da
  linha, que reverte aquele trecho num toque (o `Set` de linhas aplicadas virou mapa
  linha → id da operação).
- **Export** oferece "Minha versão" ou "Oficial" quando há overlay.
- **PDF** leva a marca "versão pessoal" no cabeçalho quando a leitura está na versão pessoal, e
  o `.cho` sai com a linha de aviso. A escolha no export é o mesmo switch da leitura: pedir
  "Oficial" põe a tela no original antes de gerar.

Aberto nesta camada:
- **Reordenar bloco** vira delete+insert no diff: o painel mostra dois itens para um gesto só.
- **Sem rede** o modo "para todos" não é bloqueado (spec pede barrar a entrada).
- **`songId`/`version`** vêm de props com fallback na fixture; o consumer precisa entregar os dois
  de verdade. Um `version` que não muda faz o overlay nunca ser reconferido.
- **`onSaveContent(source)`** é o gancho novo; `onSave` continua sendo chamado por compatibilidade.
- **Sugestão anônima sem contenção** — decisão do operador; rate limit e moderação são do consumer.

## Fora deste brief (confirmado)
Gen/ML, simplify, collab, shell de app, multicifra, player sync, fretboard, seletor OnSong.
