# evaluationReport — diagramas-cifra F0

evaluationReport:
  planSlug: diagramas-cifra
  phaseId: F0
  verdict: pass
  findings:
    - severity: note
      area: goal
      path: tests/core/chord-oracle.table.json
      summary: "Live unique balanced bracket names in fixtures/sda are 255 (148 .cho files), not the plan/phase parenthetical 257. Table row count is 255; missing=[]; invented=[]. Coverage of unique names holds; the 257 figure is stale copy in plan.md / source.md titles."
    - severity: note
      area: exitGate
      gateId: F0-G1
      path: tests/core/chord-oracle.test.ts
      summary: "F0-G1 FAIL-when includes table claiming hit/miss per instrument. chord-oracle.test.ts asserts class in {parse, UNPARSED, AMBIGUOUS} and corpus coverage; it does not assert absence of instrument columns. Table keys in tests/core/chord-oracle.table.json are name, class, quality, bass only — no guitar/ukulele/piano/hit/miss columns."
    - severity: note
      area: other
      path: src/core/parse-chord.ts:71
      summary: "AMBIGUOUS_SUFFIX already has '7+'; suffix.includes('+') still classifies any other plus suffix (C+, C7+9) as AMBIGUOUS instead of falling through to UNPARSED via Object.hasOwn. No fixtures/sda name besides *7+ contains '+'. T-002 'do not treat 7+ as aug or maj7' still holds. Not a gate fail."
  businessIntentCheck:
    value:
      status: pass
      note: "parseChordToken maps BR names to canonical quality without a voicing. C7M → maj7 (not 7) at tests/core/parse-chord-token.test.ts:11-14 and table row C7M quality maj7. C7+ is AMBIGUOUS with no quality (parse-chord.ts:51,71; parse-chord-token.test.ts:38-42). Quote junk A4\" is UNPARSED (parse-chord.ts:58). No dictionary, SVG, or shape invention in src/core/parse-chord.ts."
    workflow:
      status: pass
      note: "Oracle generator scripts/build-chord-oracle.ts writes tests/core/chord-oracle.table.json. classifyOracleName imports parseChordToken (scripts/build-chord-oracle.ts:9,32-37) and keeps no second QUALITY table. parseChordToken lives in src/core/parse-chord.ts:56 and is exported from src/core/index.ts:37. Tests: tests/core/chord-oracle.test.ts (10), tests/core/parse-chord-token.test.ts (15). Combined F0-G1 run: 25 passed, exit 0."
    rules:
      status: pass
      note: "Operator A/B/C locks hold. A: slash after / is always bass — D9/4 AMBIGUOUS (parse-chord.ts:62-66,76; parse-chord-token.test.ts:82-86); G/B parse bass B (parse-chord-token.test.ts:32-36); foo/bar UNPARSED because left side is not a chord (parse-chord.ts:68-69; parse-chord-token.test.ts:62-68). B: m(3b) parses as m — QUALITY['m(3b)']='m' (parse-chord.ts:24); Dm(3b) {class:parse,root:D,quality:m} (parse-chord-token.test.ts:90-95); Dm(3b)/F# bass F# (parse-chord-token.test.ts:97-101; table:812-816). C: generator follows parser — classifyOracleName is a thin wrapper (build-chord-oracle.ts:32-37); chord-oracle.test.ts:78-101 locks foo/bar, C7/xyz, C/, G/B, Dm(3b)/F#, D9/4 against parseChordToken. Aliases: 7M→maj7, 4/sus→sus4, 9→add9, 2→sus2, 6(9)→6add9, 7(9)→9, m7(11)→m11. 7+ rows B7+/Bb7+/C7+/D7+/Db7+ are AMBIGUOUS. Quote rows UNPARSED. Object.hasOwn blocks prototype-key parse (parse-chord.ts:72). Zero Vue imports in src/core (F0-G2)."
    outOfScope:
      status: pass
      note: "No DiagramModal.vue, no SVG draw, no voicing dictionary, no {define} parser, no editor sheet, no diagramInstrument prefs under src/. parseChordToken is exported from core index and is not wired into src/core/parse.ts layout/render. F0 deliverable is classifier + oracle only."
    doneWhen:
      status: pass
      note: "pnpm exec vitest run tests/core/parse-chord-token.test.ts tests/core/chord-oracle.test.ts tests/core/no-vue-in-core.test.ts → 26 passed, exit 0. Table covers every unique fixtures/sda bracket name (255/255)."
  exitGates:
    - id: F0-G1
      status: pass
      note: "Verifier `pnpm exec vitest run tests/core/parse-chord-token.test.ts tests/core/chord-oracle.test.ts` exit 0. chord-oracle.test.ts 10/10; parse-chord-token.test.ts 15/15. Table 255 rows, classes parse=230 UNPARSED=18 AMBIGUOUS=7 (Dm(3b)/F# moved AMBIGUOUS→parse vs pre-fix2). Oracle vs parser loop compares class/quality/bass. classifyOracleName follows parser on foo/bar UNPARSED and D9/4 AMBIGUOUS. No instrument hit/miss columns."
    - id: F0-G2
      status: pass
      note: "Verifier `pnpm exec vitest run tests/core/no-vue-in-core.test.ts` exit 0 (1 test). Grep from ['\"]vue in src/core: no matches. parse-chord.ts is Vue-free."

