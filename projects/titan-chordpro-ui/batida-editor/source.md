# Editor de batida — `titan-chordpro-ui`

Músicas sem `{x_strum:}` (CC sem batida ou cifra à mão) não têm faixa/metrônomo de batida; cifras com batida importada não permitem criar nem ajustar o mapa. Este plano entrega um editor Source-SoT na UI da cifra: folha Batida, fio `{x_strum:}` congelado no B0, mapa completo com gates B0–B3 (presets, multi-padrão, conflito enrich). verified_by: `projects/titan-chordpro-ui/batida-editor/design.md`.

## Inviolable principles

- **P1 Source ChordPro is SoT** — Create/edit batida writes `{x_strum:}` via `formatXStrum` + `writeMeta` and re-parses; no parallel Vue/storage SoT.
- **P2 Freeze the wire in B0** — Do not change `StrumSlot`, token alphabet `D/U/!/m/a/d/u/-`, or single-`{x_strum:}` grammar in B0; existing files round-trip without silent rewrite drift.
- **P3 Gates over mega-DONE** — Ship B0→B3 with per-gate fixtures and tests; do not claim “batida editor complete” without the gate green.
- **P4 Strip is read projection** — StrumStrip stays read-only (+ open-editor affordance); editing happens in the dedicated Batida sheet/picker.
- **P5 Keep-local enrich** — If `{x_strum:}` already exists, enrich does not overwrite it; prefer-cc for batida only fills absence.
- **P6 Real fixtures only** — Add `{x_strum:}` via enrich of a real fixture or minimal meta on an existing chart; do not invent lyric content.

## Glossary

- **`{x_strum:}`** — ChordPro meta holding one strum pattern (`bpm; meter; grid; label; pat=`).
- **StrumSlot** — One grid cell: `dir` + `contact` (`hit|ghost|rest`) + `essence` (`normal|accent|mute|muted` or null).
- **B0–B3** — Delivery gates: single-pattern editor → presets → multi-pattern persistence → enrich conflict polish.
- **Slot-first picker** — Tap a beat mark → list of composed states (not a global paint palette).
- **keep-local** — Enrich policy that preserves an existing `{x_strum:}` unless the user explicitly replaces it.

## F0 — B0 Create/edit one pattern + keep-local enrich

Goal: Musician can create and edit a single `{x_strum:}` pattern from the chart UI (CTA without batida, sheet with 1-beat-per-row on phone, slot→list picker); enrich no longer clobbers local batida; fixture + tests green; wire format unchanged.

```yaml
exit_gate:
  - id: F0-G1
    description: Core strum edit helpers and keep-local enrich tests green; fixture with x_strum exists.
    verifier: { kind: shell, command: "pnpm exec vitest run tests/core/strum.test.ts tests/core/strum-edit.test.ts tests/core/cifraclub-enrich.test.ts && rg -n '\\{x_strum:' fixtures/", expectExitCode: 0 }
  - id: F0-G2
    description: Vue Batida sheet/picker and CTA tests green; no Vue imports in src/core.
    verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/batida-editor.test.ts tests/vue/strum-strip.test.ts && ! rg -n \"from ['\\\"]vue['\\\"]\" src/core", expectExitCode: 0 }
```

### T-001 Fixture with x_strum + enrich keep-local

- Files: fixtures/sda/005-tua-vontade.cho, fixtures/manifest.json, src/core/import-chordpro.ts, tests/core/cifraclub-enrich.test.ts, CHANGELOG.md
- scopeBoundary: Do not invent lyric body; do not change strum token alphabet; do not add multi-pattern persistence; do not build Vue editor UI here.
- acceptance: At least one fixtures path contains `{x_strum:}`; proposeCifraClubEnrich omits x_strum from patch when local already has x_strum; when local lacks x_strum and CC has strum, patch still includes x_strum; cifraclub-enrich tests cover keep-local and fill-absent; CHANGELOG notes enrich keep-local for batida
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/cifraclub-enrich.test.ts && rg -n '\\{x_strum:' fixtures/", expectExitCode: 0 }
- RED→GREEN: Add failing keep-local enrich test (local x_strum must not appear in patch); change proposeCifraClubEnrich; add fixture x_strum line on an existing chart.

### T-002 Core strum edit helpers

- Files: src/core/strum.ts, src/core/index.ts, tests/core/strum.test.ts, tests/core/strum-edit.test.ts
- scopeBoundary: No Vue; no multi-pattern wire format; no preset catalog; do not remove rest from parse/decode of legacy `-`.
- acceptance: listSlotChoices returns 8 hit composites + 2 ghost and zero rest; setSlot/resizePattern/emptyPattern are immutable and round-trip via formatXStrum/parseXStrum; emptyPattern slots are ghost not rest; existing strum.test.ts still green
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/strum.test.ts tests/core/strum-edit.test.ts", expectExitCode: 0 }
- RED→GREEN: Write failing strum-edit tests for listSlotChoices/setSlot/emptyPattern; implement helpers in strum.ts and export from index.

### T-003 Vue Batida sheet + slot picker + CTA

