---
verdict: with_caveats
mode: local
plan: .atomic-skills/projects/titan-chordpro-ui/versoes-cifra/plan.md
initiative: .atomic-skills/projects/titan-chordpro-ui/versoes-cifra/phases/f0-leitor-envelope-e-parse-fatiado.md
iterations: 3
counts: {critical: 0, significant: 1, minor: 3, nit: 1}
applied_in_plan: 12
---

# Internal review — versoes-cifra (mode=local, --no-cross-ref)

**Mode:** local (alias internal)
**Cross-ref:** none (`--no-cross-ref`)
**Ground-truth:** N/A this leg — Flow E already stamped in plan.md (`- ground-truth:`). Items 21–22 not re-run.
**Initiatives discovered:** 1/5 (F0 only). F1–F4 have `.source.json` capture files, not materialized initiatives.
**Provider:** local

## Self-loop 1–7 (plan.md)

1. **Contradictions — ok after fix.** P1 reader-before-writer (plan.md:15–17, 234) vs F3.goal “gated on F0-G1” was a major; F3.goal now ships only after P1 (F0–F2) (plan.md:166–170). F0 outOfScope chip/overlay/docs (plan.md:102–103) matches later phases.
2. **Broken deps — ok.** F1→F0, F2→F1, F3→F2, F4→F3 (plan.md:114–197). `replaceChart` created in F0 T-003 (init L110–135) before F1/F3 consumers. Create-list: `charts.ts`, `charts-envelope.test.ts`, `chart-switcher.test.ts`, `chart-editor.test.ts`, `export-cho-charts.test.ts` absent on disk; prior tasks create them.
3. **Ordering — ok.** `parallelismAllowed: false`. Writer F3 after F2. F0 T-001 → T-002 → T-003.
4. **Ambiguity — ok after fix (plan).** F0.goal locks JESUS_1 and `writeMeta` sem target em N>1 (plan.md:63–69). Residual: initiative T-002 still says “jesus-style” (init L96).
5. **Schema — N/A.** No migrations.
6. **File lists — ok.** Existing: `parse.ts`, `import-chordpro.ts` (`writeMeta` L447), `index.ts` (exports `writeMeta` L217), `useSetlist.ts`, `no-vue-in-core.test.ts`, `sda-fixtures.test.ts`, `overlay.test.ts`, `overlay-ui.test.ts`, `storage-seam.test.ts`, `setlist.test.ts`, `song-swipe.test.ts`, `audio-ref.test.ts`, `filenames.test.ts`, `CpvViewHead.vue`, `load-fixture.ts` L11 `JESUS_1`.
7. **Test coverage — ok.** Every F0 task has `charts-envelope.test.ts`. Phase gates have vitest/node verifiers.

## Initiative-depth 14–20

14. **Gate-task — ok for F0.** F0-G1 ↔ T-001/T-002/T-003 (init L65–97, L119–124; plan.md:74–82). F0-G2 held by T-001/T-003 `scopeBoundary` (init L62–64, L116–118) + gate verifier (plan.md:83–91).
15. **Cross-phase task contradictions — ok** (only F0 materialized). Plan F1–F4 goals do not undo F0 outOfScope.
16. **Task-level broken deps — ok.** T-002/T-003 modify `parse.ts` / `import-chordpro.ts` (exist) and `charts.ts` (T-001 creates).
17. **Task ambiguity — minor recorded.** T-001 “functions export from src/core/index.ts” (init L69–70) does not name `listCharts`. T-002 “jesus-style” (init L96) vs plan JESUS_1. T-003 does not restate N>1-without-target (plan F0.goal now locks it).
17b. **Acceptance↔verifier — ok.** All three F0 tasks share `tests/core/charts-envelope.test.ts` in outputs + verifier.
18. **Input files — ok.** `src/core/index.ts`, `parse.ts`, `import-chordpro.ts` exist.
19. **subPhaseCount — ok.** plan F0 `subPhaseCount: 3` (plan.md:71) ↔ init `tasksTotal: 3` / three tasks. F1–F4 `subPhaseCount: 0` because unmaterialized.
20. **Scope isolation — N/A.** F0 initiative has no `scope.paths[]`.

## G2 / G6 / G1

- G1: P4/P5/P6 now cite lines (`useSetlist.ts` L45–55, L80–82; `ChordproViewer.vue` L2390; `no-vue-in-core.test.ts` L19–28; AGENTS.md L5–6; `sda-fixtures.test.ts` L18–20). 0 unsourced existing-code claims left in plan body.
- G2: grep `should|probably|typically|usually|maybe|perhaps` (+ skill `may|I think|it seems|in theory|tends to`) → 0 hits.
- G6: plan body + principle copies carry `verified_by:` (16 hits). Phase goals that prescribe work are not bare disk claims. 0 `unverified:`. 0 bare body assertions.

## Findings

| # | Finding | Severity | Source | Action |
|---|---------|----------|--------|--------|
| 1 | P1 vs F3.goal “gated on F0-G1” | major | plan.md:159 (pre-fix) | applied — F3.goal P1 (plan.md:166–170) |
| 2 | F3-G1 “before listCharts exists” untestable by vitest | major | plan.md (pre-fix) | applied — testable add/delete/save failures (plan.md:177–181) |
| 3 | P4/P5/P6 G1 no line numbers | major | plan.md:29–41 (pre-fix) | applied |
| 4 | F2 goal omitted speed; GT B4 BPM | major | plan.md F2 / GT B4 | applied — speed+BPM (plan.md:137–142, 152–154) |
| 5 | F1-G1 missed Suggestion.chartId, save-content, `storage-seam.test.ts` | major | plan.md F1-G1 | applied (plan.md:121–130) |
| 6 | F2-G1 missed timeline/audio/spots; verifier missed `audio-ref.test.ts` | major | plan.md F2-G1 | applied (plan.md:149–160) |
| 7 | F4-G1 docs half not in verifier; `/cifra/` tautology | major | plan.md F4 | applied — F4-G2 distinctive tokens (plan.md:212–221) |
| 8 | `writeMeta` sem target em N>1 unspecified | major | F0 vs design D4 | applied — F0.goal lock (plan.md:65–69) |
| 9 | F1–F4 have no materialized initiative (`parentPlan`+`phaseId` .md) | significant | Step 0c | recorded — expected at `currentPhase: F0`; materialize via project-status |
| 10 | T-002 “jesus-style”; T-001 unnamed exports | minor | init L69–70, L96 | recorded — HARD-GATE, do not edit initiative |
| 11 | “fatiia” typo | nit | plan.md:209 (pre-fix) | applied |

## Self-review against code-quality gates

- G1 read-before-claim: ran grep against the plan looking for unsourced claims; found 0 after applying P4/P5/P6 line cites.
- G2 soft-language: ran the ban-list grep; found 0.
- G6 reference-or-strike: counted body+principle assertions; all have `verified_by:`; 0 `unverified:`; 0 bare in plan body.
- Initiative-depth: discovered 1/5; F0 gates 2/2 covered; F1–F4 uncovered (no initiative files).
- Ground-truth: N/A in this local leg — use Flow E. Plan already has `- ground-truth:` (do not restamp here).

**Final status:** Plan-file majors fixed. Receipt `- internal: clean | mode=local`. Caveat: F1–F4 still unmaterialized (significant, not fixable in plan.md).
