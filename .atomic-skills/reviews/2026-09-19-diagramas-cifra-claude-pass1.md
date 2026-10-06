---
verdict: needs_changes
counts: {blocker: 0, critical: 4, major: 6, minor: 3, nit: 0}
reviewer: claude-opus-5[1m]
pass: blind
schema_version: "1.0"
---

## Summary

Four gate-level defects make phases unimplementable as written. (1) The oracle is defined to produce hit/miss per instrument, but F0 explicitly excludes the voicing dictionary and no later phase re-measures coverage — the "BD completo" claim has no owner, no task, and no verifier. (2) F1 requires `exportCho` to "preserve" defines while `exportCho` transposes every bracket chord and can inject `{capo:}`; a preserved define keyed on `shapeName` silently stops matching in the exported file. (3) F4's `{define-guitar: Am}` under capo 2 is unreachable because `capoReadOf` returns fret 0 when `editing || nash` (layout.ts:457-464), and no task supplies `capoFret` outside the display projection. (4) F3's "view tap" collides with two existing owners of the same pixel — `onSurfaceTap` zen toggle and the song-swipe rails, which `preventDefault` and set `swallowClick` for any touch starting in a 64/128px rail.

Also: parenthesized BR extensions (`7M(9)`, `m7(11)`, `6(9)`) present in the corpus have no parse rule; generic `{define:}` instrument inference is unassigned; overrides have no plumbing from parse to Vue; the define fixture location breaks green tests either way.

## Findings

### F-001 [critical] coverage gap — .atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/plan.md:49-51,99-100,132-135

**Evidence:**
```yaml
  - term: oráculo 257
    definition: Table of unique chord names in `fixtures/sda` → parse | UNPARSED |
      AMBIGUOUS → hit/miss per instrument.
...
      outOfScope: Modal de forma, SVG de braço/teclado, dicionario de voicings, parser
        de {define}, folha de editor, prefs de instrumento.
...
    goal: Layout segs expose concert, shapeName, capoFret before dual/Nashville;
      resolveDiagram hits dictionary or file override;
```

**Claim:** The oracle's `hit/miss per instrument` half is unbuildable in F0 (the dictionary is out of F0 scope) and no phase after F0 regenerates it, while no task anywhere builds, sources, or measures the shape dictionary that F2 depends on.

**Impact:** F0-G1 is undecidable: an implementer either violates F0's own `outOfScope` to build a dictionary, or ships a two-column table and the gate passes with the design's stated precondition ("oráculo … antes de chamar o BD de completo") unmet. F2-G1 then goes green with a three-chord stub dictionary: `resolveDiagram` returns a hit for `C`/`G`/`Am` and misses most of a 257-name corpus, and nothing in D0–D4 detects it. The largest single deliverable of the feature (a 3-instrument voicing DB in core, with upstream licensing/attribution and bundle weight) has no task, no output path, and no acceptance.

**Recommendation:** Split the oracle: F0 owns parse-classification columns only — edit the glossary term to drop `hit/miss per instrument`. Add an explicit F2 task with outputs for the dictionary module plus its upstream source/license note, and add an F2-G1 criterion that regenerates the hit/miss columns of `tests/core/chord-oracle.table.json` from the shipped dictionary and fails when the table is stale or when any name classified `parse` has no entry for guitar without being listed in an explicit known-miss list checked into the repo.

**Confidence:** high

---

### F-002 [critical] contradiction — .atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/plan.md:108-111,25-27

**Evidence:**
```yaml
    goal: "`{define}`, `{define-guitar}`, `{define-ukulele}` round-trip in
      parse/write; hyphenated keys are not eaten by DIR; writeMeta does not drop
      defines; exportCho preserves them; fixture on an existing chart; D4 must
      not write defines until this gate is green."
```

**Claim:** "exportCho preserves them" contradicts P3's keying rule, because `exportCho` rewrites every bracket chord (`src/core/export-cho.ts:13-19`) and can prepend `{capo: n}` (lines 20-23), both of which change the `shapeName` the define is matched against.

