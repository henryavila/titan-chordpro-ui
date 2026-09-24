# Phase writer brief — diagramas-cifra F2

You are a **code-only phase writer** implementing plan tasks in an isolated sibling worktree.
This sealed brief is self-contained. **No host chat history is included or authorized.**

## Code-only fence (HARD)

You are a **code-only phase writer**. You MAY:
- Orient on the phase work-order (task ids, paths, scopeBoundary, acceptance, verifier).
- Edit product/source paths inside each task's admitted targets (respect scopeBoundary exclusions).
- Run pre-close self-check verifiers for confidence.
- Create **implementation** microcommits with explicit paths only (`rtk git add <paths>` — never `git add .` / `-A`).
- Return a structured **claim report** for every task you attempted.

You **MUST NOT**:
- Invoke `done`, `phase-done`, finalize, archive, or any project-skill state transition.
- Mutate durable `.atomic-skills/` project state (plan.md, phase initiatives, rollups, lessons, review receipts, handoff).
- Mark tasks `status: done` in initiative YAML (orchestrator closes).
- Self-certify: a claim is confidence, not closure.
- Nest a phase worktree under the plan worktree.
- Depend on host chat history (this sealed brief is the full packet).

Never claim Layer 4 shipped. Never commit writer-lease secrets.

## Phase work-order

- **planSlug:** diagramas-cifra
- **phaseId:** F2
- **initiativePath:** /Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra/.atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/phases/f2-d2-resolvediagram-bd-draw-with-capo.md (read-only)
- **worktreePath (cwd):** /Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra-F2-fix11
- **writerBranch:** impl/diagramas-cifra-F2-fix11
- **baseRef:** b57bf30c3c127832937faab01d757dc203e151af
- **decisionLogPath:** /Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra/.atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/decisions/F2.jsonl (informational — host owns append; do not write)

### Tasks (1)

#### T-002 — Dictionary + resolveDiagram
- status: pending
- paths: ["src/core/chord-dict.ts","src/core/resolve-diagram.ts","src/core/index.ts","tests/core/resolve-diagram.test.ts","src/core/define.ts","tests/core/define-directive.test.ts"]
- scopeBoundary: ["No Vue; no editor sheet; guitar dictionary is EADGBE; ukulele is GCEA only; do not ship baritone; do not guess 7+."]
- acceptance: ["resolveDiagram({ token, instrument, overrides }) prefers file override over dictionary; guitar token is shapeName; piano token is concert; miss reasons are unknown-token or no-shape; C7M hits maj7 voicing; C7+ is miss; one voicing per name (lowest open)"]
- verifier: {"kind":"shell","command":"pnpm exec vitest run tests/core/resolve-diagram.test.ts","expectExitCode":0}
- weight: 3

## Claim report (required output)

Write the claim report JSON to: `.atomic-skills/status/automate/diagramas-cifra-claims.json`

Envelope shape:
```json
{
  "planSlug": "<planSlug>",
  "phaseId": "<phaseId>",
  "worktreePath": "<cwd>",
  "writerBranch": "<branch>",
  "finishedAt": "<ISO>",
  "tasks": [
    {
      "taskId": "T-00N",
      "status": "claimed-pass|claimed-fail|blocked|skipped",
      "commitShas": ["..."],
      "base": null,
      "head": null,
      "paths": ["..."],
      "verifierCommand": "...",
      "exitCode": 0,
      "transcript": "..."
    }
  ]
}
```

Rules:
- Array key is **`tasks`** (canonical; `claims` is a tolerated alias only).
- Open claims need commit identity: non-empty `commitShas[]` **or** `base`+`head`.
- Open claims need `paths[]` ≥1 non-empty path, `verifierCommand`, `exitCode`, `transcript`.
- `claimed-pass` requires `exitCode === 0`.
- Multi-task exclusivity: do not share bare SHAs across open claims without exclusive `base`+`head` per task.
- Prefer exclusive `base`+`head` per task when multi-task commits share SHAs.
- Do not invent pass for missing work-order tasks.

## Exit

1. All listed verifiers green for claimed-pass tasks (self-check).
2. Write claim report to the absolute path in Scoped context (the sibling worktree does not share the plan status dir).
3. Final message: summary of files changed, commit SHAs, claim report path, any blockers.
4. Do not mark tasks done in YAML. Do not call done/phase-done.

## Scoped context (product contract only — not chat history)

Operator order for this dispatch: delete the piano-key guess. One rule.

### Rule

File `{define}` piano `keys` have one meaning, chosen by a hard cutoff. Never score the chord. Never pick absolute pitch classes versus intervals.

- Every key is in `0..17` (17 is the largest `QUALITY_INTERVALS` tone): the number is a **distance from the chord root**. `0` is the root, `4` the major third, `7` the fifth, `14` the ninth. `drawPiano` already lights `(root + interval) mod 12`.
- Any key `> 17` or `< 0`: the number is a **real piano key** (MIDI). Read `mod 12`. Do not run the interval formula.

`pianoSoundingPitchClasses` (`src/core/chord-dict.ts`):

- MIDI branch: `return keys.map((k) => mod12(k))`.
- Otherwise: `return keys.map((k) => mod12(rootPc + k))`.
- Delete the score, the absolute-versus-relative tie, the slash-bass tie-break, and the characteristic-tone tie-break. Remove the helpers that exist only for that guess (`scorePianoReadings`, `characteristicIntervals`, `characteristicCount`) if nothing else calls them.
- `chord-dict.ts` must not import `define.ts`. Do not edit the guitar or ukulele dictionary packs. Fretted identity stays `17 * 12 * 2 = 408`.

