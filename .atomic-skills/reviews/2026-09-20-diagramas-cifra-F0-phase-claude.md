---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 3, minor: 3, nit: 0}
reviewer: claude
pass: blind
schema_version: "1.0"
---

## Summary

`parseChordToken` is defensive where it counts (`Object.hasOwn` blocks `CtoString`/`C__proto__`, misses carry no `quality`, `7+` is never guessed), and the cross-check loop compares `class`/`quality`/`root`/`bass` rather than class alone. Three substantive problems remain.

The generator and the parser implement the same classification in a **different order** — the oracle checks the bass first, the parser checks it last — so they disagree on any slash token whose body is not a chord. The test suite is green only because all 93 slash names in `fixtures/sda` happen to have a valid A–G body; a single `[vocal/violão]` landing in the corpus makes the regenerated table fail the cross-check, and `tests/core/parse-chord-token.test.ts:80-86` already pins the opposite answer for exactly those tokens. Second, the `+` catch-all is applied to the raw remainder after the root, so arbitrary prose beginning with A–G and containing a `+` (`[Base 1 + 2]`) is reported as an AMBIGUOUS chord instead of UNPARSED. Third, `classifyOracleName` is a line-for-line copy of `parseChordToken`, including both lookup tables, and it *generates* the table it is then checked against — so 18 of the 26 `QUALITY` mappings and all root extraction are verified against nothing.

I verified the divergences against the worktree corpus and the committed table rather than by reasoning from the diff alone.

## Findings

### F-001 [major] correctness — scripts/build-chord-oracle.mjs:66, src/core/parse-chord.ts:75
**Claim:** The oracle validates the bass *before* resolving the root/suffix (`build-chord-oracle.mjs:62-67`); the parser validates it *after* (`parse-chord.ts:61-75`). When a token has both a non-chord body and a non-note bass, the oracle returns `AMBIGUOUS` and the parser returns `UNPARSED`. Examples: `vocal/violão`, `foo/bar`, `Intro/Solo`, and the degenerate `/`. `tests/core/parse-chord-token.test.ts:80-86` asserts `UNPARSED` for the first two, so the change ships two artifacts encoding contradictory specs. I checked all non-`parse` rows in the generated table: the only slash misses are `D9/4`, `G9/4`, `Dm(3b)/F#`, all of which have a valid body and therefore agree. The disagreement is latent, not triggered.
**Impact:** The "parser vs oracle" gate passes by corpus luck. The next fixture containing a bracketed annotation with a slash regenerates a table row the parser cannot match, failing `parseChordToken vs SDA oracle` — and the oracle would be the wrong side, since `Intro/Solo` is not an ambiguous chord. More broadly, the oracle's stated role as the reference is unsound for the whole slash path.
**Recommendation:** Move the bass check in `classifyOracleName` to after the root match and suffix resolution, mirroring `parse-chord.ts:67-75`. Add a direct unit test of `classifyOracleName` covering `foo/bar`, `/`, and `C7/xyz` so the two orderings can't drift again silently.
**Confidence:** High — traced both code paths and confirmed against the committed table.

### F-002 [major] misclassification — src/core/parse-chord.ts:70
**Claim:** `suffix.includes('+')` runs before any check that the remainder is chord-shaped, so any text starting with A–G and containing a `+` anywhere becomes `AMBIGUOUS`. `[Base 1 + 2]` → root `B`, suffix `ase 1 + 2` → `AMBIGUOUS`. Same for `[G + violão]`, `[A+ capella]`. The `AMBIGUOUS_SUFFIX` entry `'7+'` is already dead under this catch-all, which obscures how broad the rule is. `build-chord-oracle.mjs:72` has the identical rule.
**Impact:** `AMBIGUOUS` and `UNPARSED` carry different downstream meanings — "a chord we won't guess at" vs. "not a chord." Prose and section labels get routed into the disambiguation path, inflating ambiguity counts and any user-facing prompt built on this class. `fixtures/sda` is effectively all-chords (the 18 `UNPARSED` rows are quote junk plus `Cx`/`Dx`), so the oracle cannot surface this.
**Recommendation:** Require the suffix to be chord-shaped before applying the `+` rule — either match an explicit set (`+`, `5+`, `7+`, `9+`, `7M+`) or require the whole suffix against something like `/^[0-9mMsuadij#b()+\/]*$/` and fall through to `UNPARSED` otherwise. Drop the now-redundant `'7+'` from `AMBIGUOUS_SUFFIX` or drop the catch-all in favour of the explicit set.
**Confidence:** High.

