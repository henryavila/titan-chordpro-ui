---
schemaVersion: "0.1"
slug: diagramas-cifra-f1-d1-define-parse-serialize-round-trip
title: D1 {define} parse/serialize/round-trip
goal: "`{define}`, `{define-guitar}`, `{define-ukulele}` round-trip in
  parse/write; hyphenated keys are not eaten by DIR; writeMeta does not drop
  defines; exportCho preserves them; fixture on an existing chart; D4 must not
  write defines until this gate is green."
status: active
branch: plan/diagramas-cifra
started: 2026-09-20T15:12:51.416Z
lastUpdated: 2026-09-20T15:12:51.416Z
nextAction: Run `phase-done`
parentPlan: diagramas-cifra
phaseId: F1
businessIntent:
  value: O musico grava uma forma so naquele arquivo ChordPro. Se writeMeta ou
    exportCho dropa {define-guitar:}, a forma some na proxima abertura e o
    ensaio toca a forma errada.
  workflow: Parse {define}, {define-guitar} e {define-ukulele} com DIR hifenizado;
    serialize round-trip; writeDefines depois do header META_KEYS e antes da
    letra; parse() expoe defines; exportCho preserva e transpoe o nome da define
    com o mesmo semitone do corpo; fixture nova fora de fixtures/sda.
  rules: DIR aceita define-guitar e define-ukulele como chave inteira; writeMeta
    nao apaga linhas define; {define:} nu infere guitarra (6 trastes), ukulele
    (4) ou piano (keys); aridade desconhecida e miss; exportCho({semitones:2})
    reescreve o nome da define para bater com o shapeName transposto; D4 nao
    escreve define ate F1-G1 verde.
  outOfScope: Editor Vue, SVG de braco/teclado, dicionario de voicings, chaves x_
    em META_KEYS, meta de batida, folha D4 de editor.
  doneWhen: tests/core/define-directive.test.ts e tests/core/export-cho.test.ts
    passam; parse(src).defines existe; writeMeta e exportCho mantem
    {define-guitar:}; exportCho com semitones 2 deixa o nome da define alinhado
    ao shapeName transposto.
tasksDone: 2
tasksTotal: 2
gatesMet: 0
gatesTotal: 1
weightDone: 6
weightTotal: 6
exitGates:
  - id: F1-G1
    description: Define parse/serialize and exportCho tests green. FAILS when
      writeMeta or exportCho strips {define-guitar:}.
    status: pending
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/define-directive.test.ts
        tests/core/export-cho.test.ts
      expectExitCode: 0
    verifierLabel: "shell: pnpm exec vitest run tests/core/define-directive.test.ts te…"
stack:
  - id: 1
    title: D1 {define} parse/serialize/round-trip
    type: task
    openedAt: 2026-09-20T15:12:51.416Z
tasks:
  - id: T-001
    title: Parse and serialize define directives
    summary: Parse e serialize {define} hifenizado com inferencia de instrumento.
    weight: 3
    status: done
    closedAt: 2026-09-20T15:52:00.000Z
    lastUpdated: 2026-09-20T15:52:00.000Z
    evidence:
      verifierKind: shell
      verifiedAt: 2026-09-20T15:51:52.000Z
      verifiedCommit: 3d4b6f930a7bd520b338ea3ceaf7c424a1d81a9f
      passed: true
      exitCode: 0
      outputSummary: ✓ tests/core/define-directive.test.ts (25 tests) 6ms
    scopeBoundary:
      - No Vue editor; no dictionary lookup; do not add define to META_KEYS as
        an x_ key; do not implement the diagram SVG.
    acceptance:
      - DIR accepts define-guitar and define-ukulele as full keys;
        parseDefineDirective reads frets, fingers, base-fret, keys;
        serializeDefine emits ChordPro text; generic {define:} infers guitar
        from 6 frets, ukulele from 4, piano from keys; unknown arity is miss
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/define-directive.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: src/core/parse.ts
      - kind: file
        path: src/core/define.ts
      - kind: file
        path: src/core/index.ts
      - kind: file
        path: tests/core/define-directive.test.ts
  - id: T-002
    title: writeDefines + fixture + exportCho keep
    summary: writeDefines, writeMeta e exportCho preservam define; fixture fora de sda.
    weight: 3
    status: done
    closedAt: 2026-09-20T15:52:00.000Z
    lastUpdated: 2026-09-20T15:52:00.000Z
    evidence:
      verifierKind: shell
      verifiedAt: 2026-09-20T15:51:52.000Z
      verifiedCommit: 3d4b6f930a7bd520b338ea3ceaf7c424a1d81a9f
      passed: true
      exitCode: 0
      outputSummary: ✓ define-directive 25 + export-cho 6; 32 tests exit 0
        (open-string define dropped on transpose)
    scopeBoundary:
      - Do not invent lyrics; only add define lines to an existing fixture; do
        not build the shape editor UI; do not change strum meta keys.
    acceptance:
      - writeDefines places the define block after META_KEYS header and before
        lyrics; writeMeta leaves define lines in place; exportCho of a source
        with {define-guitar:} still contains that directive; fixture
        fixtures/define-roundtrip.cho (outside fixtures/sda) has at least one
        {define-guitar:} used in tests; exportCho({semitones:2}) rewrites define
        names with the same transpose as the body
    verifier:
      kind: shell
      command: pnpm exec vitest run tests/core/define-directive.test.ts
        tests/core/export-cho.test.ts
      expectExitCode: 0
    outputs:
      - kind: file
        path: src/core/define.ts
      - kind: file
        path: src/core/import-chordpro.ts
      - kind: file
        path: src/core/export-cho.ts
      - kind: file
        path: tests/core/define-directive.test.ts
      - kind: file
        path: tests/core/export-cho.test.ts
      - kind: file
        path: fixtures/define-roundtrip.cho
parked: []
emerged: []
planTitle: Diagramas de cifra — `titan-chordpro-ui`
planActive: true
current: true
---

# Narrative / notes

Initiative for phase **F1 — D1 {define} parse/serialize/round-trip**.

## Decisions

_(record decisions here as they are made)_

## Links

_(plan doc, external refs)_

## Session handoff
- **Narrative:** F1 T-001/T-002 `done`. Avaliação Step F: verdict pass, 0 blocker/critical/major, 3 minor + 2 notes. F1-G1 host re-run 31 passed exit 0. `evaluationGate` carimbado. Cursor em F. Próximo: lessons + review-code both-claude + decision-review + audit-delivery.
- **Decision log:** Pacote F1 ratificado (fixture fora de sda). Redispatch F1-fix1: `transposeDefine` shape-or-drop. Evaluation pass em `.atomic-skills/reviews/eval-diagramas-cifra-F1.md`.
- **Single nextAction:** distill F1 lessons then review-code --mode=both-claude
- **Verbatim state:** HEAD `d6591d612ac250a8f4fc7e051c1919cb6a7e5fe3`. evaluationGate `{status:passed,verdict:pass,reportPath:.atomic-skills/reviews/eval-diagramas-cifra-F1.md,at:d6591d612ac250a8f4fc7e051c1919cb6a7e5fe3,verifiedAt:2026-09-20T16:10:54.000Z}`. F1-G1 `pnpm exec vitest run tests/core/define-directive.test.ts tests/core/export-cho.test.ts` Tests 31 passed exit 0. Cursor step=F.
- **Uncommitted changes:** plan.md evaluationGate, eval report, F1.jsonl, cursor.json (checkpoint imediato).
