# Editor ChordPro — `titan-chordpro-ui`

Implement the ratified editor design: Source ChordPro as SoT, view↔edit surface, delivery gates E0–E4, SDA-first host bridge. Repo is greenfield (no `src/` yet); F0 establishes scaffold + E0. verified_by: `projects/titan-chordpro-ui/editor/design.md`, `docs/NAMING.md`, `docs/VISAO.md`.

## Inviolable principles

- **P1 Source ChordPro is SoT** — Every edit command mutates the source string and re-parses; ViewModel is a read projection, never the persist path.
- **P2 Gates over mega-DONE** — Ship E0→E4 with per-gate acceptance rows and fixtures; do not claim “editor complete” without the gate’s criteria green.
- **P3 Visual-first, source on demand** — In `edit`, in-place is the primary gesture; `sourcePane` is a capability toggle, not a third host mode.
- **P4 Stable edit layout** — Fit/reflow off (or frozen) in `edit`; reset transpose to original source on enter `edit`; never patch the transposed display into the host file.
- **P5 Host owns shell and media** — Bridge is `source` in/out + `view`|`edit` + dirty + capabilities + image resolve/upload; no HTML/DOM to the host; sanitize at host boundary.
- **P6 Real fixtures only** — Use `fixtures/`; add a real image fixture before E4 DONE; do not invent chart content.

## Glossary

- **Source-SoT** — The ChordPro string is the editable truth; UI projections write patches into it.
- **E0–E4** — Vertical delivery gates from the design (meta/source pane → in-place → WYSIWYG → TAB → images).
- **EditorHostBridge** — Minimal host contract (`source`, `mode`, `capabilities`, change/dirty/media callbacks).
- **convert-on-edit** — OnSong (or mixed) input normalizes to canonical ChordPro when editing; session/export stay ChordPro.
- **capabilities** — Init flags `{ sourcePane, inPlace, wysiwyg, tab, images }` so SDA can enable a subset on day 1.

## F0 — Scaffold + E0 (view↔edit, source pane, meta)

Goal: Greenfield package boots with `view`|`edit`, source pane + preview sync, editable meta, host dirty/`onSourceChange`, transpose reset on enter edit; SPEC/VISAO/handoff aligned for editor E0.

```yaml
exit_gate:
  - id: F0-G1
    description: E0 vitest files green (mode, meta, source round-trip, dirty, transpose reset).
    verifier: { kind: shell, command: "pnpm exec vitest run tests/core/e0-source-session.test.ts tests/vue/e0-bridge.test.ts", expectExitCode: 0 }
  - id: F0-G2
    description: No Vue imports in src/core.
    verifier: { kind: shell, command: "! rg -n \"from ['\\\"]vue['\\\"]\" src/core", expectExitCode: 0 }
```



### T-001 Align product SoT docs for editor E0

- Files: docs/VISAO.md, SPEC.md, design-handoff/01-screens.md, AGENTS.md
- scopeBoundary: Do not implement src/; do not change fixtures/; do not invent npm package names beyond naming lock.
- acceptance: SPEC.md names E0 acceptance; design-handoff/01-screens.md separates view vs edit; AGENTS.md points at editor design; SPEC no longer marks ChordPro editor as Future non-goal for E0 path
- verifier: { kind: shell, command: "rg -n 'E0|Source-SoT|edit surface' SPEC.md design-handoff/01-screens.md AGENTS.md docs/VISAO.md", expectExitCode: 0 }
- RED→GREEN: Fail the rg until SPEC/handoff/AGENTS/VISAO match design; then docs pass.

### T-002 Scaffold core + Vue package entries

