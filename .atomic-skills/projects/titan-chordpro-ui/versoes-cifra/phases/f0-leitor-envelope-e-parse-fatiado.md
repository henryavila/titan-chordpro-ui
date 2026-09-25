---
schemaVersion: "0.1"
slug: versoes-cifra-f0-leitor-envelope-e-parse-fatiado
title: "Leitor: envelope e parse fatiado"
summary: Fatiar o .cho em cifras nomeadas no core, sem Vue.
goal: "`listCharts` e `parse(source, { chartId })` fatiam o arquivo; 1 cifra
  implícita é bit-compatível com o parse atual; N>1 não concatena corpos;
  writeMeta tem alvo song/chart; replaceChart reconstitui o arquivo. Sem Vue.
  Sem writer de UI."
status: active
branch: plan/versoes-cifra
started: 2026-09-20T15:40:57.297Z
lastUpdated: 2026-09-25T02:51:12.000Z
nextAction: "Spawn the read-only F0 evaluation agent and write the evaluation report."
parentPlan: versoes-cifra
phaseId: F0
businessIntent:
  value: O músico lê N cifras nomeadas da mesma música no mesmo arquivo, sem
    concatenar corpos nem last-write de tom/duração.
  workflow: listCharts + parse fatiado + writeMeta com alvo song/chart +
    replaceChart no core, cobertos por tests/core/charts-envelope.test.ts.
  rules: Reader before writer. Arquivo sem envelope = cifra default, parse
    idêntico ao de hoje. Sem Vue. Sem gravar N>1 em fixtures/sda. Sem
    {new_song}.
  outOfScope: Chip no título, CRUD no editor, overlay key, Suggestion.chartId,
    exportCho scope, docs VISAO/CONSUMER.
  doneWhen: tests/core/charts-envelope.test.ts verde;
    tests/demo/sda-fixtures.test.ts e tests/core/no-vue-in-core.test.ts verdes.
tasksDone: 0
tasksTotal: 3
gatesMet: 0
gatesTotal: 2
weightDone: 0
weightTotal: 8
exitGates:
  - id: F0-G1
    description: Envelope tests green. FAILS when parse of a two-chart source
      concatenates both bodies or last-write-wins key/duration across charts.
    status: pending
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/charts-envelope.test.ts
      expectExitCode: 0
    verifierLabel: "shell: pnpm exec vitest run tests/core/charts-envelope.test.ts"
  - id: F0-G2
    description: Existing one-chart parse still green on SDA fixtures and no Vue in core.
    status: pending
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/no-vue-in-core.test.ts
        tests/demo/sda-fixtures.test.ts
      expectExitCode: 0
    verifierLabel: "shell: pnpm exec vitest run tests/core/no-vue-in-core.test.ts test…"
stack:
  - id: 1
    title: "Leitor: envelope e parse fatiado"
    type: task
    openedAt: 2026-09-20T15:40:57.297Z
