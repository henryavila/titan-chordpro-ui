# Naming & layout (locked 2026-08-28; refocus 2026-08-28)

## Decision

| Piece | Role | Repo (target name) | Stack |
|---|---|---|---|
| **UI** | Leitura **+** edição (uma camada) | **`titan-chordpro-ui`** (npm: **`@henryavila/titan-chordpro-ui`**) | TypeScript / Vue |
| **Generator** | Audio → `.chordpro` / `.cho` | **[`titan-chordpro-gen`](https://github.com/henryavila/titan-chordpro-gen)** | Python |
| **App / studio** | Standalone Titan host (shell + editor + extras) | **`titan-chordpro`** (future; none today) | TBD |
| **SDA** | Church product host — **first consumer** | `sda-v2` (consumes **ui** only) | Nuxt |

**Layout:** **separate repos** (not a monorepo). Revisit monorepo only when **`titan-chordpro`** exists and wants to glue gen+ui in one CI.

**This repo** is **`titan-chordpro-ui`** (formerly seed folder `chordpro-viewer`). The repository rename is recorded in the [historical handoff](./REBRAND-HANDOFF.md).

## Solution identity (updated 2026-10-01)

The code and the host-facing component are **TitanChordpro**. The repo, npm
package and CLI remain `titan-chordpro-ui`; the future `titan-chordpro` app is
still a separate host. This decision supersedes the component/CSS/controller
locks in the 2026-08 repository handoff.

| Surface | Current name |
|---|---|
| Vue component | `TitanChordpro` (`./vue`, named and default export) |
| Parsed model | `TitanChordproDocument`, `TitanChordproSection`, `TitanChordproLine` |
| Controller | `createTitanChordproController`, `TitanChordproController`, `TitanChordproState`, `TitanChordproAction` |
| CSS / DOM | `titan-chordpro-*`, `--titan-chordpro-*`, `data-titan-chordpro-*` |
| Stored keys | `titan-chordpro:*` via `STORE_KEYS` |

No compatibility aliases are exported or emitted. Consumers must update
component imports, TypeScript names, CSS overrides, DOM selectors and storage
key mappings together; see [`CONSUMER.md`](./CONSUMER.md). Existing `cpv:*`
data is not read by the package. A host that needs it must copy it to the new
keys before updating. The `view` / `edit` modes, ChordPro input syntax,
`x_titan_*` directives and `x///` clock marks retain their meaning and spelling.

Dated handoffs, research and implementation plans retain the symbols they used
at the time. They document history; this section and `CONSUMER.md` describe the
current package contract.

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
        ├─► sda-v2          (1º: embute leitura+edição da cifra)
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

## Custom ChordPro tags (`x_titan_*`)

As extensões do Titan usam `{x_titan_<name>: valor}`. O prefixo `x_`
identifica extensões ChordPro; `titan_` identifica o aplicativo, conforme a
[convenção oficial](https://www.chordpro.org/chordpro/chordpro-directives/#custom-extensions).

Os nove metadados são em inglês: `x_titan_source`, `x_titan_audio_sung`,
`x_titan_audio_playback`, `x_titan_audio_art`, `x_titan_audio_art_w`,
`x_titan_audio_art_h`, `x_titan_youtube`, `x_titan_strum`, `x_titan_strum_set`.
Português pertence à UI (Origem, Cantado, Playback).

A notação também usa o namespace: `{x_titan_score: src="…" track=1 start=1}`
referencia um arquivo externo; `{x_titan_start_of_score: …}` e
`{x_titan_end_of_score}` delimitam a notação interna. Os nomes `score`, `sos`,
`eos`, `start_of_score` e `end_of_score` deixam de ser reconhecidos.
Essas três diretivas são conteúdo do documento, não campos de `ChartMeta`.
Novas extensões próprias devem sempre usar `x_titan_`, sem abreviações alternativas.

**Migração completa, sem retrocompatibilidade:** os nomes anteriores `x_source`,
`x_youtube`, `x_audio_*`, `x_strum`, `x_strum_set` e os aliases `x_origem`,
`x_audio`, `x_audio_cantado` não são interpretados nem convertidos automaticamente.
Arquivos e consumidores precisam usar as novas chaves. Diretivas desconhecidas
continuam preservadas no source, sem adquirir semântica Titan.
As propriedades de `ChartMeta`, `MetaKey`, `META_KEYS` e os patches usam os
mesmos nomes novos. Os helpers são `parseTitanStrum`, `formatTitanStrum`,
`parseTitanStrumSet` e `formatTitanStrumSet`, sem aliases dos nomes anteriores.
Diretivas padrão e marcas de tempo `x///` mantêm sua sintaxe.

## Non-goals of this decision

- Do not merge generator into the UI repo.
- Do not put SDA inside Titan naming.
- Editor stays **inside** `titan-chordpro-ui` (module/`./edit`), not a third repo.
- Do not build the `titan-chordpro` app shell in this repo (host is separate when it exists).
