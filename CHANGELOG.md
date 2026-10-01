# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Slides em PowerPoint:** em Exportar, baixe a letra em `.ppsx`. Ao abrir o arquivo, a apresentação começa na hora. A capa e o fundo são as mesmas imagens do Louvor JA. Cada slide mostra a letra grande no centro, no mesmo recorte do `.slja`. Título e letra vão em caixa alta, para ler no projetor. Na capa, o título da música fica maior e um pouco acima do centro. O app que usa o Titan gera o mesmo arquivo a partir da cifra, sem abrir a tela (`exportPpsx`).
- **Importar cifra completa (.zip):** o app que usa o Titan pode abrir o pacote baixado em Exportar e guardar cifra, solos Guitar Pro/GPX/MusicXML, imagens, cantado, playback e capas no próprio armazenamento. Os caminhos locais do ZIP viram as referências do app; YouTube e origem voltam na cifra. Não há tela de importar no Titan — a integração é pelo código (`importChartBundle`). Se um anexo faltar, o tipo não bater, o ZIP estiver cortado, o arquivo for uma página de erro ou a referência de áudio não puder ser tocada, a importação para e a cifra não entra incompleta.
- **Notas nos solos:** em um trecho Guitar Pro/MusicXML, toque em **Notas** para ver C, D, E e os demais nomes acima da TAB ou da partitura. Toque novamente para ocultar. O aparelho lembra sua escolha para os próximos trechos. O app que abre o Titan pode escolher a forma Dó, Ré, Mi para seus leitores.

### Removed
- **BREAKING CHANGE — nome da cifra embutida:** no app que mostra a cifra, passe a montar `<TitanChordpro>` e atualize os nomes do documento e do controlador usados na integração. Ajuste também os estilos, os seletores da tela e as chaves onde o app guarda preferências, versões pessoais e sugestões: o prefixo `cpv` passa a `titan-chordpro` (`cpv:user-preferences` vira `titan-chordpro:user-preferences`, por exemplo). Sem esse ajuste, a cifra pode ficar sem estilos e escolhas já guardadas deixam de aparecer. Migre esses dados antes de atualizar o pacote; os nomes antigos não são lidos. Os modos `view`/`edit`, as diretivas `x_titan_*` e as marcas `x///` continuam iguais.
- **BREAKING CHANGE — classes da cifra no HTML:** se o app pinta a cifra com CSS próprio ou busca acordes e linhas no DOM, os nomes soltos (`chord`, `word`, `lyric`, `lyrics-line`, `comment-line`, `chorus-section`) saíram. Use os mesmos pedaços com o prefixo `titan-chordpro-` (acorde, palavra, letra, linha, comentário, refrão). A raiz é `titan-chordpro`, não `cpv`; `chordpro-content` e `song-content` também saíram. Sem esse ajuste, os estilos e as consultas do host deixam de achar a cifra.
- **BREAKING CHANGE — ajuste da rolagem no código do app:** se o app muda a velocidade da rolagem automática por conta própria, a função agora se chama `adjustScrollMultiplier` (antes `viewerMulStep`). Cada passo continua 12% mais rápido ou mais lento, entre 0,3× e 3×. O nome antigo não existe no pacote.
- **BREAKING CHANGE — ajuste obrigatório no app que usa o Titan:** ao editar o código da cifra ou exportar o arquivo `.cho`, os campos de origem, YouTube, áudio, capa e batida usam `{x_titan_…: valor}`. Antes de atualizar o pacote, migre as cifras salvas e as chaves enviadas/lidas pela integração: `x_source`, `x_youtube`, `x_audio_sung`, `x_audio_playback`, `x_audio_art`, `x_audio_art_w`, `x_audio_art_h`, `x_strum` e `x_strum_set` recebem `titan_` após `x_`. Converta também `x_origem` para `x_titan_source` e `x_audio` / `x_audio_cantado` para `x_titan_audio_sung`. Os nomes antigos não são interpretados nem convertidos automaticamente. As mesmas mudanças valem para `ChartMeta`, `MetaKey`, `META_KEYS` e patches; se usados, troque `parseXStrum` / `formatXStrum` e suas variantes `Set` por `parseTitanStrum` / `formatTitanStrum` e suas variantes `Set`. Sem esses ajustes, origem, mídia e batidas antigas deixam de funcionar. Letras, acordes, diretivas padrão e marcas `x///` mantêm sua sintaxe.
- **BREAKING CHANGE — solos e partituras no arquivo:** referências a Guitar Pro/MusicXML passam de `{score: …}` para `{x_titan_score: …}`. Para a notação escrita na cifra, substitua `{sos}` / `{start_of_score}` por `{x_titan_start_of_score}` e `{eos}` / `{end_of_score}` por `{x_titan_end_of_score}`, mantendo os atributos e o conteúdo. O consumer precisa atualizar as cifras salvas e qualquer código que monte ou leia esses trechos; `ParsedScore.from` passa de `sos` para `x_titan_start_of_score`. Os nomes anteriores não são reconhecidos.

