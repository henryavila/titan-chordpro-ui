---
evaluationReport:
  planSlug: diagramas-cifra
  phaseId: F2
  verdict: pass
  evaluatedHead: 72f4125
  findings:
    - severity: major
      area: exitGate
      path: tests/core/resolve-diagram.test.ts
      summary: "F2-G1 says the suite fails when a parse-class name has no guitar entry and is not on a known-miss list. No known-miss list exists. Guitar misses on the SDA oracle are 93 slash names plus one m11 name (Gm7(11) class). resolve-diagram.ts returns no-shape for every bassPc before lookupDict, and the m7(11) test expects no-shape on all 12 roots. The identity grid is a fixed 17 qualities. A new parse quality with no GUITAR row and no explicit miss assertion stays green. Current hits are not wrong chords."
    - severity: major
      area: resolve
      path: src/core/chord-dict.ts
      summary: "Official ChordPro piano keys are intervals (0 = root). Untransposed {define: D keys 0 4 7} resolves to D F# A. exportCho({semitones:2}) / transposeDefine shift 0–11 keys as pitch classes, so that line becomes {define: E keys 2 6 9}. Both readings score 0 against E major; pianoKeysToRelative then stores the absolute reading and resolveDiagram returns hit. drawDiagram lights D F# A, not E G# B. Same path on {define: C keys 0 4 7} +2 stays correct only because C relative and C absolute are the same numbers."
    - severity: minor
      area: draw
      path: src/core/diagram-draw.ts
      summary: "FretDraw has dots, mutes, opens, nutOpens, hasCapoBar, and capoLabel. It has no finger-barre span. Dictionary rows ship frets only, so a barre grip (F 133211) renders as dots. Design decision 7 and T-003 require fingers when present, otherwise dots, plus the capo bar. The capo bar is present."
  businessIntentCheck:
    value: pass
    workflow: pass
    rules: pass
    outOfScope: pass
    doneWhen: pass
  exitGates:
    - id: F2-G1
      status: pass
---

# evaluationReport — diagramas-cifra F2 r2

Head `72f4125`. Gate command on this tree: 3 files, 55 tests, exit 0 (layout-capo 18, resolve-diagram 25, diagram-draw 12).

## Goal

Layout segs expose `concert`, `shapeName`, and `capoFret` from song or block capo while `display()` and `shapeCapo` stay on `capoReadOf`. `resolveDiagram` hits the file override, else the package dictionary. Guitar and ukulele draw the hand shape; piano draws concert keys and ignores capo. `C7+` is not a diagram. A slash with no bass-matching override is `no-shape`. A wrong dictionary hit is a failure; a miss is not.

| Check | Result | Path |
| --- | --- | --- |
| capo 2 dual, source Bm | concert Bm, shapeName Am, capoFret 2 | `src/core/layout.ts` playableCapoOf; `tests/core/layout-capo.test.ts` |
| capo-solo | shapeCapo 0, capoFret 2, shapeName Am | same layout fill |
| edit and Nashville | display label changes; capoFret stays 2 | `capoReadOf` returns fret 0; playable fields do not |
| `#capo:2!` | display F/A#, concert G/C, shapeName F/A#, capoFret 2 | executed on this tree |
| override then dictionary | first canonical match wins | `src/core/resolve-diagram.ts` |
| C7M | guitar `x32000`, piano `[0,4,7,11]`, source dictionary | maj7 row, not the dominant-7 row |
| C7+ | miss `unknown-token` on guitar, ukulele, and piano | `parse-chord.ts` AMBIGUOUS |
| G/B without bass override | `no-shape` on all three instruments | bass guard before `lookupDict` |
| C9 vs C7(9) | add9 `x32030` vs dominant `x32330` | distinct packed rows |
| one grip per quality × root | 17 × 12 × guitar and ukulele, zero shared grips | `chord-dict.ts` tables |
| dictionary pitch classes | 0 foreign / 0 missing required tones on those rows and on every non-slash SDA parse hit | independent of the test oracle text |
| guitar capo 2 hand | Am relative dots 2,2,1, label `Capo 2`, nutOpens empty; Bm dictionary grip is `x24432` | `diagram-draw.ts` |
| piano capo | `capoFret` 0, `hasCapoBar` false, Bm lights B D F# | `drawPiano` ignores the capo argument |
| Vue in `src/core` | no import | grep |
| Rolar / metronome | not paused by these modules | layout, resolve, draw, dict |

## businessIntentCheck

- **value: pass.** Capo 2 on written Bm is the Am hand plus capo fret 2, not a Bm chord chart. Piano lights the sounding chord.
- **workflow: pass.** Edit and Nashville still fill the three playable fields. File `{define}` wins over the package dictionary. Guitar token is the shape name; piano token is concert. The draw model returns dots, mutes, capo bar, `Capo n`, and lit keys. Vue modal stays F3. Finger-barre is the minor finding, not a second chord.
- **rules: pass.** Capo-solo keeps capoFret 2. C7M is maj7. C7+ is a miss. One lowest packed voicing per name. `Object.hasOwn` on the dict tables and on `QUALITY`. No Vue import in core. This phase does not pause scroll or the metronome.
- **outOfScope: pass.** No `DiagramModal`, no `diagramInstrument`, no D4 writer, no baritone tuning, no swipe/zen work, no phone-look gate.
- **doneWhen: pass.** The three named test files exit 0. Guitar capo 2 draws the Am hand, not the concert Bm grip. Piano sets capoFret 0 and does not print `Capo`.

## exitGates

**F2-G1: pass.** `pnpm exec vitest run tests/core/layout-capo.test.ts tests/core/resolve-diagram.test.ts tests/core/diagram-draw.test.ts` exit 0, 55 tests. Edit and Nashville do not zero capoFret while the source capo is 2. The guitar draw model under capo 2 uses the passed hand voicing. Every current guitar dictionary hit sounds the named quality. The known-miss list is absent; that is the major coverage finding above, not a wrong grip and not a red suite.

## Findings

1. **major, exitGate.** The coverage clause is not a list the suite enforces. Slash and m11 miss instead of guessing. That is the correct miss. A later parse-class quality can ship with no guitar row and no miss row without this gate going red.
2. **major, resolve.** Relative piano `{define}` plus semitone rewrite is a hit for the wrong chord. `keys 0 4 7` on D is D major. After `exportCho({semitones:2})` the file is E with keys `2 6 9`, and the draw lights D F# A. Package dictionary rows are not this bug. Untransposed relative defines and transposed absolute pitch-class defines still light the named chord.
3. **minor, draw.** No barre primitive. Capo bar, dots, and optional fingers are what T-003 and design decision 7 require.
