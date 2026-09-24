---
date: 2026-09-24T07:28:05-03:00
topic: versoes-cifra-f0-fix8
artifact: 24b96e9..4a657a3
skill: review-code
reviewer: gpt-6-astra
provider: codex
provider_version: codex-cli 0.155.0
same_family_remap: false
final_verdict: needs_changes
counts_final: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
counts_blind: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
framing_delta: {dropped: 0, maintained: 3, emerged: 0}
schema_version: "1.1"
---

# Cross-Model Review — versoes-cifra-f0-fix8

## Pass 1 (blind)

---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
reviewer: gpt-6
pass: blind
schema_version: "1.0"
---

## Summary

Three regressions were reproduced against `24b96e9`: metadata reads revert a patched colonless title, audio updates remove spacing inside lyrics, and metadata writes become quadratic on consecutive blank lines. Verification used in-memory execution of the source and baseline; the full test suite was not run.

## Findings

### F-001 [major] Correctness — src/core/charts.ts:155-161

**Evidence:**
```ts
      const colonForm = /^\s*\{\s*[a-zA-Z_]+\s*:/.test(l)
      const ident = songIdentityMetaKey(d.name)
      if (!colonForm && !ident) return
      const canon = canonicalMetaKey(d.name) ?? ident
      if (!canon) return
      const exact = (META_KEYS as readonly string[]).includes(d.name)
      if (exact || meta[canon] === undefined) meta[canon] = d.value
```

**Claim:** Updating a flat document containing `{title Uma}` through `writeSongScopedMeta(source, { title: 'Nova' })` now makes `readMeta` return `Uma`, because the writer retains the colonless directive after the generated `{title:Nova}` and the expanded reader lets it overwrite the patch.

**Impact:** Metadata consumers display the old title after an edit, and subsequent read-modify-write operations propagate that stale value. The same reproduction returned `Nova` before this change.

**Recommendation:** Make the flat writer remove or replace every identity syntax accepted by the reader, including colonless directives and `composer`; add read-write-read tests for replacement and clearing.

**Confidence:** high

---

### F-002 [major] Data integrity — src/core/charts.ts:430

**Evidence:**
```ts
    if (blankBetweenSoundKeys(lines, i)) continue
```

**Claim:** Clearing audio from a chart body containing `[C]corpo\n{tempo:80}\n\n{x_audio_sung:https://cdn.example/c.m4a}\n[C]corpo` deletes the separator between the lyric lines because this filter applies throughout the chart, including after lyrics have started.

**Impact:** An audio metadata edit changes the song’s visible layout and persists the lost spacing into its source. Parsing the reproduced output yields two adjacent lyric lines; the baseline preserved an empty line between them.

**Recommendation:** Restrict blank removal to the chart’s leading metadata block and preserve blanks within the body; add a regression test with sound directives surrounding a separator after a lyric line.

**Confidence:** high

---

### F-003 [major] Performance — src/core/charts.ts:406-409

**Evidence:**
```ts
  let prev = index - 1
  while (prev >= 0 && (lines[prev] ?? '').trim() === '') prev--
  let next = index + 1
  while (next < lines.length && (lines[next] ?? '').trim() === '') next++
```

**Claim:** A run of N blank lines causes Θ(N²) work during chart metadata updates because the helper rescans the run in both directions for every blank, even when neither boundary is a sound key.

**Impact:** Small whitespace-heavy inputs can stall synchronous editing operations. A chart with 20,000 trailing blank lines took approximately 1,033 ms to update versus 3 ms on the baseline; runs of 5,000 and 10,000 took approximately 63 ms and 249 ms, confirming quadratic scaling.

**Recommendation:** Process each blank run once, or precompute neighboring nonblank lines in linear passes; add a scaling regression check covering trailing blanks as well as blanks between sound keys.

**Confidence:** high

## Questions (non-findings)

## Out of scope

## Pass 2 (informed)

---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
reviewer: gpt-6
pass: informed
schema_version: "1.0"
---

## Summary

All three blind findings remain valid under the external constraints. In-memory execution of both revisions reproduced stale metadata after edits, deleted lyric spacing, and quadratic processing of consecutive blank lines. The full test suite was not run.

The `composer` constraints confirm another instance of the metadata writer mismatch covered by F-001; they do not establish a separate finding.

## Findings

### F-001 [major] Correctness — src/core/charts.ts:155-161

**Evidence:**
```ts
      const colonForm = /^\s*\{\s*[a-zA-Z_]+\s*:/.test(l)
      const ident = songIdentityMetaKey(d.name)
      if (!colonForm && !ident) return
      const canon = canonicalMetaKey(d.name) ?? ident
      if (!canon) return
      const exact = (META_KEYS as readonly string[]).includes(d.name)
      if (exact || meta[canon] === undefined) meta[canon] = d.value
```

**Claim:** `writeSongScopedMeta('{title Uma}', { title: 'Nova' })` produces `{title:Nova}\n{title Uma}`, which the expanded reader resolves back to `Uma` because the flat writer retains colonless directives and the later canonical title overwrites the patch.

**Impact:** Metadata consumers report the old title after an edit; the baseline returned `Nova`. Clearing an artist stored as `{composer:Alguém}` also fails: `composer` survives the writer’s `canonicalMetaKey` filter, and the expanded reader returns `Alguém` after `{ artist: '' }`.

**Recommendation:** Make the flat writer remove or replace all identity syntax accepted by the reader, including colonless directives and `composer`; add replacement and clearing round-trip tests.

**Confidence:** high

---

### F-002 [major] Data integrity — src/core/charts.ts:427-431

