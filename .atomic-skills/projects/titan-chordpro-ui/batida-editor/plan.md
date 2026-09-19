---
schemaVersion: "0.1"
slug: batida-editor
title: Editor de batida — `titan-chordpro-ui`
version: "1.0"
status: done
started: 2026-09-13T21:25:51.418Z
lastUpdated: 2026-09-13T21:25:51.418Z
branch: plan/batida-editor
currentPhase: F3
parallelismAllowed: false
principles:
  - id: P1
    title: Source ChordPro is SoT
    body: Create/edit batida writes `{x_strum:}` via `formatXStrum` + `writeMeta`
      and re-parses; no parallel Vue/storage SoT.
  - id: P2
    title: Freeze the wire in B0
    body: Do not change `StrumSlot`, token alphabet `D/U/!/m/a/d/u/-`, or
      single-`{x_strum:}` grammar in B0; existing files round-trip without
      silent rewrite drift.
  - id: P3
    title: Gates over mega-DONE
    body: Ship B0→B3 with per-gate fixtures and tests; do not claim “batida editor
      complete” without the gate green.
  - id: P4
    title: Strip is read projection
    body: StrumStrip stays read-only (+ open-editor affordance); editing happens in
      the dedicated Batida sheet/picker.
  - id: P5
    title: Keep-local enrich
    body: If `{x_strum:}` already exists, enrich does not overwrite it; prefer-cc
      for batida only fills absence.
  - id: P6
    title: Real fixtures only
    body: Add `{x_strum:}` via enrich of a real fixture or minimal meta on an
      existing chart; do not invent lyric content.
glossary:
  - term: "`{x_strum:}`"
    definition: ChordPro meta holding one strum pattern (`bpm; meter; grid; label; pat=`).
  - term: StrumSlot
    definition: "One grid cell: `dir` + `contact` (`hit|ghost|rest`) + `essence`
      (`normal|accent|mute|muted` or null)."
  - term: B0–B3
    definition: "Delivery gates: single-pattern editor → presets → multi-pattern
      persistence → enrich conflict polish."
  - term: Slot-first picker
    definition: Tap a beat mark → list of composed states (not a global paint palette).
  - term: keep-local
    definition: Enrich policy that preserves an existing `{x_strum:}` unless the
      user explicitly replaces it.
phases:
  - id: F0
    slug: batida-editor-f0-b0-create-edit-one-pattern-keep-local-en
    title: B0 Create/edit one pattern + keep-local enrich
    summary: Criar/editar um padrão {x_strum:} + enrich keep-local.
    goal: Musician can create and edit a single `{x_strum:}` pattern from the chart
      UI (CTA without batida, sheet with 1-beat-per-row on phone, slot→list
      picker); enrich no longer clobbers local batida; fixture + tests green;
      wire format unchanged.
    dependsOn: []
    subPhaseCount: 3
    exitGate:
      summary: 2 criteria to meet
      criteria:
        - id: F0-G1
          description: Core strum edit helpers and keep-local enrich tests green; fixture
            with x_strum exists.
          status: pending
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/core/strum.test.ts
              tests/core/strum-edit.test.ts tests/core/cifraclub-enrich.test.ts
              && rg -n '\{x_strum:' fixtures/sda/005-tua-vontade.cho
            expectExitCode: 0
        - id: F0-G2
          description: Vue Batida sheet/picker and CTA tests green; no Vue imports in
            src/core.
          status: pending
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/vue/batida-editor.test.ts
              tests/vue/strum-strip.test.ts && ! rg -n "from ['\"]vue['\"]"
              src/core
            expectExitCode: 0
    status: done
    businessIntent:
      value: Músico cria/edita um {x_strum:} na UI da cifra quando o CC não trouxe
        batida (ou para ajustar a importada), sem quebrar o fio atual.
      workflow: Fixture+keep-local enrich → helpers core
        (listSlotChoices/setSlot/emptyPattern) → folha Vue slot→lista + CTA +
        strip lápis.
      rules: Source-SoT; fio {x_strum:}/StrumSlot congelado no B0; strip só leitura;
        keep-local no enrich; fixtures reais; sem Vue no core; sem pausa no
        criador (passa=não tocar).
      outOfScope: Presets (F1); multi-padrão no fio (F2); dialog rico de conflito CC
        (F3); amarração letra; som de raspagem; player áudio.
      doneWhen: Fixture com x_strum; testes core strum-edit + enrich keep-local
        verdes; Vue batida-editor + strum-strip verdes; zero import Vue em
        src/core.
  - id: F1
    slug: batida-editor-f1-b1-presets-embutidos
    title: B1 Presets embutidos
    summary: Catálogo de presets embutidos aplicados na folha Batida.
    goal: Core catalog of named strum presets apply into the single `{x_strum:}`
      pattern from the Batida sheet with confirm-if-dirty; IDs stable; tests
      green.
    dependsOn:
      - F0
    subPhaseCount: 0
    exitGate:
      summary: 1 criterion to meet
      criteria:
        - id: F1-G1
          description: Preset catalog + Vue apply tests green.
          status: pending
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/core/strum-presets.test.ts
              tests/vue/batida-presets.test.ts
            expectExitCode: 0
    status: done
  - id: F2
    slug: batida-editor-f2-b2-multi-pattern-named-persistence
    title: B2 Multi-pattern named + persistence
    summary: Vários padrões nomeados com persistência compatível.
    goal: Multiple named patterns selectable in UI; introduce a documented multi
      schema that keeps legacy single `{x_strum:}` parse; CC import keeps
      patterns 2..N when the multi writer exists.
    dependsOn:
      - F1
    subPhaseCount: 0
    exitGate:
      summary: 1 criterion to meet
      criteria:
        - id: F2-G1
          description: Multi-pattern parse/format + selector tests green; legacy single
            x_strum still parses.
          status: pending
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/core/strum-multi.test.ts
              tests/vue/batida-multi.test.ts tests/core/strum.test.ts
            expectExitCode: 0
    status: done
  - id: F3
    slug: batida-editor-f3-b3-enrich-conflict-polish
    title: B3 Enrich conflict polish
    summary: Conflito explícito enrich CC vs batida local.
    goal: When user explicitly wants CC batida over local, offer Manter / Trazer CC
      (with named copy when multi exists); no silent clobber; ship only after
      B0–B2 exit gates are met.
    dependsOn:
      - F2
    subPhaseCount: 0
    exitGate:
      summary: 1 criterion to meet
      criteria:
        - id: F3-G1
          description: Enrich conflict UI/tests green for explicit CC batida replace vs
            keep-local.
          status: pending
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/vue/meta-dialog.test.ts
              tests/core/cifraclub-enrich.test.ts
            expectExitCode: 0
    status: done
