---
schemaVersion: "0.2"
slug: diagramas-cifra-f0-d0-parser-br-oraculo-257
projectId: titan-chordpro-ui
parentPlan: diagramas-cifra
lessons:
  - id: L-001
    statement: Claim reports that set a later task's base to an earlier task's HEAD share an endpoint SHA and fail exclusivity validation.
    corrective: "validateClaimReport / claim-report.js: give each open claim exclusive commitShas, or a base/head range that does not reuse another claim's endpoints."
    scope: reusable
    appliesTo: []
    status: open
    confidence: 2
    evidence: .atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/decisions/F0.jsonl
    createdAt: 2026-09-20T12:10:00.000Z
    validatedAt: 2026-09-20T12:10:00.000Z
  - id: L-002
    statement: A plain object QUALITY map treats Object.prototype keys as parsed qualities (non-string Function values).
    corrective: "src/core/parse-chord.ts: look up with Object.hasOwn(QUALITY, suffix) or Object.create(null)/Map; test CtoString and Cconstructor as UNPARSED."
    scope: reusable
    appliesTo:
      - F2
    status: open
    confidence: 2
    evidence: .atomic-skills/reviews/2026-09-20-diagramas-cifra-F0-T-002-both.md
    createdAt: 2026-09-20T12:10:00.000Z
    validatedAt: 2026-09-20T12:10:00.000Z
  - id: L-003
    statement: Ground-truth fp includes initiative handoff and nextAction, so a checkpoint before spawn makes the receipt stale.
    corrective: "find-plans-missing-ground-truth.js: restamp ## Ground-truth review fp= after handoff/nextAction writes and re-run the detector before assert-automate-gate --gate spawn."
    scope: reusable
    appliesTo: []
    status: open
    confidence: 2
    evidence: .atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/plan.md
    createdAt: 2026-09-20T12:10:00.000Z
    validatedAt: 2026-09-20T12:10:00.000Z
  - id: L-004
    statement: Codex CLI usage limit aborts the Grok-host default external leg of review-code --mode=both.
    corrective: "providers/codex: on usage-limit, run the family-different Claude envelope (both-claude) and record Codex as failed; do not treat same-family Grok as the external leg."
    scope: reusable
    appliesTo: []
    status: open
    confidence: 2
    evidence: .atomic-skills/reviews/2026-09-20-diagramas-cifra-F0-T-002-both.md
    createdAt: 2026-09-20T12:10:00.000Z
    validatedAt: 2026-09-20T12:10:00.000Z
---

# Lessons — F0 D0 Parser BR + oráculo

Operator ratified 2026-09-20 (`approve/save all`).
