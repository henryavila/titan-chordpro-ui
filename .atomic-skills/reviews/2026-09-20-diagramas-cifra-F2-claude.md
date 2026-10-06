I reviewed the actual source in the worktree, not just the diff, and verified the dictionary data entry-by-entry against the guitar/ukulele tunings.

---
verdict: needs_changes
counts: {blocker: 0, critical: 2, major: 5, minor: 5, nit: 0}
reviewer: local-or-claude
pass: blind
schema_version: "1.0"
---

## CRITICAL

### C1. Dictionary returns the wrong chord for many extension qualities, as a confident `source: 'dictionary'` hit
**File:** `src/core/chord-dict.ts:49-56`, `src/core/chord-dict.ts:65,69`

**WHAT.** Numerous entries are literally byte-identical to a simpler quality's row, i.e. the characteristic extension is absent. Verified by decoding frets against EADGBE / GCEA:

| Entry | Packed | Decoded notes | Actually is |
|---|---|---|---|
| `GUITAR['9'][7]` (G9) | `320001` | G B D G B F | G7 — identical to `GUITAR['7'][7]`, no A |
| `GUITAR['9'][11]` (B9) | `x21202` | B D# A B F# | B7 — identical to `GUITAR['7'][11]`, no C# |
| `GUITAR.add9[5]` (Fadd9) | `133211` | F C F A C F | plain F — identical to `GUITAR.major[5]` |
| `GUITAR.add9[2]` (Dadd9) | `xx0232` | D A D F# | plain D — identical to `GUITAR.major[2]` |
| `GUITAR.maj9[9]` (Amaj9) | `x02100` | A E G# C# E | Amaj7, no B |
| `GUITAR.m9[9]` (Am9) | `x02010` | A E G C E | Am7 — identical to `GUITAR.m7[9]` |
| `GUITAR['6add9'][9]` | `x02222` | A E A C# F# | A6 — identical to `GUITAR['6'][9]` |
| `UKULELE['5'][9]` (A5) | `2000` | A C E A | **A minor** — identical to `UKULELE.m[9]` |
| `UKULELE['5'][5]` (F5) | `2013` | A C F C | F **major** (has the 3rd; a power chord must not) |
| `UKULELE.sus2[5]` (Fsus2) | `0010` | G C F A | has A natural — a 3rd, so not sus2 |

`GUITAR.m9` alone duplicates `GUITAR.m7` at indices 2, 3, 9, 10, 11 — 5 of 12 roots.

**WHY.** The tables are hand-authored with no invariant tying the fret data to `QUALITY_INTERVALS`, and nothing validates that a voicing's pitch-class set matches its declared quality.

**IMPACT.** A player asking for G9 is shown G7; asking for A5 on ukulele is shown Am. Because `resolveDiagram` returns `class: 'hit'` with `source: 'dictionary'`, the UI has no way to distinguish a correct voicing from a wrong one — a silent wrong answer is strictly worse than `no-shape`. The file header claim "one lowest-open voicing per name" is not true of the data. Tests cover ~5 of the 408 entries (12 roots × 17 qualities × 2 instruments), so coverage gives false confidence.

**RECOMMENDATION.** Add a property test that, for every `(instrument, quality, root)`, decodes the packed frets against the open-string pitch classes (`[4,9,2,7,11,4]` / `[7,0,4,9]`), reduces to a pitch-class set, and asserts it equals `new Set(QUALITY_INTERVALS[quality].map(i => (root + i) % 12))` — allowing omitted 5th/root for the 5+-note qualities but **requiring** the characteristic extension (9/11/13/b7/maj7) and forbidding a 3rd in `5` and `sus*`. Then fix every entry the test flags, or delete the offending quality rows so they return `no-shape` rather than a wrong chord.

### C2. `fretSvg` sizes the board by `relativeFret` but positions dots by absolute `fret` — every capo'd diagram draws dots off the fretboard
**File:** `src/core/diagram-draw.ts:147` and `src/core/diagram-draw.ts:192`

