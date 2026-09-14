# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Começar de novo (Metadados, Para todos):** confirmação explícita abre Nova cifra (Cifra Club / arquivo / texto / branco). A cifra atual só some ao concluir; cancelar Nova mantém o corpo. Ausente no editar Só para mim.
- **Editor de batida (B0–B3):** criar/editar `{x_strum:}` na folha Batida (só **Para todos**), multi `{x_strum_set:}`, conflito enrich Manter/Trazer CC.
- **Presets de batida (host-owned):** prop `strumPresets`, capability `batidaPresets`, evento `save-strum-preset` (`{ id?, label, pattern }`). O pacote não embute nem persiste catálogo — o consumer gerencia.

### Changed
- **Batida de leitura no desktop:** a faixa (`StrumStrip`) preenche a largura da cifra com setas maiores para acompanhar o pulso; no celular permanece compacta.
- **Enrich Cifra Club — batida keep-local:** se a cifra já tem `{x_strum:}`, `proposeCifraClubEnrich` não sobrescreve a batida local; só preenche quando a chave está ausente.

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

[Unreleased]: https://github.com/henryavila/titan-chordpro-ui/compare/v0.3.0...HEAD
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
