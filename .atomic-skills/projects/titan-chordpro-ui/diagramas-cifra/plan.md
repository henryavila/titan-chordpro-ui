---
schemaVersion: "0.1"
slug: diagramas-cifra
title: Diagramas de cifra — `titan-chordpro-ui`
version: "1.0"
status: active
started: 2026-09-19T08:49:13.733Z
lastUpdated: 2026-09-20T20:56:39.000Z
branch: plan/diagramas-cifra
executionMode: automate
currentPhase: F2
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
      `7+` and quote junk are AMBIGUOUS/UNPARSED; `m(3b)` parses as `m`; slash
      after `/` is always bass; generator follows parser; zero invented
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
          status: met
          metAt: 2026-09-20T14:21:51.000Z
          evidence:
            verifierKind: shell
            verifiedAt: 2026-09-20T14:21:51.000Z
            verifiedCommit: 3fdb7b8dfc24c5c8cd8d1aca81771e83cc80647c
            passed: true
            exitCode: 0
            outputSummary: ✓ parse-chord-token (15) + chord-oracle (10); Tests 25 passed
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/core/parse-chord-token.test.ts
              tests/core/chord-oracle.test.ts
            expectExitCode: 0
        - id: F0-G2
          description: No Vue imports in src/core.
          status: met
          metAt: 2026-09-20T14:21:51.000Z
          evidence:
            verifierKind: shell
            verifiedAt: 2026-09-20T14:21:51.000Z
            verifiedCommit: 3fdb7b8dfc24c5c8cd8d1aca81771e83cc80647c
            passed: true
            exitCode: 0
            outputSummary: ✓ tests/core/no-vue-in-core.test.ts (1 test)
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/core/no-vue-in-core.test.ts
            expectExitCode: 0
    status: done
    evaluationGate:
      status: passed
      verdict: pass
      reportPath: .atomic-skills/reviews/eval-diagramas-cifra-F0.md
      at: 3fdb7b8dfc24c5c8cd8d1aca81771e83cc80647c
      verifiedAt: 2026-09-20T14:32:00.000Z
    lessonsState: recorded
    lessonsPath: .atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/lessons/diagramas-cifra-f0-d0-parser-br-oraculo-257.md
    reviewGate:
      status: passed
      mode: both
      at: 3fdb7b8dfc24c5c8cd8d1aca81771e83cc80647c
      reviewFile: .atomic-skills/reviews/2026-09-20-diagramas-cifra-F0-close-both.md
      localReceiptPath: .atomic-skills/reviews/2026-09-20-diagramas-cifra-F0-close-local.md
      codexReceiptPath: .atomic-skills/reviews/2026-09-20-diagramas-cifra-F0-close-claude.md
      verifiedAt: 2026-09-20T14:32:00.000Z
    decisionReview:
      status: passed
      verifiedAt: 2026-09-20T14:32:00.000Z
      packagePath: .atomic-skills/reviews/2026-09-20-diagramas-cifra-F0-decision-package.md
      packagePresentedAt: 2026-09-20T14:32:00.000Z
      evidencePath: .atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/decisions/F0.jsonl
    deliveryAuditGate:
      status: passed
      verdict: CLOSED
      reportPath: .atomic-skills/reviews/2026-09-20-diagramas-cifra-F0-delivery-audit.md
      verifiedAt: 2026-09-20T14:32:00.000Z
    businessIntent:
      value: O músico precisa que o core reconheça o nome brasileiro do acorde (7M, 4,
        9, 2, slash) sem inventar forma. Um C7M desenhado como C7 mente no
        ensaio.
      workflow: Gerar a tabela-oráculo dos nomes únicos em fixtures/sda; implementar
        parseChordToken com aliases; testes em tests/core/chord-oracle.test.ts e
        tests/core/parse-chord-token.test.ts; exportar pelo index do core.
      rules: 7M vira maj7; 4 e sus viram sus4; 9 vira add9; 2 vira sus2; 7+ e aspas no
        nome sao AMBIGUOUS ou UNPARSED; m(3b) parseia como m; o que vem depois
        de / e sempre baixo; gerador segue o parser; nao chutar voicing; zero
        import Vue em src/core.
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
    subPhaseCount: 2
    exitGate:
      summary: 1 criterion to meet
      criteria:
        - id: F1-G1
          description: Define parse/serialize and exportCho tests green. FAILS when
            writeMeta strips {define-guitar:}, when exportCho({semitones:2})
            leaves a define that no longer matches the transposed shapeName, or
            when parse(src).defines is missing.
          status: met
          metAt: 2026-09-20T16:35:00.000Z
          evidence:
            verifierKind: shell
            verifiedAt: 2026-09-20T16:35:00.000Z
            verifiedCommit: c1dad342cd163c55cabe5a3dc548c8743f2d5ab4
            passed: true
            exitCode: 0
            outputSummary: ✓ define-directive (25) + export-cho (6); Tests 31 passed
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/core/define-directive.test.ts
              tests/core/export-cho.test.ts
            expectExitCode: 0
    status: done
    evaluationGate:
      status: passed
      verdict: pass
      reportPath: .atomic-skills/reviews/eval-diagramas-cifra-F1.md
      at: d6591d612ac250a8f4fc7e051c1919cb6a7e5fe3
      verifiedAt: 2026-09-20T16:10:54.000Z
    lessonsState: recorded
    lessonsPath: .atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/lessons/diagramas-cifra-f1-d1-define-parse-serialize-round-trip.md
    reviewGate:
      status: passed
      mode: both
      at: c1dad342cd163c55cabe5a3dc548c8743f2d5ab4
      reviewFile: .atomic-skills/reviews/2026-09-20-diagramas-cifra-F1-close-both.md
      localReceiptPath: .atomic-skills/reviews/2026-09-20-diagramas-cifra-F1-close-local.md
      codexReceiptPath: .atomic-skills/reviews/2026-09-20-diagramas-cifra-F1-close-claude.md
      verifiedAt: 2026-09-20T16:30:00.000Z
    decisionReview:
      status: passed
      verifiedAt: 2026-09-20T16:35:00.000Z
      packagePath: .atomic-skills/reviews/2026-09-20-diagramas-cifra-F1-decision-package.md
      packagePresentedAt: 2026-09-20T16:32:00.000Z
      evidencePath: .atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/decisions/F1.jsonl
    deliveryAuditGate:
      status: passed
      verdict: CLOSED
      reportPath: .atomic-skills/reviews/2026-09-20-diagramas-cifra-F1-delivery-audit.md
      verifiedAt: 2026-09-20T16:35:00.000Z
    businessIntent:
      value: O musico grava uma forma so naquele arquivo ChordPro. Se writeMeta ou
        exportCho dropa {define-guitar:}, a forma some na proxima abertura e o
        ensaio toca a forma errada.
      workflow: Parse {define}, {define-guitar} e {define-ukulele} com DIR hifenizado;
        serialize round-trip; writeDefines depois do header META_KEYS e antes da
        letra; parse() expoe defines; exportCho preserva e transpoe o nome da
        define com o mesmo semitone do corpo; fixture nova fora de fixtures/sda.
      rules: DIR aceita define-guitar e define-ukulele como chave inteira; writeMeta
        nao apaga linhas define; {define:} nu infere guitarra (6 trastes),
        ukulele (4) ou piano (keys); aridade desconhecida e miss;
        exportCho({semitones:2}) reescreve o nome da define para bater com o
        shapeName transposto; D4 nao escreve define ate F1-G1 verde.
      outOfScope: Editor Vue, SVG de braco/teclado, dicionario de voicings, chaves x_
        em META_KEYS, meta de batida, folha D4 de editor.
      doneWhen: tests/core/define-directive.test.ts e tests/core/export-cho.test.ts
        passam; parse(src).defines existe; writeMeta e exportCho mantem
        {define-guitar:}; exportCho com semitones 2 deixa o nome da define
        alinhado ao shapeName transposto.
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
    subPhaseCount: 3
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
    status: active
    evaluationGate:
      status: passed
      verdict: pass
      reportPath: .atomic-skills/reviews/eval-diagramas-cifra-F2-r3.md
      at: 9851e4cf0ce300e3944adf30fb991b3356be1e9a
      verifiedAt: 2026-09-24T22:07:58.000Z
    lessonsState: recorded
    lessonsPath: .atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/lessons/diagramas-cifra-f2-d2-resolvediagram-bd-draw-with-capo.md
    businessIntent:
      value: O musico precisa ver a forma da mao sob o capo no violao e no ukulele, e as teclas de concert no piano. Buscar a voicing de concert no capo 2 enquanto a cifra diz Bm mente no ensaio.
      workflow: Layout expoe concert, shapeName e capoFret mesmo em edit ou Nashville; resolveDiagram prefere o {define} do arquivo ao dicionario do pacote; guitarra usa shapeName, piano usa concert; o core devolve o modelo de desenho (pontos, mute, barre, barra de capo, rotulo Capo n, teclas). Modal Vue e validacao visual ficam na F3.
      rules: capo 2 dual em Bm gera concert Bm, shapeName Am e capoFret 2; capo-solo ainda tem capoFret 2; C7M acerta voicing maj7; C7+ e miss; uma voicing por nome (open mais grave); QUALITY com Object.hasOwn (L-002); zero import Vue no core; nao pausar Rolar nem metronomo nesta fase.
      outOfScope: Modal Vue DiagramModal, prefs diagramInstrument, editor D4, pausa de Rolar e metronomo, baritono, swipe e zen, validacao grafica do look no telefone (isso e F3).
      doneWhen: tests/core/layout-capo.test.ts, tests/core/resolve-diagram.test.ts e tests/core/diagram-draw.test.ts passam; guitarra com capo 2 nao desenha voicing de concert; piano ignora capoFret.
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
- Ground-truth (Flow E 2026-09-20): Status=complete; mode=ground-truth in Reviews line; detector exit 0. G1: every A row cites file:line. Initiative-depth 14–20 N/A in this mode (discovery 1/5: F0 only).