- Files: src/vue/sheets/BatidaSheet.vue, src/vue/edit/BatidaSlotPicker.vue, src/vue/StrumStrip.vue, src/vue/ChordproViewer.vue, src/vue/chrome/CpvWideDock.vue, src/vue/chrome/CpvMoreSheet.vue, src/vue/chrome/CpvPhoneDock.vue, src/vue/index.ts, tests/vue/batida-editor.test.ts, tests/vue/strum-strip.test.ts
- scopeBoundary: No presets UI; no multi-pattern persistence; do not make StrumStrip the edit SoT; do not bind batida to lyric sections; do not invent scrape audio.
- acceptance: Without x_strum, view shows + Criar batida and opens BatidaSheet; sheet lays out one beat per row on narrow; tapping a slot opens picker with 8 hit + 2 ghost choices and no pausa; save writes {x_strum:} via writeMeta and hasStrum becomes true; edit existing pattern via strip pencil; phone one-beat-per-row covered by test; strip remains read-only projection
- verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/batida-editor.test.ts tests/vue/strum-strip.test.ts", expectExitCode: 0 }
- RED→GREEN: Vue tests fail without sheet/picker/CTA; implement BatidaSheet + BatidaSlotPicker and wire ChordproViewer chrome.

## F1 — B1 Presets embutidos

Goal: Core catalog of named strum presets apply into the single `{x_strum:}` pattern from the Batida sheet with confirm-if-dirty; IDs stable; tests green.

```yaml
exit_gate:
  - id: F1-G1
    description: Preset catalog + Vue apply tests green.
    verifier: { kind: shell, command: "pnpm exec vitest run tests/core/strum-presets.test.ts tests/vue/batida-presets.test.ts", expectExitCode: 0 }
```

### T-001 Core preset catalog

- Files: src/core/strum-presets.ts, src/core/index.ts, tests/core/strum-presets.test.ts
- scopeBoundary: No user-saved presets storage; no multi-pattern wire; no Vue beyond export surface.
- acceptance: listStrumPresets returns stable ids and patterns that formatXStrum/parseXStrum round-trip; at least three presets; applying a preset replaces slots/grid/label fields without inventing new token alphabet
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/strum-presets.test.ts", expectExitCode: 0 }
- RED→GREEN: Failing catalog tests; add strum-presets.ts.

### T-002 Vue presets section on Batida sheet

- Files: src/vue/sheets/BatidaSheet.vue, src/vue/edit/BatidaPresets.vue, tests/vue/batida-presets.test.ts
- scopeBoundary: Do not add host localStorage preset sync; do not implement multi-pattern picker here.
- acceptance: Batida sheet shows presets when capability/flag allows; applying a preset updates draft and asks confirm if draft dirty; save still writes single x_strum
- verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/batida-presets.test.ts", expectExitCode: 0 }
- RED→GREEN: Vue tests red without presets UI; wire BatidaPresets.

## F2 — B2 Multi-pattern named + persistence

Goal: Multiple named patterns selectable in UI; persistence schema documented and implemented without breaking legacy single `{x_strum:}` parse; CC import keeps patterns 2..N when multi writer exists.

```yaml
exit_gate:
  - id: F2-G1
    description: Multi-pattern parse/format + selector tests green; legacy single x_strum still parses.
    verifier: { kind: shell, command: "pnpm exec vitest run tests/core/strum-multi.test.ts tests/vue/batida-multi.test.ts tests/core/strum.test.ts", expectExitCode: 0 }
```

### T-001 Multi-pattern wire format + import keep-all

- Files: src/core/strum.ts, src/core/import-chordpro.ts, tests/core/strum-multi.test.ts, tests/core/import-chordpro.test.ts, docs/HANDOFF-CC-ENRICH-PRODUCAO.md
- scopeBoundary: Do not remove single x_strum compatibility; do not bind patterns to lyric sections; no audio player sync.
- acceptance: Legacy `{x_strum:…}` still parseXStrum; multi schema round-trips N named patterns; import/enrich with multi writer keeps Céu Azul 2 patterns; docs/HANDOFF-CC-ENRICH-PRODUCAO.md states the multi schema and blast radius
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/strum-multi.test.ts tests/core/import-chordpro.test.ts tests/core/strum.test.ts", expectExitCode: 0 }
- RED→GREEN: Failing multi + keep-all import tests; implement schema + import writer path.

### T-002 Vue multi picker (canPick)

- Files: src/vue/StrumStrip.vue, src/vue/sheets/BatidaSheet.vue, src/vue/ChordproViewer.vue, tests/vue/batida-multi.test.ts
- scopeBoundary: No lyric-section binding; no presets changes beyond reading active pattern.
- acceptance: When N>1 patterns, strip canPick works; sheet can rename/duplicate/delete/add named patterns; active pattern drives strip + editor; warning copy that batida does not auto-follow verse/chorus
- verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/batida-multi.test.ts", expectExitCode: 0 }
- RED→GREEN: Tests fail without selector; wire canPick + sheet pattern list.

## F3 — B3 Enrich conflict polish

Goal: When user explicitly wants CC batida over local, offer clear Manter / Trazer CC (with named copy when multi exists); no silent clobber; polish only after B0–B2.

```yaml
exit_gate:
  - id: F3-G1
    description: Enrich conflict UI/tests green for explicit CC batida replace vs keep-local.
    verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/meta-dialog.test.ts tests/core/cifraclub-enrich.test.ts", expectExitCode: 0 }
```

### T-001 Explicit CC batida conflict UI

- Files: src/vue/edit/MetaDialog.vue, src/core/import-chordpro.ts, tests/vue/meta-dialog.test.ts, tests/core/cifraclub-enrich.test.ts
- scopeBoundary: Do not invent batida when strumMissing; do not change fill-empty keys policy beyond x_strum conflict UX; no audio scrape.
- acceptance: Default enrich keeps local x_strum; explicit user choice can apply CC batida; tests cover keep and replace paths; strumMissing still warns without inventing pattern
- verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/meta-dialog.test.ts tests/core/cifraclub-enrich.test.ts", expectExitCode: 0 }
- RED→GREEN: Failing conflict-choice tests; extend MetaDialog + enrich apply options.
