---
schemaVersion: "0.2"
slug: diagramas-cifra-f2-d2-resolvediagram-bd-draw-with-capo
projectId: titan-chordpro-ui
parentPlan: diagramas-cifra
lessons:
  - id: L-F2-001
    statement: Sizing a fretboard from relative slots while painting dots at absolute nut frets puts capo'd fingers off the board.
    corrective: "diagram-draw.ts: one coordinate space. maxFret = Math.max(4, capoFret, ...dots.map(d => d.fret)); yOf uses the same absolute fret. Test cy between yOf(0) and yOf(maxFret) for capo 2 C/F/G and uke C."
    scope: reusable
    appliesTo: []
    status: open
    confidence: 2
    evidence: .atomic-skills/reviews/eval-diagramas-cifra-F2.md
    createdAt: 2026-09-23T00:28:00.000Z
    validatedAt: 2026-09-23T00:28:00.000Z
  - id: L-F2-002
    statement: A dictionary row that is byte-identical to a simpler quality returns a confident hit for the wrong chord (G9 drawn as G7).
    corrective: "Invariant test: decoded pitch classes must include the characteristic tone (9th for 9/add9/maj9/m9; no 3rd on 5/sus). Fix or omit the packed row so lookup is no-shape, never a silent wrong hit."
    scope: reusable
    appliesTo:
      - F3
    status: open
    confidence: 2
    evidence: .atomic-skills/reviews/2026-09-20-diagramas-cifra-F2-claude.md
    createdAt: 2026-09-23T00:28:00.000Z
    validatedAt: 2026-09-23T00:28:00.000Z
  - id: L-F2-003
    statement: Serving the root voicing for a slash token (G/B → packed G) lies about the bass.
    corrective: "resolveDiagram: if bassPc is set and no override matched that bass, return miss no-shape. Do not call lookupDict(root, quality) alone. Test G/B miss; define-guitar G/B hits; define-guitar G does not match G/B."
    scope: reusable
    appliesTo: []
    status: open
    confidence: 2
    evidence: .atomic-skills/reviews/eval-diagramas-cifra-F2.md
    createdAt: 2026-09-23T00:28:00.000Z
    validatedAt: 2026-09-23T00:28:00.000Z
---

# Lessons — F2 D2 resolveDiagram + draw with capo

Operator ratified 2026-09-23 (L-F2-001, L-F2-002, L-F2-003). Eval majors (known-miss list, leftover 6add9=A6) deferred to F3.