### Fixed
- **Slides grandes demais no projetor:** uma linha da cifra que junta duas frases (a segunda começando com maiúscula) vira um slide só daquelas duas linhas. Duas linhas longas e independentes deixam de ir no mesmo slide — vale para o Louvor JA e para o PowerPoint.
- **Demo público:** ao abrir uma pull request, o Cloudflare publica um preview do demo. O site de demonstração usa o mesmo build. Importar cifra pelo Cifra Club e a duração do YouTube seguem em `/__cifra_fetch` e `/__youtube_duration`.
- **Metadados no tema escuro:** os cartões de duração, andamento, compasso e tom deixam de ter contornos brancos fortes. O campo **Referência** ganha a mesma altura e aparência do campo de endereço do Cifra Club.
- **Diagramas de acorde no celular:** os botões Violão, Ukulele e Piano ficam mais altos e afastados da borda inferior para facilitar o toque. No piano, as teclas pretas marcadas mostram melhor a cor do acorde, e cada grau aparece dentro de um círculo claro ou escuro para continuar legível com as cores escolhidas pelo app.
- **Leitura parada ao esconder os controles:** ao tocar na cifra para ocultar a barra inferior, a letra continua na mesma posição, inclusive em tela cheia. O espaço reservado para a barra não encolhe durante a leitura.
- **Abrir e recolher TAB/partitura pelo título:** no celular, toque em qualquer ponto do cabeçalho do solo, incluindo o nome e a seta, para mostrar ou ocultar o trecho. O toque no título não esconde mais os controles da cifra, mesmo quando a lista de ensaio permite deslizar para outra música.
- **Importar solo em `.gp` no iPhone e iPad:** em Editar → Guitar Pro / MusicXML, Escolher arquivo abre sem o filtro que bloqueava `.gp` no seletor do aparelho. Depois da escolha, a janela confere o formato, mostra a prévia e guarda o arquivo original ao salvar o trecho.
- **Recolher e abrir TAB/partitura no celular:** o toque na seta do trecho volta a funcionar durante uma lista de ensaio. A área de troca de música não cobre mais a seta, e o espaço abaixo da cifra permite tocá-la novamente quando o trecho está recolhido.
- **Tela cheia durante a leitura:** ao entrar e sair no meio da cifra, a linha que você estava lendo permanece sob os olhos mesmo quando a área útil muda de altura.
- **Posição do Guitar Pro ao soltar:** ao arrastar um trecho para depois da introdução, o editor usa o ponto em que você solta o bloco, inclusive se a página rolou durante o gesto. A posição anterior do ponteiro não mantém mais o trecho no começo da cifra.
- **Ajustar compassos de um solo:** trechos válidos de Guitar Pro/MusicXML que começam depois de uma ligadura voltam a abrir em TAB, partitura e PDF, sem o erro “Cannot read properties of null”. O arquivo original e as ligaduras dentro do trecho são preservados.
- **Mover solos na cifra:** ao arrastar um bloco enquanto rola a página, o destino acompanha a posição atual dos blocos. Soltar depois de um refrão mantém o solo ali ao salvar, inclusive após duplicar e ajustar o trecho.
- **Durações na TAB:** nos modos Ritmo na base e Ritmo estendido, mínimas e semínimas usam uma haste só. Na base, a mínima tem metade da altura da semínima; ao estender, a mínima mantém o tamanho e a semínima cresce até a nota. A correção vale também para o PDF. A revisão cobre semibreves, barras e bandeirolas até semifusas, pausas, pontos de aumento e quiálteras.
- **Controles da TAB mais compactos:** TAB, Partitura, Ritmo e Zoom ficam na mesma linha, com altura e espaçamento iguais. No celular, os detalhes aparecem ao abrir o menu; no computador, continuam visíveis. O zoom automático passa a se chamar Auto.
- **Padrão ao cadastrar solos:** novos trechos Guitar Pro/MusicXML começam com Ritmo na base selecionado. Ao ajustar um trecho existente, sua escolha é preservada.
- **Inserir solos no demo:** salvar um Guitar Pro/MusicXML na cifra funciona também quando o navegador não oferece `crypto.randomUUID`, como no acesso por HTTP na rede local. O arquivo é guardado antes de inserir o trecho; o armazenamento também foi ajustado para o WebKit, preservando a leitura dos anexos antigos.
- **Importar e ajustar solos:** a janela separa arquivo, opções e prévia, com espaço para ler no computador e no celular. Faixa e ritmo usam os seletores do Titan. Escolha os compassos por um intervalo com duas alças ou digite início e fim; a seleção respeita os limites do arquivo e mostra quantos compassos entram na cifra.
- **Criar solo de Guitar Pro/MusicXML:** escolha o arquivo no aparelho, sem precisar informar um endereço. A opção de inserir aparece quando o app permite guardar o arquivo; solos já inseridos continuam permitindo ajustar a faixa e os compassos.
- **Remover e ajustar solos:** na edição Para todos, cada trecho de partitura tem o botão Excluir trecho. Arquivos Guitar Pro/MusicXML oferecem Ajustar trecho (arquivo, faixa e compassos), sem abrir o editor de notas do Titan. Um bloco inválido avisa que precisa ser removido e importado novamente.
- **Zoom dos solos:** ao abrir o zoom de um trecho Guitar Pro/MusicXML, as opções seguem o tema claro ou escuro do Titan e destacam o tamanho selecionado. Também é possível escolher pelas setas do teclado e fechar com Escape.
- **Indicador no início da linha:** ao editar, o marcador da posição do acorde e seu brilho aparecem inteiros junto à primeira letra, também nas linhas que quebram na tela estreita.

