# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/henryavila/titan-chordpro-ui/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/henryavila/titan-chordpro-ui/releases/tag/v0.1.0
