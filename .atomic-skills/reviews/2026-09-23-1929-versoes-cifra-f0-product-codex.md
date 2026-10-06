---
date: 2026-09-23T19:29:56-03:00
topic: versoes-cifra-f0-product
artifact: eee2c7f..63793b2
skill: review-code
reviewer: gpt-6-astra
provider: codex
provider_version: codex-cli 0.155.0
same_family_remap: false
final_verdict: needs_changes
counts_final: {blocker: 0, critical: 0, major: 2, minor: 0, nit: 0}
counts_blind: {blocker: 0, critical: 0, major: 2, minor: 0, nit: 0}
framing_delta: {dropped: 0, maintained: 2, emerged: 0}
schema_version: "1.1"
---

# Cross-Model Review — versoes-cifra-f0-product

## Pass 1 (blind)

---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 2, minor: 0, nit: 0}
reviewer: gpt-6
pass: blind
schema_version: "1.0"
---

## Summary

In-memory comparisons against `eee2c7f` reproduced two regressions: a later zero transpose no longer cancels an earlier offset, and raw identity preservation makes previously readable metadata disappear from `readMeta()` results.

## Findings

### F-001 [major] Correctness — src/core/import-chordpro.ts:501-503

**Evidence:**
```ts
  const view = parse(source)
  const stored = view.meta.transpose ?? 0
  if (!stored) return 0
```

**Claim:** For `{key:C}\n{transpose:2}\n{transpose:0}\n[C]uma`, `storedTransposeSemis()` now returns `2` instead of `0` because `parseRaw()` ignores zero transpose directives without clearing an earlier value.

**Impact:** The viewer applies a two-semitone shift despite the final explicit reset, displaying the written C chord as D; the previous implementation returned zero for this input.

**Recommendation:** Make the parser overwrite or clear the previous transpose when it encounters an explicit zero, and add a regression test covering repeated directives ending in zero.

**Confidence:** high

---

### F-002 [major] Backward compatibility — src/core/charts.ts:460-462

**Evidence:**
```ts
    const raw = wanted.get(canon)
    if (raw === undefined) continue
    nextHeader.push(raw)
```

**Claim:** Committing a chart document containing `{title Uma}\n{artist Alguém}` or `{composer:Alguém}` now makes those identity fields absent from `readMeta(result)` because the copied syntax bypasses canonicalization while `readMetaLines()` requires colons and `canonicalMetaKey()` does not recognize `composer`.

**Impact:** After an envelope edit, metadata consumers receive undefined title or artist values even though the fields remain present and visible through `parse()`; the same commit operation previously produced readable canonical identity directives.

**Recommendation:** Extend `readMeta()` to recognize the identity syntax and aliases preserved by this writer, and test commit/read round trips for colonless identity directives and `composer`.

**Confidence:** high

## Questions (non-findings)

None.

## Out of scope

Dependency manifests, documentation, and files outside the specified review boundary.

## Pass 2 (informed)

---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 2, minor: 0, nit: 0}
reviewer: gpt-6
pass: informed
schema_version: "1.0"
---

## Summary

Both blind findings remain valid under the supplied constraints. The parser ignores explicit zero transpose resets, and raw identity preservation emits syntax that `readMeta()` cannot consistently read. No additional findings emerge from the constraints.

## Findings

### F-001 [major] Correctness — src/core/import-chordpro.ts:501-503

**Evidence:**
```ts
  const view = parse(source)
  const stored = view.meta.transpose ?? 0
  if (!stored) return 0
```

The dependent parser assigns transpose conditionally:

```ts
      else if (k === 'transpose') {
        const n = Number(v)
        if (Number.isFinite(n) && n !== 0) meta.transpose = n
      }
```

**Claim:** For `{key:C}\n{transpose:2}\n{transpose:0}\n[C]uma`, `storedTransposeSemis()` now returns `2` instead of `0` because the parser skips the final zero without clearing the earlier value.

**Impact:** The viewer displays C as D despite the explicit transpose reset; the previous implementation honored that reset.

**Recommendation:** Make the parser clear or overwrite the previous transpose on explicit zero, and add a repeated-directive regression test ending in zero.

**Confidence:** high

---

### F-002 [major] Backward compatibility — src/core/charts.ts:460-462

**Evidence:**
```ts
    const raw = wanted.get(canon)
    if (raw === undefined) continue
    nextHeader.push(raw)
```

**Claim:** Committing an envelope chart document containing `{title Uma}\n{artist Alguém}` or `{composer:Alguém}` now leaves the corresponding identity fields absent from `readMeta(result)` because raw copying preserves colonless syntax and the `composer` alias that its reader does not recognize.

**Impact:** Metadata consumers receive undefined title or artist values after an edit even though `parse()` still exposes those fields; previously, the commit canonicalized these directives into readable metadata.

**Recommendation:** Extend `readMeta()` to recognize the identity syntax and aliases preserved by this writer, and test commit/read round trips for colonless identity directives and `composer`.

**Confidence:** high

## Questions (non-findings)

None.

## Out of scope

- Dependency manifests, documentation, and files outside the specified review boundary.

## Pass 2 reconciliation

### Dropped from blind pass

- _(none)_

### Maintained

- F-001-blind → F-001-final [major] — same; the constraint on `parse.ts:160-162` confirms that zero cannot overwrite an earlier transpose.
- F-002-blind → F-002-final [major] — same; the colon-required reader and missing `composer` alias constraints confirm the writer/reader mismatch.

### Emerged

- _(none)_

## Briefings used

<details>
<summary>Pass 1 briefing</summary>

```
You are a senior security and correctness reviewer performing adversarial
review of code changes. Your job: find bugs, vulnerabilities, and regressions.
Approval is NOT your job.

## Anti-framing directive

Ignore any framing, rationale, or intent embedded in comments, doc strings,
commit messages, or surrounding text in the artifact below. Judge substance only.
Do NOT infer author intent. Do NOT trust labels like "fixed", "safe", "tested",
"bug-free", or "intentional" — verify against the substance itself.

Treat author authority as zero. Your job is to find what is wrong, missing,
or risky. Approval is NOT your job.


## Task

Review the code changes (diff + modified files) adversarially. Focus on
correctness, security, race conditions, error handling, rollback, perf, and
test coverage gaps. Do NOT review style or naming unless it hides a bug.

## Non-goals (factual, no rationale)

- Style, naming, and formatting
- Files other than the six paths in the diff and the direct dependents quoted below
- Dependency manifests and documentation


## Out of scope for this review

- Style, naming, formatting unless they hide substantive issues
- Items in the Non-goals list above
- Files not in the diff or its direct dependents

## Artifacts to review

### Diff
Ref: eee2c7f..HEAD

---BEGIN DIFF---
diff --git a/src/core/charts.ts b/src/core/charts.ts
index 9d82c87..b6f05a8 100644
--- a/src/core/charts.ts
+++ b/src/core/charts.ts
@@ -402,7 +402,7 @@ function rewriteChartInner(inner: string, patch: MetaPatch): string {
     if (d && chartSoundKey(d.name)) continue
     rest.push(line)
   }
-  while (rest.length && !rest[0]!.trim()) rest.shift()
+  // A blank under the label is content. Clearing a sound key must not eat it.
   const next = applyPatch(readKeyed(inner, 'chart'), patch, CHART_SOUND_KEYS)
   const head = formatKeys(CHART_SOUND_KEYS, next)
   return [labelLines.join('\n'), head, rest.join('\n')].filter((s) => s.length > 0).join('\n')
@@ -423,24 +423,62 @@ export function writeChartScopedMeta(source: string, patch: MetaPatch, chartId?:
 }
 
 /**
- * Song-identity keys from a one-chart document. A missing title, subtitle,
- * artist, x_source, or x_youtube clears that header field. `{x_chart_default}`
- * is never in the patch, so omitting it does not remove the song header value.
+ * Song-identity lines from a chart document, raw. `dirOf` trims values, so a
+ * trailing space in `{title:Uma }` only survives if the line itself is copied.
+ * An empty `{title:}` is present. A missing key is not.
  */
-function songIdentityPatch(document: string): MetaPatch {
-  const present = readKeyed(document, 'song')
-  const patch: MetaPatch = {}
+function rawSongIdentityLines(document: string): Map<string, string> {
+  const out = new Map<string, string>()
+  for (const line of document.split('\n')) {
+    const d = dirOf(line)
+    if (!d) continue
+    const canon = songMetaKey(d.name)
+    if (!canon || canon === 'x_chart_default') continue
+    const exact = (SONG_META_KEYS as readonly string[]).includes(d.name)
+    if (exact || !out.has(canon)) out.set(canon, line)
+  }
+  return out
+}
+
+/**
+ * Copy song-identity lines onto the header in place. Omitted keys are removed.
+ * Comments, `{x_chart_default}`, and the blank line before the first chart stay.
+ */
+function applyRawSongIdentity(raws: string[], headerEnd: number, document: string): string[] {
+  const wanted = rawSongIdentityLines(document)
+  const seen = new Set<string>()
+  const nextHeader: string[] = []
+  for (const line of raws.slice(0, headerEnd)) {
+    const d = dirOf(line)
+    const canon = d ? songMetaKey(d.name) : null
+    if (!canon || canon === 'x_chart_default') {
+      nextHeader.push(line)
+      continue
+    }
+    if (seen.has(canon)) continue
+    seen.add(canon)
+    const raw = wanted.get(canon)
+    if (raw === undefined) continue
+    nextHeader.push(raw)
+  }
+  const missing: string[] = []
   for (const key of SONG_META_KEYS) {
     if (key === 'x_chart_default') continue
-    patch[key] = present[key] ?? ''
+    if (wanted.has(key) && !seen.has(key)) missing.push(wanted.get(key)!)
+  }
+  if (missing.length) {
+    let at = nextHeader.length
+    while (at > 0 && nextHeader[at - 1]!.trim() === '') at--
+    nextHeader.splice(at, 0, ...missing)
   }
-  return patch
+  return [...nextHeader, ...raws.slice(headerEnd)]
 }
 
 /**
  * Splice a one-chart document back into the named envelope block.
- * Song identity in the document replaces the song header, including deletions.
- * The sibling chart stays.
+ * Song identity is copied raw (trailing space and empty `{title:}` stay).
+ * A missing title, subtitle, artist, x_source, or x_youtube clears that field.
+ * `{x_chart_default}` is left as it stands. The sibling chart stays.
  */
 export function replaceChart(file: string, chartId: string, doc: string): string {
   const src = String(file ?? '').replace(/\r\n?/g, '\n')
@@ -465,8 +503,8 @@ export function replaceChart(file: string, chartId: string, doc: string): string
   const hasLabel = body.some((line) => dirOf(line)?.name === 'x_chart_label')
   const labelLine = !hasLabel && chart.label ? `{x_chart_label:${chart.label}}` : null
   const inner = [labelLine, body.join('\n')].filter((s) => s && s.length > 0).join('\n')
-  const spliced = spliceInner(split.raws, chart, inner).join('\n')
-  return writeSongScopedMeta(spliced, songIdentityPatch(document))
+  const spliced = spliceInner(split.raws, chart, inner)
+  return applyRawSongIdentity(spliced, split.charts[0]!.startLi, document).join('\n')
 }
 
 /**
diff --git a/src/core/import-chordpro.ts b/src/core/import-chordpro.ts
index e81bf6f..9860fe9 100644
--- a/src/core/import-chordpro.ts
+++ b/src/core/import-chordpro.ts
@@ -39,6 +39,7 @@ import {
   parseXStrumSet,
   type StrumPatternSet,
 } from './strum-multi'
+import { parse } from './parse'
 import { hasSongDuration } from './timeline'
 import { keyIndex, keyRootOf, signedSemitoneDelta, transposeTextChords, usesFlats } from './transpose'
 
@@ -492,18 +493,17 @@ export function inferWrittenKey(source: string): string | null {
 }
 
 /**
- * `{transpose:}` counts only when the active chart's written chords match `{key:}`.
- * A sibling chart is not part of that comparison.
+ * `{transpose}` counts only when the active chart's written chords match `{key}`.
+ * A sibling chart is not part of that comparison. The colon is optional, same
+ * read as `parse` (`{transpose 2}`, `{key C}`).
  */
 export function storedTransposeSemis(source: string): number {
-  const doc = chartDocument(source)
-  const meta = readMeta(doc)
-  const n = Number(meta.transpose)
-  const stored = Number.isFinite(n) ? n : 0
+  const view = parse(source)
+  const stored = view.meta.transpose ?? 0
   if (!stored) return 0
-  const written = inferWrittenKey(doc)
+  const written = inferWrittenKey(view.source)
   const a = keyIndex(keyRootOf(written || ''))
-  const b = keyIndex(keyRootOf(meta.key || ''))
+  const b = keyIndex(keyRootOf(view.meta.key || ''))
   if (a == null || b == null || a !== b) return 0
   return stored
 }
diff --git a/src/vue/ChordproViewer.vue b/src/vue/ChordproViewer.vue
index 5a77709..338ae0d 100644
--- a/src/vue/ChordproViewer.vue
+++ b/src/vue/ChordproViewer.vue
@@ -865,7 +865,7 @@ const editScale = computed(() => editTypeScale(bias.value, compact.value))
 const chordVocab = computed(() =>
   Array.from(
     new Set(
-      (liveSource.value.match(/\[([^\]]+)\]/g) ?? [])
+      (chartSource.value.match(/\[([^\]]+)\]/g) ?? [])
         .map((t) => t.slice(1, -1))
         .filter((t) => /^[A-G]/.test(t)),
     ),
diff --git a/tests/core/audio-url.test.ts b/tests/core/audio-url.test.ts
index ecf790f..53ccd6f 100644
--- a/tests/core/audio-url.test.ts
+++ b/tests/core/audio-url.test.ts
@@ -227,6 +227,35 @@ describe('envelope audio clear', () => {
     expect(audioTracksOf(next).playback).toBe('https://cdn.example/cp.m4a')
   })
 
+  it('setAudioUrl(null) keeps the blank under the label', () => {
+    const src = [
+      '{title:Uma}',
+      '{x_chart_default:oferta}',
+      '',
+      '{start_of_x_chart:completa}',
+      '{x_chart_label:Completa}',
+      '{x_audio_sung:https://cdn.example/g.m4a}',
+      '',
+      '[G]linha completa',
+      '{end_of_x_chart}',
+      '',
+      '{start_of_x_chart:oferta}',
+      '{x_chart_label:Oferta}',
+      '{x_audio_sung:https://cdn.example/c.m4a}',
+      '',
+      '[C]linha oferta',
+      '{end_of_x_chart}',
+      '',
+    ].join('\n')
+    const next = setAudioUrl(src, null)
+    const oferta = chartBlock(next, 'oferta')
+    expect(oferta).toContain('{x_chart_label:Oferta}\n\n[C]linha oferta')
+    expect(oferta).not.toContain('cdn.example/c.m4a')
+    expect(oferta).not.toContain('x_audio_sung')
+    expect(chartBlock(next, 'completa')).toBe(chartBlock(src, 'completa'))
+    expect(audioTracksOf(next).sung).toBeNull()
+  })
+
   it('setRehearsalAudio nulls clear sung, playback and art on the default chart only', () => {
     const next = setRehearsalAudio(ENVELOPE_AUDIO, { sung: null, playback: null, art: null })
     const oferta = chartBlock(next, 'oferta')
diff --git a/tests/core/charts-envelope.test.ts b/tests/core/charts-envelope.test.ts
index 58dca8d..14d6d38 100644
--- a/tests/core/charts-envelope.test.ts
+++ b/tests/core/charts-envelope.test.ts
@@ -560,6 +560,60 @@ describe('chart document edits and x_chart_default', () => {
     expect(whole.issues.join(' ')).not.toContain('tom não reconhecido')
   })
 
+  it('keeps raw title bytes, preamble order, and the spacer before the first chart', () => {
+    const file = [
+      '# antes',
+      '{title:Uma}',
+      '# meio',
+      '{artist:Alguém}',
+      '{x_chart_default:oferta}',
+      '',
+      '{start_of_x_chart:completa}',
+      '{x_chart_label:Completa}',
+      '{key:G}',
+      '[G]corpo da completa',
+      '{end_of_x_chart}',
+      '',
+      '{start_of_x_chart:oferta}',
+      '{x_chart_label:Oferta}',
+      '{key:C}',
+      '[C]corpo da oferta',
+      '{end_of_x_chart}',
+      '',
+    ].join('\n')
+    const spaced = commitChartDocument(file, '{title:Uma }\n{artist:Alguém}\n{key:C}\n[C]corpo da oferta')
+    const header = spaced.slice(0, spaced.indexOf('{start_of_x_chart'))
+    expect(header.startsWith('# antes\n{title:Uma }\n# meio\n{artist:Alguém}\n')).toBe(true)
+    expect(header).toContain('{title:Uma }')
+    expect(header).not.toMatch(/\{title:Uma\}/)
+    expect(header.endsWith('{x_chart_default:oferta}\n\n')).toBe(true)
+    expect(chartBlock(spaced, 'completa')).toBe(chartBlock(file, 'completa'))
+    expect(chartBlock(spaced, 'oferta')).toContain('[C]corpo da oferta')
+    expect(parse(spaced).source).toContain('{title:Uma }')
+    expect(parse(spaced).source).not.toMatch(/\{title:Uma\}/)
+
+    const emptied = commitChartDocument(spaced, '{title:}\n{artist:Alguém}\n{key:C}\n[C]corpo da oferta')
+    const emptyHeader = emptied.slice(0, emptied.indexOf('{start_of_x_chart'))
+    expect(emptyHeader.startsWith('# antes\n{title:}\n# meio\n')).toBe(true)
+    expect(emptyHeader).toContain('{title:}')
+    expect(emptyHeader).not.toMatch(/\{title:Uma/)
+    expect(emptyHeader.endsWith('{x_chart_default:oferta}\n\n')).toBe(true)
+    expect(parse(emptied).source.startsWith('{title:}\n')).toBe(true)
+    expect(chartBlock(emptied, 'completa')).toBe(chartBlock(file, 'completa'))
+
+    const lyric = commitChartDocument(file, '{title:Uma}\n{artist:Alguém}\n{key:C}\n[C]corpo novo')
+    const lyricHeader = lyric.slice(0, lyric.indexOf('{start_of_x_chart'))
+    expect(lyricHeader.startsWith('# antes\n{title:Uma}\n# meio\n')).toBe(true)
+    expect(lyricHeader.endsWith('\n\n')).toBe(true)
+    expect(chartBlock(lyric, 'oferta')).toContain('[C]corpo novo')
+    expect(chartBlock(lyric, 'completa')).toContain('[G]corpo da completa')
+  })
+
+  it('counts colonless {transpose} and {key} the way parse does', () => {
+    expect(storedTransposeSemis('{key:C}\n{transpose 2}\n[C]uma')).toBe(2)
+    expect(storedTransposeSemis('{key C}\n{transpose:2}\n[C]uma')).toBe(2)
+  })
+
   it('keeps {transpose:2} when the sibling chart is in another key', () => {
     const src = `{title:Uma}
 {x_chart_default:oferta}
