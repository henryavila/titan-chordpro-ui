---
verdict: needs_changes
counts: {blocker: 0, critical: 1, major: 3, minor: 2, nit: 0}
reviewer: local
pass: blind
schema_version: "1.0"
---

## Summary

Hyphenated `{define-guitar}` / `{define-ukulele}` now survive `DIR`, `parse()` collects them on `ChordProView.defines` instead of lyrics, `writeMeta` / `exportCho` (n=0) keep the lines, and open-string guitar/ukulele shapes are dropped instead of relabelled. The piano path is wrong against ChordPro: `keys` are intervals from the named root (`0 4 7` on D is D–F♯–A), but `transposeDefine` shifts those numbers as concert pitch-classes and rewrites the name, so `{define: C keys 0 4 7}` exported at +2 is `{define: D keys 2 6 9}` (D+2/+6/+9 = E–A–B). The same function also discards mixed key+fret payloads on any open string, and `setKey`’s unsigned 0–11 delta does not match signed `rewriteToKey` / live `exportCho` for linear `base-fret`. Official `base_fret` (underscore) and muted `N` miss the whole directive.

## Findings

### 1. CRITICAL — Piano `keys` are root-relative; transpose rewrites them as concert pitch-classes

**WHAT** `transposeDefine` always maps `def.keys` through `shiftKey` (mod 12 when the value is in 0–11, otherwise `k+n`) and also rewrites `name` via `transposeToken`. `exportCho` / `rewriteToKey` persist that via `serializeDefine`. Tests lock `{define: C keys 0 4 7}` +2 → `{define: D keys 2 6 9}` (`src/core/define.ts:175-196`, `src/core/export-cho.ts:14-23`, `tests/core/export-cho.test.ts:38-43`, `tests/core/define-directive.test.ts:239-247`).

**WHY** ChordPro `{define: name keys …}` numbers are intervals from the named root: 0 is the root, 4 the major third, 7 the fifth, 12 the octave; official examples are `{define: D keys 0 4 7}` and `{define: D² keys 7 12 16}`. Transposing the chord is a name change; the interval list stays. Shifting both name and keys double-applies the interval: `{define: D keys 2 6 9}` is E–A–B labelled D. The dual policy (wrap 0–11, add outside) also splits the official inversion `7 12 16` (7 wraps, 12 and 16 do not).

**IMPACT** Transposed piano overrides round-trip into ChordPro that any spec-faithful drawer — including a later Titan resolver that treats `keys` as root-relative — will render as the wrong notes. `{define: D keys 0 4 7}` is untested; under the concert-C=0 reading it would already be C major labelled D before any transpose.

**RECOMMENDATION** On transpose, change `name` only for piano/`keys` payloads. Leave `keys` intact (including `7 12 16`). Drop the 0–11 wrap vs MIDI-add split. Add a fixture `{define: D keys 0 4 7}` and the inversion example; export/rewriteToKey/parse must keep those numbers when the name moves.

### 2. MAJOR — Open-string fret check drops mixed defines, including the piano voicing

**WHAT** `transposeDefine` returns `null` as soon as any fret slot is `0`, before instrument or `keys` are considered (`src/core/define.ts:185-187`). Generic `{define:}` with both 6 frets and `keys` is classified `piano` but still stores `frets` (`src/core/define.ts:137-160`). That mixed form is an accepted parse (`tests/core/define-directive.test.ts:90-105`) and is not covered by any transpose/export test.

**WHY** `{define: C base-fret 1 frets 3 2 0 0 0 3 keys 0 4 7}` is a parse hit. +2 sees open guitar strings and drops the whole object, so the piano triad is deleted even though it could have survived as a keys-only define.

**IMPACT** `exportCho` / `rewriteToKey` / `transpose()` omit the override. A file that mixed a keyboard voicing with an open guitar shape loses the keyboard override on any nonzero transpose; `view.defines` goes empty for that chord.

**RECOMMENDATION** Gate the open-string / `base-fret < 1` drop on the fret payload only: if `keys` remain, keep a keys-only define (name rewritten, frets omitted). If the product forbids mixed payloads, miss them at parse instead of storing both and then destroying them on transpose. Test the mixed line through `transposeDefine`, `exportCho`, and `rewriteToKey`.

### 3. MAJOR — `setKey` uses unsigned 0–11; `base-fret` is linear, so downward key changes jump up the neck

