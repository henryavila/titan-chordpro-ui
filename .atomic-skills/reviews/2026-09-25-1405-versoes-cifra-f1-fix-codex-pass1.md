---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
reviewer: gpt-6
pass: blind
schema_version: "1.0"
---

## Summary

Three regressions were reproduced in an in-memory component harness and compared against `320d92a`: unsaved edits disappear after reopening the editor, accepted sibling-chart changes remain absent from the working source, and losing song identity enables publish events from local editing.

The standard test suite could not execute because the read-only environment prevents temporary-file creation. No files were changed.

## Findings

### F-001 [major] Correctness — src/vue/ChordproViewer.vue:832-834

**Evidence:**
```ts
  onChartLoad: (tune) => {
    applyChartTune(tune)
    forceBase(session.getSource())
```

**Claim:** The unconditional `forceBase()` clears an unsaved persisted draft’s dirty state when leaving editing changes the active chart.

**Impact:** With `TWO_CHARTS`, enter persisted editing, remove Oferta’s default marker, modify its lyric, and leave without saving. Clearing `pinnedChartId` synchronously invokes this callback; `session.reset()` marks the draft clean and clears its history. Reentering editing then replaces it with the official source, losing the changes despite the displayed promise that the draft remains available. The baseline preserves the draft through this sequence.

**Recommendation:** Preserve the dirty session and undo history when a chart switch occurs while leaving an unsaved persisted edit. Separate loading the destination overlay from resetting the source baseline, and add a regression covering exit and reentry without saving.

**Confidence:** high

---

### F-002 [major] State synchronization — src/vue/ChordproViewer.vue:829-830

**Evidence:**
```ts
  onBaseChange: () => {
    if (!isEdit.value) forceBase(session.getSource())
```

**Claim:** Passing the existing session file for every base change prevents accepted official changes to sibling charts from reaching the working source.

**Impact:** While Oferta is open, accept a suggestion modifying Completa without a host source echo. `setOfficial()` contains and emits the accepted change, but `baseFor()` splices only Oferta into the stale session file. The exposed `getSource()` therefore still returns Completa’s old content; operations consuming the working source receive a file that omits an already accepted change. The same reproduction updates the session correctly at the baseline.

**Recommendation:** Distinguish official-document updates from personal-overlay changes. Merge official changes into the working file across all affected charts while preserving the selected chart. Add a test accepting a sibling-chart suggestion without echoing `save-content` into props.

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

**Claim:** Clearing `wMode` while leaving edit mode active allows a local-only editor to invoke the publishing path through Ctrl/Cmd+S after losing its song ID.

**Impact:** Mount with `editMode="local"`, enter editing, clear `songId`, then press Ctrl+S. `isEdit` remains true, so the keyboard handler calls `save()`. Its guard rejects only `wMode === 'local'`; the new `null` value passes and emits `update:source`, `save`, and `save-content`. A host persisting these events can publish content from a local-only session whose identity is already invalid. The reproduction emits one `save-content` event on HEAD and none at the baseline.

**Recommendation:** Exit editing when identity is lost and require a valid identity plus an explicitly persisted write mode inside `save()`. Add a keyboard-save regression after identity loss that asserts no publishing events.

**Confidence:** high

## Questions (non-findings)

None.

## Out of scope

- Diagram drawing, setlist swipe, and overlay-key format and encoding.
- Findings against files outside the diff.