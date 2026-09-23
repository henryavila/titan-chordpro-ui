# Adversarial review — F2 diagram core

**Note on method:** no shell/test execution was available in this session, so every finding below is static analysis. Dictionary claims are hand-computed from the packed strings using the tunings the code itself declares (guitar `E A D G B E` = `4 9 2 7 11 4`, ukulele `G C E A` = `7 0 4 9`), the same arithmetic `tests/core/resolve-diagram.test.ts:238` uses. Each is shown so it can be checked without running anything.

---

## C1 — CRITICAL — Dictionary ships voicings that are the wrong chord

**WHAT** Many entries in `src/core/chord-dict.ts` are either verbatim copies of a row from a *different* quality table, or contain tones foreign to the quality. Verified samples:

| Entry | line | packed | decoded pcs | expected |
|---|---|---|---|---|
| `UKULELE.maj7` A / A♯ / B | `chord-dict.ts:63` | `2100` `3211` `4322` — identical to `UKULELE.major[9..11]` (`:60`) | Amaj7 → `{9,1,4}` = A C♯ E | needs G♯(8); it is a plain major triad |
| `UKULELE.m7` A / A♯ / B | `:64` | `2000` `3111` `4222` — identical to `UKULELE.m[9..11]` (`:61`) | Am7 → `{9,0,4}` = A C E | needs G(7); plain minor triad |
| `UKULELE.sus4` A / A♯ / B | `:66` | `2201` `3312` `4423` | Asus4 → `{9,2,4,10}` = A D E **A♯** | A D E; A♯ is a ♭2 clash |
| `UKULELE.m6` A / A♯ / B | `:74` | `2010` `3121` `4232` | Am6 → `{9,0,5}` = A C **F** | A C E F♯ — this is an F major triad |
| `UKULELE['6']` F / F♯ | `:70` | `2013` `3124` | F6 → `{9,0,5}` = A C F | missing the 6th (D) entirely |
| `UKULELE['6']` A / A♯ / B | `:70` | `2101` `3212` `4323` | A6 → `{9,1,4,10}` = A C♯ E **A♯** | 6th should be F♯; A♯ is a ♭2 |
| `UKULELE['5']` D♯ / E / G♯ | `:69` | `3301` `4412` `1340` | E5 → `{11,4,5}` = B E **F** | power chord with a minor 2nd in it |
| `UKULELE['6add9']` C | `:71` | `0202` | `{7,2,4,11}` = G D E B | C6/9 = C E G A D — no root, no 6th, and a major 7th |
| `UKULELE.maj9` A♯ / B | `:73` | `3213` `4324` | A♯maj9 → `{10,2,5,0}` | missing the maj7 (A) — the defining tone |
| `GUITAR.maj9` C / C♯ | `:54` | `x32030` `x43141` — identical to `GUITAR.add9[0..1]` (`:49`) | Cmaj9 → `{0,4,7,2}` | missing B(11); this is Cadd9 |
| `GUITAR['6add9']` D/D♯/A/A♯/B | `:52` | `xx0202` `xx1313` `x02222` `x13333` `x24444` — identical to `GUITAR['6'][2,3,9,10,11]` (`:51`) | A6/9 → `{9,4,1,6}` | missing the 9th (B) |
| `GUITAR['9']` D / D♯ | `:53` | `xx0210` `xx1321` | D9 → `{2,9,0,4}` = D A C E | no third (F♯) — not a dominant chord |

**WHY** The rows were evidently produced by copying a neighbouring table and shifting, and the copies at indices 9–11 (A, A♯, B) were never re-derived. Nothing in the build or test path recomputes the pitch content (see M1).

**IMPACT** This is the payload of the whole feature. A player asking for Amaj7 on ukulele is shown a plain A; asking for Am6 is shown an F chord; Asus4 and A6 contain a semitone clash against the root. The chart is silently, confidently wrong — worse than showing nothing, which is what `reason: 'no-shape'` exists for.