- Files: package.json, pnpm-workspace.yaml, tsconfig.json, vitest.config.ts, src/core/index.ts, src/vue/index.ts, src/vue/ChordproViewer.vue, README.md
- scopeBoundary: No in-place chord mapper yet; no TAB editor; no image directive; no React/CE binding; no monorepo merge with gen.
- acceptance: pnpm test runs; src/core/index.ts exports without Vue; ChordproViewer.vue accepts mode view|edit; rg finds no vue import under src/core
- verifier: { kind: shell, command: "pnpm test && test -f src/core/index.ts && test -f src/vue/ChordproViewer.vue && ! rg -n \"from ['\\\"]vue['\\\"]\" src/core", expectExitCode: 0 }
- RED→GREEN: Empty repo fails pnpm test; scaffold makes it green with core isolation.

### T-003 E0 source pane + meta + host bridge

- Files: src/core/controller.ts, src/core/edit/source-session.ts, src/vue/ChordproViewer.vue, src/vue/edit/SourcePane.vue, src/vue/edit/MetaFields.vue, tests/core/e0-source-session.test.ts, tests/vue/e0-bridge.test.ts
- scopeBoundary: No WYSIWYG structural commands; no in-place lyric/chord DOM mapping; no image directive; no fit-mode editing.
- acceptance: e0-source-session.test.ts proves transpose reset on enter edit and meta writes into source; e0-bridge.test.ts proves SourcePane onSourceChange and dirty; fit not used as edit layout truth
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/e0-source-session.test.ts tests/vue/e0-bridge.test.ts", expectExitCode: 0 }
- RED→GREEN: Tests fail without session; implement source-session + Vue wiring until green.
## F1 — E1 In-place chord/lyric patches

Goal: Click/edit chord or lyric segment patches the ChordPro source at stable offsets and re-parses; oracle is string-diff against fixtures.

```yaml
exit_gate:
  - id: F1-G1
    description: E1 source-map and in-place Vue tests green on real fixtures.
    verifier: { kind: shell, command: "pnpm exec vitest run tests/core/source-map.test.ts tests/vue/e1-inplace.test.ts", expectExitCode: 0 }
```



### T-001 Source offset map for lyrics lines

- Files: src/core/edit/source-map.ts, tests/core/source-map.test.ts
- scopeBoundary: No DOM contenteditable yet; no section rewrite commands; no TAB grid editor.
- acceptance: source-map.test.ts maps chord and lyric spans on fixtures/jesus-tu-es-a-minha-vida-1.cho; patch changes chord; map errors when transposeSemitones is not 0
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/source-map.test.ts", expectExitCode: 0 }
- RED→GREEN: Write failing map tests on fixture; implement mapper.

### T-002 Vue in-place edit gestures

- Files: src/vue/edit/InPlaceChord.vue, src/vue/ChordproViewer.vue, tests/vue/e1-inplace.test.ts
- scopeBoundary: No structural section insert/delete UI; no image upload UI; do not edit under active fit-mode.
- acceptance: e1-inplace.test.ts updates source via source-map on chord commit in edit mode; gesture no-ops in view mode
- verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/e1-inplace.test.ts", expectExitCode: 0 }
- RED→GREEN: Component tests fail; wire gestures to patch API.
## F2 — E2 WYSIWYG structural commands

Goal: Command bus mutates source for common structure (sections, line breaks, common directives) without claiming pixel-perfect equals file.

```yaml
exit_gate:
  - id: F2-G1
    description: E2 command-bus and Vue structural tests green.
    verifier: { kind: shell, command: "pnpm exec vitest run tests/core/edit-commands.test.ts tests/vue/e2-structural.test.ts", expectExitCode: 0 }
```



### T-001 Edit command bus on source

- Files: src/core/edit/commands.ts, tests/core/edit-commands.test.ts
- scopeBoundary: No CRDT/collab; no OnSong dual-SoT; no image commands (E4).
- acceptance: edit-commands.test.ts inserts or renames section markers on a fixtures cho sample and re-parses; unmappable command returns explicit error; never writes transposed display chords
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/edit-commands.test.ts", expectExitCode: 0 }
- RED→GREEN: Failing command tests; implement bus.

### T-002 Vue structural edit chrome