### Added
- **Solos lembram como você os deixou:** ao ler um trecho Guitar Pro/MusicXML, escolha TAB ou Partitura e use a seta no título para mostrar ou ocultar. Ao voltar à mesma música, o trecho reaparece do mesmo jeito; outras músicas mantêm suas próprias escolhas.
- **Sugerir solos Guitar Pro/MusicXML:** ao alterar ou inserir um solo em Minha versão e tocar em Sugerir, o arquivo original vai junto com o pedido. Em Sugestões dos músicos, o responsável vê o trecho antes e depois, com nome, arquivo, faixa e compassos, e pode abrir TAB ou Partitura na revisão. Ao aceitar, o arquivo é guardado para todos antes de atualizar a cifra; se falhar, o pedido continua pendente.
- **Arrastar solos no computador:** em Importar solo ou Ajustar trecho, arraste um arquivo Guitar Pro/GPX ou MusicXML para a área do arquivo. A área destaca onde soltar e abre a prévia para escolher faixa e compassos; o envio acontece ao salvar o trecho. O botão Escolher arquivo continua disponível.
- **Solos com nome e mais espaço:** ao cadastrar ou ajustar Guitar Pro/MusicXML, informe o nome do trecho (padrão Solo). Esse nome aparece na cifra e no PDF, no lugar dos detalhes de faixa, compassos e tom original. Na cifra, a seta discreta no canto do card mostra ou oculta o conteúdo sem esconder o título; o botão deixa de flutuar. Os cards aproveitam mais largura no computador e se ajustam à tela do celular.
- **Três formas de ler a TAB dos solos:** ao criar ou ajustar um trecho Guitar Pro/MusicXML, escolha o padrão com ritmo estendido, ritmo somente na base ou sem ritmo. Durante a leitura, cada pessoa pode mudar em Ritmo da TAB; a escolha fica salva no navegador e acompanha o PDF, sem editar a cifra nem mudar o padrão do autor. Padrão do trecho volta à escolha original.
- **Abrir o demo para testar:** `pnpm dev` mostra o endereço disponível e escolhe outra porta quando necessário. Com `pnpm dev --tailscale`, você pode abrir o demo em outro aparelho conectado à mesma rede Tailscale; Ctrl+C encerra o servidor.
- **Cifra completa (.zip):** em Exportar, baixe a cifra junto com solos Guitar Pro/MusicXML, imagens, cantado, playback e capas/fundos. O pacote troca os endereços por arquivos locais para não depender dos servidores de origem. YouTube/Spotify ficam apenas como informação de origem. Se um anexo falhar, a janela avisa e não baixa um pacote incompleto.
- **Ocultar TAB e partitura durante o ensaio:** cada bloco tem um botão para recolher a referência e abrir de novo. A rolagem continua no mesmo ponto da música, mesmo quando o trecho ocultado ocupa várias telas; com a rolagem parada, a letra que você estava lendo permanece no lugar. Ocultar não altera a cifra nem o PDF.
- **Solo com o visual do Titan:** o trecho mostra somente os compassos escolhidos, sem diagramas de acordes, capa, afinação ou rodapé do arquivo. TAB e partitura acompanham as cores claras/escuras da cifra. Ao importar, a prévia começa com até quatro compassos para você ajustar o trecho. O PDF usa o mesmo desenho enxuto em cores para papel.
- **Solos desenhados no PDF:** em Exportar → Documento, escolha **TAB**, **Partitura** ou **Nenhum** e confirme em **Gerar PDF**. Os trechos Guitar Pro/MusicXML entram desenhados no papel, com os compassos escolhidos, em tamanho de leitura e com quebra de página. Se um arquivo não tiver TAB ou não puder ser aberto, a janela avisa e permite corrigir a escolha.
- **Solos de Guitar Pro e MusicXML:** ao editar, toque no + entre os blocos e escolha **Guitar Pro / MusicXML**. Abra o arquivo, selecione a faixa e os compassos e confira o trecho antes de salvar. Na leitura, alterne entre **TAB** e **Partitura**; o zoom automático mantém as notas grandes e reorganiza os compassos conforme a tela. Também há zoom manual. Arquivos sem posições nas cordas ficam em Partitura. O solo mantém o tom do arquivo original.

