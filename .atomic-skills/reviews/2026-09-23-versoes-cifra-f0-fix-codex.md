---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 1, minor: 1, nit: 0}
reviewer: gpt-6
pass: informed
schema_version: "1.0"
---

## Summary

Both previous findings remain valid under the external constraints. Envelope source editing discards intermediate metadata input, and stored transposition is ignored for colonless directives accepted by `parse`.

Verification used in-memory core execution and a mounted SourcePane exercising the changed commit-and-projection path. No additional findings emerged from the constraints. Sound patches targeting the previous default chart and preservation of omitted `x_chart_default` comply with the stated contracts.

## Findings

### F-001 [major] Correctness — src/vue/ChordproViewer.vue:2050

**Evidence:**
```ts
session.edit(commitChartDocument(session.getSource(), next))
touch()
```

**Claim:** Committing every source-pane keystroke through `replaceChart` removes intermediate metadata input because the song-header reader trims values and the writer removes empty fields.

**Impact:** In an envelope, entering `{title:Uma }` immediately restores `{title:Uma}`; entering `{title:}` removes the directive from the textarea. Both behaviors were reproduced with mounted SourcePane feedback. Users cannot naturally append title words or clear and retype metadata values. The metadata dialog provides a workaround.

**Recommendation:** Preserve the textarea’s raw draft while typing and defer header normalization until an explicit commit or blur. Add incremental-input tests for appending words and clearing/replacing title and artist values.

**Confidence:** high

### F-002 [minor] API compatibility — src/core/import-chordpro.ts:500

**Evidence:**
```ts
const meta = readMeta(doc)
const n = Number(meta.transpose)
const stored = Number.isFinite(n) ? n : 0
```

**Claim:** The viewer now loses stored transposition for colonless `key` or `transpose` directives because this helper uses colon-required `readMeta` instead of the viewer’s previously parsed metadata.

**Impact:** For `{key:C}` plus `{transpose 2}` and written C chords, `parse` returns transposition `2`, but `storedTransposeSemis` returns `0`; the viewer consequently displays C instead of D. `{key C}` plus `{transpose:2}` fails identically. Both cases were reproduced.

**Recommendation:** Read key and transposition with the same directive semantics as `parse`, using a shared core parser without Vue dependencies. Add regression coverage for both colonless forms.

**Confidence:** high

## Questions (non-findings)

- None.

## Out of scope

- Unrelated files and repository-wide security analysis.
- Full acceptance-suite verification; targeted reproductions were executed in memory.

## Pass 2 reconciliation

- **Dropped:** None.
- **Maintained:** F-001 — the constraints do not prevent destructive normalization during typing. F-002 — the explicitly different directive grammars confirm the compatibility regression.
- **Emerged:** None. The previous-default targeting rule and omitted-default preservation rule do not constitute defects; no Vue imports were found in core.