**RECOMMENDATION** Do not hand-maintain packed strings. Generate the tables from `QUALITY_INTERVALS` (`chord-dict.ts:19-37`) plus the tuning with a voicing search, or import a vetted dataset, and keep the generator in-repo. At minimum, regenerate every index 9–11 row and diff each table against every other table to find the remaining copy-paste rows — the ones above were found by spot-checking, not by exhaustive audit, so assume more exist.

---

## M1 — MAJOR — The "quality invariant" test cannot detect any of C1

**WHAT** `tests/core/resolve-diagram.test.ts:249-274` asserts exactly two things: the 9th is present for `NEED_NINTH = {'9','add9','maj9','m9'}` (`:235`), and no 3rd is present for `FORBID_THIRD = {'5','sus2','sus4','7sus4'}` (`:236`). It never checks the root, the 3rd, the 6th, the 7th, or the absence of foreign tones.

**WHY / IMPACT** Every defect in C1 passes this test:
- `UKULELE.maj7` A = A C♯ E — `maj7` is in neither set, no assertion fires.
- `UKULELE.sus4` A = `{9,2,4,10}` — `FORBID_THIRD` checks only `rootPc+3` (0) and `rootPc+4` (1); the offending A♯ is `rootPc+1`, so it passes.
- `GUITAR['6add9']` A missing its 9th — `'6add9'` is absent from `NEED_NINTH`, though `parse-chord.ts:31` maps `6(9)` straight to it.
- `GUITAR.maj9` C missing its maj7 — `maj9` is in `NEED_NINTH`, but only the 9th is checked and the 9th is present.

Two further gaps: `ROOTS` (`:216`) is sharp-spelled only, so flat roots are never exercised even though `keyIndex` accepts them; and `SUFFIXES` (`:217`) omits the aliases `M`, `M7`, `maj7`, `sus`, `m(3b)`, `º`, `°` that `parse-chord.ts:22-51` accepts.

**RECOMMENDATION** Make the invariant total: for every `(root, quality)` hit, assert `decodedPcs ⊆ expectedPcs` (no foreign tones) **and** that the characteristic tones — root, 3rd (or the sus/5 substitute), 6th, 7th, 9th per `QUALITY_INTERVALS` — are each present, allowing an explicit, per-quality allow-list of omissions (5th on 7/9 shapes, root on rootless uke voicings) rather than a two-rule spot check. Add flat-spelled roots and the alias suffixes to the sweep.

---

## M2 — MAJOR — The open-string marker is drawn inside the capo bar, so it is invisible

**WHAT** With a capo on, the capo bar is a filled rect at `y = yOf(capoFret)`, spanning `y-4 … y+4`, `fill="currentColor"` (`src/core/diagram-draw.ts:171`). The open-string circle for the same capo is drawn at centre `(x, yOf(capoFret))`, `r=4`, `fill="none" stroke="currentColor"` (`diagram-draw.ts:184-187`). The circle lies entirely inside the rect and is stroked in the same colour.

**WHY** Both markers were positioned on the capo line independently; nothing offsets one from the other.

**IMPACT** "Open strings sound at the capo, not the nut" is the headline behaviour of this change, and it is unrepresentable in the produced SVG — the reader sees a plain bar and cannot tell an open string from a muted or unplayed one. The tests only inspect the `opens` / `nutOpens` arrays (`tests/core/diagram-draw.test.ts:80-99`), never the rendered markers, so this is untested in both directions.

