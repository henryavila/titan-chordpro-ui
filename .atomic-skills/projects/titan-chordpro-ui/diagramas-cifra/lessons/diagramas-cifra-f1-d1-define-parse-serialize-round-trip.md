---
schemaVersion: "0.2"
slug: diagramas-cifra-f1-d1-define-parse-serialize-round-trip
projectId: titan-chordpro-ui
parentPlan: diagramas-cifra
lessons:
  - id: L-F1-001
    statement: Transposing only the `{define}` chord name and keeping the original fret or key grid publishes a wrong override (G shape labelled A).
    corrective: "One transposeDefine shared by exportCho, applyShape, and rewriteToKey. Drop guitar/ukulele defines that have an open string (fret 0) or would land base-fret < 1; bump baseFret on movable shapes; shift piano keys (mod 12 for 0–11). Lock with tests that the open-G fixture is omitted, not relabelled."
    scope: reusable
    appliesTo: []
    status: open
    confidence: 2
    evidence: .atomic-skills/reviews/eval-diagramas-cifra-F1.md
    createdAt: 2026-09-20T16:20:00.000Z
    validatedAt: 2026-09-20T16:20:00.000Z
  - id: L-F1-002
    statement: A plan-level maestro redispatchCount carries across phases, so F1-fix1 needed an operatorOverride after F0 already consumed the ceiling.
    corrective: "Reset redispatchCount to 0 when the cursor phaseId changes (new phase), or store the count per phaseId. Do not hand-edit redispatchCount down."
    scope: reusable
    appliesTo: []
    status: open
    confidence: 2
    evidence: .atomic-skills/status/automate/diagramas-cifra.json
    createdAt: 2026-09-20T16:20:00.000Z
    validatedAt: 2026-09-20T16:20:00.000Z
---

# Lessons — F1 D1 {define} parse/serialize/round-trip

Operator ratified 2026-09-20 (L-F1-001 e L-F1-002).
