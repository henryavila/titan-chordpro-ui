---
date: 2026-09-24T13:10:00-0300
topic: versoes-cifra-f0-fix13
artifact: 2f4b69603f9032ff2d6f6871a78d35d5ee045ca8..cfbcd1034cad1b5e08965463fd41a1ff578793ae
skill: review-code
mode: local
provider: local
final_verdict: needs_changes
counts: {blocker: 0, critical: 1, major: 3, minor: 0, nit: 0}
---

# Local review — versoes-cifra F0 fix13

Ref `2f4b696..cfbcd10`. Sealed briefing. No product edits in this pass.

- F-L1 critical `src/core/charts.ts:155` — `readMeta` copies `{x_chart_default}` out of a tab or score in the default chart. A later meta save writes that value onto the header and changes `defaultId`.
- F-L2 major `src/core/charts.ts:604` — keeping an in-tab `{x_chart_default}` lets it outrank a real selector that follows the tab. A subtitle save then selects the tab's id.
- F-L3 major `src/core/charts.ts:555` — one echo flag turns false when the chart title differs from the header, so a `readMeta` spread deletes a later `{composer:}` and promotes the chart title.
- F-L4 major `src/core/charts.ts:518` — a sound key in the same patch as `{ title: 'Second' }` makes the echo check return before the header comparison, so the shared title stays `First`.
