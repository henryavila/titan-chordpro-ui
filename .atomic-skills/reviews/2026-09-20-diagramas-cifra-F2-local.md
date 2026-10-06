---
verdict: needs_changes
counts: {blocker: 0, critical: 1, major: 1, minor: 3, nit: 0}
reviewer: local
pass: blind
schema_version: "1.0"
---

# F2 local review — D2 resolveDiagram + BD + draw with capo

**Ref:** `90d7c4613290604e4ffa6ad16c6d4b5dc2e8aa37..HEAD`  
**Mode:** local  
**Files:** `src/core/chord-dict.ts`, `src/core/diagram-draw.ts`, `src/core/index.ts`, `src/core/layout.ts`, `src/core/resolve-diagram.ts`, `src/core/types.ts`, `tests/core/diagram-draw.test.ts`, `tests/core/layout-capo.test.ts`, `tests/core/resolve-diagram.test.ts`

Layout now fills `concert` / `shapeName` / `capoFret` from `playableCapoOf` even when display is Nashville, edit, or capo-solo (`shapeCapo` stays 0). `resolveDiagram` prefers file `{define}` then `lookupDict`, maps `C7M`→maj7, and misses `C7+` / quote junk. Guitar/ukulele dictionary is EADGBE/GCEA, one packed voicing per quality×root. No Vue callers yet.

The structured fret model (absolute `dots[].fret` = capo + base-1 + slot; opens excluded from `nutOpens` when capo>0) is consistent. The SVG string is not: board length is computed from **relative** slots, while dots and the capo bar are painted on the **absolute** axis. Slash tokens (`G/B`, `E/G#`) parse with `bassPc` for override matching, then the dictionary ignores bass and returns the non-slash shape.

**Callers of new exports (≤5):** `src/core/index.ts` re-exports `resolveDiagram` / `drawDiagram`; `tests/core/resolve-diagram.test.ts`; `tests/core/diagram-draw.test.ts`; `lookupDict` only from `src/core/resolve-diagram.ts:121`; `pianoKeysOf` only from `lookupDict` in `src/core/chord-dict.ts`. No Vue/production caller.

## Findings

### 1. CRITICAL — SVG board is relative; dots are absolute, so capo-2 C/F/G and uke C sit off the fretboard

**WHAT** `drawFrets` stores `fret = capoFret + (base - 1) + relativeFret` and `fretSvg` places each dot at `yOf(dot.fret)` (absolute from the nut). The board is sized with `maxRel = Math.max(4, ...dots.map(d => d.relativeFret), capoFret)` — relative slots and the capo index, not the absolute frets (`src/core/diagram-draw.ts:96-97`, `src/core/diagram-draw.ts:147`, `src/core/diagram-draw.ts:151`, `src/core/diagram-draw.ts:190-192`). Capo bar and open circles also use `yOf(capoFret)` on that same absolute axis (`src/core/diagram-draw.ts:168-187`).

For ukulele C under capo 2 (the F2 uke case): `relativeFret=3`, `fret=5`, `maxRel=max(4,3,2)=4`. Last drawn fret line is `y=100`; the finger is at `cy=109` in the 28px caption pad next to `Capo 2` (`height=128`). Guitar C (`x32010`) and F (`133211`) under capo 2 are the same (highest slot 3 → absolute 5 on a 4-fret board). Capo 7 + slot 3 puts `cy` past `viewBox` entirely. `baseFret > 1` hits the same split with capo 0: base-fret 5, slot 3 → `fret=7` on a board that only runs to 4.

Tests never parse `cx`/`cy` against fret lines. Guitar capo 2 uses Am (`relative` max 2 → absolute 4 = `maxRel`), the one common shape that fits (`tests/core/diagram-draw.test.ts:28-47`, `tests/core/diagram-draw.test.ts:71-88`).

**WHY** A nut-origin diagram is coherent only if the last fret line is `max(absolute frets, capoFret, 4)`. A movable window is coherent only if dots use `relativeFret` and the capo is a nut. This function mixes both. The `dots[]` model is internally correct; `svg` contradicts it.

**IMPACT** F2’s shipped geometry for the usual capo-2 shapes (C, F, G, uke C) paints the highest finger below the fretboard, on or under the `Capo n` label, or clips it. Am is the lucky case the tests lock. File overrides with `base-fret` > 1 (barred custom shapes) are also off-canvas with no capo. Vue that inlines `FretDraw.svg` shows the wrong hand. Vue that rebuilds from `dots` is fine — the two fields on the same object disagree.

**RECOMMENDATION** Pick one coordinate system. Nut-origin: `maxRel = Math.max(4, capoFret, ...dots.map(d => d.fret))`. Window: `yOf` takes `relativeFret`, capo is a thick nut at the top, board length from relative slots only. Assert SVG: for uke C / guitar C capo 2, each `diagram-dot` `cy` sits between fret lines `fret-1` and `fret`, and inside `viewBox`; add a `baseFret: 5` override case.

### 2. MAJOR — Slash tokens hit the non-slash dictionary shape; override matching still requires the bass

