# SPEC — `titan-chordpro-ui` v0.1

> **Audience:** implementing agent (and human reviewer). This is an **engineering contract**, not a visual mood board.  
> **Product SoT:** [`docs/VISAO.md`](docs/VISAO.md) (ratified). This SPEC implements that vision.  
> **Success = tests + CLI + Vue viewer package pass the acceptance table below.** Ambiguity → open a `question` in the PR, do not invent silently.

| Field | Value |
|---|---|
| Product / repo | **`titan-chordpro-ui`** (view **+** edit, one package) — formerly seed `chordpro-viewer` |
| Naming lock | [`docs/NAMING.md`](docs/NAMING.md) — **separate repos**; gen ≠ ui; **no Titan app / no monorepo for now** |
| Packages (npm) | **`@henryavila/titan-chordpro-ui`** with exports `"."` (core), `"./pdf"`, `"./slides"`, `"./vue"` |
| Repo path | `/Volumes/External/code/titan-chordpro-ui` |
| Sibling generator | **`titan-chordpro-gen`** — audio → ChordPro — **out of scope** |
| Sibling consumer | Virtual SDA Nuxt (`sda-v2`) — shell, multi-cifra, sanitize, i18n, player; depends on **ui** only |
| Editor | Same UI package (later `./edit` / module) — **not** a third repo |
| Stack (ratified) | **Vue-first UI** + **framework-free core** + agnostic controller; React/CE bindings later |
| Status | Vision + SPEC + naming locked → scaffold → green tests → UI |

---

## 0. Product amendment (supersedes older “lib-only” framing)

Older drafts treated toolbar/RAF as host-only. **VISAO + interview supersede that:**

- This product ships a **complete 1-cifra viewer UI** (transpose, font, auto-scroll, themes light/dark/auto, export CHO/PDF).
- **Core** stays framework-free (testable, CLI, future React port).
- **Vue package** owns cifra chrome + RAF (official binding v0.1).
- **Host (sda-v2)** owns shell, which ChordPro string is active (multi-cifra), login, audio sync, i18n copy, sanitize policy.
- **Not** a runtime multi-stack `VisualAdapter` in v0.1 — expansion = new binding against core/controller (see `docs/analysis-expansao-futura.md`).

---

## 1. Problem

Musicians need a **professional ChordPro viewer/player** (read / transpose / scroll / export / themes). Today that experience is trapped inside SDA Vue + `chordproject-parser` + ad-hoc CSS/PDF.

Ship:

1. **Core** — parse → ViewModel → HTML themes → PDF + controller (no Vue).  
   **Input formats (engine):** **ChordPro** and **OnSong** (incl. mixed / chords-over-lyrics). Normalize to the same `ChordProView`. UI does **not** select format. See `docs/research-onsong-format.md`.
2. **Vue UI** — complete 1-cifra surface (`ChordproViewer` SFC). Host Vue/Nuxt mounts it in-page (sized frame) and/or as a `100dvh` route. **Not** an iframe.
3. SDA becomes thin host (shell + multi-cifra). Titan can preview via core/CLI or a minimal Vue demo without the full SDA shell.

---

## 2. Non-goals (v0.1)

| Out | Why |
|---|---|
| Audio sync / SyncedPlayer | Belongs to SDA host |
| ChordPro **editor** / drag-to-correct | Future / Titan sibling |
| Titan ML / writer profiles | Generator stays in Titan |
| React / Lit / CE official package | Later binding — not v0.1 |
| Runtime VisualAdapter / plugin registry | YAGNI — see expansion analysis |
| Multi-cifra selection UI | Host state |
| i18n string catalogs | Host owns copy (Vue UI may accept label props) |
| HTML sanitize policy | Host owns (`DOMPurify` etc.) before `innerHTML` when embedding |

---

## 3. Boundary: core vs Vue package vs host

