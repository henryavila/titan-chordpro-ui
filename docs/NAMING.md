# Naming & layout (locked 2026-08-28)

## Decision

| Piece | Role | Repo (target name) | Stack |
|---|---|---|---|
| **UI** | Viewer **+** editor (one layer) | **`titan-chordpro-ui`** | TypeScript / Vue |
| **Generator** | Audio → `.chordpro` / `.cho` | **`titan-chordpro-gen`** (today: `titan-chordpro-lib`) — handoff: [`../titan-chordpro-lib/docs/REBRAND-HANDOFF.md`](../../titan-chordpro-lib/docs/REBRAND-HANDOFF.md) | Python |
| **App / studio** | Titan host shell | *none for now* | — |
| **SDA** | Church product host | `sda-v2` (consumes **ui** only) | Nuxt |

**Layout:** **separate repos** (not a monorepo). Revisit monorepo only when a Titan **app** exists and wants to glue gen+ui in one CI.

**This folder** (`chordpro-viewer`) is the **seed** of `titan-chordpro-ui` — rename when scaffolding starts in earnest.

## Why not monorepo yet

- Only two packages; no `apps/studio`.
- Different toolchains (uv/pytest vs pnpm/vitest) — separate CI is cheaper.
- SDA depends on **ui** alone; publishing one npm package from its own repo is enough.

## Why rename `…-lib` → `…-gen`

`lib` is ambiguous once **ui** is also a library. **gen** = factory (ML/audio). **ui** = read + edit ChordPro.

## Non-goals of this decision

- Do not merge generator into the UI repo.
- Do not put SDA inside Titan naming.
- Editor stays **inside** `titan-chordpro-ui` (module/`./edit`), not a third repo.
