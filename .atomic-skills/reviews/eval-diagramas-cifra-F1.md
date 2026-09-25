# evaluationReport — diagramas-cifra F1

evaluationReport:
  planSlug: diagramas-cifra
  phaseId: F1
  verdict: pass
  evaluatedHead: d6591d612ac250a8f4fc7e051c1919cb6a7e5fe3
  productTree: 10dac980d24514d662becc4381c6a5f2b898b56c
  findings:
    - severity: minor
      area: other
      path: src/core/define.ts:8
      summary: "Shared DIR uses optional colon (`:?`). writeMeta / readMeta / chartBody previously required `:`. `{title}` now matches as key title with empty value. Not a hyphen lock fail; DIR still captures define-guitar as one key."
    - severity: minor
      area: other
      path: src/core/define.ts:224
      summary: "DEFINE_HEADER restates META_KEYS plus t/st/artist/composer instead of importing META_KEYS. Current sets match (x_origem, x_youtube, x_strum, x_strum_set included). Drift would move the writeDefines insert point; writeDefines tests do not cover every META_KEYS entry."
    - severity: minor
      area: other
      path: src/core/define.ts:85
      summary: "base-fret uses Number() + isFinite + n<1. keys requires /^-?\\d+$/. base-fret 0x10 serializes as 16; base-fret 1.5 is accepted. Not an F1-G1 fail; unknown-arity miss still holds."
    - severity: note
      area: scope
      path: src/core/parse.ts:151
      summary: "parse() continue-drops miss defines; writeDefines strips every isDefineKey line then inserts the given list (define-directive.test.ts:179-187 asserts replace-all). exportCho identity and rewriteDefineLines keep an unparsed define line (transposeDefineLine returns the raw line on miss). D4 does not call writeDefines. Not a BI lock fail."
    - severity: note
      area: goal
      path: fixtures/define-roundtrip.cho
      summary: "Fixture is a new file outside fixtures/sda with a stub lyric line, not a copy of an SDA chart. Operator ratify was new file outside fixtures/sda, not 013-ele-vive-em-mim.cho. fixtures/sda has zero {define} and zero F1 diff."
  businessIntentCheck:
    value:
      status: pass
      note: "writeMeta keeps {define-guitar:} because define keys are absent from META_KEYS (import-chordpro.ts:345-358, filter 429-434; define-directive.test.ts:190-201). exportCho(src) with n=0 keeps the line (export-cho.ts:14 rewriteDefineLines only when n; export-cho.test.ts:8-15). Open-string G is dropped on semitones:2 rather than relabelled as A with frets 3 2 0 0 0 3 (define.ts:187; export-cho.test.ts:17-27). Movable F becomes G at base-fret 3 with the same grid (export-cho.test.ts:29-36). Piano C keys 0 4 7 becomes D keys 2 6 9 (export-cho.test.ts:38-43)."
    workflow:
      status: pass
      note: "DIR hyphen class [a-zA-Z0-9_-] at define.ts:8; isDefineKey accepts define / define-guitar / define-ukulele (define.ts:27-30). parse() pushes ChordDefine onto ChordProView.defines (parse.ts:151-155, 320-328; types.ts:22-23). writeDefines inserts after DEFINE_HEADER and before lyrics (define.ts:247-267; define-directive.test.ts:162-177). serializeDefine round-trips (define.ts:165-173; define-directive.test.ts:120-141). Fixture fixtures/define-roundtrip.cho is loaded by both test files. exportCho and rewriteToKey share rewriteDefineLines (export-cho.ts:15-23; import-chordpro.ts:533). transpose/setKey use transposeDefine in applyShape (parse.ts:291-294)."
    rules:
      status: pass
      note: "Hyphenated keys are full DIR keys (define-directive.test.ts:24-37). writeMeta does not list define in META_KEYS (define-directive.test.ts:198-201). Bare {define:} infers piano from keys, guitar from 6 frets, ukulele from 4, else miss (define.ts:130-145; define-directive.test.ts:63-117). exportCho({semitones:2}) rewrites the define name together with the shape, or drops the override when any fret is 0 or new base-fret < 1 (define.ts:185-196). D4/Vue does not call writeDefines (grep src/vue: no matches; writeDefines only defined at define.ts:247 and exported at index.ts:37)."
    outOfScope:
      status: pass
      note: "F1 product diff is 9 files: src/core/define.ts, parse.ts, types.ts, index.ts, export-cho.ts, import-chordpro.ts, tests/core/define-directive.test.ts, tests/core/export-cho.test.ts, fixtures/define-roundtrip.cho. No src/vue change. No DiagramModal. No SVG. No voicing dictionary. META_KEYS gained no new x_ key. fixtures/sda untouched. tests/core/no-vue-in-core.test.ts exit 0."
    doneWhen:
      status: pass
      note: "pnpm exec vitest run tests/core/define-directive.test.ts tests/core/export-cho.test.ts → 31 passed, exit 0 (define-directive 25, export-cho 6). parse(src).defines exists (types.ts:23; parse.ts:328; define-directive.test.ts:143-154). writeMeta and identity exportCho keep {define-guitar:}. exportCho semitones:2 aligns define name with transposed shapeName on movable shapes and drops open-string overrides so the name cannot shadow a wrong grid."
  exitGates:
    - id: F1-G1
      status: pass
      note: "Verifier `pnpm exec vitest run tests/core/define-directive.test.ts tests/core/export-cho.test.ts` cwd=/Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra exit 0. Tests 31 passed (25+6). FAILS-when not met: writeMeta does not strip {define-guitar:}; exportCho({semitones:2}) does not leave an open-G define relabelled A; parse(src).defines is present."
    - id: no-vue-in-core
      status: pass
      note: "Out-of-scope check `pnpm exec vitest run tests/core/no-vue-in-core.test.ts` exit 0 (1 test). Grep from ['\"]vue in src/core: no matches."

