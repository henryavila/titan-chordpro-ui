---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
reviewer: gpt-6
pass: informed
schema_version: "1.0"
---

## Summary

Three findings remain: removing an explicit identity during local editing can delete stored adjustments, reverting an adjustment can unexpectedly switch charts, and chart switches ignore saved tuning.

The legacy-key collision finding is excluded by the verified F1 deferral and locked T-001 key contract. No additional findings emerge from the supplied constraints. This pass checked the source and constraint documents; tests were not rerun.

## Findings

### F-001 [major] Data integrity — src/vue/ChordproViewer.vue:2415-2422

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

**Claim:** Removing `songId` while a personalized chart is being edited locally deletes an existing title-keyed overlay because rebasing invokes local autosave under the new identity.

**Impact:** `discardMemory()` clears the active overlay, then `forceBase()` calls `touch()` while `wMode` remains `local`. The resulting empty diff reaches `saveOverlay(null)`, removing the newly selected title identity’s stored overlay and legacy key. `holdChartLoad()` suppresses loading only; it does not prevent these writes. The added identity-removal test exercises reading mode and misses this deletion.

**Recommendation:** Suspend local autosave before clearing or rebasing identity-dependent state, and block overlay mutations while identity is unresolved. Add a local-edit regression test that seeds both identities and verifies both stored payloads remain unchanged after removing `songId`.

**Confidence:** high

---

### F-002 [major] Correctness — src/vue/use/useOverlay.ts:267-270

**Evidence:**
```ts
  function baseFor(wMode: WriteMode | null, file?: string): string {
    if (wMode === 'persisted' || showOriginal.value) return official.value
    return fileWithChart(file ?? official.value, chartSlot.value, applied.value.text)
  }
```

**Claim:** When an `oferta` overlay removes its default marker and opens `completa`, reverting a `completa` adjustment switches the screen back to `oferta`.

**Impact:** The revert invokes ordinary rebasing without a `file` argument, so `baseFor()` reconstructs from the official file containing the original `oferta` default marker. It applies only `completa`’s remaining adjustments, restoring the marker and changing the visible chart. The musician requests a lyric revert but receives a different chart and overlay panel. The second rebasing pass in `syncHostSource()` addresses initialization only; the existing regression test checks storage after reverting but not the visible chart.

**Recommendation:** Rebuild the reading projection consistently after every overlay mutation, preserving or deterministically reapplying the overlay changes that selected the current chart. Extend the marker-removal test to assert the visible chart, rendered body, and panel contents after reverting.

**Confidence:** high

---

### F-003 [major] Correctness — src/vue/use/useOverlay.ts:371-379

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

**Claim:** A same-song chart switch ignores the destination chart’s saved transpose, capo, and dual settings because this watcher discards the `TuneOp` returned by `load()`.

**Impact:** The destination’s text adjustments load while the viewer’s tuning remains unchanged. For example, when `oferta`’s overlay opens a `completa` chart written in G with saved transpose `+2` and capo `3`, the viewer retains its previous tuning instead of adopting A and capo 3. This breaks the per-chart tuning behavior covered by T-001’s overlay contract.

**Recommendation:** Notify the Vue viewer when a chart slot loads so it applies the returned tuning and resets to destination-chart defaults when no tuning exists. Keep that coordination outside core. Add a chart-switch regression test with different saved tuning on each chart and assert displayed key, capo, and dual state.

**Confidence:** high

## Questions (non-findings)

- _(none)_

## Out of scope

- Legacy-key namespace redesign and the colon-in-song-ID collision explicitly deferred in `.atomic-skills/projects/titan-chordpro-ui/versoes-cifra/decisions/F1.jsonl`.
- Diagram drawing and setlist swipe.
- Files outside the supplied diff and its direct dependents, except the required constraint documents.

## Pass 2 reconciliation

### Dropped from blind pass

- F-001-blind [major] Backward compatibility — DROPPED: The verified F1 `defer` decision excludes the colon-ID collision and prohibits reopening the key format; the proposed versioned namespace contradicts T-001’s exact key contract, while percent encoding is explicitly prescribed by the supplied constraints.

### Maintained

- F-002-blind → F-001-final [major] — same
- F-003-blind → F-002-final [major] — same
- F-004-blind → F-003-final [major] — same

### Emerged

- _(none)_