### Changed
- **Metadados da cifra:** no computador, dados da música e referências aparecem lado a lado, com título, duração, andamento, compasso e tom visíveis sem rolar a janela. No celular, alterne entre **Dados da música** e **Referências e ações**; o botão **Aplicar** permanece à mão, o que foi digitado continua ao trocar de aba e o teclado só abre quando você toca num campo.
- **Demo de sugestões com arquivo:** em Só para mim, importe um solo e envie pela Minha versão; em outra aba do mesmo navegador, abra Para todos para revisar e aceitar. A sugestão, o arquivo e a cifra oficial continuam disponíveis após atualizar a página. O guia do consumer traz o exemplo de integração para fazer esse fluxo funcionar entre aparelhos.
- **Referências de solos no ChordPro:** ao importar Guitar Pro/MusicXML, cada trecho passa a ocupar uma única linha `{x_titan_score: src="…" track=1 start=1 end=4}`. O arquivo exportado usa essa mesma forma, sem um bloco vazio nem tag de fechamento.
- **Onde o acorde prende na letra:** ao editar, a linha abre o mesmo espaço da leitura para o acorde caber, também no meio da palavra. Um traço vertical fino, com brilho suave e um pequeno ponto no topo, indica a posição exata do acorde.
- **Imagem na cifra:** em Inserir, dá para enviar uma foto ou um arquivo (JPG, PNG, WebP ou GIF). O app guarda o arquivo; a cifra fica só com o nome. Sem um app para guardar, o item não aparece.
- **Inserir no lugar:** no modo de edição, o + fica entre os blocos, no ponto em que o trecho novo entra. O botão Inserir solto da barra saiu.
- **Cifra no meio da linha:** ao editar a letra, o botão Cifra coloca o acorde onde o cursor está.
- **Arrastar o acorde no toque:** a letra em volta não fica mais selecionada enquanto o acorde se move.
- **Comentário de ensaio:** o texto de `{c:}` (e as notas de execução) fica maior e reto, para ler de pé, colado no bloco de baixo — é o rótulo daquele trecho. Continua cinza lavado, menor que a letra, sem caixa alta forçada — a música segue na frente.
- **Rolar no tablet e no computador:** o botão Rolar na barra de baixo fica na cor do acorde, como no celular. Enquanto a cifra sobe, o botão vira Parar na cor da pílula.
- **Metrônomo marca tempo e contratempo:** no painel, ligue **Faixa do título** e inicie. A barra do título acende na cabeça de cada tempo e apaga no meio — o pulso e o contratempo do compasso. No 1 a faixa inverte (preto ou branco do tema); nos 2, 3 e 4 pinta na cor do acorde. Na coluna à esquerda o 1 é preto ou branco; 2, 3 e 4 pulsam na cor do tema e ficam visíveis. Rolar sozinho não liga a faixa.

## [0.10.0] - 2026-09-26

### Added
- **Anterior e próxima na Central de Mídia:** num ensaio com duas ou mais músicas, os botões de pular da tela de bloqueio, da Central de Mídia e do fone passam para a cifra seguinte (ou a de trás) da lista. No iPhone esses botões só aparecem no lugar dos ±10 s — os ±10 s continuam no player da cifra. No Chrome do Android, a notificação mostra o mesmo par. Sem áudio na cifra da vez, a sessão some. Demo: `/standalone-lista.html?audio=1`.

### Fixed
- **Troca de música no ensaio:** pular para a próxima recomeça o áudio do zero. Cada cifra da lista de demo com `?audio=1` leva uma faixa diferente, para ouvir a troca.

## [0.9.0] - 2026-09-25

### Added
- **Central de Mídia:** com o áudio de referência tocando, a tela de bloqueio e a Central de Mídia mostram o nome da música, o artista e a capa. Play, pause e ±10 s nos botões do aparelho. Capa da cifra: quadrado **1024 × 1024 px**. Sem arte na cifra, o consumer manda a da marca (`defaultAudioArt`); sem as duas, o Titan usa a arte genérica. Demo: `/media.html` (e `/media.html?capa=0` para a capa padrão).
- **Link de cantor ou de cifra:** o site pode abrir o Titan já em **Letra** ou já em **Cifra** (`lens="letra"` / `lens="none"`). Um endereço com a letra já na tela serve para o vocal. Sem a prop, continua valendo a última escolha deste aparelho.
- **Diagramas de acorde:** toque no acorde abre violão, ukulele ou piano em tela cheia. O instrumento fica no aparelho. Violão e ukulele mostram a forma da mão (capo no braço quando há). Piano mostra as teclas no tom que soa, com inversões e o baixo escrito. Fecha com X, Escape ou puxar para baixo. Só letra não abre. O host desliga com `capabilities.diagrams: false`.

