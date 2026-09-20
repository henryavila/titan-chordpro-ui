```markdown
---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 3, minor: 3, nit: 0}
reviewer: claude-opus-5[1m]
pass: blind
schema_version: "1.0"
---

## Summary
`parseChordToken` is a pure, side-effect-free lookup with no async, shared state, or I/O, so race, secrets, and rollback risk are nil (the change is one new file plus two export lines and reverts cleanly). The substantive problems are classification correctness and a type-confusion hole in the suffix lookup.

Three issues matter: (1) `QUALITY[suffix]` is an object-literal index, so suffixes that name `Object.prototype` members resolve to functions/objects and are returned as `class: 'parse'` with a non-string `quality`; (2) the slash branch decides `AMBIGUOUS` before the chord body is validated, so any non-chord text containing `/` is reported as an ambiguous chord instead of unparsed; (3) the oracle test compares only `class`, ignoring the `quality` and `bass` columns that already exist in the fixture — the alias mapping, which is the entire purpose of the module, is verified by 8 hand-written assertions and nothing else. Additionally the `quality` vocabulary is not round-trip safe (`C9` → `add9`, `C7(9)` → `9`), which will bite the first consumer that serializes it back.

## Findings

### F-001 [major] correctness / type confusion — src/core/parse-chord.ts:72-77

**Evidence:**
```ts
const QUALITY: Record<string, string> = { '': 'major', M: 'major', /* ... */ }
// ...
  const quality = QUALITY[suffix]
  if (quality === undefined) return { class: 'UNPARSED' }
  const parsed: ChordTokenParse = { class: 'parse', root: m[1], quality }
```

**Claim:** `QUALITY` is a plain object literal, so `QUALITY['constructor']`, `QUALITY['toString']`, `QUALITY['valueOf']`, `QUALITY['hasOwnProperty']`, and `QUALITY['__proto__']` resolve via the prototype chain and are never `undefined`, so `"Bconstructor"`, `"CtoString"`, `"A__proto__"` etc. return `class: 'parse'` with `quality` bound to a `Function` or to `Object.prototype`.

**Impact:** Junk tokens are classified as successfully parsed, and `quality` violates its declared `string` type — a consumer doing `quality.toLowerCase()` throws `TypeError` (`Object.prototype` has no such method), and one doing string interpolation emits `function Object() { [native code] }` or `[object Object]` into rendered output. The oracle test cannot catch this because the fixture contains no such names.

**Recommendation:** Build the table with `Object.create(null)` or a `Map`, or gate the lookup with `Object.hasOwn(QUALITY, suffix)` before use.
**Confidence:** high

### F-002 [major] correctness / misclassification — src/core/parse-chord.ts:61-66

**Evidence:**
```ts
  const slash = token.indexOf('/')
  if (slash >= 0) {
    chord = token.slice(0, slash)
    bass = token.slice(slash + 1)
    if (!BASS.test(bass)) return { class: 'AMBIGUOUS' }
  }
```

**Claim:** The bass is validated and `AMBIGUOUS` is returned before the chord body is ever checked, so any token containing `/` with a non-note right side is `AMBIGUOUS` regardless of whether the left side is a chord at all — `"vocal/violão"`, `"Intro/2x"`, `"N.C./x"`, `"1/2"`, and the trailing-slash `"C/"` all return `AMBIGUOUS`.

**Impact:** `AMBIGUOUS` and `UNPARSED` carry different downstream semantics (needs human disambiguation vs. not a chord). Plain prose or annotation text inside brackets will be funneled into the disambiguation path, inflating ambiguity counts and any user-facing prompts built on this class. The oracle fixture only contains real chord names, so the test suite cannot detect it.

**Recommendation:** Match the chord body against `ROOT`/`QUALITY` first; return `UNPARSED` when the body is not a chord, and reserve `AMBIGUOUS` for a valid body with an unrecognized bass. Decide explicitly what `"C/"` (empty bass) should be.
**Confidence:** high

### F-003 [major] test gap — tests/core/parse-chord-token.test.ts:63-74

**Evidence:**
```ts
    for (const row of table) {
      const got = parseChordToken(row.name).class
      if (got !== row.class) mismatches.push(`${row.name}: oracle ${row.class} parser ${got}`)
    }
