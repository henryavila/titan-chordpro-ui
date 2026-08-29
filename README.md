# chordpro-viewer → **`titan-chordpro-ui`**

Viewer **+ editor** de cifra ChordPro (uma camada): core TypeScript + UI Vue + PDF.  
Nome alvo do repo/pacote: **`titan-chordpro-ui`**. Decisão: [`docs/NAMING.md`](docs/NAMING.md).

- **Product SoT:** [`docs/VISAO.md`](docs/VISAO.md) (se existir)
- **Engineering contract:** [`SPEC.md`](./SPEC.md) — acceptance = §9
- **Generator (sibling, repo separado):** **`titan-chordpro-gen`** (hoje `titan-chordpro-lib`) — audio → `.chordpro`
- **App Titan:** nenhum por agora
- **Consumer:** sda-v2 Nuxt — consome **só** a UI

## Status

Vision + SPEC aligned (Vue-first + core). Not scaffolded yet. Agents: `AGENTS.md` → SPEC §10.

## Core vs Vue vs host

| Core | Vue package | Host (sda-v2) |
|---|---|---|
| parse, transpose, controller, HTML themes, PDF, filenames, scroll math | cifra toolbar, RAF auto-scroll, theme light/dark/auto, export UX | shell, multi-cifra, sanitize, i18n, audio sync |

## Mental model

```
.cho | .chordpro | .onsong | string (ChordPro, OnSong, or mixed)
  → parse() → ChordProView          // engine normalizes formats
  → createViewerController / transpose
  → renderHtml({ theme: 'light' | 'dark' | 'print' })
  → Vue <ChordproViewer>  // UI completa 1 cifra (format-agnostic)
  → renderPdf()           // entry …/pdf
```

OnSong details: `docs/research-onsong-format.md`. Expansion later: `@…/react` or CE — not a fork, not a plugin registry.

## Fixtures

Real ChordPro (IASD Ermelinda via SDA design-handoff): `fixtures/`.
