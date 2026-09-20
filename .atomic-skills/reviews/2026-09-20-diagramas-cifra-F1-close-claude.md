---
verdict: needs_changes
counts: {blocker: 1, critical: 0, major: 4, minor: 4, nit: 0}
reviewer: local-or-claude
pass: blind
schema_version: "1.0"
---

## Summary

The change introduces a `{define}` parser/serializer, threads it through `parse()`, `exportCho`, and `rewriteToKey`, and widens the shared `DIR` regex across four modules. The parse/serialize core is mostly sound, but the transpose policy deletes source lines rather than leaving them alone, and one of the deleting call sites (`rewriteToKey`) writes its result straight back into the live chart source — silent, unrecoverable loss of user-authored voicings for the most common guitar shapes. Secondary problems: `writeDefines` is replace-all against the whole file, `parse()` drops define lines it cannot read with no signal, the piano `keys` shift mixes two incompatible arithmetics per element, and a define carrying both `frets` and `keys` loses its fret grid.

## Findings

### 1. BLOCKER — transposing a key deletes open-string `{define}` lines from the persisted chart

**WHAT** `transposeDefine` returns `null` whenever any fret slot is `0` (`src/core/define.ts:187`) or the bumped base would land below 1 (`src/core/define.ts:191`). `transposeDefineLine` turns that `null` into `null` (`src/core/define.ts:202`) and `rewriteDefineLines` turns *that* into an empty array, i.e. the line is removed from the text (`src/core/define.ts:212`). `rewriteToKey` runs this over the whole source (`src/core/import-chordpro.ts:533`) and its `.source` is fed back into the live document at `src/vue/ChordproViewer.vue:1512-1514` (`session.replace(r.source)`), with the same removal on the export path at `src/core/export-cho.ts:15-23`.

**WHY** Every open-position guitar shape — G, C, D, E, A, Em, Am, Dm — contains at least one `0` slot, so the predicate at `src/core/define.ts:187` fires for the majority of hand-written overrides. Dropping a *view* entry is a display decision; dropping the *line* mutates the file. There is no inverse: re-transposing back by `-n` cannot restore a line that no longer exists, and nothing warns the user. `tests/core/define-directive.test.ts:268-275` pins exactly this deletion (`expect(r!.source).not.toMatch(/\{define-guitar:/)`), and `tests/core/export-cho.test.ts:19-28` pins it for export.

**IMPACT** A musician presses "Reescrever tom" once and every open-position chord diagram they authored is gone from the saved chart, permanently and without notice. Exported `.cho` files are likewise no longer a superset of their input, so the export is not a safe backup.