**WHAT.** `maxRel = Math.max(4, ...dots.map((d) => d.relativeFret), capoFret)` bounds the grid, but each dot is drawn at `yOf(dot.fret) - fretH / 2` where `dot.fret = capoFret + (base - 1) + relativeFret` (`:97`). The two use different coordinate spaces whenever `capoFret > 0` or `base > 1`.

**WHY.** `maxRel` was derived from the shape-relative value while the render switched to absolute-from-nut.

**IMPACT.** This fires in the project's own shipped test case. Ukulele C at capo 2 (`tests/core/diagram-draw.test.ts:77-95`): `maxRel = max(4, 3, 2) = 4`, grid bottom `yOf(4) = 100`, but the dot lands at `yOf(5) - 9 = 109` with `r=6` — below the last fret line, overlapping the "Capo 2" label at `y = 122`. Worse for the common capo + barre case: Bm shape (`x24432`) at capo 2 gives dots at absolute frets 5 and 6 on a 4-fret board. The `svg` field is a shipped output, and the tests only assert model fields plus `toContain('Capo 2')`, so nothing catches it. The finger assertions at `:127-131` (`/>1</`, `/>2</`) are equally loose — they match any single-digit text node anywhere in the SVG.

**RECOMMENDATION.** Use one space. Either `const maxFret = Math.max(4, ...dots.map(d => d.fret), capoFret)` and keep absolute positioning, or position dots at `yOf(dot.relativeFret + capoFret)`. Add a test asserting every dot's `cy` falls strictly between `yOf(0)` and `yOf(maxFret)` for capo 0/2/5 and for a barre shape.

## MAJOR

### M1. Slash-chord bass is silently dropped by the dictionary, and override matching disagrees with it
**File:** `src/core/resolve-diagram.ts:50,121`, `src/core/chord-dict.ts:93`

**WHAT.** `canonicalOf` computes `bassPc` and `sameCanonical` (`:54`) requires it to match for overrides, but `lookupDict(instrument, want.rootPc, want.quality)` takes no bass argument at all.

**WHY.** Bass was modelled in the canonical form but never threaded into the lookup.

**IMPACT.** `G/B` returns `320003` (plain G, G in the bass) as a `class: 'hit'` — the inversion the user asked for is silently not drawn. Worse, the two paths disagree: a file `{define-guitar: G ...}` will *not* match token `G/B` (bass mismatch), yet the request then falls through to the bass-blind dictionary and gets a plain G anyway. So the override is skipped precisely where it would have been the better answer.

**RECOMMENDATION.** Decide the contract explicitly: either return `{class:'miss', reason:'no-shape'}` when `want.bassPc != null` and no bass-aware entry exists, or add a slash table. Add tests for `G/B`, `C/E`, `D/F#` on guitar and piano.

### M2. Piano `keys` have two incompatible meanings; overrides get double-rooted
**File:** `src/core/diagram-draw.ts:211-215`, `src/core/chord-dict.ts:87-91`

**WHAT.** `pianoKeysOf` returns **intervals from the tonic** (`QUALITY_INTERVALS`), and `drawPiano` adds the token root: `lit = rel.map(k => (root + k) % 12)`. But `ChordDefine.keys` from `{define: ... keys ...}` are **absolute** values — `transposeDefine`'s `shiftKey` (`src/core/define.ts:175-178`) shifts them by `n` alongside the chord name, which only makes sense for absolute pitch classes. `fromDefine` (`src/core/resolve-diagram.ts:68`) copies them into the same `voicing.keys` field.

**WHY.** One field, two semantics, no discriminator.

**IMPACT.** `{define: Am keys 9 0 4}` (A C E) drawn for token `Am` yields `lit = [(9+9)%12, (9+0)%12, (9+4)%12] = [6, 9, 1]` → F#, A, C#. A user-supplied piano override renders a chord that shares one note with what they wrote. No test exercises a piano override through `drawDiagram` — `resolve-diagram.test.ts:99-110` only checks that a *guitar* override doesn't leak to piano.

