# Decision package — phase F1

**Log path:** `.atomic-skills/projects/titan-chordpro-ui/versoes-cifra/decisions/F1.jsonl`

Operator 2026-09-25: **fecha o F1 no plano**. This package is presented for decision-review PASS.

| # | category | decision | why | impact | evidencePath |
|---|----------|----------|-----|--------|--------------|
| 1 | review-disposition | defer | Overlay key `:` / `%` collision stays deferred. Changing the format would break T-001. | Ids with `:` or `%` stay outside the key contract. | src/core/storage.ts |
| 2 | tradeoff | suggestion publish is a per-chart splice | Finding 1: accepting chart A must not wipe chart B rascunho. Gating accept is not the product. | spliceChart + publishChart. save-content is official; working file keeps sibling draft. | src/vue/use/useOverlay.ts |
| 3 | tradeoff | opening a chart fully syncs that chart | Operator: no “dirty session” skip. Complete sync of the open chart. | onChartLoad splices official+Minha versão+tune of the open chart. | src/vue/ChordproViewer.vue |
| 4 | tradeoff | file capo of the open chart | Finding 3: no TuneOp → capo from open chart document, not first `{capo:}` in the envelope. | preloadTune uses openChartDocument. | src/vue/ChordproViewer.vue |
| 5 | tradeoff | TuneOp is not a lyric conflict | Finding 4: official-update dialog is about lyrics. Pinned tom stays while the dialog is open. | load() returns TuneOp even with updDlg. | src/vue/use/useOverlay.ts |
| 6 | review-disposition | accept | Operator 2026-09-25: fecha o F1 no plano. Findings 1–4 implemented. Colon collision stays deferred. | T-001 T-002 done. F1-G1 92 tests exit 0. | .atomic-skills/reviews/eval-versoes-cifra-F1.md |

F2–F4 product already landed on this branch by earlier operator instruction. That is out of F1 scope.
