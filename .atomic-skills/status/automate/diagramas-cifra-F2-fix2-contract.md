# F2-fix2 contract — chord identity

This is the product contract for the reopened tasks. It is not chat history.
Visual modal look stays out of scope. Do not add Vue. Do not edit layout.ts.
Do not pause auto-scroll. Do not invent an m11 fretted grip.

## Cause

`GUITAR` and `UKULELE` in `src/core/chord-dict.ts` are not derived from `QUALITY_INTERVALS`.
Each quality is a few grips. Neighboring roots are a literal chromatic +1 copy.
`lookupDict` accepts any pack of the right length, so a grip that never contained
the tone that defines the quality is still a hit. A wrong hit is worse than a miss.

Guitar: 9 illegal cells (195 of 204 legal).
Ukulele: 55 illegal cells (149 of 204 legal). Clean ukulele qualities, all 12 roots:
`major`, `m`, `7`, `sus2`, `7sus4`, `add9`, `9`. Do not rewrite a cell the oracle accepts.

## Tuning

String 0 is the first character. Guitar EADGBE pitch classes `[4, 9, 2, 7, 11, 4]`.
Ukulele GCEA `[7, 0, 4, 9]` (re-entrant G is still 7). `UKULELE.major[0] === '0003'`
is G C E C, C major. Digit is absolute fret 0–9. `x` is mute. `baseFret` is 1.
Sounding pitch class = `(open[i] + fret) % 12`.

## Oracle (literals in the test, not read from `pianoKeysOf`)

Index is the pitch class of the root (0 = C … 11 = B). A hit is legal only when
every sounding pc is in the quality's set (transposed), the required tones are
present, and the omissions below are the only ones allowed.

Intervals from the tonic. 14 sounds as 2. 17 sounds as 5.

| Quality | Required | May omit | Forbidden examples |
|---|---|---|---|
| major | 4 | 7; root if 4 is present | 3 |
| m | 3 | 7; root if 3 is present | 4 |
| 5 | 7 | root if 7 is present | 3 and 4 |
| 6 | 4, 9 | 7; root if 4 and 9 are present | 3, 10, 11 |
| 6add9 | 4, 9, 2 | 7; root if those three are present | 3, 10, 11 |
| 7 | 4, 10 | 7; root if 4 and 10 are present | 3, 11 |
| 9 | 10, 2, and 4 unless shell | 7; root if the required tones are present | 3, 11 |
| add9 | 4, 2 | 7; root if 4 and 2 are present | 3, 10, 11 |
| maj7 | 4, 11 | 7; root if 4 and 11 are present | 3, 10 |
| maj9 | 11, 2, and 4 unless shell | 7; root if the required tones are present | 3, 10 |
| m6 | 3, 9 | 7; root if 3 and 9 are present | 4, 10 |
| m7 | 3, 10 | 7; root if 3 and 10 are present | 4, 11 |
| m9 | 3, 10, 2 | 7; root if those three are present | 4, 11 |
| m11 | 3, 10, 2, 5 | 7; root if those are present | 4, 11 |
| sus2 | 2 | 7; root if 2 is present | 3, 4 |
| sus4 | 5 | 7; root if 5 is present | 3, 4 |
| 7sus4 | 5, 10 | 7; root if 5 and 10 are present | 3, 4 |
| dim | 3, 6 | root if 3 and 6 are present | 4 and 7 (perfect fifth) |

Shell (the only omitted-third exception): qualities `9` and `maj9` may omit the
major third when the characteristic seventh AND the ninth are both present.
`m9`, `add9`, and `6add9` are not shells. A foreign tone (b9, the other third,
the other seventh) is illegal even if the required tones are present.
`sus4` plus a b9 is illegal.

These current cells are legal shells. Do not "fix" them:

- Guitar D9 `xx0210`, D#9 `xx1321`, A9 `x02000`, A#9 `x13111`
- Guitar Dmaj9 `xx0220`, D#maj9 `xx1331`, Amaj9 `x02100`, A#maj9 `x13211`, Bmaj9 `x24322`

## Coverage the test must enforce

Parser suffixes live in `src/core/parse-chord.ts`. Spot-check the aliases inside
the same grid (do not only test canonical spellings):

- `C9` is `add9`. `C7(9)` is dominant `9`. They are not the same chord.
- `C7M`, `CM7`, `Cmaj7` are `maj7`. `C7M(9)` is `maj9`.
- `C6(9)` is `6add9`. `C2`/`Csus2` are `sus2`. `C4`/`Csus`/`Csus4` are `sus4`.
- `C7(4)` is `7sus4`. `Cº` and `C°` are `dim`.
- `Bb7` frets equal `A#7`. Same for the other enharmonic roots the parser accepts.