| Concern | Core | Vue package | Host (sda-v2) |
|---|---|---|---|
| Parse ChordPro → ViewModel | ✅ | | |
| Transpose / controller state | ✅ | wires UI → `dispatch` | |
| `renderHtml(view, { theme })` | ✅ | injects HTML | may sanitize |
| Theme CSS (`light` / `dark` / print hooks) | ✅ | theme toggle + auto | may override CSS vars |
| `renderPdf` → `Uint8Array` | ✅ (`/pdf`) | triggers download UX | may trigger download |
| Filenames + scroll **math** | ✅ | | |
| Auto-scroll **RAF** / scrollTop | optional `attachScroll` helper on controller | ✅ wires + controls | |
| Cifra toolbar (tom, fonte, tema, export, scroll) | ❌ | ✅ | |
| Multi-cifra which string is active | ❌ | ❌ | ✅ |
| Login, shell, synced audio player, i18n catalogs | ❌ | ❌ | ✅ |
| Rehearsal reference audio (unsynced) | `setRehearsalAudio` | ✅ player | URLs + cover |

**Auto-rolagem:** in product scope. Core: speed math (+ optional attach helper). Vue package: controls + RAF against `[data-cpv-scroll]`.

---

## 4. Public API (must exist)

```ts
// @henryavila/titan-chordpro-ui (core — export ".")
export function parse(source: string): ChordProView
// parse() accepts ChordPro, OnSong, or mixed text; detection/normalization is internal.
export function transpose(view: ChordProView, semitones: number): ChordProView
export function setKey(view: ChordProView, targetKey: string): ChordProView  // or throw if unsupported
export function renderHtml(view: ChordProView, opts?: { theme?: string }): string
export function listThemes(): string[]
export function buildChoFilename(title: string, key: string | null): string
export function buildPdfFilename(title: string, key: string | null): string
export function buildSljaFilename(title: string): string
export function lyricsForSlides(view: ChordProView): SlideSourceLine[]
export function lyricsText(view: ChordProView): string
export function exportLyrics(source: string): ChartLyrics
// ChartLyrics = { title, artist, lyrics }. Host cadastra letra sem Vue.
// Lyrics drop chords, x///, comments, tab, images. Empty string if none.
export function exportCho(source: string, opts?: { key?: string | null }): string
export function calcScrollSpeed(contentHeight: number, durationSeconds: number | null, bpm: number | null): number
export function adjustScrollSpeed(current: number, direction: 'up' | 'down'): number
export function createViewerController(opts: { source: string }): ViewerController
// ViewerController: getState / subscribe / dispatch / optional attachScroll(el)

// @henryavila/titan-chordpro-ui/pdf  (separate entry — do not force jspdf into core bundle)
export function renderPdf(view: ChordProView, opts: PdfOptions): Promise<Uint8Array>

// @henryavila/titan-chordpro-ui/slides  (separate entry — ZIP / CP1252 stay out of core)
export function renderSlja(view: ChordProView, opts?: SljaOptions): Promise<Uint8Array>
export function exportSlja(source: string, opts?: SljaOptions): Promise<SljaFile>
// SljaFile = { bytes, filename, title }. Host download button: no Vue tree.
// SljaOptions: title?, coverImage?, slidesImage? (host JPEG/PNG bytes; package default otherwise)
// Chart line breaks are the phrasing. Do not reflow like louvorja-slides ASR.

// @henryavila/titan-chordpro-ui/vue
export { ChordproViewer } // SFC: complete 1-cifra UI; props: source, optional labels; emits state changes
```

### 4.1 ViewModel (`ChordProView`) — frozen shape for v0.1

```ts
export type ChordProView = {
  meta: {
    title?: string
    subtitle?: string
    artist?: string
    key?: string          // original key from source when known
    tempo?: number | string
    time?: string
  }
  displayKey: string | null   // after transpose
  transposeSemitones: number  // 0 = original
  source: string              // ChordPro text used (post-clean optional)
  sections: ChordProSection[]
}

export type ChordProSection = {
  kind: 'verse' | 'chorus' | 'bridge' | 'comment' | 'tab' | 'instrumental' | 'generic'
  label?: string
  lines: ChordProLine[]
}

export type ChordProLine =
  | { type: 'lyrics'; words: Array<{ chord?: string; lyric: string }> }
  | { type: 'empty' }
  | { type: 'comment'; text: string }
```

**Rules:**

- JSON-serializable (no class instances).
- Themes consume **only** ViewModel (+ theme name), never raw parser objects.
- Parser adapter (v0.1: wrap `chordproject-parser`) is **internal**; swappable behind `parse()`.

