# Diagramas de cifra — `titan-chordpro-ui`

O músico precisa ver como se toca o acorde (violão, piano, ukulele) sem poluir a leitura. Este plano entrega um modal grande de forma, BD no core, `{define}` só como override no `.cho`, draw com capo na forma da mão, e o mesmo modal gravável no edit. SoT: `projects/titan-chordpro-ui/diagramas-cifra/design.md`. verified_by: design.md Decisions 1–14.

## Inviolable principles

- **P1 Modal overlay, not a chart strip** — No diagram list in the chart flow. Phone/tablet full-screen modal; desktop large modal. Instrument switch lives on that screen. verified_by: design.md Decision 1, 3.
- **P2 Package dictionary, file override** — Default shapes live in core. ChordPro `{define}` overrides that file only. Creating a shape does not write the global DB. verified_by: design.md Decisions 4, 8.
- **P3 Draw the hand under capo** — Guitar/ukulele lookup and draw use `shapeName` plus `capoFret` (bar + Capo n). Piano uses `concert`. `{define-guitar}` is keyed on the shape name, not the lyric name. verified_by: design.md Decisions 5–7.
- **P4 Core has no Vue** — Parse, dictionary, resolve, `{define}` live in `src/core`. SVG and modal live in Vue. A14 stays. verified_by: design.md Decision 13; `tests/core/no-vue-in-core.test.ts`.
- **P5 Gates over mega-DONE** — D0→D4 each have fixtures/tests. D4 UI does not write `{define}` before D1 round-trip is green. verified_by: design.md Gates.
- **P6 Real fixtures** — Use `fixtures/sda` for the oracle. A `{define}` test fixture is a new directive on an existing chart, not invented lyrics. verified_by: AGENTS.md; design.md Non-goals.

## Glossary

- **token tocável** — `shapeName` on guitar/ukulele, `concert` on piano, after transpose+capo, before Nashville label.
- **`capoFret`** — Fret from `capoReadOf` (song or `#capo:n`). 0 = nut. Used in draw, not in override match.
- **oráculo 257** — Table of unique chord names in `fixtures/sda` → parse | UNPARSED | AMBIGUOUS → hit/miss per instrument.
- **D0–D4** — Delivery gates: parser+oracle → `{define}` round-trip → resolve+draw → modal view → editor on the same modal.
- **`diagrams`** — Host capability, default on.

## F0 — D0 Parser BR + oráculo 257

Goal: `parseChordToken` classifies every unique name in `fixtures/sda` (257) as parse, UNPARSED, or AMBIGUOUS; aliases `7M`→maj7, `4`/`sus`→sus4, `9`→add9, `2`→sus2; `7+` and quote junk miss; zero invented voicings; no Vue in core.

```yaml
exit_gate:
  - id: F0-G1
    description: Oracle table exists and parseChordToken tests green on the 257 names. FAILS when a token is guessed as a quality instead of UNPARSED or AMBIGUOUS.
    verifier: { kind: shell, command: "pnpm exec vitest run tests/core/parse-chord-token.test.ts tests/core/chord-oracle.test.ts", expectExitCode: 0 }
  - id: F0-G2
    description: No Vue imports in src/core.
    verifier: { kind: shell, command: "pnpm exec vitest run tests/core/no-vue-in-core.test.ts", expectExitCode: 0 }
```

### T-001 Oracle table from fixtures/sda

- Files: tests/core/chord-oracle.table.json, tests/core/chord-oracle.test.ts, scripts/build-chord-oracle.mjs
- scopeBoundary: Do not invent chart lyrics; do not implement parseChordToken here; do not add Vue; do not ship a voicing dictionary.
- acceptance: Table lists every unique bracket token from fixtures/sda (257 names); each row is parse, UNPARSED, or AMBIGUOUS; 7+ and quote-junk rows are AMBIGUOUS or UNPARSED; chord-oracle.test.ts fails if fixtures/sda gains a name missing from the table
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/chord-oracle.test.ts", expectExitCode: 0 }
- RED→GREEN: Test fails without the table covering fixtures/sda unique names; add the generator script and committed table.

### T-002 parseChordToken + BR aliases

- Files: src/core/parse-chord.ts, src/core/index.ts, tests/core/parse-chord-token.test.ts
- scopeBoundary: No Vue; no fret/key diagrams; no {define} parser; do not treat 7+ as aug or maj7.
- acceptance: parseChordToken("C7M") quality is maj7; parseChordToken("C4") and parseChordToken("Csus") are sus4; parseChordToken("C9") is add9; parseChordToken("G2") is sus2; parseChordToken("C7+") is AMBIGUOUS; parseChordToken("A4\"") is UNPARSED; slash bass G/B sets bass; function is exported from src/core/index.ts
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/parse-chord-token.test.ts", expectExitCode: 0 }
- RED→GREEN: Failing tests for aliases and miss classes; implement parseChordToken and export it.

