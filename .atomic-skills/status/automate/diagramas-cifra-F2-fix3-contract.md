# F2-fix3 contract — two review majors

Codex review of `eb8539f..eb34c11` (`gpt-6-astra`, informed pass) kept two majors.
Do not rewrite dictionary packs that the 408-cell oracle already accepts.
Do not add Vue. Do not edit layout.

## 1. Piano tie

`pianoKeysToRelative` converts when `absScore >= relScore`.
`drawPiano` then adds the token root to every stored key.

That keeps an absolute tie correct and breaks a relative tie:

- `{define}` piano `G7sus4` keys `[7, 0, 5]` must stay a hit whose drawn notes are G, C, F.
- `{define}` piano `Gsus4` keys `[7, 0]` must draw G, C.
- `{define}` piano `F7sus4` keys `[0, 5, 10]` must stay stored as `[0, 5, 10]` and draw F, A#, D# (pitch classes 5, 10, 3). Converting this input draws C, F, A# and drops the minor seventh.
- Absolute Am keys `[9, 0, 4]` still draws A, C, E.
- Relative Am keys `[0, 3, 7]` stays `[0, 3, 7]` and draws A, C, E.
- C keys `[0, 4, 7]` draws C, E, G.

When the two scores differ, keep the higher score (absolute means convert, relative means keep the numbers).
When the scores are equal, count characteristic tones in each reading and take the higher count.
Characteristic intervals are the quality intervals modulo 12, excluding 0 and 7, except quality `5`, whose only characteristic interval is 7.
Absolute sounding set = the raw pitch classes. Relative sounding set = `(root + raw) % 12`.
If the characteristic counts are also equal, convert (absolute).

Put the regression next to the existing tie tests in `tests/core/resolve-diagram.test.ts`.

## 2. TypeScript narrowing

`tests/core/resolve-diagram.test.ts` around the enharmonic loop accesses `right.error` inside a ternary after `('error' in left || 'error' in right)`. `tsc` reports TS2339 on that line. Narrow `left` and `right` in separate branches before reading `.error`.

## Checks

Verifier, exit 0:

`pnpm exec vitest run tests/core/resolve-diagram.test.ts`

Also run:

`pnpm exec vitest run tests/core/layout-capo.test.ts tests/core/resolve-diagram.test.ts tests/core/diagram-draw.test.ts`

The 408-cell count must stay `17 * 12 * 2`.

T-002 owns `src/core/chord-dict.ts` and `tests/core/resolve-diagram.test.ts`.
T-003: run `pnpm exec vitest run tests/core/diagram-draw.test.ts`. If `src/core/diagram-draw.ts` needs no change, claim T-003 `skipped` with that transcript and no commit SHA.

Exclusive SHAs if both tasks commit. Do not commit `.atomic-skills/`.