### 4.2 HTML contract (theme `default`)

- Root wrapper class: `cpv` plus theme hook `cpv--default`.
- Document body must expose a scrollable content root: `[data-cpv-scroll]` or `.cpv-scroll`.
- Chord above lyric: each lyric atom is a word unit with optional chord.
- Comments from `{c:…}` appear as comment lines (not dropped).
- Empty ChordPro lines → empty line nodes (spacing preserved).
- **Compat:** theme `default` MAY also emit legacy SDA class names (`.chordpro-content`, `.song-content`, `.lyrics-line`, `.word`, `.chord`, `.comment-line`, `.chorus-section`, `.empty-line`) so SDA cutover snapshots can compare. Prefer documenting both in `themes/default.md`.

### 4.3 PDF contract

- Page: A4 portrait.
- Header: title; meta line `Tom: {displayKey}` · BPM when present · artist when present.
- Body: chord/lyric pairs in reading order from ViewModel (**not** a brittle HTML scrape long-term; v0.1 may scrape own HTML if snapshots lock parity with current SDA PDF — document which path in CHANGELOG).
- Bytes in = transposed view; filename helper uses `displayKey`.

### 4.4 File extensions

**Input (CLI / host):** accept ChordPro text files as **`.cho`** or **`.chordpro`** (case-insensitive). Same `parse()` path — extension does not change semantics.

**Export text default:** `buildChoFilename` keeps suffix **`.cho`** (SDA parity). Optional `opts.ext: 'cho' | 'chordpro'` may be added; if omitted → `.cho`.

### 4.5 Filenames (exact — migrate tests)

| Input | Output |
|---|---|
| `buildChoFilename('Amazing Grace', 'Am')` | `amazing-grace-am.cho` |
| `buildChoFilename('Amazing Grace', null)` | `amazing-grace.cho` |
| `buildChoFilename('Song Title', 'C#')` | `song-title-c#.cho` |
| `buildPdfFilename('Amazing Grace', 'Am')` | `cifra-amazing-grace-tom-am.pdf` |
| `buildPdfFilename('Amazing Grace', null)` | `cifra-amazing-grace.pdf` |
| `buildPdfFilename('Lindo És', 'C#')` | `cifra-lindo-es-tom-c#.pdf` |
| `buildSljaFilename('Fala Comigo')` | `slides-fala-comigo.slja` |
| `buildSljaFilename('Lindo És')` | `slides-lindo-es.slja` |

Slug: NFD, strip accents, non-alnum → `-`, trim dashes.

### 4.6 Scroll speed (exact — migrate tests)

| `calcScrollSpeed(h, dur, bpm)` | Result |
|---|---|
| `(900, 30, null)` | `30` |
| `(600, 60, null)` | `10` |
| `(900, null, 80)` | `20` |
| `(900, null, 120)` | `30` |
| `(900, null, null)` | `30` |
| `(0, 30, 80)` | `20` (height 0 → skip duration path) |
| `(0, 30, null)` | `30` |

`adjustScrollSpeed`: ±15% factor, min `5`, 1 decimal place.

### 4.7 Voiceless time (`x///`)

The chart’s only **exact** duration on a line is the `x///` convention: `x` is always the **head** of the time (downbeat); `/` is a beat that is not the head. `[Cm]//` with no `x` is valid — two beats in 4/4, including at the end of a phrase. Anchored after a chord `]`. **SoT:** [`docs/MARCAS-X.md`](docs/MARCAS-X.md).

- Played line (no lyric): marks **are** that stretch’s time at BPM. The engine does **not** infer bars from `[G] [C] [D]`.
- Sung line: trailing marks are a **tail added** to the row estimate, never the verse’s whole duration.
- Auto-scroll still requires `{duration:}` (hard gate). BPM + unmarked chords do not open it.
- Compound meters use `beatsPerBar` + `marksPerBeat` (6/8 → 2 pulses, 3 marks per pulse).
- `lintSource` warns on a voiceless chord line with `lineBeats === 0`.
- Agents must not delete `x///` from source to clean lyrics. Só letra is a reading lens (`layout.ts`: `stripChordClock` + `stripBeatMarks`); marks glued after a removed chord (`razão.[E]//`, `Amém[G]x`, `/_`) must not leak into the lyric projection. Host may open that lens with prop `lens="letra"` (persists across setlist song changes).

