---
schemaVersion: "0.1"
slug: batida-editor-f0-b0-create-edit-one-pattern-keep-local-en
title: B0 Create/edit one pattern + keep-local enrich
summary: "Criar/editar um {x_strum:} na folha Batida + enrich keep-local."
goal: Musician can create and edit a single `{x_strum:}` pattern from the chart
  UI (CTA without batida, sheet with 1-beat-per-row on phone, slot→list picker);
  enrich no longer clobbers local batida; fixture + tests green; wire format
  unchanged.
status: done
branch: plan/batida-editor
started: 2026-09-13T21:25:51.418Z
lastUpdated: 2026-09-13T21:25:51.418Z
nextAction: "F0 complete; advance to F1 presets"
parentPlan: batida-editor
phaseId: F0
businessIntent:
  value: Músico cria/edita um {x_strum:} na UI da cifra quando o CC não trouxe
    batida (ou para ajustar a importada), sem quebrar o fio atual.
  workflow: Fixture+keep-local enrich → helpers core
    (listSlotChoices/setSlot/emptyPattern) → folha Vue slot→lista + CTA + strip
    lápis.
  rules: Source-SoT; fio {x_strum:}/StrumSlot congelado no B0; strip só leitura;
    keep-local no enrich; fixtures reais; sem Vue no core; sem pausa no criador
    (passa=não tocar).
  outOfScope: Presets (F1); multi-padrão no fio (F2); dialog rico de conflito CC
    (F3); amarração letra; som de raspagem; player áudio.
  doneWhen: Fixture com x_strum; testes core strum-edit + enrich keep-local
    verdes; Vue batida-editor + strum-strip verdes; zero import Vue em src/core.
tasksDone: 3
tasksTotal: 3
gatesMet: 2
gatesTotal: 2
exitGates:
  - id: F0-G1
    description: Core strum edit helpers and keep-local enrich tests green; fixture
      with x_strum exists.
    status: pending
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/strum.test.ts
        tests/core/strum-edit.test.ts tests/core/cifraclub-enrich.test.ts && rg
        -n '\{x_strum:' fixtures/sda/005-tua-vontade.cho
      expectExitCode: 0
  - id: F0-G2
    description: Vue Batida sheet/picker and CTA tests green; no Vue imports in src/core.
    status: pending
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/vue/batida-editor.test.ts
        tests/vue/strum-strip.test.ts && ! rg -n "from ['\"]vue['\"]" src/core
      expectExitCode: 0
stack:
  - id: 1
    title: B0 Create/edit one pattern + keep-local enrich
    type: task
    openedAt: 2026-09-13T21:25:51.418Z
tasks:
  - id: T-001
    title: Fixture with x_strum + enrich keep-local
    summary: "Meta {x_strum:} na fixture 005 + enrich keep-local (inverte prefer-cc)."
    weight: 2
    status: done
    lastUpdated: 2026-09-13T21:25:51.418Z
    scopeBoundary:
      - Do not invent lyric body; do not change strum token alphabet; do not add
        multi-pattern persistence; do not build Vue editor UI here.
    acceptance:
      - Hand-add a minimal `{x_strum:}` meta line to fixtures/sda/005-tua-vontade.cho
        (do not invent lyrics; do not rely on enrich from TUA no-strum CC HTML);
        proposeCifraClubEnrich omits x_strum from patch when local already has
        x_strum; when local lacks x_strum and CC has strum, patch still includes
        x_strum; the old prefer-cc overwrite test is rewritten to assert keep-local;
        CHANGELOG notes enrich keep-local for batida
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/cifraclub-enrich.test.ts && rg -n
        '\{x_strum:' fixtures/sda/005-tua-vontade.cho
      expectExitCode: 0
    outputs:
      - kind: file
        path: fixtures/sda/005-tua-vontade.cho
      - kind: file
        path: fixtures/manifest.json
      - kind: file
        path: src/core/import-chordpro.ts
      - kind: file
        path: tests/core/cifraclub-enrich.test.ts
      - kind: file
        path: CHANGELOG.md
  - id: T-002
    title: Core strum edit helpers
    summary: "Helpers core: listSlotChoices, slotEquals, setSlot, emptyPattern."
    weight: 2
    status: done
    lastUpdated: 2026-09-13T21:25:51.418Z
    scopeBoundary:
      - No Vue; no multi-pattern wire format; no preset catalog; do not remove
        rest from parse/decode of legacy `-`.
    acceptance:
      - listSlotChoices returns 8 hit composites + 2 ghost and zero rest;
        slotEquals compares StrumSlots for picker current-state; setSlot/
        resizePattern/emptyPattern are immutable and round-trip via
        formatXStrum/parseXStrum; emptyPattern slots are ghost not rest and
        copy bpm from chart tempo when provided; writeMeta/format identity
        rewrite without slot edits preserves canonical x_strum string; existing
        strum.test.ts still green
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/strum.test.ts
        tests/core/strum-edit.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: src/core/strum.ts
      - kind: file
        path: src/core/index.ts
      - kind: file
        path: tests/core/strum.test.ts
      - kind: file
        path: tests/core/strum-edit.test.ts
  - id: T-003
    title: Vue Batida sheet + slot picker + CTA
    summary: "UI Vue: CTA, folha Batida, picker slot→lista, lápis no strip."
    weight: 5
    status: done
    lastUpdated: 2026-09-13T21:25:51.418Z
    scopeBoundary:
      - No presets UI; no multi-pattern persistence; do not make StrumStrip the
        edit SoT; do not bind batida to lyric sections; do not invent scrape
        audio.
    acceptance:
      - Without x_strum, view shows + Criar batida and opens BatidaSheet; sheet
        lays out one beat per row on narrow; tapping a slot opens picker with 8
        hit + 2 ghost choices and no pausa (narrow=bottom sheet, wide=popover);
        current choice marked via slotEquals; save writes {x_strum:} via writeMeta
        and hasStrum becomes true; Apagar removes x_strum and restores + Criar;
        legacy pat `-` displays/edits as passa and save does not write new `-`;
        create path mirrors {tempo:} into pattern bpm; edit existing via strip
        pencil in view (strip stays hidden in chart edit mode; chrome chip/lápis
        still opens sheet); strip remains read-only projection
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/vue/batida-editor.test.ts
        tests/vue/strum-strip.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: src/vue/sheets/BatidaSheet.vue
      - kind: file
        path: src/vue/edit/BatidaSlotPicker.vue
      - kind: file
        path: src/vue/StrumStrip.vue
      - kind: file
        path: src/vue/ChordproViewer.vue
      - kind: file
        path: src/vue/chrome/CpvWideDock.vue
      - kind: file
        path: src/vue/chrome/CpvMoreSheet.vue
      - kind: file
        path: src/vue/chrome/CpvPhoneDock.vue
      - kind: file
        path: src/vue/index.ts
      - kind: file
        path: tests/vue/batida-editor.test.ts
      - kind: file
        path: tests/vue/strum-strip.test.ts
parked: []
emerged: []
---

# Narrative / notes

Initiative for phase **F0 — B0 Create/edit one pattern + keep-local enrich**.

Execution order: T-001 → T-002 → T-003 (Vue sheet needs core helpers).

## Decisions

_(record decisions here as they are made)_

## Links

_(plan doc, external refs)_