### F-003 [major] test gap — scripts/build-chord-oracle.mjs:16-78 vs src/core/parse-chord.ts:20-80
**Claim:** `classifyOracleName` duplicates `parseChordToken` statement for statement, including the full 26-entry `QUALITY` map and `AMBIGUOUS_SUFFIX`, in a `.mjs` that tsconfig does not include (`tsconfig.json:23` lists only `scripts/semver-bump.ts` and `scripts/release.ts`). That copy *generates* the table the parser is then compared against, so `parseChordToken vs SDA oracle` is near-tautological — the only real divergence it can detect is F-001. Changing `'6(9)'` to `'6'`, `'m9'` to `'m7'`, or `'º'` to `'m'` in both tables leaves all 255 rows green; only 8 mappings have hand-written expectations (`parse-chord-token.test.ts:26-48`). `root` is worse: the oracle never emits it, so the test falls back to `expectedRoot` (`parse-chord-token.test.ts:18-21`), a third copy of the same `^([A-G](?:#|b)?)` regex — root extraction is checked against itself. `extractNames` is likewise duplicated between `build-chord-oracle.mjs:48` and `chord-oracle.test.ts:24`, with drift risk and no independence gain.
**Impact:** The 255-row oracle overstates the regression net for the module's core contract (Brazilian alias → canonical quality). A mapping error ships silently; the corpus-coverage half of the suite (names present/not invented) is the only part doing real work.
**Recommendation:** Pick one of two honest shapes. Either (a) make the table a hand-reviewed mapping and have the generator only *collect names*, leaving quality/root/bass for a human to fill and the parser to match; or (b) import `parseChordToken` in the generator, drop the twin logic, and treat the table as a reviewed snapshot — then add one explicit assertion per `QUALITY` key so the mappings themselves have a test. Either way, have the oracle emit `root` instead of recomputing it in the test, and export/import a single `extractNames`.
**Confidence:** High.

### F-004 [minor] type confusion — src/core/parse-chord.ts:14-18
**Claim:** `ChordTokenMiss` declares only `class`. Because `ChordTokenResult` is a union and `quality` exists on `ChordTokenParse`, excess-property checking accepts `{ class: 'UNPARSED', quality: 'maj7' }` as a valid `ChordTokenResult` — the "a miss carries no data" invariant exists only in the runtime assertions at `parse-chord-token.test.ts:76/84/91/97`. Separately, `quality: string` and `root: string` are unconstrained, so a typo'd quality compiles and fails only at the downstream lookup.
**Impact:** A future edit can attach a guessed quality to a miss and typecheck cleanly; consumers cannot use `'quality' in r` as a type-level discriminator, only a runtime one. The compiler gives no help on quality-string correctness at the boundary this module exists to define.
**Recommendation:** `type ChordTokenMiss = { class: 'UNPARSED' | 'AMBIGUOUS'; root?: never; quality?: never; bass?: never }`, and narrow `quality` to a union of the canonical values and `root`/`bass` to the note-name union. This also lets the QUALITY map be `Record<string, Quality>` so a bad value is a compile error.
**Confidence:** High.

### F-005 [minor] misclassification — src/core/parse-chord.ts:40
**Claim:** `'m7(11)': 'm11'` adds a ninth the written name does not carry — `m11` conventionally spells 1 ♭3 5 ♭7 9 11, while `m7(11)` is m7 with an added 11th. This is the same kind of inference the module explicitly refuses for `7+` (file header, `parse-chord.ts:2`). `'º'`/`'°' → 'dim'` (lines 46-47) sits in the same family: in Brazilian charts `C°` most often denotes the diminished seventh, and the triad reading is taken by default without comment.
**Impact:** Once a voicing dictionary consumes `quality`, `m7(11)` charts get a shape containing a tone the chart didn't ask for — a wrong diagram rather than an honest miss, which is the exact failure mode the `7+` rule is designed to prevent. Neither mapping is asserted anywhere (see F-003), so the choice isn't recorded as deliberate.
**Recommendation:** Map `m7(11)` to a distinct `m7add11`, or classify it `AMBIGUOUS` alongside `7+`. For `º`/`°`, keep the current reading but state the decision in a comment and add an explicit test so it's a recorded choice rather than a default.
**Confidence:** Medium — domain convention, but it contradicts the module's own stated policy either way.

### F-006 [minor] test gap — tests/core/parse-chord-token.test.ts:26-68, tests/core/chord-oracle.test.ts:66
**Claim:** No direct assertion for the bare root (`'C'` → `major`), accidental roots (that `Bb`/`F#` yield root `Bb`/`F#` and not `B` + suffix `b`), lowercase input (`'c'`), empty/whitespace input (`''`, `'   '`), `º`/`°`, or multi-slash (`'C/E/G'`). The corpus does contain `[G ]` (table row 1141, trailing space) but only incidentally. Separately, `chord-oracle.test.ts:66` asserts `junk.some(r => r.name.includes('A4"'))` — a hardcoded corpus sentinel.
**Impact:** The accidental-absorption path is the one place where the greedy root regex could silently mis-split, and it is only covered transitively through the tautological `expectedRoot` comparison (F-003). The `A4"` sentinel makes an unrelated fixture edit fail a parser test with a misleading message.
**Recommendation:** Add the degenerate and accidental cases as direct `parseChordToken` assertions; replace the `A4"` check with `expect(junk.length).toBeGreaterThan(0)`.
**Confidence:** High.