## Pre-fix1 CRITICAL

Present on 93555e6: `transposeDefineLine` in export-cho.ts rewrote `def.name` and re-serialized frets/keys verbatim. Fixture G `frets 3 2 0 0 0 3` exported as A with the G grid. Piano `{define: C keys 0 4 7}` became D with keys 0 4 7.

Absent on HEAD: `exportCho` calls `rewriteDefineLines` (export-cho.ts:15-23). `transposeDefine` (define.ts:185-196) returns null when any fret is 0; otherwise `baseFret += n` (drop if base < 1) and piano `keys` shift via `shiftKey`. Tests lock drop (export-cho.test.ts:17-27, 45-50), barred bump (29-36), piano shift (38-43), and `transpose(parse(src), 2).defines === parse(exportCho(...)).defines` (52-66). applyShape applies the same function (parse.ts:291-294). rewriteToKey also calls rewriteDefineLines (import-chordpro.ts:533; define-directive.test.ts:268-285).

## Evidence

### Goal

Phase goal: `{define}`, `{define-guitar}`, `{define-ukulele}` round-trip in parse/write; hyphenated keys are not eaten by DIR; writeMeta does not drop defines; parse() exposes `defines` on ChordProView; bare `{define:}` infers piano from keys, guitar from 6 frets, ukulele from 4, else miss; exportCho keeps define lines and transposes define names with the same semitone rewrite as the body, shape-or-drop (Claude F-002); fixture is a new file outside fixtures/sda; D4 must not write defines until this gate is green.

