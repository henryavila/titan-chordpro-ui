# Phase writer brief — diagramas-cifra F0

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
- **phaseId:** F0
- **initiativePath:** /Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra/.atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/phases/f0-d0-parser-br-oraculo-257.md (read-only)
- **worktreePath (cwd):** /Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra-F0-writer
- **writerBranch:** impl/diagramas-cifra-F0-writer
- **baseRef:** 649f82957a90287f505a51a60e9c184bc9d844b2
- **decisionLogPath:** /Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra/.atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/decisions/F0.jsonl (informational — host owns append; do not write)

### Tasks (2)

#### T-001 — Oracle table from fixtures/sda
- status: pending
- paths: ["tests/core/chord-oracle.table.json","tests/core/chord-oracle.test.ts","scripts/build-chord-oracle.mjs"]
- scopeBoundary: ["Do not invent chart lyrics; do not implement parseChordToken here; do not add Vue; do not ship a voicing dictionary."]
- acceptance: ["Table lists every unique bracket token from fixtures/sda (257 names); each row is parse, UNPARSED, or AMBIGUOUS; 7+ and quote-junk rows are AMBIGUOUS or UNPARSED; chord-oracle.test.ts fails if fixtures/sda gains a name missing from the table"]
- verifier: {"kind":"shell","command":"pnpm exec vitest run tests/core/chord-oracle.test.ts","expectExitCode":0}
- weight: 2

#### T-002 — parseChordToken + BR aliases
- status: pending
- paths: ["src/core/parse-chord.ts","src/core/index.ts","tests/core/parse-chord-token.test.ts"]
- scopeBoundary: ["No Vue; no fret/key diagrams; no {define} parser; do not treat 7+ as aug or maj7."]
- acceptance: ["parseChordToken(\"C7M\") quality is maj7; parseChordToken(\"C7M(9)\") is maj9; parseChordToken(\"C4\") and parseChordToken(\"Csus\") are sus4; parseChordToken(\"C9\") is add9; parseChordToken(\"G2\") is sus2; parseChordToken(\"C6(9)\") is 6add9; parseChordToken(\"C7(9)\") is 9; parseChordToken(\"Cm7(11)\") is m11; parseChordToken(\"C7+\") is AMBIGUOUS; parseChordToken(\"A4\\\"\") is UNPARSED; slash bass G/B sets bass; function is exported from src/core/index.ts"]
- verifier: {"kind":"shell","command":"pnpm exec vitest run tests/core/parse-chord-token.test.ts","expectExitCode":0}
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

---
sealed-brief: true
host-chat-history: excluded
