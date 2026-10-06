Read the four files plus the generated table and the existing root grammar in `transpose.ts`.

**Locks verified as implemented:**
- Slash-is-always-bass: `parse-chord.ts:62-66` splits at first `/`, `:76` gates on `BASS`. `D9/4` and `G9/4` are `AMBIGUOUS` in the committed table (`chord-oracle.table.json:713, 1249`). ✓
- `m(3b)` → `m`: `parse-chord.ts:24`; `Dm(3b)/F#` → `{quality: "m", bass: "F#"}` (`:812`). ✓
- Generator imports the parser: `build-chord-oracle.ts:9,33`; no second QUALITY table in the script. ✓

---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 3, minor: 3, nit: 0}
reviewer: claude
pass: blind
schema_version: "1.0"
---

## Summary

All three operator locks are correctly implemented and pinned by both hand-written and corpus tests. The remaining problems are in the *contract*, not the locked behaviors: `class: 'parse'` is advertised as "renderable" but neither the root nor the quality it produces is constrained to anything the diagram layer can consume, and the corpus "oracle" is generated from the parser and then asserted against the parser, so it cannot falsify an alias mapping.

## Findings

### major — `quality` is an unconstrained `string`; the QUALITY table has no type-level contract
**WHAT** `ChordTokenParse.quality: string` (`parse-chord.ts:10`) and `QUALITY: Record<string, string>` (`:20`). Nothing constrains the 18 emitted values (`major`, `m`, `sus2`, `sus4`, `5`, `6`, `6add9`, `7`, `7sus4`, `9`, `maj7`, `maj9`, `add9`, `dim`, `m6`, `m7`, `m9`, `m11`) to a set the diagram lookup supports.
**WHY** The table is deliberately confusing in a way that invites exactly this error: key `'9'` → value `'add9'` (`:36`) while key `'7(9)'` → value `'9'` (`:32`). Transposing those two, or typing `'maj7 '`, compiles clean, regenerates the oracle clean, and passes every test.
**IMPACT** F0's only deliverable is a contract for the F1 diagram renderer. A silent value typo surfaces as a missing diagram at runtime, not a red test.
**RECOMMENDATION** Declare `export type ChordQuality = 'major' | 'm' | ... ` and write `const QUALITY = {...} as const satisfies Record<string, ChordQuality>`; type `ChordTokenParse.quality` as `ChordQuality`. Add a one-line comment distinguishing `'9'` (dominant) from `'add9'`.

### major — the oracle is self-referential; a wrong alias cannot fail CI
**WHAT** `chord-oracle.table.json` is emitted by `classifyOracleName` (`build-chord-oracle.ts:32`), which is `parseChordToken`. Every assertion in `chord-oracle.test.ts:103-125` recomputes `parseChordToken(row.name)` and `classifyOracleName(row.name)` and compares them to the row. The name-set test (`:46-55`) only checks coverage.
**WHY** The suite detects one thing: a table that is stale relative to the parser. It cannot detect a table and a parser that changed together — `npx tsx scripts/build-chord-oracle.ts` turns any alias regression green. There are no independent corpus-wide expectations; the only ground truth in the branch is the ~20 literal assertions in `parse-chord-token.test.ts`.
**IMPACT** The artifact satisfies the stated gate ("a tabela cobre os nomes únicos de fixtures/sda") while providing no protection for the mappings it exists to lock. The golden-file diff becomes the sole review gate, and it is 1343 lines.
**RECOMMENDATION** Add literal, non-derived assertions over the corpus: pin the class histogram (`parse`/`UNPARSED`/`AMBIGUOUS` counts) and the exact `AMBIGUOUS` name list (`B7+`, `Bb7+`, `C7+`, `D7+`, `Db7+`, `D9/4`, `G9/4`) as hardcoded expectations. Those fail when parser and table move together.