**Impact:** Silent loss of every custom shape on export. A user with `{define-guitar: Am …}` in a chart exports at +2: chords become `[Bm]`, the define stays `Am`, `shapeName` is now `Bm`, so `resolveDiagram` misses and the shared file shows "Sem forma neste instrumento". Same with `exportCho({capo: 2})`, which changes `capoFret` for every block and therefore every `shapeName`. F1-G1's only stated failure mode is stripping, so verbatim preservation passes the gate while producing a file whose overrides are dead.

**Recommendation:** Decide the rule in F1 and encode it: transpose define names by the same `n` (and recompute for an injected `{capo:}`) inside `exportCho`, or refuse the export path for files containing defines. Add an F1-G1 criterion: `exportCho(src, { semitones: 2 })` on a source with `{define-guitar: Am}` yields a file where the define still resolves for the transposed token; and a second case for `{ capo: 2 }`.

**Confidence:** high

---

### F-003 [critical] dependency break — .atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/plan.md:132-135,182-184

**Evidence:**
```yaml
    goal: Layout segs expose concert, shapeName, capoFret before dual/Nashville;
...
    goal: "Edit mode opens the same large modal from ChordDialog Forma (writable
      grid); saves {define-guitar: Am} when capo 2 and lyric is Bm; piano saves
      concert keys; global DB unchanged; D1 must already be green."
```

**Claim:** No task produces `capoFret` in the edit or Nashville projections, because `capoReadOf` short-circuits to fret 0 for both (`src/core/layout.ts:457-464: if (editing || nash) return { fret: 0, dual: false }`), and F2 only says the fields appear "before dual/Nashville" without stating that they must be computed independently of the projection `display()` consumes.

**Impact:** F4 is blocked at implementation time: in `mode=edit` the segs carry `capoFret: 0` and `shapeName === concert === Bm`, so the sheet saves `{define-guitar: Bm}` — precisely the failure F4-G1 names, with no code path available to avoid it. Under Nashville + capo, F3's "modal shows the playable name" shows the concert name instead of the fretted shape. The obvious workaround — making `capoReadOf` return the real fret in edit/nash — changes `display()` itself, rewriting chords to shapes in the edit pane and in Nashville, breaking existing `tests/core/layout-capo.test.ts` expectations.

**Recommendation:** Add an F2 task for a diagram projection separate from `display()`: compute `concert`/`shapeName`/`capoFret` from the block's own capo (`blockCapo` else song capo) regardless of `editing`/`nash`, leaving `display()` and `shapeCapo` untouched, with F2-G1 criteria asserting `capoFret === 2` for `editing: true` and for `lens: 'nashville'` while `chord` output is unchanged. State in F4 that the sheet reads capo from source `{capo:}` / `#capo:n` (`useBlockEdit` already takes `songCapo`).

**Confidence:** high

---

### F-004 [critical] dependency break — .atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/plan.md:157-161,168-176

**Evidence:**
```yaml
    goal: View tap opens a large modal (full screen on phone/tablet, wide on
      desktop); ...
        - id: F3-G1
          description: Vue modal, prefs, and pause tests green. FAILS when tap leaves
            auto-scroll running or lens letra still opens the modal.
```

**Claim:** F3 adds a view-mode tap target on chords without reconciling the two existing owners of that pixel: `onSurfaceTap` (`src/vue/ChordproViewer.vue:1618-1636`) toggles zen / restores chrome for any click not matching `button,input,textarea,select,a,[role='button'],figure`, and `useSongSwipe.onDown` calls `preventDefault()` and sets `swallowClick = last.peeking || last.axis === 'horizontal'` (`useSongSwipe.ts:112,127`) for every touch starting in a rail, with `axis` forced to `'horizontal'` on touch in rails (`song-swipe.ts:109-110`).

**Impact:** Two concrete user-visible breaks. (a) A chord tap bubbles to the surface handler, so opening the diagram modal also toggles zen/hides chrome — and when chrome is hidden the surface handler returns after `showChrome()`, so the reader's first chord tap is spent restoring chrome. (b) On touch, chords inside the rails (24–88px and the last 64px on a phone; 128px on tablet) never receive a click: the pointerdown is `preventDefault`ed and the click is eaten — roughly a sixth of phone chart width has dead diagrams, with no rendered difference to explain it. F3-G1's failure list mentions neither, and a jsdom modal test will not surface either.