**RECOMMENDATION.** Normalize at the resolve boundary: have `fromDefine` convert absolute define keys to intervals (`(k - rootPc + 12) % 12`), or tag the voicing (`keysAreAbsolute: true`) and branch in `drawPiano`. Add a test: piano override → `drawDiagram` → `litNotes`.

### M3. `pianoRootPc` silently defaults to C on a missing or unparseable token
**File:** `src/core/diagram-draw.ts:204-209`

**WHAT.** Both the `!token` and the `parsed.class !== 'parse'` paths `return 0`, and `keyIndex(...) ?? 0` swallows a third failure.

**WHY.** A total function was chosen over signalling failure, and `token` is optional in `DrawDiagramOpts` (`:54`).

**IMPACT.** `drawDiagram({ instrument: 'piano', voicing })` with `token` omitted — which the type permits — lights a C-rooted chord with full confidence. `DiagramDraw` has no miss variant, so the caller cannot tell a real C chord from a fallback. Given `resolveDiagram` already requires a parseable token to produce the voicing, the fallback only ever fires on caller error, where it hides the bug.

**RECOMMENDATION.** Make `token` required for `instrument: 'piano'` (discriminate `DrawDiagramOpts`), or return a miss/`lit: []` variant instead of defaulting to pitch class 0.

### M4. `baseFret > 1` voicings render with no position label and off the grid
**File:** `src/core/diagram-draw.ts:78,97`, `src/core/diagram-draw.ts:155-157`

**WHAT.** `fret = capoFret + (base - 1) + relativeFret` shifts dots down by `base - 1`, but nothing communicates the board's starting fret: the nut rect is drawn unconditionally at `yOf(0)` (`:156`), and `FretDraw` exposes no `baseFret`/position field at all.

**WHY.** `baseFret` was consumed for arithmetic but never surfaced in the draw model or the SVG.

**IMPACT.** `{define-guitar: Bb base-fret 6 frets 1 3 3 2 1 1}` — a perfectly ordinary override that `parseDefineDirective` accepts — draws a **nut** with dots at frets 6-8 on a 4-fret grid (compounding C2). The diagram reads as an open position chord, which is a different and unplayable shape. There is no test with `baseFret > 1` anywhere in `tests/core/diagram-draw.test.ts`.

**RECOMMENDATION.** Add `baseFret`/`firstFret` to `FretDraw`, suppress the nut and emit a `Nfr` position label when it exceeds 1, and offset the grid so dots are relative to the displayed window. Test with `base-fret 5` and `base-fret 6` + capo.

### M5. Override precedence is first-wins, but defines are collected in file order — a later redefinition is ignored
**File:** `src/core/resolve-diagram.ts:108-119`, collection at `src/core/parse.ts:151-154`

**WHAT.** `for (const def of overrides) { ... return { source: 'override', ... } }` returns on the first match. `parse.ts:153` does `defines.push(def)` walking the file top-down, so `overrides[0]` is the *earliest* define.

**WHY.** No precedence rule was stated, and the natural loop direction happens to pick the first.

**IMPACT.** A file with two `{define-guitar: Am ...}` lines uses the first. That contradicts the normal ChordPro expectation (and the intuition of anyone editing a file: the correction you add later is the one that should win), and it makes the behaviour of the D4 editor sheet — which will append defines — the opposite of what an author expects. Untested in either direction.

**RECOMMENDATION.** Iterate `overrides` in reverse (or document first-wins explicitly and add a test pinning it). Either way the choice needs a test with two competing defines for the same name.

## MINOR

### m1. Open-string circles at the capo are drawn underneath the opaque capo bar
**File:** `src/core/diagram-draw.ts:184` vs `:171`

**WHAT.** The open marker uses `cy = yOf(capoFret)`, `r = 4`, `fill="none"`. The capo bar is `y = yOf(capoFret) - 4`, `height = 8`, `fill="currentColor"` — an opaque 8px band centred on the same line, fully covering the 8px-tall circle. **IMPACT.** "Opens at the capo" is stated as a shipped F2 behaviour, but is not observable in the SVG; only the model field `opens` reflects it. **RECOMMENDATION.** Offset the circle to `yOf(capoFret) + 8` (just below the bar) or render it in the bar's background colour. (Model-level correctness of `opens`/`nutOpens` is fine.)