## Evidence

### Goal

Phase goal (plan.md F0 after operator A/B/C): `parseChordToken` classifies unique `fixtures/sda` names as parse, UNPARSED, or AMBIGUOUS; BR aliases as listed; `7+` and quote junk miss; `m(3b)` parses as `m`; slash after `/` is always bass; generator follows parser; oracle columns parse-class only; no Vue in core.

| Check | Result | Path |
|-------|--------|------|
| Classifier exists | `export function parseChordToken` | `src/core/parse-chord.ts:56` |
| Exported from core index | `export { parseChordToken } from './parse-chord'` | `src/core/index.ts:37` |
| Unique SDA names | 255 extracted = 255 table rows; missing []; invented [] | `tests/core/chord-oracle.table.json`; `tests/core/chord-oracle.test.ts:46-55` |
| Class set | parse 230, UNPARSED 18, AMBIGUOUS 7 | table |
| Instrument columns | none (keys: name, class, quality, bass) | table |
| Vue in core | none | `tests/core/no-vue-in-core.test.ts`; grep `src/core` |
| Generator QUALITY table | none; imports `parseChordToken` | `scripts/build-chord-oracle.ts:4,9,32-37` |

### Operator A/B/C locks

| Lock | Result | Path |
|------|--------|------|
| A slash always bass | split on first `/`; invalid bass → AMBIGUOUS | `src/core/parse-chord.ts:62-66,76` |
| A D9/4 AMBIGUOUS | class AMBIGUOUS, no quality | `tests/core/parse-chord-token.test.ts:82-86`; table:713-715 |
| A G/B parse bass B | `{class:parse, root:G, quality:major, bass:B}` | `tests/core/parse-chord-token.test.ts:32-36`; table:1158-1161 |
| A foo/bar UNPARSED | left side fails ROOT | `tests/core/parse-chord-token.test.ts:62-68`; `tests/core/chord-oracle.test.ts:80` |
| B Dm(3b) quality m | `{class:parse, root:D, quality:m}` | `src/core/parse-chord.ts:24`; `tests/core/parse-chord-token.test.ts:90-95` |
| B Dm(3b)/F# bass F# | `{class:parse, root:D, quality:m, bass:F#}` | `tests/core/parse-chord-token.test.ts:97-101`; table:812-816 |
| C generator follows parser | `classifyOracleName` calls `parseChordToken`; no second QUALITY map | `scripts/build-chord-oracle.ts:9,32-37` |
| C7+ AMBIGUOUS | class AMBIGUOUS, no quality | `tests/core/parse-chord-token.test.ts:38-42`; table:533-535 |
| 255 unique names | 148 `.cho`; table 255 | `tests/core/chord-oracle.table.json` |

### Alias and miss rows (table)

- `C7M` parse quality maj7; `C7M(9)` maj9
- `C4` sus4; `Asus`/`Gsus` sus4
- `C9` add9; `G2` sus2
- `Db6(9)` 6add9; `G7(9)` 9; `Gm7(11)` m11
- `G/B` parse quality major bass B
- `C7+` and four other `7+` names AMBIGUOUS
- `A4"` UNPARSED; 16 quote-junk names UNPARSED
- `Dm(3b)/F#` parse quality m bass F# (was AMBIGUOUS before fix2)
- `D9/4`, `G9/4` AMBIGUOUS (valid body, bass `4` fails `BASS`)
- `Cx`, `Dx` UNPARSED (suffix `x` is not a QUALITY key)

### A/B/C close-out (prior eval minors/majors)

Previous eval (pre-fix2) recorded generator slash-order as minor: `classifyOracleName` early-returned AMBIGUOUS on invalid bass before the body was checked (`scripts/build-chord-oracle.mjs`). Current tree:

1. Generator is `scripts/build-chord-oracle.ts`. `classifyOracleName` delegates to `parseChordToken` (`scripts/build-chord-oracle.ts:32-37`). No QUALITY / BASS duplicate.
2. Parser matches ROOT/QUALITY first, then invalid bass (`src/core/parse-chord.ts:68-76`). `foo/bar` UNPARSED; `D9/4` AMBIGUOUS.
3. Phase local majors 1–3 (D9/4, m(3b) AMBIGUOUS, generator/parser slash) are closed by operator A/B/C.

Residual: `suffix.includes('+')` at `src/core/parse-chord.ts:71` (note above). Not a gate fail on the current corpus.

### Exit-gate runs (this evaluation)

HEAD `3fdb7b8` `chore(project): checkpoint diagramas-cifra F0 T-001 T-002 after fix2`

```
pnpm exec vitest run tests/core/parse-chord-token.test.ts tests/core/chord-oracle.test.ts tests/core/no-vue-in-core.test.ts
✓ tests/core/no-vue-in-core.test.ts (1 test)
✓ tests/core/parse-chord-token.test.ts (15 tests)
✓ tests/core/chord-oracle.test.ts (10 tests)
Test Files  3 passed (3)
Tests       26 passed (26)
exit 0
```

No blocker or critical findings. No major findings requiring operator disposition. Verdict pass.
