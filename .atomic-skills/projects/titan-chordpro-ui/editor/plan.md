---
schemaVersion: "0.1"
slug: editor
title: Editor ChordPro — `titan-chordpro-ui`
version: "1.0"
status: active
started: 2026-08-29T11:08:20.266Z
lastUpdated: 2026-08-29T11:08:20.266Z
branch: plan/editor
currentPhase: F0
parallelismAllowed: false
principles:
  - id: P1
    title: Source ChordPro is SoT
    body: Every edit command mutates the source string and re-parses; ViewModel is a
      read projection, never the persist path.
  - id: P2
    title: Gates over mega-DONE
    body: Ship E0→E4 with per-gate acceptance rows and fixtures; do not claim
      “editor complete” without the gate’s criteria green.
  - id: P3
    title: Visual-first, source on demand
    body: In `edit`, in-place is the primary gesture; `sourcePane` is a capability
      toggle, not a third host mode.
  - id: P4
    title: Stable edit layout
    body: Fit/reflow off (or frozen) in `edit`; reset transpose to original source
      on enter `edit`; never patch the transposed display into the host file.
  - id: P5
    title: Host owns shell and media
    body: Bridge is `source` in/out + `view`|`edit` + dirty + capabilities + image
      resolve/upload; no HTML/DOM to the host; sanitize at host boundary.
  - id: P6
    title: Real fixtures only
    body: Use `fixtures/`; add a real image fixture before E4 DONE; do not invent
      chart content.
glossary:
  - term: Source-SoT
    definition: The ChordPro string is the editable truth; UI projections write
      patches into it.
  - term: E0–E4
    definition: Vertical delivery gates from the design (meta/source pane → in-place
      → WYSIWYG → TAB → images).
  - term: EditorHostBridge
    definition: Minimal host contract (`source`, `mode`, `capabilities`,
      change/dirty/media callbacks).
  - term: convert-on-edit
    definition: OnSong (or mixed) input normalizes to canonical ChordPro when
      editing; session/export stay ChordPro.
  - term: capabilities
    definition: Init flags `{ sourcePane, inPlace, wysiwyg, tab, images }` so SDA
      can enable a subset on day 1.