| Check | Result | Path |
|-------|--------|------|
| DIR hyphen | `[a-zA-Z_][a-zA-Z0-9_-]*` | `src/core/define.ts:8` |
| Old parse DIR (no hyphen) removed | `const DIR = /^\s*\{\s*([a-zA-Z_]+)\s*:?\s*([^}]*)\}\s*$/` deleted; parse imports define.DIR | F1 diff `src/core/parse.ts` |
| isDefineKey | define, define-guitar, define-ukulele | `src/core/define.ts:27-30` |
| parseDefineDirective | frets/fingers/base-fret/keys; miss on unknown arity | `src/core/define.ts:64-163` |
| Instrument inference | define-guitar→6, define-ukulele→4, else keys→piano, 6→guitar, 4→ukulele, else miss | `src/core/define.ts:130-145` |
| serializeDefine | `{directive: name base-fret N frets … fingers … keys …}` | `src/core/define.ts:165-173` |
| parse() exposes defines | always `defines: ChordDefine[]` | `src/core/types.ts:22-23`; `src/core/parse.ts:320-328` |
| writeMeta keeps define | filter is META_KEYS + t/st only | `src/core/import-chordpro.ts:426-438` |
| META_KEYS has no define | title…x_strum_set; no define* | `src/core/import-chordpro.ts:345-358` |
| writeDefines after header | splice at lastMeta+1 | `src/core/define.ts:247-267` |
| exportCho n=0 keeps line | rewriteDefineLines skipped when !n | `src/core/export-cho.ts:8,14-23` |
| exportCho n≠0 shape-or-drop | rewriteDefineLines → transposeDefine | `src/core/export-cho.ts:15`; `src/core/define.ts:185-215` |
| transpose/setKey same rewrite | applyShape maps transposeDefine | `src/core/parse.ts:267-294` |
| Fixture outside sda | `fixtures/define-roundtrip.cho` | fixture:6 `{define-guitar: G … frets 3 2 0 0 0 3 …}` |
| fixtures/sda | 0 {define}; 0 F1 diff | git diff d1bb40b^..HEAD -- fixtures/sda |
| D4/Vue writeDefines | none | grep `src/vue`; `src/core/index.ts:37` export only |
| Core exports | parseDefineDirective, serializeDefine, writeDefines, ChordDefine | `src/core/index.ts:37-38` |

### F1-G1 verifier

Command (verbatim):

```
pnpm exec vitest run tests/core/define-directive.test.ts tests/core/export-cho.test.ts
```

cwd: `/Volumes/External/code/titan-chordpro-ui/.worktrees/diagramas-cifra`

```
✓ tests/core/export-cho.test.ts (6 tests) 4ms
✓ tests/core/define-directive.test.ts (25 tests) 6ms
Test Files  2 passed (2)
Tests  31 passed (31)
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
| DIR full key define-guitar / define-ukulele | define-directive.test.ts:24-37 | define.ts:8,27-30 |
| parse guitar/uke/piano + generic inference + unknown arity miss | define-directive.test.ts:39-117 | define.ts:64-163 |
| serialize round-trip | define-directive.test.ts:120-141 | define.ts:165-173 |
| parse().defines, not lyrics | define-directive.test.ts:143-154 | parse.ts:151-155,320-328 |
| writeDefines after META_KEYS, before lyrics | define-directive.test.ts:162-177 | define.ts:247-267 |
| writeMeta keeps define-guitar; META_KEYS excludes define* | define-directive.test.ts:190-201 | import-chordpro.ts:345-358,426-438 |
| fixture has {define-guitar:} | define-directive.test.ts:204-211; export-cho.test.ts:8-15 | fixtures/define-roundtrip.cho:6 |
| open-string drop (not relabel G as A) | export-cho.test.ts:17-27; define-directive.test.ts:213-219,258-265 | define.ts:187 |
| movable shape name+base-fret | export-cho.test.ts:29-36; define-directive.test.ts:221-230 | define.ts:188-193 |
| piano keys shift mod 12 | export-cho.test.ts:38-43; define-directive.test.ts:239-255 | define.ts:175-178,194 |
| view.defines === parse(exportCho).defines | export-cho.test.ts:52-66 | parse.ts:291-294; export-cho.ts:15-23 |
| rewriteToKey same shape-or-drop | define-directive.test.ts:268-285 | import-chordpro.ts:532-533 |

### F1 product tree

Commits in range: d1bb40b, 73982a7, 93555e6, 28dc6be, 871ff98, 3d4b6f9, 10dac98; later state-only d6591d6. `git diff --stat 10dac98 HEAD -- src tests fixtures` is empty.

```
fixtures/define-roundtrip.cho
src/core/define.ts
src/core/export-cho.ts
src/core/import-chordpro.ts
src/core/index.ts
src/core/parse.ts
src/core/types.ts
tests/core/define-directive.test.ts
tests/core/export-cho.test.ts
```

No Vue editor, no SVG, no dictionary, no D4 sheet, no invented `{define}` in `fixtures/sda`.

### Remaining non-blocking items

Minors 1–3 are leftover quality issues from the pre-fix1 Claude review (optional colon, DEFINE_HEADER copy, base-fret Number()). They do not break F1-G1, writeMeta keep, or shape-or-drop. The parse-miss / writeDefines replace-all pair is F4 wiring; F1 D4 lock is that D4 does not write, and it does not.