## F1 — D1 {define} parse/serialize/round-trip

Goal: `{define}`, `{define-guitar}`, `{define-ukulele}` round-trip in parse/write; hyphenated keys are not eaten by DIR; writeMeta does not drop defines; exportCho preserves them; fixture on an existing chart; D4 must not write defines until this gate is green.

```yaml
exit_gate:
  - id: F1-G1
    description: Define parse/serialize and exportCho tests green. FAILS when writeMeta or exportCho strips {define-guitar:}.
    verifier: { kind: shell, command: "pnpm exec vitest run tests/core/define-directive.test.ts tests/core/export-cho.test.ts", expectExitCode: 0 }
```

### T-001 Parse and serialize define directives

- Files: src/core/parse.ts, src/core/define.ts, src/core/index.ts, tests/core/define-directive.test.ts
- scopeBoundary: No Vue editor; no dictionary lookup; do not add define to META_KEYS as an x_ key; do not implement the diagram SVG.
- acceptance: DIR accepts define-guitar and define-ukulele as full keys; parseDefineDirective reads frets, fingers, base-fret, keys; serializeDefine emits ChordPro text; generic {define:} infers guitar from 6 frets, ukulele from 4, piano from keys; unknown arity is miss
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/define-directive.test.ts", expectExitCode: 0 }
- RED→GREEN: Test {define-guitar: Am ...} currently dropped by DIR; widen matcher and add define.ts.

### T-002 writeDefines + fixture + exportCho keep

- Files: src/core/define.ts, src/core/import-chordpro.ts, src/core/export-cho.ts, tests/core/define-directive.test.ts, tests/core/export-cho.test.ts, fixtures/sda/013-ele-vive-em-mim.cho
- scopeBoundary: Do not invent lyrics; only add define lines to an existing fixture; do not build the shape editor UI; do not change strum meta keys.
- acceptance: writeDefines places the define block after META_KEYS header and before lyrics; writeMeta leaves define lines in place; exportCho of a source with {define-guitar:} still contains that directive; fixture 013-ele-vive-em-mim.cho has at least one {define-guitar:} used in tests
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/define-directive.test.ts tests/core/export-cho.test.ts", expectExitCode: 0 }
- RED→GREEN: Failing keep-define tests on writeMeta/exportCho; implement writeDefines; add define lines to the existing fixture.

## F2 — D2 resolveDiagram + BD + draw with capo

Goal: Layout segs expose concert, shapeName, capoFret before dual/Nashville; resolveDiagram hits dictionary or file override; guitar/ukulele SVG draws the hand shape with capo bar and Capo n; piano draws concert keys; capo-solo still marks capoFret.

```yaml
exit_gate:
  - id: F2-G1
    description: Layout fields, resolveDiagram, and diagram SVG tests green. FAILS when capo-solo leaves capoFret 0 or guitar draw uses concert voicing under capo 2.
    verifier: { kind: shell, command: "pnpm exec vitest run tests/core/layout-capo.test.ts tests/core/resolve-diagram.test.ts tests/core/diagram-draw.test.ts", expectExitCode: 0 }
```

### T-001 Layout concert / shapeName / capoFret

- Files: src/core/types.ts, src/core/layout.ts, tests/core/layout-capo.test.ts
- scopeBoundary: No Vue; no dictionary; do not change auto-scroll math; do not use shapeCapo as the draw source.
- acceptance: Each playable seg has concert, shapeName, capoFret; capo 2 dual on source Bm yields concert Bm and shapeName Am and capoFret 2; capo 2 dual off still has capoFret 2 and shapeName Am; Nashville changes the label only; lens letra still drops chords from the reading blocks
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/layout-capo.test.ts", expectExitCode: 0 }
- RED→GREEN: Extend layout-capo tests for capo-solo capoFret and concert fields; fill fields in capoReadOf before display().

### T-002 Dictionary + resolveDiagram

- Files: src/core/chord-dict.ts, src/core/resolve-diagram.ts, src/core/index.ts, tests/core/resolve-diagram.test.ts
- scopeBoundary: No Vue; no editor sheet; guitar dictionary is EADGBE; ukulele is GCEA only; do not ship baritone; do not guess 7+.
- acceptance: resolveDiagram({ token, instrument, overrides }) prefers file override over dictionary; guitar token is shapeName; piano token is concert; miss reasons are unknown-token or no-shape; C7M hits maj7 voicing; C7+ is miss; one voicing per name (lowest open)
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/resolve-diagram.test.ts", expectExitCode: 0 }
- RED→GREEN: Failing resolve tests for override vs dictionary and capo shape token; add dict + resolveDiagram.

