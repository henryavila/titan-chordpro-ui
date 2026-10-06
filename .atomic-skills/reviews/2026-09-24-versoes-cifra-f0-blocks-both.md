---
date: 2026-09-24T18:30:00-0300
topic: versoes-cifra-f0-blocks
artifact: 13439a8e90bdba3c0fb6c58deeb101eaab6ac527..02fffeb1863aa2540d8183e9dd2f08c370a3a737
skill: review-code
mode: both
provider: codex
reviewer: gpt-6-astra
provider_version: codex-cli 0.155.0
final_verdict: needs_changes
counts_local: {blocker: 0, critical: 2, major: 2, minor: 0, nit: 0}
counts_final: {blocker: 0, critical: 0, major: 5, minor: 0, nit: 0}
framing_delta: {dropped: 0, maintained: 4, emerged: 1}
---

# Both review — block-only contract

Ref `13439a8..02fffeb`, paths `src` and `tests`.

Codex informed (`gpt-6-astra`): 5 majors. Dropped none. Emerged 1.
Local: 2 critical, 2 major.

`needs_changes`. Do not `done`.

Kept as the operator contract: a completed chart pair plus any other top-level text is an error. Do not fold a preamble back into a block.

Fix:
- A spread of `readMeta` on tempo, batida, or meta apply must not rewrite title or artist, and must not delete `{t:}` or `{composer:}`.
- A reader must not treat audio, title, artist, or `{x_chart_default}` inside tab or score as active meta.
- `replaceChart` must return a file `splitCho` can read. Strip chart fences from the replacement document. A new self-marker removes the sibling marker. A deleted marker stays deleted.
- No completed pair, including a lone unclosed `{start_of_x_chart}`, stays one chart: the whole text.
- Export `ChartEnvelopeError`. The viewer catches it instead of crashing the computed.
