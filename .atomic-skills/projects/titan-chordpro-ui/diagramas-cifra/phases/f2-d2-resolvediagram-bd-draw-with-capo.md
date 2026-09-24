---
schemaVersion: "0.1"
slug: diagramas-cifra-f2-d2-resolvediagram-bd-draw-with-capo
title: D2 resolveDiagram + BD + draw with capo
goal: Layout segs expose concert, shapeName, capoFret before dual/Nashville;
  resolveDiagram hits dictionary or file override; guitar/ukulele SVG draws the
  hand shape with capo bar and Capo n; piano draws concert keys; capo-solo still
  marks capoFret.
status: active
branch: plan/diagramas-cifra
started: 2026-09-20T20:56:39.000Z
lastUpdated: 2026-09-20T21:44:13.000Z
nextAction: Run phase-done for F2.
parentPlan: diagramas-cifra
phaseId: F2
businessIntent:
  value: O musico precisa ver a forma da mao sob o capo no violao e no ukulele, e
    as teclas de concert no piano. Buscar a voicing de concert no capo 2
    enquanto a cifra diz Bm mente no ensaio.
  workflow: Layout expoe concert, shapeName e capoFret mesmo em edit ou Nashville;
    resolveDiagram prefere o {define} do arquivo ao dicionario do pacote;
    guitarra usa shapeName, piano usa concert; o core devolve o modelo de
    desenho (pontos, mute, barre, barra de capo, rotulo Capo n, teclas). Modal
    Vue e validacao visual ficam na F3.
  rules: capo 2 dual em Bm gera concert Bm, shapeName Am e capoFret 2; capo-solo
    ainda tem capoFret 2; C7M acerta voicing maj7; C7+ e miss; uma voicing por
    nome (open mais grave); QUALITY com Object.hasOwn (L-002); zero import Vue
    no core; nao pausar Rolar nem metronomo nesta fase.
  outOfScope: Modal Vue DiagramModal, prefs diagramInstrument, editor D4, pausa de
    Rolar e metronomo, baritono, swipe e zen, validacao grafica do look no
    telefone (isso e F3).
  doneWhen: tests/core/layout-capo.test.ts, tests/core/resolve-diagram.test.ts e
    tests/core/diagram-draw.test.ts passam; guitarra com capo 2 nao desenha
    voicing de concert; piano ignora capoFret.
tasksDone: 3
tasksTotal: 3
gatesMet: 0
gatesTotal: 1
weightDone: 9
weightTotal: 9
exitGates:
  - id: F2-G1
    description: Layout fields, resolveDiagram, and diagram SVG tests green. FAILS
      when capo-solo leaves capoFret 0 or guitar draw uses concert voicing under
      capo 2.
    status: pending
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/layout-capo.test.ts
        tests/core/resolve-diagram.test.ts tests/core/diagram-draw.test.ts
      expectExitCode: 0
    verifierLabel: "shell: pnpm exec vitest run tests/core/layout-capo.test.ts tests/c…"
stack:
  - id: 1
    title: D2 resolveDiagram + BD + draw with capo
    type: task
    openedAt: 2026-09-20T20:56:39.000Z
tasks:
  - id: T-001
    title: Layout concert / shapeName / capoFret
    status: done
    closedAt: 2026-09-20T21:44:13.000Z
    lastUpdated: 2026-09-20T21:44:13.000Z
    evidence:
      verifierKind: shell
      verifiedAt: 2026-09-20T21:43:27.000Z
      verifiedCommit: c09259cfad432b5c671f856693e5a619ea8ce182
      passed: true
      exitCode: 0
      outputSummary: ✓ tests/core/layout-capo.test.ts (18 tests)
    scopeBoundary:
      - No Vue; no dictionary; do not change auto-scroll math; do not use
        shapeCapo as the draw source.
    acceptance:
      - Each playable seg has concert, shapeName, capoFret; capo 2 dual on
        source Bm yields concert Bm and shapeName Am and capoFret 2; capo 2 dual
        off still has capoFret 2 and shapeName Am; Nashville changes the label
        only; lens letra still drops chords from the reading blocks
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/layout-capo.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: src/core/types.ts
      - kind: file
        path: src/core/layout.ts
      - kind: file
        path: tests/core/layout-capo.test.ts
    summary: Layout expoe concert, shapeName e capoFret no seg tocavel mesmo em edit.
    weight: 3
  - id: T-002
    title: Dictionary + resolveDiagram
    status: done
    closedAt: 2026-09-24T16:34:31.000Z
    lastUpdated: 2026-09-24T16:34:31.000Z
    evidence:
      verifierKind: shell
      verifiedAt: 2026-09-24T16:34:31.000Z
      verifiedCommit: e8cff9e27e93fd8e9272b86d460afd291f58af36
      passed: true
      exitCode: 0
      outputSummary: ✓ tests/core/resolve-diagram.test.ts (33 tests)
    scopeBoundary:
      - No Vue; no editor sheet; guitar dictionary is EADGBE; ukulele is GCEA
        only; do not ship baritone; do not guess 7+.
    acceptance:
      - resolveDiagram({ token, instrument, overrides }) prefers file override
        over dictionary; guitar token is shapeName; piano token is concert; miss
        reasons are unknown-token or no-shape; C7M hits maj7 voicing; C7+ is
        miss; one voicing per name (lowest open)
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/resolve-diagram.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: src/core/chord-dict.ts
      - kind: file
        path: src/core/resolve-diagram.ts
      - kind: file
        path: src/core/index.ts
      - kind: file
        path: tests/core/resolve-diagram.test.ts
      - kind: file
        path: src/core/define.ts
      - kind: file
        path: tests/core/define-directive.test.ts
    summary: Dicionario e resolveDiagram preferem {define} do arquivo; C7+ e miss.
    weight: 3
  - id: T-003
    title: SVG draw guitar ukulele piano with capo
    status: done
    closedAt: 2026-09-23T18:43:30.000Z
    lastUpdated: 2026-09-23T18:43:30.000Z
    evidence:
      verifierKind: shell
      verifiedAt: 2026-09-23T18:42:45.000Z
      verifiedCommit: b30690c8b98fc64e7c09a1d450e56c14304fa364
      passed: true
      exitCode: 0
      outputSummary: ✓ tests/core/diagram-draw.test.ts (12 tests)
    scopeBoundary:
      - No Vue components; draw returns data or SVG string from core; do not
        pause auto-scroll here; do not open the modal.
    acceptance:
      - Guitar/ukulele draw with capoFret 2 includes a capo bar and the label
        Capo 2; open string in the shape is at the capo, not the nut; piano draw
        ignores capoFret and lights concert keys; fingers 1-4 render when
        present, else dots only
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/diagram-draw.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: src/core/diagram-draw.ts
      - kind: file
        path: src/core/index.ts
      - kind: file
        path: tests/core/diagram-draw.test.ts
    summary: Modelo de draw no core com barra Capo n; piano ignora capoFret.
    weight: 3
