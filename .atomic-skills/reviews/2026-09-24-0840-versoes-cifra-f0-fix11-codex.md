---
date: 2026-09-24T08:40:20-0300
topic: versoes-cifra-f0-fix11
provider: codex
reviewer: gpt-6-astra
provider_version: codex-cli 0.155.0
final_verdict: needs_changes
counts_final: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
counts_blind: {blocker: 0, critical: 0, major: 2, minor: 0, nit: 0}
framing_delta: {dropped: 0, maintained: 2, emerged: 1}
---

# Cross-Model Review — versoes-cifra-f0-fix11

## Pass 1 (blind)

---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 2, minor: 0, nit: 0}
reviewer: gpt-6
pass: blind
schema_version: "1.0"
---

## Summary

Two regressions were reproduced against both revisions: explicit identity edits can be silently ignored, and an unrelated song metadata update can overwrite the shared credit displayed by another chart.

## Findings

### F-001 [major] Correctness — src/core/charts.ts:450-452

**Evidence:**
```ts
  for (const key of parseIdentityDisagreements(source)) {
    const seen = appliedKeys.includes(key) && Object.prototype.hasOwnProperty.call(patch, key)
    if (!seen || (patch[key] ?? '').trim() === (read[key] ?? '').trim()) keep.add(key)
```

**Claim:** An explicit patch is ignored when its requested value equals `readMeta` but differs from the displayed identity.

**Impact:** For `{artist:Local}\n{composer:Bach}`, `writeSongScopedMeta(source, { artist: 'Local' })` leaves the displayed artist as `Bach`. Likewise, `{title:}\n{t:Second}` cannot be cleared with `{ title: '' }`. Both operations succeeded at the base revision; the new equality check silently discards the requested edit.

**Recommendation:** Honor explicitly supplied keys in scoped patches, including empty values. Carry preservation information separately for callers that pass unchanged `readMeta` copies. Add regression assertions for explicit replacement and clearing when aliases disagree.

**Confidence:** high

---

### F-002 [major] Data integrity — src/core/charts.ts:480-483

**Evidence:**
```ts
  const headerLines = split.raws.slice(0, first.startLi)
  const keep = patchIdentityKeep(source, patch, SONG_META_KEYS)
  const next = applyPatch(readKeyed(headerLines.join('\n'), 'song'), patch, SONG_META_KEYS)
  for (const key of keep) delete next[key]
```

**Claim:** Computing preservation from the default chart’s projection can hide a shared-header disagreement and change another chart’s displayed credit.

**Impact:** With shared header `{artist:Local}\n{composer:Bach}`, a default chart containing `{artist:Local}`, and a sibling without its own credit, updating only `{ subtitle: 'X' }` removes the shared `{composer:Bach}`. The sibling’s artist changes from `Bach` to `Local`. The default chart makes `readMeta` and the visible identity agree, so the shared header is incorrectly collapsed. This regression was reproduced against the base and target revisions.

**Recommendation:** Determine shared-header preservation independently of identity overrides inside the default chart. Preserve header aliases on unrelated updates and add a regression test checking every chart’s parsed identity before and after the update.

**Confidence:** high

## Questions (non-findings)

None.

## Out of scope

None.

## Pass 2 (informed)

---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
reviewer: gpt-6
pass: informed
schema_version: "1.0"
---

## Summary

Both blind findings stand: explicit identity edits can be silently ignored, and an unrelated metadata update can change another chart’s displayed credit.

The constraints also expose a regression affecting literal tab and score content: excluding their identity directives from disagreement detection removes preservation that previously protected those lines during scoped saves.

## Findings

### F-001 [major] Correctness — src/core/charts.ts:450-452

**Evidence:**
```ts
  for (const key of parseIdentityDisagreements(source)) {
    const seen = appliedKeys.includes(key) && Object.prototype.hasOwnProperty.call(patch, key)
    if (!seen || (patch[key] ?? '').trim() === (read[key] ?? '').trim()) keep.add(key)
```

