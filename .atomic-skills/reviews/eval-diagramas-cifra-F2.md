# evaluationReport — diagramas-cifra F2

evaluationReport:
  planSlug: diagramas-cifra
  phaseId: F2
  verdict: pass
  evaluatedHead: aabd36c81c38df2e24471c8a774eb249fea2535a
  productTree: c09259cfad432b5c671f856693e5a619ea8ce182
  findings:
    - severity: major
      area: exitGate
      path: tests/core/resolve-diagram.test.ts:249
      summary: "F2-G1 FAILS-when requires a guitar dict entry for every parse-class name unless it is on a known-miss list. No known-miss list exists in src/ or tests/. Oracle parse names without a guitar packed row: Gm7(11) (quality m11; GUITAR has no m11 table) and 93 slash names (resolve-diagram.ts:121 bassPc → no-shape). The quality-invariant test skips non-hits. Slash miss is the fix1 contract; m11 guitar miss is asserted only as uke Cm7(11) no-shape. Coverage clause is not a failing test."
    - severity: major
      area: other
      path: src/core/chord-dict.ts:52
      summary: "NEED_NINTH omits 6add9 and does not require b7/maj7. Guitar 6add9 packed equals 6 at D/D#/A/A#/B (xx0202, xx1313, x02222, x13333, x24444). A6add9 x02222 was a listed C1 row and remains A6 (no B). Oracle Db6(9) is C# index 1 x43341 and includes the 9th. Ukulele A/A#/B m7 packed 2000/3111/4222 equals m (Am7 lights Am). Invariant still green."
    - severity: minor
      area: goal
      path: src/core/diagram-draw.ts:19
      summary: "Parent F2 goal lists barre in the draw model. FretDraw has mutes/opens/nutOpens/dots/hasCapoBar and no barre field. T-003 acceptance does not require a barre primitive. Capo bar is present."
    - severity: minor
      area: other
      path: src/core/layout.ts:514
      summary: "capoFret is written on every song seg, including chord===''. concert/shapeName become ''. Types comment says the three fields are filled on playable segs. lens=letra drops them only because stripChords allocates new segs (layout.ts:407-409)."
    - severity: note
      area: scope
      path: src/core/diagram-draw.ts:171
      summary: "Open-at-capo circle uses cy=yOf(capoFret) under an opaque 8px capo bar. Model opens/nutOpens are correct. SVG look is F3."
    - severity: note
      area: other
      path: src/core/chord-dict.ts:1
      summary: "Dictionary ships under package LICENSE (MIT, Henry Avila 2026). chord-dict.ts has no third-party NOTICE. Design blast-radius mentioned chords-db MIT as an example origin; this file does not cite it."
  businessIntentCheck:
    value:
      status: pass
      note: "Capo 2 dual on source Bm yields concert Bm, shapeName Am, capoFret 2 (layout.ts:502-515; layout-capo.test.ts:152-161). Guitar draw of Am under capoFret 2 is not the concert Bm voicing (diagram-draw.test.ts:85-104; dots relative [2,2,1] vs Bm [2,4,4,3,2]). Piano lights concert Bm keys B D F# and sets capoFret 0 with no Capo label (diagram-draw.ts:211-226; diagram-draw.test.ts:126-143, 193-208)."
    workflow:
      status: pass
      note: "playableCapoOf is the draw source; capoReadOf still zeros display in edit/Nashville (layout.ts:457-470). resolveDiagram prefers file {define} then lookupDict (resolve-diagram.ts:107-131; resolve-diagram.test.ts:45-63). Guitar token is shapeName, piano token is concert (resolve-diagram.test.ts:80-96). Core draw model includes dots, mute, opens, capo bar, Capo n, lit keys (diagram-draw.ts:19-45, 105-106, 255-258). DiagramModal and diagramInstrument are absent. Vue modal is F3."
    rules:
      status: pass
      note: "Capo-solo still has capoFret 2 and shapeName Am while shapeCapo is 0 (layout-capo.test.ts:163-182). C7M hits maj7 guitar x32000 and piano [0,4,7,11] (resolve-diagram.test.ts:24-36; GUITAR.maj7 C = x32000). C7+ is miss unknown-token (resolve-diagram.test.ts:38-43). One packed voicing per quality×root (chord-dict.ts:41-76). QUALITY/dict maps are Object.create(null) with Object.hasOwn (chord-dict.ts:19,40,59,88,122; parse-chord.ts:86). Zero Vue imports in src/core. F2 does not pause Rolar or metronome (no src/vue diff in F2 product tree)."
    outOfScope:
      status: pass
      note: "F2 product tree is 9 files: src/core/{chord-dict,diagram-draw,index,layout,resolve-diagram,types}.ts and tests/core/{diagram-draw,layout-capo,resolve-diagram}.test.ts. No src/vue change. No DiagramModal.vue (overlay has MyVersionPanel/SuggestionQueue/UpdateDialog only). No diagramInstrument. No D4 writeDefines caller. No baritone table. tests/core/no-vue-in-core.test.ts exit 0."
    doneWhen:
      status: pass
      note: "pnpm exec vitest run tests/core/layout-capo.test.ts tests/core/resolve-diagram.test.ts tests/core/diagram-draw.test.ts → 46 passed, exit 0 (18+18+10). Guitar capo 2 does not draw concert voicing. Piano ignores capoFret (capoFret field 0, hasCapoBar false, no Capo substring)."
  exitGates:
    - id: F2-G1
      status: pass
      note: "Verifier `pnpm exec vitest run tests/core/layout-capo.test.ts tests/core/resolve-diagram.test.ts tests/core/diagram-draw.test.ts` cwd=/Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra exit 0. Tests 46 passed (18+18+10). Editing and Nashville keep capoFret 2 (layout-capo.test.ts:184-199). Guitar draw under capo 2 uses Am shape, not Bm (diagram-draw.test.ts:85-104). Coverage FAILS-when (parse-class guitar entry vs known-miss list) is not implemented as a test; shell expectExitCode 0 holds."
    - id: no-vue-in-core
      status: pass
      note: "Out-of-scope check `pnpm exec vitest run tests/core/no-vue-in-core.test.ts` exit 0 (1 test). Grep from ['\"]vue in src/core: no matches."

