# Naming & layout (locked 2026-08-28; refocus 2026-08-28)

## Decision

| Piece | Role | Repo (target name) | Stack |
|---|---|---|---|
| **UI** | Viewer **+** editor (one layer) | **`titan-chordpro-ui`** (npm: **`@henryavila/titan-chordpro-ui`**) | TypeScript / Vue |
| **Generator** | Audio → `.chordpro` / `.cho` | **`titan-chordpro-gen`** — handoff: [`../titan-chordpro-gen/docs/REBRAND-HANDOFF.md`](../../titan-chordpro-gen/docs/REBRAND-HANDOFF.md) | Python |
| **App / studio** | Standalone Titan host (shell + editor + extras) | **`titan-chordpro`** (future; none today) | TBD |
| **SDA** | Church product host — **first consumer** | `sda-v2` (consumes **ui** only) | Nuxt |

**Layout:** **separate repos** (not a monorepo). Revisit monorepo only when **`titan-chordpro`** exists and wants to glue gen+ui in one CI.

**This repo** is **`titan-chordpro-ui`** (formerly seed folder `chordpro-viewer`). Rebrand checklist: [`REBRAND-HANDOFF.md`](./REBRAND-HANDOFF.md).

## Refocus (2026-08-28)

| Before | After |
|---|---|
| Nome / mental model: **viewer** | Nome alvo: **`titan-chordpro-ui`** (UI = leitura **+** edição) |
| Edição de acordes: out-of-scope | Editor **dentro** deste pacote (módulo / `./edit`), não um 3º repo |
| Consumer implícito | **Primeiro host:** `sda-v2` (embute a UI) |
| “Standalone” = demo sem shell | **Depois:** app **`titan-chordpro`** (host próprio: editor + outras coisas; consome a mesma UI) |

Fluxo de adoção:

```
titan-chordpro-ui  (este repo)
        │
        ├─► sda-v2          (1º: embute viewer+editor na cifra)
        └─► titan-chordpro  (depois: app standalone Titan)
```

O pacote UI continua **autossuficiente na cifra** (1 string ChordPro in → superfície completa). Shells (SDA, depois `titan-chordpro`) só fornecem produto em volta.

## Why not monorepo yet

- Only two packages; no `apps/studio` / `titan-chordpro` yet.
- Different toolchains (uv/pytest vs pnpm/vitest) — separate CI is cheaper.
- SDA depends on **ui** alone; publishing one npm package from its own repo is enough.

## Why rename `…-lib` → `…-gen`

`lib` is ambiguous once **ui** is also a library. **gen** = factory (ML/audio). **ui** = read + edit ChordPro.

## Why rename this repo `…-viewer` → `…-ui`

`viewer` undersells the product once the **editor** lives in the same layer. **ui** = the musician-facing surface for one chart (view + edit). The future **`titan-chordpro`** app is the *host*, not a rename of this package.

## Custom ChordPro tags (`x_*`)

Directive **names** in the file are English (`x_source`, `x_audio_sung`,
`x_audio_playback`, `x_audio_art`, `x_audio_art_w`, `x_audio_art_h`,
`x_youtube`, `x_strum`, `x_strum_set`).
Portuguese belongs in the **UI** (Origem, Cantado, Playback). Legacy
`{x_origem:}` / `{x_audio_cantado:}` / `{x_audio:}` still **read**; the next
`writeMeta` emits the English key.

## Non-goals of this decision

- Do not merge generator into the UI repo.
- Do not put SDA inside Titan naming.
- Editor stays **inside** `titan-chordpro-ui` (module/`./edit`), not a third repo.
- Do not build the `titan-chordpro` app shell in this repo (host is separate when it exists).