### major — `class: 'parse'` does not guarantee a renderable root; root grammar is duplicated and already divergent from `transpose.ts`
**WHAT** `ROOT = /^([A-G](?:#|b)?)(.*)$/` (`parse-chord.ts:53`) and `BASS` (`:54`) accept `Cb`, `Fb`, `E#`, `B#` and return them verbatim as `root`/`bass` with no pitch-class normalization. `transpose.ts` carries the same grammar three more times (`:37`, `:51`, `:115`) backed by `IDX` (`:4-26`), which *reads* those spellings but whose `SHARP`/`FLAT` output arrays can never *emit* them.
**WHY** This is the same duplication class the operator locked for QUALITY, applied to the root. The two grammars agree only by coincidence on today's corpus; they already disagree in kind — `IDX` is a pitch-class map, `ROOT` is a shape match. `parseChordToken('Cb')` returns `{class:'parse', root:'Cb'}`, a root no transposition ever produces and that a 12-entry shape table keyed by sharp names will miss.
**IMPACT** A consumer that trusts `class: 'parse'` gets a runtime lookup miss on enharmonics, i.e. the contract's one guarantee does not hold. Not triggered by `fixtures/sda`, so it will land in F1 as a rendering bug rather than here.
**RECOMMENDATION** Either add a normalized pitch class to `ChordTokenParse` (`rootPc: 0..11`, reusing `IDX`), or export the root regex/`IDX` membership check from a single module and have `parse-chord.ts` and `transpose.ts` both import it. Add `Cb`, `E#`, `B#` to `parse-chord-token.test.ts` so the chosen behavior is pinned.

### minor — quote-junk guard is character-incomplete, so typographic junk splits across two classes
**WHAT** `/["'’]/` (`parse-chord.ts:58`) covers U+0022, U+0027, U+2019 only. The corpus already contains U+2019 (`A’`, `C’`, `D’`, `D7’`), so smart quotes are live in this data.
**WHY** The guard's only observable effect is forcing junk to `UNPARSED` instead of `AMBIGUOUS` when the body is otherwise valid: `C/E’` → `UNPARSED`, but `C/E”` (U+201D) or `C/E‘` (U+2018) → `AMBIGUOUS` via the bass gate at `:76`.
**IMPACT** `AMBIGUOUS` is the human-triage bucket. Which bucket a bad transcription lands in depends on which quote glyph the transcriber typed — non-obvious, and it pollutes the triage queue as the corpus grows.
**RECOMMENDATION** Broaden to the full set (`/["'‘’“”`´]/`) or drop the guard and let the suffix/bass lookups classify, then document the resulting class. Either is defensible; the current half-set is not.

### minor — the test re-implements the extractor instead of importing the exported one
**WHAT** `build-chord-oracle.ts` exports `extractNames` (`:23`), but `chord-oracle.test.ts:22-39` defines its own `TOKEN`, `extractNames`, and `uniqueFromSda` — a verbatim clone. The export is unused.
**WHY** Same principle as the QUALITY lock: the corpus-coverage assertion at `:46-55` validates the table against a *copy* of the extractor, not the generator's. It also duplicates a module-level `/g` regex with manual `lastIndex` reset, a stateful construct now maintained in two places.
**IMPACT** Divergence in the extractor surfaces as a confusing "invented names" failure rather than as the extractor change it is; the generator's actual extraction path is untested.
**RECOMMENDATION** `import { extractNames } from '../../scripts/build-chord-oracle'` and delete the test's copies. `uniqueFromSda` should be exported from the script and reused too.

### minor — `OracleRow` omits `root`, so the corpus never pins the root/suffix split
**WHAT** `OracleRow` carries `name`, `class`, `quality`, `bass` (`build-chord-oracle.ts:16-21`); `classifyOracleName:35` drops `result.root`.
**WHY** Root-split regressions are only caught indirectly, when they happen to change the class (e.g. `Bb` → suffix `b` → `UNPARSED`). A regression that preserves class while mis-splitting is invisible corpus-wide; root is asserted literally for just three tokens in `parse-chord-token.test.ts`.
**IMPACT** The golden file under-specifies the parse it exists to record, and bass is the only note-valued field a reviewer can check in the diff.
**RECOMMENDATION** Add `root` to `OracleRow` and to the agreement loop at `chord-oracle.test.ts:115-122`; regenerate.