`transposePianoKeys` (`src/core/define.ts`):

- Must not throw. `transpose` and `exportCho` call it with no try/catch.
- MIDI branch: `keepMidiAboveIntervals(keys.map((k) => k + n))`. Add `n`. Do not fold with `60 + (mod 12)`. If a result is `<= 17`, lift every key by the same number of octaves until each is `> 17`.
- Interval branch (`0..17`, including a 12–17 tone such as 14): **return the same numbers**. Do not add `n`. Do not rewrite them as pitch classes, as `60 + pc`, or as whatever the reader would accept. Only `transposeDefine` changes the chord name.
- Do not call the reader to choose a storage form.

### What must still light

Storage changes. The lit notes below do not.

- `{define: Dsus2 keys 0 7}` +5 stores `Gsus2` keys `[0, 7]` and lights G and D (pcs 7, 2). −5 stores `Dsus2` keys `[0, 7]` (not `[2, 9]`) and lights D and A (pcs 2, 9).
- `{define: Dsus2 keys 0 7}` +3 stores `Fsus2` keys `[0, 7]` (not `[5, 0]`) and lights F and C. −3 stores `[0, 7]` and lights D and A.
- `{define: C keys 0 2}` +2 stores `D` keys `[0, 2]` (not `[62, 64]`). Does not throw. `transpose` and `exportCho` write it. Lights D and E (pcs 2, 4). −2 stores `C` keys `[0, 2]` (not `[60, 62]`) and lights C and D.
- `{define: C keys 0 4 7}` +2 stores `D` keys `[0, 4, 7]` (not `[2, 6, 9]`) and lights D, F#, A.
- `{define: D keys 0 4 7}` +2 stores `E` keys `[0, 4, 7]` (not `[4, 8, 11]`) and lights E, G#, B.
- `{define: B keys 0 4 7}` +1 stores `C` keys `[0, 4, 7]` and lights C, E, G. Do not keep `{define: B keys 11 3 6}` as B major. `11 3 6` is distances, not the notes B, D#, F#.
- `{define: F7sus4 keys 0 5 10}` +2 stores `G7sus4` keys `[0, 5, 10]` (not `[7, 0, 5]`) and lights G, C, F (pcs 7, 0, 5). Untransposed still lights F, A#, D# (pcs 5, 10, 3).
- `{define: D9 keys 0 4 7 14}` untransposed lights D, F#, A, E (pcs 2, 6, 9, 4). +2 stores `E9` keys `[0, 4, 7, 14]` (not `[4, 8, 11, 6]`) and lights E, G#, B, F# (pcs 4, 8, 11, 6). `exportCho` does not throw.
- `{define: D7M(9)/B keys 9 0 11 2}` lights B, D, C#, E (pcs 11, 2, 1, 4). Those numbers are distances from D. Do not restore a bass tie-break so that `11 2 1 4` is read as absolute notes.
- `{define: Am keys 0 3 7}` lights A, C, E. `{define: Am keys 9 0 4}` is distances and lights F#, A, C# — not A, C, E. Delete the test that treats `9 0 4` as absolute A, C, E.
- `{define: G7sus4 keys 0 5 10}` lights G, C, F. `{define: G7sus4 keys 7 0 5}` is distances (D, G, C), not a second spelling of G, C, F. Same for `Gsus4` `0 5` versus `7 0`.
- MIDI stays: `{define: C keys 48 52 55}` +2 stores `[50, 54, 57]`. `{define: C keys 48 50}` +2 stores `D` keys `[50, 52]` and lights D and E. `{define: D keys 50 52}` lights D and E, not a relative reading. `{define: C keys 60 64 79}` +2 stores `[62, 66, 81]`; −2 restores `[60, 64, 79]`. `{define: D keys 62 64}` −60 stores keys that are all `> 17`, still lights D and E, and does not throw.

### Tests

Update expectations in `tests/core/define-directive.test.ts` and `tests/core/resolve-diagram.test.ts` to the storage above. Assert the lit notes, not the old re-encoded arrays.

`tests/core/export-cho.test.ts` is outside the work-order path list. This dispatch authorizes one edit there: the assertion `{define: D keys 2 6 9}` becomes `{define: D keys 0 4 7}`. Do not otherwise rewrite that file. The Dsus2 +5 export test already expects keys `[0, 7]` and notes G, D — leave that behavior.

### Do not

- Do not mark T-002 done. Do not edit initiative YAML, plan.md, handoff, or reviews.
- Do not add Vue. Do not open a diagram modal. Do not start F3.
- Do not guess `7+`. Do not change guitar or ukulele shapes.
- If `node_modules` is missing in this worktree, run `CI=true pnpm install` here only. Do not symlink `node_modules`.
- Vitest cwd is this worktree.

Self-check, both must exit 0:

```
pnpm exec vitest run tests/core/define-directive.test.ts tests/core/resolve-diagram.test.ts tests/core/export-cho.test.ts
pnpm exec vitest run tests/core/layout-capo.test.ts tests/core/resolve-diagram.test.ts tests/core/diagram-draw.test.ts
```

Commit only the paths you changed, with explicit `git add`. Subject: `fix(T-002): piano define keys are intervals from the root`.

Write the claim report JSON to this absolute path (not the sibling copy):

`/Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra/.atomic-skills/status/automate/diagramas-cifra-claims.json`

`claimed-pass` only if both commands exited 0. `commitShas` is the implementation commit. `base` is `b57bf30c3c127832937faab01d757dc203e151af`. `head` is that commit. `verifierCommand` is the first vitest command. `paths` lists every file in the commit.

---
sealed-brief: true
host-chat-history: excluded
