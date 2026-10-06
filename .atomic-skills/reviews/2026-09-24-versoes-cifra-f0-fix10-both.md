---
date: 2026-09-24T08:14:52-0300
topic: versoes-cifra-f0-fix10
artifact: e0a1d25..87ce9da
skill: review-code
mode: both
provider: codex
reviewer: gpt-6-astra
provider_version: codex-cli 0.155.0
same_family_remap: false
final_verdict: needs_changes
counts_blind: {blocker: 0, critical: 0, major: 1, minor: 0, nit: 0}
counts_final: {blocker: 0, critical: 0, major: 2, minor: 0, nit: 0}
framing_delta: {dropped: 0, maintained: 1, emerged: 1}
localReceiptPath: .atomic-skills/reviews/2026-09-24-versoes-cifra-f0-fix10-local.md
codexReceiptPath: .atomic-skills/reviews/2026-09-24-0814-versoes-cifra-f0-fix10-codex.md
---

# Both review — versoes-cifra F0 fix10

Ref `e0a1d25..87ce9da`. Same captured diff. No product edits between the passes.

Local: 0 blocker, 1 critical, 1 major, 1 minor.
Codex informed: 0 blocker, 0 critical, 2 major. Dropped none. Emerged 1.

- F-001 major `src/core/charts.ts:443` — `{image:}` does not start the body, so a blank between later sound keys is removed and the image-to-tab gap disappears on `setAudioUrl(null)`.
- F-002 major `src/core/charts.ts:422` — `setAudioUrl` copies `readMeta` artist. `{artist:Local}` then `{composer:Bach}` parses as Bach, and clearing audio stores Local and deletes the composer line. Host reproduced this.

Local-only:

- critical, same input as F-002, also via `writeMeta` that echoes `readMeta`
- major `src/core/charts.ts:353` — a later `{t:}` or `{st:}` is replaced by the earlier exact title or subtitle
- minor `src/core/charts.ts:379` — `lastArtistCredit` counts `{artist}` inside tab or score, which `parse` ignores

`needs_changes`. Do not `done`.