phases:
  - id: F0
    slug: editor-f0-scaffold-e0-view-edit-source-pane-meta
    title: Scaffold + E0 (view↔edit, source pane, meta)
    goal: Greenfield package boots with `view`|`edit`, source pane + preview sync,
      editable meta, host dirty/`onSourceChange`, transpose reset on enter edit;
      SPEC/VISAO/handoff aligned for editor E0.
    dependsOn: []
    subPhaseCount: 3
    exitGate:
      summary: 2 criteria to meet
      criteria:
        - id: F0-G1
          description: E0 vitest files green (mode, meta, source round-trip, dirty,
            transpose reset).
          status: pending
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/core/e0-source-session.test.ts
              tests/vue/e0-bridge.test.ts
            expectExitCode: 0
        - id: F0-G2
          description: No Vue imports in src/core.
          status: pending
          verifier:
            kind: shell
            command: "! rg -n \"from ['\\\"]vue['\\\"]\" src/core"
            expectExitCode: 0
    summary: "Scaffold do pacote + modo view/edit com source pane, meta e bridge dirty."
    status: active
    businessIntent:
      value: UI ChordPro view+edit com Source-SoT e bridge SDA (sda-v2 primeiro).
      workflow: Alinhar docs SoT → scaffold core/Vue sem Vue em core → E0 source pane
        + meta + dirty + reset transpose ao entrar em edit.
      rules: Source ChordPro é SoT; ViewModel só leitura; fit/reflow e transpose off
        no edit; fixtures reais; host recebe string/dirty/media não HTML.
      outOfScope: E1–E4 (fases seguintes); collab; shell titan-chordpro; multicifra;
        player sync; fretboard; VM↔serialize como caminho feliz.
      doneWhen: SPEC com aceite E0; vitest e0-source-session e e0-bridge verdes; zero
        imports Vue em src/core.
  - id: F1
    slug: editor-f1-e1-in-place-chord-lyric-patches
    title: E1 In-place chord/lyric patches
    goal: Click/edit chord or lyric segment patches the ChordPro source at stable
      offsets and re-parses; oracle is string-diff against fixtures.
    dependsOn:
      - F0
    subPhaseCount: 0
    exitGate:
      summary: 1 criterion to meet
      criteria:
        - id: F1-G1
          description: E1 source-map and in-place Vue tests green on real fixtures.
          status: pending
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/core/source-map.test.ts
              tests/vue/e1-inplace.test.ts
            expectExitCode: 0
    summary: "Patches in-place de acorde/letra no source via mapa de offsets."
    status: pending
  - id: F2
    slug: editor-f2-e2-wysiwyg-structural-commands
    title: E2 WYSIWYG structural commands
    goal: Command bus mutates source for common structure (sections, line breaks,
      common directives) without claiming pixel-perfect equals file.
    dependsOn:
      - F1
    subPhaseCount: 0
    exitGate:
      summary: 1 criterion to meet
      criteria:
        - id: F2-G1
          description: E2 command-bus and Vue structural tests green.
          status: pending
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/core/edit-commands.test.ts
              tests/vue/e2-structural.test.ts
            expectExitCode: 0
    summary: "Command bus estrutural (seções/diretivas) com chrome WYSIWYG gated."
    status: pending
  - id: F3
    slug: editor-f3-e3-tablatura-editavel
    title: E3 Tablatura editável
    goal: Edit sot/eot tab sections in source with round-trip on the existing TAB
      fixture.
    dependsOn:
      - F2
    subPhaseCount: 0
    exitGate:
      summary: 1 criterion to meet
      criteria:
        - id: F3-G1
          description: E3 tab tests green on 013-ele-vive-em-mim.cho.
          status: pending
          verifier:
            kind: shell
            command: pnpm exec vitest run tests/core/tab-block.test.ts
              tests/vue/e3-tab.test.ts
            expectExitCode: 0
    summary: "Edição de blocos de tablatura com round-trip na fixture 013."
    status: pending
  - id: F4
    slug: editor-f4-e4-imagens-partitura-media-bridge
    title: E4 Imagens (partitura) + media bridge
    goal: Insert image refs into source via host upload/resolve; fixture + directive
      syntax locked; E4 acceptance green.
    dependsOn:
      - F3
    subPhaseCount: 0
    exitGate:
      summary: 1 criterion to meet
      criteria:
        - id: F4-G1
          description: E4 image fixture exists and image-ref/e4 tests green.
          status: pending
          verifier:
            kind: shell
            command: test -f fixtures/with-image.cho && pnpm exec vitest run
              tests/core/image-ref.test.ts tests/vue/e4-image.test.ts
            expectExitCode: 0
    summary: "Diretiva de imagem + bridge de mídia do host (upload/resolve)."
    status: pending
references: []
---

# Editor ChordPro — `titan-chordpro-ui`

## 1. Context

Implement the ratified editor design: Source ChordPro as SoT, view↔edit surface, delivery gates E0–E4, SDA-first host bridge. Repo is greenfield (no `src/` yet); F0 establishes scaffold + E0. verified_by: `projects/titan-chordpro-ui/editor/design.md`, `docs/NAMING.md`, `docs/VISAO.md`.

## 2. Inviolable principles

- **P1 Source ChordPro is SoT** — Every edit command mutates the source string and re-parses; ViewModel is a read projection, never the persist path.
- **P2 Gates over mega-DONE** — Ship E0→E4 with per-gate acceptance rows and fixtures; do not claim “editor complete” without the gate’s criteria green.
- **P3 Visual-first, source on demand** — In `edit`, in-place is the primary gesture; `sourcePane` is a capability toggle, not a third host mode.
- **P4 Stable edit layout** — Fit/reflow off (or frozen) in `edit`; reset transpose to original source on enter `edit`; never patch the transposed display into the host file.
- **P5 Host owns shell and media** — Bridge is `source` in/out + `view`|`edit` + dirty + capabilities + image resolve/upload; no HTML/DOM to the host; sanitize at host boundary.
- **P6 Real fixtures only** — Use `fixtures/`; add a real image fixture before E4 DONE; do not invent chart content.

## 3. Phase tree

_(Canonical list in frontmatter `phases:`. aiDeck renders the tree visually when running.)_