## Ground-truth review

**Status:** complete
**Codebase class:** populated
**Scanned:** `src/core/{parse,layout,import-chordpro,export-cho,storage,types,index,score,overlay,transpose,parse-chord,define}.ts`; `src/vue/{ChordproViewer,public,chart/ChartBody,edit/ChordDialog}.vue`; `tests/core/{layout-capo,no-vue-in-core,define-directive,export-cho,chord-oracle,parse-chord-token}.test.ts`; `fixtures/sda` (148 `.cho`) + `fixtures/define-roundtrip.cho`; glob absent (F2/F3 create): `src/core/chord-dict.ts`, `src/core/diagram-draw.ts`, `src/vue/overlay/DiagramModal.vue`.
**Commit:** 9b8033a
**At:** 2026-09-20T17:05:00Z

### A — Plan premises vs code

| # | Premise | Result | Evidence |
|---|---------|--------|----------|
| 1 | Hyphenated `{define-guitar:}` is a full DIR key after F1 | ok | define.ts:8 `DIR = /^\s*\{\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*:?\s*([^}]*)\}\s*$/` |
| 2 | `layout.ts` `display()` capo-solo returns shape as `name`; `shapeCapo` is 0 | ok | layout.ts:475 `if (!read.dual) return { name: shape, shape: '' }`; layout.ts:489 `shapeCapo = read.dual ? read.fret : 0` |
| 3 | `capoReadOf` returns fret 0 while editing or Nashville (`display()`/`shapeCapo` stay as today; F2 adds `capoFret`) | ok | layout.ts:457–458 `if (editing \|\| nash) return { fret: 0, dual: false }` |
| 4 | `META_KEYS` / `writeMeta` do not model `define` | ok | import-chordpro.ts:344–357 no `define`; writeMeta:425–437 filters only META_KEYS/`t`/`st` |
| 5 | `STORE_KEYS.prefs` + ChartStore exist | ok | storage.ts:24–26 `prefs: 'cpv:prefs'` |
| 6 | `ChartBody.vue` chords are spans (not `role=button`) | ok | ChartBody.vue:440–444 `<span class="cpv-chord">` |
| 7 | `ChordDialog.vue` edits the chord name only (no Forma) | ok | ChordDialog.vue:59–82 input `Nome do acorde`; no Forma control |
| 8 | `fixtures/sda` has 148 `.cho`, `013-ele-vive-em-mim.cho` exists, unique chord names for the oracle, zero `{define}` | ok | `ls fixtures/sda/*.cho` → 148; file present; grep `{define` → 0; research-digest 257; T-001 table is SoT (balanced `[…]` 255; naive nested regex 258 includes malformed ` Je[A` in `h441-vencendo-vem-jesus.cho:14`) |
| 9 | `tests/core/layout-capo.test.ts` and `tests/core/no-vue-in-core.test.ts` exist | ok | layout-capo.test.ts:1; no-vue-in-core.test.ts:19 `A14 no Vue in core` |
| 10 | `src/core/index.ts` exports `parse` and F0 `parseChordToken` | ok | index.ts:36 parse; index.ts:37 `export { parseChordToken } from './parse-chord'` |
| 11 | `parse()` exposes `defines` on ChordProView (F1 delivered) | ok | types.ts:23 `defines: ChordDefine[]` |
| 12 | `exportCho` + `tests/core/export-cho.test.ts` exist (F1 delivered) | ok | export-cho.ts:3; export-cho.test.ts present |
| 13 | `onSurfaceTap` and `useSongSwipe` already skip `[role='button']` | ok | ChordproViewer.vue:1622; useSongSwipe.ts:81–86 |
| 14 | `ViewerCapabilities` exists (no `diagrams` field yet) | ok | public.ts:56–68 `sourcePane` / `batidaPresets` / `debugSwipe` |
| 15 | `transposeToken` transposes the root only; suffix is opaque | ok | transpose.ts:32–42 `^([A-G](?:#\|b)?)(.*)$` |
| 16 | SoT `projects/titan-chordpro-ui/diagramas-cifra/design.md` exists | ok | file present |
| 17 | `parse-chord.ts` exists (F0); `chord-dict.ts` / `diagram-draw.ts` still F2 create; `DiagramModal.vue` still F3 create | ok / n/a | parse-chord.ts present; glob chord-dict.ts/diagram-draw.ts/DiagramModal.vue absent |

