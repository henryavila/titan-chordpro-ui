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
nextAction: fix Dsus2 +5 piano transpose (Gsus2 keys 7 2 must light G D); do not start F3
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
tasksDone: 2
tasksTotal: 3
gatesMet: 0
gatesTotal: 1
weightDone: 6
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
    status: pending
    lastUpdated: 2026-09-23T19:05:00.000Z
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
- **Narrative:** F2 is open. Dictionary identity for 17 qualities × 12 roots × guitar and ukulele is green (408 cells). Piano `{define}` transpose is not done. Codex Astra (`gpt-6-astra` only; do not send reviews to Claude) reviewed `4c1a21d..fb9e228` and kept 1 major. F3 modal and phone look stay out. Known-miss list (m7(11) and slash) stays deferred to F3 by operator choice.
- **Decision log:** `.atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/decisions/F2.jsonl`. Latest review receipt: `.atomic-skills/reviews/2026-09-23-1906-diagramas-cifra-f2-transpose-reading-codex.md` (needs_changes, 1 major, 0 critical).
- **Single nextAction:** fix Dsus2 +5 piano transpose (Gsus2 keys 7 2 must light G D); do not start F3
- **Open bug:** `{define: Dsus2 keys 0 7}` plus 5 semitones becomes `{define: Gsus2 keys 7 2}`. Both readings score two sus2 tones. The characteristic second makes the resolver treat `7 2` as intervals, so the draw lights D and A (pcs 2, 9), not G and D (pcs 7, 2). Minus 5 then does not restore D and A. The same class was fixed for F7sus4 `0 5 10` +2 (now G, C, F) and Dsus2 `0 7` +3 (now F, C, and −3 returns D, A). Storing shifted sounding pitch classes is not enough when the new root re-reads them as intervals. `transposeDefine` is in `src/core/define.ts`. The shared reading is `pianoSoundingPitchClasses` in `src/core/chord-dict.ts`. `drawPiano` adds the root back.
- **Already green, do not reopen:** capo 2 on Bm is concert Bm / shape Am / capoFret 2. Slash without a matching bass override is no-shape. C7+ is not a diagram. D `0 4 7` +2 draws E G# B. C `0 4 7` +2 is still D keys `2 6 9`. B `11 3 6` +1 is still C keys `0 4 7`. MIDI `48 52 55` +2 is still `50 54 57`. F7sus4 untransposed still draws F A# D#. D7M(9)/B keys `11 2 1 4` still draws B D C# E. No Vue in core.
- **Verbatim state:** HEAD `394564f03d1f42ceb00a71b5a6f24727f9539766` on `plan/diagramas-cifra`. Product fix commit `fb9e22885ba40667f55a2811c32cf91765422b1a`, merge `39f2370`. Cursor `.atomic-skills/status/automate/diagramas-cifra.json` step D.5, phaseId F2, redispatchCount 6 (next code writer needs `operatorOverride`; do not hand-edit the count down). T-001 done, T-002 pending, T-003 done. tasksDone 2/3. Last host verifier: define + resolve + export-cho + layout-capo + diagram-draw = 92 tests, exit 0, before the +5 finding. Worktree `/Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra`.
- **Uncommitted changes:** none at this handoff. Next session starts from a clean tree.
