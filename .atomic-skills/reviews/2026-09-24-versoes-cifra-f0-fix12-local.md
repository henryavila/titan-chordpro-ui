---
date: 2026-09-24T12:20:00-0300
topic: versoes-cifra-f0-fix12
artifact: dddfad9..109f57f22f2c4d9ebc401b3e187f7e2b5973e7b3
skill: review-code
mode: local
provider: local
final_verdict: needs_changes
counts: {blocker: 0, critical: 1, major: 2, minor: 0, nit: 0}
---

# Local review — versoes-cifra F0 fix12

Ref `dddfad9..109f57f22f2c4d9ebc401b3e187f7e2b5973e7b3`, paths `src` and `tests`. Sealed briefing. No product edits in this pass.

verdict: findings_exist
counts: blocker=0 critical=1 major=2 minor=0

- F-L1 critical `src/core/charts.ts:776` — `chartDocBody` (`src/core/charts.ts:270`) copies tab and score interiors into `chartDocument`. `rawSongIdentityLines` (`src/core/charts.ts:702`) records identity lines with no block state. `replaceChart` drops every `songMetaKey` line while rebuilding the body (`src/core/charts.ts:776`), and `applyRawSongIdentity` inserts a key missing from the header (`src/core/charts.ts:743`). The `stepBlock` guard (`src/core/charts.ts:728`) only preserves tab or score lines already in the header. A body `{composer:Bach}` round-trip leaves the tab and becomes header artist `Bach`. `{t:Second}` inside the default chart tab is deleted when the header already has `{title:First}`. A header-tab `Bach` plus a body-tab `Mozart` writes `Mozart` onto the header and strips it from the tab.
- F-L2 major `src/core/charts.ts:640` — `blanksOnlyBetweenLeadingSoundKeys` continues only when `dirOf` matches and `stepBlock` is `in`. A staff line has no directive, so `lineStartsChartBody(null)` (`src/core/charts.ts:613`) sets `seenBody`. After a sound-key rewrite, `{sot}` / `e|--0--|` / `{eot}` / `{key:G}` / blank / `{tempo:72}` / `[G]linha` plus `setAudioUrl(null)` yields a blank before `[G]linha`. The same happens for score text `C4 D4 E4`.
- F-L3 major `src/core/import-chordpro.ts:439` — `writeMeta` with `target: 'song'` calls `writeSongScopedMeta` without `preserveEcho`. `patchIdentityKeep` (`src/core/charts.ts:511`) keeps an unchanged title, subtitle, or artist only when `preserveEcho` is true. A spread `{ ...readMeta(file), subtitle: 'X' }` therefore applies `artist` and `stripSongIdentity` removes the other alias. On `{artist:Local}` / `{composer:Bach}` with default chart `oferta`, `target: 'song'` deletes `{composer:Bach}` and both charts parse as `Local`.
