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
- **worktreePath (cwd):** /Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra-F2-fix12
- **writerBranch:** impl/diagramas-cifra-F2-fix12
- **baseRef:** bfa02a642024eae93c8e075c4c81b6625a25bd0f
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
2. Write claim report to `.atomic-skills/status/automate/diagramas-cifra-claims.json`.
3. Final message: summary of files changed, commit SHAs, claim report path, any blockers.
4. Do not mark tasks done in YAML. Do not call done/phase-done.

## Scoped context — this dispatch only

Fix one defect in the piano `{define}` reader and transpose. Do not open a Vue modal. Do not edit guitar or ukulele dictionary packs. `src/core/chord-dict.ts` must not import `src/core/define.ts`. `transposePianoKeys` must not throw.

### Rule

A key list is MIDI only when every key is greater than 17, or any key is below 0.
If any key is in 0–17, the whole list is a distance from the chord root. Numbers above 17 in that list stay distances (12, 16, 19).
Interval transpose returns the same numbers. Only the chord name changes.
MIDI transpose adds n. If a result is 17 or below, lift every key by the same number of octaves until each key is greater than 17.
Use the same MIDI test in `pianoSoundingPitchClasses` and `transposePianoKeys`.

### Must become true

- `{define: D keys 12 16 19}` draws D, F#, A (pitch classes 2, 6, 9). It must not draw C, E, G.
- Transpose +2 stores `{define: E keys 12 16 19}` and draws E, G#, B (pitch classes 4, 8, 11). It must not store `26 30 33`.
- `{define: D keys 7 12 16}` stays distances and draws D, A, F# (pitch classes 2, 9, 6).

### Already green — do not change the stored numbers or the sounding notes

- Dsus2 `0 7` +5 stores Gsus2 `[0, 7]` and draws G, D. −5 stores `[0, 7]` and draws D, A.
- C `0 2` +2 stores D `[0, 2]` and draws D, E. −2 stores C `[0, 2]` and draws C, D. No throw.
- D9 `0 4 7 14` draws D, F#, A, E. +2 stores E9 `[0, 4, 7, 14]` and draws E, G#, B, F#.
- C `0 4 7` +2 stores D `[0, 4, 7]`. D `0 4 7` +2 stores E `[0, 4, 7]`.
- B `0 4 7` +1 stores C `[0, 4, 7]`. `B keys 11 3 6` stays distances, not B major.
- F7sus4 `0 5 10` +2 stores G7sus4 `[0, 5, 10]`.
- Am `0 3 7` draws A, C, E. Am `9 0 4` draws F#, A, C#.
- MIDI `48 52 55` +2 stores `[50, 54, 57]`. C `48 50` +2 stores D `[50, 52]` and draws D, E.
- C `60 64 79` +2 stores `[62, 66, 81]`. −2 restores `[60, 64, 79]`.
- D `62 64` −60 stores `[26, 28]` (every key still above 17) and draws D, E.
- 408 fretted dictionary cells stay `17*12*2`.

### Tests

Add the new assertions in `tests/core/define-directive.test.ts` and/or `tests/core/resolve-diagram.test.ts`.
Change `tests/core/export-cho.test.ts` only if an existing assertion must change.
Do not add a second guess that scores absolute pitch classes against intervals.

### Self-check before the claim

If `node_modules` is missing, run `CI=true pnpm install` in this worktree only. Do not symlink `node_modules`.

```
pnpm exec vitest run tests/core/define-directive.test.ts tests/core/resolve-diagram.test.ts tests/core/export-cho.test.ts
pnpm exec vitest run tests/core/layout-capo.test.ts tests/core/resolve-diagram.test.ts tests/core/diagram-draw.test.ts
```

Both must exit 0. Commit only the product files you changed, with message `fix(T-002): a high interval does not turn the chord into MIDI`.

### Claim report path

Write the JSON to this absolute path (the sibling worktree does not own the orchestrator status file):

`/Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra/.atomic-skills/status/automate/diagramas-cifra-claims.json`

One task, T-002, status claimed-pass only if both commands exited 0.
`base`: `bfa02a642024eae93c8e075c4c81b6625a25bd0f`
`head`: the product commit you just created.
`paths`: the files in that commit.
`verifierCommand`: the first vitest command above.
`transcript`: the pass counts.

---
sealed-brief: true
host-chat-history: excluded
