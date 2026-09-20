# evaluationReport — diagramas-cifra F0

evaluationReport:
  planSlug: diagramas-cifra
  phaseId: F0
  verdict: pass
  findings:
    - severity: minor
      area: other
      path: scripts/build-chord-oracle.mjs:61-66
      summary: "classifyOracleName still returns AMBIGUOUS on invalid bass before the chord body is checked. parseChordToken in src/core/parse-chord.ts:67-75 matches ROOT/QUALITY first and returns UNPARSED for a non-chord body (tests/core/parse-chord-token.test.ts:80-86, tokens vocal/violão and foo/bar). Current fixtures/sda has no such name, so F0-G1 stays green; regenerating tests/core/chord-oracle.table.json after a junk slash token would write AMBIGUOUS while the parser returns UNPARSED."
    - severity: note
      area: goal
      path: tests/core/chord-oracle.table.json
      summary: "Live unique balanced bracket names in fixtures/sda are 255 (148 .cho files), not the plan/phase parenthetical 257. Table row count is 255; missing=[]; invented=[]. Plan.md ground-truth already records balanced [ ] = 255 vs naive nested regex 258. Coverage of unique names holds; the 257 figure is stale copy."
    - severity: note
      area: exitGate
      gateId: F0-G1
      path: tests/core/chord-oracle.test.ts
      summary: "F0-G1 FAIL-when includes table claiming hit/miss per instrument. chord-oracle.test.ts asserts class in {parse, UNPARSED, AMBIGUOUS} and corpus coverage; it does not assert absence of instrument columns. Table keys in tests/core/chord-oracle.table.json are name, class, quality, bass only — no guitar/ukulele/piano/hit/miss columns."
    - severity: note
      area: other
      path: src/core/parse-chord.ts:71
      summary: "T-002 both-claude majors in .atomic-skills/reviews/2026-09-20-diagramas-cifra-F0-T-002-both.md are closed in the current tree: Object.hasOwn(QUALITY, suffix) at src/core/parse-chord.ts:71 plus CtoString/Cconstructor UNPARSED tests; slash body-first with vocal/violão UNPARSED and C7/xyz AMBIGUOUS; oracle loop in tests/core/parse-chord-token.test.ts:101-135 compares class, quality, root, and bass."
  businessIntentCheck:
    value:
      status: pass
      note: "parseChordToken maps BR names to canonical quality without a voicing. C7M → maj7 (not 7) at tests/core/parse-chord-token.test.ts:29-31 and table row C7M quality maj7. C7+ is AMBIGUOUS with no quality (parse-chord.ts:70, parse-chord-token.test.ts:56-59). Quote junk A4\" is UNPARSED (parse-chord.ts:57). No dictionary, SVG, or shape invention in src/core/parse-chord.ts."
    workflow:
      status: pass
      note: "Oracle generator scripts/build-chord-oracle.mjs writes tests/core/chord-oracle.table.json. parseChordToken lives in src/core/parse-chord.ts:55 and is exported from src/core/index.ts:37. Tests: tests/core/chord-oracle.test.ts (3), tests/core/parse-chord-token.test.ts (13). F0-G1 ran both files: 16 passed, exit 0."
    rules:
      status: pass
      note: "Aliases locked in QUALITY (src/core/parse-chord.ts:20-48) and asserted: 7M→maj7, 7M(9)→maj9, 4/sus→sus4, 9→add9, 2→sus2, 6(9)→6add9, 7(9)→9, m7(11)→m11 (parse-chord-token.test.ts:28-47). Oracle samples: C7M maj7, C7M(9) maj9, C4 sus4, Asus/Gsus sus4, C9 add9, G2 sus2, Db6(9) 6add9, G7(9) 9, Gm7(11) m11. 7+ rows B7+/Bb7+/C7+/D7+/Db7+ are AMBIGUOUS. Quote rows (A4\", Am\", Bm7''', …) are UNPARSED. Dm(3b)/F# is AMBIGUOUS. Object.hasOwn blocks prototype-key parse. Zero Vue imports in src/core (F0-G2)."
    outOfScope:
      status: pass
      note: "No DiagramModal.vue, no SVG draw, no voicing dictionary, no {define} parser, no editor sheet, no diagramInstrument prefs under src/. parseChordToken is not wired into src/core/parse.ts layout/render. F0 deliverable is classifier + oracle only."
    doneWhen:
      status: pass
      note: "pnpm exec vitest run tests/core/parse-chord-token.test.ts tests/core/chord-oracle.test.ts → 16 passed, exit 0. pnpm exec vitest run tests/core/no-vue-in-core.test.ts → 1 passed, exit 0. Table covers every unique fixtures/sda bracket name (255/255)."
  exitGates:
    - id: F0-G1
      status: pass
      note: "Verifier `pnpm exec vitest run tests/core/parse-chord-token.test.ts tests/core/chord-oracle.test.ts` exit 0. chord-oracle.test.ts 3/3; parse-chord-token.test.ts 13/13. Table 255 rows, classes parse=229 UNPARSED=18 AMBIGUOUS=8. Oracle vs parser loop compares class/quality/root/bass. No instrument hit/miss columns."
    - id: F0-G2
      status: pass
      note: "Verifier `pnpm exec vitest run tests/core/no-vue-in-core.test.ts` exit 0 (1 test). Grep from ['\"]vue in src/core: no matches. parse-chord.ts is Vue-free."