**Recommendation:** Require the chord hit-target to carry `role="button"` (honored by both bail-out selector lists) and add F3-G1 criteria: a chord tap opens the modal and does not toggle zen or hide chrome; a simulated touch tap at a `prev-rail`/`next-rail` x-coordinate on a chord opens the modal and commits no song change; a chord tap while chrome is hidden opens the modal.

**Confidence:** high

---

### F-005 [major] coverage gap — .atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/plan.md:62-65

**Evidence:**
```yaml
    goal: "`parseChordToken` classifies every unique name in `fixtures/sda` (257) as
      parse, UNPARSED, or AMBIGUOUS; aliases `7M`→maj7, `4`/`sus`→sus4,
      `9`→add9, `2`→sus2; `7+` and quote junk miss; zero invented voicings; no
      Vue in core."
```

**Claim:** The alias table has no rule for parenthesized BR extensions, which are present throughout the corpus: `Ab7M(9)`, `D7M(9)`, `C7M(9)`, `Db6(9)`, `G7(9)`, `Gm7(11)`, `Dm(3b)/F#` (fixtures/sda/063, 012, 013, h016, 074, 100).

**Claim rationale is in the evidence; impact follows.**

**Impact:** F0-G1's failure condition ("a token is guessed as a quality instead of UNPARSED or AMBIGUOUS") is undecidable for these tokens: one implementer maps `7M(9)`→maj9, another composes maj7+add9, another marks them AMBIGUOUS. All three pass the gate, and each yields a different dictionary key, so D2 hit rates and D4 define names diverge for a large slice of the corpus — a `C7M(9)` drawn as `Cmaj7` is exactly the "mente no ensaio" failure F0 exists to prevent.

**Recommendation:** Extend F0's alias rules and the task acceptance with explicit cases for parenthesized extensions — at minimum `7M(9)`, `6(9)`, `7(9)`, `m7(11)`, `m(3b)` — each pinned to a quality or to AMBIGUOUS, and add them as named assertions in `tests/core/parse-chord-token.test.ts`.

**Confidence:** high

---

### F-006 [major] coverage gap — .atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/plan.md:108-111,132-135

**Evidence:**
```yaml
    goal: "`{define}`, `{define-guitar}`, `{define-ukulele}` round-trip in
      parse/write; hyphenated keys are not eaten by DIR; writeMeta does not drop
      defines; exportCho preserves them;
```

**Claim:** Neither F1 nor F2 specifies the payload grammar (`base-fret N frets … fingers …` vs `keys 0 4 7`) or the instrument inference for bare `{define:}` (keys→piano, 6 positions→guitar, 4→ukulele, else miss), yet F2's `resolveDiagram` must match "same instrument" to select an override.

**Impact:** The official ChordPro form `{define: Am base-fret 1 frets …}` has undefined routing: one implementer treats bare defines as guitar-only, another as applying to all instruments, another drops them. Result: a chart that uses the standard directive silently misses on ukulele/piano, and malformed payloads (5 positions, missing `frets`) have no defined outcome, so the round-trip test can pass while resolution is wrong.

**Recommendation:** Add to F1's goal and F1-G1 criteria: the payload grammar for frets/fingers/keys, the inference table for bare `{define:}` (keys→piano, 6→guitar, 4→ukulele, otherwise miss), and malformed-payload→miss cases with at least one assertion each in `tests/core/define-directive.test.ts`.

**Confidence:** high

---

### F-007 [major] dependency break — .atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/plan.md:132-135,157-161

**Evidence:**
```yaml
    goal: Layout segs expose concert, shapeName, capoFret before dual/Nashville;
      resolveDiagram hits dictionary or file override; guitar/ukulele SVG draws
      the hand shape with capo bar and Capo n;
```

**Claim:** No task defines the carrier that moves parsed defines from the source to the caller of `resolveDiagram`: F1 ends at parse/serialize round-trip, F2 assumes an `overrides` argument, and F3/F4 render in Vue with no named API to obtain it.

**Impact:** F2-G1 can go green with overrides handed in by the test literal, and F3 then has no defined source: the implementer either re-parses the raw source inside the Vue modal (duplicating core logic and diverging from the overlay/edit projections) or reaches into internals. Defines edited in F4 have no specified path back into the live view, so a saved shape may not appear until remount.