**RECOMMENDATION** Place the open marker above the capo bar (e.g. `yOf(capoFret) - 10`, mirroring the nut case's `padY - 12`), or draw it on the bar in the background colour. Add an assertion that no `diagram-open` circle centre falls within the `diagram-capo-bar` rect's y-extent.

---

## M3 — MAJOR — No fret window: the model can only ever draw from the nut

**WHAT** `fretSvg` computes `maxFret = Math.max(4, capoFret, ...dots.map(d => d.fret))` and draws every fret `1..maxFret` from a nut fixed at `yOf(0)` (`diagram-draw.ts:147,163-167`). `FretDraw` (`diagram-draw.ts:22-38`) exposes no `firstFret` / window field, and `FretDot.relativeFret` is the raw slot, which discards `baseFret` (`diagram-draw.ts:96,100`).

**WHY** The coordinate space was unified on "absolute fret from the nut" without adding the complementary window.

**IMPACT** A capo-5 song with a shape reaching `x63676` (`GUITAR.m9[3]`, `chord-dict.ts:56`) yields `maxFret = 12` → a 12-rung ladder 272px tall for a 4-fret hand shape, with the hand crammed at the bottom. A `base-fret 5` override renders the same way but labels its dots `relativeFret 1..4`, which contradicts where they are drawn. Because the window is absent from the *type*, F3 cannot correct this without a core model change — it is not a "look" problem deferrable to F3.

**RECOMMENDATION** Add `firstFret` (and a "5fr"-style label) to `FretDraw`, window the SVG to `firstFret … firstFret+4/5`, and either drop `relativeFret` or document it as shape-local and unrelated to the drawn position.

---

## M4 — MAJOR — Slash chords are a blanket miss on piano, where no shape is needed

**WHAT** `resolve-diagram.ts:121` bails with `no-shape` for any token carrying a bass, for all three instruments, before the dictionary is consulted.

**WHY** The bass guard was written once for fretted instruments, where a slash voicing genuinely requires a dedicated fingering, and applied to piano too.

**IMPACT** Piano diagrams need no fingering at all — they are a pitch-class set, and the bass is one more pitch class the code already has (`want.bassPc`, computed at `resolve-diagram.ts:44`). As written, `G/B`, `D/F#`, `Am/G` — pervasive in the Brazilian charts this parser is built for (`parse-chord.ts:2-3` even resolves degree basses like `D9/4`) — show nothing on piano, despite the triad being fully known.

**RECOMMENDATION** Move the bass guard below the piano branch: for piano, return the dictionary keys plus the bass pitch class (and expose the bass on `PianoDraw` so it can be marked). Keep the guard for guitar/ukulele.

---

## M5 — MAJOR — The new `ChartSeg` fields are dropped before anything can render them

**WHAT** `layout.ts:502-514` fills `concert` / `shapeName` / `capoFret` on every playable seg. The only path from `ChartSeg` to a rendered chord is `readingWords` → `ReadingCell` (`src/core/reading-words.ts:4-30`), whose `cell()` copies `text`, `chord`, `shape`, `hasShape`, `hasChord` — and nothing else. `ReadingCell` is what `ChartBody.vue:440-445` and `render-pdf.ts:160-167` consume.

**WHY** The layout side of the contract was added; the core-side carrier type it flows through was not.

**IMPACT** The fields are inert. Nothing downstream can key a diagram off a rendered chord, so F2's layout work is not actually reachable by F3 without editing `reading-words.ts` — i.e. the F2/F3 seam is in the wrong place. This is core code, not the Vue/modal work explicitly scoped out.

**RECOMMENDATION** Carry `concert`, `shapeName`, `capoFret` through `ReadingCell` in this change, and add a test that a cell built from a capo-2 seg exposes `shapeName`.

---

## m1 — MINOR — `DiagramVoicing.keys` means two different things depending on `source`

**WHAT** The dictionary path returns `QUALITY_INTERVALS` verbatim, including values ≥ 12: `maj9` = `[0,4,7,11,14]`, `m11` = `[0,3,7,10,14,17]` (`chord-dict.ts:29,33`, copied through `fromDict`, `resolve-diagram.ts:79`). The override path returns values normalised to 0–11 by `pianoKeysToRelative` (`chord-dict.ts:95`, used at `resolve-diagram.ts:68`).

**WHY/IMPACT** Same public field, two ranges, no documentation on `DiagramVoicing.keys` (`resolve-diagram.ts:12-17`). `drawPiano` happens to `% 12` (`diagram-draw.ts:214`), so it survives, but any other consumer doing `NOTE[k]` gets `undefined` for `14`/`17`. The only test asserting `keys` uses `maj7` (`resolve-diagram.test.ts:31`), which has no value over 11, so the divergence is untested.

**RECOMMENDATION** Normalise in `fromDict` too, or document `keys` as "intervals from the tonic, may exceed 11" and make the override path agree. Add a `maj9`/`m11` assertion.

---

## m2 — MINOR — `pianoKeysToRelative` silently guesses, and never reports the guess

**WHAT** `chord-dict.ts:94-108` decides whether a user's `{define … keys}` is absolute or relative by scoring set overlap, with ties resolving to relative (`if (absScore > relScore)`, `:106`).

**WHY/IMPACT** A partly-spelled absolute define can score relative and be reinterpreted: `{define: Am keys 0 7}` (the user's C and G) scores abs 1 / rel 2 and is rendered as A and E — different notes than written, with no diagnostic and no way for the author to force an interpretation. `DiagramHit` carries `source: 'override'` but nothing recording which reading was chosen.

**RECOMMENDATION** Prefer the explicit signal instead of a score — treat keys as absolute whenever any value falls outside the chord's own interval set, or add an opt-in marker — and surface the chosen interpretation on the hit so a UI can warn.

---

## m3 — MINOR — Caller-supplied defines are trusted for string count; short arrays become silent mutes

**WHAT** `lookupDict` validates `frets.length` against the instrument (`chord-dict.ts:126-127`), but the override path does not: `resolve-diagram.ts:108-119` accepts any `ChordDefine[]` the caller passes, and `fromDefine` copies `frets`/`fingers` unchecked (`resolve-diagram.ts:61-70`). `drawFrets` then treats `slot === undefined` exactly like `'x'` (`diagram-draw.ts:87-89`).

**WHY/IMPACT** `parseDefineDirective` does enforce 6/4 (`define.ts:132-141`), so the file path is safe — but `resolveDiagram`'s signature invites hand-built defines (the D4 editor sheet will produce them). A 4-slot guitar define renders as a valid-looking 6-string diagram with the two lowest strings silently muted, rather than a miss.

**RECOMMENDATION** Apply the same length check to overrides that `lookupDict` applies to the dictionary, and `continue` to the next override / dictionary on mismatch.

---

## m4 — MINOR — Duplicate `{define}` for one chord resolves first-wins

**WHAT** The override loop returns on the first match (`resolve-diagram.ts:112`).

**WHY/IMPACT** ChordPro convention is that a later definition supersedes an earlier one; a user who appends a corrected `{define-guitar: F …}` at the bottom of the file keeps getting the old one. Untested either way.

**RECOMMENDATION** Iterate in reverse, or document first-wins explicitly and test it.

---

## m5 — MINOR — `drawDiagram` renders a mismatched instrument/voicing as an all-muted chord

**WHAT** `drawDiagram` (`diagram-draw.ts:249-253`) dispatches on `opts.instrument` alone. Given `instrument: 'guitar'` with a keys-only voicing, `frets` is `[]` (`diagram-draw.ts:76`) and all six strings land in `mutes`.

**WHY/IMPACT** A public entry point returns a plausible-looking "xxxxxx" diagram instead of failing. Given that pairing is caller-managed (F3 will do it), the mistake is easy to make and impossible to spot from the output.

**RECOMMENDATION** Return a miss/throw when the voicing lacks the data the instrument needs, or type `DrawDiagramOpts` as a discriminated union so the pairing is enforced at compile time.

---

## m6 — MINOR — An invalid instrument is reported as `unknown-token`

**WHAT** `resolve-diagram.ts:98-100` returns `reason: 'unknown-token'` when `isInstrument` fails.

**WHY/IMPACT** Conflates "this chord name isn't understood" with "this instrument isn't supported". A UI acting on the reason will tell the user their chord is wrong when their instrument setting is. (Secondary: `parseChordToken` is run twice for every call — once at `:102`, again inside `canonicalOf` at `:104` — and the `parsed` binding at `:102` is otherwise unused.)

**RECOMMENDATION** Add a distinct reason, and drop the redundant parse by having `canonicalOf` return the parse result.

---

```
---
verdict: needs_changes
counts: {blocker: 0, critical: 1, major: 5, minor: 6, nit: 0}
reviewer: local
pass: blind
schema_version: "1.0"
---
```
