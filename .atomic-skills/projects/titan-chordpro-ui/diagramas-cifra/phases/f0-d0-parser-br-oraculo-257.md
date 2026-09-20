---
schemaVersion: "0.1"
slug: diagramas-cifra-f0-d0-parser-br-oraculo-257
title: D0 Parser BR + oráculo 257
summary: Classificar os 257 nomes do corpus SDA e parsear o dialeto BR.
goal: "`parseChordToken` classifies every unique name in `fixtures/sda` (257) as
  parse, UNPARSED, or AMBIGUOUS; aliases `7M`→maj7, `7M(9)`→maj9,
  `4`/`sus`→sus4, `9`→add9, `2`→sus2, `6(9)`→6add9, `7(9)`→9, `m7(11)`→m11;
  `7+`, quote junk, and `m(3b)` are AMBIGUOUS/UNPARSED; oracle columns are
  parse-class only; no Vue in core."
status: active
branch: plan/diagramas-cifra
started: 2026-09-19T08:49:13.733Z
lastUpdated: 2026-09-20T11:54:19.571Z
nextAction: Run `done T-002`
parentPlan: diagramas-cifra
phaseId: F0
businessIntent:
  value: O músico precisa que o core reconheça o nome brasileiro do acorde (7M, 4,
    9, 2, slash) sem inventar forma. Um C7M desenhado como C7 mente no ensaio.
  workflow: Gerar a tabela-oráculo dos nomes únicos em fixtures/sda; implementar
    parseChordToken com aliases; testes em tests/core/chord-oracle.test.ts e
    tests/core/parse-chord-token.test.ts; exportar pelo index do core.
  rules: 7M vira maj7; 4 e sus viram sus4; 9 vira add9; 2 vira sus2; 7+ e aspas no
    nome sao AMBIGUOUS ou UNPARSED; nao chutar voicing; zero import Vue em
    src/core.
  outOfScope: Modal de forma, SVG de braço/teclado, dicionario de voicings, parser
    de {define}, folha de editor, prefs de instrumento.
  doneWhen: tests/core/chord-oracle.test.ts e tests/core/parse-chord-token.test.ts
    passam; tests/core/no-vue-in-core.test.ts passa; a tabela cobre os nomes
    unicos de fixtures/sda.
tasksDone: 1
tasksTotal: 2
gatesMet: 0
gatesTotal: 2
weightDone: 2
weightTotal: 5
exitGates:
  - id: F0-G1
    description: Oracle table exists and parseChordToken tests green on the 257
      names. FAILS when a token is guessed as a quality instead of UNPARSED or
      AMBIGUOUS.
    status: pending
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/parse-chord-token.test.ts
        tests/core/chord-oracle.test.ts
      expectExitCode: 0
    verifierLabel: "shell: pnpm exec vitest run tests/core/parse-chord-token.test.ts t…"
  - id: F0-G2
    description: No Vue imports in src/core.
    status: pending
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/no-vue-in-core.test.ts
      expectExitCode: 0
    verifierLabel: "shell: pnpm exec vitest run tests/core/no-vue-in-core.test.ts"
stack:
  - id: 1
    title: D0 Parser BR + oráculo 257
    type: task
    openedAt: 2026-09-19T08:49:13.733Z
tasks:
  - id: T-001
    title: Oracle table from fixtures/sda
    summary: Gerar a tabela dos nomes únicos de fixtures/sda.
    weight: 2
    status: done
    closedAt: 2026-09-20T11:54:19.571Z
    lastUpdated: 2026-09-20T11:54:19.571Z
    evidence:
      verifierKind: shell
      verifiedAt: 2026-09-20T11:53:13.000Z
      verifiedCommit: f168726c74faccef56bec469468c75cfb73109f7
      passed: true
      exitCode: 0
      outputSummary: ✓ tests/core/chord-oracle.test.ts (3 tests) 22ms; Test Files 1
        passed; Tests 3 passed
    scopeBoundary:
      - Do not invent chart lyrics; do not implement parseChordToken here; do
        not add Vue; do not ship a voicing dictionary.
    acceptance:
      - Table lists every unique bracket token from fixtures/sda (257 names);
        each row is parse, UNPARSED, or AMBIGUOUS; 7+ and quote-junk rows are
        AMBIGUOUS or UNPARSED; chord-oracle.test.ts fails if fixtures/sda gains
        a name missing from the table
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/chord-oracle.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: tests/core/chord-oracle.table.json
      - kind: file
        path: tests/core/chord-oracle.test.ts
      - kind: file
        path: scripts/build-chord-oracle.mjs
  - id: T-002
    title: parseChordToken + BR aliases
    summary: Parser canônico BR com aliases e miss honesto.
    weight: 3
    status: pending
    lastUpdated: 2026-09-19T08:49:13.733Z
    scopeBoundary:
      - No Vue; no fret/key diagrams; no {define} parser; do not treat 7+ as aug
        or maj7.
    acceptance:
      - parseChordToken("C7M") quality is maj7; parseChordToken("C7M(9)") is
        maj9; parseChordToken("C4") and parseChordToken("Csus") are sus4;
        parseChordToken("C9") is add9; parseChordToken("G2") is sus2;
        parseChordToken("C6(9)") is 6add9; parseChordToken("C7(9)") is 9;
        parseChordToken("Cm7(11)") is m11; parseChordToken("C7+") is AMBIGUOUS;
        parseChordToken("A4\"") is UNPARSED; slash bass G/B sets bass; function
        is exported from src/core/index.ts
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/parse-chord-token.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: src/core/parse-chord.ts
      - kind: file
        path: src/core/index.ts
      - kind: file
        path: tests/core/parse-chord-token.test.ts
parked: []
emerged: []
planTitle: Diagramas de cifra — `titan-chordpro-ui`
planActive: true
current: true
---

# Narrative / notes

Initiative for phase **F0 — D0 Parser BR + oráculo 257**.

## Decisions

_(record decisions here as they are made)_

## Links

_(plan doc, external refs)_

## Session handoff
- **Narrative:** T-001 fechado via `done` após verifier pós-merge exit 0. T-002 ainda pending; fix1 mergeado (`64d5183`). Cursor E, lastAssert done ok.
- **Decision log:** `assert-automate-gate --gate done` exit 0 com receipt both-claude + disposition fix. T-001 SHA `3b173f5` reachable.
- **Single nextAction:** Run `done T-002`
- **Verbatim state:** `pnpm exec vitest run tests/core/chord-oracle.test.ts` → 3 passed, exit 0, HEAD `f168726c74faccef56bec469468c75cfb73109f7`. lastAssert `{ gate: done, ok: true, at: 2026-09-20T11:54:19.571Z }`.
- **Uncommitted changes:** este close T-001 (checkpoint imediato).
