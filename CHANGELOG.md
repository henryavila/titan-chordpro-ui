# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Prop `lens` / `hideComments`:** o host abre o viewer já em Só letra (`lens="letra"`), Nashville ou com comentários ocultos — URL de cantor sem depender do UI. Emite `update:lens` / `update:hideComments`. Demo: `?lens=letra`, `?comentarios=0`. Docs: `docs/CONSUMER.md` §8, `README` props.
- **Reescrever no tom (cifras já cadastradas):** quando `{key:}` não bate com os acordes (082, capo usado como transposição de banda), a ficha e a folha de tom oferecem **Reescrever em Ab**. Grava o corpo no tom declarado, tira o capo falso e guarda `{transpose:N}` para a leitura continuar no tom tocado.

### Changed
- **Import e “Reescrever” usam o mesmo `rewriteToKey`.** Se `{key:}` não é o tom dos acordes e o capo é esse intervalo, o import **mostra** tom declarado / escrita / capo e só reescreve depois de confirmar. Capo de verdade (tom = o que está escrito) permanece.

### Fixed
- **Lente no ensaio:** trocar de música na lista não desliga mais Só letra / Nashville nem reexibe comentários que o músico tinha ocultado.
- **Lente Só letra — marcas de relógio:** `x///`, `//`, `x`, `/_`, `/-` e `x...` não vazam mais na letra quando o acorde some (`razão.[E]//` → `razão.`, `Amém[G]x` → `Amém`). `cami/nhar` e a letra x em palavras (Exaltado) ficam. Rescan: 149 fixtures limpas. SoT: `docs/MARCAS-X.md` § Lente Só letra.

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

[Unreleased]: https://github.com/henryavila/titan-chordpro-ui/compare/v0.1.3...HEAD
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
