---
schemaVersion: "0.1"
slug: diagramas-cifra-f0-d0-parser-br-oraculo-257
title: D0 Parser BR + oráculo 257
summary: Classificar os 257 nomes do corpus SDA e parsear o dialeto BR.
goal: "`parseChordToken` classifies every unique name in `fixtures/sda` (257) as
  parse, UNPARSED, or AMBIGUOUS; aliases `7M`→maj7, `7M(9)`→maj9,
  `4`/`sus`→sus4, `9`→add9, `2`→sus2, `6(9)`→6add9, `7(9)`→9, `m7(11)`→m11; `7+`
  and quote junk are AMBIGUOUS/UNPARSED; `m(3b)` parses as `m`; slash after `/`
  is always bass; oracle columns are parse-class only; no Vue in core."
status: active
branch: plan/diagramas-cifra
started: 2026-09-19T08:49:13.733Z
lastUpdated: 2026-09-20T11:54:19.571Z
nextAction: spawn F0-fix2 writer for m(3b)→m and generator-follows-parser
parentPlan: diagramas-cifra
phaseId: F0
businessIntent:
  value: O músico precisa que o core reconheça o nome brasileiro do acorde (7M, 4,
    9, 2, slash) sem inventar forma. Um C7M desenhado como C7 mente no ensaio.
  workflow: Gerar a tabela-oráculo dos nomes únicos em fixtures/sda; implementar
    parseChordToken com aliases; testes em tests/core/chord-oracle.test.ts e
    tests/core/parse-chord-token.test.ts; exportar pelo index do core.
  rules: 7M vira maj7; 4 e sus viram sus4; 9 vira add9; 2 vira sus2; 7+ e aspas no
    nome sao AMBIGUOUS ou UNPARSED; m(3b) parseia como m (menor; 3b e
    redundante); o que vem depois de / e sempre baixo; gerador da tabela segue o
    parser; nao chutar voicing; zero import Vue em src/core.
  outOfScope: Modal de forma, SVG de braço/teclado, dicionario de voicings, parser
    de {define}, folha de editor, prefs de instrumento.
  doneWhen: tests/core/chord-oracle.test.ts e tests/core/parse-chord-token.test.ts
    passam; tests/core/no-vue-in-core.test.ts passa; a tabela cobre os nomes
    unicos de fixtures/sda.
tasksDone: 0
tasksTotal: 2
gatesMet: 0
gatesTotal: 2
weightDone: 0
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
    status: active
    lastUpdated: 2026-09-20T13:57:00.000Z
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
    status: active
    lastUpdated: 2026-09-20T13:57:00.000Z
    scopeBoundary:
      - No Vue; no fret/key diagrams; no {define} parser; do not treat 7+ as aug
        or maj7.
    acceptance:
      - parseChordToken("C7M") quality is maj7; parseChordToken("C7M(9)") is
        maj9; parseChordToken("C4") and parseChordToken("Csus") are sus4;
        parseChordToken("C9") is add9; parseChordToken("G2") is sus2;
        parseChordToken("C6(9)") is 6add9; parseChordToken("C7(9)") is 9;
        parseChordToken("Cm7(11)") is m11; parseChordToken("C7+") is AMBIGUOUS;
        parseChordToken("A4\"") is UNPARSED; parseChordToken("Dm(3b)") quality
        is m; parseChordToken("Dm(3b)/F#") is m with bass F#; slash after / is
        always bass; function is exported from src/core/index.ts
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
- **Narrative:** Última tarefa da F0 fechada. T-001 e T-002 `done` com evidence.passed true. phase-done NÃO auto-roda: falta evaluation + lessons + review + decision-review + audit-delivery + assert phase-done.
- **Decision log:** T-002 closed after fix1 `64d5183` and both-claude receipt with operator disposition fix. lastAssert done ok.
- **Single nextAction:** Run `phase-done`
- **Verbatim state:** `pnpm exec vitest run tests/core/parse-chord-token.test.ts` → 13 passed, exit 0, HEAD `e7d4bb34d7ceda025beb65f7779183085e73ed4d`. `assert-automate-gate --gate done` → `ok`. lastAssert `{ gate: done, ok: true, at: 2026-09-20T11:54:19.571Z }`.
- **Uncommitted changes:** este close T-002 (checkpoint imediato).
