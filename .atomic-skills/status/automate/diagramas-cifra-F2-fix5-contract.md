# F2-fix5 contract — relative piano keys survive a transpose

Operator choice: fix the transposed piano chord now. Do not add a known-miss list. Do not edit guitar or ukulele packs. Do not add Vue.

## Defect

`{define: D keys 0 4 7}` is a relative spelling. `resolveDiagram` lights D F# A.
`exportCho({ semitones: 2 })` renames it to E and runs `transposeDefine`, which adds 2 to every 0–11 key. The file becomes `{define: E keys 2 6 9}`.
Both readings then score 0 against E major. `pianoKeysToRelative` keeps the absolute reading. The draw lights D F# A under the name E.

`src/core/define.ts` `shiftKey` / `transposeDefine` is the shift. The F1 tests must stay green:
- `{define: C keys 0 4 7}` +2 → name D, keys `[2, 6, 9]`
- `{define: B keys 11 3 6}` +1 → name C, keys `[0, 4, 7]`
- `{define: C keys 48 52 55}` +2 → keys `[50, 54, 57]`
- guitar base-fret bumps and open-string drops stay as they are

C and the absolute B shape are pitch classes, so they still shift. D `0 4 7` matches D as intervals and does not match D as pitch classes, so those numbers must not be shifted.

## Rule

In `transposeDefine`, for keys that are all inside 0–11:

- If the relative chord-tone score against the current root and quality is strictly greater than the absolute score, rename the chord and leave the keys unchanged.
- Otherwise add `n` with the existing `shiftKey` (pitch classes, including a tie such as C `0 4 7`).

Keys outside 0–11 stay on `shiftKey` (MIDI numbers add `n` and do not wrap).

Reuse the same score as `pianoKeysToRelative` (`src/core/chord-dict.ts`). `define.ts` may import that helper. Do not import Vue. Do not create a cycle: `chord-dict.ts` must not import `define.ts`.

## Tests

1. `tests/core/define-directive.test.ts`: `{define: D keys 0 4 7}` transposed by +2 is name E and keys still `[0, 4, 7]`. The three cases above stay.
2. `tests/core/resolve-diagram.test.ts`: take that transposed define and resolve it as piano. Drawn notes are E, G#, B. The untransposed `{define: D keys 0 4 7}` still draws D, F#, A. `{define: C keys 0 4 7}` transposed +2 still draws D, F#, A.

## Checks

`pnpm exec vitest run tests/core/define-directive.test.ts tests/core/resolve-diagram.test.ts tests/core/export-cho.test.ts`

Also:

`pnpm exec vitest run tests/core/layout-capo.test.ts tests/core/resolve-diagram.test.ts tests/core/diagram-draw.test.ts`

The 408-cell count stays `17 * 12 * 2`.

One commit for T-002. Paths: `src/core/define.ts`, `src/core/chord-dict.ts` only if the shared helper must live there, `tests/core/define-directive.test.ts`, `tests/core/resolve-diagram.test.ts`.

Do not commit `.atomic-skills/`.
