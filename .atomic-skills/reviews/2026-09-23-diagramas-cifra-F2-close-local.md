---
verdict: needs_changes
counts: {blocker: 0, critical: 1, major: 1, minor: 2, nit: 0}
reviewer: local
pass: blind
schema_version: "1.0"
---

# F2 close local review — D2 resolveDiagram + draw (HEAD, post-fix1)

**Ref:** `90d7c4613290604e4ffa6ad16c6d4b5dc2e8aa37..HEAD`  
**Mode:** local  
**Files:** `src/core/chord-dict.ts`, `src/core/diagram-draw.ts`, `src/core/index.ts`, `src/core/layout.ts`, `src/core/resolve-diagram.ts`, `src/core/types.ts`, `tests/core/diagram-draw.test.ts`, `tests/core/layout-capo.test.ts`, `tests/core/resolve-diagram.test.ts`

Judged the current tree, not the pre-fix1 diff. Layout still fills `concert` / `shapeName` / `capoFret` from the playable capo (dual off, edit, Nashville, `#capo:2` and `#capo:2!`). `resolveDiagram` still prefers a same-instrument `{define}`, then the dictionary, and a slash with no matching override is `no-shape` (`src/core/resolve-diagram.ts:121`). The fret SVG uses one absolute axis: `maxFret` is `Math.max(4, capoFret, ...dots.map(d => d.fret))` and dots sit at `yOf(dot.fret) - fretH/2` (`src/core/diagram-draw.ts:147`, `src/core/diagram-draw.ts:190-192`). Piano sets `capoFret: 0` and leaves `lit` empty when `token` is missing (`src/core/diagram-draw.ts:204-226`). Guitar open triads and dominant/minor sevenths that were re-checked (C, G, Am, F, Bm, C7, Am7) decode to the right pitch classes. Those are not reopened.

What did not close: packed rows that are a different chord still return `class: 'hit'`, `source: 'dictionary'`. The new invariant only demands a ninth on `9` / `add9` / `maj9` / `m9` and forbids a third on `5` / `sus*`, so it stays green.

**Callers of new exports (≤5):** `src/core/index.ts` re-exports `resolveDiagram` / `drawDiagram`; `tests/core/resolve-diagram.test.ts`; `tests/core/diagram-draw.test.ts`; `lookupDict` / `pianoKeysToRelative` only from `src/core/resolve-diagram.ts`. No Vue or other production caller.

## Findings

### 1. CRITICAL — Dictionary hits are still a different chord for 61 packed rows

