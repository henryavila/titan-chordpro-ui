# F1 phase review — both-claude

**Mode:** both (external leg: claude; Codex skipped per L-004)
**Ref:** `d78c227639fc6d972c9abe43991910ef0c52a13b..HEAD`
**Product files:** 9 (`src/core/{define,export-cho,import-chordpro,index,parse,types}.ts`, tests, `fixtures/define-roundtrip.cho`)
**At:** 2026-09-20T16:25:00Z
**HEAD at capture:** c1dad342cd163c55cabe5a3dc548c8743f2d5ab4
**DESTRUCTIVE:** false (679 insertions / 15 deletions)

## Legs

| Provider | Status | Path |
|----------|--------|------|
| local (grok) | succeeded | `.atomic-skills/reviews/2026-09-20-diagramas-cifra-F1-close-local.md` |
| claude | succeeded | `.atomic-skills/reviews/2026-09-20-diagramas-cifra-F1-close-claude.md` |
| codex | skipped | F0 L-004 / operator CROSS-MODEL via Claude |

## Counts

| Leg | blocker | critical | major | minor |
|-----|---------|----------|-------|-------|
| local | 0 | 1 | 3 | 2 |
| claude | 1 | 0 | 4 | 4 |

## G1 verification (orchestrator)

- Claude blocker: `rewriteToKey` → `rewriteDefineLines` (`import-chordpro.ts:533`) → `session.replace` (`ChordproViewer.vue:1512-1514`). `transposeDefine` returns null on fret 0 (`define.ts:187`). Test pins rewriteToKey drop (`define-directive.test.ts:268-275`).
- Local critical: piano `{define: C keys 0 4 7}` +2 → `{define: D keys 2 6 9}` locked by `export-cho.test.ts:38-43`. ChordPro spec treats keys as root-relative; F1-fix1 treated them as concert pitch-classes.

## F1 locks that still hold

DIR hyphen; writeMeta keep; parse().defines; fixture outside sda; open-G not relabelled A; barred bump; F1-G1 31 tests exit 0.

## Operator close token

User 2026-09-20: **Adiar todos para F2/F4**. Disposition `defer` on Claude blocker (Reescrever apaga define aberta), local piano critical (keys ChordPro vs concert), and remaining majors (writeDefines replace-all, parse miss, mixed payload, setKey unsigned, base_fret, N mute). F1-G1 locks hold as tested. Same pattern as F0 majors deferred to F2.
