---
verdict: needs_changes
counts: {blocker: 0, critical: 1, major: 3, minor: 3, nit: 0}
reviewer: claude
pass: blind
schema_version: "1.0"
---

## Summary

All five locks hold literally: `DIR` (`src/core/define.ts:6`) admits hyphenated keys and `define-guitar` survives as a full key; `writeMeta` keeps define lines because the define keys are absent from `META_KEYS` (`src/core/import-chordpro.ts:345-358`, filter at `:430-434`); `exportCho({semitones:2})` does rewrite define names; `fixtures/define-roundtrip.cho` exists outside `fixtures/sda` and is exercised by both new test files; no Vue file is touched.

The lock that is satisfied in letter and broken in substance is the transpose one. `exportCho` renames the chord in the define and leaves the fingering untouched, so the exported file publishes a G shape labelled A. Separately, the in-memory path (`transpose`/`setKey`) does not rename defines at all, so the view and the export now disagree about the same operation, and the `parse()` → `writeDefines()` pair silently deletes any define the new parser does not recognise.

## Findings

### 1. CRITICAL — `exportCho` transposes the define's name but not its shape

**WHAT** `transposeDefineLine` (`src/core/export-cho.ts:4-9`) rewrites only `def.name` and re-serializes `baseFret`/`frets`/`fingers`/`keys` verbatim. Fixture `fixtures/define-roundtrip.cho:6` is `{define-guitar: G base-fret 1 frets 3 2 0 0 0 3 fingers 2 1 0 0 0 3}`; `exportCho(src, {semitones: 2})` emits `{define-guitar: A base-fret 1 frets 3 2 0 0 0 3 ...}`. `tests/core/export-cho.test.ts:16-22` asserts exactly that and locks it in.

**WHY** A fret grid is absolute, not relative to the chord name. `3 2 0 0 0 3` at base-fret 1 is G major on standard tuning and stays G major whatever the label says. The same defect applies to the piano branch: `{define: C keys 0 4 7}` becomes `{define: D keys 0 4 7}` — a C triad labelled D.

**IMPACT** The exported `.cho` is wrong at the level the feature exists to serve: every consumer that honours the file override — this project's own diagram sheet in F2/F4, `chordpro` CLI, any songbook app — draws and sounds a G while the chart says A. It is silent: the file is well-formed, the name matches the body, nothing errors. It is also worse than having no define, because a correct dictionary entry for A gets shadowed by a wrong file override.

**RECOMMENDATION** Name-only rewriting is not a transpose. Transpose the shape, or drop the define. Concretely: if every fretted slot is `> 0` or `x` (movable shape, no open strings), `baseFret += n` is correct and the name rewrite is valid. If any slot is `0`, the shape is not transposable — omit that define from the output so the new name falls back to the dictionary. For piano, shift each entry of `keys` by `n`. Then retarget the test: with this fixture the assertion should be that no `{define-guitar:` for `G` or `A` survives, not that `A` carries the G grid.

### 2. MAJOR — `transpose()`/`setKey()` leave `view.defines` stale, so the view and the export disagree

**WHAT** `applyShape` (`src/core/parse.ts:260-285`) maps `sections` and `displayKey` and returns `{ ...view, sections, transposeSemitones, displayKey }`; `defines` rides through untouched. After `transpose(parse(fixture), 2)` the view has `displayKey: 'A'`, chords `[A] [D] [E]`, and `defines[0].name === 'G'`.

**WHY** `defines` was added to `ChordProView` (`src/core/types.ts:23`) as a view-level fact, but it is the only chord-bearing field `applyShape` does not touch. Nothing in the new tests covers a transposed view.

**IMPACT** Two paths, two answers, for the one operation named in the phase lock. A consumer looking up a diagram by displayed chord name finds no override for `A` and a dangling override for `G` that no longer appears in the chart; `exportCho` on the same transpose produces a file where the define is named `A`. Whichever of the two is later chosen as canonical, the other is a bug already shipped.

**RECOMMENDATION** Decide the rule once and put it in one place — a single `transposeDefine(def, semis, flats)` used by both `applyShape` and `export-cho.ts` — with the same shape-or-drop semantics as finding 1. Add a test asserting `transpose(parse(fixture), 2).defines` and `exportCho(fixture, {semitones: 2})` agree on the define set.

### 3. MAJOR — `parse()` silently swallows unrecognised defines while `writeDefines` deletes all of them, so the pair loses data

**WHAT** `src/core/parse.ts:144-148` does `continue` on every define key, pushing only the ones that parse; a miss vanishes from both `defines` and `lines`. `writeDefines` (`src/core/define.ts:203-224`) first strips *every* line matching `DIR` + `isDefineKey`, then inserts only what it is handed. So `writeDefines(src, parse(src).defines)` is a lossy round-trip, and `writeDefines(src, [oneDefine])` wipes every other chord's define — `tests/core/define-directive.test.ts:161-168` asserts that destructive behaviour as intended.

