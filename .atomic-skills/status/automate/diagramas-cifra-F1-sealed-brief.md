# Phase writer brief — diagramas-cifra F1

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
- **phaseId:** F1
- **initiativePath:** /Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra/.atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/phases/f1-d1-define-parse-serialize-round-trip.md (read-only)
- **worktreePath (cwd):** /Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra-F1-fix1
- **writerBranch:** impl/diagramas-cifra-F1-fix1
- **baseRef:** 28dc6be91cbad0c53cbde9867c6226ef80a12165
- **decisionLogPath:** /Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra/.atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/decisions/F1.jsonl (informational — host owns append; do not write)

### Tasks (2)

#### T-001 — Parse and serialize define directives
- status: pending
- paths: ["src/core/parse.ts","src/core/define.ts","src/core/index.ts","tests/core/define-directive.test.ts"]
- scopeBoundary: ["No Vue editor; no dictionary lookup; do not add define to META_KEYS as an x_ key; do not implement the diagram SVG."]
- acceptance: ["DIR accepts define-guitar and define-ukulele as full keys; parseDefineDirective reads frets, fingers, base-fret, keys; serializeDefine emits ChordPro text; generic {define:} infers guitar from 6 frets, ukulele from 4, piano from keys; unknown arity is miss"]
- verifier: {"kind":"shell","command":"pnpm exec vitest run tests/core/define-directive.test.ts","expectExitCode":0}
- weight: 3

#### T-002 — writeDefines + fixture + exportCho keep
- status: pending
- paths: ["src/core/define.ts","src/core/import-chordpro.ts","src/core/export-cho.ts","tests/core/define-directive.test.ts","tests/core/export-cho.test.ts","fixtures/define-roundtrip.cho"]
- scopeBoundary: ["Do not invent lyrics; only add define lines to an existing fixture; do not build the shape editor UI; do not change strum meta keys."]
- acceptance: ["writeDefines places the define block after META_KEYS header and before lyrics; writeMeta leaves define lines in place; exportCho of a source with {define-guitar:} still contains that directive; fixture fixtures/define-roundtrip.cho (outside fixtures/sda) has at least one {define-guitar:} used in tests; exportCho({semitones:2}) rewrites define names with the same transpose as the body"]
- verifier: {"kind":"shell","command":"pnpm exec vitest run tests/core/define-directive.test.ts tests/core/export-cho.test.ts","expectExitCode":0}
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
