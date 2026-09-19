---
schemaVersion: "0.1"
slug: diagramas-cifra
title: Diagramas de cifra — `titan-chordpro-ui`
version: "1.0"
status: active
started: 2026-09-19T08:49:13.733Z
lastUpdated: 2026-09-19T08:49:13.733Z
branch: plan/diagramas-cifra
executionMode: automate
currentPhase: F0
parallelismAllowed: false
principles:
  - id: P1
    title: Modal overlay, not a chart strip
    body: "No diagram list in the chart flow. Phone/tablet full-screen modal;
      desktop large modal. Instrument switch lives on that screen. verified_by:
      design.md Decision 1, 3."
  - id: P2
    title: Package dictionary, file override
    body: "Default shapes live in core. ChordPro `{define}` overrides that file
      only. Creating a shape does not write the global DB. verified_by:
      design.md Decisions 4, 8."
  - id: P3
    title: Draw the hand under capo
    body: "Guitar/ukulele lookup and draw use `shapeName` plus `capoFret` (bar +
      Capo n). Piano uses `concert`. `{define-guitar}` is keyed on the shape
      name, not the lyric name. verified_by: design.md Decisions 5–7."
  - id: P4
    title: Core has no Vue
    body: "Parse, dictionary, resolve, `{define}`, and the draw *model* live in
      `src/core`. Vue renders that model as SVG in the modal. A14 stays.
      verified_by: design.md Decision 13; `tests/core/no-vue-in-core.test.ts`."
  - id: P5
    title: Gates over mega-DONE
    body: "D0→D4 each have fixtures/tests. D4 UI does not write `{define}` before D1
      round-trip is green. verified_by: design.md Gates."
  - id: P6
    title: Real fixtures
    body: "Use `fixtures/sda` for the oracle. A `{define}` test fixture is a new
      file outside fixtures/sda (copy of an existing chart plus the directive),
      not a mutation of the 148-file SDA corpus. verified_by: AGENTS.md; Claude
      F-008."
glossary:
  - term: token tocável
    definition: "`shapeName` on guitar/ukulele, `concert` on piano, after
      transpose+capo, before Nashville label."
  - term: "`capoFret`"
    definition: Fret from `capoReadOf` (song or `#capo:n`). 0 = nut. Used in draw,
      not in override match.
  - term: oráculo 257
    definition: Table of unique chord names in `fixtures/sda` → parse | UNPARSED |
      AMBIGUOUS (quality only). Hit/miss per instrument is an F2 dictionary
      check, not an F0 column.
  - term: D0–D4
    definition: "Delivery gates: parser+oracle → `{define}` round-trip →
      resolve+draw → modal view → editor on the same modal."
  - term: "`diagrams`"
    definition: Host capability, default on.