**Claim:** An explicit identity patch is ignored when its requested value equals `readMeta` but differs from the displayed identity.

**Impact:** For `{artist:Local}\n{composer:Bach}`, `writeSongScopedMeta(source, { artist: 'Local' })` preserves both directives, leaving the displayed artist as `Bach`. Likewise, `{title:}\n{t:Second}` cannot be cleared with `{ title: '' }`. The equality check treats an explicit replacement or deletion as an unchanged metadata copy.

**Recommendation:** Honor explicitly supplied keys in scoped patches, including empty values. Pass preservation information separately from callers that submit unchanged `readMeta` copies. Add regression tests for explicit replacement and clearing when aliases disagree.

**Confidence:** high

---

### F-002 [major] Data integrity — src/core/charts.ts:480-483

**Evidence:**
```ts
  const headerLines = split.raws.slice(0, first.startLi)
  const keep = patchIdentityKeep(source, patch, SONG_META_KEYS)
  const next = applyPatch(readKeyed(headerLines.join('\n'), 'song'), patch, SONG_META_KEYS)
  for (const key of keep) delete next[key]
```

**Claim:** Computing preservation from the default chart’s projection can conceal a shared-header disagreement and change another chart’s displayed credit.

**Impact:** With shared header `{artist:Local}\n{composer:Bach}`, a default chart containing `{artist:Local}`, and a sibling without its own credit, updating only `{ subtitle: 'X' }` removes the shared `{composer:Bach}`. The default chart makes `readMeta` and the visible identity agree, so no preservation occurs. Although the chart tail remains unchanged, the sibling inherits the rewritten header and its displayed artist changes from `Bach` to `Local`.

**Recommendation:** Determine shared-header preservation independently of identity overrides inside the default chart. Preserve header aliases on unrelated updates and add a regression test checking every chart’s parsed identity before and after the update.

**Confidence:** high

---

### F-003 [major] Data integrity — src/core/charts.ts:354-365

**Evidence:**
```ts
      const parsed = dirOf(l)
      if (!parsed) return true
      // parse uses the last title, subtitle, or artist outside tab and score.
      // An unrelated save keeps those lines, including a later short alias.
      if (identityLineKept(parsed.name, keep)) return true
      const colonForm = /^\s*\{\s*[a-zA-Z_]+\s*:/.test(l)
      if (!colonForm) {
        // `{transpose 2}` stays. `{title Uma}` does not: readMeta still accepts it.
        return songIdentityMetaKey(parsed.name) === null
      }
      if (parsed.name === 'x_chart_default' && !setsDefault) return true
      return canonicalMetaKey(parsed.name) === null
```

**Claim:** An unrelated scoped metadata save now deletes literal credit directives inside tab or score blocks when the outer credit agrees with `readMeta`.

**Impact:** For `{artist:Local}\n{sot}\n{composer:Bach}\n{eot}\n[C]song`, saving `{ subtitle: 'X' }` removes `{composer:Bach}` from the tab’s literal content. The same occurs with score delimiters. Previously, the raw last-credit comparison detected `Bach` versus `Local` and preserved the line. The new comparison skips the block and finds no disagreement, but the writer still enters the block and deletes its recognized directives. Displayed song metadata stays correct while stored block content is lost.

**Recommendation:** Make header rewriting respect tab and score boundaries and preserve their literal contents independently of song-identity preservation. Add regression tests asserting unchanged block text after unrelated scoped saves.

**Confidence:** high

## Questions (non-findings)

- _(none)_

## Out of scope

- _(none)_

## Pass 2 reconciliation

### Dropped from blind pass

- _(none)_

### Maintained

- F-001-blind → F-001-final [major] — same
- F-002-blind → F-002-final [major] — same

### Emerged

- F-003-final [major] Data integrity — emerged: The constraints establish that `visibleParseIdentity` skips tab and score contents while `writeMetaOneHeader` still filters those contents, exposing deletion of literal directives that the previous credit-disagreement check preserved.

## Fixes applied in this session

None.