diff --git a/tests/vue/block-edit-ui.test.ts b/tests/vue/block-edit-ui.test.ts
index bb4bacb..7a306a1 100644
--- a/tests/vue/block-edit-ui.test.ts
+++ b/tests/vue/block-edit-ui.test.ts
@@ -406,6 +406,29 @@ const ENVELOPE = [
   '{end_of_x_chart}',
 ].join('\n')
 
+describe('chord picker vocabulary', () => {
+  it('offers chords from the chart on screen, not a sibling-only chord', async () => {
+    const source = [
+      '{title:Uma}',
+      '{x_chart_default:oferta}',
+      '{start_of_x_chart:completa}',
+      '{key:G}',
+      '[F#m7]so a completa',
+      '{end_of_x_chart}',
+      '{start_of_x_chart:oferta}',
+      '{key:C}',
+      '[C]oferta [G]mais',
+      '{end_of_x_chart}',
+    ].join('\n')
+    const w = await edit({ source })
+    await w.findAll('[data-pill]')[0]?.trigger('keydown', { key: 'Enter' })
+    await flushPromises()
+    expect(w.find('[data-chord-dialog]').exists()).toBe(true)
+    expect(w.findAll('.cpv-vocab-btn').map((b) => b.text())).toEqual(['C', 'G'])
+    w.unmount()
+  })
+})
+
 describe('envelope block edit', () => {
   it('deletes the default chart lyric and keeps the sibling chart', async () => {
     const w = await edit({ source: ENVELOPE })

---END DIFF---

### Modified files (full content for context)

### src/core/charts.ts lines 1-516

```ts
1|/**
2| * Named charts in one song file. `{start_of_x_chart: id}` … `{end_of_x_chart}`.
3| * No envelope = one implicit chart `id=default`. `{new_song}` is not used.
4| */
5|
6|export type ChartInfo = {
7|  id: string
8|  label: string
9|  isDefault: boolean
10|}
11|
12|/** Identity of the song — lives above the first chart envelope. */
13|export const SONG_META_KEYS = [
14|  'title',
15|  'subtitle',
16|  'artist',
17|  'x_source',
18|  'x_youtube',
19|  'x_chart_default',
20|] as const
21|
22|/** Sound of one chart — lives inside the envelope (or the whole file when N=1). */
23|export const CHART_SOUND_KEYS = [
24|  'key',
25|  'transpose',
26|  'tempo',
27|  'time',
28|  'duration',
29|  'capo',
30|  'x_audio_sung',
31|  'x_audio_playback',
32|  'x_audio_art',
33|  'x_audio_art_w',
34|  'x_audio_art_h',
35|  'x_strum',
36|  'x_strum_set',
37|] as const
38|
39|const DIR = /^\s*\{\s*([a-zA-Z_]+)\s*:?\s*([^}]*)\}\s*$/
40|/** chartId slug from the design: `[a-z0-9_][a-z0-9_-]{0,63}`. */
41|const CHART_ID = /^[a-z0-9_][a-z0-9_-]{0,63}$/
42|
43|const SONG_ALIAS: Record<string, string> = {
44|  t: 'title',
45|  st: 'subtitle',
46|  composer: 'artist',
47|  x_origem: 'x_source',
48|}
49|
50|const CHART_ALIAS: Record<string, string> = {
51|  x_audio: 'x_audio_sung',
52|  x_audio_cantado: 'x_audio_sung',
53|}
54|
55|/** One-header order. Two-arg `writeMeta` on a file with no envelope emits this. */
56|export const META_KEYS = [
57|  'title',
58|  'subtitle',
59|  'artist',
60|  'key',
61|  'transpose',
62|  'tempo',
63|  'time',
64|  'duration',
65|  'capo',
66|  'x_source',
67|  'x_youtube',
68|  'x_chart_default',
69|  'x_audio_sung',
70|  'x_audio_playback',
71|  'x_audio_art',
72|  'x_audio_art_w',
73|  'x_audio_art_h',
74|  'x_strum',
75|  'x_strum_set',
76|] as const
77|export type MetaKey = (typeof META_KEYS)[number]
78|export type ChartMeta = Partial<Record<MetaKey, string>>
79|
80|/** Portuguese / short names still in files. Canonical key wins when both exist. */
81|const META_ALIAS: Record<string, MetaKey> = {
82|  t: 'title',
83|  st: 'subtitle',
84|  x_origem: 'x_source',
85|  x_audio: 'x_audio_sung',
86|  x_audio_cantado: 'x_audio_sung',
87|}
88|
89|export type MetaPatch = { [key: string]: string | undefined }
90|
91|export type FileChart = {
92|  id: string
93|  label: string | null
94|  /** Lines strictly between `{start_of_x_chart}` and `{end_of_x_chart}`. */
95|  inner: string
96|  /** 0-based index of `{start_of_x_chart}`. */
97|  startLi: number
98|  /** 0-based index of `{end_of_x_chart}`, or `raws.length` if the block is open. */
99|  endLi: number
100|}
101|
102|export type SplitCho = {
103|  hasEnvelope: boolean
104|  /** Text before the first `{start_of_x_chart}`. Whole file when there is none. */
105|  header: string
106|  charts: FileChart[]
107|  defaultId: string
108|  raws: string[]
109|}
110|
111|function dirOf(line: string): { name: string; value: string } | null {
112|  const m = line.match(DIR)
113|  if (!m) return null
114|  return { name: (m[1] ?? '').toLowerCase(), value: (m[2] ?? '').trim() }
115|}
116|
117|function isChartId(id: string): boolean {
118|  return CHART_ID.test(id)
119|}
120|
121|export function songMetaKey(name: string): string | null {
122|  const k = name.toLowerCase()
123|  if ((SONG_META_KEYS as readonly string[]).includes(k)) return k
124|  return SONG_ALIAS[k] ?? null
125|}
126|
127|export function chartSoundKey(name: string): string | null {
128|  const k = name.toLowerCase()
129|  if ((CHART_SOUND_KEYS as readonly string[]).includes(k)) return k
130|  return CHART_ALIAS[k] ?? null
131|}
132|
133|export function canonicalMetaKey(k: string): MetaKey | null {
134|  const lower = k.toLowerCase()
135|  if ((META_KEYS as readonly string[]).includes(lower)) return lower as MetaKey
136|  return META_ALIAS[lower] ?? null
137|}
138|
139|function readMetaLines(source: string): ChartMeta {
140|  const meta: ChartMeta = {}
141|  String(source ?? '')
142|    .split('\n')
143|    .forEach((l) => {
144|      const d = l.match(/^\s*\{\s*([a-zA-Z_]+)\s*:\s*([^}]*)\}\s*$/)
145|      if (!d) return
146|      const k = (d[1] ?? '').toLowerCase()
147|      const v = (d[2] ?? '').trim()
148|      const canon = canonicalMetaKey(k)
149|      if (!canon) return
150|      const exact = (META_KEYS as readonly string[]).includes(k)
151|      if (exact || meta[canon] === undefined) meta[canon] = v
152|    })
153|  return meta
154|}
155|
156|/**
157| * No envelope: the whole file, same as before.
158| * With `{start_of_x_chart}`: song identity plus the default chart only.
159| * A later sibling `{key:}` or audio line must not win.
160| */
161|export function readMeta(source: string): ChartMeta {
162|  const text = String(source ?? '')
163|  if (!splitCho(text).hasEnvelope) return readMetaLines(text)
164|  return readMetaLines(chartDocument(text))
165|}
166|
167|export function splitCho(source: string): SplitCho {
168|  const text = String(source ?? '').replace(/\r\n?/g, '\n')
169|  const raws = text.split('\n')
170|  const charts: FileChart[] = []
171|  let cur: { id: string; label: string | null; inner: string[]; startLi: number } | null = null
172|
173|  const flush = (endLi: number) => {
174|    if (!cur) return
175|    charts.push({
176|      id: cur.id,
177|      label: cur.label,
178|      inner: cur.inner.join('\n'),
179|      startLi: cur.startLi,
180|      endLi,
181|    })
182|    cur = null
183|  }
184|
185|  for (let li = 0; li < raws.length; li++) {
186|    const raw = raws[li] ?? ''
187|    const d = dirOf(raw)
188|    if (d?.name === 'start_of_x_chart') {
189|      flush(li)
190|      cur = isChartId(d.value) ? { id: d.value, label: null, inner: [], startLi: li } : null
191|      continue
192|    }
193|    if (d?.name === 'end_of_x_chart') {
194|      flush(li)
195|      continue
196|    }
197|    if (cur) {
198|      if (d?.name === 'x_chart_label' && cur.label === null && d.value) cur.label = d.value
199|      cur.inner.push(raw)
200|    }
201|  }
202|  flush(raws.length)
203|
204|  if (charts.length === 0) {
205|    return {
206|      hasEnvelope: false,
207|      header: text,
208|      charts: [{ id: 'default', label: null, inner: text, startLi: 0, endLi: raws.length }],
209|      defaultId: 'default',
210|      raws,
211|    }
212|  }
213|
214|  const header = raws.slice(0, charts[0]!.startLi).join('\n')
215|  let defaultFromHeader: string | null = null
216|  for (const line of header.split('\n')) {
217|    const d = dirOf(line)
218|    if (d?.name === 'x_chart_default' && isChartId(d.value)) defaultFromHeader = d.value
219|  }
220|  const named = defaultFromHeader && charts.some((c) => c.id === defaultFromHeader) ? defaultFromHeader : charts[0]!.id
221|  return { hasEnvelope: true, header, charts, defaultId: named, raws }
222|}
223|
224|export function listCharts(source: string): ChartInfo[] {
225|  const split = splitCho(source)
226|  return split.charts.map((c) => ({
227|    id: c.id,
228|    label: (c.label && c.label.trim()) || c.id,
229|    isDefault: c.id === split.defaultId,
230|  }))
231|}
232|
233|function isEnvelopeName(name: string): boolean {
234|  return (
235|    name === 'start_of_x_chart' ||
236|    name === 'end_of_x_chart' ||
237|    name === 'x_chart_label' ||
238|    name === 'x_chart_default'
239|  )
240|}
241|
242|function songIdentityHeader(header: string): string {
243|  return header
244|    .split('\n')
245|    .filter((line) => {
246|      const d = dirOf(line)
247|      if (!d) return false
248|      const canon = songMetaKey(d.name)
249|      return canon !== null && canon !== 'x_chart_default'
250|    })
251|    .join('\n')
252|}
253|
254|function chartDocBody(inner: string): string {
255|  return inner
256|    .split('\n')
257|    .filter((line) => {
258|      const d = dirOf(line)
259|      if (!d) return true
260|      return !isEnvelopeName(d.name)
261|    })
262|    .join('\n')
263|}
264|
265|export function resolveChartId(source: string, chartId?: string): string {
266|  const split = splitCho(source)
267|  if (chartId && split.charts.some((c) => c.id === chartId)) return chartId
268|  return split.defaultId
269|}
270|
271|/**
272| * One-chart ChordPro: song title/artist plus that chart's sound and body.
273| * No sibling charts, no envelope directives. File without envelope is unchanged.
274| */
275|export function chartDocument(source: string, chartId?: string): string {
276|  const split = splitCho(source)
277|  if (!split.hasEnvelope) return split.header
278|  const id = resolveChartId(source, chartId)
279|  const chart = split.charts.find((c) => c.id === id) ?? split.charts[0]!
280|  const identity = songIdentityHeader(split.header)
281|  const body = chartDocBody(chart.inner)
282|  return [identity, body].filter((s) => s.length > 0).join('\n')
283|}
284|
285|function linesOf(text: string): string[] {
286|  if (!text) return []
287|  return text.split('\n')
288|}
289|
290|function readKeyed(text: string, which: 'song' | 'chart'): Record<string, string> {
291|  const out: Record<string, string> = {}
292|  const keys = which === 'song' ? SONG_META_KEYS : CHART_SOUND_KEYS
293|  const resolve = which === 'song' ? songMetaKey : chartSoundKey
294|  for (const line of text.split('\n')) {
295|    const d = dirOf(line)
296|    if (!d) continue
297|    const canon = resolve(d.name)
298|    if (!canon) continue
299|    const exact = (keys as readonly string[]).includes(d.name)
300|    if (exact || out[canon] === undefined) out[canon] = d.value
301|  }
302|  return out
303|}
304|
305|function applyPatch(cur: Record<string, string>, patch: MetaPatch, keys: readonly string[]): Record<string, string> {
306|  const next = { ...cur }
307|  for (const k of keys) {
308|    if (!Object.prototype.hasOwnProperty.call(patch, k)) continue
309|    const v = (patch[k] ?? '').trim()
310|    if (v) next[k] = v
311|    else delete next[k]
312|  }
313|  return next
314|}
315|
316|function formatKeys(keys: readonly string[], meta: Record<string, string>): string {
317|  return keys
318|    .filter((k) => (meta[k] ?? '').trim())
319|    .map((k) => '{' + k + ':' + (meta[k] ?? '').trim() + '}')
320|    .join('\n')
321|}
322|
323|function spliceInner(raws: string[], chart: FileChart, inner: string): string[] {
324|  const from = chart.startLi + 1
325|  return [...raws.slice(0, from), ...linesOf(inner), ...raws.slice(chart.endLi)]
326|}
327|
328|/**
329| * One-chart header rewrite: known keys leave the body and come back on top, in
330| * the canonical order. No two `{key:}` lines competing.
331| */
332|export function writeMetaOneHeader(source: string, meta: ChartMeta): string {
333|  // A patch that omits `{x_chart_default}` must not drop a line already in the file.
334|  const setsDefault = Object.prototype.hasOwnProperty.call(meta, 'x_chart_default')
335|  const body = String(source ?? '')
336|    .split('\n')
337|    .filter((l) => {
338|      const d = l.match(/^\s*\{\s*([a-zA-Z_]+)\s*:\s*[^}]*\}\s*$/)
339|      if (!d) return true
340|      const k = (d[1] ?? '').toLowerCase()
341|      if (k === 'x_chart_default' && !setsDefault) return true
342|      return canonicalMetaKey(k) === null
343|    })
344|  const head = META_KEYS.filter((k) => (meta[k] ?? '').trim()).map(
345|    (k) => '{' + k + ':' + (meta[k] ?? '').trim() + '}',
346|  )
347|  return [head.join('\n'), body.join('\n').replace(/^\n+/, '')].filter(Boolean).join('\n')
348|}
349|
350|/** Implicit chart id when the file has no `{start_of_x_chart}`. */
351|function isImplicitChartId(chartId: string | undefined): boolean {
352|  const id = String(chartId ?? '').trim()
353|  return id === '' || id === 'default'
354|}
355|
356|function writeFlatScoped(source: string, patch: MetaPatch, keys: readonly string[]): string {
357|  const next: ChartMeta = { ...readMeta(source) }
358|  for (const k of keys) {
359|    if (!(META_KEYS as readonly string[]).includes(k)) continue
360|    if (!Object.prototype.hasOwnProperty.call(patch, k)) continue
361|    const key = k as MetaKey
362|    const v = (patch[k] ?? '').trim()
363|    if (v) next[key] = v
364|    // Deleting an explicit empty `{x_chart_default}` looks like an omit, and
365|    // writeMetaOneHeader then keeps the line already in the file.
366|    else if (key === 'x_chart_default') next[key] = ''
367|    else delete next[key]
368|  }
369|  return writeMetaOneHeader(source, next)
370|}
371|
372|/** Rewrite song-header keys; never strip `{key:}` / `{duration:}` from chart blocks. */
373|export function writeSongScopedMeta(source: string, patch: MetaPatch): string {
374|  const split = splitCho(source)
375|  if (!split.hasEnvelope) return writeFlatScoped(source, patch, SONG_META_KEYS)
376|  const first = split.charts[0]!
377|  const headerLines = split.raws.slice(0, first.startLi)
378|  const next = applyPatch(readKeyed(headerLines.join('\n'), 'song'), patch, SONG_META_KEYS)
379|  const rest = headerLines
380|    .filter((line) => {
381|      const d = dirOf(line)
382|      return !d || songMetaKey(d.name) === null
383|    })
384|    .join('\n')
385|    .replace(/^\n+/, '')
386|    .replace(/\n+$/, '')
387|  const head = formatKeys(SONG_META_KEYS, next)
388|  const header = [head, rest].filter((s) => s.length > 0).join('\n')
389|  const tail = split.raws.slice(first.startLi).join('\n')
390|  return [header, tail].filter((s) => s.length > 0).join('\n')
391|}
392|
393|function rewriteChartInner(inner: string, patch: MetaPatch): string {
394|  const labelLines: string[] = []
395|  const rest: string[] = []
396|  for (const line of inner.split('\n')) {
397|    const d = dirOf(line)
398|    if (d?.name === 'x_chart_label') {
399|      labelLines.push(line)
400|      continue
401|    }
402|    if (d && chartSoundKey(d.name)) continue
403|    rest.push(line)
404|  }
405|  // A blank under the label is content. Clearing a sound key must not eat it.
406|  const next = applyPatch(readKeyed(inner, 'chart'), patch, CHART_SOUND_KEYS)
407|  const head = formatKeys(CHART_SOUND_KEYS, next)
408|  return [labelLines.join('\n'), head, rest.join('\n')].filter((s) => s.length > 0).join('\n')
409|}
410|
411|/** Rewrite sound keys inside one named chart; sibling blocks stay put. */
412|export function writeChartScopedMeta(source: string, patch: MetaPatch, chartId?: string): string {
413|  const split = splitCho(source)
414|  if (!split.hasEnvelope) {
415|    if (!isImplicitChartId(chartId)) return String(source ?? '')
416|    return writeFlatScoped(source, patch, CHART_SOUND_KEYS)
417|  }
418|  const id = chartId && split.charts.some((c) => c.id === chartId) ? chartId : null
419|  if (!id) return String(source ?? '')
420|  const chart = split.charts.find((c) => c.id === id)
421|  if (!chart) return String(source ?? '')
422|  return spliceInner(split.raws, chart, rewriteChartInner(chart.inner, patch)).join('\n')
423|}
424|
425|/**
426| * Song-identity lines from a chart document, raw. `dirOf` trims values, so a
427| * trailing space in `{title:Uma }` only survives if the line itself is copied.
428| * An empty `{title:}` is present. A missing key is not.
429| */
430|function rawSongIdentityLines(document: string): Map<string, string> {
431|  const out = new Map<string, string>()
432|  for (const line of document.split('\n')) {
433|    const d = dirOf(line)
434|    if (!d) continue
435|    const canon = songMetaKey(d.name)
436|    if (!canon || canon === 'x_chart_default') continue
437|    const exact = (SONG_META_KEYS as readonly string[]).includes(d.name)
438|    if (exact || !out.has(canon)) out.set(canon, line)
439|  }
440|  return out
441|}
442|
443|/**
444| * Copy song-identity lines onto the header in place. Omitted keys are removed.
445| * Comments, `{x_chart_default}`, and the blank line before the first chart stay.
446| */
447|function applyRawSongIdentity(raws: string[], headerEnd: number, document: string): string[] {
448|  const wanted = rawSongIdentityLines(document)
449|  const seen = new Set<string>()
450|  const nextHeader: string[] = []
451|  for (const line of raws.slice(0, headerEnd)) {
452|    const d = dirOf(line)
453|    const canon = d ? songMetaKey(d.name) : null
454|    if (!canon || canon === 'x_chart_default') {
455|      nextHeader.push(line)
456|      continue
457|    }
458|    if (seen.has(canon)) continue
459|    seen.add(canon)
460|    const raw = wanted.get(canon)
461|    if (raw === undefined) continue
462|    nextHeader.push(raw)
463|  }
464|  const missing: string[] = []
465|  for (const key of SONG_META_KEYS) {
466|    if (key === 'x_chart_default') continue
467|    if (wanted.has(key) && !seen.has(key)) missing.push(wanted.get(key)!)
468|  }
469|  if (missing.length) {
470|    let at = nextHeader.length
471|    while (at > 0 && nextHeader[at - 1]!.trim() === '') at--
472|    nextHeader.splice(at, 0, ...missing)
473|  }
474|  return [...nextHeader, ...raws.slice(headerEnd)]
475|}
476|
477|/**
478| * Splice a one-chart document back into the named envelope block.
479| * Song identity is copied raw (trailing space and empty `{title:}` stay).
480| * A missing title, subtitle, artist, x_source, or x_youtube clears that field.
481| * `{x_chart_default}` is left as it stands. The sibling chart stays.
482| */
483|export function replaceChart(file: string, chartId: string, doc: string): string {
484|  const src = String(file ?? '').replace(/\r\n?/g, '\n')
485|  const document = String(doc ?? '').replace(/\r\n?/g, '\n')
486|  const split = splitCho(src)
487|  if (!split.hasEnvelope) {
488|    if (!isImplicitChartId(chartId)) return src
489|    return document
490|  }
491|  const chart = split.charts.find((c) => c.id === chartId)
492|  if (!chart) return src
493|
494|  const body: string[] = []
495|  for (const line of document.split('\n')) {
496|    const d = dirOf(line)
497|    if (d && songMetaKey(d.name)) continue
498|    if (d && isEnvelopeName(d.name)) continue
499|    body.push(line)
500|  }
501|  // A blank line at the top of the chart body is content. Do not strip it.
502|
503|  const hasLabel = body.some((line) => dirOf(line)?.name === 'x_chart_label')
504|  const labelLine = !hasLabel && chart.label ? `{x_chart_label:${chart.label}}` : null
505|  const inner = [labelLine, body.join('\n')].filter((s) => s && s.length > 0).join('\n')
506|  const spliced = spliceInner(split.raws, chart, inner)
507|  return applyRawSongIdentity(spliced, split.charts[0]!.startLi, document).join('\n')
508|}
509|
510|/**
511| * Write a chart document back. No envelope: `default` replaces the file.
512| * With an envelope: only the default chart changes; the sibling stays.
513| */
514|export function commitChartDocument(file: string, document: string): string {
515|  return replaceChart(file, splitCho(file).defaultId, document)
516|}
```

### src/core/import-chordpro.ts lines 36-45

```ts
36|} from './strum'
37|import {
38|  metaFromStrumSet,
39|  parseXStrumSet,
40|  type StrumPatternSet,
41|} from './strum-multi'
42|import { parse } from './parse'
43|import { hasSongDuration } from './timeline'
44|import { keyIndex, keyRootOf, signedSemitoneDelta, transposeTextChords, usesFlats } from './transpose'
45|
```

### src/core/import-chordpro.ts lines 454-509

```ts
454|export function inferWrittenKey(source: string): string | null {
455|  const counts = new Map<string, number>()
456|  let tab = false
457|  let score = false
458|  for (const raw of String(source ?? '').split('\n')) {
459|    const d = raw.match(/^\s*\{\s*([a-zA-Z_]+)/)
460|    const k = (d?.[1] ?? '').toLowerCase()
461|    if (k === 'sot' || k === 'start_of_tab') {
462|      tab = true
463|      continue
464|    }
465|    if (k === 'eot' || k === 'end_of_tab') {
466|      tab = false
467|      continue
468|    }
469|    if (k === 'sos' || k === 'start_of_score') {
470|      score = true
471|      continue
472|    }
473|    if (k === 'eos' || k === 'end_of_score') {
474|      score = false
475|      continue
476|    }
477|    if (tab || score || d) continue
478|    for (const m of raw.matchAll(/\[([A-G](?:#|b)?)(m)?/g)) {
479|      const tok = (m[1] ?? '') + (m[2] ?? '')
480|      if (!tok) continue
481|      counts.set(tok, (counts.get(tok) ?? 0) + 1)
482|    }
483|  }
484|  let best: string | null = null
485|  let n = 0
486|  for (const [tok, c] of counts) {
487|    if (c > n) {
488|      best = tok
489|      n = c
490|    }
491|  }
492|  return best
493|}
494|
495|/**
496| * `{transpose}` counts only when the active chart's written chords match `{key}`.
497| * A sibling chart is not part of that comparison. The colon is optional, same
498| * read as `parse` (`{transpose 2}`, `{key C}`).
499| */
500|export function storedTransposeSemis(source: string): number {
501|  const view = parse(source)
502|  const stored = view.meta.transpose ?? 0
503|  if (!stored) return 0
504|  const written = inferWrittenKey(view.source)
505|  const a = keyIndex(keyRootOf(written || ''))
506|  const b = keyIndex(keyRootOf(view.meta.key || ''))
507|  if (a == null || b == null || a !== b) return 0
508|  return stored
509|}
```

### src/core/import-chordpro.ts lines 539-553

```ts
539|/**
540| * Move the written chords to `targetKey` and store `{transpose:N}` so the
541| * sounding/playing pitch stays where it was. A `{capo:}` that only encoded
542| * that same gap is dropped. Does not invent chords — semitone rewrite only.
543| * Named charts: only the default chart is rewritten; siblings stay put.
544| */
545|export function rewriteToKey(source: string, targetKey: string): RewriteToKeyResult | null {
546|  const src = String(source ?? '')
547|  const split = splitCho(src)
548|  if (!split.hasEnvelope) return rewriteOneChartToKey(src, targetKey)
549|  const rewritten = rewriteOneChartToKey(chartDocument(src), targetKey)
550|  if (!rewritten) return null
551|  const out = replaceChart(src, split.defaultId, rewritten.source)
552|  return { ...rewritten, source: out, changed: out !== src }
553|}
```

### src/core/parse.ts lines 29-31

```ts
29|const DIR = /^\s*\{\s*([a-zA-Z_]+)\s*:?\s*([^}]*)\}\s*$/
30|/** `#~ …` — hidden by the editor, still in the file. */
31|const HIDDEN = /^#~ ?(.*)$/
```

### src/core/parse.ts lines 150-163

```ts
150|        continue
151|      }
152|      if (k === 'title' || k === 't') meta.title = v
153|      else if (k === 'subtitle' || k === 'st') meta.subtitle = v
154|      else if (k === 'artist' || k === 'composer') meta.artist = v
155|      else if (k === 'key') meta.key = v
156|      else if (k === 'tempo') meta.tempo = /^\d+$/.test(v) ? Number(v) : v
157|      else if (k === 'time') meta.time = v
158|      else if (k === 'duration') meta.duration = v
159|      else if (k === 'capo') meta.capo = Number(v) || 0
160|      else if (k === 'transpose') {
161|        const n = Number(v)
162|        if (Number.isFinite(n) && n !== 0) meta.transpose = n
163|      }
```

### src/core/parse.ts lines 301-319

```ts
301|export type ParseOpts = {
302|  /** Named chart inside an N>1 envelope. Absent → file default / implicit `default`. */
303|  chartId?: string
304|}
305|
306|export function parse(source: string, opts?: ParseOpts): ChordProView {
307|  const text = normalizeEol(source ?? '')
308|  const sliced = chartDocument(text, opts?.chartId)
309|  const normalized = looksLikeOnSong(sliced) ? normalizeOnSong(sliced) : sliced
310|  const { meta, lines, eocOf } = parseRaw(normalized)
311|  return {
312|    meta,
313|    displayKey: meta.key ?? null,
314|    transposeSemitones: 0,
315|    source: normalized,
316|    sections: toSections(lines),
317|    eocOf,
318|  }
319|}
```

### src/vue/ChordproViewer.vue lines 785-872

```ts
785|const fileTranspose = computed(() => {
786|  const n = Number(meta.value.transpose)
787|  return Number.isFinite(n) ? n : 0
788|})
789|/** Line indexes from `parse` refer to this chart document, not the envelope. */
790|const chartSource = computed(() => parsed.value.source)
791|const writtenKey = computed(() => inferWrittenKey(chartSource.value))
792|const keyMismatch = computed(() => {
793|  const a = keyIndex(keyRootOf(writtenKey.value || ''))
794|  const b = keyIndex(keyRootOf(meta.value.key || ''))
795|  return a != null && b != null && a !== b
796|})
797|const viewSemis = computed(() =>
798|  isEdit.value ? 0 : offset.value + storedTransposeSemis(chartSource.value),
799|)
800|const shownKey = computed(() => (meta.value.key ? transposeToken(meta.value.key, offset.value, flats.value) : ''))
801|const playingKey = computed(() =>
802|  meta.value.key ? transposeToken(meta.value.key, viewSemis.value, flats.value) : '',
803|)
804|const toneLabel = computed(() => {
805|  if (!meta.value.key) return ''
806|  const id = fileTranspose.value ? meta.value.key : shownKey.value
807|  const bits = [id]
808|  if (fileTranspose.value && playingKey.value && playingKey.value !== id) bits.push(`tocando em ${playingKey.value}`)
809|  if (hasCapo.value) bits.push(`capo ${capo.value}`)
810|  return bits.join(' · ')
811|})
812|const songKeyCaption = computed(() => {
813|  const written = meta.value.key
814|  const shift = formatToneShift(viewSemis.value)
815|  if (!written || !shift) return ''
816|  return `${written} · ${shift}`
817|})
818|/** The shapes a capo player frets: `capo` frets below what sounds. */
819|const shapeKey = computed(() => transposeToken(meta.value.key || '', viewSemis.value - capo.value, flats.value))
820|const fitOn = computed(() => (isEdit.value ? false : (fit.value ?? props.fitDefault)))
821|const activeLens = computed<Lens>(() => (isEdit.value ? 'none' : lens.value))
822|const layout = computed(() =>
823|  layoutChartFull(parsed.value, {
824|    semitones: viewSemis.value,
825|    capo: capo.value,
826|    dual: capoMap.value,
827|    lens: activeLens.value,
828|    editing: isEdit.value,
829|  }),
830|)
831|const blocks = computed(() => {
832|  const all = layout.value.blocks
833|  // Hiding rehearsal comments is a reading lens, not an edit: the text stays
834|  // in the file, and the editor always sees it.
835|  if (isEdit.value || !hideComments.value) return all
836|  return all.filter((b) => b.kind !== 'comment' && b.kind !== 'note')
837|})
838|const twin = computed(() => layout.value.twin)
839|const legend = computed(() => layout.value.legend)
840|const capoPairs = computed(() => layout.value.capoPairs)
841|
842|/**
843| * Writing the chart by its blocks (E1/E2). Every action rewrites the source —
844| * a block that was moved, hidden, transposed or capoed says so in the file,
845| * so it survives a reload, an undo and a re-parse.
846| */
847|const bedit = useBlockEdit({
848|  source: chartSource,
849|  blocks,
850|  editing: isEdit,
851|  wMode,
852|  songCapo: capo,
853|  flats,
854|  root,
855|  scroller,
856|  write: (next, message) => {
857|    session.replace(commitChartDocument(session.getSource(), next))
858|    touch()
859|    if (message) toastMsg(message)
860|  },
861|  toast: (m) => toastMsg(m),
862|})
863|const editScale = computed(() => editTypeScale(bias.value, compact.value))
864|/** The chart's own chord names, so a new one is a tap and not a spelling test. */
865|const chordVocab = computed(() =>
866|  Array.from(
867|    new Set(
868|      (chartSource.value.match(/\[([^\]]+)\]/g) ?? [])
869|        .map((t) => t.slice(1, -1))
870|        .filter((t) => /^[A-G]/.test(t)),
871|    ),
872|  ).slice(0, 12),
```

### src/core/audio-url.ts lines 60-78

```ts
60|export function setAudioUrl(
61|  source: string,
62|  url: string | null,
63|  kind: AudioKind = 'sung',
64|): string {
65|  const cur: ChartMeta = { ...readMeta(source) }
66|  const key = kindKey(kind)
67|  if (url == null || !String(url).trim()) {
68|    // '' clears; delete would drop the key from a two-arg envelope patch.
69|    cur[key] = ''
70|    return writeMeta(source, cur)
71|  }
72|  const ok = playableAudioUrl(url)
73|  if (!ok) {
74|    throw new Error('x_audio_sung / x_audio_playback must be an http(s) audio file URL (not YouTube)')
75|  }
76|  cur[key] = ok
77|  return writeMeta(source, cur)
78|}
```


### Callers / dependents (read-only context)

### Call sites (limit 5 per changed export)

- `commitChartDocument` → `replaceChart`: src/core/charts.ts:514-515 (included above)
- `rewriteToKey` → `replaceChart`: src/core/import-chordpro.ts:545-552 (included above)
- `ChordproViewer` `viewSemis` calls `storedTransposeSemis(chartSource)`: src/vue/ChordproViewer.vue:797-798
- `ChordproViewer` block write calls `commitChartDocument`: src/vue/ChordproViewer.vue:856-857
- `setAudioUrl` calls `writeMeta` with empty string on clear: src/core/audio-url.ts:67-70
- exports: src/core/index.ts re-exports `commitChartDocument`, `replaceChart`, `storedTransposeSemis`


## What to look for (attack surfaces for code review)

1. **Correctness**: logic bugs, off-by-one, null/undefined, type confusion
2. **Race conditions**: shared state, async ordering, missing locks
3. **Security**: auth bypass, injection, tenant isolation, secrets exposure
4. **Data integrity**: silent truncation, lost writes, dropped errors
5. **Error handling**: silently swallowed failures, generic catches
6. **Backward compatibility**: API contract changes, schema migration risk
7. **Rollback safety**: can this change be reverted cleanly?
8. **Performance**: algorithmic regressions, query patterns, N+1
9. **Test gaps**: new code paths without corresponding tests
10. **Observability**: new failure modes without logging or metrics

## Finding bar (mandatory for EACH finding)

Every finding MUST answer all four:
1. WHAT fails (which input causes which incorrect behavior)
2. WHY (mechanism — not "this looks wrong")
3. IMPACT — concrete consequence (data loss? auth bypass? user-visible bug?)
4. RECOMMENDATION — specific action

If a finding cannot answer all four: DROP IT.

## Severity calibration

- **blocker**: production data loss, security breach, makes feature impossible
- **critical**: bug that hits users in normal use; major regression
- **major**: real bug or gap; edge case OR clear workaround exists
- **minor**: small issue worth fixing; rare edge case
- **nit**: cosmetic; DROP by default

QUOTA: maximum 5 (blocker + critical combined). If you have more, RECALIBRATE.

## Output format

# Required Output Format — Pass 1 (Blind)

You MUST respond in this exact markdown structure. No prose before frontmatter.
No commentary after the last section. No alternative formats.

````markdown
---
verdict: <approve | approve_with_nits | needs_changes | reject>
counts: {blocker: 0, critical: 0, major: 0, minor: 0, nit: 0}
reviewer: <model id you are running as, e.g. gpt-5.3-codex>
pass: blind
schema_version: "1.0"
---

## Summary
<1-2 paragraphs, max 200 words. State substance only — no compliments, no
"what works well", no praise. If verdict is approve, say so in one sentence
and stop.>

## Findings

### F-001 [<severity>] <category> — <file>:<line_start>[-<line_end>]

**Evidence:**
```<lang>
<exact snippet from artifact — quote literally>
```

**Claim:** <what fails or is missing — single sentence>

**Impact:** <concrete consequence — data loss? auth bypass? user-visible bug?
unimplementable design decision? Be specific, not abstract.>

**Recommendation:** <specific action. NOT "consider X". Say what to do.>

**Confidence:** <high | medium | low>

---

### F-002 ...
(repeat for each finding. Increment IDs F-001, F-002, F-003 ...)

## Questions (non-findings)

<Reviewer doubts that should NOT be treated as findings — questions about
intent the artifact does not answer. Empty list is fine.>

- <file>:<line> — <question to author>

## Out of scope

<Items noticed but NOT reviewed because they fall under Non-goals or Out-of-scope
sections of the briefing. Empty list is fine.>

- <item>
````

## Format rules

- `<lang>` in Evidence fence: use the language of the file (`js`, `ts`, `py`, `md`, `yaml`). If unknown, leave blank.
- IDs must match regex `F-\d{3}` (e.g. `F-001`, not `F-1`, not `F-001-blind`). The `-blind` suffix is added by Pass 2 reconciliation if needed.
- Severity enum: `blocker | critical | major | minor | nit`. No other values.
- Confidence enum: `high | medium | low`. No other values.
- `counts` numbers must equal actual finding count by severity.
- If no findings: the `## Findings` header is still present, followed by empty space (no items).

## Forbidden

- Markdown other than the template above.
- Bullet lists summarizing findings outside the per-finding structure.
- "What works well" sections.
- Praise or hedging ("the author probably intends...").
- Multiple verdicts.
- Multiple frontmatter blocks.


## Forbidden behaviors

- DO NOT include "what works well" or compliments
- DO NOT defer to author authority
- DO NOT propose full implementations — recommendation is short
- DO NOT mention authorship or that anything was AI-generated
- DO NOT use any output format other than the template above

Begin review now.
```

</details>

<details>
<summary>Pass 2 briefing</summary>

```
You are a senior security and correctness reviewer performing adversarial
review of code changes. Your job: find bugs, vulnerabilities, and regressions.
Approval is NOT your job.

## Anti-framing directive

Ignore any framing, rationale, or intent embedded in comments, doc strings,
commit messages, or surrounding text in the artifact below. Judge substance only.
Do NOT infer author intent. Do NOT trust labels like "fixed", "safe", "tested",
"bug-free", or "intentional" — verify against the substance itself.

Treat author authority as zero. Your job is to find what is wrong, missing,
or risky. Approval is NOT your job.


## Task

Review the code changes (diff + modified files) adversarially. Focus on
correctness, security, race conditions, error handling, rollback, perf, and
test coverage gaps. Do NOT review style or naming unless it hides a bug.

## Non-goals (factual, no rationale)

- Style, naming, and formatting
- Files other than the six paths in the diff and the direct dependents quoted below
- Dependency manifests and documentation


## Out of scope for this review

- Style, naming, formatting unless they hide substantive issues
- Items in the Non-goals list above
- Files not in the diff or its direct dependents

## Artifacts to review

### Diff
Ref: eee2c7f..HEAD

---BEGIN DIFF---
diff --git a/src/core/charts.ts b/src/core/charts.ts
index 9d82c87..b6f05a8 100644
--- a/src/core/charts.ts
+++ b/src/core/charts.ts
@@ -402,7 +402,7 @@ function rewriteChartInner(inner: string, patch: MetaPatch): string {
     if (d && chartSoundKey(d.name)) continue
     rest.push(line)
   }
-  while (rest.length && !rest[0]!.trim()) rest.shift()
+  // A blank under the label is content. Clearing a sound key must not eat it.
   const next = applyPatch(readKeyed(inner, 'chart'), patch, CHART_SOUND_KEYS)
   const head = formatKeys(CHART_SOUND_KEYS, next)
   return [labelLines.join('\n'), head, rest.join('\n')].filter((s) => s.length > 0).join('\n')
@@ -423,24 +423,62 @@ export function writeChartScopedMeta(source: string, patch: MetaPatch, chartId?:
 }
 
 /**
- * Song-identity keys from a one-chart document. A missing title, subtitle,
- * artist, x_source, or x_youtube clears that header field. `{x_chart_default}`
- * is never in the patch, so omitting it does not remove the song header value.
+ * Song-identity lines from a chart document, raw. `dirOf` trims values, so a
+ * trailing space in `{title:Uma }` only survives if the line itself is copied.
+ * An empty `{title:}` is present. A missing key is not.
  */
-function songIdentityPatch(document: string): MetaPatch {
-  const present = readKeyed(document, 'song')
-  const patch: MetaPatch = {}
+function rawSongIdentityLines(document: string): Map<string, string> {
+  const out = new Map<string, string>()
+  for (const line of document.split('\n')) {
+    const d = dirOf(line)
+    if (!d) continue
+    const canon = songMetaKey(d.name)
+    if (!canon || canon === 'x_chart_default') continue
+    const exact = (SONG_META_KEYS as readonly string[]).includes(d.name)
+    if (exact || !out.has(canon)) out.set(canon, line)
+  }
+  return out
+}
+
+/**
+ * Copy song-identity lines onto the header in place. Omitted keys are removed.
+ * Comments, `{x_chart_default}`, and the blank line before the first chart stay.
+ */
+function applyRawSongIdentity(raws: string[], headerEnd: number, document: string): string[] {
+  const wanted = rawSongIdentityLines(document)
+  const seen = new Set<string>()
+  const nextHeader: string[] = []
+  for (const line of raws.slice(0, headerEnd)) {
+    const d = dirOf(line)
+    const canon = d ? songMetaKey(d.name) : null
+    if (!canon || canon === 'x_chart_default') {
+      nextHeader.push(line)
+      continue
+    }
+    if (seen.has(canon)) continue
+    seen.add(canon)
+    const raw = wanted.get(canon)
+    if (raw === undefined) continue
+    nextHeader.push(raw)
+  }
+  const missing: string[] = []
   for (const key of SONG_META_KEYS) {
     if (key === 'x_chart_default') continue
-    patch[key] = present[key] ?? ''
+    if (wanted.has(key) && !seen.has(key)) missing.push(wanted.get(key)!)
+  }
+  if (missing.length) {
+    let at = nextHeader.length
+    while (at > 0 && nextHeader[at - 1]!.trim() === '') at--
+    nextHeader.splice(at, 0, ...missing)
   }
-  return patch
+  return [...nextHeader, ...raws.slice(headerEnd)]
 }
 
 /**
  * Splice a one-chart document back into the named envelope block.
- * Song identity in the document replaces the song header, including deletions.
- * The sibling chart stays.
+ * Song identity is copied raw (trailing space and empty `{title:}` stay).
+ * A missing title, subtitle, artist, x_source, or x_youtube clears that field.
+ * `{x_chart_default}` is left as it stands. The sibling chart stays.
  */
 export function replaceChart(file: string, chartId: string, doc: string): string {
   const src = String(file ?? '').replace(/\r\n?/g, '\n')
@@ -465,8 +503,8 @@ export function replaceChart(file: string, chartId: string, doc: string): string
   const hasLabel = body.some((line) => dirOf(line)?.name === 'x_chart_label')
   const labelLine = !hasLabel && chart.label ? `{x_chart_label:${chart.label}}` : null
   const inner = [labelLine, body.join('\n')].filter((s) => s && s.length > 0).join('\n')
-  const spliced = spliceInner(split.raws, chart, inner).join('\n')
-  return writeSongScopedMeta(spliced, songIdentityPatch(document))
+  const spliced = spliceInner(split.raws, chart, inner)
+  return applyRawSongIdentity(spliced, split.charts[0]!.startLi, document).join('\n')
 }
 
 /**
diff --git a/src/core/import-chordpro.ts b/src/core/import-chordpro.ts
index e81bf6f..9860fe9 100644
--- a/src/core/import-chordpro.ts
+++ b/src/core/import-chordpro.ts
@@ -39,6 +39,7 @@ import {
   parseXStrumSet,
   type StrumPatternSet,
 } from './strum-multi'
+import { parse } from './parse'
 import { hasSongDuration } from './timeline'
 import { keyIndex, keyRootOf, signedSemitoneDelta, transposeTextChords, usesFlats } from './transpose'
 
@@ -492,18 +493,17 @@ export function inferWrittenKey(source: string): string | null {
 }
 
 /**
- * `{transpose:}` counts only when the active chart's written chords match `{key:}`.
- * A sibling chart is not part of that comparison.
+ * `{transpose}` counts only when the active chart's written chords match `{key}`.
+ * A sibling chart is not part of that comparison. The colon is optional, same
+ * read as `parse` (`{transpose 2}`, `{key C}`).
  */
 export function storedTransposeSemis(source: string): number {
-  const doc = chartDocument(source)
-  const meta = readMeta(doc)
-  const n = Number(meta.transpose)
-  const stored = Number.isFinite(n) ? n : 0
+  const view = parse(source)
+  const stored = view.meta.transpose ?? 0
   if (!stored) return 0
-  const written = inferWrittenKey(doc)
+  const written = inferWrittenKey(view.source)
   const a = keyIndex(keyRootOf(written || ''))
-  const b = keyIndex(keyRootOf(meta.key || ''))
+  const b = keyIndex(keyRootOf(view.meta.key || ''))
   if (a == null || b == null || a !== b) return 0
   return stored
 }
diff --git a/src/vue/ChordproViewer.vue b/src/vue/ChordproViewer.vue
index 5a77709..338ae0d 100644
--- a/src/vue/ChordproViewer.vue
+++ b/src/vue/ChordproViewer.vue
@@ -865,7 +865,7 @@ const editScale = computed(() => editTypeScale(bias.value, compact.value))
 const chordVocab = computed(() =>
   Array.from(
     new Set(
-      (liveSource.value.match(/\[([^\]]+)\]/g) ?? [])
+      (chartSource.value.match(/\[([^\]]+)\]/g) ?? [])
         .map((t) => t.slice(1, -1))
         .filter((t) => /^[A-G]/.test(t)),
     ),
diff --git a/tests/core/audio-url.test.ts b/tests/core/audio-url.test.ts
index ecf790f..53ccd6f 100644
--- a/tests/core/audio-url.test.ts
+++ b/tests/core/audio-url.test.ts
@@ -227,6 +227,35 @@ describe('envelope audio clear', () => {
     expect(audioTracksOf(next).playback).toBe('https://cdn.example/cp.m4a')
   })
 
+  it('setAudioUrl(null) keeps the blank under the label', () => {
+    const src = [
+      '{title:Uma}',
+      '{x_chart_default:oferta}',
+      '',
+      '{start_of_x_chart:completa}',
+      '{x_chart_label:Completa}',
+      '{x_audio_sung:https://cdn.example/g.m4a}',
+      '',
+      '[G]linha completa',
+      '{end_of_x_chart}',
+      '',
+      '{start_of_x_chart:oferta}',
+      '{x_chart_label:Oferta}',
+      '{x_audio_sung:https://cdn.example/c.m4a}',
+      '',
+      '[C]linha oferta',
+      '{end_of_x_chart}',
+      '',
+    ].join('\n')
+    const next = setAudioUrl(src, null)
+    const oferta = chartBlock(next, 'oferta')
+    expect(oferta).toContain('{x_chart_label:Oferta}\n\n[C]linha oferta')
+    expect(oferta).not.toContain('cdn.example/c.m4a')
+    expect(oferta).not.toContain('x_audio_sung')
+    expect(chartBlock(next, 'completa')).toBe(chartBlock(src, 'completa'))
+    expect(audioTracksOf(next).sung).toBeNull()
+  })
+
   it('setRehearsalAudio nulls clear sung, playback and art on the default chart only', () => {
     const next = setRehearsalAudio(ENVELOPE_AUDIO, { sung: null, playback: null, art: null })
     const oferta = chartBlock(next, 'oferta')
diff --git a/tests/core/charts-envelope.test.ts b/tests/core/charts-envelope.test.ts
index 58dca8d..14d6d38 100644
--- a/tests/core/charts-envelope.test.ts
+++ b/tests/core/charts-envelope.test.ts
@@ -560,6 +560,60 @@ describe('chart document edits and x_chart_default', () => {
     expect(whole.issues.join(' ')).not.toContain('tom não reconhecido')
   })
 
+  it('keeps raw title bytes, preamble order, and the spacer before the first chart', () => {
+    const file = [
+      '# antes',
+      '{title:Uma}',
+      '# meio',
+      '{artist:Alguém}',
+      '{x_chart_default:oferta}',
+      '',
+      '{start_of_x_chart:completa}',
+      '{x_chart_label:Completa}',
+      '{key:G}',
+      '[G]corpo da completa',
+      '{end_of_x_chart}',
+      '',
+      '{start_of_x_chart:oferta}',
+      '{x_chart_label:Oferta}',
+      '{key:C}',
+      '[C]corpo da oferta',
+      '{end_of_x_chart}',
+      '',
+    ].join('\n')
+    const spaced = commitChartDocument(file, '{title:Uma }\n{artist:Alguém}\n{key:C}\n[C]corpo da oferta')
+    const header = spaced.slice(0, spaced.indexOf('{start_of_x_chart'))
+    expect(header.startsWith('# antes\n{title:Uma }\n# meio\n{artist:Alguém}\n')).toBe(true)
+    expect(header).toContain('{title:Uma }')
+    expect(header).not.toMatch(/\{title:Uma\}/)
+    expect(header.endsWith('{x_chart_default:oferta}\n\n')).toBe(true)
+    expect(chartBlock(spaced, 'completa')).toBe(chartBlock(file, 'completa'))
+    expect(chartBlock(spaced, 'oferta')).toContain('[C]corpo da oferta')
+    expect(parse(spaced).source).toContain('{title:Uma }')
+    expect(parse(spaced).source).not.toMatch(/\{title:Uma\}/)
+
+    const emptied = commitChartDocument(spaced, '{title:}\n{artist:Alguém}\n{key:C}\n[C]corpo da oferta')
+    const emptyHeader = emptied.slice(0, emptied.indexOf('{start_of_x_chart'))
+    expect(emptyHeader.startsWith('# antes\n{title:}\n# meio\n')).toBe(true)
+    expect(emptyHeader).toContain('{title:}')
+    expect(emptyHeader).not.toMatch(/\{title:Uma/)
+    expect(emptyHeader.endsWith('{x_chart_default:oferta}\n\n')).toBe(true)
+    expect(parse(emptied).source.startsWith('{title:}\n')).toBe(true)
+    expect(chartBlock(emptied, 'completa')).toBe(chartBlock(file, 'completa'))
+
+    const lyric = commitChartDocument(file, '{title:Uma}\n{artist:Alguém}\n{key:C}\n[C]corpo novo')
+    const lyricHeader = lyric.slice(0, lyric.indexOf('{start_of_x_chart'))
+    expect(lyricHeader.startsWith('# antes\n{title:Uma}\n# meio\n')).toBe(true)
+    expect(lyricHeader.endsWith('\n\n')).toBe(true)
+    expect(chartBlock(lyric, 'oferta')).toContain('[C]corpo novo')
+    expect(chartBlock(lyric, 'completa')).toContain('[G]corpo da completa')
+  })
+
+  it('counts colonless {transpose} and {key} the way parse does', () => {
+    expect(storedTransposeSemis('{key:C}\n{transpose 2}\n[C]uma')).toBe(2)
+    expect(storedTransposeSemis('{key C}\n{transpose:2}\n[C]uma')).toBe(2)
+  })
+
   it('keeps {transpose:2} when the sibling chart is in another key', () => {
     const src = `{title:Uma}
 {x_chart_default:oferta}
diff --git a/tests/vue/block-edit-ui.test.ts b/tests/vue/block-edit-ui.test.ts
index bb4bacb..7a306a1 100644
--- a/tests/vue/block-edit-ui.test.ts
+++ b/tests/vue/block-edit-ui.test.ts
@@ -406,6 +406,29 @@ const ENVELOPE = [
   '{end_of_x_chart}',
 ].join('\n')
 
+describe('chord picker vocabulary', () => {
+  it('offers chords from the chart on screen, not a sibling-only chord', async () => {
+    const source = [
+      '{title:Uma}',
+      '{x_chart_default:oferta}',
+      '{start_of_x_chart:completa}',
+      '{key:G}',
+      '[F#m7]so a completa',
+      '{end_of_x_chart}',
+      '{start_of_x_chart:oferta}',
+      '{key:C}',
+      '[C]oferta [G]mais',
+      '{end_of_x_chart}',
+    ].join('\n')
+    const w = await edit({ source })
+    await w.findAll('[data-pill]')[0]?.trigger('keydown', { key: 'Enter' })
+    await flushPromises()
+    expect(w.find('[data-chord-dialog]').exists()).toBe(true)
+    expect(w.findAll('.cpv-vocab-btn').map((b) => b.text())).toEqual(['C', 'G'])
+    w.unmount()
+  })
+})
+
 describe('envelope block edit', () => {
   it('deletes the default chart lyric and keeps the sibling chart', async () => {
     const w = await edit({ source: ENVELOPE })

---END DIFF---

### Modified files (full content for context)

### src/core/charts.ts lines 1-516

```ts
1|/**
2| * Named charts in one song file. `{start_of_x_chart: id}` … `{end_of_x_chart}`.
3| * No envelope = one implicit chart `id=default`. `{new_song}` is not used.
4| */
5|
6|export type ChartInfo = {
7|  id: string
8|  label: string
9|  isDefault: boolean
10|}
11|
12|/** Identity of the song — lives above the first chart envelope. */
13|export const SONG_META_KEYS = [
14|  'title',
15|  'subtitle',
16|  'artist',
17|  'x_source',
18|  'x_youtube',
19|  'x_chart_default',
20|] as const
21|
22|/** Sound of one chart — lives inside the envelope (or the whole file when N=1). */
23|export const CHART_SOUND_KEYS = [
24|  'key',
25|  'transpose',
26|  'tempo',
27|  'time',
28|  'duration',
29|  'capo',
30|  'x_audio_sung',
31|  'x_audio_playback',
32|  'x_audio_art',
33|  'x_audio_art_w',
34|  'x_audio_art_h',
35|  'x_strum',
36|  'x_strum_set',
37|] as const
38|
39|const DIR = /^\s*\{\s*([a-zA-Z_]+)\s*:?\s*([^}]*)\}\s*$/
40|/** chartId slug from the design: `[a-z0-9_][a-z0-9_-]{0,63}`. */
41|const CHART_ID = /^[a-z0-9_][a-z0-9_-]{0,63}$/
42|
43|const SONG_ALIAS: Record<string, string> = {
44|  t: 'title',
45|  st: 'subtitle',
46|  composer: 'artist',
47|  x_origem: 'x_source',
48|}
49|
50|const CHART_ALIAS: Record<string, string> = {
51|  x_audio: 'x_audio_sung',
52|  x_audio_cantado: 'x_audio_sung',
53|}
54|
55|/** One-header order. Two-arg `writeMeta` on a file with no envelope emits this. */
56|export const META_KEYS = [
57|  'title',
58|  'subtitle',
59|  'artist',
60|  'key',
61|  'transpose',
62|  'tempo',
63|  'time',
64|  'duration',
65|  'capo',
66|  'x_source',
67|  'x_youtube',
68|  'x_chart_default',
69|  'x_audio_sung',
70|  'x_audio_playback',
71|  'x_audio_art',
72|  'x_audio_art_w',
73|  'x_audio_art_h',
74|  'x_strum',
75|  'x_strum_set',
76|] as const
77|export type MetaKey = (typeof META_KEYS)[number]
78|export type ChartMeta = Partial<Record<MetaKey, string>>
79|
80|/** Portuguese / short names still in files. Canonical key wins when both exist. */
81|const META_ALIAS: Record<string, MetaKey> = {
82|  t: 'title',
83|  st: 'subtitle',
84|  x_origem: 'x_source',
85|  x_audio: 'x_audio_sung',
86|  x_audio_cantado: 'x_audio_sung',
87|}
88|
89|export type MetaPatch = { [key: string]: string | undefined }
90|
91|export type FileChart = {
92|  id: string
93|  label: string | null
94|  /** Lines strictly between `{start_of_x_chart}` and `{end_of_x_chart}`. */
95|  inner: string
96|  /** 0-based index of `{start_of_x_chart}`. */
97|  startLi: number
98|  /** 0-based index of `{end_of_x_chart}`, or `raws.length` if the block is open. */
99|  endLi: number
100|}
101|
102|export type SplitCho = {
103|  hasEnvelope: boolean
104|  /** Text before the first `{start_of_x_chart}`. Whole file when there is none. */
105|  header: string
106|  charts: FileChart[]
107|  defaultId: string
108|  raws: string[]
109|}
110|
111|function dirOf(line: string): { name: string; value: string } | null {
112|  const m = line.match(DIR)
113|  if (!m) return null
114|  return { name: (m[1] ?? '').toLowerCase(), value: (m[2] ?? '').trim() }
115|}
116|
117|function isChartId(id: string): boolean {
118|  return CHART_ID.test(id)
119|}
120|
121|export function songMetaKey(name: string): string | null {
122|  const k = name.toLowerCase()
123|  if ((SONG_META_KEYS as readonly string[]).includes(k)) return k
124|  return SONG_ALIAS[k] ?? null
125|}
126|
127|export function chartSoundKey(name: string): string | null {
128|  const k = name.toLowerCase()
129|  if ((CHART_SOUND_KEYS as readonly string[]).includes(k)) return k
130|  return CHART_ALIAS[k] ?? null
131|}
132|
133|export function canonicalMetaKey(k: string): MetaKey | null {
134|  const lower = k.toLowerCase()
135|  if ((META_KEYS as readonly string[]).includes(lower)) return lower as MetaKey
136|  return META_ALIAS[lower] ?? null
137|}
138|
139|function readMetaLines(source: string): ChartMeta {
140|  const meta: ChartMeta = {}
141|  String(source ?? '')
142|    .split('\n')
143|    .forEach((l) => {
144|      const d = l.match(/^\s*\{\s*([a-zA-Z_]+)\s*:\s*([^}]*)\}\s*$/)
145|      if (!d) return
146|      const k = (d[1] ?? '').toLowerCase()
147|      const v = (d[2] ?? '').trim()
148|      const canon = canonicalMetaKey(k)
149|      if (!canon) return
150|      const exact = (META_KEYS as readonly string[]).includes(k)
151|      if (exact || meta[canon] === undefined) meta[canon] = v
152|    })
153|  return meta
154|}
155|
156|/**
157| * No envelope: the whole file, same as before.
158| * With `{start_of_x_chart}`: song identity plus the default chart only.
159| * A later sibling `{key:}` or audio line must not win.
160| */
161|export function readMeta(source: string): ChartMeta {
162|  const text = String(source ?? '')
163|  if (!splitCho(text).hasEnvelope) return readMetaLines(text)
164|  return readMetaLines(chartDocument(text))
165|}
166|
167|export function splitCho(source: string): SplitCho {
168|  const text = String(source ?? '').replace(/\r\n?/g, '\n')
169|  const raws = text.split('\n')
170|  const charts: FileChart[] = []
171|  let cur: { id: string; label: string | null; inner: string[]; startLi: number } | null = null
172|
173|  const flush = (endLi: number) => {
174|    if (!cur) return
175|    charts.push({
176|      id: cur.id,
177|      label: cur.label,
178|      inner: cur.inner.join('\n'),
179|      startLi: cur.startLi,
180|      endLi,
181|    })
182|    cur = null
183|  }
184|
185|  for (let li = 0; li < raws.length; li++) {
186|    const raw = raws[li] ?? ''
187|    const d = dirOf(raw)
188|    if (d?.name === 'start_of_x_chart') {
189|      flush(li)
190|      cur = isChartId(d.value) ? { id: d.value, label: null, inner: [], startLi: li } : null
191|      continue
192|    }
193|    if (d?.name === 'end_of_x_chart') {
194|      flush(li)
195|      continue
196|    }
197|    if (cur) {
198|      if (d?.name === 'x_chart_label' && cur.label === null && d.value) cur.label = d.value
199|      cur.inner.push(raw)
200|    }
201|  }
202|  flush(raws.length)
203|
204|  if (charts.length === 0) {
205|    return {
206|      hasEnvelope: false,
207|      header: text,
208|      charts: [{ id: 'default', label: null, inner: text, startLi: 0, endLi: raws.length }],
209|      defaultId: 'default',
210|      raws,
211|    }
212|  }
213|
214|  const header = raws.slice(0, charts[0]!.startLi).join('\n')
215|  let defaultFromHeader: string | null = null
216|  for (const line of header.split('\n')) {
217|    const d = dirOf(line)
218|    if (d?.name === 'x_chart_default' && isChartId(d.value)) defaultFromHeader = d.value
219|  }
220|  const named = defaultFromHeader && charts.some((c) => c.id === defaultFromHeader) ? defaultFromHeader : charts[0]!.id
221|  return { hasEnvelope: true, header, charts, defaultId: named, raws }
222|}
223|
224|export function listCharts(source: string): ChartInfo[] {
225|  const split = splitCho(source)
226|  return split.charts.map((c) => ({
227|    id: c.id,
228|    label: (c.label && c.label.trim()) || c.id,
229|    isDefault: c.id === split.defaultId,
230|  }))
231|}
232|
233|function isEnvelopeName(name: string): boolean {
234|  return (
235|    name === 'start_of_x_chart' ||
236|    name === 'end_of_x_chart' ||
237|    name === 'x_chart_label' ||
238|    name === 'x_chart_default'
239|  )
240|}
241|
242|function songIdentityHeader(header: string): string {
243|  return header
244|    .split('\n')
245|    .filter((line) => {
246|      const d = dirOf(line)
247|      if (!d) return false
248|      const canon = songMetaKey(d.name)
249|      return canon !== null && canon !== 'x_chart_default'
250|    })
251|    .join('\n')
252|}
253|
254|function chartDocBody(inner: string): string {
255|  return inner
256|    .split('\n')
257|    .filter((line) => {
258|      const d = dirOf(line)
259|      if (!d) return true
260|      return !isEnvelopeName(d.name)
261|    })
262|    .join('\n')
263|}
264|
265|export function resolveChartId(source: string, chartId?: string): string {
266|  const split = splitCho(source)
267|  if (chartId && split.charts.some((c) => c.id === chartId)) return chartId
268|  return split.defaultId
269|}
270|
271|/**
272| * One-chart ChordPro: song title/artist plus that chart's sound and body.
273| * No sibling charts, no envelope directives. File without envelope is unchanged.
274| */
275|export function chartDocument(source: string, chartId?: string): string {
276|  const split = splitCho(source)
277|  if (!split.hasEnvelope) return split.header
278|  const id = resolveChartId(source, chartId)
279|  const chart = split.charts.find((c) => c.id === id) ?? split.charts[0]!
280|  const identity = songIdentityHeader(split.header)
281|  const body = chartDocBody(chart.inner)
282|  return [identity, body].filter((s) => s.length > 0).join('\n')
283|}
284|
285|function linesOf(text: string): string[] {
286|  if (!text) return []
287|  return text.split('\n')
288|}
289|
290|function readKeyed(text: string, which: 'song' | 'chart'): Record<string, string> {
291|  const out: Record<string, string> = {}
292|  const keys = which === 'song' ? SONG_META_KEYS : CHART_SOUND_KEYS
293|  const resolve = which === 'song' ? songMetaKey : chartSoundKey
294|  for (const line of text.split('\n')) {
295|    const d = dirOf(line)
296|    if (!d) continue
297|    const canon = resolve(d.name)
298|    if (!canon) continue
299|    const exact = (keys as readonly string[]).includes(d.name)
300|    if (exact || out[canon] === undefined) out[canon] = d.value
301|  }
302|  return out
303|}
304|
305|function applyPatch(cur: Record<string, string>, patch: MetaPatch, keys: readonly string[]): Record<string, string> {
306|  const next = { ...cur }
307|  for (const k of keys) {
308|    if (!Object.prototype.hasOwnProperty.call(patch, k)) continue
309|    const v = (patch[k] ?? '').trim()
310|    if (v) next[k] = v
311|    else delete next[k]
312|  }
313|  return next
314|}
315|
316|function formatKeys(keys: readonly string[], meta: Record<string, string>): string {
317|  return keys
318|    .filter((k) => (meta[k] ?? '').trim())
319|    .map((k) => '{' + k + ':' + (meta[k] ?? '').trim() + '}')
320|    .join('\n')
321|}
322|
323|function spliceInner(raws: string[], chart: FileChart, inner: string): string[] {
324|  const from = chart.startLi + 1
325|  return [...raws.slice(0, from), ...linesOf(inner), ...raws.slice(chart.endLi)]
326|}
327|
328|/**
329| * One-chart header rewrite: known keys leave the body and come back on top, in
330| * the canonical order. No two `{key:}` lines competing.
331| */
332|export function writeMetaOneHeader(source: string, meta: ChartMeta): string {
333|  // A patch that omits `{x_chart_default}` must not drop a line already in the file.
334|  const setsDefault = Object.prototype.hasOwnProperty.call(meta, 'x_chart_default')
335|  const body = String(source ?? '')
336|    .split('\n')
337|    .filter((l) => {
338|      const d = l.match(/^\s*\{\s*([a-zA-Z_]+)\s*:\s*[^}]*\}\s*$/)
339|      if (!d) return true
340|      const k = (d[1] ?? '').toLowerCase()
341|      if (k === 'x_chart_default' && !setsDefault) return true
342|      return canonicalMetaKey(k) === null
343|    })
344|  const head = META_KEYS.filter((k) => (meta[k] ?? '').trim()).map(
345|    (k) => '{' + k + ':' + (meta[k] ?? '').trim() + '}',
346|  )
347|  return [head.join('\n'), body.join('\n').replace(/^\n+/, '')].filter(Boolean).join('\n')
348|}
349|
350|/** Implicit chart id when the file has no `{start_of_x_chart}`. */
351|function isImplicitChartId(chartId: string | undefined): boolean {
352|  const id = String(chartId ?? '').trim()
353|  return id === '' || id === 'default'
354|}
355|
356|function writeFlatScoped(source: string, patch: MetaPatch, keys: readonly string[]): string {
357|  const next: ChartMeta = { ...readMeta(source) }
358|  for (const k of keys) {
359|    if (!(META_KEYS as readonly string[]).includes(k)) continue
360|    if (!Object.prototype.hasOwnProperty.call(patch, k)) continue
361|    const key = k as MetaKey
362|    const v = (patch[k] ?? '').trim()
363|    if (v) next[key] = v
364|    // Deleting an explicit empty `{x_chart_default}` looks like an omit, and
365|    // writeMetaOneHeader then keeps the line already in the file.
366|    else if (key === 'x_chart_default') next[key] = ''
367|    else delete next[key]
368|  }
369|  return writeMetaOneHeader(source, next)
370|}
371|
372|/** Rewrite song-header keys; never strip `{key:}` / `{duration:}` from chart blocks. */
373|export function writeSongScopedMeta(source: string, patch: MetaPatch): string {
374|  const split = splitCho(source)
375|  if (!split.hasEnvelope) return writeFlatScoped(source, patch, SONG_META_KEYS)
376|  const first = split.charts[0]!
377|  const headerLines = split.raws.slice(0, first.startLi)
378|  const next = applyPatch(readKeyed(headerLines.join('\n'), 'song'), patch, SONG_META_KEYS)
379|  const rest = headerLines
380|    .filter((line) => {
381|      const d = dirOf(line)
382|      return !d || songMetaKey(d.name) === null
383|    })
384|    .join('\n')
385|    .replace(/^\n+/, '')
386|    .replace(/\n+$/, '')
387|  const head = formatKeys(SONG_META_KEYS, next)
388|  const header = [head, rest].filter((s) => s.length > 0).join('\n')
389|  const tail = split.raws.slice(first.startLi).join('\n')
390|  return [header, tail].filter((s) => s.length > 0).join('\n')
391|}
392|
393|function rewriteChartInner(inner: string, patch: MetaPatch): string {
394|  const labelLines: string[] = []
395|  const rest: string[] = []
396|  for (const line of inner.split('\n')) {
397|    const d = dirOf(line)
398|    if (d?.name === 'x_chart_label') {
399|      labelLines.push(line)
400|      continue
401|    }
402|    if (d && chartSoundKey(d.name)) continue
403|    rest.push(line)
404|  }
405|  // A blank under the label is content. Clearing a sound key must not eat it.
406|  const next = applyPatch(readKeyed(inner, 'chart'), patch, CHART_SOUND_KEYS)
407|  const head = formatKeys(CHART_SOUND_KEYS, next)
408|  return [labelLines.join('\n'), head, rest.join('\n')].filter((s) => s.length > 0).join('\n')
409|}
410|
411|/** Rewrite sound keys inside one named chart; sibling blocks stay put. */
412|export function writeChartScopedMeta(source: string, patch: MetaPatch, chartId?: string): string {
413|  const split = splitCho(source)
414|  if (!split.hasEnvelope) {
415|    if (!isImplicitChartId(chartId)) return String(source ?? '')
416|    return writeFlatScoped(source, patch, CHART_SOUND_KEYS)
417|  }
418|  const id = chartId && split.charts.some((c) => c.id === chartId) ? chartId : null
419|  if (!id) return String(source ?? '')
420|  const chart = split.charts.find((c) => c.id === id)
421|  if (!chart) return String(source ?? '')
422|  return spliceInner(split.raws, chart, rewriteChartInner(chart.inner, patch)).join('\n')
423|}
424|
425|/**
426| * Song-identity lines from a chart document, raw. `dirOf` trims values, so a
427| * trailing space in `{title:Uma }` only survives if the line itself is copied.
428| * An empty `{title:}` is present. A missing key is not.
429| */
430|function rawSongIdentityLines(document: string): Map<string, string> {
431|  const out = new Map<string, string>()
432|  for (const line of document.split('\n')) {
433|    const d = dirOf(line)
434|    if (!d) continue
435|    const canon = songMetaKey(d.name)
436|    if (!canon || canon === 'x_chart_default') continue
437|    const exact = (SONG_META_KEYS as readonly string[]).includes(d.name)
438|    if (exact || !out.has(canon)) out.set(canon, line)
439|  }
440|  return out
441|}
442|
443|/**
444| * Copy song-identity lines onto the header in place. Omitted keys are removed.
445| * Comments, `{x_chart_default}`, and the blank line before the first chart stay.
446| */
447|function applyRawSongIdentity(raws: string[], headerEnd: number, document: string): string[] {
448|  const wanted = rawSongIdentityLines(document)
449|  const seen = new Set<string>()
450|  const nextHeader: string[] = []
451|  for (const line of raws.slice(0, headerEnd)) {
452|    const d = dirOf(line)
453|    const canon = d ? songMetaKey(d.name) : null
454|    if (!canon || canon === 'x_chart_default') {
455|      nextHeader.push(line)
456|      continue
457|    }
458|    if (seen.has(canon)) continue
459|    seen.add(canon)
460|    const raw = wanted.get(canon)
461|    if (raw === undefined) continue
462|    nextHeader.push(raw)
463|  }
464|  const missing: string[] = []
465|  for (const key of SONG_META_KEYS) {
466|    if (key === 'x_chart_default') continue
467|    if (wanted.has(key) && !seen.has(key)) missing.push(wanted.get(key)!)
468|  }
469|  if (missing.length) {
470|    let at = nextHeader.length
471|    while (at > 0 && nextHeader[at - 1]!.trim() === '') at--
472|    nextHeader.splice(at, 0, ...missing)
473|  }
474|  return [...nextHeader, ...raws.slice(headerEnd)]
475|}
476|
477|/**
478| * Splice a one-chart document back into the named envelope block.
479| * Song identity is copied raw (trailing space and empty `{title:}` stay).
480| * A missing title, subtitle, artist, x_source, or x_youtube clears that field.
481| * `{x_chart_default}` is left as it stands. The sibling chart stays.
482| */
483|export function replaceChart(file: string, chartId: string, doc: string): string {
484|  const src = String(file ?? '').replace(/\r\n?/g, '\n')
485|  const document = String(doc ?? '').replace(/\r\n?/g, '\n')
486|  const split = splitCho(src)
487|  if (!split.hasEnvelope) {
488|    if (!isImplicitChartId(chartId)) return src
489|    return document
490|  }
491|  const chart = split.charts.find((c) => c.id === chartId)
492|  if (!chart) return src
493|
494|  const body: string[] = []
495|  for (const line of document.split('\n')) {
496|    const d = dirOf(line)
497|    if (d && songMetaKey(d.name)) continue
498|    if (d && isEnvelopeName(d.name)) continue
499|    body.push(line)
500|  }
501|  // A blank line at the top of the chart body is content. Do not strip it.
502|
503|  const hasLabel = body.some((line) => dirOf(line)?.name === 'x_chart_label')
504|  const labelLine = !hasLabel && chart.label ? `{x_chart_label:${chart.label}}` : null
505|  const inner = [labelLine, body.join('\n')].filter((s) => s && s.length > 0).join('\n')
506|  const spliced = spliceInner(split.raws, chart, inner)
507|  return applyRawSongIdentity(spliced, split.charts[0]!.startLi, document).join('\n')
508|}
509|
510|/**
511| * Write a chart document back. No envelope: `default` replaces the file.
512| * With an envelope: only the default chart changes; the sibling stays.
513| */
514|export function commitChartDocument(file: string, document: string): string {
515|  return replaceChart(file, splitCho(file).defaultId, document)
516|}
```

### src/core/import-chordpro.ts lines 36-45

```ts
36|} from './strum'
37|import {
38|  metaFromStrumSet,
39|  parseXStrumSet,
40|  type StrumPatternSet,
41|} from './strum-multi'
42|import { parse } from './parse'
43|import { hasSongDuration } from './timeline'
44|import { keyIndex, keyRootOf, signedSemitoneDelta, transposeTextChords, usesFlats } from './transpose'
45|
```

### src/core/import-chordpro.ts lines 454-509

```ts
454|export function inferWrittenKey(source: string): string | null {
455|  const counts = new Map<string, number>()
456|  let tab = false
457|  let score = false
458|  for (const raw of String(source ?? '').split('\n')) {
459|    const d = raw.match(/^\s*\{\s*([a-zA-Z_]+)/)
460|    const k = (d?.[1] ?? '').toLowerCase()
461|    if (k === 'sot' || k === 'start_of_tab') {
462|      tab = true
463|      continue
464|    }
465|    if (k === 'eot' || k === 'end_of_tab') {
466|      tab = false
467|      continue
468|    }
469|    if (k === 'sos' || k === 'start_of_score') {
470|      score = true
471|      continue
472|    }
473|    if (k === 'eos' || k === 'end_of_score') {
474|      score = false
475|      continue
476|    }
477|    if (tab || score || d) continue
478|    for (const m of raw.matchAll(/\[([A-G](?:#|b)?)(m)?/g)) {
479|      const tok = (m[1] ?? '') + (m[2] ?? '')
480|      if (!tok) continue
481|      counts.set(tok, (counts.get(tok) ?? 0) + 1)
482|    }
483|  }
484|  let best: string | null = null
485|  let n = 0
486|  for (const [tok, c] of counts) {
487|    if (c > n) {
488|      best = tok
489|      n = c
490|    }
491|  }
492|  return best
493|}
494|
495|/**
496| * `{transpose}` counts only when the active chart's written chords match `{key}`.
497| * A sibling chart is not part of that comparison. The colon is optional, same
498| * read as `parse` (`{transpose 2}`, `{key C}`).
499| */
500|export function storedTransposeSemis(source: string): number {
501|  const view = parse(source)
502|  const stored = view.meta.transpose ?? 0
503|  if (!stored) return 0
504|  const written = inferWrittenKey(view.source)
505|  const a = keyIndex(keyRootOf(written || ''))
506|  const b = keyIndex(keyRootOf(view.meta.key || ''))
507|  if (a == null || b == null || a !== b) return 0
508|  return stored
509|}
```

### src/core/import-chordpro.ts lines 539-553

```ts
539|/**
540| * Move the written chords to `targetKey` and store `{transpose:N}` so the
541| * sounding/playing pitch stays where it was. A `{capo:}` that only encoded
542| * that same gap is dropped. Does not invent chords — semitone rewrite only.
543| * Named charts: only the default chart is rewritten; siblings stay put.
544| */
545|export function rewriteToKey(source: string, targetKey: string): RewriteToKeyResult | null {
546|  const src = String(source ?? '')
547|  const split = splitCho(src)
548|  if (!split.hasEnvelope) return rewriteOneChartToKey(src, targetKey)
549|  const rewritten = rewriteOneChartToKey(chartDocument(src), targetKey)
550|  if (!rewritten) return null
551|  const out = replaceChart(src, split.defaultId, rewritten.source)
552|  return { ...rewritten, source: out, changed: out !== src }
553|}
```

### src/core/parse.ts lines 29-31

```ts
29|const DIR = /^\s*\{\s*([a-zA-Z_]+)\s*:?\s*([^}]*)\}\s*$/
30|/** `#~ …` — hidden by the editor, still in the file. */
31|const HIDDEN = /^#~ ?(.*)$/
```

### src/core/parse.ts lines 150-163

```ts
150|        continue
151|      }
152|      if (k === 'title' || k === 't') meta.title = v
153|      else if (k === 'subtitle' || k === 'st') meta.subtitle = v
154|      else if (k === 'artist' || k === 'composer') meta.artist = v
155|      else if (k === 'key') meta.key = v
156|      else if (k === 'tempo') meta.tempo = /^\d+$/.test(v) ? Number(v) : v
157|      else if (k === 'time') meta.time = v
158|      else if (k === 'duration') meta.duration = v
159|      else if (k === 'capo') meta.capo = Number(v) || 0
160|      else if (k === 'transpose') {
161|        const n = Number(v)
162|        if (Number.isFinite(n) && n !== 0) meta.transpose = n
163|      }
```

### src/core/parse.ts lines 301-319

```ts
301|export type ParseOpts = {
302|  /** Named chart inside an N>1 envelope. Absent → file default / implicit `default`. */
303|  chartId?: string
304|}
305|
306|export function parse(source: string, opts?: ParseOpts): ChordProView {
307|  const text = normalizeEol(source ?? '')
308|  const sliced = chartDocument(text, opts?.chartId)
309|  const normalized = looksLikeOnSong(sliced) ? normalizeOnSong(sliced) : sliced
310|  const { meta, lines, eocOf } = parseRaw(normalized)
311|  return {
312|    meta,
313|    displayKey: meta.key ?? null,
314|    transposeSemitones: 0,
315|    source: normalized,
316|    sections: toSections(lines),
317|    eocOf,
318|  }
319|}
```

### src/vue/ChordproViewer.vue lines 785-872

```ts
785|const fileTranspose = computed(() => {
786|  const n = Number(meta.value.transpose)
787|  return Number.isFinite(n) ? n : 0
788|})
789|/** Line indexes from `parse` refer to this chart document, not the envelope. */
790|const chartSource = computed(() => parsed.value.source)
791|const writtenKey = computed(() => inferWrittenKey(chartSource.value))
792|const keyMismatch = computed(() => {
793|  const a = keyIndex(keyRootOf(writtenKey.value || ''))
794|  const b = keyIndex(keyRootOf(meta.value.key || ''))
795|  return a != null && b != null && a !== b
796|})
797|const viewSemis = computed(() =>
798|  isEdit.value ? 0 : offset.value + storedTransposeSemis(chartSource.value),
799|)
800|const shownKey = computed(() => (meta.value.key ? transposeToken(meta.value.key, offset.value, flats.value) : ''))
801|const playingKey = computed(() =>
802|  meta.value.key ? transposeToken(meta.value.key, viewSemis.value, flats.value) : '',
803|)
804|const toneLabel = computed(() => {
805|  if (!meta.value.key) return ''
806|  const id = fileTranspose.value ? meta.value.key : shownKey.value
807|  const bits = [id]
808|  if (fileTranspose.value && playingKey.value && playingKey.value !== id) bits.push(`tocando em ${playingKey.value}`)
809|  if (hasCapo.value) bits.push(`capo ${capo.value}`)
810|  return bits.join(' · ')
811|})
812|const songKeyCaption = computed(() => {
813|  const written = meta.value.key
814|  const shift = formatToneShift(viewSemis.value)
815|  if (!written || !shift) return ''
816|  return `${written} · ${shift}`
817|})
818|/** The shapes a capo player frets: `capo` frets below what sounds. */
819|const shapeKey = computed(() => transposeToken(meta.value.key || '', viewSemis.value - capo.value, flats.value))
820|const fitOn = computed(() => (isEdit.value ? false : (fit.value ?? props.fitDefault)))
821|const activeLens = computed<Lens>(() => (isEdit.value ? 'none' : lens.value))
822|const layout = computed(() =>
823|  layoutChartFull(parsed.value, {
824|    semitones: viewSemis.value,
825|    capo: capo.value,
826|    dual: capoMap.value,
827|    lens: activeLens.value,
828|    editing: isEdit.value,
829|  }),
830|)
831|const blocks = computed(() => {
832|  const all = layout.value.blocks
833|  // Hiding rehearsal comments is a reading lens, not an edit: the text stays
834|  // in the file, and the editor always sees it.
835|  if (isEdit.value || !hideComments.value) return all
836|  return all.filter((b) => b.kind !== 'comment' && b.kind !== 'note')
837|})
838|const twin = computed(() => layout.value.twin)
839|const legend = computed(() => layout.value.legend)
840|const capoPairs = computed(() => layout.value.capoPairs)
841|
842|/**
843| * Writing the chart by its blocks (E1/E2). Every action rewrites the source —
844| * a block that was moved, hidden, transposed or capoed says so in the file,
845| * so it survives a reload, an undo and a re-parse.
846| */
847|const bedit = useBlockEdit({
848|  source: chartSource,
849|  blocks,
850|  editing: isEdit,
851|  wMode,
852|  songCapo: capo,
853|  flats,
854|  root,
855|  scroller,
856|  write: (next, message) => {
857|    session.replace(commitChartDocument(session.getSource(), next))
858|    touch()
859|    if (message) toastMsg(message)
860|  },
861|  toast: (m) => toastMsg(m),
862|})
863|const editScale = computed(() => editTypeScale(bias.value, compact.value))
864|/** The chart's own chord names, so a new one is a tap and not a spelling test. */
865|const chordVocab = computed(() =>
866|  Array.from(
867|    new Set(
868|      (chartSource.value.match(/\[([^\]]+)\]/g) ?? [])
869|        .map((t) => t.slice(1, -1))
870|        .filter((t) => /^[A-G]/.test(t)),
871|    ),
872|  ).slice(0, 12),
```

### src/core/audio-url.ts lines 60-78

```ts
60|export function setAudioUrl(
61|  source: string,
62|  url: string | null,
63|  kind: AudioKind = 'sung',
64|): string {
65|  const cur: ChartMeta = { ...readMeta(source) }
66|  const key = kindKey(kind)
67|  if (url == null || !String(url).trim()) {
68|    // '' clears; delete would drop the key from a two-arg envelope patch.
69|    cur[key] = ''
70|    return writeMeta(source, cur)
71|  }
72|  const ok = playableAudioUrl(url)
73|  if (!ok) {
74|    throw new Error('x_audio_sung / x_audio_playback must be an http(s) audio file URL (not YouTube)')
75|  }
76|  cur[key] = ok
77|  return writeMeta(source, cur)
78|}
```


### Callers / dependents (read-only context)

### Call sites (limit 5 per changed export)

- `commitChartDocument` → `replaceChart`: src/core/charts.ts:514-515 (included above)
- `rewriteToKey` → `replaceChart`: src/core/import-chordpro.ts:545-552 (included above)
- `ChordproViewer` `viewSemis` calls `storedTransposeSemis(chartSource)`: src/vue/ChordproViewer.vue:797-798
- `ChordproViewer` block write calls `commitChartDocument`: src/vue/ChordproViewer.vue:856-857
- `setAudioUrl` calls `writeMeta` with empty string on clear: src/core/audio-url.ts:67-70
- exports: src/core/index.ts re-exports `commitChartDocument`, `replaceChart`, `storedTransposeSemis`


## What to look for (attack surfaces for code review)

1. **Correctness**: logic bugs, off-by-one, null/undefined, type confusion
2. **Race conditions**: shared state, async ordering, missing locks
3. **Security**: auth bypass, injection, tenant isolation, secrets exposure
4. **Data integrity**: silent truncation, lost writes, dropped errors
5. **Error handling**: silently swallowed failures, generic catches
6. **Backward compatibility**: API contract changes, schema migration risk
7. **Rollback safety**: can this change be reverted cleanly?
8. **Performance**: algorithmic regressions, query patterns, N+1
9. **Test gaps**: new code paths without corresponding tests
10. **Observability**: new failure modes without logging or metrics

## Finding bar (mandatory for EACH finding)

Every finding MUST answer all four:
1. WHAT fails (which input causes which incorrect behavior)
2. WHY (mechanism — not "this looks wrong")
3. IMPACT — concrete consequence (data loss? auth bypass? user-visible bug?)
4. RECOMMENDATION — specific action

If a finding cannot answer all four: DROP IT.

## Severity calibration

- **blocker**: production data loss, security breach, makes feature impossible
- **critical**: bug that hits users in normal use; major regression
- **major**: real bug or gap; edge case OR clear workaround exists
- **minor**: small issue worth fixing; rare edge case
- **nit**: cosmetic; DROP by default

QUOTA: maximum 5 (blocker + critical combined). If you have more, RECALIBRATE.

## Output format

# Required Output Format — Pass 1 (Blind)

You MUST respond in this exact markdown structure. No prose before frontmatter.
No commentary after the last section. No alternative formats.

````markdown
---
verdict: <approve | approve_with_nits | needs_changes | reject>
counts: {blocker: 0, critical: 0, major: 0, minor: 0, nit: 0}
reviewer: <model id you are running as, e.g. gpt-5.3-codex>
pass: blind
schema_version: "1.0"
---

## Summary
<1-2 paragraphs, max 200 words. State substance only — no compliments, no
"what works well", no praise. If verdict is approve, say so in one sentence
and stop.>

## Findings

### F-001 [<severity>] <category> — <file>:<line_start>[-<line_end>]

**Evidence:**
```<lang>
<exact snippet from artifact — quote literally>
```

**Claim:** <what fails or is missing — single sentence>

**Impact:** <concrete consequence — data loss? auth bypass? user-visible bug?
unimplementable design decision? Be specific, not abstract.>

**Recommendation:** <specific action. NOT "consider X". Say what to do.>

**Confidence:** <high | medium | low>

---

### F-002 ...
(repeat for each finding. Increment IDs F-001, F-002, F-003 ...)

## Questions (non-findings)

<Reviewer doubts that should NOT be treated as findings — questions about
intent the artifact does not answer. Empty list is fine.>

- <file>:<line> — <question to author>

## Out of scope

<Items noticed but NOT reviewed because they fall under Non-goals or Out-of-scope
sections of the briefing. Empty list is fine.>

- <item>
````

## Format rules

- `<lang>` in Evidence fence: use the language of the file (`js`, `ts`, `py`, `md`, `yaml`). If unknown, leave blank.
- IDs must match regex `F-\d{3}` (e.g. `F-001`, not `F-1`, not `F-001-blind`). The `-blind` suffix is added by Pass 2 reconciliation if needed.
- Severity enum: `blocker | critical | major | minor | nit`. No other values.
- Confidence enum: `high | medium | low`. No other values.
- `counts` numbers must equal actual finding count by severity.
- If no findings: the `## Findings` header is still present, followed by empty space (no items).

## Forbidden

- Markdown other than the template above.
- Bullet lists summarizing findings outside the per-finding structure.
- "What works well" sections.
- Praise or hedging ("the author probably intends...").
- Multiple verdicts.
- Multiple frontmatter blocks.


## Forbidden behaviors

- DO NOT include "what works well" or compliments
- DO NOT defer to author authority
- DO NOT propose full implementations — recommendation is short
- DO NOT mention authorship or that anything was AI-generated
- DO NOT use any output format other than the template above

## External constraints (verifiable)

The constraints below are verifiable externally. Each line includes how to
verify if needed. Treat as ground truth.

- src/core/parse.ts:29 defines DIR as /^\s*\{\s*([a-zA-Z_]+)\s*:?\s*([^}]*)\}\s*$/ (colon optional). Verify by reading that line.
- src/core/parse.ts:160-162 assigns meta.transpose only when Number.isFinite(n) && n !== 0. Verify by reading those lines.
- src/core/parse.ts:306-315 sets view.source to the chartDocument() slice of the input, not the raw envelope string. Verify by reading parse().
- src/core/charts.ts:39 uses the same optional-colon DIR. src/core/charts.ts:111-114 dirOf() trims the captured value. Verify by reading those lines.
- src/core/charts.ts:144 readMetaLines() matches only /^\s*\{\s*([a-zA-Z_]+)\s*:\s*([^}]*)\}\s*$/ (colon required). Verify by reading that line.
- src/core/charts.ts:43-48 SONG_ALIAS maps composer to artist. src/core/charts.ts:81-87 META_ALIAS does not include composer. src/core/charts.ts:133-136 canonicalMetaKey() uses META_KEYS and META_ALIAS only. Verify by reading those lines.
- src/core/charts.ts:161-164 readMeta() on an envelope calls readMetaLines(chartDocument(text)). Verify by reading readMeta().
- No file under src/core imports vue. Verify: rg -n "from ['\"]vue|from ['\"]@vue" src/core returns no matches.
- package.json has "type": "module" and no engines field. Verify: node -e "const p=require('./package.json'); console.log(p.type, p.engines)".


## Pass 1 (blind) findings

The following findings were produced by your previous review WITHOUT the
constraints above. Re-evaluate each against the constraints.

---BEGIN PASS 1 OUTPUT---
---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 2, minor: 0, nit: 0}
reviewer: gpt-6
pass: blind
schema_version: "1.0"
---

## Summary

In-memory comparisons against `eee2c7f` reproduced two regressions: a later zero transpose no longer cancels an earlier offset, and raw identity preservation makes previously readable metadata disappear from `readMeta()` results.

## Findings

### F-001 [major] Correctness — src/core/import-chordpro.ts:501-503

**Evidence:**
```ts
  const view = parse(source)
  const stored = view.meta.transpose ?? 0
  if (!stored) return 0
```

**Claim:** For `{key:C}\n{transpose:2}\n{transpose:0}\n[C]uma`, `storedTransposeSemis()` now returns `2` instead of `0` because `parseRaw()` ignores zero transpose directives without clearing an earlier value.

**Impact:** The viewer applies a two-semitone shift despite the final explicit reset, displaying the written C chord as D; the previous implementation returned zero for this input.

**Recommendation:** Make the parser overwrite or clear the previous transpose when it encounters an explicit zero, and add a regression test covering repeated directives ending in zero.

**Confidence:** high

---

### F-002 [major] Backward compatibility — src/core/charts.ts:460-462

**Evidence:**
```ts
    const raw = wanted.get(canon)
    if (raw === undefined) continue
    nextHeader.push(raw)
```

**Claim:** Committing a chart document containing `{title Uma}\n{artist Alguém}` or `{composer:Alguém}` now makes those identity fields absent from `readMeta(result)` because the copied syntax bypasses canonicalization while `readMetaLines()` requires colons and `canonicalMetaKey()` does not recognize `composer`.

**Impact:** After an envelope edit, metadata consumers receive undefined title or artist values even though the fields remain present and visible through `parse()`; the same commit operation previously produced readable canonical identity directives.

**Recommendation:** Extend `readMeta()` to recognize the identity syntax and aliases preserved by this writer, and test commit/read round trips for colonless identity directives and `composer`.

**Confidence:** high

## Questions (non-findings)

None.

## Out of scope

Dependency manifests, documentation, and files outside the specified review boundary.
---END PASS 1 OUTPUT---

## Your task in this pass

1. Re-evaluate ALL findings from Pass 1 against the External Constraints.
   For EACH Pass 1 finding, decide one of:
   - **DROP** — finding is invalid given a constraint or non-goal
   - **MAINTAIN** — finding stands, severity unchanged
   - **REFINE** — finding stands but severity changes

2. Identify NEW findings that emerge ONLY because of these constraints
   (e.g. the artifact violates a constraint you couldn't see in Pass 1).

3. Output the FULL final findings list (use new sequential IDs starting at
   F-001) plus a complete `## Pass 2 reconciliation` block.

## Output format

# Required Output Format — Pass 2 (Informed)

Same template as Pass 1 PLUS an obligatory `## Pass 2 reconciliation` block.
You MUST respond in this exact structure.

````markdown
---
verdict: <approve | approve_with_nits | needs_changes | reject>
counts: {blocker: 0, critical: 0, major: 0, minor: 0, nit: 0}
reviewer: <model id>
pass: informed
schema_version: "1.0"
---

## Summary
<1-2 paragraphs, max 200 words>

## Findings

### F-001 [<severity>] <category> — <file>:<line>

**Evidence:** <...>
**Claim:** <...>
**Impact:** <...>
**Recommendation:** <...>
**Confidence:** <...>

---

### F-002 ... (final IDs — these are the post-constraints findings)

## Questions (non-findings)

- <file>:<line> — <question>

## Out of scope

- <item>

## Pass 2 reconciliation

### Dropped from blind pass

<For each Pass 1 finding you are dropping, write one line:>

- F-001-blind [<severity>] <category> — DROPPED: <one-sentence reason citing
  which constraint or non-goal makes it invalid>

<If no drops: write `- _(none)_`>

### Maintained

<For each Pass 1 finding kept (with or without severity change):>

- F-002-blind → F-001-final [<severity>] — <same | severity changed: was X, now Y>

<If no maintained: write `- _(none)_`>

### Emerged

<For each NEW finding that surfaced only because constraints were revealed:>

- F-XXX-final [<severity>] <category> — emerged: <one-sentence reason citing
  the constraint that triggered the finding>

<If no emerged: write `- _(none)_`>
````

## Rules specific to Pass 2

- Final findings use sequential IDs `F-001, F-002, ...` (no `-final` suffix in the `## Findings` section — only in reconciliation references).
- In reconciliation, refer to blind findings with `-blind` suffix and maintained mappings with `→ F-XXX-final`.
- `counts` is the COUNT OF FINAL findings (post-reconciliation), not blind.
- `pass: informed` (literal).
- All universal rules from `output-template-pass1.md` apply.


Begin reconciliation now.
```

</details>

## Fixes applied in this session

None. No product file was edited between the passes.

## Self-review against code-quality gates

- G1 read-before-claim: N/A. No fix.
- G2 soft-language: 0 occurrences. No fix descriptions.
- G3 anti-tautology: N/A. No new test.
- G4 fixture realism: N/A. No new fixture.
- G7 anti-premature-abstraction: N/A. No new helper.