tasks:
  - id: T-001
    title: listCharts and implicit default
    summary: Listar cifras do arquivo e tratar arquivo antigo como cifra default.
    weight: 2
    status: done
    closedAt: 2026-09-25T02:51:12.000Z
    lastUpdated: 2026-09-25T02:51:12.000Z
    scopeBoundary:
      - Do not change Vue; do not write N-chart files into fixtures/sda; do not
        implement overlay keys; do not add the title chip.
    acceptance:
      - listCharts on a source with no start_of_x_chart returns one entry id
        default; listCharts on a source with two start_of_x_chart blocks returns
        those two ids in file order; x_chart_default marks isDefault;
        x_chart_label supplies label else the id; functions export from
        src/core/index.ts
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/charts-envelope.test.ts
      expectExitCode: 0
    evidence:
      verifierKind: shell
      verifiedAt: 2026-09-25T02:51:12.000Z
      verifiedCommit: 53d8a8ef42b1f4ad4360ea53ed9246aee62b37b8
      passed: true
      exitCode: 0
      outputSummary: "Test Files 1 passed (1). Tests 104 passed (104). Exit 0."
    outputs:
      - kind: file
        path: src/core/charts.ts
      - kind: file
        path: src/core/index.ts
      - kind: file
        path: tests/core/charts-envelope.test.ts
  - id: T-002
    title: parse fatiado does not concatenate
    summary: parse de N cifras devolve só a cifra pedida, nunca os corpos colados.
    weight: 3
    status: done
    closedAt: 2026-09-25T02:51:12.000Z
    lastUpdated: 2026-09-25T02:51:12.000Z
    scopeBoundary:
      - Do not drop soc/eoc/tab/score behaviour; do not invent SDA lyrics; do
        not migrate overlay storage.
    evidence:
      verifierKind: shell
      verifiedAt: 2026-09-25T02:51:12.000Z
      verifiedCommit: 53d8a8ef42b1f4ad4360ea53ed9246aee62b37b8
      passed: true
      exitCode: 0
      outputSummary: "Test Files 1 passed (1). Tests 104 passed (104). Exit 0."
    acceptance:
      - 'parse(twoChartSource) without opts uses the default chart only;
        parse(twoChartSource, { chartId: "oferta" }) meta.key and duration are
        the oferta block values; sections contain oferta lyrics and not completa
        lyrics; view.source is the chart document (song title/artist plus that
        chart) with no sibling body; a one-chart jesus-style string still parses
        with the same title and section count as today'
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/charts-envelope.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: src/core/parse.ts
      - kind: file
        path: src/core/charts.ts
      - kind: file
        path: tests/core/charts-envelope.test.ts
  - id: T-003
    title: writeMeta target and replaceChart
    summary: Reescrever meta da música ou da cifra sem apagar a irmã.
    weight: 3
    status: done
    closedAt: 2026-09-25T02:51:12.000Z
    lastUpdated: 2026-09-25T02:51:12.000Z
    scopeBoundary:
      - Do not change Vue; do not add META_KEYS that collide with
        start_of_x_chart; do not rewrite fixtures/sda.
    evidence:
      verifierKind: shell
      verifiedAt: 2026-09-25T02:51:12.000Z
      verifiedCommit: 53d8a8ef42b1f4ad4360ea53ed9246aee62b37b8
      passed: true
      exitCode: 0
      outputSummary: "Test Files 1 passed (1). Tests 104 passed (104). Exit 0."
    acceptance:
      - 'writeMeta(file, { title: "X" }, { target: "song" }) changes the song
        header and leaves both chart keys intact; writeMeta(file, { key: "G",
        duration: "03:00" }, { target: "chart", chartId: "oferta" }) changes
        only oferta; replaceChart(file, "oferta", chartDocument) substitutes
        that chart document and keeps the sibling; one-chart writeMeta without
        target still matches current header rewrite'
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/charts-envelope.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: src/core/import-chordpro.ts
      - kind: file
        path: src/core/charts.ts
      - kind: file
        path: tests/core/charts-envelope.test.ts
parked: []
emerged: []
planTitle: Cifras nomeadas da mesma música — `titan-chordpro-ui`
planActive: true
current: true
---

# Narrative / notes

Initiative for phase **F0 — Leitor: envelope e parse fatiado**.

## Decisions

- 2026-09-23: operator ratified F0 phase-start package (BI spine unchanged).
- 2026-09-20: operator stamped `executionMode: automate` and locked flow.

## Links

- Plan: `.atomic-skills/projects/titan-chordpro-ui/versoes-cifra/plan.md`
- Design: `projects/titan-chordpro-ui/versoes-cifra/design.md`

## Session handoff

Paused 2026-09-23 because the operator's context was full. Continue `atomic-skills:implement versoes-cifra` as **host-thin automate**. The host does not edit `src/**` or `tests/**`. One code-only writer. Delegate review. Reply to the operator in short Brazilian Portuguese. They are often on a phone and cannot see option widgets. A chat sentence such as `revisar agora`, `corrigir agora`, or `Fix all` is the instruction. An AskUserQuestion decline is not accept, defer, or fix. Do not invent a disposition. Do not mark tasks done on a claim.

### Where