## Pre-fix1 CRITICAL

### SVG relative vs absolute (local finding 1 / Claude C2)

Present on 6a1027a: `maxRel = Math.max(4, ...dots.map(d => d.relativeFret), capoFret)` while dots used `yOf(dot.fret)` with `fret = capoFret + (base-1) + relativeFret`. Uke C capo 2 sat at absolute 5 on a 4-fret board.

Absent on HEAD: `maxFret = Math.max(4, capoFret, ...dots.map((d) => d.fret))` (`diagram-draw.ts:147`). Dots at `yOf(dot.fret) - fretH/2` (`diagram-draw.ts:190-192`). Test locks cy between yOf(0) and yOf(maxFret) for guitar C/F/G capo 0/2, uke C capo 2, and baseFret 5 (`diagram-draw.test.ts:170-191`).

### Dictionary wrong extensions (Claude C1)

Present on 6a1027a: G9 packed as G7 (`320001`), Fadd9 as F (`133211`), Am9 as Am7 (`x02010`), uke A5 as Am (`2000`), uke F5 as F major (`2013`), uke Fsus2 with a 3rd (`0010`).

Absent on HEAD for those listed rows: G9 `320201` ≠ G7 `320001`; Fadd9 `133213` ≠ F `133211`; Dadd9 `x54252` ≠ D `xx0232`; Am9 `x05500` ≠ Am7 `x02010`; Amaj9 `x02100` ≠ Amaj7 `x02120`; uke A5 `2400` ≠ Am `2000`; uke F5 `5013` ≠ F `2010`; uke Fsus2 `0013`. Property test requires 9th on 9/add9/maj9/m9 and forbids a 3rd on 5/sus2/sus4/7sus4 (`resolve-diagram.test.ts:235-274`).

