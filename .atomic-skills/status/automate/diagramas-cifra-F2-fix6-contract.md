# F2-fix6 contract — transpose uses the same piano reading as the draw

Codex review `f2355ac..fd09dba` kept two majors. Do not edit guitar or ukulele packs. Do not add a known-miss list. Do not add Vue.

## Defect

`keepRelativeKeys` keeps the numbers only when `relScore > absScore`. The draw decides ties with the slash bass, then the characteristic-tone count, then absolute. Two failures:

1. `{define: F7sus4 keys 0 5 10}` draws F, A#, D# (pitch classes 5, 10, 3). Plus 2 semitones must draw G, C, F (7, 0, 5). Today the keys are shifted to `2 7 0` on G7sus4 and the draw lights D, G, C.
2. `{define: Dsus2 keys 0 7}` draws D, A (2, 9). Plus 3 semitones must draw F, C (5, 0). Today the numbers stay `0 7` on Fsus2 and the draw lights C, G (0, 7). Minus 3 from that result must draw D, A again, not a third chord.

Keeping the interval numbers is not enough. The new root can read them as absolute.

## Rule

For keys that are all inside 0–11, transposition must:

1. Choose the same reading `pianoKeysToRelative` would choose for this name, including the slash bass and the characteristic-tone tie-break. Share one function. Do not copy the comparison.
2. Take the sounding pitch classes of that reading, in key order. Absolute: the keys themselves. Relative: `(root + key) % 12`.
3. Store `(sounding + n) % 12` on the renamed chord.

Those stored numbers are absolute pitch classes of the transposed notes. The destination draw must light them.

Keys outside 0–11 stay on the old `shiftKey` (MIDI adds `n` and does not wrap). Guitar base-fret rules stay.

## Tests that must pass

- F7sus4 `0 5 10` +2 draws G, C, F. Untransposed F7sus4 still draws F, A#, D#.
- Dsus2 `0 7` +3 draws F, C. That result transposed by −3 draws D, A.
- D `0 4 7` +2 draws E, G#, B. The stored keys may be the absolute pitch classes `4 8 11`. Do not require them to stay `0 4 7`.
- C `0 4 7` +2 is still name D, keys `[2, 6, 9]`, and draws D, F#, A.
- B `11 3 6` +1 is still name C, keys `[0, 4, 7]`.
- C `48 52 55` +2 is still keys `[50, 54, 57]`.
- D7M(9)/B keys `[11, 2, 1, 4]` still draws B, D, C#, E.
- The 408-cell count stays `17 * 12 * 2`.

## Checks

`pnpm exec vitest run tests/core/define-directive.test.ts tests/core/resolve-diagram.test.ts tests/core/export-cho.test.ts`

Also:

`pnpm exec vitest run tests/core/layout-capo.test.ts tests/core/resolve-diagram.test.ts tests/core/diagram-draw.test.ts`

One T-002 commit. Paths: `src/core/define.ts`, `src/core/chord-dict.ts`, `tests/core/define-directive.test.ts`, `tests/core/resolve-diagram.test.ts`. `chord-dict.ts` must not import `define.ts`.

Do not commit `.atomic-skills/`.