### Changed
- **Capa da cifra:** o host manda um quadrado **1024 × 1024** (antes 256–512) para a tela de bloqueio e a Central de Mídia.

### Fixed
- **Troca de música no ensaio:** o selo (Próxima / Anterior) sobe e fica acima do dedo, para não sumir atrás da mão.
- **Ensaio no iPhone:** toque em Rolar e em Mais volta a funcionar na setlist. Os trilhos de troca de música terminam acima do dock e um toque nesses botões não arma o swipe.
- Com o diagrama do acorde aberto, a barra de espaço não começa a rolagem.
- Na revisão de sugestões, a faixa de batida no topo do lote só aparece quando o pedido muda a batida. Apagar letra numa cifra que já tem batida não mostra mais a batida como se fizesse parte do pedido.
- Aceitar um ajuste, quando ainda há outros, deixa a tela de sugestões aberta. Gravar a cifra não fecha a revisão no meio.

## [0.8.0] - 2026-09-24

### No celular, o áudio de referência fechado é um fone

Na mesma linha de **Cifra** e **Letra** aparece um fone. Toque nele e abre o player, com capa e os botões de tocar.

Enquanto a música toca, o fone fica na cor do acorde e mostra uma onda entre as conchas.

Se você esconde a barra (toque na cifra, ou a rolagem que guarda os controles), o player grande fecha. O fone continua na linha, e a música segue tocando.

No computador o player fechado continua o mesmo de antes: um chip com o título da música, acima da barra.

Tocar a música não deixa mais a barra presa na tela. Dá para esconder os controles com o áudio ligado.

### Importar do Cifra Club

A cifra passa a ser lida pelo que está escrito: acorde, letra e nome da parte. Não depende mais do nome das classes no HTML da página.

Tablatura no meio da música sai fora, junto com a linha de acordes que só mostra o que a tab toca. Visto em Tu És, Tua Vontade, Unidos em Cristo e Meu Farol.

### Demo

Quando a página do Cifra Club não vem (o site responde bloqueado), a demo busca a versão na API e monta a cifra que o leitor já sabe abrir. O tom usado é o das formas da página, não o outro tom que a API manda junto. Se a página chega inteira, ela é usada como veio.

## [0.7.0] - 2026-09-24

### Added
- **Áudio de referência no ensaio:** `setRehearsalAudio(cho, { sung, playback, art: { url, width, height } })`. Cantado e/ou playback (qualquer combinação, inclusive nenhuma). Chip no dock abre o card (capa, título, artista, play, seek, ±10 s); X fecha sem parar. Não sincroniza letra nem `{duration:}`. Capa: o host manda o arquivo já no tamanho (256–512 px) + `width`/`height`; sem capa, arte genérica 512×512. Arquivo direto ou GET de stream; YouTube recusado. Cache keyed pela URL. `{x_audio:}` / `{x_audio_cantado:}` legado lê como sung.

### Changed
- **Diretivas custom em inglês:** `{x_source:}` (antes `{x_origem:}`), `{x_audio_sung:}` (antes `{x_audio_cantado:}`). Leitura aceita as chaves antigas; a próxima gravação reescreve. UI em português (Origem, Cantado, Playback).
- **Tom original + transposição gravada.** `{key:}` é o tom original. Reescrever (import e ficha) grava o corpo nesse tom e `{transpose:N}` para a leitura continuar onde estava (082: Ab no arquivo, tela em G). `{capo:}` no arquivo é dica, não liga o capotraste. Overlay não soma no `{transpose:}`. Uma reescrita uniforme da cifra vira um único trecho de sugestão, não um por linha.

