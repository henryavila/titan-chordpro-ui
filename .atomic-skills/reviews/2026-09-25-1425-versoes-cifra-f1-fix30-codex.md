---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
reviewer: gpt-6
pass: informed
schema_version: "1.0"
---

## Summary

All three blind-pass findings remain valid under the external constraints: suggestion acceptance can discard an unsaved sibling draft, dirty chart transitions disconnect overlay state from displayed text, and the no-tune fallback reads capo metadata across chart boundaries.

The recommendations remain within Vue’s paint and write-mode responsibilities and preserve full-file publication. No additional constraint-specific finding emerged. The import predicates from `tests/core/no-vue-in-core.test.ts` passed against all 28 core TypeScript files. This pass used source inspection; it did not repeat the blind pass’s component reproductions.

## Findings

### F-001 [major] Data loss — src/vue/ChordproViewer.vue:844-846

**Evidence:**
```ts
  onBaseChange: (origin) => {
    if (!isEdit.value) forceBase(origin === 'official' ? undefined : session.getSource())
  },
```

**Claim:** Accepting a suggestion after leaving a persisted edit can discard an unsaved sibling-chart draft.

**Impact:** Edit `oferta`, remove its default marker, leave without saving, then accept a suggestion for `completa`. Leaving clears the write mode but retains the dirty session. The official callback now passes `undefined`, so `baseFor()` rebuilds from the official file and `forceBase()` resets the entire session. The sibling draft and its undo history are lost.

**Recommendation:** Gate suggestion acceptance while a persisted draft is dirty, before archiving operations or emitting publication events. Require saving or explicitly discarding the draft first. Keep this guard in the Vue integration and preserve full-file `save-content` payloads. Add a regression covering an unsaved sibling draft.

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

**Claim:** Switching charts with a dirty session loads the destination overlay’s state and tune without applying its text.

**Impact:** With a personal title change stored on `completa`, edit `oferta`, remove its default marker, and leave without saving. `useOverlay` loads the destination overlay before this callback, but the dirty guard prevents its text from reaching the viewer. The viewer shows the official title alongside personal-version indicators, and exports using the working source omit the destination’s personal text changes. The added transition test has no destination overlay and misses this inconsistency.

**Recommendation:** Apply the destination overlay through a Vue reading projection that preserves the persisted draft’s baseline and undo history. Use that projection consistently for rendering and personal exports, while retaining the full document for publication. Test destination text changes together with a stored tune.

**Confidence:** high

---

### F-003 [major] Incorrect musical state — src/vue/ChordproViewer.vue:343-345

**Evidence:**
```ts
function preloadTune() {
  offset.value = 0
  capo.value = fileCapo(normalizeSource(hostSource.value))
```

**Claim:** The no-tune fallback reads the first capo directive in the host envelope instead of the opened chart’s capo.

**Impact:** If only `oferta` declares `{capo:3}` and its overlay removes the default marker, opening `completa` without a tune still selects capo 3. The viewer consequently displays incorrect capo instructions and chord shapes. The added test puts the desired capo in the first chart, so it does not distinguish chart-specific metadata from an envelope-wide match.

**Recommendation:** Resolve the opened chart in the effective file and read its capo metadata, defaulting to zero when absent. Keep selection and state handling in Vue, using existing core parsing APIs. Add tests where only a sibling declares a capo and where siblings declare different values.

**Confidence:** high

## Questions (non-findings)

## Out of scope

- Diagram drawing and setlist swipe.
- Overlay key format and colon/% encoding.
- Changes outside the supplied diff, except the explicitly requested core import-boundary verification.

## Pass 2 reconciliation

### Dropped from blind pass

- _(none)_

### Maintained

- F-001-blind → F-001-final [major] — same; refined the recommendation to guard acceptance before publication side effects and preserve full-file payloads.
- F-002-blind → F-002-final [major] — same; refined the recommendation to keep reading projection and draft management within Vue.
- F-003-blind → F-003-final [major] — same; chart-specific capo selection remains a Vue state concern and requires no Vue dependency in core.

### Emerged

- _(none)_