**Recommendation:** Name the carrier in F1 — e.g. `parse()` returns `defines` on `ChordProView`, exported from the core index and surfaced to Vue via the existing layout/view flow — and add an F1-G1 criterion asserting `parse(src).defines` contents plus an F4-G1 criterion that a saved define is visible on the next open without remount.

**Confidence:** medium

---

### F-008 [major] viability — .atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/plan.md:110,192,218

**Evidence:**
```yaml
      defines; exportCho preserves them; fixture on an existing chart; D4 must
...
          description: Editor sheet writes define on an existing fixture and round-trips.
...
- **P6 Real fixtures** — Use `fixtures/sda` for the oracle. A `{define}` test fixture is a new directive on an existing chart, not invented lyrics.
```

**Claim:** "a new directive on an existing chart" is ambiguous between editing an `fixtures/sda/*.cho` in place and adding a derived file, and both readings turn currently-green suites red: `tests/demo/sda-fixtures.test.ts:20,42-44,50` assert `files.length === 148`, `manifest.json` has 148 entries with `every(f => choFiles().includes(f.path))`, and the demo list is 148; while `fixtures/sda/013-ele-vive-em-mim.cho` is asserted structurally by `tests/core/parse.test.ts:35`, `tests/core/timeline-charts.test.ts`, and the autoscroll corpus.

**Impact:** F1-G1/F4-G1 turn green while unrelated suites go red, or the implementer mutates a corpus file that the design premise and F0's oracle treat as define-free, silently coupling the D0 corpus to D1 fixtures. Either way the branch cannot land without a second, unplanned fix.

**Recommendation:** State in F1 and F4 that the define fixture is a new file outside `fixtures/sda/` (e.g. `fixtures/define-guitar-ele-vive.cho`, copied verbatim from `sda/013-ele-vive-em-mim.cho` plus the directive), and add a criterion that `tests/demo/sda-fixtures.test.ts` stays green.

**Confidence:** high

---

### F-009 [major] ambiguity — .atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/plan.md:157-161,168-170

**Evidence:**
```yaml
      diagramInstrument, default guitar silent; host capability diagrams
      defaults true; tap pauses auto-scroll and metronome until the modal
      closes; lens letra has no modal; Nashville modal shows the playable name.
...
          description: Vue modal, prefs, and pause tests green. FAILS when tap leaves
            auto-scroll running or lens letra still opens the modal.
```

**Claim:** "pauses … until the modal closes" states no restore semantics, and the only stated failure is scroll left running, so an implementation that starts both on close passes the gate.

**Impact:** A musician with auto-scroll off and metronome off taps a chord to check a shape; on close the viewer starts scrolling the chart and clicking a metronome that was never on — mid-service, with the reader's hands on the instrument. The inverse case (scroll was running, not resumed) is equally unpinned.

**Recommendation:** Change F3's goal to "resumes only what was running at tap time" and add two F3-G1 criteria: with both off, closing leaves both off; with scroll and metronome running, closing resumes both at their prior state.

**Confidence:** high

---

### F-010 [major] contradiction — .atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/plan.md:132-135,149-151,216

**Evidence:**
```yaml
            command: pnpm exec vitest run tests/core/layout-capo.test.ts
              tests/core/resolve-diagram.test.ts tests/core/diagram-draw.test.ts
...
- **P4 Core has no Vue** — Parse, dictionary, resolve, `{define}` live in `src/core`. SVG and modal live in Vue.
```

**Claim:** F2's goal assigns the SVG draw ("guitar/ukulele SVG draws the hand shape with capo bar and Capo n") while its verifier tests it at `tests/core/diagram-draw.test.ts`, contradicting P4's placement of SVG in Vue; no task defines the core/Vue cut for draw geometry.

**Impact:** Either the implementer generates SVG markup inside `src/core` — passing `no-vue-in-core` (it only forbids Vue imports) while violating P4 and leaving F3's Vue component with nothing to own — or puts geometry in the Vue component, in which case `tests/core/diagram-draw.test.ts` cannot meaningfully exist and F2-G1 fails on a missing file. The capo-bar assertion that F2-G1 names ("guitar draw uses concert voicing under capo 2") lands on whichever side won, so D2 can go green with the geometry untested.