### Fixed
- **Cantado / Playback:** no card, um rótulo discreto (não tabs), com mais espaço sob o título. Sem capa do host, o player usa uma arte padrão. Com uma faixa só, o rótulo continua mostrando o que está tocando.
- **Play da referência:** no card aberto o play é o centro do transporte; −10 / +10 ficam mais suaves.
- **Chip da referência:** sólido sobre a cifra (canvas, sem véu). Mini-player flutuante; toque abre o card.
- **Player de referência no celular:** o chip e o card ficam no centro do dock, não colados à esquerda.
- **Comentários de ensaio:** aside da cifra — itálico entre parênteses, menor que a letra, cinza misturado no papel (claro e escuro). Sem card. Colado no bloco de baixo (o que ele rotula). Não usa `--lyric` nem `--chord`. Refrão/TAB mantêm as caixas. Continuam papel no auto-scroll, não relógio.
- **Auto-rolagem, intro compacta:** a página não anda enquanto a introdução tocada (acordes + `x///`, sem letra) está no topo. A rampa começa na primeira linha cantada, ou na linha de leitura se a intro for mais alta que um terço da tela (TAB). Em *Nasce em Mim* a letra deixava de subir no começo. Relógio e metrônomo seguem no tempo da cifra.
- **`{tempo:65 BPM}`:** o relógio lê 65, não o default 100.

## [0.6.0] - 2026-09-19

### Added
- **`persistSuggestion`:** o consumer confirma o POST da sugestão (`return` da Promise), lida na hora do envio. Resolve → enfileira + “Sugestão enviada” + emit `suggestion-created` (notify, não o save). Reject ou `void` (sem Promise) → nada na fila, mantém Minha versão, “Não foi possível enviar. Tente de novo.” Reverter fica bloqueado enquanto envia. Sem a prop, o fluxo local continua otimista.

### Changed
- **Swipe no ensaio:** o centro da cifra só rola. Troca de música é deslize na borda (64px no celular, 128px no tablet; esquerda depois dos 24px do Safari). Sem flick de velocidade, sem carimbo Tinder, sem a cifra deslizando 38%. Autoscroll pausa no peek.

### Security
- **jsPDF 4.2.1** (antes 2.5.2): fecha os CVEs do Dependabot na geração de PDF. Fontes continuam em VFS; o export da cifra não muda de API.
- **vitest 4.1.11** (antes 3.2.7): fecha CVE-2026-84373 no `@vitest/mocker` (dev-only).
- **esbuild ≥ 0.28.1** (`pnpm-workspace.yaml` overrides; tsup puxava 0.27.7): fecha GHSA-g7r4-m6w7-qqqr no serve Windows, que este repo não usa.

## [0.5.0] - 2026-09-18

### Added
- **Swipe no ensaio:** no celular, arrastar a cifra para a esquerda (próxima) ou direita (anterior) pinta um fade colorido com chevron. No limiar o selo vira **Solte para ir** (anel na cor do acorde). Soltar confirma e a cifra desliza; soltar antes volta. Rolar para baixo não troca.
- **Tela ligada:** enquanto o viewer está aberto, pede Screen Wake Lock para o aparelho não apagar no ensaio. Sempre ativo, sem botão; rearma quando a aba volta a ficar visível. HTTPS. Sem a API, não faz nada.

## [0.4.0] - 2026-09-17

### Added
- **Começar de novo (Metadados, Para todos):** confirmação explícita abre Nova cifra (Cifra Club / arquivo / texto / branco). A cifra atual só some ao concluir; cancelar Nova mantém o corpo. Ausente no editar Só para mim.
- **Editor de batida (B0–B3):** criar/editar `{x_strum:}` na folha Batida em **Só para mim** e **Para todos**, multi `{x_strum_set:}`, conflito enrich Manter/Trazer CC. Local grava overlay e pode sugerir; o merge rotula e aplica `{x_strum:}`.
- **Presets de batida (host-owned):** prop `strumPresets`, capability `batidaPresets`, evento `save-strum-preset` (`{ id?, label, pattern }`). O pacote não embute nem persiste catálogo — o consumer gerencia.

### Changed
- **Demo boot:** o HTML pinta o chrome na hora com “Preparando a cifra…”; Vue, corpus, PDF e samples de batida entram depois. `standalone.html` deixa de ficar preto até o grafo inteiro.
- **Batida de leitura no desktop:** a faixa (`StrumStrip`) preenche a largura da cifra com setas maiores para acompanhar o pulso; no celular permanece compacta.
- **Enrich Cifra Club — batida keep-local:** se a cifra já tem `{x_strum:}`, `proposeCifraClubEnrich` não sobrescreve a batida local; só preenche quando a chave está ausente.
- **Sugerir alteração:** segundo toque confirma (“Confirmar — enviar”); sem `window.confirm`.
- **Batida em Só para mim:** criar/editar fica no dock local; salvar não emite o oficial — vai para overlay + Sugerir. A máscara de merge nomeia “Batida nova/alterada/removida” em vez de um trecho vazio.
- **Revisão de sugestão:** o responsável vê o nome de quem enviou e a batida em faixa visual (não só `{x_strum:}`). Enviar exige identificação.
- **Preview da batida:** a faixa cabe na coluna (sem barra horizontal em tela larga); as setas encolhem antes de rolar.
- **Diff visual da batida:** numa alteração, o visualizador marca o que mudou (destaque + seta riscada do que era), em vez de duas faixas cruas.
- **Badge de sugestões:** pílula verde com contador, pulso e fica à vista no celular e no zen — não some com o chrome.

