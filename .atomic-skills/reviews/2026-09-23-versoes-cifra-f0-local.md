# Review — versoes-cifra F0 local leg

**Mode:** local (sealed explore agent)
**Ref:** `742f83979b3e9ae1e442b459c1cf9fb998e9672e..95e3349`
**At:** 2026-09-23T00:50:00Z
**Verdict:** findings_exist
**Counts:** blocker=2 critical=1 major=6 minor=2

This file is the local leg only. It is not a `mode: both` receipt.

## Findings

| # | Summary | Severity | File:line |
|---|---------|----------|-----------|
| 1 | Block edits apply sliced indexes to the full file | blocker | src/core/parse.ts:308 |
| 2 | Two-arg writeMeta on N>1 ignores chart sound keys | blocker | src/core/import-chordpro.ts:487 |
| 3 | readMeta is first-hit on the whole file | critical | src/core/import-chordpro.ts:388 |
| 4 | target song/chart no-ops when there is no envelope | major | src/core/charts.ts:260 |
| 5 | Preamble sound meta dropped; invalid chart id skipped | major | src/core/charts.ts:174 |
| 6 | Unknown chartId renders the default chart | major | src/core/charts.ts:197 |
| 7 | Rewrite keeps first alias and first default | major | src/core/charts.ts:228 |
| 8 | exportCho/PDF still use the whole file | major | src/core/export-cho.ts:20 |
| 9 | replaceChart ignores id when there is no envelope | major | src/core/charts.ts:315 |
| 10 | replaceChart cannot change x_chart_label | minor | src/core/charts.ts:328 |
| 11 | Duplicate ids hit the first block | minor | src/core/charts.ts:210 |

## Orchestrator triage (not operator disposition)

- **1, 3, 8:** Vue / readMeta / export. F0 does not edit Vue. Ground-truth B1/B3/B5 already park these on F2–F4.
- **2:** Matches the F0 contract in `writeMeta`: N>1 without `target` must not flatten `{key:}`/`{duration:}` into the song header. `rewriteToKey` on a whole envelope is a later caller.
- **4, 9:** In F0. `writeMeta` with `target` on a one-chart file returns the file unchanged. `replaceChart` on a one-chart file replaces the whole file for any id.
- **5, 6, 7, 10, 11:** Not in F0 acceptance. Held for operator defer|fix.
