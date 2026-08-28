# chordpro-viewer

Viewer/player de **uma** cifra ChordPro: **core TypeScript** + **UI Vue** (completa) + PDF.

- **Product SoT:** [`docs/VISAO.md`](docs/VISAO.md)
- **Engineering contract:** [`SPEC.md`](./SPEC.md) — acceptance = §9
- **Generator (sibling):** [`titan-chordpro-lib`](../titan-chordpro-lib) — audio → `.chordpro`
- **Consumer (sibling):** sda-v2 Nuxt — shell / multi-cifra / player around this package

## Status

Vision + SPEC aligned (Vue-first + core). Not scaffolded yet. Agents: `AGENTS.md` → SPEC §10.

## Core vs Vue vs host

| Core | Vue package | Host (sda-v2) |
|---|---|---|
| parse, transpose, controller, HTML themes, PDF, filenames, scroll math | cifra toolbar, RAF auto-scroll, theme light/dark/auto, export UX | shell, multi-cifra, sanitize, i18n, audio sync |

## Mental model

```
.cho | .chordpro | string
  → parse() → ChordProView
  → createViewerController / transpose
  → renderHtml({ theme: 'light' | 'dark' | 'print' })
  → Vue <ChordproViewer>  // UI completa 1 cifra
  → renderPdf()           // entry …/pdf
```

Expansion later: `@…/react` or CE binding against the same core — not a fork, not a runtime plugin registry.

## Fixtures

Real ChordPro (IASD Ermelinda via SDA design-handoff): `fixtures/`.