### Fixed
- **Sugerir sem nome:** o campo marca erro (“O nome é obrigatório”) em vez de virar “Confirmar — enviar” e parecer travado. O toast sobe acima do painel.
- **Rolar com metrônomo vinculado:** o badge “Fim da música” some no segundo Rolar, mesmo durante a contagem de entrada.
- **Folha Batida multi:** Salvar fica desligado enquanto algum padrão do conjunto ainda está vazio.

## [0.3.0] - 2026-09-13

### Changed
- **Hint do capotraste:** em vez de só "Formas de X", mostra os acordes distintos da cifra como chips no estilo do badge do viewer (menores e mais discretos), numa linha com scroll horizontal quando não cabem — sem prosa e sem crescer a altura do bloco.

### Fixed
- **Só letra:** espaçamento compacto para leitura vocal (sem o gap de ensaio da cifra).
- **Setlist de busca no celular:** sobe acima do teclado.
- **Zen:** mostra só o nome da música, sem réplica do card.

## [0.2.0] - 2026-09-12

### Added
- **Prop `lens` / `hideComments`:** o host abre o viewer já em Só letra (`lens="letra"`), Nashville ou com comentários ocultos — URL de cantor sem depender do UI. Emite `update:lens` / `update:hideComments`. Demo: `?lens=letra`, `?comentarios=0`. Docs: `docs/CONSUMER.md` §8, `README` props.
- **Reescrever no tom (cifras já cadastradas):** quando `{key:}` não bate com os acordes (082, capo usado como transposição de banda), a ficha e a folha de tom oferecem **Reescrever em Ab**. Grava o corpo no tom declarado, tira o capo falso e guarda `{transpose:N}` para a leitura continuar no tom tocado.

### Changed
- **Cifra | Letra no chrome, sem menu Lentes.** Um toque troca o modo (banda = cifra, vocal = letra). Nashville e comentários de ensaio ficam na barra larga e, no celular, como itens diretos do menu Mais. `L` alterna cifra/letra. A prop `lens` do host não muda.
- **Capo sem dual:** a cifra vira as formas do capo (quem toca sozinho). Dual continua com as duas cifras. O hint só nomeia o tom das formas.
- **Import e “Reescrever” usam o mesmo `rewriteToKey`.** Se `{key:}` não é o tom dos acordes e o capo é esse intervalo, o import **mostra** tom declarado / escrita / capo e só reescreve depois de confirmar. Capo de verdade (tom = o que está escrito) permanece.

### Fixed
- **Pulso do metrônomo na barra do título:** no tempo 1 a pílula do tom inverte como superfície própria — “Tom”, acorde, +/capo e o divisor continuam legíveis e não se colam. A faixa ainda vira tinta; os chips não herdam a cor do fundo. Superfície pintada na barra entra em `.cpv-head-chip` (único alvo do invert); `tests/vue/head-chip.test.ts` recusa peça nova sem a classe.
- **Sheet de tom e metrônomo:** reset e dual já ocupam o lugar, desligados no estado original — mudar tom/capo/BPM não estica o sheet.
- **Lente no ensaio:** trocar de música na lista não desliga mais Só letra / Nashville nem reexibe comentários que o músico tinha ocultado.
- **Lente Só letra — marcas de relógio:** `x///`, `//`, `x`, `/_`, `/-` e `x...` não vazam mais na letra quando o acorde some (`razão.[E]//` → `razão.`, `Amém[G]x` → `Amém`). `cami/nhar` e a letra x em palavras (Exaltado) ficam. Rescan: 149 fixtures limpas. SoT: `docs/MARCAS-X.md` § Lente Só letra.

### Notes
- Feature = MINOR, bugfix = PATCH. `0.1.1`–`0.1.3` foram features lançadas como patch; a linha `0.2` começa aqui. Pin `~0.2.0` se o host só quer bugfix. Chooser: `pnpm release`.

## [0.1.3] - 2026-09-12

### Added
- **Enrich Cifra Club em cifra existente:** Metadados → “Completar com Cifra Club” traz `x_strum` / `x_origem` / buracos fill-empty **sem** substituir o corpo; YouTube pede escolha com embeds lado a lado. Core: `proposeCifraClubEnrich` / `applyCifraClubEnrich`.
- **CLI `enrich-cc`:** batch/servidor — `--url` + `--in`/`--out` + `--youtube remote|skip` (corpo intocado).
- Aviso na UI quando a página do CC não traz batida (`strummings` ausente).

