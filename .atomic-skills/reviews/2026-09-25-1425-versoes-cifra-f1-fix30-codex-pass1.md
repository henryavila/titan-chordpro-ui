---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
reviewer: gpt-6
pass: blind
schema_version: "1.0"
---

## Summary

Three correctness issues were reproduced with in-memory Vue component checks: accepting a suggestion can erase an unsaved sibling-chart draft, switching charts with a dirty draft omits the newly selected chart’s personal changes, and the capo fallback reads metadata from a sibling chart.

## Findings

### F-001 [major] Data loss — src/vue/ChordproViewer.vue:844-846

**Evidence:**
```ts
  onBaseChange: (origin) => {
    if (!isEdit.value) forceBase(origin === 'official' ? undefined : session.getSource())
  },
```

**Claim:** Accepting a suggestion after leaving a persisted edit can erase unsaved changes in another chart.

**Impact:** Reproduced by editing `oferta`, removing its default marker, leaving without saving, then accepting a suggestion for `completa`. Passing `undefined` makes `baseFor()` rebuild from the official file; `forceBase()` then resets the entire session, deleting the `oferta` draft and its undo history. HEAD loses the draft and switches back to `oferta`; the baseline preserves its text.

**Recommendation:** Defer suggestion acceptance while a persisted draft remains dirty, requiring that draft to be saved or explicitly discarded before replacing the working file. Add a regression covering an unsaved sibling draft.

**Confidence:** high

---

### F-002 [major] State consistency — src/vue/ChordproViewer.vue:847-850

**Evidence:**
```ts
  onChartLoad: (tune) => {
    applyChartTune(tune)
    if (!session.dirty()) forceBase(session.getSource())
  },
```

**Claim:** Switching charts while the session is dirty loads the destination overlay’s state without applying its text.

**Impact:** With a stored personal title change on `completa`, edit `oferta`, remove its default marker, and leave without saving. `useOverlay` loads `completa` before this callback, but the dirty guard prevents its text from reaching the viewer. HEAD displays the official title while showing “Minha versão”; the baseline displays the personal title. Personal text changes are also absent from the working source used for export. The new test exercises this transition without a destination overlay, so it misses the inconsistency.

**Recommendation:** Apply the destination overlay through a reading projection separate from the persisted draft, preserving the draft’s baseline and undo history. Test the transition with both destination text changes and a tune.

**Confidence:** high

---

### F-003 [major] Incorrect musical state — src/vue/ChordproViewer.vue:343-345

**Evidence:**
```ts
function preloadTune() {
  offset.value = 0
  capo.value = fileCapo(normalizeSource(hostSource.value))
```

**Claim:** The no-tune fallback selects the first capo directive anywhere in the host envelope instead of the opened chart’s capo.

**Impact:** Reproduced with `{capo:3}` only in `oferta`, whose overlay removes its default marker, opening `completa` without a capo or tune. The viewer displays “Capo 3” although the selected chart’s parsed metadata has no capo. This changes displayed chord shapes and capo-dependent exports. The added test places the desired capo in the first chart, masking the envelope-wide search.

**Recommendation:** Read capo metadata from the selected chart document in the current effective file, defaulting to zero when that chart has none. Add coverage where only a sibling declares a capo and where siblings declare different values.

**Confidence:** high

## Questions (non-findings)

## Out of scope

- Diagram drawing and setlist swipe.
- Overlay key format and colon/% encoding.
- Changes to files outside the supplied diff.