- Plan worktree: `/Users/henry/.grok/worktrees/code-titan-chordpro-ui/multiverson/.worktrees/versoes-cifra`
- Branch: `plan/versoes-cifra`. Durable `executionMode: automate`. `currentPhase: F0`. Flow already ratified (`ratifiedGraphSha` `fc1ef06b484e34cb6580c90b678824e5c2d3f180c9fbc41661a9f3c510b4ba61`). Do not restamp the flow.
- Package root: file `$HOME/.atomic-skills/package-root` → `/Volumes/External/code/atomic-skills`.
- Cursor `.atomic-skills/status/automate/versoes-cifra.json`: step `E`, phaseId `F0`, `redispatchCount` 14 (ceiling is 2). Another writer is `advanceCursor` from `E` to `C` with `operatorOverride: { reason, gate: 'spawn' }`. Do not hand-edit the count down.
- Writer lease: missing. Do not clear a future lease without its acquire secret. Never print a lease secret.
- Claims `.atomic-skills/status/automate/versoes-cifra-claims.json`, all `claimed-pass`, `base` and `head` null, exclusive SHAs, ancestors of the plan branch: T-001 `275abe489d77d53c88d0d0e8a4207619b044edaa`, T-002 `064926f71aba1ad9cb569ddef50aa550971e092e`, T-003 `b013bb004b2aa55a8109ded90ef2bd2b21e3ebac`.
- Tasks T-001, T-002, and T-003 are still **pending** in the initiative YAML. T-002 and T-003 are weight 3. `done` needs a `mode: both` receipt that covers the current tree and has no unresolved blocker, critical, or major, unless the operator records accept, defer, or fix.
- F1–F4 are descriptor-only. Do not materialize or spawn them. After F0 `phase-done`, the cursor pauses at `awaiting-operator-advance`. Continue only with `clearContinue` token `operator-continue`. Each later phase needs its own package ratify before materialize.

### Product already on the branch (do not revert)

- `readMeta` on an envelope equals `readMeta(chartDocument(source))`: default chart only.
- `rewriteToKey` rewrites only the default chart and splices it back.
- Two-arg `writeMeta` on an envelope is a sparse patch. Sound keys apply to the default id captured **before** an `x_chart_default` change in the same patch. Omitting `x_chart_default` does not clear it. `{ x_chart_default: '' }` with `target: 'song'` does clear it.
- `setAudioUrl`, `setAudioArt`, and `applyCifraClubEnrich` clear with `''`, not `delete`.
- Block edit and the source pane write the chart document back through `commitChartDocument` (default chart only; there is no chart switcher).
- `7214bd9` (merge `640d1a4`): source-pane saves copy song-identity lines raw, so `{title:Uma }` and `{title:}` stay, and the blank line before the first `{start_of_x_chart}` stays. `storedTransposeSemis` uses `parse`, so `{transpose 2}` and `{key C}` count. `rewriteChartInner` does not drop the blank under the label when audio is cleared. `chordVocab` uses `chartSource`, not the whole file.
- Editor lint is `lintSource(parsed.source)`, not `session.lint()` on the whole file.
- No Vue import in `src/core`. No N>1 files in `fixtures/sda`. No `{new_song}`.

### Last review, and why it is stale

- Both receipt `.atomic-skills/reviews/2026-09-23-versoes-cifra-f0-fix-both.md` covers `6ff593c..621dfe8` only. Verdict `needs_changes` (Codex `gpt-6-astra`, informed: 0 blocker, 0 critical, 1 major, 1 minor; nothing dropped). Local leg had 3 minors.
- The operator then said `Fix all`. That fix is `7214bd9`, which is **not** in that receipt. Do not `done` on it.

### Single nextAction

T-001, T-002, and T-003 are done. Verifier `pnpm exec vitest run tests/core/charts-envelope.test.ts` exit 0, 104 tests, at `53d8a8ef42b1f4ad4360ea53ed9246aee62b37b8`. Both review `.atomic-skills/reviews/2026-09-24-fix28-both.md` is approve. Next action is spawn the read-only F0 evaluation agent and write the evaluation report. Do not stamp decision-review PASS. Do not start F1.

### Verbatim state

- Last plan-tree run, after merge `640d1a4`, exit 0, 156 tests: `pnpm exec vitest run tests/core/charts-envelope.test.ts tests/core/import-chordpro.test.ts tests/core/audio-url.test.ts tests/core/no-vue-in-core.test.ts tests/vue/block-edit-ui.test.ts tests/vue/meta-dialog.test.ts tests/demo/sda-fixtures.test.ts`
- `find-missing-flow --strict` was OK. Ground-truth receipt must be refreshed if this handoff changes the fingerprint. Use the detector's `current fp=`. Do not rewrite the ground-truth section for a handoff-only edit.
- `refresh-state.js` rewrites other plans (`batida-editor`, `editor`). Restore those with `git checkout --` and do not commit them on this branch.

### Uncommitted changes

No product edits. Do not commit `versoes-cifra-F0-prepare.json` or `versoes-cifra-F0-sealed-brief.md`.
