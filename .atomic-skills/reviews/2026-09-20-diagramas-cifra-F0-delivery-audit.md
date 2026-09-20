# Delivery audit — diagramas-cifra F0

**Mode:** audit (read-only)
**Verdict:** CLOSED
**At:** 2026-09-20T14:32:00Z
**HEAD:** 3fdb7b8dfc24c5c8cd8d1aca81771e83cc80647c
**Intent source:** F0 businessIntent spine + operator A/B/C locks

## Problem / decision matrix

| # | Intent | Surface | Status | Evidence |
|---|--------|---------|--------|----------|
| 1 | BR names recognized without inventing voicing | parseChordToken | RESOLVED | C7M→maj7 not 7; C7+ AMBIGUOUS; src/core/parse-chord.ts |
| 2 | Oracle of unique fixtures/sda names | chord-oracle.table.json | RESOLVED | 255/255 coverage; tests/core/chord-oracle.test.ts |
| 3 | Aliases 7M, 4/sus, 9, 2, 6(9), 7(9), m7(11) | parse-chord-token.test.ts | RESOLVED | 15 tests including aliases |
| 4 | 7+ / quote junk miss | parser | RESOLVED | C7+ AMBIGUOUS; A4" UNPARSED |
| 5 | m(3b) is m | parser | RESOLVED | Dm(3b) quality m; Dm(3b)/F# bass F# |
| 6 | slash after / is bass | parser | RESOLVED | D9/4 AMBIGUOUS; G/B bass B; foo/bar UNPARSED |
| 7 | generator follows parser | build-chord-oracle.ts | RESOLVED | imports parseChordToken; no second QUALITY |
| 8 | no Vue in core | no-vue-in-core.test.ts | RESOLVED | 1 test pass; grep src/core |
| 9 | out of scope: modal, SVG, dictionary, {define}, editor | src/ | N/A | none of those files added |

## Residual

- Claude close-review: quality union type, histogram pin, root vs transpose.ts — **defer F2** (diagram). Invalid residual for F0 CLOSE? No: F0 SoT is classifier + oracle, not render lookup.

## Verifiers

`pnpm exec vitest run tests/core/parse-chord-token.test.ts tests/core/chord-oracle.test.ts tests/core/no-vue-in-core.test.ts` → 26 passed, exit 0.

## Verdict

CLOSED — F0 intent delivered end-to-end. No CRITICAL/load-bearing gap in the BI spine.