**WHY** The parser is stricter than the format it round-trips. It accepts only 6-fret and 4-fret shapes (`src/core/define.ts:129-143`), so a 5-string banjo, a 7-string guitar, or any `{define:}` carrying only `fingers` is a miss. `parseFret` (`:34-39`) takes `x` and `-1` but not `N`, which chordpro also treats as an unplayed string. Anything that misses is invisible to `parse()` and therefore deleted on the next write. `writeDefines` is also context-free: it strips define-looking lines inside `{sot}`/`{sos}` blocks, which `parse()` deliberately preserves as tab/score text (`src/core/parse.ts:80-94` runs before the define branch).

**IMPACT** User content destroyed with no error and no undo path, on a save. F4 acceptance is already written as "save calls `writeDefines`", so this pair is the intended wiring, and the one existing `writeDefines` test locks in replace-everything.

**RECOMMENDATION** Never delete a line the parser could not read. Carry unparsed define lines through the view as raw text (e.g. `defines` entries with a `raw` passthrough, or a sibling `unknownDefines: string[]`) and re-emit them in `writeDefines`. Restrict the strip to lines whose name is in the incoming set, so a single-chord save cannot clear the file. Skip `{sot}`/`{sos}` bodies, matching `parse()`. Accept `N` in `parseFret`.

### 4. MAJOR — instrument is inferred from string count, so 4-fret defines become "ukulele"

**WHAT** `src/core/define.ts:137-143`: 6 frets → guitar, 4 frets → ukulele, anything else → miss.

**WHY** Arity is not an instrument. Bass, mandolin, and charango are all 4-course; a generic `{define: E frets 2 2 1 0}` for bass is recorded as `instrument: 'ukulele'`. The directive itself carries no contradiction, so nothing flags it.

**IMPACT** The `directive` field preserves the file text, so the export is unharmed — but `instrument` is what downstream diagram code will consult for tuning and string count, so F2/F3 will draw a bass voicing on a ukulele neck with ukulele string names. The field is exported publicly (`src/core/index.ts:37-38`), so the wrong value is part of the API surface.

**RECOMMENDATION** Only assert `instrument` where the directive states it (`define-guitar`, `define-ukulele`) or the payload is unambiguous (`keys` → piano). For a bare `{define:}` with frets, leave `instrument` undefined or mark it `'unknown'` with `stringCount: frets.length`, and let the rendering layer decide with the user's selected instrument as context.

### 5. MINOR — the shared `DIR` also made the colon optional at three call sites that required it

**WHAT** `src/core/define.ts:6` uses `\s*:?\s*`. The three regexes it replaced in `readMeta` (`src/core/import-chordpro.ts:367`), `writeMeta` (`:430`) and `chartBody` (`:959`) all required `\s*:\s*`.

**WHY** The lock is about hyphens in the key; the colon relaxation is an unrelated semantic change that rode along. `readMeta` now records `{key}` as `key: ''`; `writeMeta` and `chartBody` now strip colon-less lines such as `{title}` that they previously left in the body. `toPlain` and `parse` already used `:?`, so only these three moved.

**IMPACT** Small today — colon-less meta directives are rare — but it is an untested, undocumented widening of three functions that decide what leaves the chart body, reached by every import.

**RECOMMENDATION** Either export two regexes (`DIR` with the optional colon for the dispatchers, `DIR_KV` requiring the colon for the meta readers/filters), or keep the single `DIR` and state in its doc comment that the colon is optional, with a test covering `{title}` through `writeMeta` and `chartBody`.

### 6. MINOR — `DEFINE_HEADER` hand-copies `META_KEYS` and will drift

**WHAT** `src/core/define.ts:180-197` restates the twelve `META_KEYS` (`src/core/import-chordpro.ts:345-358`) plus `t`/`st`/`artist`/`composer` as a literal set.

**WHY** The header scan in `writeDefines` breaks at the first line not in the set. When a new meta key is added — this codebase has a history of adding `x_` keys — the scan stops at it and the define block lands *above* it, i.e. inside the canonical header block `writeMeta` emits in `META_KEYS` order.

**IMPACT** The "after the META_KEYS header" lock breaks silently on an unrelated future change; no test would catch it.

**RECOMMENDATION** Build the set from the source of truth: `new Set([...META_KEYS, 't', 'st', 'artist', 'composer'])`, imported from `import-chordpro.ts` (or move `META_KEYS` to a shared module if that creates a cycle). Add a test that a chart carrying every `META_KEYS` entry places the define block after all of them.

### 7. MINOR — `base-fret` is validated with bare `Number()` while `keys` gets a digit guard

**WHAT** `src/core/define.ts:82-87` accepts anything `Number.isFinite` and `>= 1`; `keys` at `:113-120` additionally requires `/^-?\d+$/`.

**WHY** `Number()` accepts non-decimal and non-integer literals. `base-fret 0x10` parses as 16 and re-serializes as `base-fret 16`; `base-fret 1.5` round-trips as-is; `base-fret 1e3` becomes 1000.

**IMPACT** A typo is silently reinterpreted rather than rejected, and `serializeDefine` writes the reinterpreted value back to the user's file — a wrong diagram that looks deliberate. The inconsistency with the `keys` guard also means the two paths reject different garbage.

**RECOMMENDATION** Apply the same guard: `/^\d+$/.test(tokens[i + 1] ?? '')` before `Number`, plus a sane upper bound (chordpro's grids stop around fret 24). Add miss cases for `base-fret 0`, `base-fret 1.5`, `base-fret 0x10`.
