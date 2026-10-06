---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
reviewer: gpt-6
pass: informed
schema_version: "1.0"
---

## Summary

All three blind-pass findings remain valid under the external constraints: chart switching can erase an unsaved draft’s baseline, accepted sibling-chart changes can remain absent from the working file, and losing song identity can enable publishing from a local-only edit session.

The constraints neither exclude these paths nor change their severity. No additional findings emerge solely from the constraints. This reconciliation assesses the supplied code; it does not claim a fresh test run.

## Findings

### F-001 [major] Correctness — src/vue/ChordproViewer.vue:832-834

**Evidence:**
```ts
  onChartLoad: (tune) => {
    applyChartTune(tune)
    forceBase(session.getSource())
```

**Claim:** Unconditionally calling `forceBase()` clears an unsaved persisted draft’s dirty state and undo history when leaving editing changes the active chart.

**Impact:** With `TWO_CHARTS`, enter persisted editing, remove Oferta’s default marker, change its lyric, and leave without saving. Clearing `pinnedChartId` synchronously loads Completa and invokes this callback. `forceBase()` calls `session.reset()` even if the resulting text is unchanged, because the session is dirty. Reentering persisted editing then replaces the now-clean session with the official file, losing the unsaved changes.

**Recommendation:** Preserve the dirty session and undo history during chart switches caused by leaving an unsaved persisted edit. Separate destination-overlay loading from session rebaselining, and test leaving and reopening editing after changing the default marker and lyric without saving.

**Confidence:** high

---

### F-002 [major] State synchronization — src/vue/ChordproViewer.vue:829-830

**Evidence:**
```ts
  onBaseChange: () => {
    if (!isEdit.value) forceBase(session.getSource())
```

**Claim:** Using the existing session file for every base change prevents accepted official changes to sibling charts from reaching the working source.

**Impact:** While Oferta is open, accept a suggestion modifying Completa without a host source echo. `setOfficial()` updates and emits the complete official file, but `baseFor()` replaces only Oferta inside the existing session file. Completa therefore remains stale in `getSource()` and personal exports that consume the working file. The full-file emission constraint does not repair this divergence between the emitted official file and the viewer’s working file.

**Recommendation:** Distinguish official-file updates from personal-overlay updates. Propagate accepted changes to every affected chart in the working file while preserving the selected chart and applicable overlays. Add a regression accepting a sibling-chart suggestion without echoing `save-content` into props, asserting both the full emitted file and `getSource()` contain the accepted change.

**Confidence:** high

---

### F-003 [major] Write-role enforcement — src/vue/ChordproViewer.vue:2430-2435

**Evidence:**
```ts
      wMode.value = null
      ov.discardMemory()
      lastSongId = song
      lastExplicit = false
      identityLost.value = true
      forceBase()
```

**Claim:** Clearing `wMode` while leaving edit mode active allows a local-only editor to invoke publishing through Ctrl/Cmd+S after losing its song ID.

**Impact:** Mount with `editMode="local"`, enter editing, clear `songId`, then press Ctrl/Cmd+S. `isEdit` remains true, so the keyboard handler invokes `save()`. Its guard rejects only `wMode === 'local'`; the new `null` value passes and emits `update:source`, `save`, and `save-content`. A host handling those events can persist content from a local-only session with invalidated identity. This failure occurs in the Vue-owned write-mode boundary and requires no POST or change to the suggestion acknowledgment contract.

**Recommendation:** Exit editing when identity is lost, and require an explicitly persisted write mode plus a non-invalidated identity inside `save()`. Add a keyboard-save regression after identity loss asserting that no publishing events occur.

**Confidence:** high

## Questions (non-findings)

- _(none)_

## Out of scope

- Diagram drawing and setlist swipe.
- Overlay-key format and colon/% encoding.
- Findings against files outside the diff.

## Pass 2 reconciliation

### Dropped from blind pass

- _(none)_

### Maintained

- F-001-blind → F-001-final [major] — same
- F-002-blind → F-002-final [major] — same
- F-003-blind → F-003-final [major] — same

### Emerged

- _(none)_