references: []
planTitle: Editor de batida — `titan-chordpro-ui`
---

# Editor de batida — `titan-chordpro-ui`

## 1. Context

Músicas sem `{x_strum:}` (CC sem batida ou cifra à mão) não têm faixa/metrônomo de batida; cifras com batida importada não permitem criar nem ajustar o mapa. Este plano entrega um editor Source-SoT na UI da cifra: folha Batida, fio `{x_strum:}` congelado no B0, mapa completo com gates B0–B3 (presets, multi-padrão, conflito enrich). verified_by: `projects/titan-chordpro-ui/batida-editor/design.md`.

## 2. Inviolable principles

- **P1 Source ChordPro is SoT** — Create/edit batida writes `{x_strum:}` via `formatXStrum` + `writeMeta` and re-parses; no parallel Vue/storage SoT.
- **P2 Freeze the wire in B0** — Do not change `StrumSlot`, token alphabet `D/U/!/m/a/d/u/-`, or single-`{x_strum:}` grammar in B0; existing files round-trip without silent rewrite drift.
- **P3 Gates over mega-DONE** — Ship B0→B3 with per-gate fixtures and tests; do not claim “batida editor complete” without the gate green.
- **P4 Strip is read projection** — StrumStrip stays read-only (+ open-editor affordance); editing happens in the dedicated Batida sheet/picker.
- **P5 Keep-local enrich** — If `{x_strum:}` already exists, enrich does not overwrite it; prefer-cc for batida only fills absence.
- **P6 Real fixtures only** — Add `{x_strum:}` via enrich of a real fixture or minimal meta on an existing chart; do not invent lyric content.

## 3. Phase tree

_(Canonical list in frontmatter `phases:`. aiDeck renders the tree visually when running.)_

## Ground-truth review

**Status:** complete-with-findings
**Codebase class:** populated
**Scanned:** src/core/, src/vue/, fixtures/sda/, tests/core/, tests/vue/ → 68 product .ts/.vue under src/core+src/vue
**Commit:** 0f3cadb
**At:** 2026-09-13T21:55:26Z

### A — Plan premises vs code

| # | Premise | Result | Evidence |
|---|---------|--------|----------|
| 1 |  has formatXStrum/parseXStrum | ok | strum.ts:124,135 |
| 2 |  / META_KEYS include x_strum | ok | import-chordpro.ts:342,367 |
| 3 | StrumStrip + ChordproViewer read x_strum today | ok | ChordproViewer.vue:376-392; StrumStrip.vue |
| 4 | MetaDialog/chrome docks exist for wiring CTA | ok | MetaDialog.vue; CpvWideDock/MoreSheet/PhoneDock |
| 5 | fixtures/sda/005-tua-vontade.cho exists (meta target) | ok | fixtures/sda/005-tua-vontade.cho |
| 6 | Enrich currently prefer-cc overwrites local x_strum | ok (false-contract to change in T-001) | import-chordpro.ts:967-968; cifraclub-enrich.test.ts prefer-cc case |
| 7 | BatidaSheet / BatidaSlotPicker / listSlotChoices do not exist yet | ok | greenfield outputs of F0 |

### B — Code present, plan silent (impact candidates)

| # | Finding | Location | Impact | Disposition |
|---|---------|----------|--------|-------------|
| 1 | useMetronome beatClock drives strip highlight | src/vue/use/useMetronome.ts | direct | accepted — sheet/picker must keep strip clock wiring |
| 2 | StrumStrip canPick stub unused | StrumStrip.vue:17-19 | indirect | F2 — leave stub until multi |
| 3 | MetaDialog enrich UI + strumMissing warning | MetaDialog.vue | direct | T-001/F3 touch; keep-local changes chip behavior |
| 4 | Existing sheets pattern (MetronomeSheet etc.) | src/vue/sheets/ | direct | BatidaSheet follows same sheet family |
| 5 | sourceVisible hidden when isEdit | ChordproViewer.vue:386 | direct | T-003 acceptance — chrome opens sheet in edit |

**Counts:** premises=7 (missing=0, false=0); impacts=5 (direct=4, indirect=1)


## Reviews

- ground-truth: complete-with-findings | mode=ground-truth | fp=ab4768db328e | premises=7 | impacts=5 @ 0f3cadb (2026-09-13T22:11:59.838Z)
- internal: findings applied (fixture hand-meta, slotEquals, Apagar, keep-local test invert, bpm/tempo, legacy rest→passa) @ 0f3cadb (2026-09-13T21:55:26Z)
- cross-model: SKIPPED — operator: skip cross-model: nao tenho token para usar outro modelo