phases:
  - id: F0
    slug: diagramas-cifra-f0-d0-parser-br-oraculo-257
    title: D0 Parser BR + oráculo 257
    summary: Classificar os 257 nomes do corpus SDA e parsear o dialeto BR.
    goal: "`parseChordToken` classifies every unique name in `fixtures/sda` (257) as
      parse, UNPARSED, or AMBIGUOUS; aliases `7M`→maj7, `7M(9)`→maj9,
      `4`/`sus`→sus4, `9`→add9, `2`→sus2, `6(9)`→6add9, `7(9)`→9, `m7(11)`→m11;
      `7+`, quote junk, and `m(3b)` are AMBIGUOUS/UNPARSED; zero invented
      voicings; no Vue in core. Oracle columns are parse-class only (Claude
      F-001)."
    dependsOn: []
    subPhaseCount: 2
    exitGate:
      summary: 2 criteria to meet
      criteria:
        - id: F0-G1
          description: Oracle table exists and parseChordToken tests green on the 257
            names (parse/UNPARSED/AMBIGUOUS only). FAILS when a token is guessed
            as a quality instead of UNPARSED or AMBIGUOUS, or when the table
            claims hit/miss per instrument in F0.
          status: pending
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/core/parse-chord-token.test.ts
              tests/core/chord-oracle.test.ts
            expectExitCode: 0
        - id: F0-G2
          description: No Vue imports in src/core.
          status: pending
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/core/no-vue-in-core.test.ts
            expectExitCode: 0
    status: active
    businessIntent:
      value: O músico precisa que o core reconheça o nome brasileiro do acorde (7M, 4,
        9, 2, slash) sem inventar forma. Um C7M desenhado como C7 mente no
        ensaio.
      workflow: Gerar a tabela-oráculo dos nomes únicos em fixtures/sda; implementar
        parseChordToken com aliases; testes em tests/core/chord-oracle.test.ts e
        tests/core/parse-chord-token.test.ts; exportar pelo index do core.
      rules: 7M vira maj7; 4 e sus viram sus4; 9 vira add9; 2 vira sus2; 7+ e aspas no
        nome sao AMBIGUOUS ou UNPARSED; nao chutar voicing; zero import Vue em
        src/core.
      outOfScope: Modal de forma, SVG de braço/teclado, dicionario de voicings, parser
        de {define}, folha de editor, prefs de instrumento.
      doneWhen: tests/core/chord-oracle.test.ts e tests/core/parse-chord-token.test.ts
        passam; tests/core/no-vue-in-core.test.ts passa; a tabela cobre os nomes
        unicos de fixtures/sda.
  - id: F1
    slug: diagramas-cifra-f1-d1-define-parse-serialize-round-trip
    title: D1 {define} parse/serialize/round-trip
    summary: Round-trip de {define} no arquivo, sem dropar no writeMeta.
    goal: "`{define}`, `{define-guitar}`, `{define-ukulele}` round-trip in
      parse/write; hyphenated keys are not eaten by DIR; writeMeta does not drop
      defines; parse() exposes `defines` on ChordProView; bare `{define:}`
      infers piano from keys, guitar from 6 frets, ukulele from 4, else miss;
      exportCho keeps define lines and transposes define names with the same
      semitone/capo rewrite as the body (Claude F-002); fixture is a new file
      outside fixtures/sda; D4 must not write defines until this gate is green."
    dependsOn:
      - F0
    subPhaseCount: 0
    exitGate:
      summary: 1 criterion to meet
      criteria:
        - id: F1-G1
          description: Define parse/serialize and exportCho tests green. FAILS when
            writeMeta strips {define-guitar:}, when exportCho({semitones:2})
            leaves a define that no longer matches the transposed shapeName, or
            when parse(src).defines is missing.
          status: pending
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/core/define-directive.test.ts
              tests/core/export-cho.test.ts
            expectExitCode: 0
    status: pending
  - id: F2
    slug: diagramas-cifra-f2-d2-resolvediagram-bd-draw-with-capo
    title: D2 resolveDiagram + BD + draw with capo
    summary: Resolver a forma e desenhar violão/ukulele/piano com capo.
    goal: Layout segs expose concert, shapeName, capoFret computed from block/song
      capo even when editing or Nashville (display() and shapeCapo stay as
      today; Claude F-003); resolveDiagram hits dictionary or file override;
      core returns a draw *model* (dots, mute, barre, capo bar, Capo n, lit
      keys) and Vue renders SVG; piano model ignores capoFret; F2 ships the
      voicing dictionary with license and fails if a parse-class name has no
      guitar entry unless it is on the known-miss list.
    dependsOn:
      - F1
    subPhaseCount: 0
    exitGate:
      summary: 1 criterion to meet
      criteria:
        - id: F2-G1
          description: Layout fields, resolveDiagram, draw-model, and dictionary coverage
            tests green. FAILS when editing or nashville leaves capoFret 0 while
            source has capo 2, when guitar draw model uses concert voicing under
            capo 2, or when a parse-class name lacks a guitar dict entry and is
            not on the known-miss list.
          status: pending
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/core/layout-capo.test.ts
              tests/core/resolve-diagram.test.ts tests/core/diagram-draw.test.ts
            expectExitCode: 0
    status: pending
  - id: F3
    slug: diagramas-cifra-f3-d3-modal-view-instrument-prefs
    title: D3 Modal view + instrument prefs
    summary: Modal grande de ensaio com seletor de instrumento persistido.
    goal: View tap opens a large modal (full screen on phone/tablet, wide on
      desktop); chord hit-target is role=button so zen and song-swipe rails do
      not steal the tap (Claude F-004); instrument switch lives on that screen
      and persists as diagramInstrument, default guitar silent; diagrams is on
      unless capabilities.diagrams === false; tap pauses auto-scroll and
      metronome and on close resumes only what was running; lens letra has no
      modal; Nashville modal shows the playable name.
    dependsOn:
      - F2
    subPhaseCount: 0
    exitGate:
      summary: 1 criterion to meet
      criteria:
        - id: F3-G1
          description: Vue modal, prefs, and pause tests green. FAILS when tap leaves
            auto-scroll running, when close starts scroll/metro that were off,
            when a chord tap toggles zen, when a rail touch swallows the chord
            tap, or when lens letra still opens the modal.
          status: pending
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/vue/diagram-modal.test.ts
              tests/core/no-vue-in-core.test.ts
            expectExitCode: 0
    status: pending
  - id: F4
    slug: diagramas-cifra-f4-d4-editor-sheet-define-in-that-file
    title: D4 Editor sheet + {define} in that file
    summary: No edit, o mesmo modal grava {define} neste arquivo.
    goal: "Edit mode opens the same large modal from ChordDialog Forma (writable
      grid); sheet reads capoFret from the diagram projection (not display() in
      edit); saves {define-guitar: Am} when capo 2 and lyric is Bm; piano saves
      concert keys; global DB unchanged; D1 must already be green."
    dependsOn:
      - F3
    subPhaseCount: 0
    exitGate:
      summary: 1 criterion to meet
      criteria:
        - id: F4-G1
          description: Editor sheet writes define on an existing fixture and round-trips.
            FAILS when the saved name is the lyric Bm under capo 2 instead of
            shape Am, or when the package dictionary file changes.
          status: pending
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/vue/diagram-editor.test.ts
              tests/core/define-directive.test.ts
            expectExitCode: 0
    status: pending
