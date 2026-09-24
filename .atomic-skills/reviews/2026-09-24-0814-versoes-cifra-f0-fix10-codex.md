---
date: 2026-09-24T08:14:52-0300
topic: versoes-cifra-f0-fix10
provider: codex
reviewer: gpt-6-astra
provider_version: codex-cli 0.155.0
final_verdict: needs_changes
counts_final: {blocker: 0, critical: 0, major: 2, minor: 0, nit: 0}
counts_blind: {blocker: 0, critical: 0, major: 1, minor: 0, nit: 0}
framing_delta: {dropped: 0, maintained: 1, emerged: 1}
---

# Cross-Model Review — versoes-cifra-f0-fix10

## Pass 1 (blind)

---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 1, minor: 0, nit: 0}
reviewer: gpt-6
pass: blind
schema_version: "1.0"
---

## Summary

The new body classifier allows unrelated metadata edits to remove visible spacing after images. A reproduction derived from the existing image fixture preserves the blank with the previous implementation but deletes it with this change, including through `setAudioUrl(source, null)`.

## Findings

### F-001 [major] Correctness — src/core/charts.ts:443-445

**Evidence:**
```ts
function lineStartsChartBody(directive: { name: string } | null): boolean {
  return directive === null
}
```

**Claim:** Treating every directive as non-body causes blank-line cleanup to delete rendered body spacing after an image when the blank lies between sound directives.

**Impact:** For an envelope containing `{image: assets/ele-vive-intro.png}`, `{key:G}`, a blank, `{tempo:72}`, then `{sot}`, an unrelated audio clear removes the separator between the image and tablature. Execution against a variation of `fixtures/013-ele-vive-em-mim-partitura.cho` changed the parsed sequence from `image, empty, tab` to `image, tab`; the previous implementation preserved it. Saving metadata therefore alters the chart’s visible layout.

**Recommendation:** Distinguish metadata-only directives from directives that emit body content, and stop leading-header blank removal once body content begins. Add a regression asserting that the parsed `image, empty, tab` sequence survives a sound metadata edit.

**Confidence:** high

## Questions (non-findings)

## Out of scope

## Pass 2 (informed)

---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 2, minor: 0, nit: 0}
reviewer: gpt-6
pass: informed
schema_version: "1.0"
---

## Summary

Fixture-based execution confirms that metadata edits now remove rendered spacing after images. The previous implementation preserved that spacing.

The artist-preservation change also leaves the audio-update path unprotected: clearing audio still changes the displayed credit and deletes the composer directive in both flat and enveloped files. This is an incomplete fix of existing behavior.

## Findings

### F-001 [major] Correctness — src/core/charts.ts:443-445

**Evidence:**
```ts
function lineStartsChartBody(directive: { name: string } | null): boolean {
  return directive === null
}
```

**Claim:** Classifying image directives as non-body allows blank-line cleanup to delete rendered spacing after an image.

**Impact:** In a variation of `fixtures/013-ele-vive-em-mim-partitura.cho`, an envelope containing an image followed by `{key:G}`, a blank, `{tempo:72}`, and tablature loses its image-to-tablature separator after `setAudioUrl(source, null)`. Execution changed the parsed sequence from `image, empty, tab` to `image, tab`; the previous implementation preserved it.

**Recommendation:** Stop leading-header blank removal when a directive emits body content, including images and comments. Add a regression verifying that `image, empty, tab` survives an audio metadata edit.

**Confidence:** high

---

### F-002 [major] Data integrity — src/core/charts.ts:422-425

**Evidence:**
```ts
  const ownsArtist = Object.prototype.hasOwnProperty.call(patch, 'artist')
  const keepArtistCredit = !ownsArtist && artistCreditDisagrees(headerText)
  const next = applyPatch(readKeyed(headerText, 'song'), patch, SONG_META_KEYS)
  if (keepArtistCredit) delete next.artist
```

**Claim:** Artist preservation does not cover audio updates because their copied metadata owns `artist`, while flat audio updates bypass the guard entirely.

**Impact:** With `{artist:Local}` followed by `{composer:Bach}`, `parse` displays `Bach`, but `readMeta` supplies `Local` to `setAudioUrl`. Clearing audio then removes the composer directive and changes the displayed credit to `Local`. Fixture-based execution reproduced this for both flat and enveloped files. The new subtitle-only test passes while this unrelated-save corruption remains.

**Recommendation:** Make audio setters pass only changed sound fields through the chart-scoped writer, resolving the default chart for envelopes. Add `setAudioUrl` regressions for flat and enveloped files with conflicting artist/composer credits, while retaining tests for explicit artist replacement.

**Confidence:** high

## Questions (non-findings)

## Out of scope

## Pass 2 reconciliation

### Dropped from blind pass

- _(none)_

### Maintained

- F-001-blind → F-001-final [major] — same

### Emerged

- F-002-final [major] Data integrity — emerged: The constraints establish that `setAudioUrl` copies `readMeta`’s artist into its write, disabling preservation for envelopes, and that flat `writeMeta` calls omit the preservation argument entirely.

## Fixes applied in this session

None.
