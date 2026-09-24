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
- **worktreePath (cwd):** /Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra-F2-fix15
- **writerBranch:** impl/diagramas-cifra-F2-fix15
- **baseRef:** 511a737b96a0676fd71d2c8a63b3961b81154b68
- **decisionLogPath:** /Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra/.atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/decisions/F2.jsonl (informational — host owns append; do not write)

### Tasks (2)

#### T-002 — Dictionary + resolveDiagram
- status: pending
- paths: ["src/core/chord-dict.ts","src/core/resolve-diagram.ts","src/core/index.ts","tests/core/resolve-diagram.test.ts","src/core/define.ts","tests/core/define-directive.test.ts"]
- scopeBoundary: ["No Vue; no editor sheet; guitar dictionary is EADGBE; ukulele is GCEA only; do not ship baritone; do not guess 7+."]
- acceptance: ["resolveDiagram({ token, instrument, overrides }) prefers file override over dictionary; guitar token is shapeName; piano token is concert; miss reasons are unknown-token or no-shape; C7M hits maj7 voicing; C7+ is miss; one voicing per name (lowest open)"]
- verifier: {"kind":"shell","command":"pnpm exec vitest run tests/core/resolve-diagram.test.ts","expectExitCode":0}
- weight: 3

#### T-003 — SVG draw guitar ukulele piano with capo
- status: pending
- paths: ["src/core/diagram-draw.ts","src/core/index.ts","tests/core/diagram-draw.test.ts"]
- scopeBoundary: ["No Vue components; draw returns data or SVG string from core; do not pause auto-scroll here; do not open the modal."]
- acceptance: ["Guitar/ukulele draw with capoFret 2 includes a capo bar and the label Capo 2; open string in the shape is at the capo, not the nut; piano draw ignores capoFret and lights concert keys; fingers 1-4 render when present, else dots only"]
- verifier: {"kind":"shell","command":"pnpm exec vitest run tests/core/diagram-draw.test.ts","expectExitCode":0}
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

One commit is enough if both tasks share it: then the claim must use exclusive commit SHAs. Prefer two commits and `base: null`, `head: null`, each SHA used once.

Commit 1 `fix(T-002): do not shadow an existing piano define`:
- `src/core/define.ts`, tests in `tests/core/define-directive.test.ts` and `tests/core/export-cho.test.ts` if needed

Commit 2 `fix(T-003): off-neck capo and quoted piano names`:
- `src/core/diagram-draw.ts`, `src/core/resolve-diagram.ts`, `tests/core/diagram-draw.test.ts`, `tests/core/resolve-diagram.test.ts`

Keep these true:
- One line `{define-guitar: D frets x 0 0 2 3 2 keys 0 4 7}` +2 still becomes `{define: E keys 0 4 7}` and parses.
- `{define: D keys 24 28 31}` stays distances and draws D F# A.
- MIDI lists with every key >= 48 still add the shift.
- `C7+` stays unknown-token. Guitar Caug with frets stays a hit.
- Fret 10000 does not hang and is not drawn as fret 24.

### Shadow

If the chart already has a piano `{define:}` for the transposed name, drop the fretted line that lost its frets. Do not emit a second piano define that would be found first.
`{define-guitar: D frets x 0 0 2 3 2 keys 0 4 7}` followed by `{define: D keys 0 7}`, transposed +2, must still resolve piano E as keys `[0, 7]`, not `[0, 4, 7]`.

### Off-neck

A dot whose fret is above 24: that string is a mute, not a blank string and not a dot on fret 24.
Capo 30 with frets `x 0 2 2 1 0` must not draw open circles at the nut. If the capo bar is not drawn, the SVG must not show those strings as open.

### Quotes

`{define: C' keys 0 4 7}`, `{define: C" keys 0 4 7}`, and a curly apostrophe in the name must be a miss, not a hit with no lit keys. Same rejection the draw already uses for quotes.

### Checks

`CI=true pnpm install` in this worktree only if `node_modules` is missing.

```
pnpm exec vitest run tests/core/define-directive.test.ts tests/core/resolve-diagram.test.ts tests/core/export-cho.test.ts
pnpm exec vitest run tests/core/layout-capo.test.ts tests/core/resolve-diagram.test.ts tests/core/diagram-draw.test.ts
```

Both exit 0. Claim JSON path: `/Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra/.atomic-skills/status/automate/diagramas-cifra-claims.json`

---
sealed-brief: true
host-chat-history: excluded