### Notes
- Produção (SDA): `docs/HANDOFF-CC-ENRICH-PRODUCAO.md` · mapa `artifacts/cifraclub-url-map.json` keyed por `chordpro_id`/`song_id` (`scripts/discover-cifraclub-urls-from-db.mjs`).

## [0.1.2] - 2026-09-11

### Added
- **Import Cifra Club — meta rica:** `{tempo:}`, `{time:}`, `{capo:}` (acordes do CC são formas; o arquivo grava o que soa), `{x_youtube:}`, `{x_strum:}`.
- **Duração via YouTube:** host busca a watch page; preenche `{duration:}` na ficha (clipe, não a videoaula).
- **Batida visual:** setas cheia/vazia com 4 essências (normal / acento / mute / abafada); botão mostrar/ocultar; pulso fino alinhado ao metrônomo; faixa fixa que sobe no zen/tela cheia.

### Notes
- Host novo: passar `fetchYoutubeDuration` além de `fetchChart` (demo: `/__youtube_duration`).
- Contrato da batida: `.ai/memory/plano-import-cifraclub-2026-09-11.md`.

## [0.1.1] - 2026-09-11

### Added
- Máscara **MM:SS** no campo de duração da Nova cifra (igual ao diálogo de metadados).

### Fixed
- **Auto-rolagem:** o padding do título e a legenda do capo não comem tempo da intro. A primeira estrofe de `009 - Verdadeira alegria` permanece na tela o tempo do `{duration:}` (não os 14 s da estimativa de linha). Testes de relógio usam só dados da cifra (`{duration:}`, `{tempo:}`, `x///`); gate contra `BEATS_PER_ROW` como duração de verso.
- **Chrome de edição:** header em card flutuante como o de leitura; Metadados no cluster de ações, sem faixa full-bleed.
- **Import Cifra Club:** ignora tablaturas `.tabs`, não perde rótulos de seção no `.kvMV` aninhado, normaliza Intro → INTRODUÇÃO.
- **Metrônomo:** só o tempo 1 usa a cor do tema; 2–4 pulsam com `--beat-rest` no claro e no escuro.

[Unreleased]: https://github.com/henryavila/titan-chordpro-ui/compare/v0.10.0...HEAD
[0.10.0]: https://github.com/henryavila/titan-chordpro-ui/releases/tag/v0.10.0
[0.9.0]: https://github.com/henryavila/titan-chordpro-ui/releases/tag/v0.9.0
[0.8.0]: https://github.com/henryavila/titan-chordpro-ui/releases/tag/v0.8.0
[0.7.0]: https://github.com/henryavila/titan-chordpro-ui/releases/tag/v0.7.0
[0.6.0]: https://github.com/henryavila/titan-chordpro-ui/releases/tag/v0.6.0
[0.5.0]: https://github.com/henryavila/titan-chordpro-ui/releases/tag/v0.5.0
[0.4.0]: https://github.com/henryavila/titan-chordpro-ui/releases/tag/v0.4.0
[0.3.0]: https://github.com/henryavila/titan-chordpro-ui/releases/tag/v0.3.0
[0.2.0]: https://github.com/henryavila/titan-chordpro-ui/releases/tag/v0.2.0
[0.1.3]: https://github.com/henryavila/titan-chordpro-ui/releases/tag/v0.1.3
[0.1.2]: https://github.com/henryavila/titan-chordpro-ui/releases/tag/v0.1.2
[0.1.1]: https://github.com/henryavila/titan-chordpro-ui/releases/tag/v0.1.1

## [0.1.0] - 2026-09-11

### Added
- First public release of **`@henryavila/titan-chordpro-ui`**.
- **Core** (framework-free): ChordPro/OnSong parse → ViewModel, transpose, controller, HTML themes, timeline/`x///`, lint, overlay storage seam, lyrics-for-slides.
- **PDF** entry (`@henryavila/titan-chordpro-ui/pdf`) via jsPDF.
- **Slides** entry (`@henryavila/titan-chordpro-ui/slides`) — LouvorJA `.slja` export.
- **Vue UI** (`@henryavila/titan-chordpro-ui/vue`): `<ChordproViewer>` with tom/capo, rolagem, tema, lente, metrônomo, ensaio/setlist, export CHO/PDF/slides, edição por bloco, overlay pessoal, editor de partitura (VexFlow peer).
- CLI bin `titan-chordpro-ui` (`html` | `pdf` | `slides` | `parse`).
- Consumer guide: `docs/CONSUMER.md`.

### Notes
- Pre-1.0 (`0.x`): minor bumps may include breaking API changes. Pin with `~0.1.0` if you want patch-only updates.
- Peers: `vue` (required for UI), optional `vexflow` (`{sos}`/`{sot}`), optional `pdfjs-dist` (PDF text import).

[0.1.0]: https://github.com/henryavila/titan-chordpro-ui/releases/tag/v0.1.0
