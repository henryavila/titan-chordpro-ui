# Delivery audit — diagramas-cifra F1

**Mode:** audit (read-only)
**Verdict:** CLOSED
**At:** 2026-09-20T16:35:00Z
**HEAD:** c1dad342cd163c55cabe5a3dc548c8743f2d5ab4
**Intent source:** F1 businessIntent spine + F1-G1 + operator package ratify (fixture fora de sda)

## Intent Package

- **D1** DIR aceita `define-guitar` / `define-ukulele` como chave inteira
- **D2** writeMeta não apaga linhas define
- **D3** `parse()` expõe `defines` em ChordProView
- **D4** exportCho preserva define (n=0) e transpoe nome+forma ou dropa open-string (n≠0)
- **D5** fixture nova fora de `fixtures/sda`
- **Non-goals** Editor Vue, SVG, dicionário, chaves x_ em META_KEYS, folha D4
- **doneWhen** `tests/core/define-directive.test.ts` + `tests/core/export-cho.test.ts` passam
- **vocabulary:** none (additive) — `{define}` entra; não há rename de chave existente
- **single-surface:** false — parse / writeMeta / exportCho / rewriteToKey / fixture / testes

## Problem / decision matrix

| # | Intent | Surface | Status | Evidence |
|---|--------|---------|--------|----------|
| D1 | DIR hifenizado | `src/core/define.ts:8` | RESOLVED | `[a-zA-Z_][a-zA-Z0-9_-]*`; `isDefineKey` define.ts:27-30; tests define-directive.test.ts:24-37 |
| D2 | writeMeta keep | `src/core/import-chordpro.ts:345-358,426-438` | RESOLVED | META_KEYS sem define*; filter só META_KEYS+t/st; test :190-201 |
| D3 | parse().defines | `src/core/types.ts:22-23`; `parse.ts:151-155,320-328` | RESOLVED | ChordProView.defines sempre array; test :143-154 |
| D4 | exportCho keep + shape-or-drop | `export-cho.ts:14-23`; `define.ts:185-215` | RESOLVED | n=0 keep; open-G omit not relabel A (export-cho.test.ts:17-27); barred bump (:29-36); piano keys shift (:38-43) |
| D5 | fixture fora de sda | `fixtures/define-roundtrip.cho` | RESOLVED | grep `{define` em fixtures/sda = 0; fixture:6 define-guitar G |
| P1 | D4 não escreve define | `src/vue` | N/A | grep writeDefines/DiagramModal/define-guitar em src/vue = 0 |
| P2 | core sem Vue | `tests/core/no-vue-in-core.test.ts` | RESOLVED | exit 0, 1 test |

## Residual hunt

| OLD/NEW | Surface | Class | Result |
|---------|---------|-------|--------|
| `{define}` | fixtures/sda | storage | none — 0 hits |
| writeDefines | src/vue | teaching | none — D4 still out of scope |
| DiagramModal | src/vue | dead | none — F3 create |
| META_KEYS define | import-chordpro.ts | alias | none — define not an x_ key |
| open-string drop | rewriteToKey persist | residual | Accept Record — deferred F2/F4 |
| piano keys ChordPro vs concert | transposeDefine | residual | Accept Record — deferred F2 |
| writeDefines replace-all | define.ts | residual | Accept Record — deferred F4 (no Vue caller) |

Residual protocol: valid (terms × surfaces grepped). Deferred items have operator Accept Record (`defer F1 close-review blocker/critical/majors to F2/F4`, F1.jsonl id 504bf748). No CRITICAL residual on the F1 BI spine.

## Accept Register

| Finding | Close-review label | Disposition | Target |
|---------|-------------------|-------------|--------|
| rewriteToKey persist-drop open-string define | claude blocker | accepted (defer F2/F4) | F2/F4 |
| piano keys root-relative vs concert shift | local close finding | accepted (defer F2) | F2 drawer |
| writeDefines replace-all | major | accepted (defer F4) | F4 |
| parse() miss silent | major | accepted (defer F4) | F4 |
| mixed frets+keys | major | accepted (defer F2) | F2 |
| setKey unsigned vs signed base-fret | major | accepted (defer F2) | F2 |
| base_fret underscore / N mute | minor | accepted (defer F2) | F2 |

## Verifiers

`pnpm exec vitest run tests/core/define-directive.test.ts tests/core/export-cho.test.ts` → Tests 31 passed, exit 0.

`pnpm exec vitest run tests/core/no-vue-in-core.test.ts` → 1 passed, exit 0.

## Verdict

CLOSED — F1 intent delivered end-to-end. Load-bearing D1–D5 RESOLVED. Deferred close-review findings are F2/F4 residuals with Accept Records, not F1 BI gaps.