## Evidence

### Goal

Phase goal: `parseChordToken` classifies unique `fixtures/sda` names as parse, UNPARSED, or AMBIGUOUS; BR aliases as listed; `7+`, quote junk, `m(3b)` miss; oracle columns parse-class only; no Vue in core.

| Check | Result | Path |
|-------|--------|------|
| Classifier exists | `export function parseChordToken` | `src/core/parse-chord.ts:55` |
| Exported from core index | `export { parseChordToken } from './parse-chord'` | `src/core/index.ts:37` |
| Unique SDA names | 255 extracted = 255 table rows; missing []; invented [] | `tests/core/chord-oracle.table.json`; `tests/core/chord-oracle.test.ts:44-53` |
| Class set | parse 229, UNPARSED 18, AMBIGUOUS 8 | table |
| Instrument columns | none (keys: name, class, quality, bass) | table |
| Vue in core | none | `tests/core/no-vue-in-core.test.ts`; grep `src/core` |

### Alias and miss rows (table)

- `C7M` parse quality maj7; `C7M(9)` maj9
- `C4` sus4; `Asus`/`Gsus` sus4
- `C9` add9; `G2` sus2
- `Db6(9)` 6add9; `G7(9)` 9; `Gm7(11)` m11
- `G/B` parse quality major bass B
- `C7+` and four other `7+` names AMBIGUOUS
- `A4"` UNPARSED; 16 quote-junk names UNPARSED
- `Dm(3b)/F#` AMBIGUOUS
- `D9/4`, `G9/4` AMBIGUOUS (valid body, bass `4` fails `BASS`)
- `Cx`, `Dx` UNPARSED (suffix `x` is not a QUALITY key)

### T-002 review close-out

`.atomic-skills/reviews/2026-09-20-diagramas-cifra-F0-T-002-both.md` recorded three majors (prototype QUALITY lookup; slash AMBIGUOUS before body; oracle compared class only). Current code:

1. `if (!Object.hasOwn(QUALITY, suffix)) return { class: 'UNPARSED' }` — `src/core/parse-chord.ts:71`
2. ROOT match and QUALITY lookup before bass check — `src/core/parse-chord.ts:67-75`
3. Oracle loop asserts class, quality, root, bass and forbids quality on miss rows — `tests/core/parse-chord-token.test.ts:101-135`

Residual: generator `scripts/build-chord-oracle.mjs:61-66` still early-returns AMBIGUOUS on invalid bass (minor above). Not a gate fail on the current corpus.

### Exit-gate runs (this evaluation)

```
pnpm exec vitest run tests/core/parse-chord-token.test.ts tests/core/chord-oracle.test.ts
✓ tests/core/chord-oracle.test.ts (3 tests)
✓ tests/core/parse-chord-token.test.ts (13 tests)
Test Files  2 passed (2)
Tests       16 passed (16)
exit 0

pnpm exec vitest run tests/core/no-vue-in-core.test.ts
✓ tests/core/no-vue-in-core.test.ts (1 test)
exit 0
```

No blocker or critical findings. No major findings requiring operator disposition. Verdict pass.