**WHAT** `canonicalOf` keeps `bassPc`. `sameCanonical` requires equal bass, so `{define-guitar: G}` does not match token `G/B` (`src/core/resolve-diagram.ts:41-55`, `src/core/resolve-diagram.ts:91-93`). Dictionary lookup is `lookupDict(instrument, want.rootPc, want.quality)` — bass discarded (`src/core/resolve-diagram.ts:121`, `src/core/chord-dict.ts:93-111`). `G/B`, `E/G#`, `A/B`, `F#m/E`, `D/Gb` therefore return the G / E / A / F#m / D packed shape (guitar G = `320003`, low E sounding G) as a `hit`.

**WHY** F0 parses slash as bass (`G/B`, `D9/4`). F2 says miss rather than guess (`C7+`, quote junk). `G/B` is a different name from `G`; the corpus is full of inversions (`tests/core/chord-oracle.table.json` `G/B`, `A/B`, `E/G#`; `fixtures/sda/043-seja-engrandecido.cho`, `fixtures/sda/099-ele-e-exaltado-lucio-monteiro.cho`). One voicing per name does not license serving G’s voicing for the name G/B. Override and dictionary also disagree: a `{define: G}` is skipped for `G/B`, then the dict quietly supplies G anyway.

**IMPACT** Capo-2 dual on a line `[G/B]` resolves the G shape with G in the bass. The chart asked for B in the bass (`x20003`, not `320003`). Rehearsal plays the wrong inversion. There is no `no-shape` path to hang a file override on unless the define name is exactly `G/B` (or canonical-equal with bass). Instrument switch does not help — uke and piano also drop bass (piano at least still lights the triad).

**RECOMMENDATION** If `want.bassPc != null` and no override matched, return `{ class: 'miss', reason: 'no-shape' }` until an inversion row exists. Do not call `lookupDict` on root+quality alone. Test `G/B` guitar → `no-shape`; `{define-guitar: G/B …}` → that voicing; `{define-guitar: G …}` still must not match `G/B`.

### 3. MINOR — Piano without a parseable `token` lights C

**WHAT** `pianoRootPc` returns `0` when `token` is omitted or `parseChordToken` is not `parse` (`src/core/diagram-draw.ts:204-209`). `drawPiano` then adds `voicing.keys` to C (`src/core/diagram-draw.ts:211-214`). `token` is optional on `DrawDiagramOpts` (`src/core/diagram-draw.ts:49-55`). Tests always pass `token: 'Bm'` (`tests/core/diagram-draw.test.ts:95-100`).

**WHY** Piano keys in this model are intervals from the concert root. The root is not on `DiagramVoicing` (only `keys: [0,3,7]`). Dropping `token` is indistinguishable from C minor / C major.

**IMPACT** F3 (or any host) that calls `drawDiagram({ instrument: 'piano', voicing: hit.voicing, capoFret })` after a Bm hit lights C–Eb–G. The resolve side was correct; the draw side lies.

**RECOMMENDATION** Require `token` on the piano path (throw or return empty `lit` / do not default the root). Test Bm keys without `token` does not equal C.

### 4. MINOR — `PianoDraw` still carries `capoFret`

**WHAT** Piano “ignores capo”: no bar, no label, keys from the concert token (`src/core/diagram-draw.ts:218-226`, `src/core/diagram-draw.ts:255-257`). The object still sets `capoFret` to the caller’s value (2 in the test). `hasCapoBar` is the literal `false`.

**WHY** Acceptance is “piano draw ignores capoFret”. The structured field does not. A caller that labels from `d.capoFret` rather than `d.hasCapoBar` paints `Capo 2` on the keyboard.

**IMPACT** Footgun for F3. Tests only forbid the substring `Capo` in `svg` and `hasCapoBar === false`; they do not freeze `d.capoFret` at 0.

**RECOMMENDATION** Force `capoFret: 0` on `PianoDraw` (or omit it). Assert `d.capoFret === 0` in the existing piano capo-2 test.

### 5. MINOR — `capoFret` is written on lyric-only segs

**WHAT** Every song seg gets `capoFret: playable.fret`, including those with `chord === ''` (`src/core/layout.ts:500-515`). `concert` / `shapeName` become `''`; `capoFret` stays `2`. The type comment says the three fields are filled on every **playable** seg (`src/core/types.ts:121-135`). `lens=letra` then replaces segs without those keys (`src/core/layout.ts:404-410`).

**WHY** `if (seg.capoFret)` is true for every syllable of a capo song. `if (seg.concert)` is the actual playable gate. Types mark all three optional, so nothing forces the distinction.

**IMPACT** A diagram hit-target keyed on `capoFret` (or on “fields present”) lights up empty lyric cells. Letra currently drops the fields only because `stripChords` allocates new segs, not because layout omitted them.

**RECOMMENDATION** Set `concert` / `shapeName` / `capoFret` only when `s.chord` is non-empty (omit or leave undefined otherwise). Make them required on a playable subtype, or test that a no-chord seg has `capoFret === undefined`.