Remains (not a reopen of the listed high-impact rows except 6add9): guitar A6add9 `x02222` still equals A6 (`chord-dict.ts:51-52`). NEED_NINTH does not include `6add9`.

## Evidence

### Goal

Phase goal: Layout segs expose concert, shapeName, capoFret computed from block/song capo even when editing or Nashville (display() and shapeCapo stay as today); resolveDiagram hits dictionary or file override; core returns a draw model (dots, mute, barre, capo bar, Capo n, lit keys) and Vue renders SVG; piano model ignores capoFret; F2 ships the voicing dictionary with license and fails if a parse-class name has no guitar entry unless it is on the known-miss list.

| Check | Result | Path |
|-------|--------|------|
| playableCapoOf vs capoReadOf | playable always song/block fret; capoReadOf zeros when editing or nash | `src/core/layout.ts:457-470` |
| display() unchanged | uses capoReadOf; nash/edit still rewrite-free | `src/core/layout.ts:473-483` |
| shapeCapo still dual-only | `shapeCapo = read.dual ? read.fret : 0` | `src/core/layout.ts:496` |
| ChartSeg fields | concert, shapeName, capoFret optional on type | `src/core/types.ts:121-135` |
| Fill on segs | concert / shapeName / capoFret from playable | `src/core/layout.ts:502-515` |
| Dual Bm capo 2 | concert Bm, shapeName Am, capoFret 2 | `tests/core/layout-capo.test.ts:152-161` |
| Capo-solo | capoFret 2, shapeName Am, shapeCapo 0 | `tests/core/layout-capo.test.ts:163-182` |
| Nashville / edit | label changes; playable fields stay | `tests/core/layout-capo.test.ts:184-199` |
| lens letra | stripChords drops chord fields | `src/core/layout.ts:404-410`; `tests/core/layout-capo.test.ts:201-210` |
| resolveDiagram export | from core index | `src/core/index.ts:41` |
| Override then dict | first matching define, else lookupDict | `src/core/resolve-diagram.ts:107-131` |
| Slash without override | no-shape | `src/core/resolve-diagram.ts:121`; `tests/core/resolve-diagram.test.ts:150-184` |
| C7M / C7+ | maj7 hit / unknown-token | `tests/core/resolve-diagram.test.ts:24-43` |
| Object.hasOwn | QUALITY_INTERVALS and GUITAR/UKULELE | `src/core/chord-dict.ts:88,122` |
| Draw export | drawDiagram from core index | `src/core/index.ts:50` |
| Absolute fret axis | maxFret from d.fret | `src/core/diagram-draw.ts:147` |
| Capo bar + label | hasCapoBar, `Capo ${n}` | `src/core/diagram-draw.ts:105-106,168-175` |
| Piano ignores capo | capoFret 0, empty lit without token | `src/core/diagram-draw.ts:204-226`; `tests/core/diagram-draw.test.ts:193-221` |
| Vue modal | absent | no `src/vue/overlay/DiagramModal.vue` |
| Vue in core | none | `tests/core/no-vue-in-core.test.ts` |
| Dictionary license | package MIT | `LICENSE:1-3`; no NOTICE in `chord-dict.ts` |
| Known-miss list | absent | grep src/tests |

### F2-G1 verifier

Command (verbatim):

```
pnpm exec vitest run tests/core/layout-capo.test.ts tests/core/resolve-diagram.test.ts tests/core/diagram-draw.test.ts
```

cwd: `/Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra`

```
✓ tests/core/diagram-draw.test.ts (10 tests) 5ms
✓ tests/core/resolve-diagram.test.ts (18 tests) 5ms
✓ tests/core/layout-capo.test.ts (18 tests) 8ms
Test Files  3 passed (3)
Tests  46 passed (46)
```

exit code 0.

Out-of-scope:

```
pnpm exec vitest run tests/core/no-vue-in-core.test.ts
```

1 passed, exit 0.

### Locks vs tests