### T-003 SVG draw guitar ukulele piano with capo

- Files: src/core/diagram-draw.ts, src/core/index.ts, tests/core/diagram-draw.test.ts
- scopeBoundary: No Vue components; draw returns data or SVG string from core; do not pause auto-scroll here; do not open the modal.
- acceptance: Guitar/ukulele draw with capoFret 2 includes a capo bar and the label Capo 2; open string in the shape is at the capo, not the nut; piano draw ignores capoFret and lights concert keys; fingers 1-4 render when present, else dots only
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/diagram-draw.test.ts", expectExitCode: 0 }
- RED→GREEN: Failing draw snapshots for capo bar vs concert voicing; implement diagram-draw.ts.

## F3 — D3 Modal view + instrument prefs

Goal: View tap opens a large modal (full screen on phone/tablet, wide on desktop); instrument switch lives on that screen and persists as diagramInstrument, default guitar silent; host capability diagrams defaults true; tap pauses auto-scroll and metronome until the modal closes; lens letra has no modal; Nashville modal shows the playable name.

```yaml
exit_gate:
  - id: F3-G1
    description: Vue modal, prefs, and pause tests green. FAILS when tap leaves auto-scroll running or lens letra still opens the modal.
    verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/diagram-modal.test.ts tests/core/no-vue-in-core.test.ts", expectExitCode: 0 }
```

### T-001 Prefs and diagrams capability

- Files: src/core/storage.ts, src/vue/public.ts, src/vue/ChordproViewer.vue, tests/vue/diagram-modal.test.ts
- scopeBoundary: Do not build the edit grid; do not call localStorage except via ChartStore; do not put instrument on ToneSheet or Mais.
- acceptance: STORE_KEYS.prefs stores diagramInstrument; missing key is guitar; ViewerCapabilities.diagrams defaults true; diagrams false hides the modal; instrument switch on the modal persists across source changes
- verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/diagram-modal.test.ts", expectExitCode: 0 }
- RED→GREEN: Tests fail without prefs key and capability; wire persistPrefs and public.ts.

### T-002 Large modal + pause scroll and metronome

- Files: src/vue/chart/ChartBody.vue, src/vue/overlay/DiagramModal.vue, src/vue/ChordproViewer.vue, tests/vue/diagram-modal.test.ts
- scopeBoundary: Do not add a diagram strip in the chart; do not offer personalize in view; do not write {define} from view; do not use a small anchored popover.
- acceptance: View tap opens DiagramModal full viewport on narrow and large on wide without changing scrollHeight; instrument control on that screen switches guitar piano ukulele in place; miss copy is Sem forma neste instrumento; tap pauses auto-scroll and metronome; close resumes both; lens letra has no hit target
- verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/diagram-modal.test.ts", expectExitCode: 0 }
- RED→GREEN: Vue tests red without the modal and pause; implement DiagramModal and wire ChartBody taps.

## F4 — D4 Editor sheet + {define} in that file

Goal: Edit mode opens a dedicated shape sheet from ChordDialog Forma; saves {define-guitar: Am} when capo 2 and lyric is Bm; piano saves concert keys; global DB unchanged; D1 must already be green.

```yaml
exit_gate:
  - id: F4-G1
    description: Editor sheet writes define on an existing fixture and round-trips. FAILS when the saved name is the lyric Bm under capo 2 instead of shape Am, or when the package dictionary file changes.
    verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/diagram-editor.test.ts tests/core/define-directive.test.ts", expectExitCode: 0 }
```

### T-001 Diagram sheet in edit

- Files: src/vue/overlay/DiagramModal.vue, src/vue/edit/ChordDialog.vue, src/vue/ChordproViewer.vue, tests/vue/diagram-editor.test.ts
- scopeBoundary: Do not open the editor grid from view; do not mutate chord-dict.ts when saving; do not patch transposed display into source.
- acceptance: ChordDialog shows Forma; sheet draws the playable shape with capoFret; save calls writeDefines; capo 2 lyric Bm guitar save contains define-guitar Am; unrecognized name shows empty grid and still saves a define in that file
- verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/diagram-editor.test.ts", expectExitCode: 0 }
- RED→GREEN: Tests fail without Forma and writeDefines; add DiagramSheet and ChordDialog entry.
