# Local review — T-002 parseChordToken

**Ref:** `3b173f541dbbdc161571db521473895400f7e354..e24582abea35e61217e207c716f67edc6a2f90e8`
**Mode:** local
**Provider:** grok
**At:** 2026-09-20T11:40:00Z
**Files:** src/core/parse-chord.ts, src/core/index.ts, tests/core/parse-chord-token.test.ts

verdict: findings_exist
total_findings: 2
counts: blocker=0 critical=0 major=1 minor=1
passes: 2

| # | Summary | Severity | File:line | Mechanism | Impact | Recommendation |
|---|---------|----------|-----------|-----------|--------|----------------|
| 1 | Inherited Object.prototype suffixes parse as success with a non-string `quality` | major | src/core/parse-chord.ts:72 | `QUALITY` is a normal object; `QUALITY[suffix]` is compared only to `undefined`, so suffixes that are inherited keys (`toString`, `constructor`, `__proto__`, `valueOf`, `hasOwnProperty`, …) are treated as hits. `parseChordToken('CtoString')` returns `{ class: 'parse', root: 'C', quality: ƒ toString() }` | Public `ChordTokenParse.quality` is typed `string` but is a function/object; any caller doing `quality.toLowerCase()` / `charAt` throws; junk tokens are classified as parsed instead of `UNPARSED` | Look up with `Object.hasOwn(QUALITY, suffix)` (or store QUALITY in a `Map` / `Object.create(null)`); reject otherwise as `UNPARSED` |
| 2 | Oracle test locks only `class`, not `quality`/`bass`/`root` | minor | tests/core/parse-chord-token.test.ts:70 | Loop reads `parseChordToken(row.name).class` only. `OracleRow` omits `quality`/`bass` even though `tests/core/chord-oracle.table.json` has them on every `parse` row | A QUALITY-table regression (e.g. `'9'` → `'9'` instead of `'add9'`, dropped bass) still passes the 255-name oracle test; only the handful of alias cases would fail | Compare `quality`, `root`, and `bass` on `class === 'parse'` rows; assert miss rows have no `quality` |