### m2. `drawFrets` treats a short/oversized `frets` array as mutes instead of rejecting it
**File:** `src/core/diagram-draw.ts:85-90`

**WHAT.** `if (slot === 'x' || slot === undefined) { mutes.push(s) }` — a 3-element array for guitar yields 3 phantom muted strings; elements past index 5 are dropped. `lookupDict` validates length (`chord-dict.ts:109-110`) but `fromDefine`/`drawFrets` do not. **IMPACT.** `parseDefineDirective` currently enforces 6/4 so file-sourced defines are safe, but `ResolveDiagramOpts.overrides` is a public `ChordDefine[]` any caller can construct, and the asymmetry means malformed input degrades to a plausible-looking wrong diagram rather than a miss. **RECOMMENDATION.** Validate `def.frets.length === (instrument === 'guitar' ? 6 : 4)` in the override branch of `resolveDiagram` and skip to the dictionary on mismatch.

### m3. Miss reasons conflate three distinct failures; `resolveDiagram` parses the token twice
**File:** `src/core/resolve-diagram.ts:98-105`

**WHAT.** `unknown-token` is returned for an empty token, an invalid `instrument`, an `UNPARSED` token, and an `AMBIGUOUS` one (`C7+`) alike. Separately, `const parsed = parseChordToken(token)` at `:102` is never used — `canonicalOf(token)` at `:104` re-parses. **IMPACT.** The UI cannot tell "I don't recognise this chord" from "this name is ambiguous, disambiguate it" from "bad instrument argument", which is exactly the distinction `parse-chord.ts` went to the trouble of modelling with its `AMBIGUOUS` class. The dead parse is wasted work on a per-chord path. **RECOMMENDATION.** Add an `'ambiguous'` reason (and `'bad-instrument'` or a thrown error), and drop `:102-103` by deriving the class from `canonicalOf`.

### m4. `concert` / `shapeName` are computed unconditionally, including where they are discarded
**File:** `src/core/layout.ts:502-505`

**WHAT.** Two extra `transposeToken` calls per seg per layout, in every mode. Under `lens: 'letra'` the fields are thrown away by `stripChords` (`layout.ts:404-410`, which builds segs without them); under `editing` nothing draws diagrams. **IMPACT.** `layoutChartFull` is called from `ChordproViewer.vue:792` as a computed on every keystroke, and `resolveDiagram`/`drawDiagram` currently have **zero callers in `src/`** — so this is pure overhead on the hot path until F3 lands. **RECOMMENDATION.** Skip when `lyricsOnly`, or gate behind an opt flag the viewer sets only when the diagram feature is active.

### m5. `capoFret` is neither integer-clamped nor upper-bounded
**File:** `src/core/diagram-draw.ts:256`

**WHAT.** `Math.max(0, opts.capoFret ?? 0)` admits `2.5` (→ label `"Capo 2.5"`, fret line at a fractional `y`) and arbitrarily large values (`#capo:20` → `maxRel = 20` → a ~400px-tall board). `layout.ts:446` likewise only does `Math.max(0, ...)`. **IMPACT.** Malformed `#capo:` input produces a nonsensical diagram rather than being rejected. **RECOMMENDATION.** `Math.max(0, Math.min(12, Math.trunc(opts.capoFret ?? 0)))`, and reject non-finite values.

## Note on what is *not* covered
`tests/core/layout-capo.test.ts:131-231` are the strongest tests in this change — they correctly pin that `capoFret` tracks `playableCapoOf` (not `shapeCapo`) across dual on/off, Nashville, editing, and `#capo:n`. But there is no test anywhere that feeds a layout `shapeName` into `resolveDiagram` into `drawDiagram`, which is the only path that matters. Such a test on the `JESUS_1` fixture (which produces `shape: 'A#'`) would have surfaced C2 immediately.