parked: []
emerged: []
startedCommit: 9b8033aba89b8c5fc71e84e6335d80e9fdcde78b
planTitle: Diagramas de cifra — `titan-chordpro-ui`
planActive: true
current: true
---

# Narrative / notes

Initiative for phase **F2 — D2 resolveDiagram + BD + draw with capo**.

## Decisions

- Visual validation of diagram look is F3 (operator 2026-09-20), not F2.

## Links

_(plan doc, external refs)_

## Session handoff
- **Narrative:** F2 tasks are closed. `{define: D keys 12 16 19}` stays a distance and draws D, F#, A. Transpose +2 keeps `12 16 19` on E. MIDI is only when every key is above 17, or any key is below 0. Host verifiers passed. Local review was clean. Codex Astra informed pass approved `bfa02a6..a74cc81`. T-002 is done on `e8cff9e`. F3 is not started.
- **Decision log:** `.atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/decisions/F2.jsonl`. The mixed-MIDI finding on `14 18 21` was dropped because ChordPro reads those numbers as distances.
- **Single nextAction:** Run phase-done for F2.
- **Open bug:** none in the host verifiers. Receipt `.atomic-skills/reviews/2026-09-24-1625-diagramas-cifra-f2-fix12-both.md`.
- **Already green, do not reopen:** capo 2 on Bm is concert Bm / shape Am / capoFret 2. Slash without a matching bass override is no-shape. C7+ is not a diagram. D `0 4 7` +2 stores E keys `[0, 4, 7]` and draws E G# B. C `0 4 7` +2 stores D keys `[0, 4, 7]` and draws D F# A. B `0 4 7` +1 stores C keys `[0, 4, 7]` and draws C E G. `B keys 11 3 6` is distances, not B major. MIDI `48 52 55` +2 is still `[50, 54, 57]`. F7sus4 `0 5 10` +2 stores `G7sus4` keys `[0, 5, 10]` and draws G, C, F. Dsus2 `0 7` +5 stores `Gsus2` keys `[0, 7]` and draws G, D; −5 stores `[0, 7]` and draws D, A. Dsus2 +3 stores `Fsus2` keys `[0, 7]` and draws F, C; −3 stores `[0, 7]` and draws D, A. C `0 2` +2 stores D keys `[0, 2]` and draws D, E; −2 stores C keys `[0, 2]` and draws C, D. D9 `0 4 7 14` draws D, F#, A, E; +2 stores `E9` keys `[0, 4, 7, 14]` and draws E, G#, B, F#. D7M(9)/B keys `9 0 11 2` draws B, D, C#, E. Am `0 3 7` draws A, C, E. Am `9 0 4` draws F#, A, C#. No Vue in core.
- **Verbatim state:** Plan branch `plan/diagramas-cifra`. HEAD `e8cff9e27e93fd8e9272b86d460afd291f58af36`. Product commit `a74cc8191790b5071dc041814ae0d41f6209a086`. T-002 verifier `pnpm exec vitest run tests/core/resolve-diagram.test.ts` exit 0, 33 tests, verifiedCommit `e8cff9e27e93fd8e9272b86d460afd291f58af36`. Also `define-directive` + `resolve-diagram` + `export-cho` = 75 passed; `layout-capo` + `resolve-diagram` + `diagram-draw` = 63 passed. Cursor step E, phaseId F2, redispatchCount 12. Lease cleared. Worktree `diagramas-cifra-F2-fix12` removed.
- **Uncommitted changes:** clean tree after the T-002 checkpoint commit.
