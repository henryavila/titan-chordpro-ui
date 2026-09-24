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
- **worktreePath (cwd):** /Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra-F2-fix16
- **writerBranch:** impl/diagramas-cifra-F2-fix16
- **baseRef:** ff985dc600fb797f3f6a77d2754195e43200c9ae
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

Two commits. Claim `base` and `head` are null. Each SHA is used once.

Commit 1, `fix(T-002): drop only a stringed define that would hide piano`:
- `src/core/define.ts`, `src/core/parse.ts` only if export and transpose must share the helper
- `tests/core/define-directive.test.ts`, `tests/core/export-cho.test.ts` only if an existing assertion must change

Commit 2, `fix(T-002): quoted chord names stay a miss`:
Wait, the second commit is still the resolve path. Use message `fix(T-003): quoted names stay a miss on every instrument` only if you touch `src/core/diagram-draw.ts`. Otherwise put the quote guard in commit 1 and give T-003 a commit that only updates `tests/core/diagram-draw.test.ts` if the draw already matches. Do not invent a pass. If draw needs the same quote test, edit it in commit 2.

### Collision

Drop a line only when it started as guitar or ukulele, lost its frets, and another define that was already piano has the same transposed name.
An original `{define:}` that already has keys stays, even if it also had open frets.
`{define: D frets x 0 0 2 3 2 keys 0 4 7}` then `{define: D keys 0 7}`, +2, must keep the first as `{define: E keys 0 4 7}`.
`{define-guitar: D frets x 0 0 2 3 2 keys 0 4 7}` then `{define: D keys 0 7}`, +2, must keep only the piano line, keys `[0, 7]`.
A lone `{define-guitar: D frets x 0 0 2 3 2 keys 0 4 7}` +2 is still `{define: E keys 0 4 7}` and parses.
Match the name the way resolve matches aliases: `C7M` and `Cmaj7` are the same chord. A converted guitar `Cmaj7` must not hide a piano `C7M`.

### Tab and score

Defines inside `{start_of_tab}` / `{sot}` … `{end_of_tab}` / `{eot}` and `{start_of_score}` / `{sos}` … `{end_of_score}` / `{eos}` do not take part in that collision. Transpose each of those lines on its own. A define inside the block must not delete the define outside it.
`parse` already ignores defines inside those blocks. `exportCho` must still round-trip the outside define.

### Quotes

Before any instrument override, a token containing `'`, `"`, `'`, `'`, `"`, or `"` (straight, U+2018, U+2019, U+201C, U+201D) is `unknown-token` for guitar, ukulele, and piano. `Caug` without a quote stays a hit when the define has frets. `C7+` stays a miss.

### Still true

`24 28 31` on D stays distances and draws D F# A. Every key >= 48 is MIDI and adds the shift. Capo 30 draws no open circle at the nut. Fret 10000 does not hang and is not drawn as fret 24.

### Checks

`CI=true pnpm install` here only if `node_modules` is missing.

```
pnpm exec vitest run tests/core/define-directive.test.ts tests/core/resolve-diagram.test.ts tests/core/export-cho.test.ts
pnpm exec vitest run tests/core/layout-capo.test.ts tests/core/resolve-diagram.test.ts tests/core/diagram-draw.test.ts
```

Both exit 0.
Claim path: `/Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra/.atomic-skills/status/automate/diagramas-cifra-claims.json`

---
sealed-brief: true
host-chat-history: excluded