---

## 5. Transpose rules

- One step = **1 semitone**.
- `transpose(view, n)` returns **new** object (immutability).
- `displayKey` updates when original key known; if key unknown, chords still transpose and `displayKey` may stay `null` (document behavior in tests with fixture without `{key:}`).
- Chromatic with sharps; flats in input normalized for indexing (same approach as current SDA viewer).
- Reset = `transposeSemitones === 0` view (host calls `transpose(originalParse, 0)` or re-`parse`).
- Changing which ChordPro string the host selects → host re-`parse`s; lib does not remember multi-cifra lists.

---

## 6. Themes

| Theme id | v0.1 | Role |
|---|---|---|
| `light` | **required** | Screen reading (claro); may alias `default` for compat |
| `dark` | **required** | Escuro / palco |
| `auto` | **required** (UI) | Segue `prefers-color-scheme` (Vue toggle); HTML resolve → light ou dark |
| `print` | **required** | Dense A4-oriented; PDF sibling / print CSS |
| `default` | compat alias | → `light` (SDA snapshots / SPEC legado) |
| `stage` | optional | May alias `dark` |

- `listThemes()` returns at least `['light', 'dark', 'print']` (and may include aliases).
- Unknown theme → **throw** with known list (fail fast).
- CSS variables documented in theme CSS header (`--cpv-*`: font stack, chord color, bg, fg). Host/SDA may remap vars to tenant tokens.

**Visual quality bar (measurable, not taste):**

1. Fixture `jesus-tu-es…` ChordPro → HTML snapshot stable under `light` (and/or `default` alias).
2. Every chord token from source that appears inline as `[X]` appears in HTML (count ≥ source bracket chords on lyric lines; directives ignored).
3. Comment lines containing `INTRODUÇÃO` / `BEM SUAVE` from Jesus fixture survive in HTML.
4. `print` theme produces HTML that still contains the same lyric text (normalize whitespace).
5. `dark` theme still contains the same lyric text (normalize whitespace).

---

## 7. Fixtures (required in repo)

Production corpus (tenant dump): `fixtures/sda/*.cho`. Demo lists **only** that set.

| Id | File | Role |
|---|---|---|
| sda | `fixtures/sda/*.cho` | 148 cifras vivas — SoT do demo e do aceite |
| ele-vive-partitura | `fixtures/013-ele-vive-em-mim-partitura.cho` | `{image:}` + `{sos}` (fora da lista do demo) |
| empty | empty string / missing | parse → empty sections, no throw |

Agent **must not** invent chord charts for snapshots.

---

## 8. CLI (v0.1)

Input path may end in **`.cho`**, **`.chordpro`**, **`.onsong`**, or other plain-text chart extensions the detector accepts.

```bash
titan-chordpro-ui html  song.cho --theme default -o out.html
titan-chordpro-ui html  song.chordpro --theme default -o out.html
titan-chordpro-ui html  song.onsong --theme light -o out.html
titan-chordpro-ui pdf   song.chordpro --key A -o cifra-….pdf
titan-chordpro-ui parse song.cho -o view.json          # dump ViewModel
```

Exit codes: `0` ok · `1` user/input error · `2` internal.  
Unknown extension: still attempt parse (auto-detect ChordPro vs OnSong); optional `--format chordpro|onsong|auto` (default `auto`).

---

## 9. Acceptance criteria (Definition of Done v0.1)

An implementing agent may claim **DONE** only when **all** rows pass on CI:

