---
verdict: needs_changes
counts: {blocker: 1, critical: 2, major: 0, minor: 0, nit: 0}
reviewer: gpt-6
pass: blind
schema_version: "1.0"
---

## Summary

Three reproduced failures affect enveloped files: visual edits target incorrect source lines, clearing rehearsal media preserves old values, and sibling chords can suppress the default chart’s transposition.

Verification used read-only Node executions against the supplied test source and existing functions. Vitest could not execute tests because the filesystem sandbox blocked its temporary directory creation.

## Findings

### F-001 [blocker] Data integrity — src/core/parse.ts:308

**Evidence:**
```ts
const sliced = chartDocument(text, opts?.chartId)
const normalized = looksLikeOnSong(sliced) ? normalizeOnSong(sliced) : sliced
const { meta, lines, eocOf } = parseRaw(normalized)
```

**Claim:** Parsing now produces chart-relative line indices, but `ChordproViewer` still passes those blocks alongside the full file to its editing operations.

**Impact:** In the supplied `TWO_CHART_SOURCE`, the displayed `oferta` stanza has `li0 === 4`; full-source line 4 is `{start_of_x_chart:completa}`. Executing the viewer’s block-deletion operation removes that sibling delimiter, leaves the selected lyric untouched, and makes `completa` disappear from `listCharts`. Other line-based edits can overwrite unrelated metadata or content.

**Recommendation:** Make the editor operate on `parsed.source` and splice edits back through `replaceChart`, or provide and consistently apply a source-coordinate mapping. Add an integration test that edits and deletes a default-chart block while asserting sibling content and delimiters remain intact.

**Confidence:** high

### F-002 [critical] API compatibility — src/core/import-chordpro.ts:438

**Evidence:**
```ts
const song = songPatchOf(meta)
const sound = soundPatchOf(meta)
const withSong = Object.keys(song).length ? writeSongScopedMeta(source, song) : source
if (!Object.keys(sound).length) return withSong
return writeChartScopedMeta(withSong, sound, splitCho(withSong).defaultId)
```

**Claim:** The new envelope branch preserves omitted metadata, while existing deletion callers still remove properties before invoking `writeMeta`.

**Impact:** After adding media to the supplied enveloped source, calling `setRehearsalAudio(source, { sung: null, playback: null, art: null })` retains both URLs and the cover. `setAudioUrl` and `setAudioArt` use `delete`, so the requested removals never reach the scoped writer. The same mismatch affects strum replacement in `applyCifraClubEnrich`, which can preserve a stale `x_strum_set`.

**Recommendation:** Update every replacement-style caller to send explicit empty values for deleted fields, or preserve replacement semantics through a separate API. Test media clearing and multi-pattern-to-single-pattern replacement on enveloped files.

**Confidence:** high

### F-003 [critical] Transposition correctness — src/vue/ChordproViewer.vue:786

**Evidence:**
```ts
const writtenKey = computed(() => inferWrittenKey(liveSource.value))
const writtenMatchesKey = computed(() => {
  const a = keyIndex(keyRootOf(writtenKey.value || ''))
  const b = keyIndex(keyRootOf(meta.value.key || ''))
  return a != null && b != null && a === b
})
```

```ts
const viewSemis = computed(() =>
  isEdit.value ? 0 : offset.value + (writtenMatchesKey.value ? fileTranspose.value : 0),
)
```

**Claim:** This direct caller compares key inference from all sibling charts with metadata from the newly sliced default chart, allowing siblings to disable its stored transposition.

**Impact:** Using `TWO_CHART_SOURCE` with `{transpose:2}` added to `oferta`, the selected chart has key C and written chords C, but whole-file inference returns G from `completa`. The viewer consequently calculates zero semitones instead of two and displays the chart in the wrong playing key.

**Recommendation:** Infer the written key from `parsed.value.source`, and keep key-mismatch detection scoped to that same document. Add a viewer regression test with differently keyed siblings and a nonzero default-chart transpose.

**Confidence:** high

## Questions (non-findings)

- src/core/import-chordpro.ts:434 — Should song-targeted `writeMeta` expose `x_chart_default`? The runtime supports it, but `ChartMeta` rejects that property in typed calls.

## Out of scope

- Unrelated files and behavior outside the diff’s direct callers.
- Full test-suite results; Vitest was blocked before executing tests.