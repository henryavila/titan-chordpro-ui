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
- **worktreePath (cwd):** /Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra-F2-fix10
- **writerBranch:** impl/diagramas-cifra-F2-fix10
- **baseRef:** a07fa6a57dda6b1d57291fb1b3f95a0f3e08454e
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

## Fix contract — F2-fix10 (this dispatch only)

Codex receipt `.atomic-skills/reviews/2026-09-24-1133-diagramas-cifra-f2-fix9-codex.md` kept three majors. Do not start F3. Do not edit guitar or ukulele packs. Do not add Vue. `transposePianoKeys` must not throw. `chord-dict.ts` must not import `define.ts`.

The largest interval in `QUALITY_INTERVALS` is 17. A key above 17 is a MIDI note, not an interval.

### Rule

`pianoSoundingPitchClasses`:

- If any key is `> 17` or `< 0`, return `keys.map(mod12)` in order. Do not run the relative-versus-absolute heuristic.
- Otherwise keep the current heuristic. That includes `14` and `17` next to `0–11`.

`transposePianoKeys`:

1. Every key is inside `0–11`: keep the current candidate path. When neither candidate reads the shifted classes, store `60 + pc`. Do not throw.
2. Every key is `0–17` and at least one key is `12–17`: these are extended intervals. Do not add `n` to the raw numbers. Take the sounding classes from the heuristic, shift them by `n` inside `0–11`, then store the `0–11` candidate (absolute, else relative) that the renamed chord reads back as that sequence. If neither does, store `60 + pc`.
3. Any key `> 17` or `< 0`: MIDI. Add `n` to each key. Do not fold them with `60 + (mod 12)`. If any result is `<= 17`, add the same multiple of 12 to every key until every key is `> 17`. Keep the spacing.

### Tests that must stay green

- `{define: C keys 0 2}` +2 stores `D` keys `[62, 64]`. `exportCho` and `transpose` draw D and E. Minus 2 stores `C` keys `[60, 62]` and draws C and D.
- Dsus2 `0 7` +5 stores `Gsus2` keys `[0, 7]` and draws G, D. Minus 5 stores keys `[2, 9]` and draws D, A.
- `{define: D9 keys 0 4 7 14}` untransposed draws D, F#, A, E (pcs 2, 6, 9, 4).
- F7sus4 `0 5 10` +2 stores `[7, 0, 5]`. Dsus2 +3 stores `[5, 0]`. D `0 4 7` +2 stores `[4, 8, 11]`. C `0 4 7` +2 stores `[2, 6, 9]`. B `11 3 6` +1 stores `[0, 4, 7]`. C `48 52 55` +2 stores `[50, 54, 57]`.
- The 408-cell count stays `17 * 12 * 2`.

The test that expects `D` keys `[62, 64]` after −60 may change its stored numbers. It must still draw D and E, and every stored key must be `> 17`.

### Tests you must add

- `{define: D9 keys 0 4 7 14}` +2 draws E, G#, B, F# (pcs 4, 8, 11, 6). `exportCho` of that chart does not throw.
- `{define: D keys 50 52}` draws D and E (pcs 2, 4). `{define: C keys 48 50}` +2 stores `[50, 52]` and draws D and E.
- `{define: C keys 60 64 79}` +2 stores `[62, 66, 81]`. That result transposed by −2 stores `[60, 64, 79]`.

Put assertions in `tests/core/define-directive.test.ts` and/or `tests/core/resolve-diagram.test.ts`.

### Checks

`pnpm exec vitest run tests/core/define-directive.test.ts tests/core/resolve-diagram.test.ts tests/core/export-cho.test.ts`

Also:

`pnpm exec vitest run tests/core/layout-capo.test.ts tests/core/resolve-diagram.test.ts tests/core/diagram-draw.test.ts`

One T-002 commit. Paths: `src/core/define.ts`, `src/core/chord-dict.ts`, `tests/core/define-directive.test.ts`, `tests/core/resolve-diagram.test.ts`. Do not commit `.atomic-skills/`.

If `node_modules` is missing, run `CI=true pnpm install` in this worktree only. Do not symlink another worktree's `node_modules`. Run vitest with this worktree as cwd.

Write the claim report only to `/Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra/.atomic-skills/status/automate/diagramas-cifra-claims.json`. Do not `git add` it. Do not edit any other file in the plan worktree.

The sealed brief inside the writer worktree is stale. This file is the authority:

`/Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra/.atomic-skills/status/automate/diagramas-cifra-F2-sealed-brief.md`

## Exit

1. All listed verifiers green for claimed-pass tasks (self-check).
2. Write claim report to `.atomic-skills/status/automate/diagramas-cifra-claims.json`.
3. Final message: summary of files changed, commit SHAs, claim report path, any blockers.
4. Do not mark tasks done in YAML. Do not call done/phase-done.

---
sealed-brief: true
host-chat-history: excluded
