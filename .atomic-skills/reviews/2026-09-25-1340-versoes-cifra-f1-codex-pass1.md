---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 4, minor: 0, nit: 0}
reviewer: gpt-6
pass: blind
schema_version: "1.0"
---

## Summary

Four failures were reproduced: legacy overlays can load under another song, removing a song ID during local editing deletes stored adjustments, reverting an adjustment unexpectedly switches charts, and chart switches ignore saved tuning.

Verification used read-only execution of the current source, including mounted Vue components in jsdom. The full test suite was not run.

## Findings

### F-001 [major] Backward compatibility — src/core/storage.ts:60-66

**Evidence:**
```ts
export function overlayKey(songId: string, chartId?: string): string {
  return `${STORE_KEYS.overlayPrefix}${overlayPart(songId)}:${overlayPart(overlayChartId(chartId))}`
}

/** `cpv:my:{songId}` before chart slots, with the same song encoding as `overlayKey`. */
export function songLegacyKey(songId: string): string {
  return `${STORE_KEYS.overlayPrefix}${overlayPart(songId)}`
}
```

**Claim:** An overlay previously saved for song `a:default` becomes the default-chart overlay for song `a`, because the old implementation wrote `cpv:my:a:default` literally while the new legacy lookup encodes the song ID.

**Impact:** The original song stops loading its adjustments, and another song can display, overwrite, or delete them. A reproduction seeded with the actual old key returned `originalSongLoads: false` and `otherSongLoads: true`. IDs containing `%` also lose their original lookup. The added collision test seeds a new-format key, so it does not exercise an upgrade from existing storage.

**Recommendation:** Put chart-scoped overlays in a distinct versioned namespace and read legacy keys using the original, unencoded song ID. Test migration with literal keys produced by the previous implementation, including `a:default`, `a:b`, and IDs containing `%`.

**Confidence:** high

---

### F-002 [major] Data integrity — src/vue/ChordproViewer.vue:2415-2422

**Evidence:**
```ts
  if (raw === lastSrc && lastExplicit && !explicitNow() && song !== lastSongId) {
    ov.holdChartLoad()
    try {
      ov.discardMemory()
      lastSongId = song
      lastExplicit = false
      identityLost.value = true
      forceBase()
```

**Claim:** Removing `songId` while a personalized chart is being edited locally deletes the title-keyed overlay because `forceBase()` calls `touch()` with local autosave still enabled.

**Impact:** After `discardMemory()`, rebasing produces an empty diff; `touch()` calls `commitLocalFrom()`, which saves `null` under the newly computed title identity and removes its storage keys. A mounted reproduction confirmed that an existing title-keyed overlay changed from present to absent. The chart-load hold does not suppress writes, and the added test covers removal only in reading mode.

**Recommendation:** Suspend local autosave throughout identity-loss handling before rebasing the session, and prevent further writes while identity is unresolved. Add a local-edit regression test that seeds both identities and verifies their stored payloads remain byte-for-byte unchanged.

**Confidence:** high

---

### F-003 [major] Correctness — src/vue/use/useOverlay.ts:267-270

**Evidence:**
```ts
  function baseFor(wMode: WriteMode | null, file?: string): string {
    if (wMode === 'persisted' || showOriginal.value) return official.value
    return fileWithChart(file ?? official.value, chartSlot.value, applied.value.text)
  }
```

**Claim:** When an `oferta` overlay removes its default marker and opens `completa`, reverting a `completa` adjustment switches the screen back to `oferta` because ordinary rebasing reconstructs from the official file and restores the removed marker.

**Impact:** The musician requests a lyric revert but receives another chart. The reproduction initially displayed personalized `completa`; after reverting its lyric adjustment, the displayed body became `corpo da oferta` and the open panel listed `oferta`’s marker-removal operation. The second rebasing pass in `syncHostSource()` handles initialization only; subsequent overlay mutations do not preserve that projection.

**Recommendation:** Rebuild the reading projection consistently on every overlay mutation, preserving or deterministically reapplying the overlay changes that selected the current chart. Extend the existing marker-removal test to assert the visible chart, rendered body, and panel contents after reverting.

**Confidence:** high

---

### F-004 [major] Correctness — src/vue/use/useOverlay.ts:371-379

**Evidence:**
```ts
  watch(
    [() => opts.songId.value, chartSlot],
    ([song, slot], prev) => {
      if (!prev || resetting || chartLoadHold > 0) return
      const [prevSong, prevSlot] = prev
      if (song !== prevSong || slot === prevSlot) return
      load()
    },
    { immediate: true, flush: 'sync' },
```

**Claim:** A same-song chart switch ignores the destination chart’s saved transpose and capo because this watcher discards the `TuneOp` returned by `load()`.

**Impact:** Text adjustments load for the destination chart while its tuning does not. With `oferta`’s overlay opening `completa` and `completa` storing transpose `+2` and capo `3`, the mounted viewer displayed its written key `G` instead of `A`. A previous chart’s tuning can likewise remain active.

**Recommendation:** Route chart-slot changes through a viewer callback that applies the returned transpose, capo, and dual settings, with an explicit destination-chart fallback when no tune exists. Add a chart-switch test with different saved tuning on each chart and assert the displayed key and capo.

**Confidence:** high

## Questions (non-findings)

None.

## Out of scope

- Diagram drawing and setlist swipe.
- Files outside the supplied diff and its direct dependents.