| # | Criterion | How verified |
|---|---|---|
| A1 | Package builds (`tsc` / `tsup`) dual target ESM+CJS or ESM-only with `exports` for `.`, `./pdf`, `./slides` and `./vue` | `pnpm build` |
| A2 | Filename helpers match §4.5 exactly | unit tests ported from SDA |
| A3 | Scroll helpers match §4.6 exactly | unit tests ported from SDA |
| A2b | CLI accepts `.cho`, `.chordpro`, and `.onsong` (auto-detect) for `html`/`pdf`/`parse` | integration |
| A2c | `parse` of OnSong-style source (chords-over-lyrics and/or `Key:` meta) yields ViewModel with ≥1 lyrics line when content present | unit + fixture |
| A4 | `parse(jesus-1)` yields `meta.key === 'G'` (or display from content) and ≥1 lyrics line with chords | unit |
| A5 | `transpose(parse(jesus-1), 2)` changes chord roots; `displayKey` reflects +2 when key known | unit |
| A6 | `renderHtml` snapshot for jesus-1 theme `default` committed | snapshot test |
| A7 | Comment directives not stripped (see §6) | unit on HTML string |
| A8 | `renderPdf(transposed)` returns non-empty `Uint8Array`; PDF header meta uses transposed key | unit/integration |
| A9 | `buildPdfFilename('Jesus Tu És a Minha Vida', 'A')` → `cifra-jesus-tu-es-a-minha-vida-tom-a.pdf` | unit |
| A10 | Empty source: `parse('')` → empty sections, `renderHtml` does not throw | unit |
| A11 | Unknown theme throws | unit |
| A12 | CLI `html` and `pdf` smoke on jesus-1 | integration |
| A13 | README documents core vs Vue vs host boundary (§3) in ≤20 lines | doc review |
| A14 | No Vue import in **core** (`src/core/**` or package root excluding `vue`) | grep gate |
| A15 | `createViewerController` subscribe/dispatch transpose updates state + html | unit |
| A16 | Vue `ChordproViewer` mounts fixture jesus-1; transpose control changes displayed chords | component/e2e smoke |
| A17 | Vue package exposes light/dark/auto theme control | component smoke |

**Not DONE if:** only a demo without tests; PDF ignores transpose; theme hardcoded with no `theme` option; cifra toolbar only exists inside sda-v2 and not in this repo’s Vue package.

---

## 10. Implementation phases (agent order)

1. **Scaffold** — `package.json` / workspace, Vitest, `tsup`, `src/core`, eslint.
2. **Pure helpers** — filenames + scroll (port from sda-v2 `use-chordpro.test.ts`) → A2 A3.
3. **Parse adapter** — ViewModel + fixtures → A4 A10.
4. **Transpose** → A5.
5. **renderHtml + light/dark/print CSS** → A6 A7 A11.
6. **PDF entry** → A8 A9.
7. **Controller** — `createViewerController` → A15.
8. **CLI** → A12.
9. **Vue package** — complete 1-cifra UI + demo app → A16 A17.
10. **Docs** — README + VISAO pointer → A13 A14.

Do not start sda-v2 cutover until A1–A12 + A15–A17 green (or A1–A15 if UI design gated separately — UI package still required for product DONE).

---

## 11. SDA integration (after v0.1 tag)

1. Depend on local path or published version (`@henryavila/titan-chordpro-ui` + `/vue`).
2. sda-v2 keeps **shell / multi-cifra / sanitize / i18n / player**.
3. Replace inline parser + HTML/PDF/toolbar-of-cifra with `<ChordproViewer :source="activeCho" />` (or equivalent).
4. Map host tokens to `--cpv-*` if needed.
5. Remove duplicated helpers from `useChordpro.ts` (re-export from core or delete).

Pointer in SDA handoff: `design-handoff/prompts/07b-cifra-viewer.md` → this SPEC + `docs/VISAO.md`.

---

## 12. Open questions (block only if agent hits them)

1. ~~Package scope name under npm~~ — **locked:** `@henryavila/titan-chordpro-ui` with exports `"."` / `"./pdf"` / `"./vue"` (publish via GitHub Release → OIDC, same pattern as `@henryavila/mdprobe`; see `docs/REBRAND-HANDOFF.md`).
2. Whether `setKey` is required in v0.1 or only semitone `transpose` (SDA today = semitone offset).
3. PDF engine long-term (jsPDF vs print-CSS + headless) — **v0.1 = jsPDF** for parity with SDA.
4. Exact `ViewerController` action union (document in types when implementing).

Default if unanswered: **semitone-only** transpose in v0.1; **jsPDF** in `./pdf`; controller actions mirror VISAO controls (transpose, theme, fontStep, scroll, export).