references: []
planActive: true
planTitle: Diagramas de cifra — `titan-chordpro-ui`
---

# Diagramas de cifra — `titan-chordpro-ui`

## 1. Context

O músico precisa ver como se toca o acorde (violão, piano, ukulele) sem poluir a leitura. Este plano entrega um modal grande de forma, BD no core, `{define}` só como override no `.cho`, draw com capo na forma da mão, e o mesmo modal gravável no edit. SoT: `projects/titan-chordpro-ui/diagramas-cifra/design.md`. verified_by: design.md Decisions 1–14.

## 2. Inviolable principles

- **P1 Modal overlay, not a chart strip** — No diagram list in the chart flow. Phone/tablet full-screen modal; desktop large modal. Instrument switch lives on that screen. verified_by: design.md Decision 1, 3.
- **P2 Package dictionary, file override** — Default shapes live in core. ChordPro `{define}` overrides that file only. Creating a shape does not write the global DB. verified_by: design.md Decisions 4, 8.
- **P3 Draw the hand under capo** — Guitar/ukulele lookup and draw use `shapeName` plus `capoFret` (bar + Capo n). Piano uses `concert`. `{define-guitar}` is keyed on the shape name, not the lyric name. verified_by: design.md Decisions 5–7.
- **P4 Core has no Vue** — Parse, dictionary, resolve, `{define}` live in `src/core`. SVG and modal live in Vue. A14 stays. verified_by: design.md Decision 13; `tests/core/no-vue-in-core.test.ts`.
- **P5 Gates over mega-DONE** — D0→D4 each have fixtures/tests. D4 UI does not write `{define}` before D1 round-trip is green. verified_by: design.md Gates.
- **P6 Real fixtures** — Use `fixtures/sda` for the oracle. A `{define}` test fixture is a new directive on an existing chart, not invented lyrics. verified_by: AGENTS.md; design.md Non-goals.

## 3. Phase tree

_(Canonical list in frontmatter `phases:`. aiDeck renders the tree visually when running.)_

## Self-review against code-quality gates

