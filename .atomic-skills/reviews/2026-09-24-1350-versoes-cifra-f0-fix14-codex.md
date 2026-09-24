---
date: 2026-09-24T13:50:00-0300
topic: versoes-cifra-f0-fix14
artifact: 070b7c1f145522539516036d4d439bfd8113eaa3..03f4ec5f0d16da285d1be4087179dc6ae43de9bd
skill: review-code
mode: codex
provider: codex
reviewer: gpt-6-astra
provider_version: codex-cli 0.155.0
final_verdict: needs_changes
counts_blind: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
counts_final: {blocker: 0, critical: 0, major: 4, minor: 0, nit: 0}
framing_delta: {dropped: 0, maintained: 3, emerged: 1}
---

# Codex review — versoes-cifra F0 fix14

Ref `070b7c1..03f4ec5`. Model `gpt-6-astra`. Pass 2 dropped none, maintained 3, emerged 1.

- F-001 major `src/core/charts.ts:213` — an unclosed `{sot}` absorbed by `replaceChart` makes the next replacement of that chart delete its siblings.
- F-002 major `src/core/charts.ts:562` — `setAudioUrl` changes the shared title from `First` to `Second` when the default chart carries `{title:Second}`.
- F-003 major `src/core/charts.ts:684` — a subtitle-only save drops an empty outside `{x_chart_default:}` and the tab fallback `oferta` becomes selected again.
- F-004 major `src/core/charts.ts` — `writeMeta(source, { artist: 'Local', title: 'T' }, { target: 'song' })` on `{artist:Local}` plus `{composer:Bach}` leaves the parsed artist as `Bach`.