**RECOMMENDATION** Separate the view policy from the text policy. `applyShape` may drop a shape it cannot honour; `rewriteDefineLines` / `exportCho` must never delete a source line. Either leave the untransposable define line byte-identical (it is orphaned but harmless — `parse()` simply won't match it to a chord), or preserve it under a comment/`#~` passthrough. At minimum, make the drop opt-in via an explicit option and default it off, and return the dropped set on `RewriteToKeyResult` so the UI can warn.

### 2. MAJOR — `writeDefines` strips every define in the file and re-inserts only the array it was handed

**WHAT** `writeDefines` filters out *all* lines matching `isDefineKey` (`src/core/define.ts:247-253`) and then splices in `defines.map(serializeDefine)` (`src/core/define.ts:266`). There is no keying by chord name or instrument. `tests/core/define-directive.test.ts:179-187` asserts this replace-all behaviour is intended: writing a guitar define erases an unrelated ukulele define.

**WHY** The function is exported as public API (`src/core/index.ts:37`) with the name `writeDefines`, whose natural reading is "persist these defines". A caller saving one edited voicing will pass one `ChordDefine` and silently destroy every other override in the file. The safe round trip requires the caller to know it must always pass the complete set from `parse(src).defines` — a contract stated nowhere in the signature or the doc comment at `src/core/define.ts:243-246`.

**IMPACT** Latent today (no caller in `src/`), destructive the moment the editor path is wired: a single-diagram save wipes the file's other diagrams. Because the destructive semantics are locked by a passing test, the next implementer will treat it as correct.

**RECOMMENDATION** Replace by identity — strip only lines whose `(name, instrument)` appears in the incoming array, and leave the rest in place. If replace-all is genuinely wanted, rename to `replaceAllDefines` and document that the caller must pass the complete set.

### 3. MAJOR — `parse()` silently discards define lines it cannot read

**WHAT** `parseRaw` does `if (isDefineKey(k)) { const def = asChordDefine(parseDefineDirective(raw)); if (def) defines.push(def); continue }` (`src/core/parse.ts:151-155`). The `continue` runs unconditionally, so a define that returns `miss` is consumed as a directive, never pushed to `defines`, and never emitted as a line — it vanishes from the view with no `ParseIssue`, no lint entry (`src/core/lint.ts:29,47` skips any `{…` line), and no user-visible trace.

**WHY** The parser is strict in ways that are easy to trip: any unrecognised fret token makes the whole directive a miss (`src/core/define.ts:36-41,94-98`) — `x` and `-1` are accepted, but the ChordPro reference also lists `N` for an unsounded string, and that token yields `miss`. Likewise `{define-guitar: …}` with anything other than exactly 6 frets is a miss (`src/core/define.ts:131-133`). Combined with finding 2, `parse(src).defines → writeDefines(src, …)` is a lossy round trip *today*: the unreadable line is dropped from the view and then deleted from the file.

**IMPACT** A user's typo — or a legal ChordPro file written by another tool — makes the diagram silently disappear with nothing to debug against, and any subsequent save erases the line from disk. Note the inconsistency this creates: `rewriteDefineLines` *keeps* a miss line untouched (`src/core/define.ts:198-200` returns `line`), so the text path and the view path disagree about the same input.

**RECOMMENDATION** Carry unreadable defines through the view as raw passthrough (e.g. a `raw: string` variant or a sibling `unknownDefines: string[]`), re-emit them from `writeDefines`, and surface them as a lint issue. Separately, accept `N` in `parseFret` alongside `x`/`-1`.

### 4. MAJOR — `shiftKey` picks its arithmetic per element, so a mixed-range `keys` array is shredded

**WHAT** `shiftKey` wraps mod 12 when `0 <= k <= 11` and otherwise adds `n` linearly (`src/core/define.ts:175-178`), applied element-wise at `src/core/define.ts:194`.

**WHY** The branch is chosen per element, not per array, so two adjacent notes can take different arithmetic: `keys 11 12` shifted by `+1` becomes `[0, 13]` — two semitones that were adjacent are now 13 apart. Even within a pure 0–11 array, any wrap silently reorders the voicing: `keys 0 4 7` at `+8` becomes `[8, 0, 3]`, turning a root-position triad into an inversion with the root above the third. `tests/core/define-directive.test.ts:245-247` only checks a value that wraps cleanly (`11 → 0` with all others in range), and `:251-256` only checks a fully out-of-range array; the mixed case and the reordering case are untested.

**IMPACT** Keyboard diagrams render the wrong voicing — and for mixed-range arrays, a nonsensical one — for any transpose that crosses the 11→0 boundary. Because the wrap is deterministic it will look "close enough" in the common `+1`/`+2` cases and be missed in review.

**RECOMMENDATION** Decide one representation. Either `keys` are absolute (always add `n`, no wrap), or they are pitch classes (wrap the whole array, then re-sort/normalise so the interval structure is preserved). Do not choose per element. Add tests for `[11, 12] + 1` and for a `+8` shift of `[0, 4, 7]`.

### 5. MAJOR — a define carrying both `frets` and `keys` loses its fret grid and is dropped whole on transpose

**WHAT** Instrument inference checks `keys` before fret arity (`src/core/define.ts:137-145`), so `{define: C base-fret 1 frets 3 2 0 0 0 3 keys 0 4 7}` is classified `instrument: 'piano'` — asserted at `tests/core/define-directive.test.ts:91-106`. `ChordDefine.instrument` is a single scalar (`src/core/define.ts:15`), so there is no way to express "this line defines both a guitar grid and a keyboard voicing". Then `transposeDefine` checks `def.frets?.some((f) => f === 0)` *before* touching `keys` (`src/core/define.ts:187`), so that same define is returned as `null` and the line is deleted (see finding 1) — taking the perfectly transposable `keys` with it.

**WHY** ChordPro's `{define:}` permits `frets` and `keys` on the same directive; the parser preserves both fields (`src/core/define.ts:156-160`) and `serializeDefine` round-trips both (`src/core/define.ts:165-173`), so the data survives parse but the routing field does not. Any consumer selecting diagrams by `instrument` will never find the guitar grid for such a line.

**IMPACT** A legal ChordPro file loses its guitar diagram on display and loses the whole directive on transpose. The parse-side test at `:91-106` gives false confidence because it only checks the fields, never the routing or the transpose outcome.

**RECOMMENDATION** Either split one directive into multiple `ChordDefine` entries (one per instrument it actually describes), or replace the scalar `instrument` with a derived predicate over the present fields. In `transposeDefine`, evaluate `frets` and `keys` independently: drop only the fret grid when it is not movable, and keep the keys.

### 6. MINOR — the shared `DIR` makes the colon optional at three call sites that previously required it

**WHAT** `DIR` (`src/core/define.ts:8`) uses `\s*:?\s*`. It now backs `readMeta` (`src/core/import-chordpro.ts:367`), `writeMeta`'s body filter (`:432`), and `chartBody` (`:963`), each of which previously used a regex with a mandatory `\s*:\s*`.

**WHY** A bare `{title}` / `{key}` now matches with an empty value. `readMeta` records `title: ''`; `writeMeta` then filters that line out of the body (`:433`) while the header builder skips empty values (`:435`), so the line is deleted from the output. Before this change it survived as body text. Nothing in the diff tests colon-less meta keys.

**IMPACT** Malformed-but-harmless directives are now silently removed on any `writeMeta` round trip, and `chartBody` body-equality checks see a different body than before.

**RECOMMENDATION** Keep the colon optional only where it was already optional (`toPlain`, `parseRaw`) and use a colon-required variant for `readMeta` / `writeMeta` / `chartBody`, or add an explicit test pinning the intended treatment of `{title}`.

### 7. MINOR — `base-fret` has no upper bound and looser validation than `keys`

**WHAT** Parsing accepts anything `Number()` can read that is `>= 1` (`src/core/define.ts:84-89`), so `1.5`, `1e1`, and `0x10` all become base frets. `keys`, by contrast, requires `/^-?\d+$/` (`src/core/define.ts:115-125`). On transpose, `next.baseFret = base` is set with only a lower bound (`src/core/define.ts:190-192`).

**WHY** The two validators in the same function disagree about what a number is, and nothing rejects a base fret past the end of the neck. `{define-guitar: F base-fret 1 frets 1 3 3 2 1 1}` transposed `+24` serialises as `base-fret 25`.

**IMPACT** Non-integer or absurd base frets round-trip through `serializeDefine` into the saved file and reach the (out-of-scope) renderer as a plausible-looking number.

**RECOMMENDATION** Use the same `/^\d+$/` test as `keys`, and bound the transposed result (reject or clamp above a realistic maximum, e.g. 24) the way the `< 1` case is already handled.

### 8. MINOR — `serializeDefine` emits shapes that `parseDefineDirective` will reject

**WHAT** `serializeDefine` (`src/core/define.ts:165-173`) writes whatever is on the object with no validation, while it and `ChordDefine` are both public (`src/core/index.ts:37-38`).

**WHY** A consumer-built `{ directive: 'define-guitar', frets: [1,2,3,4,5] }` serialises happily, but `parseDefineDirective` returns `miss` on the arity check (`src/core/define.ts:131-133`). Per finding 3 that line is then swallowed by `parse()` and deleted on the next write.

**IMPACT** The published write/read pair is not a round trip for externally constructed values, and the failure mode is silent deletion rather than an error.

**RECOMMENDATION** Validate in `serializeDefine` (throw, or return `null`) so an invalid `ChordDefine` cannot reach the file; alternatively narrow the exported type so the arity invariant is expressible.

### 9. MINOR — `rewriteDefineLines` and `writeDefines` ignore `{sot}` / `{sos}` bodies that `parse()` respects

**WHAT** Both functions operate on a flat `split('\n')` with no block state (`src/core/define.ts:205-215`, `:247-253`), whereas `parseRaw` keeps tab and score bodies verbatim and never interprets their contents as directives (`src/core/parse.ts:87-101`).

**WHY** A line inside a `{sot}`…`{eot}` block that happens to match `DIR` with a define key is transposed by `rewriteDefineLines` and physically removed-and-relocated by `writeDefines`, while `parse()` treats the identical text as tab content.

**IMPACT** Text inside a tab or score block can be rewritten or relocated out of its block, corrupting the stave; the two modules disagree about the same source.

**RECOMMENDATION** Track `{sot}`/`{sos}` depth in both functions and skip their bodies, mirroring `parseRaw`.
