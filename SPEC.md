# SPEC — `chordpro-viewer` v0.1

> **Audience:** implementing agent (and human reviewer). This is an **engineering contract**, not a visual mood board.
> **Success = tests + CLI demos pass the acceptance table below.** Ambiguity → open a `question` in the PR, do not invent silently.

| Field | Value |
|---|---|
| Package | `chordpro-viewer` (npm, TypeScript) |
| Repo | `/Volumes/External/code/chordpro-viewer` |
| Sibling generator | `titan-chordpro-lib` (audio → ChordPro text) — **out of scope** |
| Sibling consumer | Virtual SDA Nuxt (`ChordproViewer.vue`) — host chrome |
| Status | Spec draft → scaffold → green tests |

---

## 1. Problem

Titan **generates** ChordPro. SDA (and operators) need to **read / transpose / export** ChordPro as HTML + PDF with stable themes. Today that logic is trapped inside a Vue component + `chordproject-parser` + ad-hoc CSS/PDF. Extract a **framework-free** library so:

1. SDA becomes a thin host.
2. Titan can preview/PDF a generated `.chordpro` / `.cho` without Nuxt.
3. Themes are swappable CSS (+ optional HTML structure variants), not forks of the parser.

---

## 2. Non-goals (v0.1)

| Out | Why |
|---|---|
| Audio sync / SyncedPlayer | Belongs to SDA |
| Chord fret diagrams | Later theme / package |
| ChordPro **editor** / drag-to-correct | Titan Phase-2 sibling |
| Titan ML / writer profiles | Generator stays in Titan |
| Vue / React components in core | Optional later `@chordpro-viewer/vue` |
| i18n strings | Host owns copy |
| HTML sanitize policy | Host owns (`DOMPurify` etc.) before `innerHTML` |

---

## 3. Boundary: lib vs host

| Concern | Lib | Host (SDA / CLI) |
|---|---|---|
| Parse ChordPro → ViewModel | ✅ | |
| Transpose ViewModel / re-parse+transpose | ✅ | |
| `renderHtml(view, { theme })` | ✅ | |
| Theme CSS files | ✅ | May override CSS vars |
| `renderPdf(view, opts)` → `Uint8Array` | ✅ (`/pdf` entry) | Trigger download / write file |
| `buildPdfFilename` / `buildChoFilename` | ✅ | |
| `exportCho(source, key)` raw text | ✅ | |
| `calcScrollSpeed` / `adjustScrollSpeed` | ✅ pure | |
| Auto-scroll **RAF loop** / DOM scrollTop | ❌ (or tiny util later) | ✅ host wires to element |
| Multi-cifra **which** string is active | ❌ | ✅ host state |
| Toolbar **widgets** (buttons) | ❌ in core | ✅ host UI **or** optional demo HTML in CLI |
| Font-size class on wrapper | Host toggles class; theme documents CSS hooks | ✅ |
| Login, shell, player | ❌ | ✅ |

**Auto-rolagem:** **in product scope** (ensaio de pé). Lib ships **speed math** + documents the contract; host implements the timer/RAF against the rendered root. Do not drop it from acceptance helpers.

---

## 4. Public API (must exist)

