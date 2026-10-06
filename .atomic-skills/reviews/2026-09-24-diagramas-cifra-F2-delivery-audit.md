# Delivery audit — diagramas-cifra F2

intent: phase F2 businessIntent (concert / shapeName / capoFret, file define wins, C7M vs C7+, draw model, no Vue modal)
mode: audit
depth: full
axes: product, residual
verifiedAt: 2026-09-24T22:20:00.000Z
at: 53e2a4d
**Verdict:** PARTIAL

## Matrix A — decisions

| ID | Criterion | Status | Evidence |
|----|-----------|--------|----------|
| D1 | Capo 2 Bm is concert Bm, shapeName Am, capoFret 2; guitar draw is the Am grip | RESOLVED | src/core/layout.ts:502-514; tests/core/layout-capo.test.ts:152-160; tests/core/diagram-draw.test.ts:86-104 |
| D2 | Piano uses concert pitch classes and ignores capoFret | RESOLVED | src/core/diagram-draw.ts:248-263 and 292-296; tests/core/diagram-draw.test.ts:127-143 |
| D3 | File {define} wins over the package dictionary | RESOLVED | src/core/resolve-diagram.ts:175-198; tests/core/resolve-diagram.test.ts:150-168 |
| D4 | C7M is maj7; C7+ is unknown-token; one open voicing; Object.hasOwn | RESOLVED | src/core/chord-dict.ts:44; src/core/resolve-diagram.ts:159-161; tests/core/resolve-diagram.test.ts:25-52 |
| D5 | Draw model: dots, mute, barre, capo bar, Capo n, lit keys; no Vue in core | PARTIAL | Dots, mutes, capo bar, Capo n, and lit keys are in src/core/diagram-draw.ts:19-44 and 200-207. No separate barre field. No Vue import under src/core. |

## Matrix B — problems

| ID | Expected fix | Status | Evidence |
|----|--------------|--------|----------|
| P1 | Guitar under capo 2 draws shapeName, not the concert Bm grip | RESOLVED | tests/core/diagram-draw.test.ts:86-104 contrasts Am frets with Bm x24432 |
| P2 | C7M is not drawn as dominant 7 | RESOLVED | tests/core/resolve-diagram.test.ts:25-36 expects x32000 and piano 0 4 7 11 |

## Matrix C — must-not

| Item | Status | Evidence |
|------|--------|----------|
| DiagramModal | RESOLVED absent | no match under src/ |
| diagramInstrument | RESOLVED absent | no match under src/ |
| editor sheet writing {define} | RESOLVED absent | no writer in src/vue |
| pause auto-scroll or metronome | RESOLVED absent | no pause in diagram-draw.ts or resolve-diagram.ts |
| Vue in src/core | RESOLVED absent | tests/core/no-vue-in-core.test.ts |

## Residual

Protocol: valid. OLD terms (display chord as the guitar shape; concert grip under capo) are not a second draw writer. NEW terms (concert, shapeName, capoFret) are stored in layout and consumed by resolve/draw. src/vue does not remap the draw model.

LOW: projects/titan-chordpro-ui/diagramas-cifra/design.md decision 5 still says display() discards concert. layout.ts now keeps concert, shapeName, and capoFret. Not a live second writer.

## Findings

1. LOW — no barre field on the draw model (src/core/diagram-draw.ts:19-44). Capo bar and dots ship. Design asks for fingers and a capo bar, not a pestana primitive. Does not block the capo-2 Bm or piano rules.
2. LOW — stale “Hoje” sentence in design.md. Teaching drift only.

No CRITICAL. No HIGH. Residual leg valid.

## Acceptance

F2-G1 host run on this tree: `pnpm exec vitest run tests/core/layout-capo.test.ts tests/core/resolve-diagram.test.ts tests/core/diagram-draw.test.ts` exit 0, 82 tests.

verdict: PARTIAL