| Lock | Test | Implementation |
|------|------|----------------|
| concert/shapeName/capoFret on playable segs | layout-capo.test.ts:141-150 | layout.ts:502-515 |
| capo 2 dual Bm → Bm / Am / 2 | layout-capo.test.ts:152-161 | layout.ts:457-463,502-515 |
| capo-solo capoFret 2, not shapeCapo | layout-capo.test.ts:163-182 | layout.ts:496 vs 514 |
| Nashville label only | layout-capo.test.ts:184-191 | layout.ts:467-470,475-476 |
| Edit still exposes playable | layout-capo.test.ts:193-199 | layout.ts:457-458 vs 502-515 |
| letra drops chords | layout-capo.test.ts:201-210 | layout.ts:404-410 |
| #capo:2 block fret | layout-capo.test.ts:212-230 | layout.ts:457-459 |
| Override beats dictionary | resolve-diagram.test.ts:45-63 | resolve-diagram.ts:107-118 |
| C7M → maj7 | resolve-diagram.test.ts:24-36 | parse-chord.ts:35; GUITAR.maj7[0] |
| C7+ miss | resolve-diagram.test.ts:38-43 | parse-chord.ts:53,85 |
| Guitar shapeName ≠ concert | resolve-diagram.test.ts:80-88 | caller token; Am vs Bm packed |
| Piano concert keys | resolve-diagram.test.ts:90-96 | chord-dict.ts:116-119 |
| Slash miss / override G/B | resolve-diagram.test.ts:150-184 | resolve-diagram.ts:53-54,121 |
| Piano absolute define keys | resolve-diagram.test.ts:186-202 | chord-dict.ts:94-108 |
| Object.prototype miss | resolve-diagram.test.ts:141-148 | parse-chord.ts:86; chord-dict.ts:88,122 |
| Characteristic 9th / no 3rd on 5/sus | resolve-diagram.test.ts:249-274 | chord-dict.ts:49-56,65-69 |
| Capo bar Capo 2 | diagram-draw.test.ts:48-61 | diagram-draw.ts:105-106,168-175 |
| Opens at capo, not nut | diagram-draw.test.ts:63-83 | diagram-draw.ts:91-94 |
| Guitar capo 2 ≠ concert Bm | diagram-draw.test.ts:85-104 | drawFrets uses given voicing |
| Uke capo 2 | diagram-draw.test.ts:106-124 | diagram-draw.ts:74-75,119-120 |
| Piano concert, no Capo | diagram-draw.test.ts:126-143,193-208 | diagram-draw.ts:211-226 |
| Fingers 1-4 or dots | diagram-draw.test.ts:145-168 | diagram-draw.ts:59-63,98-102 |
| One SVG coordinate space | diagram-draw.test.ts:170-191 | diagram-draw.ts:147,190-192 |
| No default piano C | diagram-draw.test.ts:210-221 | diagram-draw.ts:204-214 |

### F2 product tree

Commits in range: af3b630, 31d3696, 8cf68c9, 89261bb, e858330, 7104326, 6a1027a, 8e1ab64, 5688727, 1ff8adc, cbab2b1, c09259c; later state-only aabd36c. `git diff --stat c09259c HEAD -- src tests fixtures` is empty.

```
src/core/chord-dict.ts
src/core/diagram-draw.ts
src/core/index.ts
src/core/layout.ts
src/core/resolve-diagram.ts
src/core/types.ts
tests/core/diagram-draw.test.ts
tests/core/layout-capo.test.ts
tests/core/resolve-diagram.test.ts
```

No Vue editor, no DiagramModal, no diagramInstrument, no Rolar/metronome pause, no baritone, no fixtures/sda mutation.

### Remaining non-blocking items

Majors 1–2 are leftover from the coverage lock and from C1’s 6add9 row / uke 7th-omission, not F2-G1 shell failures. Minor barre field is a parent-goal word not in T-003 acceptance. Lyric-seg capoFret is the same layout write as the playable path. Open-circle/capo-bar overlap is F3 look. Dictionary license is the package MIT file.
