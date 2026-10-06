---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 1, minor: 1, nit: 0}
reviewer: gpt-6
pass: blind
schema_version: "1.0"
---

## Summary

Two regressions were reproduced: envelope source editing removes intermediate user input, and stored transposition is ignored for colonless metadata accepted by the parser.

Verification used in-memory core execution and a mounted SourcePane. The four targeted Vitest suites could not execute because the read-only sandbox blocked temporary-directory creation. Typechecking reported errors outside the diff.

## Findings

### F-001 [major] Correctness — src/vue/ChordproViewer.vue:2050

**Evidence:**
```ts
session.edit(commitChartDocument(session.getSource(), next))
touch()
```

**Claim:** Committing every source-pane keystroke through `replaceChart` destructively canonicalizes the song header because its metadata reader trims values and its writer removes empty fields.

**Impact:** In an envelope, typing a space after `Uma` inside `{title:Uma}` immediately restores `{title:Uma}` in the textarea; clearing the value removes the entire directive. This was reproduced with the mounted SourcePane. Users cannot naturally append another word or replace a title through this editor. The metadata dialog provides a workaround.

**Recommendation:** Keep the textarea’s raw draft independent of the canonicalized chart document while typing, and defer header normalization until an explicit commit or blur. Add incremental-input tests for appending title words and clearing/replacing title and artist values.

**Confidence:** high

### F-002 [minor] API compatibility — src/core/import-chordpro.ts:500

**Evidence:**
```ts
const doc = chartDocument(source)
const meta = readMeta(doc)
const n = Number(meta.transpose)
const stored = Number.isFinite(n) ? n : 0
```

**Claim:** Replacing the viewer’s parsed metadata with `readMeta` silently drops stored transposition when either `key` or `transpose` uses colonless syntax, because `readMeta` requires a colon while `parse` accepts its omission.

**Impact:** For `{key:C}\n{transpose 2}\n[C]uma`, `parse` returns `{key:"C", transpose:2}`, but `storedTransposeSemis` returns `0`. The previous viewer applied two semitones; the changed viewer displays C instead of D. `{key C}` with `{transpose:2}` fails similarly.

**Recommendation:** Read key and transpose using the same directive semantics as `parse`, preferably through a shared metadata parser. Add regression coverage for both colonless forms.

**Confidence:** high

## Questions (non-findings)

- None.

## Out of scope

- Typecheck errors in unchanged Cloudflare functions and browser/audio tests.
- Repository-wide security analysis and unrelated implementation files.