For each of the 17 table qualities (`major m 7 maj7 m7 sus2 sus4 7sus4 add9 5 6
6add9 9 maj9 m6 m9 dim`), every root C C# D D# E F F# G G# A A# B, on guitar
AND ukulele:

- `resolveDiagram` returns `class: 'hit'`, `source: 'dictionary'`
- fret length 6 or 4
- the decoded set passes the oracle

A miss is a test failure for those 17. Do not `continue` on a non-hit.
Do not empty a slot and do not delete a quality key to go green.

`m11` / `m7(11)` has no fretted row. Guitar and ukulele may return `no-shape`.
Record that as an explicit known-miss in the test. Piano `m11` must be a hit
whose concert pitch classes are `{0,3,7,10,2,5}` plus the root.
Slash tokens with no matching bass `{define}` stay `no-shape` (do not serve G for G/B).
`C7+` stays `unknown-token`.

Named samples that must fail until the packs change, then pass:

- Guitar `C7M(9)` contains B and is not the `C9` / add9 pack `x32030`
- Guitar `A6(9)` contains B (the ninth) and is not the A6 pack `x02222`
- Ukulele `Am7` contains G
- Ukulele `Gdim` is not `0232` (that is G major)

## Replacement grips

Change only cells the oracle rejects. Keep accepted cells byte for byte.
New packs: one character per string, `x` or `0-9`, sounding-fret span
`max(fret)-min(fret) <= 4` (mutes ignored). Re-decode before committing.
Do not copy another quality's pack at the same root.
A checked example, re-verify rather than trust: ukulele C6(9) `7000` sounds
D C E A (root, third, sixth, ninth). Ukulele Cdim `5323` sounds C Eb Gb C.

## Piano tie

`pianoKeysToRelative` (`src/core/chord-dict.ts`) converts only when
`absScore > relScore`. On a tie it returns the raw numbers, and `drawPiano`
adds the root again.

- `{define}` piano `G7sus4` keys `7 0 5` currently lights D G C. It must light G C F.
- `{define}` piano `Gsus4` keys `7 0` currently lights D G. It must light G C.

Smallest rule: treat a tie as absolute (`absScore >= relScore`).
Lock these cases too: absolute Am keys `[9,0,4]` still lights A C E;
relative Am keys `[0,3,7]` stays `[0,3,7]` and lights A C E;
C keys `[0,4,7]` lights C E G.

## Draw model

In `tests/core/diagram-draw.test.ts`, for every guitar and ukulele hit, at
capo 0 and capo 2, using the voicing `resolveDiagram` returned:

- sounding fret n > 0 has one dot at that string, `fret` on the absolute axis
- mute has no dot
- open string is in `opens`, not a dot; with capo 0 it is also a nut open
- capo > 0 has the capo bar and the label `Capo n`; capo 0 has neither
- one axis: `maxFret` includes `dot.fret`, and the dot `cy` matches `yOf(dot.fret) - 9`
  with `yOf(f) = 28 + f * 18`

Piano, 18 qualities × 12 roots, even when the caller passes capoFret 2:
`capoFret === 0`, no capo label, `lit` is `(rootPc + key) % 12`.
No token → empty `lit`. Do not assert colors, fonts, or where the open circle sits.

## Tasks and commits

T-002 first commit(s): `src/core/chord-dict.ts`, `tests/core/resolve-diagram.test.ts`,
and `src/core/resolve-diagram.ts` only if a caller change is required.
Verifier, verbatim, exit 0:

`pnpm exec vitest run tests/core/resolve-diagram.test.ts`

T-003 later commit(s): `tests/core/diagram-draw.test.ts` and `src/core/diagram-draw.ts`
only if the model is wrong. Do not share commit SHAs with T-002.
Verifier, verbatim, exit 0:

`pnpm exec vitest run tests/core/diagram-draw.test.ts`

Write the failing oracle test first and run it red before editing packs.
Then make it green. Then the draw grid.

If `node_modules` is missing in this worktree, run `pnpm install` here.
Do not symlink `node_modules`.

Also run, and paste the summary into the claim transcript:

`pnpm exec vitest run tests/core/layout-capo.test.ts tests/core/resolve-diagram.test.ts tests/core/diagram-draw.test.ts`

Existing layout, capo Bm → shape Am, and no-vue behavior must stay green.
Do not commit `.atomic-skills/`. `git add` explicit paths only.

## Claim report

Write the JSON only to this absolute path. Do not commit it.

`/Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra/.atomic-skills/status/automate/diagramas-cifra-F2-fix2-claims.json`

Two tasks, `tasks` array, status `claimed-pass` only with exitCode 0.
Each task: exclusive `commitShas`, `base: null`, `head: null`, `paths`, the
verifier command above, `transcript`. No shared SHA.