**WHAT** `setKey` transposes with `semitoneDelta` (always `((b-a)%12+12)%12`, range 0–11) (`src/core/parse.ts:336-339`, `src/core/transpose.ts:64-71`). `rewriteToKey` uses `signedSemitoneDelta` (−6…+6) (`src/core/import-chordpro.ts:530-533`). Live export uses the signed viewer offset (`exportCho(..., { semitones: offset })`). `transposeDefine` adds `n` to `baseFret` and drops only when `base < 1` (`src/core/define.ts:189-192`). The suite that claims “transpose/setKey apply the same define rewrite as export” only checks G→A (+2 both ways) (`tests/core/define-directive.test.ts:258-265`).

**WHY** Chord names are mod 12, so +10 and −2 spell the same roots. Fret positions are not: a barred `{define-guitar: F base-fret 1 frets 1 3 3 2 1 1}` from C toward A is `setKey` +9 → `base-fret 10` named D, versus `rewriteToKey` −3 → drop. CLI `--key` also uses `semitoneDelta` on `transpose()`.

**IMPACT** The same song, same target key, two public APIs, two guitar overrides (neck-jump vs omit). A host that calls `setKey` for a downward change writes a playable-looking define that is 7–11 frets higher than the signed export path.

**RECOMMENDATION** Drive define (and ideally `setKey`) with the same signed delta as `rewriteToKey`. Test C→A and G→F on a barred define: `setKey`, `rewriteToKey`, and `exportCho({ semitones })` must agree on keep-and-bump vs drop.

### 4. MAJOR — Official `base_fret` (underscore) form is a miss

**WHAT** Keywords are only `base-fret`, `frets`, `fingers`, `keys` (`src/core/define.ts:25`). Any other token after the name returns `miss` (`src/core/define.ts:127`). `takeValues` also does not stop on `base_fret`, so `{define: A frets 0 0 2 2 2 0 base_fret 1}` consumes `base_fret` as a fret, `parseFret` returns null, and the whole directive is discarded (`src/core/define.ts:50-57, 91-99`).

**WHY** ChordPro documents both hyphenated `base-fret` and `{define: A frets 0 0 2 2 2 0 base_fret 1}`. The hyphen form parses; the underscore form does not.

**IMPACT** Charts copied from ChordPro advanced examples (or configs that emit `base_fret`) never appear in `view.defines`, never round-trip through `writeDefines`, and stay as unparsed `{define…}` lines in the file. Workaround: rewrite the keyword by hand.

**RECOMMENDATION** Treat `base_fret` as an alias of `base-fret` in the keyword set (and as a stopper in `takeValues`). Test the official revisited line and a hyphen/underscore round-trip.

### 5. MINOR — Muted-string `N`/`n` rejects the entire define

**WHAT** `parseFret` accepts `x`/`-1` as mute and `/^\d+$/` as a fret (`src/core/define.ts:36-41`). `N`/`n` returns null and `parseDefineDirective` misses (`src/core/define.ts:94-96`).

**WHY** ChordPro muted strings are `-1`, `N`, or `x`. A single `N` in a six-slot list throws away the override.

**IMPACT** Defines that use `N` for mute never load. Hyphenated guitar/ukulele lines that are otherwise valid disappear from `view.defines` with no issue. Workaround: replace `N` with `x` or `-1`.

**RECOMMENDATION** Map `n`/`N` to `'x'` in `parseFret` (same as `-1`). Serialize as `x` if that is the canonical form; test a 6-slot line that mixes `N` and `x`.

### 6. MINOR — Malformed `{define}` is dropped from the view and kept verbatim on transpose

**WHAT** `parseRaw` matches `isDefineKey`, then `continue`s even when `parseDefineDirective` is `miss` (`src/core/parse.ts:151-154`). `transposeDefineLine` returns the original line when parse misses (`src/core/define.ts:198-202`). Valid open-string defines are deleted (`src/core/define.ts:211-212`). No `ParseIssue` is recorded.

**WHY** `{define-guitar: Am frets 0 0 0 3}` (wrong arity) is not lyrics, not in `defines`, and still sits in the source after `exportCho({ semitones: 2 })`, while a valid open G define is stripped. `writeDefines(src, view.defines)` then deletes the garbage because every `isDefineKey` line is filtered (`src/core/define.ts:248-253`).

**IMPACT** Typos vanish from the reading surface with no lint/parse signal. Transpose leaves stale unparseable `{define…}` next to rewritten body chords; a later `writeDefines` from `view.defines` silently discards them. Hard to tell a miss from “no override”.

**RECOMMENDATION** Either collect misses (lint/issue) or treat unparseable define lines the same way as untransposable ones (drop on rewrite). `writeDefines` should not be the only path that removes them. Add a test that `{define: Am}` (no payload) is visible to lint or explicitly stripped on export.