**WHAT** Every guitar and ukulele row was decoded against EADGBE `[4,9,2,7,11,4]` and GCEA `[7,0,4,9]`. A row counts as wrong when a defining tone is absent or a foreign tone changes the chord (minor vs major third, b7 vs major 7, sixth, ninth on `6add9`, b5 on dim). Shells that keep the characteristic seventh and ninth but drop the third are not in this count (guitar D9 `xx0210` = D A C E; guitar D7M(9) `xx0220` = D A C# E).

Guitar, 9 rows (`src/core/chord-dict.ts:52`, `src/core/chord-dict.ts:54-55`):

| Token | Pack | Sounds like | Same bytes as |
|---|---|---|---|
| `C7M(9)` / `C#7M(9)` | `x32030` / `x43141` | C E G D / C# F G# D# — add9, no major 7 | `GUITAR.add9[0..1]` |
| `D6(9)` `Eb6(9)` `A6(9)` `Bb6(9)` `B6(9)` | `xx0202` `xx1313` `x02222` `x13333` `x24444` | the plain 6 chord, no ninth | `GUITAR['6']` at those roots |
| `Cm6` / `C#m6` | `x35535` / `x46646` | C G D A — no Eb | — |

`C7M(9)` is in the hymn corpus (16 occurrences, including `fixtures/sda/013-ele-vive-em-mim.cho`). The diagram is Cadd9.

Ukulele, 52 rows. Basic major / minor / dominant 7 / sus shapes were clean. Extensions are not (`src/core/chord-dict.ts:63-64`, `src/core/chord-dict.ts:69-76`):

| Token | Pack | Actually is |
|---|---|---|
| `Am7` `Bbm7` `Bm7` | `2000` `3111` `4222` | the minor triad — identical to `UKULELE.m` at pc 9–11. `Am7` is the corpus's most common m7 (190 hits) |
| `A7M` `Bb7M` `B7M` | `2100` `3211` `4322` | the major triad — identical to `UKULELE.major` |
| `Gdim` / `Abdim` | `0232` / `1343` | G major / Ab major — identical to `UKULELE.major` |
| `F6` / `F#6` | `2013` / `3124` | F / F# major, no sixth |
| `A6` `Bb6` `B6` | `2101` `3212` `4323` | major triad plus a b9 (A6 = A C# E Bb), not a sixth |
| `D#5` | `3301` | D# power chord plus open E (b2). Same pattern on E5 and Ab5 |
| all 12 `6(9)` | e.g. C `0202` | C6(9) is G D E B: a rootless maj9 (B is the major 7, the sixth A is absent). A/Bb/B `6(9)` equal `add9` and `maj9` and have no sixth and no major 7 |

Also wrong, same file: ukulele `maj9` at A/Bb/B (no major 7); `m6` at E/F (identical to minor), F# (both thirds and a b7), A/Bb/B (no sixth, has the b6); `m9` at A/Bb/B (no b7) and C/C# (no minor third); the other dim rows (D/Eb/E have neither m3 nor b5; F/F# have a major third and a perfect fifth and no b5; A/Bb/B have a b5 and a sixth and no minor third; C/C# dim keep the b5 but also the perfect fifth). `resolveDiagram` returns these as hits (`src/core/resolve-diagram.ts:123-130`).

**WHY** `tests/core/resolve-diagram.test.ts:235-269` only flags a missing ninth when `parsed.quality` is `9`, `add9`, `maj9`, or `m9`, and a third on `5` / `sus2` / `sus4` / `7sus4`. `6add9` is not in `NEED_NINTH`, so A6(9) = A6 passes. `C7M(9)` has the ninth (D) and is never asked for B. `Am7`, `Gdim`, and `A6` are not checked for b7, b5, or the sixth. A non-hit is skipped, so a deleted row would also pass.

**IMPACT** The player asks for a name and gets another chord with `source: 'dictionary'`. There is no miss to fall back on. Guitar `C7M(9)` drops the note that distinguishes 7M(9) from C9 (add9). Ukulele `Am7` / `Bm7` / `A7M` / `Gdim` draw the plain triad or the major chord. `A6` adds a b9 that is not in the chord.

**RECOMMENDATION** Extend the invariant so every hit's pitch-class set contains the defining intervals and excludes the foreign ones: minor vs major third, b7 vs major 7, the sixth on `6` / `m6` / `6add9`, the ninth on `6add9`, b5 on `dim` (no perfect fifth, no major third). Allow an omitted fifth, and an omitted root only when every defining tone is present. Do not treat a missing third on a dominant 9 or maj9 shell as this failure. Fix each flagged pack, or delete the row so `lookupDict` returns null and `resolveDiagram` returns `no-shape`. Add the rows above as explicit cases: `C7M(9)` guitar must include B; `A6(9)` guitar must include B and not equal `A6`; ukulele `Am7` must include G; ukulele `Gdim` must not equal `G`.

### 2. MAJOR — Equal piano-key scores keep the relative reading and swap the characteristic tone

**WHAT** `pianoKeysToRelative` scores the define's pitch classes as absolute notes and again as intervals from the root, then converts only when `absScore > relScore` (`src/core/chord-dict.ts:94-108`). On a tie it returns the numbers unchanged, and `drawPiano` adds the root again (`src/core/diagram-draw.ts:211-214`).

Full textbook sets (every quality, every root, including MIDI `60 + pc`) convert correctly, and a true relative input such as Am `[0, 3, 7]` stays relative. A tie does not. `{define: G7sus4 keys 7 0 5}` is G, C, F — root, fourth, b7, the fifth omitted. Both readings score 3. The function keeps `[7, 0, 5]`. Drawn against token `G7sus4`, `litNotes` is `D G C`. F (the b7) is gone and D (the fifth) appears: G7sus4 becomes Gsus4. `{define: Gsus4 keys 7 0}` (G and C, fifth omitted) lights `D G` — G5, the fourth replaced by the fifth. The same tie fires for 14 single-omission subsets across `5`, `6add9`, `m11`, `sus2`, `sus4`, `7sus4`, and `dim` (F/G roots mostly). The shipped test only locks Am `[9, 0, 4]`, which is a strict absolute win (`tests/core/resolve-diagram.test.ts:186-202`).

**WHY** The two readings explain different members of the expected set and the comparison uses a strict greater-than. When the counts match, the code assumes the file already stored intervals. For these voicings the file stored sounding pitch classes, which is the convention the Am test itself uses.

**IMPACT** A piano override that spells the chord the way the resolver's own absolute test spells Am — pitch classes, fifth optional — lights the wrong keys. G7sus4 loses the only note that makes it a seventh. Dictionary piano keys are intervals and are not affected; the bug is on the file-override path `fromDefine` always runs (`src/core/resolve-diagram.ts:68`).

**RECOMMENDATION** Treat a tie as absolute: convert when `absScore >= relScore`. Checked against every full absolute set, every full relative set, and every single-tone omission: that change fixes all 14 ties and breaks none of the sets that are correct today (C stays C because subtracting root 0 is a no-op; relative Am still loses the absolute score 3 to 1). Test `G7sus4` keys `[7, 0, 5]` lights G, C, F and `Gsus4` keys `[7, 0]` lights G, C — and keep the existing Am absolute case and a relative `[0, 3, 7]` Am case.

### 3. MINOR — `capoFret` is written on segs that have no chord

**WHAT** Every stanza/chorus seg gets `capoFret: playable.fret`, including `chord === ''` (`src/core/layout.ts:502-515`). `concert` and `shapeName` become `''`. With song capo 2, `hey [Bm]you` yields a leading seg `{ chord: '', text: 'hey ', concert: '', shapeName: '', capoFret: 2 }`, and a line `plain words` with no chord at all is the same. The type comment says the three fields are filled on every playable seg (`src/core/types.ts:121-135`). `lens=letra` drops them only because `stripChords` allocates new segs (`src/core/layout.ts:404-410`). The new layout tests only assert segs whose `chord` is non-empty.

**WHY** The playable write is unconditional. `capoFret: 0` on a nut song is falsy; `capoFret: 2` on a lyric syllable is not. `concert === ''` is the actual "no chord" signal.

**IMPACT** A diagram target keyed on `capoFret` (or on "field present") selects empty lyric cells and chordless lines. No Vue caller does that yet. F3 will.

**RECOMMENDATION** Set `concert` / `shapeName` / `capoFret` only when `s.chord` is non-empty; leave them undefined otherwise. Assert that `hey [Bm]you` under capo 2 has `capoFret === undefined` on the `hey` seg and `2` on `you`.

### 4. MINOR — The open-string circle is the same rectangle as the capo bar

**WHAT** For capo 2 and an Am shape, the capo bar is `y="60"` `height="8"` (covers y 60–68) and each open marker is `cy="64"` `r="4"` (covers y 60–68) (`src/core/diagram-draw.ts:168-187`). The circle is `fill="none"` and `stroke="currentColor"`, drawn after a bar that is already `fill="currentColor"`. The stroke is 1px centered on the bar's edge, so the visible remainder is a same-color half-pixel halo, not an open-string mark. `opens` is `[1, 5]` and `nutOpens` is `[]` — the model is right. The SVG does not show it. The draw tests assert `opens` / `nutOpens` and the label `Capo 2`; they never place the circle outside the bar.

**WHY** Both marks use `yOf(capoFret)` as their center, and the bar's height equals the circle's diameter.

**IMPACT** "Open string sounds at the capo" is true on `FretDraw.opens` and false in the shipped `svg`. A host that inlines `svg` shows a bar and no open circles. A host that redraws from `opens` is fine. Look and color belong to F3; this one is the marker occupying the same box as the bar.

**RECOMMENDATION** Put the open circle just nut-side or just sound-side of the bar (for example `yOf(capoFret) - 10` or `+ 10`) so its bbox does not equal the bar's, and assert that for Am capo 2 each `diagram-open` cy is outside `[barY, barY+height]`.