```ts
// chordpro-viewer
export function parse(source: string): ChordProView
export function transpose(view: ChordProView, semitones: number): ChordProView
export function setKey(view: ChordProView, targetKey: string): ChordProView  // or throw if unsupported
export function renderHtml(view: ChordProView, opts?: { theme?: string }): string
export function listThemes(): string[]
export function buildChoFilename(title: string, key: string | null): string
export function buildPdfFilename(title: string, key: string | null): string
export function exportCho(source: string, opts?: { key?: string | null }): string  // transposed source or cleaned
export function calcScrollSpeed(contentHeight: number, durationSeconds: number | null, bpm: number | null): number
export function adjustScrollSpeed(current: number, direction: 'up' | 'down'): number

// chordpro-viewer/pdf  (separate entry — do not force jspdf into core bundle)
export function renderPdf(view: ChordProView, opts: PdfOptions): Promise<Uint8Array>
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
| `default` | **required** | Screen reading; ship CSS + HTML structure |
| `print` | **required** | Dense A4-oriented; used as PDF sibling / print CSS |
| `stage` | optional | High-contrast / dark-stage variant |

- `listThemes()` returns at least `['default', 'print']`.
- Unknown theme → **throw** with known list (fail fast).
- CSS variables documented in `themes/default.css` header comment (font stack, chord color, bg, fg). Host/SDA may remap vars to tenant tokens.

**Visual quality bar (measurable, not taste):**

1. Fixture `jesus-tu-es…` ChordPro → HTML snapshot stable under `default`.
2. Every chord token from source that appears inline as `[X]` appears in HTML (count ≥ source bracket chords on lyric lines; directives ignored).
3. Comment lines containing `INTRODUÇÃO` / `BEM SUAVE` from Jesus fixture survive in HTML.
4. `print` theme produces HTML that still contains the same lyric text (normalize whitespace).

---

## 7. Fixtures (required in repo)

Copy / pin from SDA `design-handoff/fixtures/songs.json` (verbatim ChordPro `content`):

| Id | File | Role |
|---|---|---|
| jesus-1 | `fixtures/jesus-tu-es-a-minha-vida-1.cho` | primary + PDF |
| jesus-2 | `fixtures/jesus-tu-es-a-minha-vida-2.cho` | second chart same song |
| entrega-1..3 | `fixtures/entrega-*.cho` | multi-source stress (host) |
| empty | empty string / missing | parse → empty sections, no throw |

Agent **must not** invent chord charts for snapshots.

---

## 8. CLI (v0.1)

Input path may end in **`.cho`** or **`.chordpro`**.

```bash
chordpro-viewer html  song.cho --theme default -o out.html
chordpro-viewer html  song.chordpro --theme default -o out.html
chordpro-viewer pdf   song.chordpro --key A -o cifra-….pdf
chordpro-viewer parse song.cho -o view.json          # dump ViewModel
```

Exit codes: `0` ok · `1` user/input error · `2` internal.  
Unknown/missing extension on a path that is still valid ChordPro text: still parse if `--format chordpro` is passed; otherwise prefer explicit `.cho` / `.chordpro`.

---

## 9. Acceptance criteria (Definition of Done v0.1)

An implementing agent may claim **DONE** only when **all** rows pass on CI:

| # | Criterion | How verified |
|---|---|---|
| A1 | Package builds (`tsc` / `tsup`) dual target ESM+CJS or ESM-only with `exports` for `.` and `./pdf` | `pnpm build` |
| A2 | Filename helpers match §4.5 exactly | unit tests ported from SDA |
| A3 | Scroll helpers match §4.6 exactly | unit tests ported from SDA |
| A2b | CLI accepts `.cho` and `.chordpro` equally for `html`/`pdf`/`parse` | integration |
| A4 | `parse(jesus-1)` yields `meta.key === 'G'` (or display from content) and ≥1 lyrics line with chords | unit |
| A5 | `transpose(parse(jesus-1), 2)` changes chord roots; `displayKey` reflects +2 when key known | unit |
| A6 | `renderHtml` snapshot for jesus-1 theme `default` committed | snapshot test |
| A7 | Comment directives not stripped (see §6) | unit on HTML string |
| A8 | `renderPdf(transposed)` returns non-empty `Uint8Array`; PDF header meta uses transposed key | unit/integration |
| A9 | `buildPdfFilename('Jesus Tu És a Minha Vida', 'A')` → `cifra-jesus-tu-es-a-minha-vida-tom-a.pdf` | unit |
| A10 | Empty source: `parse('')` → empty sections, `renderHtml` does not throw | unit |
| A11 | Unknown theme throws | unit |
| A12 | CLI `html` and `pdf` smoke on jesus-1 | integration |
| A13 | README documents lib vs host boundary (§3) in ≤20 lines | doc review |
| A14 | No Vue import in `src/` | grep gate |

**Not DONE if:** only a demo HTML without tests; or PDF ignores transpose; or theme is hardcoded with no `theme` option.

---

## 10. Implementation phases (agent order)

1. **Scaffold** — `package.json`, Vitest, `tsup`, `src/index.ts`, eslint.
2. **Pure helpers** — filenames + scroll (copy tests from SDA `use-chordpro.test.ts`) → A2 A3 green.
3. **Parse adapter** — ViewModel + fixtures → A4 A10.
4. **Transpose** → A5.
5. **renderHtml + default theme CSS** → A6 A7 A11.
6. **PDF entry** → A8 A9.
7. **CLI** → A12.
8. **Docs** — README + this SPEC pointer → A13 A14.

Do not start SDA integration until A1–A12 green.

---

## 11. SDA integration (after v0.1 tag)

1. Depend on local path or published version.
2. `ChordproViewer.vue` keeps toolbar / multi-cifra / RAF auto-scroll / sanitize / i18n.
3. Replace inline `chordproject-parser` + HTML/PDF body with lib calls.
4. Map host font steps to theme CSS classes documented by lib.
5. Remove duplicated helpers from `useChordpro.ts` (re-export from lib or delete).

Pointer in SDA handoff: `design-handoff/prompts/07b-cifra-viewer.md` → this SPEC.

---

## 12. Open questions (block only if agent hits them)

1. Package scope name under npm (`chordpro-viewer` vs `@henryavila/chordpro-viewer`).
2. Whether `setKey` is required in v0.1 or only semitone `transpose` (SDA today = semitone offset).
3. PDF engine long-term (jsPDF vs print-CSS + headless) — **v0.1 = jsPDF** for parity with SDA.

Default if unanswered: unscoped name ok for private; **semitone-only** transpose in v0.1; **jsPDF** in `./pdf`.