### B — Code present, plan silent (impact candidates)

| # | Finding | Location | Impact | Disposition |
|---|---------|----------|--------|-------------|
| 1 | `useMetronome` + `startScroll` / `rollLive` | useMetronome.ts:43; ChordproViewer.vue:1340 | direct | F3-G1: tap pauses auto-scroll and metronome; close resumes only what was running |
| 2 | `score.ts` / ScoreEditor guitar\|piano (melody vs chord diagram) | src/core/score.ts; src/vue/edit/ScoreEditor.vue | indirect | oos — P3/P4; design non-goal |
| 3 | `overlay.ts` personal ops + `persistSuggestion` host ack | overlay.ts; useOverlay.ts:59; public.ts:146 | indirect | F3 overlay modal, not overlay ops; persistSuggestion stays host suggestion path |
| 4 | BatidaSheet similar sheet chrome | src/vue/sheets/BatidaSheet.vue | indirect | F4 uses the same DiagramModal, not BatidaSheet |
| 5 | `onSurfaceTap` zen + `useSongSwipe` rails steal a chord *span* tap today | ChordproViewer.vue:1618–1635; useSongSwipe.ts:81–86 | direct | F3-G1: chord hit-target `role=button` (both hooks already ignore that role) |
| 6 | `ViewerCapabilities` has no `diagrams` flag | public.ts:56–68 | direct | F3-G1: diagrams on unless `capabilities.diagrams === false` |
| 7 | `persistPrefs` whitelist has no `diagramInstrument` | ChordproViewer.vue:1128–1150 | direct | F3 persists `diagramInstrument` on `STORE_KEYS.prefs` without wiping other keys |
| 8 | ToneSheet / CpvMoreSheet have no instrument picker | ToneSheet.vue; CpvMoreSheet.vue (grep instrument/ukulele/violão → 0) | none | accepted — P1: switch lives on the diagram modal |

**Counts:** premises=17 (missing=0, false=0, ok=16, create-n/a=1); impacts=8 (direct=4, indirect=3, none=1)

## Reviews

- internal: 2026-09-19 local self-loop (items 1–7, 14–20). Finding: F4 goal still said dedicated sheet vs Decision 11 same modal — fixed in plan.md goal.
- ground-truth: complete | mode=ground-truth | fp=b9e53627124d | premises=17 | impacts=8 @ uncommitted (2026-09-23T14:22:00Z)
- cross-model (claude): needs_changes | provider=claude | provider_version=2.1.263 | 4 critical applied (F-001 oracle vs dict, F-002 exportCho transpose defines, F-003 capoFret in edit, F-004 zen/swipe) plus F-005..F-011 encoded in phase goals/gates | file=.atomic-skills/reviews/2026-09-19-diagramas-cifra-claude-pass1.md