**Evidence:**
```ts
    if (d && chartSoundKey(d.name)) continue
    // A blank under the label is content. A blank between sound keys is not:
    // rewriting those keys as one block must not drop it onto the lyric.
    if (blankBetweenSoundKeys(lines, i)) continue
    rest.push(line)
```

**Claim:** Clearing audio in an enveloped chart containing `[C]corpo\n{tempo:80}\n\n{x_audio_sung:https://cdn.example/c.m4a}\n[C]corpo` deletes the separator between lyric lines because the new filter removes qualifying blanks throughout the body.

**Impact:** An audio metadata edit persists a change to the song’s visible spacing. Executing the chart writer produced adjacent `[C]corpo` lines at `4a657a3`; `24b96e9` preserved the blank between them.

**Recommendation:** Restrict blank removal to the leading metadata block and preserve body blanks; add a regression test with sound directives surrounding a separator after lyrics have started.

**Confidence:** high

---

### F-003 [major] Performance — src/core/charts.ts:406-409

**Evidence:**
```ts
  let prev = index - 1
  while (prev >= 0 && (lines[prev] ?? '').trim() === '') prev--
  let next = index + 1
  while (next < lines.length && (lines[next] ?? '').trim() === '') next++
```

**Claim:** Updating an enveloped chart containing N consecutive blank lines performs Θ(N²) work because every blank independently scans the same run in both directions, including when its boundaries are not sound keys.

**Impact:** Whitespace-heavy input blocks synchronous metadata editing. Fresh measurements for 5,000, 10,000, and 20,000 trailing blank lines were approximately 64 ms, 249 ms, and 1,002 ms; baseline measurements were 1–2 ms.

**Recommendation:** Process each blank run once or precompute neighboring nonblank lines in linear passes; add a scaling regression check covering trailing blanks and blanks between sound keys.

**Confidence:** high

## Questions (non-findings)

## Out of scope

## Pass 2 reconciliation

### Dropped from blind pass

- _(none)_

### Maintained

- F-001-blind → F-001-final [major] — same; the flat-writer and alias constraints confirm the mismatch, including failed `composer` clearing.
- F-002-blind → F-002-final [major] — same; the constraint explicitly confirms that blank removal applies at any position in the chart body.
- F-003-blind → F-003-final [major] — same; the constraints do not bound blank runs or prevent repeated scans, and fresh execution reproduces quadratic scaling.

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
- Files other than src/core/charts.ts, src/core/parse.ts, tests/core/audio-url.test.ts, tests/core/charts-envelope.test.ts, and the direct dependents quoted below
- Dependency manifests and documentation


## Out of scope for this review

- Style, naming, formatting unless they hide substantive issues
- Items in the Non-goals list above
- Files not in the diff or its direct dependents

## Artifacts to review

### Diff
Ref: 24b96e9..4a657a3

---BEGIN DIFF---
diff --git a/src/core/charts.ts b/src/core/charts.ts
index b6f05a8..57974b2 100644
--- a/src/core/charts.ts
+++ b/src/core/charts.ts
@@ -136,19 +136,29 @@ export function canonicalMetaKey(k: string): MetaKey | null {
   return META_ALIAS[lower] ?? null
 }
 
+/** Song identity `readMeta` can store. `{composer:}` is artist; `{x_chart_default}` is not. */
+function songIdentityMetaKey(name: string): MetaKey | null {
+  const song = songMetaKey(name)
+  if (!song || song === 'x_chart_default') return null
+  return (META_KEYS as readonly string[]).includes(song) ? (song as MetaKey) : null
+}
+
 function readMetaLines(source: string): ChartMeta {
   const meta: ChartMeta = {}
   String(source ?? '')
     .split('\n')
     .forEach((l) => {
-      const d = l.match(/^\s*\{\s*([a-zA-Z_]+)\s*:\s*([^}]*)\}\s*$/)
+      const d = dirOf(l)
       if (!d) return
-      const k = (d[1] ?? '').toLowerCase()
-      const v = (d[2] ?? '').trim()
-      const canon = canonicalMetaKey(k)
+      // Raw song identity may omit the colon (`{title Uma}`) or use `{composer:}`.
+      // Sound keys still need a colon, so `{key C}` is not a second header key.
+      const colonForm = /^\s*\{\s*[a-zA-Z_]+\s*:/.test(l)
+      const ident = songIdentityMetaKey(d.name)
+      if (!colonForm && !ident) return
+      const canon = canonicalMetaKey(d.name) ?? ident
       if (!canon) return
-      const exact = (META_KEYS as readonly string[]).includes(k)
-      if (exact || meta[canon] === undefined) meta[canon] = v
+      const exact = (META_KEYS as readonly string[]).includes(d.name)
+      if (exact || meta[canon] === undefined) meta[canon] = d.value
     })
   return meta
 }
@@ -390,19 +400,36 @@ export function writeSongScopedMeta(source: string, patch: MetaPatch): string {
   return [header, tail].filter((s) => s.length > 0).join('\n')
 }
 
