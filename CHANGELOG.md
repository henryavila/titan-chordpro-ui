# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Áudio de referência no ensaio:** o consumer grava `{x_audio_sung:}` e/ou `{x_audio_playback:}` (`setAudioUrl(cho, url, kind)`). Qualquer combinação, inclusive nenhuma. Player próprio (play/pause, ±10s, seek, troca de faixa) — não sincroniza letra nem `{duration:}`. Arquivo direto ou GET de stream; YouTube recusado. Cache keyed pela URL. `{x_audio:}` / `{x_audio_cantado:}` legado lê como sung.
- **Diretivas custom em inglês:** `{x_source:}` (antes `{x_origem:}`), `{x_audio_sung:}` (antes `{x_audio_cantado:}`). Leitura aceita as chaves antigas; a próxima gravação reescreve.
- **Capa no player de referência:** `{x_audio_art:}` (`setAudioArt`). O card mostra capa, título e artista (`{artist:}` / `{subtitle:}`).
- **Abrir / fechar a referência:** chip **Cantado** / **Playback** no dock; o card now-playing abre por ele e fecha no X. Fechar não para o áudio.

### Changed
- **Nomenclatura:** README, CONSUMER, NAMING e o SoT de enrich ensinam as chaves em inglês (`{x_source:}`, `{x_audio_sung:}`). A UI continua em português (Origem, Cantado).

### Fixed
- **Play da referência:** no card aberto o play é o centro do transporte; −10 / +10 ficam mais suaves.
- **Chip da referência:** sólido sobre a cifra (canvas, sem véu). Mini-player flutuante; toque abre o card.
- **Player de referência no celular:** o chip e o card ficam no centro do dock, não colados à esquerda.
- **Comentários de ensaio:** aside da cifra — itálico entre parênteses, menor que a letra, cinza misturado no papel (claro e escuro). Sem card. Não usa `--lyric` nem `--chord`. Refrão/TAB mantêm as caixas. Continuam papel no auto-scroll, não relógio.
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

[Unreleased]: https://github.com/henryavila/titan-chordpro-ui/compare/v0.6.0...HEAD
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
