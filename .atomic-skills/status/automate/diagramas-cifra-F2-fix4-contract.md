# F2-fix4 contract — slash bass on a piano tie

The second Codex review (`6812f54..d2d36c`, informed pass) kept one major.
Do not change guitar or ukulele packs. Do not edit layout. Do not add Vue.
Keep the tests that already pass: G7sus4 keys `[7, 0, 5]` draws G C F; Gsus4 keys `[7, 0]` draws G C; F7sus4 keys `[0, 5, 10]` stays `[0, 5, 10]` and draws F A# D#; absolute and relative Am; C keys `[0, 4, 7]`.

## Defect

`pianoKeysToRelative` does not see the slash bass.
`D7M(9)/B` with piano override keys `[11, 2, 1, 4]` is an absolute spelling of B, D, C#, E.
The chord-tone scores tie. The characteristic count then prefers the relative reading.
`drawPiano` adds the root and lights C#, E, D#, F#. The B is gone and D# is not in Dmaj9.

## Rule

Pass the declared bass pitch class into `pianoKeysToRelative` when the token has one (`want.bassPc` in `fromDefine`). Dictionary lookup does not use this function.

On a score tie, before the characteristic count:

- Sounding set of the absolute reading = the raw pitch classes.
- Sounding set of the relative reading = `(root + raw) % 12`.
- If the bass pitch is in exactly one of those sets, choose that reading.
- If it is in both or in neither, or there is no bass, keep the current characteristic comparison, then absolute.

Absolute means store `(key - root) % 12`. Relative means keep the numbers.

## Test

In `tests/core/resolve-diagram.test.ts`, resolve `D7M(9)/B` on piano with override keys `[11, 2, 1, 4]`.
The drawn `lit` must be `[11, 2, 1, 4]` (order may differ only if you sort both sides).
`litNotes` must be B, D, C#, E in that pitch order.

## Checks

`pnpm exec vitest run tests/core/resolve-diagram.test.ts` exit 0.
Also the three-file command:

`pnpm exec vitest run tests/core/layout-capo.test.ts tests/core/resolve-diagram.test.ts tests/core/diagram-draw.test.ts`

The 408-cell assertion stays `17 * 12 * 2`.

T-002 commits `src/core/chord-dict.ts` and `tests/core/resolve-diagram.test.ts`.
T-003 stays skipped if `diagram-draw.ts` does not change. Run its verifier and record exit 0 with no commit SHA.

Do not commit `.atomic-skills/`.