+/** A blank whose nearest neighbours are both sound keys — not lyric content. */
+function blankBetweenSoundKeys(lines: string[], index: number): boolean {
+  if ((lines[index] ?? '').trim() !== '') return false
+  let prev = index - 1
+  while (prev >= 0 && (lines[prev] ?? '').trim() === '') prev--
+  let next = index + 1
+  while (next < lines.length && (lines[next] ?? '').trim() === '') next++
+  if (prev < 0 || next >= lines.length) return false
+  const before = dirOf(lines[prev] ?? '')
+  const after = dirOf(lines[next] ?? '')
+  return !!(before && chartSoundKey(before.name) && after && chartSoundKey(after.name))
+}
+
 function rewriteChartInner(inner: string, patch: MetaPatch): string {
+  const lines = inner.split('\n')
   const labelLines: string[] = []
   const rest: string[] = []
-  for (const line of inner.split('\n')) {
+  for (let i = 0; i < lines.length; i++) {
+    const line = lines[i] ?? ''
     const d = dirOf(line)
     if (d?.name === 'x_chart_label') {
       labelLines.push(line)
       continue
     }
     if (d && chartSoundKey(d.name)) continue
+    // A blank under the label is content. A blank between sound keys is not:
+    // rewriting those keys as one block must not drop it onto the lyric.
+    if (blankBetweenSoundKeys(lines, i)) continue
     rest.push(line)
   }
-  // A blank under the label is content. Clearing a sound key must not eat it.
   const next = applyPatch(readKeyed(inner, 'chart'), patch, CHART_SOUND_KEYS)
   const head = formatKeys(CHART_SOUND_KEYS, next)
   return [labelLines.join('\n'), head, rest.join('\n')].filter((s) => s.length > 0).join('\n')
diff --git a/src/core/parse.ts b/src/core/parse.ts
index 6bc0256..e4db675 100644
--- a/src/core/parse.ts
+++ b/src/core/parse.ts
@@ -158,8 +158,10 @@ function parseRaw(src: string): {
       else if (k === 'duration') meta.duration = v
       else if (k === 'capo') meta.capo = Number(v) || 0
       else if (k === 'transpose') {
+        // A later `{transpose:0}` or empty `{transpose:}` clears the earlier offset.
         const n = Number(v)
-        if (Number.isFinite(n) && n !== 0) meta.transpose = n
+        if (n === 0) meta.transpose = 0
+        else if (Number.isFinite(n)) meta.transpose = n
       }
       continue
     }
diff --git a/tests/core/audio-url.test.ts b/tests/core/audio-url.test.ts
index 53ccd6f..6d1fa6c 100644
--- a/tests/core/audio-url.test.ts
+++ b/tests/core/audio-url.test.ts
@@ -256,6 +256,37 @@ describe('envelope audio clear', () => {
     expect(audioTracksOf(next).sung).toBeNull()
   })
 
+  it('setAudioUrl(null) does not move a blank between sound keys onto the lyric', () => {
+    const src = [
+      '{title:Uma}',
+      '{x_chart_default:oferta}',
+      '',
+      '{start_of_x_chart:completa}',
+      '{x_chart_label:Completa}',
+      '{key:G}',
+      '',
+      '{x_audio_sung:https://cdn.example/g.m4a}',
+      '[G]linha completa',
+      '{end_of_x_chart}',
+      '',
+      '{start_of_x_chart:oferta}',
+      '{x_chart_label:Oferta}',
+      '{key:C}',
+      '',
+      '{x_audio_sung:https://cdn.example/c.m4a}',
+      '[C]linha oferta',
+      '{end_of_x_chart}',
+      '',
+    ].join('\n')
+    const next = setAudioUrl(src, null)
+    const oferta = chartBlock(next, 'oferta')
+    expect(oferta).toContain('{key:C}\n[C]linha oferta')
+    expect(oferta).not.toContain('x_audio_sung')
+    expect(oferta).not.toContain('cdn.example/c.m4a')
+    expect(chartBlock(next, 'completa')).toBe(chartBlock(src, 'completa'))
+    expect(audioTracksOf(next).sung).toBeNull()
+  })
+
   it('setRehearsalAudio nulls clear sung, playback and art on the default chart only', () => {
     const next = setRehearsalAudio(ENVELOPE_AUDIO, { sung: null, playback: null, art: null })
     const oferta = chartBlock(next, 'oferta')
diff --git a/tests/core/charts-envelope.test.ts b/tests/core/charts-envelope.test.ts
index 14d6d38..2daac7e 100644
--- a/tests/core/charts-envelope.test.ts
+++ b/tests/core/charts-envelope.test.ts
@@ -609,6 +609,27 @@ describe('chart document edits and x_chart_default', () => {
     expect(chartBlock(lyric, 'completa')).toContain('[G]corpo da completa')
   })
 
+  it('reads raw song identity that has no colon, and {composer:} as artist', () => {
+    const colonless = commitChartDocument(
+      TWO_CHART_SOURCE,
+      '{title Uma}\n{artist Alguém}\n{key:C}\n[C]corpo',
+    )
+    expect(readMeta(colonless).title).toBe('Uma')
+    expect(readMeta(colonless).artist).toBe('Alguém')
+    expect(colonless).toContain('{title Uma}')
+    expect(colonless).toContain('{artist Alguém}')
+    expect(chartBlock(colonless, 'completa')).toBe(chartBlock(TWO_CHART_SOURCE, 'completa'))
+
+    const composed = commitChartDocument(
+      TWO_CHART_SOURCE,
+      '{title:Uma}\n{composer:Alguém}\n{key:C}\n[C]corpo',
+    )
+    expect(readMeta(composed).title).toBe('Uma')
+    expect(readMeta(composed).artist).toBe('Alguém')
+    expect(composed).toContain('{composer:Alguém}')
+    expect(chartBlock(composed, 'completa')).toBe(chartBlock(TWO_CHART_SOURCE, 'completa'))
+  })
+
   it('counts colonless {transpose} and {key} the way parse does', () => {
     expect(storedTransposeSemis('{key:C}\n{transpose 2}\n[C]uma')).toBe(2)
     expect(storedTransposeSemis('{key C}\n{transpose:2}\n[C]uma')).toBe(2)
@@ -633,6 +654,49 @@ describe('chart document edits and x_chart_default', () => {
     expect(parse(src).meta.key).toBe('C')
     expect(parse(src).meta.transpose).toBe(2)
   })
+
+  it('a later zero or empty {transpose} clears the earlier offset', () => {
+    const zero = '{key:C}\n{transpose:2}\n{transpose:0}\n[C]uma'
+    const empty = '{key:C}\n{transpose:2}\n{transpose:}\n[C]uma'
+    expect(storedTransposeSemis(zero)).toBe(0)
+    expect(parse(zero).meta.transpose).toBe(0)
+    expect(storedTransposeSemis(empty)).toBe(0)
+    expect(parse(empty).meta.transpose).toBe(0)
+
+    const siblingKeeps = `{title:Uma}
+{x_chart_default:oferta}
+{start_of_x_chart:completa}
+{key:G}
+{transpose:0}
+[G]completa [G]mais [G]ainda
+{end_of_x_chart}
+{start_of_x_chart:oferta}
+{key:C}
+{transpose:2}
+[C]oferta
+{end_of_x_chart}
+`
+    expect(storedTransposeSemis(siblingKeeps)).toBe(2)
+    expect(parse(siblingKeeps).meta.transpose).toBe(2)
+
+    const siblingDoesNotInvent = `{title:Uma}
+{x_chart_default:oferta}
+{start_of_x_chart:completa}
+{key:G}
+{transpose:2}
+[G]completa [G]mais [G]ainda
+{end_of_x_chart}
+{start_of_x_chart:oferta}
+{key:C}
+{transpose:2}
+{transpose:0}
+[C]oferta
+{end_of_x_chart}
+`
+    expect(storedTransposeSemis(siblingDoesNotInvent)).toBe(0)
+    expect(parse(siblingDoesNotInvent).meta.transpose).toBe(0)
+    expect(parse(siblingDoesNotInvent, { chartId: 'completa' }).meta.transpose).toBe(2)
+  })
 })
 
 function mustStrum(raw: string) {

---END DIFF---

### Modified files (full content for context)

### src/core/charts.ts lines 121-175

```ts
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
139|/** Song identity `readMeta` can store. `{composer:}` is artist; `{x_chart_default}` is not. */
140|function songIdentityMetaKey(name: string): MetaKey | null {
141|  const song = songMetaKey(name)
142|  if (!song || song === 'x_chart_default') return null
143|  return (META_KEYS as readonly string[]).includes(song) ? (song as MetaKey) : null
144|}
145|
146|function readMetaLines(source: string): ChartMeta {
147|  const meta: ChartMeta = {}
148|  String(source ?? '')
149|    .split('\n')
150|    .forEach((l) => {
151|      const d = dirOf(l)
152|      if (!d) return
153|      // Raw song identity may omit the colon (`{title Uma}`) or use `{composer:}`.
154|      // Sound keys still need a colon, so `{key C}` is not a second header key.
155|      const colonForm = /^\s*\{\s*[a-zA-Z_]+\s*:/.test(l)
156|      const ident = songIdentityMetaKey(d.name)
157|      if (!colonForm && !ident) return
158|      const canon = canonicalMetaKey(d.name) ?? ident
159|      if (!canon) return
160|      const exact = (META_KEYS as readonly string[]).includes(d.name)
161|      if (exact || meta[canon] === undefined) meta[canon] = d.value
162|    })
163|  return meta
164|}
165|
166|/**
167| * No envelope: the whole file, same as before.
168| * With `{start_of_x_chart}`: song identity plus the default chart only.
169| * A later sibling `{key:}` or audio line must not win.
170| */
171|export function readMeta(source: string): ChartMeta {
172|  const text = String(source ?? '')
173|  if (!splitCho(text).hasEnvelope) return readMetaLines(text)
174|  return readMetaLines(chartDocument(text))
175|}
```

### src/core/charts.ts lines 400-440

```ts
400|  return [header, tail].filter((s) => s.length > 0).join('\n')
401|}
402|
403|/** A blank whose nearest neighbours are both sound keys — not lyric content. */
404|function blankBetweenSoundKeys(lines: string[], index: number): boolean {
405|  if ((lines[index] ?? '').trim() !== '') return false
406|  let prev = index - 1
407|  while (prev >= 0 && (lines[prev] ?? '').trim() === '') prev--
408|  let next = index + 1
409|  while (next < lines.length && (lines[next] ?? '').trim() === '') next++
410|  if (prev < 0 || next >= lines.length) return false
411|  const before = dirOf(lines[prev] ?? '')
412|  const after = dirOf(lines[next] ?? '')
413|  return !!(before && chartSoundKey(before.name) && after && chartSoundKey(after.name))
414|}
415|
416|function rewriteChartInner(inner: string, patch: MetaPatch): string {
417|  const lines = inner.split('\n')
418|  const labelLines: string[] = []
419|  const rest: string[] = []
420|  for (let i = 0; i < lines.length; i++) {
421|    const line = lines[i] ?? ''
422|    const d = dirOf(line)
423|    if (d?.name === 'x_chart_label') {
424|      labelLines.push(line)
425|      continue
426|    }
427|    if (d && chartSoundKey(d.name)) continue
428|    // A blank under the label is content. A blank between sound keys is not:
429|    // rewriting those keys as one block must not drop it onto the lyric.
430|    if (blankBetweenSoundKeys(lines, i)) continue
431|    rest.push(line)
432|  }
433|  const next = applyPatch(readKeyed(inner, 'chart'), patch, CHART_SOUND_KEYS)
434|  const head = formatKeys(CHART_SOUND_KEYS, next)
435|  return [labelLines.join('\n'), head, rest.join('\n')].filter((s) => s.length > 0).join('\n')
436|}
437|
438|/** Rewrite sound keys inside one named chart; sibling blocks stay put. */
439|export function writeChartScopedMeta(source: string, patch: MetaPatch, chartId?: string): string {
440|  const split = splitCho(source)
```

### src/core/parse.ts lines 145-170

```ts
145|        continue
146|      }
147|      if (k === 'c' || k === 'comment') {
148|        const inner = v.match(/^\((.*)\)$/)
149|        lines.push({ kind: 'comment', text: (inner?.[1] ?? v).trim(), li0: li, li1: li })
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
161|        // A later `{transpose:0}` or empty `{transpose:}` clears the earlier offset.
162|        const n = Number(v)
163|        if (n === 0) meta.transpose = 0
164|        else if (Number.isFinite(n)) meta.transpose = n
165|      }
166|      continue
167|    }
168|
169|    if (!raw.trim()) {
170|      lines.push({ kind: 'empty', li0: li, li1: li })
```

### src/core/import-chordpro.ts lines 495-510

```ts
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
510|
```


### Callers / dependents (read-only context)

### Call sites

- `storedTransposeSemis` reads `parse(source).meta.transpose`: src/core/import-chordpro.ts:500-508
- `readMeta` on an envelope calls `readMetaLines(chartDocument(text))`: src/core/charts.ts readMeta
- `setAudioUrl(null)` writes an empty sound key through `writeMeta`: src/core/audio-url.ts:67-70
- `ChordproViewer` adds `storedTransposeSemis(chartSource)` into the reading shift: src/vue/ChordproViewer.vue:797-798


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
3. IMPACT — concrete consequence
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
- Files other than src/core/charts.ts, src/core/parse.ts, tests/core/audio-url.test.ts, tests/core/charts-envelope.test.ts, and the direct dependents quoted below
- Dependency manifests and documentation


## Out of scope for this review

- Style, naming, formatting unless they hide substantive issues
- Items in the Non-goals list above
- Files not in the diff or its direct dependents

## Artifacts to review

### Diff
Ref: 24b96e9..4a657a3

---BEGIN DIFF---
diff --git a/src/core/charts.ts b/src/core/charts.ts
index b6f05a8..57974b2 100644
--- a/src/core/charts.ts
+++ b/src/core/charts.ts
@@ -136,19 +136,29 @@ export function canonicalMetaKey(k: string): MetaKey | null {
   return META_ALIAS[lower] ?? null
 }
 
+/** Song identity `readMeta` can store. `{composer:}` is artist; `{x_chart_default}` is not. */
+function songIdentityMetaKey(name: string): MetaKey | null {
+  const song = songMetaKey(name)
+  if (!song || song === 'x_chart_default') return null
+  return (META_KEYS as readonly string[]).includes(song) ? (song as MetaKey) : null
+}
+
 function readMetaLines(source: string): ChartMeta {
   const meta: ChartMeta = {}
   String(source ?? '')
     .split('\n')
     .forEach((l) => {
-      const d = l.match(/^\s*\{\s*([a-zA-Z_]+)\s*:\s*([^}]*)\}\s*$/)
+      const d = dirOf(l)
       if (!d) return
-      const k = (d[1] ?? '').toLowerCase()
-      const v = (d[2] ?? '').trim()
-      const canon = canonicalMetaKey(k)
+      // Raw song identity may omit the colon (`{title Uma}`) or use `{composer:}`.
+      // Sound keys still need a colon, so `{key C}` is not a second header key.
+      const colonForm = /^\s*\{\s*[a-zA-Z_]+\s*:/.test(l)
+      const ident = songIdentityMetaKey(d.name)
+      if (!colonForm && !ident) return
+      const canon = canonicalMetaKey(d.name) ?? ident
       if (!canon) return
-      const exact = (META_KEYS as readonly string[]).includes(k)
-      if (exact || meta[canon] === undefined) meta[canon] = v
+      const exact = (META_KEYS as readonly string[]).includes(d.name)
+      if (exact || meta[canon] === undefined) meta[canon] = d.value
     })
   return meta
 }
@@ -390,19 +400,36 @@ export function writeSongScopedMeta(source: string, patch: MetaPatch): string {
   return [header, tail].filter((s) => s.length > 0).join('\n')
 }
 
+/** A blank whose nearest neighbours are both sound keys — not lyric content. */
+function blankBetweenSoundKeys(lines: string[], index: number): boolean {
+  if ((lines[index] ?? '').trim() !== '') return false
+  let prev = index - 1
+  while (prev >= 0 && (lines[prev] ?? '').trim() === '') prev--
+  let next = index + 1
+  while (next < lines.length && (lines[next] ?? '').trim() === '') next++
+  if (prev < 0 || next >= lines.length) return false
+  const before = dirOf(lines[prev] ?? '')
+  const after = dirOf(lines[next] ?? '')
+  return !!(before && chartSoundKey(before.name) && after && chartSoundKey(after.name))
+}
+
 function rewriteChartInner(inner: string, patch: MetaPatch): string {
+  const lines = inner.split('\n')
   const labelLines: string[] = []
   const rest: string[] = []
-  for (const line of inner.split('\n')) {
+  for (let i = 0; i < lines.length; i++) {
+    const line = lines[i] ?? ''
     const d = dirOf(line)
     if (d?.name === 'x_chart_label') {
       labelLines.push(line)
       continue
     }
     if (d && chartSoundKey(d.name)) continue
+    // A blank under the label is content. A blank between sound keys is not:
+    // rewriting those keys as one block must not drop it onto the lyric.
+    if (blankBetweenSoundKeys(lines, i)) continue
     rest.push(line)
   }
-  // A blank under the label is content. Clearing a sound key must not eat it.
   const next = applyPatch(readKeyed(inner, 'chart'), patch, CHART_SOUND_KEYS)
   const head = formatKeys(CHART_SOUND_KEYS, next)
   return [labelLines.join('\n'), head, rest.join('\n')].filter((s) => s.length > 0).join('\n')
diff --git a/src/core/parse.ts b/src/core/parse.ts
index 6bc0256..e4db675 100644
--- a/src/core/parse.ts
+++ b/src/core/parse.ts
@@ -158,8 +158,10 @@ function parseRaw(src: string): {
       else if (k === 'duration') meta.duration = v
       else if (k === 'capo') meta.capo = Number(v) || 0
       else if (k === 'transpose') {
+        // A later `{transpose:0}` or empty `{transpose:}` clears the earlier offset.
         const n = Number(v)
-        if (Number.isFinite(n) && n !== 0) meta.transpose = n
+        if (n === 0) meta.transpose = 0
+        else if (Number.isFinite(n)) meta.transpose = n
       }
       continue
     }
diff --git a/tests/core/audio-url.test.ts b/tests/core/audio-url.test.ts
index 53ccd6f..6d1fa6c 100644
--- a/tests/core/audio-url.test.ts
+++ b/tests/core/audio-url.test.ts
@@ -256,6 +256,37 @@ describe('envelope audio clear', () => {
     expect(audioTracksOf(next).sung).toBeNull()
   })
 
+  it('setAudioUrl(null) does not move a blank between sound keys onto the lyric', () => {
+    const src = [
+      '{title:Uma}',
+      '{x_chart_default:oferta}',
+      '',
+      '{start_of_x_chart:completa}',
+      '{x_chart_label:Completa}',
+      '{key:G}',
+      '',
+      '{x_audio_sung:https://cdn.example/g.m4a}',
+      '[G]linha completa',
+      '{end_of_x_chart}',
+      '',
+      '{start_of_x_chart:oferta}',
+      '{x_chart_label:Oferta}',
+      '{key:C}',
+      '',
+      '{x_audio_sung:https://cdn.example/c.m4a}',
+      '[C]linha oferta',
+      '{end_of_x_chart}',
+      '',
+    ].join('\n')
+    const next = setAudioUrl(src, null)
+    const oferta = chartBlock(next, 'oferta')
+    expect(oferta).toContain('{key:C}\n[C]linha oferta')
+    expect(oferta).not.toContain('x_audio_sung')
+    expect(oferta).not.toContain('cdn.example/c.m4a')
+    expect(chartBlock(next, 'completa')).toBe(chartBlock(src, 'completa'))
+    expect(audioTracksOf(next).sung).toBeNull()
+  })
+
   it('setRehearsalAudio nulls clear sung, playback and art on the default chart only', () => {
     const next = setRehearsalAudio(ENVELOPE_AUDIO, { sung: null, playback: null, art: null })
     const oferta = chartBlock(next, 'oferta')
diff --git a/tests/core/charts-envelope.test.ts b/tests/core/charts-envelope.test.ts
index 14d6d38..2daac7e 100644
--- a/tests/core/charts-envelope.test.ts
+++ b/tests/core/charts-envelope.test.ts
@@ -609,6 +609,27 @@ describe('chart document edits and x_chart_default', () => {
     expect(chartBlock(lyric, 'completa')).toContain('[G]corpo da completa')
   })
 
+  it('reads raw song identity that has no colon, and {composer:} as artist', () => {
+    const colonless = commitChartDocument(
+      TWO_CHART_SOURCE,
+      '{title Uma}\n{artist Alguém}\n{key:C}\n[C]corpo',
+    )
+    expect(readMeta(colonless).title).toBe('Uma')
+    expect(readMeta(colonless).artist).toBe('Alguém')
+    expect(colonless).toContain('{title Uma}')
+    expect(colonless).toContain('{artist Alguém}')
+    expect(chartBlock(colonless, 'completa')).toBe(chartBlock(TWO_CHART_SOURCE, 'completa'))
+
+    const composed = commitChartDocument(
+      TWO_CHART_SOURCE,
+      '{title:Uma}\n{composer:Alguém}\n{key:C}\n[C]corpo',
+    )
+    expect(readMeta(composed).title).toBe('Uma')
+    expect(readMeta(composed).artist).toBe('Alguém')
+    expect(composed).toContain('{composer:Alguém}')
+    expect(chartBlock(composed, 'completa')).toBe(chartBlock(TWO_CHART_SOURCE, 'completa'))
+  })
+
   it('counts colonless {transpose} and {key} the way parse does', () => {
     expect(storedTransposeSemis('{key:C}\n{transpose 2}\n[C]uma')).toBe(2)
     expect(storedTransposeSemis('{key C}\n{transpose:2}\n[C]uma')).toBe(2)
@@ -633,6 +654,49 @@ describe('chart document edits and x_chart_default', () => {
     expect(parse(src).meta.key).toBe('C')
     expect(parse(src).meta.transpose).toBe(2)
   })
+
+  it('a later zero or empty {transpose} clears the earlier offset', () => {
+    const zero = '{key:C}\n{transpose:2}\n{transpose:0}\n[C]uma'
+    const empty = '{key:C}\n{transpose:2}\n{transpose:}\n[C]uma'
+    expect(storedTransposeSemis(zero)).toBe(0)
+    expect(parse(zero).meta.transpose).toBe(0)
+    expect(storedTransposeSemis(empty)).toBe(0)
+    expect(parse(empty).meta.transpose).toBe(0)
+
+    const siblingKeeps = `{title:Uma}
+{x_chart_default:oferta}
+{start_of_x_chart:completa}
+{key:G}
+{transpose:0}
+[G]completa [G]mais [G]ainda
+{end_of_x_chart}
+{start_of_x_chart:oferta}
+{key:C}
+{transpose:2}
+[C]oferta
+{end_of_x_chart}
+`
+    expect(storedTransposeSemis(siblingKeeps)).toBe(2)
+    expect(parse(siblingKeeps).meta.transpose).toBe(2)
+
+    const siblingDoesNotInvent = `{title:Uma}
+{x_chart_default:oferta}
+{start_of_x_chart:completa}
+{key:G}
+{transpose:2}
+[G]completa [G]mais [G]ainda
+{end_of_x_chart}
+{start_of_x_chart:oferta}
+{key:C}
+{transpose:2}
+{transpose:0}
+[C]oferta
+{end_of_x_chart}
+`
+    expect(storedTransposeSemis(siblingDoesNotInvent)).toBe(0)
+    expect(parse(siblingDoesNotInvent).meta.transpose).toBe(0)
+    expect(parse(siblingDoesNotInvent, { chartId: 'completa' }).meta.transpose).toBe(2)
+  })
 })
 
 function mustStrum(raw: string) {

---END DIFF---

### Modified files (full content for context)

### src/core/charts.ts lines 121-175

```ts
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
139|/** Song identity `readMeta` can store. `{composer:}` is artist; `{x_chart_default}` is not. */
140|function songIdentityMetaKey(name: string): MetaKey | null {
141|  const song = songMetaKey(name)
142|  if (!song || song === 'x_chart_default') return null
143|  return (META_KEYS as readonly string[]).includes(song) ? (song as MetaKey) : null
144|}
145|
146|function readMetaLines(source: string): ChartMeta {
147|  const meta: ChartMeta = {}
148|  String(source ?? '')
149|    .split('\n')
150|    .forEach((l) => {
151|      const d = dirOf(l)
152|      if (!d) return
153|      // Raw song identity may omit the colon (`{title Uma}`) or use `{composer:}`.
154|      // Sound keys still need a colon, so `{key C}` is not a second header key.
155|      const colonForm = /^\s*\{\s*[a-zA-Z_]+\s*:/.test(l)
156|      const ident = songIdentityMetaKey(d.name)
157|      if (!colonForm && !ident) return
158|      const canon = canonicalMetaKey(d.name) ?? ident
159|      if (!canon) return
160|      const exact = (META_KEYS as readonly string[]).includes(d.name)
161|      if (exact || meta[canon] === undefined) meta[canon] = d.value
162|    })
163|  return meta
164|}
165|
166|/**
167| * No envelope: the whole file, same as before.
168| * With `{start_of_x_chart}`: song identity plus the default chart only.
169| * A later sibling `{key:}` or audio line must not win.
170| */
171|export function readMeta(source: string): ChartMeta {
172|  const text = String(source ?? '')
173|  if (!splitCho(text).hasEnvelope) return readMetaLines(text)
174|  return readMetaLines(chartDocument(text))
175|}
```

### src/core/charts.ts lines 400-440

```ts
400|  return [header, tail].filter((s) => s.length > 0).join('\n')
401|}
402|
403|/** A blank whose nearest neighbours are both sound keys — not lyric content. */
404|function blankBetweenSoundKeys(lines: string[], index: number): boolean {
405|  if ((lines[index] ?? '').trim() !== '') return false
406|  let prev = index - 1
407|  while (prev >= 0 && (lines[prev] ?? '').trim() === '') prev--
408|  let next = index + 1
409|  while (next < lines.length && (lines[next] ?? '').trim() === '') next++
410|  if (prev < 0 || next >= lines.length) return false
411|  const before = dirOf(lines[prev] ?? '')
412|  const after = dirOf(lines[next] ?? '')
413|  return !!(before && chartSoundKey(before.name) && after && chartSoundKey(after.name))
414|}
415|
416|function rewriteChartInner(inner: string, patch: MetaPatch): string {
417|  const lines = inner.split('\n')
418|  const labelLines: string[] = []
419|  const rest: string[] = []
420|  for (let i = 0; i < lines.length; i++) {
421|    const line = lines[i] ?? ''
422|    const d = dirOf(line)
423|    if (d?.name === 'x_chart_label') {
424|      labelLines.push(line)
425|      continue
426|    }
427|    if (d && chartSoundKey(d.name)) continue
428|    // A blank under the label is content. A blank between sound keys is not:
429|    // rewriting those keys as one block must not drop it onto the lyric.
430|    if (blankBetweenSoundKeys(lines, i)) continue
431|    rest.push(line)
432|  }
433|  const next = applyPatch(readKeyed(inner, 'chart'), patch, CHART_SOUND_KEYS)
434|  const head = formatKeys(CHART_SOUND_KEYS, next)
435|  return [labelLines.join('\n'), head, rest.join('\n')].filter((s) => s.length > 0).join('\n')
436|}
437|
438|/** Rewrite sound keys inside one named chart; sibling blocks stay put. */
439|export function writeChartScopedMeta(source: string, patch: MetaPatch, chartId?: string): string {
440|  const split = splitCho(source)
```

### src/core/parse.ts lines 145-170

```ts
145|        continue
146|      }
147|      if (k === 'c' || k === 'comment') {
148|        const inner = v.match(/^\((.*)\)$/)
149|        lines.push({ kind: 'comment', text: (inner?.[1] ?? v).trim(), li0: li, li1: li })
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
161|        // A later `{transpose:0}` or empty `{transpose:}` clears the earlier offset.
162|        const n = Number(v)
163|        if (n === 0) meta.transpose = 0
164|        else if (Number.isFinite(n)) meta.transpose = n
165|      }
166|      continue
167|    }
168|
169|    if (!raw.trim()) {
170|      lines.push({ kind: 'empty', li0: li, li1: li })
```

### src/core/import-chordpro.ts lines 495-510

```ts
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
510|
```


### Callers / dependents (read-only context)

### Call sites

- `storedTransposeSemis` reads `parse(source).meta.transpose`: src/core/import-chordpro.ts:500-508
- `readMeta` on an envelope calls `readMetaLines(chartDocument(text))`: src/core/charts.ts readMeta
- `setAudioUrl(null)` writes an empty sound key through `writeMeta`: src/core/audio-url.ts:67-70
- `ChordproViewer` adds `storedTransposeSemis(chartSource)` into the reading shift: src/vue/ChordproViewer.vue:797-798


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
3. IMPACT — concrete consequence
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

- src/core/charts.ts:81-87 META_ALIAS maps t, st, x_origem, x_audio, x_audio_cantado. It does not map composer. Verify by reading META_ALIAS.
- src/core/charts.ts:342-357 writeMetaOneHeader keeps a line unless it matches /^\s*\{\s*([a-zA-Z_]+)\s*:\s*[^}]*\}\s*$/ and canonicalMetaKey(name) is non-null. Verify by reading the filter.
- src/core/charts.ts:383-392 writeSongScopedMeta on a file with no envelope calls writeFlatScoped(source, patch, SONG_META_KEYS). Verify by reading the function.
- src/core/charts.ts:146-163 readMetaLines uses dirOf (optional colon) and accepts a colonless line when songIdentityMetaKey(name) is non-null. Verify by reading the function.
- src/core/charts.ts:13-20 SONG_META_KEYS is title, subtitle, artist, x_source, x_youtube, x_chart_default. src/core/charts.ts:43-48 SONG_ALIAS maps composer to artist. Verify by reading both.
- src/core/parse.ts:152-154 assigns meta.title from title or t, and meta.artist from artist or composer, on each matching directive. Verify by reading parseRaw.
- src/core/charts.ts:404-414 blankBetweenSoundKeys is true when the nearest non-blank line before and after a blank are both chart sound keys, at any index in the chart inner. Verify by reading the function.
- src/core/parse.ts:160-164 sets meta.transpose to 0 when Number(v) === 0, and Number('') === 0. Verify by reading the branch and evaluating Number('').
- src/core has no import from vue. Verify: rg "from ['\"]vue" src/core returns no matches.


## Pass 1 (blind) findings

The following findings were produced by your previous review WITHOUT the
constraints above. Re-evaluate each against the constraints.

---BEGIN PASS 1 OUTPUT---
---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
reviewer: gpt-6
pass: blind
schema_version: "1.0"
---

## Summary

Three regressions were reproduced against `24b96e9`: metadata reads revert a patched colonless title, audio updates remove spacing inside lyrics, and metadata writes become quadratic on consecutive blank lines. Verification used in-memory execution of the source and baseline; the full test suite was not run.

## Findings

### F-001 [major] Correctness — src/core/charts.ts:155-161

**Evidence:**
```ts
      const colonForm = /^\s*\{\s*[a-zA-Z_]+\s*:/.test(l)
      const ident = songIdentityMetaKey(d.name)
      if (!colonForm && !ident) return
      const canon = canonicalMetaKey(d.name) ?? ident
      if (!canon) return
      const exact = (META_KEYS as readonly string[]).includes(d.name)
      if (exact || meta[canon] === undefined) meta[canon] = d.value
```

**Claim:** Updating a flat document containing `{title Uma}` through `writeSongScopedMeta(source, { title: 'Nova' })` now makes `readMeta` return `Uma`, because the writer retains the colonless directive after the generated `{title:Nova}` and the expanded reader lets it overwrite the patch.

**Impact:** Metadata consumers display the old title after an edit, and subsequent read-modify-write operations propagate that stale value. The same reproduction returned `Nova` before this change.

**Recommendation:** Make the flat writer remove or replace every identity syntax accepted by the reader, including colonless directives and `composer`; add read-write-read tests for replacement and clearing.

**Confidence:** high

---

### F-002 [major] Data integrity — src/core/charts.ts:430

**Evidence:**
```ts
    if (blankBetweenSoundKeys(lines, i)) continue
```

**Claim:** Clearing audio from a chart body containing `[C]corpo\n{tempo:80}\n\n{x_audio_sung:https://cdn.example/c.m4a}\n[C]corpo` deletes the separator between the lyric lines because this filter applies throughout the chart, including after lyrics have started.

**Impact:** An audio metadata edit changes the song’s visible layout and persists the lost spacing into its source. Parsing the reproduced output yields two adjacent lyric lines; the baseline preserved an empty line between them.

**Recommendation:** Restrict blank removal to the chart’s leading metadata block and preserve blanks within the body; add a regression test with sound directives surrounding a separator after a lyric line.

**Confidence:** high

---

### F-003 [major] Performance — src/core/charts.ts:406-409

**Evidence:**
```ts
  let prev = index - 1
  while (prev >= 0 && (lines[prev] ?? '').trim() === '') prev--
  let next = index + 1
  while (next < lines.length && (lines[next] ?? '').trim() === '') next++
```

**Claim:** A run of N blank lines causes Θ(N²) work during chart metadata updates because the helper rescans the run in both directions for every blank, even when neither boundary is a sound key.

**Impact:** Small whitespace-heavy inputs can stall synchronous editing operations. A chart with 20,000 trailing blank lines took approximately 1,033 ms to update versus 3 ms on the baseline; runs of 5,000 and 10,000 took approximately 63 ms and 249 ms, confirming quadratic scaling.

**Recommendation:** Process each blank run once, or precompute neighboring nonblank lines in linear passes; add a scaling regression check covering trailing blanks as well as blanks between sound keys.

**Confidence:** high

## Questions (non-findings)

## Out of scope
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

None.

## Self-review against code-quality gates

- G1 read-before-claim: N/A. No fix in this review.
- G2 soft-language: 0 occurrences.
- G3 anti-tautology: N/A.
- G4 fixture realism: N/A.
- G7 anti-premature-abstraction: N/A.