- **G1 read-before-claim**: claims about DIR, layout display(), META_KEYS, no Vue in core, and {define} drop cite `projects/titan-chordpro-ui/diagramas-cifra/design.md` and `research-digest.md`.
- **G2 soft-language**: 0 hedges (should/probably/maybe) in Decisions of the source plan; principles and gates use imperative FAIL-when wording.
- **G6 reference-or-strike**: principles carry verified_by; F0 businessIntent doneWhen names test files.
- **G10 gate-must-be-able-to-fail**: each exit criterion states FAILS when … or a concrete command that can exit non-zero. Criteria without a stateable failure: none.

## Ground-truth review

Status: complete

**Scanned:** `src/core/{parse,layout,import-chordpro,export-cho,storage,types,index,score,scroll}.ts`, `src/vue/{ChordproViewer,public,chart/ChartBody,edit/ChordDialog}.vue`, `src/vue/use/useMetronome.ts`, `tests/core/{layout-capo,export-cho,no-vue-in-core}.test.ts`, `fixtures/sda/013-ele-vive-em-mim.cho`, glob `src/core/parse-chord.ts` / `src/vue/overlay/DiagramModal.vue` (absent — F0/F3 create them).

### A — Plan premises vs code

| Premise | Result | Evidence |
|---|---|---|
| `src/core/parse.ts` DIR drops hyphenated `{define-guitar:}` | ok | parse.ts:28 `DIR = /^\s*\{\s*([a-zA-Z_]+)\s*:?\s*([^}]*)\}\s*$/` |
| `layout.ts` `display()` capo-solo returns shape as `name` and `shapeCapo` 0 | ok | layout.ts:467–476, 489 |
| `META_KEYS` / `writeMeta` do not model `define` | ok | import-chordpro.ts:344–357, 425–437 |
| `STORE_KEYS.prefs` + ChartStore exist | ok | storage.ts:24–51 |
| `ChartBody.vue` chords are spans; `ChordDialog.vue` edits name | ok | ChartBody.vue chord span; ChordDialog.vue |
| `fixtures/sda` and `013-ele-vive-em-mim.cho` exist | ok | fixtures/sda/013-ele-vive-em-mim.cho |
| `tests/core/layout-capo.test.ts`, `export-cho.test.ts`, `no-vue-in-core.test.ts` exist | ok | files present |
| `parse-chord.ts` / `DiagramModal.vue` exist | n/a (create) | glob absent; F0 T-002 / F3 T-002 create them |

### B — Code present, plan silent

| Code | Impact | Disposition |
|---|---|---|
| `useMetronome.ts` + auto-scroll in ChordproViewer | Direct — F3 tap must pause both | Covered by F3-G1 / T-002 |
| `score.ts` / ScoreEditor guitar\|piano | Indirect — melody vs chord diagram | Non-goal in design; P3/P4 |
| `overlay.ts` personal edits | Indirect — view tap is new hit-target | F3 scope: overlay modal, not overlay ops |
| BatidaSheet | Indirect — similar sheet chrome | F4 uses the same DiagramModal, not BatidaSheet |
| `onSurfaceTap` zen + `useSongSwipe` rails | Direct — chord tap stolen | F3-G1: role=button; rail/zen criteria (Claude F-004) |

**Counts:** premises=8 (7 ok, 1 create-n/a) · impacts=5 (2 direct covered, 3 oos/indirect)

## Reviews

- internal: 2026-09-19 local self-loop (items 1–7, 14–20). Finding: F4 goal still said dedicated sheet vs Decision 11 same modal — fixed in plan.md goal.
- ground-truth: complete | mode=ground-truth | fp=52472ebbc6f4 | premises=8 | impacts=5 @ uncommitted (2026-09-19T09:20:00Z)
- cross-model (claude): needs_changes | provider=claude | provider_version=2.1.263 | 4 critical applied (F-001 oracle vs dict, F-002 exportCho transpose defines, F-003 capoFret in edit, F-004 zen/swipe) plus F-005..F-011 encoded in phase goals/gates | file=.atomic-skills/reviews/2026-09-19-diagramas-cifra-claude-pass1.md