**Recommendation:** Split F2 explicitly: a pure core function returning a draw model (dots, muted strings, barre, capo bar fret, `Capo n` label, lit keys) tested in `tests/core/diagram-draw.test.ts`, and a Vue SVG component that only renders that model, tested in `tests/vue/`. Add the Vue file to F2's or F3's verifier command.

**Confidence:** medium

---

### F-011 [minor] coverage gap — .atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/plan.md:159

**Evidence:**
```yaml
      diagramInstrument, default guitar silent; host capability diagrams
      defaults true;
```

**Claim:** `diagrams` default-true inverts the established `ViewerCapabilities` convention — every existing flag is opt-in and off by default (`src/vue/public.ts:56-68`) — and no task covers the type addition or `docs/CONSUMER.md`.

**Impact:** An implementer following the surrounding pattern writes `!!caps.diagrams`, so any host that already passes `capabilities: { sourcePane: true }` loses diagrams entirely while the plan claims default on; and hosts cannot discover the flag because the documented capability list is not updated.

**Recommendation:** Add an F3-G1 criterion that `capabilities: {}` and `capabilities: { sourcePane: true }` both render the modal (`caps.diagrams !== false`) and only `diagrams: false` disables it; add `src/vue/public.ts` and `docs/CONSUMER.md` to F3's outputs.

**Confidence:** high

---

### F-012 [minor] coverage gap — .atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/plan.md:168-176

**Evidence:**
```yaml
          description: Vue modal, prefs, and pause tests green. FAILS when tap leaves
            auto-scroll running or lens letra still opens the modal.
...
            command: pnpm exec vitest run tests/vue/diagram-modal.test.ts
              tests/core/no-vue-in-core.test.ts
```

**Claim:** The criterion claims prefs coverage but the command names no persistence test, so `diagramInstrument` surviving song change and remount via `ChartStore` is never required to be asserted.

**Impact:** F3 can go green with the instrument selector held in component state; the musician re-picks piano on every chart, which is the stated product requirement for the preference.

**Recommendation:** Add `tests/vue/diagram-prefs.test.ts` to the F3-G1 command with assertions that the chosen instrument is written through the injected `ChartStore` (not `localStorage` directly) and survives a source swap plus remount.

**Confidence:** high

---

### F-013 [minor] ambiguity — .atomic-skills/projects/titan-chordpro-ui/diagramas-cifra/plan.md:114,138,164,186

**Evidence:**
```yaml
    subPhaseCount: 0
```

**Claim:** F1–F4 carry no tasks, scope boundaries, or per-task acceptance (F0 has 2 tasks with explicit acceptance and outputs), so a single goal sentence bundling 4–6 deliverables plus one vitest command is the entire specification for roughly 80% of the work.

**Impact:** Ordering and file ownership inside each phase are unconstrained: nothing pins which files F2 creates, whether F3 writes any core code, or what F4 may not touch — the conditions under which the gaps in F-003, F-006, F-007, and F-010 arise.

**Recommendation:** Before starting F1, decompose F1–F4 into tasks with outputs, acceptance, and scopeBoundary at the same granularity as F0's T-001/T-002.

**Confidence:** medium

## Questions (non-findings)

- plan.md:62 — Is `257` regenerated by `scripts/build-chord-oracle.mjs` or asserted as a literal? Malformed corpus brackets (`[ Je` in `h441-vencendo-vem-jesus.cho:14`, `[us irá so` in `046-verei-jesus-h455.cho:37`) change whether lyric fragments count toward the denominator.
- plan.md:157 — On desktop, does the "wide modal" keep the chart's scroll position and `contentHeight` untouched while open, given the auto-scroll clock is paused rather than stopped?
- plan.md:184 — When the same chart already has `{define-guitar: Am}` and the editor saves a new grid for `Am`, is the existing directive replaced in place or appended?

## Out of scope

- Diagram list/strip in the chart flow (Non-goal).
- Default voicing dictionary serialized into the `.cho` (Non-goal).
- Ukulele baritone / drop-D (Non-goal).
- PDF diagrams (Non-goal).
- Cifra Club as shape source (Non-goal).
- `score.ts` / `ScoreEditor` guitar|piano melody notation (Non-goal: Vue/score domain).