- Files: src/vue/edit/StructuralToolbar.vue, src/vue/ChordproViewer.vue, tests/vue/e2-structural.test.ts
- scopeBoundary: Do not replace source pane; do not enable under view; no TAB-specific UI (E3).
- acceptance: e2-structural.test.ts shows StructuralToolbar only when edit and capabilities.wysiwyg; actions dispatch commands.ts and refresh preview
- verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/e2-structural.test.ts", expectExitCode: 0 }
- RED→GREEN: Tests red without toolbar; wire to commands.
## F3 — E3 Tablatura editável

Goal: Edit sot/eot tab sections in source with round-trip on the existing TAB fixture.

```yaml
exit_gate:
  - id: F3-G1
    description: E3 tab tests green on 013-ele-vive-em-mim.cho.
    verifier: { kind: shell, command: "pnpm exec vitest run tests/core/tab-block.test.ts tests/vue/e3-tab.test.ts", expectExitCode: 0 }
```



### T-001 Tab block parse + patch helpers

- Files: src/core/edit/tab-block.ts, tests/core/tab-block.test.ts
- scopeBoundary: No fretboard diagrams; no audio sync; no new SoT format.
- acceptance: tab-block.test.ts loads fixtures/ministerio-tons/013-ele-vive-em-mim.cho, locates tab spans, patches inside block, round-trips sot/eot
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/tab-block.test.ts", expectExitCode: 0 }
- RED→GREEN: Failing tests on 013 fixture; implement helpers.

### T-002 Vue tab editor surface

- Files: src/vue/edit/TabEditor.vue, src/vue/ChordproViewer.vue, tests/vue/e3-tab.test.ts
- scopeBoundary: Do not invent non-fixture tab songs; no image insert here.
- acceptance: e3-tab.test.ts edits tab via TabEditor.vue in edit with capabilities.tab and writes source; view mode read-only
- verifier: { kind: shell, command: "pnpm exec vitest run tests/vue/e3-tab.test.ts", expectExitCode: 0 }
- RED→GREEN: Vue tests fail; connect TabEditor.
## F4 — E4 Imagens (partitura) + media bridge

Goal: Insert image refs into source via host upload/resolve; fixture + directive syntax locked; E4 acceptance green.

```yaml
exit_gate:
  - id: F4-G1
    description: E4 image fixture exists and image-ref/e4 tests green.
    verifier: { kind: shell, command: "test -f fixtures/with-image.cho && pnpm exec vitest run tests/core/image-ref.test.ts tests/vue/e4-image.test.ts", expectExitCode: 0 }
```


### T-001 Lock image directive + fixture

- Files: docs/image-directive.md, fixtures/manifest.json, fixtures/with-image.cho, fixtures/media/README.md
- scopeBoundary: Do not commit large binaries; use small placeholder plus documented ref; do not invent full songs beyond minimal image fixture wrapper.
- acceptance: docs/image-directive.md documents syntax; fixtures/with-image.cho references a media ref; fixtures/manifest.json lists with-image
- verifier: { kind: shell, command: "test -f fixtures/with-image.cho && rg -n 'image' fixtures/with-image.cho docs/image-directive.md && rg -n 'with-image' fixtures/manifest.json", expectExitCode: 0 }
- RED→GREEN: Missing fixture fails; add directive doc + fixture.

### T-002 Media bridge + insert command

- Files: src/core/edit/image-ref.ts, src/vue/edit/InsertImage.vue, tests/core/image-ref.test.ts, tests/vue/e4-image.test.ts
- scopeBoundary: Host storage only via uploadImage/resolveImageUrl; no data-URL SoT; no collab.
- acceptance: image-ref.test.ts and e4-image.test.ts call uploadImage, write directive ref into source, resolve via resolveImageUrl; UI gated by capabilities.images
- verifier: { kind: shell, command: "pnpm exec vitest run tests/core/image-ref.test.ts tests/vue/e4-image.test.ts", expectExitCode: 0 }
- RED→GREEN: Tests fail without bridge; implement.
