---
verdict: needs_changes
counts: {blocker: 1, critical: 2, major: 1, minor: 0, nit: 0}
reviewer: gpt-6
pass: informed
schema_version: "1.0"
---

## Summary

All three blind-pass findings remain valid under the external constraints. Read-only executions reproduced sibling-chart corruption during block deletion, ineffective rehearsal-media clearing, and suppression of the default chart’s stored transposition.

One additional API-contract finding emerges: `x_chart_default` is a song-header key, but two-argument `writeMeta` silently discards it, and the public parameter type rejects it even with `target: 'song'`.

The reviewed source files and relevant callers match `d9b5d22`. Verification used the supplied test source, actual core functions, and an in-memory TypeScript compiler check. The no-Vue-in-core import check found no violations. No files were modified; the full test suite was not run.

## Findings

### F-001 [blocker] Data integrity — src/core/parse.ts:308

**Evidence:**
```ts
const sliced = chartDocument(text, opts?.chartId)
const normalized = looksLikeOnSong(sliced) ? normalizeOnSong(sliced) : sliced
const { meta, lines, eocOf } = parseRaw(normalized)
```

The direct caller in `src/vue/ChordproViewer.vue:847` passes full-file source alongside blocks derived from that sliced parse:

```ts
const bedit = useBlockEdit({
  source: liveSource,
  blocks,
```

**Claim:** Parsing produces chart-relative line indices, but the viewer applies those indices to the full enveloped file.

**Impact:** With `TWO_CHART_SOURCE`, the displayed `oferta` stanza has `li0 === 4`; full-file line 4 is `{start_of_x_chart:completa}`. Executing the existing block-deletion operation removes that sibling delimiter, leaves the selected lyric untouched, and makes `completa` disappear from `listCharts`. Other line-based edits can overwrite unrelated source content.

**Recommendation:** Make visual editing operate on `parsed.source`, then splice changes back through `replaceChart`, or consistently translate every edit through a source-coordinate mapping. Add an integration test that deletes and edits a default-chart block while preserving sibling content and delimiters.

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

The direct caller in `src/core/audio-url.ts:70` still represents removal by omission:

```ts
if (url == null || !String(url).trim()) {
  delete cur[key]
  return writeMeta(source, cur)
}
```

**Claim:** Existing deletion callers omit properties, so the required envelope patch semantics preserve values those callers are supposed to clear.

**Impact:** After adding rehearsal media to `TWO_CHART_SOURCE`, `setRehearsalAudio(source, { sung: null, playback: null, art: null })` retains both audio URLs and the cover, including its dimensions. The host cannot clear these fields through the existing API. `applyCifraClubEnrich` uses the same deletion pattern for strum replacement and can retain a stale `x_strum_set`.

**Recommendation:** Preserve the specified patch semantics and update deletion callers to send explicit empty values. Add enveloped-file tests for clearing both audio tracks and artwork, and for replacing a multiple-pattern strum set with a single pattern.

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

**Claim:** The viewer compares whole-file chord inference against metadata from the newly sliced default chart, allowing sibling chords to disable its transposition.

**Impact:** With `{transpose:2}` added to `oferta` in `TWO_CHART_SOURCE`, the selected chart’s declared and inferred keys are both C, but whole-file inference returns G from `completa`. At zero user offset, the viewer consequently applies zero semitones instead of two and displays the wrong playing key.

**Recommendation:** Infer the written key from `parsed.value.source` and scope key-mismatch detection to the same document. Add a viewer regression test with differently keyed siblings and a nonzero default-chart transpose.

**Confidence:** high

### F-004 [major] API contract — src/core/import-chordpro.ts:411

**Evidence:**
```ts
function songPatchOf(meta: ChartMeta): ChartMeta {
  const patch: ChartMeta = {}
  for (const k of SONG_META_KEYS) {
    if (k === 'x_chart_default') continue
    if (meta[k] !== undefined) patch[k] = meta[k]
  }
  return patch
}
```

**Claim:** `writeMeta` excludes the recognized song-header key `x_chart_default` from untargeted patches, while its `ChartMeta` parameter also prevents typed song-targeted writes.

**Impact:** Calling `writeMeta(TWO_CHART_SOURCE, { x_chart_default: 'completa' })` from JavaScript leaves `oferta` as the default without reporting an error. TypeScript rejects the property even when `{ target: 'song' }` is supplied. Consumers must bypass the type contract or edit raw source to change the default.

**Recommendation:** Expose a song-metadata patch type containing `x_chart_default` and route that key through the song-header writer for enveloped files. Preserve the established flat-file behavior. Add runtime and type-level tests for setting and clearing the default.

**Confidence:** high

## Questions (non-findings)

- _(none)_

## Out of scope

- Unrelated files and behavior outside the diff’s direct callers.
- Full test-suite and browser integration results.

## Pass 2 reconciliation

### Dropped from blind pass

- _(none)_

### Maintained

- F-001-blind → F-001-final [blocker] — same; none of the constraints resolve the mismatch between chart-relative indices and full-file editing.
- F-002-blind → F-002-final [critical] — same; patch semantics are required, making migration of deletion callers necessary.
- F-003-blind → F-003-final [critical] — same; sibling isolation in parsing does not scope the viewer’s whole-file key inference.

### Emerged

- F-004-final [major] API contract — emerged: the explicit song-header classification of `x_chart_default`, combined with the present-key patch contract, exposes its exclusion from runtime patches and public types; this promotes the blind pass’s API question into a verified finding.