```

**Claim:** The fixture rows carry `quality` and `bass` (e.g. `{"name":"A2","class":"parse","quality":"sus2"}`, `{"name":"A/Db",...,"bass":"Db"}`) but the loop compares only `class`, so every alias mapping in `QUALITY` except the 8 covered by the hand-written cases is unverified against the oracle.

**Impact:** Swapping any unasserted mapping — `'6(9)' → '6'`, `'m9' → 'm7'`, `'º' → 'm'` — or dropping the `bass` field entirely leaves all 255 oracle rows green. The module's core contract (Brazilian alias → canonical quality) has no regression net.

**Recommendation:** Compare the full row in the oracle loop: `class`, `quality` for parse rows, and `bass` (including its absence for non-slash rows).
**Confidence:** high

### F-004 [minor] correctness / contract — src/core/parse-chord.ts:29-35

**Evidence:**
```ts
  '7': '7',
  '7(9)': '9',
  '9': 'add9',
```

**Claim:** The output `quality` vocabulary overlaps the input suffix vocabulary with different meanings: `parseChordToken('C7(9)').quality === '9'`, while the suffix `'9'` parses to `'add9'`, so `root + quality` is not a re-parseable token.

**Impact:** The first consumer that serializes a parsed chord back to text (transpose round-trip, `{define}`-adjacent export, diagram key lookup) silently converts a dominant-9 into an add9. No documented enum or exported union constrains the values, so the collision is invisible at the type level.

**Recommendation:** Document the vocabulary and export it as a union type, or pick canonical values disjoint from the accepted suffixes; add a round-trip test asserting `parse(root + quality)` is stable where the module claims serializability.
**Confidence:** medium

### F-005 [minor] correctness — src/core/parse-chord.ts:71

**Evidence:**
```ts
  if (AMBIGUOUS_SUFFIX.has(suffix) || suffix.includes('+')) return { class: 'AMBIGUOUS' }
```

**Claim:** Only `7+` is the Brazilian/standard-notation collision, but the blanket `includes('+')` marks every `+`-bearing suffix ambiguous, including the unambiguous augmented triad `"C+"` and compounds like `"C+5"`, `"C9+"`.

**Impact:** Over-classification into `AMBIGUOUS`; `C+` (aug) can never be resolved automatically even though its meaning is not disputed. The oracle fixture contains only `7+` cases, so widening or narrowing this rule is untested.

**Recommendation:** Restrict the ambiguity rule to the suffixes that are actually contested (`7+` and the `AMBIGUOUS_SUFFIX` set) and add explicit fixture rows for `C+`.
**Confidence:** medium

### F-006 [minor] type safety — src/core/parse-chord.ts:5-16

**Evidence:**
```ts
export type ChordParseClass = 'parse' | 'UNPARSED' | 'AMBIGUOUS'
export type ChordTokenParse = { class: 'parse'; ... }
export type ChordTokenMiss = { class: 'UNPARSED' | 'AMBIGUOUS' }
```

**Claim:** `ChordParseClass` is exported as the public class enum but the result types restate their literals independently instead of deriving from it, so adding a fourth class to `ChordParseClass` compiles clean while `ChordTokenResult` still cannot represent it.

**Impact:** Consumers writing exhaustive `switch` over `ChordParseClass` will get a compiler-enforced case that `parseChordToken` can never return, and a future class added to the runtime won't be forced into the result union — a silent divergence between the exported enum and the returned shape.

**Recommendation:** Define `ChordTokenMiss` as `{ class: Exclude<ChordParseClass, 'parse'> }` so the union follows the enum.
**Confidence:** medium
```
