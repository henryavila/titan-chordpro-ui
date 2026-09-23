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
- **worktreePath (cwd):** /Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra-F2-fix7
- **writerBranch:** impl/diagramas-cifra-F2-fix7
- **baseRef:** bca4654db0966d1bf4d1f4e11309f7da9d999da0
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

## Fix contract — F2-fix7 (this dispatch only)

Codex `gpt-6-astra` receipt `.atomic-skills/reviews/2026-09-23-1906-diagramas-cifra-f2-transpose-reading-codex.md` kept one major on `4c1a21d..fb9e228`. Do not start F3. Do not edit guitar or ukulele dictionary packs. Do not add Vue. Do not add a known-miss list.

### Defect

`transposePianoKeys` in `src/core/define.ts` always stores `(sounding + n) % 12`. The destination chord reads those numbers again with `pianoSoundingPitchClasses`.

`{define: Dsus2 keys 0 7}` plus 5 semitones becomes `{define: Gsus2 keys 7 2}`. Both readings score two sus2 tones. The relative reading has the characteristic second, so the draw lights D and A (pcs 2, 9), not G and D (pcs 7, 2). Minus 5 then does not restore D and A. `exportCho` writes the same keys, so a reimport draws the wrong notes.

Storing shifted 0–11 pitch classes is not enough when that list does not survive the destination read.

### Rule

For keys that are all inside 0–11:

1. Choose the sounding pitch classes with `pianoSoundingPitchClasses` (the same function the draw uses), including the slash bass. Do not copy the comparison.
2. Shift those classes by `n` with the existing 0–11 wrap. Call that sequence `shifted`.
3. The stored list is read on the **renamed** chord, not the source name. Build two candidates on that new root, quality, and bass:
   - absolute: `shifted` itself
   - relative: each `(shifted - newRoot) mod 12`, same order
4. Keep the absolute candidate when `pianoSoundingPitchClasses` on it returns `shifted` in the same order. Otherwise keep the relative candidate when that call returns `shifted`. If neither does, stop and claim `blocked`. Do not invent a third encoding.
5. Keys outside 0–11 stay on the old MIDI rule: add `n`, do not wrap.

`chord-dict.ts` must not import `define.ts`. `define.ts` may import `pianoSoundingPitchClasses`.

### Tests that must stay green (do not retarget these key arrays)

- F7sus4 `0 5 10` +2 stores `G7sus4` keys `[7, 0, 5]` and draws G, C, F. Untransposed F7sus4 still draws F, A#, D#.
- Dsus2 `0 7` +3 stores `Fsus2` keys `[5, 0]` and draws F, C. That result −3 stores `Dsus2` keys `[2, 9]` and draws D, A.
- D `0 4 7` +2 stores `E` keys `[4, 8, 11]` and draws E, G#, B.
- C `0 4 7` +2 stores `D` keys `[2, 6, 9]` and draws D, F#, A.
- B `11 3 6` +1 stores `C` keys `[0, 4, 7]`.
- C `48 52 55` +2 stores keys `[50, 54, 57]`.
- D7M(9)/B keys `[11, 2, 1, 4]` still draws B, D, C#, E.
- The 408-cell count stays `17 * 12 * 2`.

### Test you must add

`{define: Dsus2 keys 0 7}` +5 draws G and D (pcs 7, 2). That result transposed by −5 draws D and A (pcs 2, 9).

Also pass a one-line chart through `exportCho(source, { semitones: 5 })`, parse the exported text, and assert the piano draw is still G and D.

### Checks

`pnpm exec vitest run tests/core/define-directive.test.ts tests/core/resolve-diagram.test.ts tests/core/export-cho.test.ts`

Also:

`pnpm exec vitest run tests/core/layout-capo.test.ts tests/core/resolve-diagram.test.ts tests/core/diagram-draw.test.ts`

One T-002 commit. Paths: `src/core/define.ts`, `src/core/chord-dict.ts` only if the shared reader must change, `tests/core/define-directive.test.ts`, `tests/core/resolve-diagram.test.ts`, and `tests/core/export-cho.test.ts` only if the export assertion lives there. Do not commit `.atomic-skills/`.

If `node_modules` is missing in this worktree, run `CI=true pnpm install` here only. Do not symlink another worktree's `node_modules`. Run vitest with this worktree as cwd.

Write the claim report only to `/Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra/.atomic-skills/status/automate/diagramas-cifra-claims.json`. Do not `git add` it. Do not edit any other file in the plan worktree.

The sealed brief in the writer worktree is stale. This file is the authority:

`/Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra/.atomic-skills/status/automate/diagramas-cifra-F2-sealed-brief.md`

## Exit

1. All listed verifiers green for claimed-pass tasks (self-check).
2. Write claim report to `.atomic-skills/status/automate/diagramas-cifra-claims.json`.
3. Final message: summary of files changed, commit SHAs, claim report path, any blockers.
4. Do not mark tasks done in YAML. Do not call done/phase-done.

---
sealed-brief: true
host-chat-history: excluded
