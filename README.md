# chordpro-viewer

TypeScript library: **ChordPro → ViewModel → HTML themes → PDF**.

- **Generator (sibling):** [`titan-chordpro-lib`](../titan-chordpro-lib) — audio → `.chordpro`
- **Consumer (sibling):** Virtual SDA Nuxt — host chrome around this lib
- **Contract:** [`SPEC.md`](./SPEC.md) — read this before coding. Acceptance = table §9.

## Status

Spec only (v0.1 not scaffolded yet). Implementing agents start at SPEC §10.

## Lib vs host (one glance)

| Lib | Host |
|---|---|
| parse, transpose, HTML, themes, PDF, filename + scroll-speed helpers | toolbar UI, multi-cifra selection, auto-scroll RAF, sanitize, i18n, shell/player |

## Quick mental model

```
.cho | .chordpro | ChordPro string
        → parse() → ChordProView
        → transpose(n)
        → renderHtml({ theme: 'default' | 'print' })
        → renderPdf()   // entry chordpro-viewer/pdf
```

Input extensions: **`.cho`** and **`.chordpro`** (same format). Export text helper defaults to `.cho`.

## Fixtures

Real ChordPro from IASD Ermelinda (via SDA design-handoff). See `fixtures/` after extract step in SPEC §7.
