---
date: 2026-09-24T11:33:25-0300
topic: diagramas-cifra-f2-fix9-codex
artifact: 008249e63eaa9d65a4a51c379b8540f07bd5ddd9..4e0e1e539848c973f1a68d938a72914f17ac9995
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

# Cross-Model Review — diagramas-cifra-f2-fix9-codex

## Pass 1 (blind)

---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
reviewer: gpt-6
pass: blind
schema_version: "1.0"
---

## Summary

Targeted execution against both revisions reproduced three regressions: extended relative keys transpose to incorrect notes, MIDI keys below 60 can be reinterpreted as relative intervals, and transposing MIDI keys above 60 discards octave information. The added tests do not cover these cases.

## Findings

### F-001 [major] Correctness — src/core/define.ts:201-207

**Evidence:**
```ts
function transposePianoKeys(def: ChordDefine, n: number, flats: boolean): number[] {
  const keys = def.keys ?? []
  if (keys.length > 0 && keys.every((k) => k >= 60)) {
    return keys.map((k) => 60 + mod12(k + n))
  }
  const midi = () => keys.map((k) => shiftKey(k, n))
  if (!keys.length || !keys.every(isPitchClass)) return midi()
```

**Claim:** Transposing the newly supported `{define: D9 keys 0 4 7 14}` by +2 produces E9 displaying F#–A#–C#–G# instead of E–G#–B–F#, because the presence of 14 bypasses sounding-class preservation and the shifted values are interpreted again relative to the renamed root.

**Impact:** Changing the song key produces a piano diagram inconsistent with its chord label; exported definitions retain the incorrect notes.

**Recommendation:** Apply sounding-class preservation and candidate readback validation to extended relative keys as well as 0–11 keys, and add a resolve/draw test after transposing the new D9 example.

**Confidence:** high

---

### F-002 [major] Backward compatibility — src/core/chord-dict.ts:158-163

**Evidence:**
```ts
  if (keys.length > 0 && keys.every((k) => k >= 60)) return keys.map((k) => mod12(k))
  const { pcs, intervals, absSet, relSet, absScore, relScore } = scorePianoReadings(keys, rootPc, quality)
  const absolute = () => [...pcs]
  const relative = () => pcs.map((k) => mod12(rootPc + k))
  if (absScore > relScore) return absolute()
  if (relScore > absScore) return relative()
```

**Claim:** `{define: D keys 50 52}`, previously displayed as D–E, now displays E–F# because MIDI values below 60 enter the heuristic and its characteristic-tone tiebreaker selects the relative reading.

**Impact:** Existing absolute MIDI overrides display different pitches without any source change; this also breaks an ordinary +2 transposition of `{define: C keys 48 50}`, which generates exactly this definition.

**Recommendation:** Preserve an unambiguous absolute interpretation for supported MIDI input separately from extended relative intervals, and test both direct resolution and transposition of MIDI definitions below 60.

**Confidence:** high

---

### F-003 [major] Data integrity — src/core/define.ts:203-204

**Evidence:**
```ts
  if (keys.length > 0 && keys.every((k) => k >= 60)) {
    return keys.map((k) => 60 + mod12(k + n))
```

**Claim:** Transposing `{define: C keys 60 64 79}` by +2 now stores `[62, 66, 69]` instead of `[62, 66, 81]`, because modulo normalization collapses every MIDI note into the same octave.

**Impact:** Transposed CHO exports lose the original register and voicing spacing; transposing back produces `[60, 64, 67]`, permanently losing the original 79 even though the pitch-class diagram conceals the loss.

**Recommendation:** Distinguish generated absolute pitch-class markers from imported MIDI notes and preserve `key + n` for MIDI data; add serialization and inverse-transposition tests using a voicing spanning multiple octaves.

**Confidence:** high

## Questions (non-findings)

## Out of scope

- Vue single-file components, colors, fonts, and modal layout.
- Auto-scroll timing.
- Guitar and ukulele fret dictionary rows.

## Pass 2 (informed)

---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 3, minor: 0, nit: 0}
reviewer: gpt-6
pass: informed
schema_version: "1.0"
---

## Summary

All three blind findings remain major. Targeted execution against both revisions confirmed incorrect transposition of extended relative keys, reinterpretation of existing MIDI keys below 60, and loss of octave information in exported MIDI definitions.

The existing `[48, 52, 55]` test case retains its expected behavior; it does not cover the failing `[48, 50]` case. No additional findings emerged from the constraints.

## Findings

### F-001 [major] Correctness — src/core/define.ts:201-207

**Evidence:**
```ts
function transposePianoKeys(def: ChordDefine, n: number, flats: boolean): number[] {
  const keys = def.keys ?? []
  if (keys.length > 0 && keys.every((k) => k >= 60)) {
    return keys.map((k) => 60 + mod12(k + n))
  }
  const midi = () => keys.map((k) => shiftKey(k, n))
  if (!keys.length || !keys.every(isPitchClass)) return midi()
```

**Claim:** Transposing `{define: D9 keys 0 4 7 14}` by +2 stores `[2, 6, 9, 16]` and displays F#–A#–C#–G# instead of E–G#–B–F#, because 14 bypasses sounding-class preservation and the shifted values are interpreted relative to the renamed root.

**Impact:** Changing the song key produces incorrect piano diagrams, and exported definitions reproduce those incorrect notes when reopened.

**Recommendation:** Apply sounding-class preservation and candidate readback validation to extended relative keys, including 14 and 17; add a transpose→resolve→draw regression test for the new D9 example.

**Confidence:** high

---

### F-002 [major] Backward compatibility — src/core/chord-dict.ts:158-163

**Evidence:**
```ts
  if (keys.length > 0 && keys.every((k) => k >= 60)) return keys.map((k) => mod12(k))
  const { pcs, intervals, absSet, relSet, absScore, relScore } = scorePianoReadings(keys, rootPc, quality)
  const absolute = () => [...pcs]
  const relative = () => pcs.map((k) => mod12(rootPc + k))
  if (absScore > relScore) return absolute()
  if (relScore > absScore) return relative()
```

**Claim:** `{define: D keys 50 52}`, previously displayed as D–E, now displays E–F# because MIDI values below 60 enter the heuristic and its characteristic-tone tiebreaker selects the relative reading.

**Impact:** Existing absolute MIDI overrides display different pitches without source changes; transposing `{define: C keys 48 50}` by +2 also generates this incorrect diagram.

**Recommendation:** Preserve absolute MIDI interpretation separately from extended relative intervals, and test direct resolution and transposition of `[48, 50]` alongside the existing `[48, 52, 55]` case.

**Confidence:** high

---

### F-003 [major] Data integrity — src/core/define.ts:203-204

**Evidence:**
```ts
  if (keys.length > 0 && keys.every((k) => k >= 60)) {
    return keys.map((k) => 60 + mod12(k + n))
```

**Claim:** Transposing `{define: C keys 60 64 79}` by +2 stores `[62, 66, 69]` instead of `[62, 66, 81]`, because modulo normalization collapses all MIDI notes into one octave.

**Impact:** CHO exports lose register and voicing spacing; transposing the result back yields `[60, 64, 67]`, so the exported data cannot recover the original 79.

**Recommendation:** Distinguish generated absolute pitch-class markers from imported MIDI notes, preserve `key + n` for MIDI data, and add export and inverse-transposition tests spanning multiple octaves.

**Confidence:** high

## Questions (non-findings)

## Out of scope

- Vue single-file components.
- Color, font, and modal layout.
- Auto-scroll timing.
- Guitar and ukulele fret dictionary rows.

## Pass 2 reconciliation

### Dropped from blind pass

- _(none)_

### Maintained

- F-001-blind → F-001-final [major] — same; the confirmed extended intervals 14 and 17 enter the heuristic during resolution but bypass sounding-class preservation during transposition.
- F-002-blind → F-002-final [major] — same; the baseline’s unconditional absolute reading confirms the regression, and the existing `[48, 52, 55]` test does not cover `[48, 50]`.
- F-003-blind → F-003-final [major] — same; none of the constraints excludes MIDI octave preservation, and execution confirms information loss through export and inverse transposition.

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

- Vue single-file components
- Color, font, and modal layout
- Auto-scroll timing
- Guitar and ukulele fret dictionary rows

## Out of scope for this review

- Style, naming, formatting unless they hide substantive issues
- Items in the Non-goals list above
- Files not in the diff or its direct dependents

## Artifacts to review

### Diff
Ref: 008249e63eaa9d65a4a51c379b8540f07bd5ddd9..4e0e1e539848c973f1a68d938a72914f17ac9995

---BEGIN DIFF---
diff --git a/src/core/chord-dict.ts b/src/core/chord-dict.ts
index 66f43c4..3e1c511 100644
--- a/src/core/chord-dict.ts
+++ b/src/core/chord-dict.ts
@@ -144,7 +144,8 @@ function scorePianoReadings(keys: readonly number[], rootPc: number, quality: st
 
 /**
  * Sounding pitch classes of the one piano reading, in key order.
- * A key outside 0–11 is already absolute: return mod 12 and skip the reading.
+ * Absolute marker: every key is >= 60. Only then return mod 12 and skip
+ * the reading. A 14 or 17 beside 0–11, or 48 52 55, stays on the heuristic.
  * Absolute: the stored classes. Relative: `(root + key) % 12`.
  * Draw stores those classes as intervals from the root.
  */
@@ -154,7 +155,7 @@ export function pianoSoundingPitchClasses(
   quality: string,
   bassPc: number | null = null,
 ): number[] {
-  if (keys.some((k) => k < 0 || k > 11)) return keys.map((k) => mod12(k))
+  if (keys.length > 0 && keys.every((k) => k >= 60)) return keys.map((k) => mod12(k))
   const { pcs, intervals, absSet, relSet, absScore, relScore } = scorePianoReadings(keys, rootPc, quality)
   const absolute = () => [...pcs]
   const relative = () => pcs.map((k) => mod12(rootPc + k))
diff --git a/src/core/define.ts b/src/core/define.ts
index add8b3d..7082830 100644
--- a/src/core/define.ts
+++ b/src/core/define.ts
@@ -195,10 +195,14 @@ function sameOrder(a: readonly number[], b: readonly number[]): boolean {
  * 0–11 keys: shift the draw's sounding classes, then keep the absolute list
  * or the relative list that the renamed chord reads back as that sequence.
  * When neither candidate reads that sequence, store 60 + pc. Do not throw.
- * A key outside 0–11 stays MIDI: add n, no wrap.
+ * Keys that are all >= 60 add n, then store 60 + (result mod 12).
+ * Any other key outside 0–11 adds n and does not wrap.
  */
 function transposePianoKeys(def: ChordDefine, n: number, flats: boolean): number[] {
   const keys = def.keys ?? []
+  if (keys.length > 0 && keys.every((k) => k >= 60)) {
+    return keys.map((k) => 60 + mod12(k + n))
+  }
   const midi = () => keys.map((k) => shiftKey(k, n))
   if (!keys.length || !keys.every(isPitchClass)) return midi()
   const parsed = parseChordToken(def.name)
@@ -227,8 +231,8 @@ function transposePianoKeys(def: ChordDefine, n: number, flats: boolean): number
  * Guitar/ukulele: bump `baseFret` when every slot is >0 or `x`; drop if any
  * string is open (fret 0) or the new base would fall below 1. Piano keys
  * inside 0–11 are stored so the renamed chord reads the shifted sounding
- * classes, or as 60 + pc when neither 0–11 candidate does. MIDI keys add n
- * and do not wrap.
+ * classes, or as 60 + pc when neither 0–11 candidate does. Keys that are
+ * all >= 60 add n and stay >= 60. Other keys outside 0–11 add n and do not wrap.
  */
 export function transposeDefine(def: ChordDefine, n: number, flats: boolean): ChordDefine | null {
   if (!n) return { ...def }
diff --git a/tests/core/define-directive.test.ts b/tests/core/define-directive.test.ts
index f483eba..6fb5f13 100644
--- a/tests/core/define-directive.test.ts
+++ b/tests/core/define-directive.test.ts
@@ -328,6 +328,25 @@ describe('transposeDefine', () => {
     expect(backDraw.lit).toEqual([0, 2])
     expect(backDraw.litNotes).toEqual(['C', 'D'])
   })
+
+  it('keeps D keys 62 64 at or above 60 after a -60 transpose', () => {
+    const raw = parseDefineDirective('{define: D keys 62 64}')
+    expect(raw.class).toBe('parse')
+    if (raw.class !== 'parse') return
+    expect(() => transposeDefine(raw, -60, false)).not.toThrow()
+    const shifted = transposeDefine(raw, -60, false)
+    expect(shifted).toMatchObject({ name: 'D', keys: [62, 64] })
+    expect(shifted?.keys?.every((k) => k >= 60)).toBe(true)
+    if (!shifted) return
+    const hit = resolveDiagram({ token: shifted.name, instrument: 'piano', overrides: [shifted] })
+    expect(hit.class).toBe('hit')
+    if (hit.class !== 'hit') return
+    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: shifted.name })
+    expect(draw.kind).toBe('piano')
+    if (draw.kind !== 'piano') return
+    expect(draw.lit).toEqual([2, 4])
+    expect(draw.litNotes).toEqual(['D', 'E'])
+  })
 })
 
 describe('transpose/setKey apply the same define rewrite as export', () => {
diff --git a/tests/core/resolve-diagram.test.ts b/tests/core/resolve-diagram.test.ts
index 616319d..6b59d0f 100644
--- a/tests/core/resolve-diagram.test.ts
+++ b/tests/core/resolve-diagram.test.ts
@@ -415,6 +415,20 @@ describe('resolveDiagram', () => {
     expect(backDraw.lit).toEqual([2, 9])
     expect(backDraw.litNotes).toEqual(['D', 'A'])
   })
+
+  it('draws D9 keys 0 4 7 14 as D F# A E', () => {
+    const raw = parseDefineDirective('{define: D9 keys 0 4 7 14}')
+    expect(raw.class).toBe('parse')
+    if (raw.class !== 'parse') return
+    const hit = resolveDiagram({ token: 'D9', instrument: 'piano', overrides: [raw] })
+    expect(hit.class).toBe('hit')
+    if (hit.class !== 'hit') return
+    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: 'D9' })
+    expect(draw.kind).toBe('piano')
+    if (draw.kind !== 'piano') return
+    expect(draw.lit).toEqual([2, 6, 9, 4])
+    expect(draw.litNotes).toEqual(['D', 'F#', 'A', 'E'])
+  })
 })
 
 const TUNING = {
---END DIFF---

### Modified files (full content for context)

#### src/core/chord-dict.ts

```ts
/**
 * Package chord dictionary: one lowest-open voicing per name.
 * Guitar is EADGBE (6). Ukulele is GCEA (4). No baritone.
 * Lookups use Object.hasOwn so prototype keys stay a miss.
 */

export type DictInstrument = 'guitar' | 'ukulele' | 'piano'
export type FretSlot = number | 'x'

export type DictVoicing = {
  instrument: DictInstrument
  baseFret?: number
  frets?: FretSlot[]
  fingers?: FretSlot[]
  keys?: number[]
}

/** Canonical quality → pitch-class intervals from the tonic. */
const QUALITY_INTERVALS: Record<string, number[]> = Object.create(null)
QUALITY_INTERVALS.major = [0, 4, 7]
QUALITY_INTERVALS.m = [0, 3, 7]
QUALITY_INTERVALS['5'] = [0, 7]
QUALITY_INTERVALS['6'] = [0, 4, 7, 9]
QUALITY_INTERVALS['6add9'] = [0, 4, 7, 9, 14]
QUALITY_INTERVALS['7'] = [0, 4, 7, 10]
QUALITY_INTERVALS['9'] = [0, 4, 7, 10, 14]
QUALITY_INTERVALS.add9 = [0, 4, 7, 14]
QUALITY_INTERVALS.maj7 = [0, 4, 7, 11]
QUALITY_INTERVALS.maj9 = [0, 4, 7, 11, 14]
QUALITY_INTERVALS.m6 = [0, 3, 7, 9]
QUALITY_INTERVALS.m7 = [0, 3, 7, 10]
QUALITY_INTERVALS.m9 = [0, 3, 7, 10, 14]
QUALITY_INTERVALS.m11 = [0, 3, 7, 10, 14, 17]
QUALITY_INTERVALS.sus2 = [0, 2, 7]
QUALITY_INTERVALS.sus4 = [0, 5, 7]
QUALITY_INTERVALS['7sus4'] = [0, 5, 7, 10]
QUALITY_INTERVALS.dim = [0, 3, 6]

/** 12 roots, C=0 … B=11. `x` mute; digits are fret numbers from the nut. */
const GUITAR: Record<string, string[]> = Object.create(null)
GUITAR.major = ['x32010', 'x43121', 'xx0232', 'xx1343', '022100', '133211', '244322', '320003', '431114', 'x02220', 'x13331', 'x24442']
GUITAR.m = ['x35543', 'x46654', 'xx0231', 'xx1342', '022000', '133111', '244222', '355333', '466444', 'x02210', 'x13321', 'x24432']
GUITAR['7'] = ['x32310', 'x43421', 'xx0212', 'xx1323', '020100', '131211', '242322', '320001', '431112', 'x02020', 'x13131', 'x21202']
GUITAR.maj7 = ['x32000', 'x43111', 'xx0222', 'xx1333', '021100', '132211', '243322', '320002', '431113', 'x02120', 'x13231', 'x24342']
GUITAR.m7 = ['x35343', 'x46454', 'xx0211', 'xx1322', '020000', '131111', '242222', '353333', '464444', 'x02010', 'x13121', 'x20202']
GUITAR.sus2 = ['x30013', 'x41124', 'xx0230', 'xx1341', '024400', '133013', '244124', '300233', '411344', 'x02200', 'x13311', 'x24422']
GUITAR.sus4 = ['x33011', 'x44122', 'xx0233', 'xx1344', '022200', '133311', '244422', '330013', '441124', 'x02230', 'x13341', 'x24452']
GUITAR['7sus4'] = ['x33311', 'x44422', 'xx0213', 'xx1324', '020200', '131311', '242422', '330011', '441122', 'x02030', 'x13141', 'x24252']
GUITAR.add9 = ['x32030', 'x43141', 'x54252', 'x65363', '024100', '133213', '244324', '320203', '431314', 'x02420', 'x13531', 'x24642']
GUITAR['5'] = ['x355xx', 'x466xx', 'xx023x', 'xx134x', '022xxx', '133xxx', '244xxx', '355xxx', '466xxx', 'x022xx', 'x133xx', 'x244xx']
GUITAR['6'] = ['x32210', 'x43321', 'xx0202', 'xx1313', '022120', '133231', '244342', '320000', '431111', 'x02222', 'x13333', 'x24444']
GUITAR['6add9'] = ['x32230', 'x43341', '000202', '111011', '022122', '133233', '244344', '320200', '431311', '022222', 'x10011', 'x21122']
GUITAR['9'] = ['x32330', 'x43441', 'xx0210', 'xx1321', '020102', '131213', '242324', '320201', '431312', 'x02000', 'x13111', 'x21222']
GUITAR.maj9 = ['020010', '131121', 'xx0220', 'xx1331', '021102', '132213', '243324', '320202', '431313', 'x02100', 'x13211', 'x24322']
GUITAR.m6 = ['x0101x', '012120', 'xx0201', 'xx1312', '022020', '133131', '244242', '355353', '466464', 'x02212', 'x13323', 'x24434']
GUITAR.m9 = ['x30343', 'x41454', 'x52565', 'x63676', '020002', '131113', '242224', '353335', '464446', 'x05500', 'x16611', 'x20222']
GUITAR.dim = ['x3454x', 'x4565x', 'xx0131', 'xx1242', '0120xx', '1231xx', '2342xx', '3453xx', '4564xx', 'x0121x', 'x1232x', 'x2343x']

const UKULELE: Record<string, string[]> = Object.create(null)
UKULELE.major = ['0003', '1114', '2220', '3331', '4442', '2010', '3121', '0232', '1343', '2100', '3211', '4322']
UKULELE.m = ['0333', '1444', '2210', '3321', '0432', '1543', '2120', '0231', '1342', '2000', '3111', '4222']
UKULELE['7'] = ['0001', '1112', '2223', '3334', '1202', '2313', '3424', '0212', '1323', '0100', '1211', '2322']
UKULELE.maj7 = ['0002', '1113', '2224', '3335', '1302', '2413', '3524', '0222', '1333', '1100', '2211', '3322']
UKULELE.m7 = ['0331', '1442', '2213', '3324', '0202', '1313', '2424', '0211', '1322', '0000', '1111', '2222']
UKULELE.sus2 = ['0233', '1344', '2200', '3311', '4422', '0013', '1124', '0230', '1341', '2402', '3513', '4624']
UKULELE.sus4 = ['0013', '1124', '2230', '3341', '4452', '3011', '4122', '0233', '1344', '2200', '3311', '4422']
UKULELE['7sus4'] = ['0011', '1122', '2233', '3344', '2202', '3313', '4424', '0213', '1324', '0200', '1311', '2422']
UKULELE.add9 = ['0203', '1314', '2420', '3531', '4642', '0010', '1121', '0252', '1363', '2102', '3213', '4324']
UKULELE['5'] = ['0033', '1144', '2255', 'x3x1', 'xx02', '5013', '6124', '0235', '13xx', '2400', '3511', '4622']
UKULELE['6'] = ['0000', '1111', '2222', '3333', '4444', '2213', '3324', '0202', '1313', '2424', '0211', '1322']
UKULELE['6add9'] = ['0200', '1311', '2422', '0011', '1122', '0210', '1321', '2202', '1011', '2122', '3233', '4344']
UKULELE['9'] = ['0201', '1312', '2423', '3534', '4645', '0310', '1421', '0570', '1021', '0102', '1213', '2324']
UKULELE.maj9 = ['0202', '1313', '2424', '3535', '1606', '0500', '1521', '0670', '0041', '1102', '2011', '3122']
UKULELE.m6 = ['0330', '1441', '2212', '3323', '0102', '1213', '2324', '0201', '1312', '2423', '0111', '1222']
UKULELE.m9 = ['3335', '1302', '5505', '6616', '0425', '1336', '1600', '0560', '1671', '0002', '1113', '2224']
UKULELE.dim = ['x323', '010x', '121x', 'x320', '0x01', '1x12', '2020', '01x1', '12x2', '23x3', 'x101', 'x212']

function decodeFrets(packed: string): FretSlot[] {
  const out: FretSlot[] = []
  for (const ch of packed) {
    if (ch === 'x') out.push('x')
    else out.push(Number(ch))
  }
  return out
}

export function pianoKeysOf(quality: string): number[] | null {
  if (!Object.hasOwn(QUALITY_INTERVALS, quality)) return null
  const keys = QUALITY_INTERVALS[quality]
  return keys ? [...keys] : null
}

function mod12(n: number): number {
  return ((n % 12) + 12) % 12
}

/** Tones that name the quality. A power chord's only characteristic tone is the fifth; other qualities drop the root and the fifth. */
function characteristicIntervals(quality: string, intervals: readonly number[]): number[] {
  if (quality === '5') return [7]
  const seen = new Set<number>()
  const out: number[] = []
  for (const iv of intervals) {
    const tone = mod12(iv)
    if (tone === 0 || tone === 7 || seen.has(tone)) continue
    seen.add(tone)
    out.push(tone)
  }
  return out
}

function characteristicCount(sounding: Set<number>, rootPc: number, tones: readonly number[]): number {
  const heard = new Set<number>()
  for (const pc of sounding) heard.add(mod12(pc - rootPc))
  let count = 0
  for (const tone of tones) {
    if (heard.has(tone)) count++
  }
  return count
}

type PianoReading = {
  pcs: number[]
  intervals: number[]
  absSet: Set<number>
  relSet: Set<number>
  absScore: number
  relScore: number
}

function scorePianoReadings(keys: readonly number[], rootPc: number, quality: string): PianoReading {
  const pcs = keys.map((k) => mod12(k))
  const intervals = pianoKeysOf(quality) ?? [0]
  const expected = intervals.map((iv) => mod12(rootPc + iv))
  const absSet = new Set(pcs)
  const relSet = new Set(pcs.map((k) => mod12(rootPc + k)))
  let absScore = 0
  let relScore = 0
  for (const pc of expected) {
    if (absSet.has(pc)) absScore++
    if (relSet.has(pc)) relScore++
  }
  return { pcs, intervals, absSet, relSet, absScore, relScore }
}

/**
 * Sounding pitch classes of the one piano reading, in key order.
 * Absolute marker: every key is >= 60. Only then return mod 12 and skip
 * the reading. A 14 or 17 beside 0–11, or 48 52 55, stays on the heuristic.
 * Absolute: the stored classes. Relative: `(root + key) % 12`.
 * Draw stores those classes as intervals from the root.
 */
export function pianoSoundingPitchClasses(
  keys: readonly number[],
  rootPc: number,
  quality: string,
  bassPc: number | null = null,
): number[] {
  if (keys.length > 0 && keys.every((k) => k >= 60)) return keys.map((k) => mod12(k))
  const { pcs, intervals, absSet, relSet, absScore, relScore } = scorePianoReadings(keys, rootPc, quality)
  const absolute = () => [...pcs]
  const relative = () => pcs.map((k) => mod12(rootPc + k))
  if (absScore > relScore) return absolute()
  if (relScore > absScore) return relative()
  // Score tie: a slash bass that sounds in only one reading picks that reading.
  if (bassPc != null) {
    const bass = mod12(bassPc)
    const inAbs = absSet.has(bass)
    const inRel = relSet.has(bass)
    if (inAbs !== inRel) return inAbs ? absolute() : relative()
  }
  const tones = characteristicIntervals(quality, intervals)
  if (characteristicCount(relSet, rootPc, tones) > characteristicCount(absSet, rootPc, tones)) return relative()
  return absolute()
}

/** File `{define}` keys may be absolute pitch classes; dictionary keys are intervals from the tonic. */
export function pianoKeysToRelative(
  keys: number[],
  rootPc: number,
  quality: string,
  bassPc: number | null = null,
): number[] {
  return pianoSoundingPitchClasses(keys, rootPc, quality, bassPc).map((pc) => mod12(pc - rootPc))
}

export function lookupDict(
  instrument: DictInstrument,
  rootPc: number,
  quality: string,
): DictVoicing | null {
  const pc = ((rootPc % 12) + 12) % 12
  if (instrument === 'piano') {
    const keys = pianoKeysOf(quality)
    if (!keys) return null
    return { instrument: 'piano', keys }
  }
  const table = instrument === 'guitar' ? GUITAR : UKULELE
  if (!Object.hasOwn(table, quality)) return null
  const packed = table[quality]?.[pc]
  if (!packed) return null
  const frets = decodeFrets(packed)
  const want = instrument === 'guitar' ? 6 : 4
  if (frets.length !== want) return null
  return { instrument, baseFret: 1, frets }
}
```

#### src/core/define.ts

```ts
/**
 * ChordPro `{define}` / `{define-guitar}` / `{define-ukulele}` — file override,
 * not package dictionary. Generic `{define:}` infers instrument from payload.
 */

import { pianoSoundingPitchClasses } from './chord-dict'
import { parseChordToken } from './parse-chord'
import { keyIndex, transposeToken } from './transpose'

export const DIR = /^\s*\{\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*:?\s*([^}]*)\}\s*$/

export type DefineDirective = 'define' | 'define-guitar' | 'define-ukulele'
export type DefineInstrument = 'guitar' | 'ukulele' | 'piano'

export type ChordDefine = {
  name: string
  instrument: DefineInstrument
  directive: DefineDirective
  baseFret?: number
  frets?: Array<number | 'x'>
  fingers?: Array<number | 'x'>
  keys?: number[]
}

export type DefineResult = ({ class: 'parse' } & ChordDefine) | { class: 'miss' }

const KEYWORDS = new Set(['base-fret', 'frets', 'fingers', 'keys'])

export function isDefineKey(k: string): boolean {
  const x = k.toLowerCase()
  return x === 'define' || x === 'define-guitar' || x === 'define-ukulele'
}

function miss(): DefineResult {
  return { class: 'miss' }
}

function parseFret(tok: string): number | 'x' | null {
  const t = tok.toLowerCase()
  if (t === 'x' || t === '-1') return 'x'
  if (/^\d+$/.test(tok)) return Number(tok)
  return null
}

function parseFinger(tok: string): number | 'x' | null {
  const t = tok.toLowerCase()
  if (t === 'x' || t === '-') return 'x'
  if (/^\d+$/.test(tok)) return Number(tok)
  return null
}

function takeValues(tokens: string[], from: number): { vals: string[]; next: number } {
  const vals: string[] = []
  let i = from
  while (i < tokens.length && !KEYWORDS.has((tokens[i] ?? '').toLowerCase())) {
    vals.push(tokens[i] ?? '')
    i++
  }
  return { vals, next: i }
}

function fmtSlots(xs: Array<number | 'x'>): string {
  return xs.map((v) => (v === 'x' ? 'x' : String(v))).join(' ')
}

export function parseDefineDirective(raw: string): DefineResult {
  const m = String(raw ?? '').match(DIR)
  if (!m) return miss()
  const key = (m[1] ?? '').toLowerCase()
  if (!isDefineKey(key)) return miss()
  const directive = key as DefineDirective
  const body = (m[2] ?? '').trim()
  if (!body) return miss()

  const tokens = body.split(/\s+/).filter(Boolean)
  const name = tokens[0] ?? ''
  if (!name) return miss()

  let baseFret: number | undefined
  let frets: Array<number | 'x'> | undefined
  let fingers: Array<number | 'x'> | undefined
  let keys: number[] | undefined
  let i = 1
  while (i < tokens.length) {
    const kw = (tokens[i] ?? '').toLowerCase()
    if (kw === 'base-fret') {
      const n = Number(tokens[i + 1])
      if (!Number.isFinite(n) || n < 1) return miss()
      baseFret = n
      i += 2
      continue
    }
    if (kw === 'frets') {
      const { vals, next } = takeValues(tokens, i + 1)
      const parsed: Array<number | 'x'> = []
      for (const v of vals) {
        const f = parseFret(v)
        if (f === null) return miss()
        parsed.push(f)
      }
      frets = parsed
      i = next
      continue
    }
    if (kw === 'fingers') {
      const { vals, next } = takeValues(tokens, i + 1)
      const parsed: Array<number | 'x'> = []
      for (const v of vals) {
        const f = parseFinger(v)
        if (f === null) return miss()
        parsed.push(f)
      }
      fingers = parsed
      i = next
      continue
    }
    if (kw === 'keys') {
      const { vals, next } = takeValues(tokens, i + 1)
      const parsed: number[] = []
      for (const v of vals) {
        const n = Number(v)
        if (!Number.isFinite(n) || !/^-?\d+$/.test(v)) return miss()
        parsed.push(n)
      }
      keys = parsed
      i = next
      continue
    }
    return miss()
  }

  let instrument: DefineInstrument | null = null
  if (directive === 'define-guitar') {
    if (frets?.length !== 6) return miss()
    instrument = 'guitar'
  } else if (directive === 'define-ukulele') {
    if (frets?.length !== 4) return miss()
    instrument = 'ukulele'
  } else if (keys && keys.length) {
    instrument = 'piano'
  } else if (frets?.length === 6) {
    instrument = 'guitar'
  } else if (frets?.length === 4) {
    instrument = 'ukulele'
  } else {
    return miss()
  }

  if (fingers && frets && fingers.length !== frets.length) return miss()
  if (fingers && !frets?.length) return miss()

  const parsed: DefineResult = {
    class: 'parse',
    name,
    instrument,
    directive,
  }
  if (keys?.length) parsed.keys = keys
  if (frets?.length) {
    parsed.baseFret = baseFret ?? 1
    parsed.frets = frets
  }
  if (fingers) parsed.fingers = fingers
  return parsed
}

export function serializeDefine(def: ChordDefine): string {
  let body = `${def.directive}: ${def.name}`
  if (def.frets?.length) {
    body += ` base-fret ${def.baseFret ?? 1} frets ${fmtSlots(def.frets)}`
    if (def.fingers) body += ` fingers ${fmtSlots(def.fingers)}`
  }
  if (def.keys?.length) body += ` keys ${def.keys.join(' ')}`
  return `{${body}}`
}

function isPitchClass(k: number): boolean {
  return k >= 0 && k <= 11
}

function mod12(n: number): number {
  return ((n % 12) + 12) % 12
}

function shiftKey(k: number, n: number): number {
  if (isPitchClass(k)) return mod12(k + n)
  return k + n
}

function sameOrder(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((pc, i) => pc === b[i])
}

/**
 * 0–11 keys: shift the draw's sounding classes, then keep the absolute list
 * or the relative list that the renamed chord reads back as that sequence.
 * When neither candidate reads that sequence, store 60 + pc. Do not throw.
 * Keys that are all >= 60 add n, then store 60 + (result mod 12).
 * Any other key outside 0–11 adds n and does not wrap.
 */
function transposePianoKeys(def: ChordDefine, n: number, flats: boolean): number[] {
  const keys = def.keys ?? []
  if (keys.length > 0 && keys.every((k) => k >= 60)) {
    return keys.map((k) => 60 + mod12(k + n))
  }
  const midi = () => keys.map((k) => shiftKey(k, n))
  if (!keys.length || !keys.every(isPitchClass)) return midi()
  const parsed = parseChordToken(def.name)
  if (parsed.class !== 'parse') return midi()
  const rootPc = keyIndex(parsed.root)
  if (rootPc === null) return midi()
  const bassPc = parsed.bass != null ? keyIndex(parsed.bass) : null
  if (parsed.bass != null && bassPc === null) return midi()
  const sounding = pianoSoundingPitchClasses(keys, rootPc, parsed.quality, bassPc)
  const shifted = sounding.map((k) => shiftKey(k, n))
  const renamed = parseChordToken(transposeToken(def.name, n, flats))
  if (renamed.class !== 'parse') return shifted
  const newRoot = keyIndex(renamed.root)
  if (newRoot === null) return shifted
  const newBass = renamed.bass != null ? keyIndex(renamed.bass) : null
  if (renamed.bass != null && newBass === null) return shifted
  const readsShifted = (candidate: readonly number[]) =>
    sameOrder(pianoSoundingPitchClasses(candidate, newRoot, renamed.quality, newBass), shifted)
  if (readsShifted(shifted)) return shifted
  const relative = shifted.map((pc) => mod12(pc - newRoot))
  if (readsShifted(relative)) return relative
  return shifted.map((pc) => 60 + pc)
}

/**
 * Guitar/ukulele: bump `baseFret` when every slot is >0 or `x`; drop if any
 * string is open (fret 0) or the new base would fall below 1. Piano keys
 * inside 0–11 are stored so the renamed chord reads the shifted sounding
 * classes, or as 60 + pc when neither 0–11 candidate does. Keys that are
 * all >= 60 add n and stay >= 60. Other keys outside 0–11 add n and do not wrap.
 */
export function transposeDefine(def: ChordDefine, n: number, flats: boolean): ChordDefine | null {
  if (!n) return { ...def }
  if (def.frets?.some((f) => f === 0)) return null
  const next: ChordDefine = { ...def, name: transposeToken(def.name, n, flats) }
  if (def.frets?.length) {
    const base = (def.baseFret ?? 1) + n
    if (base < 1) return null
    next.baseFret = base
  }
  if (def.keys?.length) next.keys = transposePianoKeys(def, n, flats)
  return next
}

export function transposeDefineLine(line: string, n: number, flats: boolean): string | null {
  const def = asChordDefine(parseDefineDirective(line))
  if (!def) return line
  const next = transposeDefine(def, n, flats)
  return next ? serializeDefine(next) : null
}

export function rewriteDefineLines(source: string, n: number, flats: boolean): string {
  if (!n) return source
  return String(source ?? '')
    .split('\n')
    .flatMap((line) => {
      if (!isDefineKey(line.match(DIR)?.[1] ?? '')) return [line]
      const next = transposeDefineLine(line, n, flats)
      return next == null ? [] : [next]
    })
    .join('\n')
}

export function asChordDefine(r: DefineResult): ChordDefine | null {
  if (r.class !== 'parse') return null
  const { class: _c, ...def } = r
  return def
}

/** Header keys the define block sits after — META_KEYS plus t/st/artist. */
const DEFINE_HEADER = new Set([
  'title',
  't',
  'subtitle',
  'st',
  'artist',
  'composer',
  'key',
  'transpose',
  'tempo',
  'time',
  'duration',
  'capo',
  'x_origem',
  'x_youtube',
  'x_strum',
  'x_strum_set',
])

/**
 * Rewrite `{define…}` lines: drop the old ones and land the block immediately
 * after the META_KEYS header, before the first lyric or comment.
 */
export function writeDefines(source: string, defines: ChordDefine[]): string {
  const lines = String(source ?? '')
    .split('\n')
    .filter((l) => {
      const m = l.match(DIR)
      return !(m && isDefineKey(m[1] ?? ''))
    })
  let lastMeta = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (!line.trim()) continue
    const m = line.match(DIR)
    const k = (m?.[1] ?? '').toLowerCase()
    if (m && DEFINE_HEADER.has(k)) {
      lastMeta = i
      continue
    }
    break
  }
  lines.splice(lastMeta + 1, 0, ...defines.map(serializeDefine))
  return lines.join('\n')
}
```

#### tests/core/define-directive.test.ts

```ts
import { describe, expect, it } from 'vitest'
import {
  META_KEYS,
  drawDiagram,
  exportCho,
  parse,
  parseDefineDirective,
  resolveDiagram,
  rewriteToKey,
  serializeDefine,
  setKey,
  transpose,
  writeDefines,
  writeMeta,
} from '../../src/core/index'
import { DIR, transposeDefine } from '../../src/core/define'
import { loadFixture } from '../helpers/load-fixture'

const GUITAR_AM =
  '{define-guitar: Am base-fret 1 frets x 0 2 2 1 0 fingers x 0 2 3 1 0}'
const UKE_C =
  '{define-ukulele: C base-fret 1 frets 0 0 0 3 fingers 0 0 0 3}'
const PIANO_C = '{define: C keys 0 4 7}'
const GENERIC_GUITAR = '{define: G base-fret 1 frets 3 2 0 0 0 3}'
const GENERIC_UKE = '{define: C frets 0 0 0 3}'

describe('DIR hyphenated define keys', () => {
  it('accepts define-guitar and define-ukulele as full keys', () => {
    const guitar = GUITAR_AM.match(DIR)
    expect(guitar?.[1]?.toLowerCase()).toBe('define-guitar')
    expect(guitar?.[2]?.trim().startsWith('Am')).toBe(true)

    const uke = UKE_C.match(DIR)
    expect(uke?.[1]?.toLowerCase()).toBe('define-ukulele')
    expect(uke?.[2]?.trim().startsWith('C')).toBe(true)

    const generic = PIANO_C.match(DIR)
    expect(generic?.[1]?.toLowerCase()).toBe('define')
  })
})

describe('parseDefineDirective', () => {
  it('reads frets, fingers, and base-fret on define-guitar', () => {
    const r = parseDefineDirective(GUITAR_AM)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(r.name).toBe('Am')
    expect(r.instrument).toBe('guitar')
    expect(r.directive).toBe('define-guitar')
    expect(r.baseFret).toBe(1)
    expect(r.frets).toEqual(['x', 0, 2, 2, 1, 0])
    expect(r.fingers).toEqual(['x', 0, 2, 3, 1, 0])
  })

  it('reads frets and fingers on define-ukulele', () => {
    const r = parseDefineDirective(UKE_C)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(r.name).toBe('C')
    expect(r.instrument).toBe('ukulele')
    expect(r.directive).toBe('define-ukulele')
    expect(r.frets).toEqual([0, 0, 0, 3])
    expect(r.fingers).toEqual([0, 0, 0, 3])
  })

  it('reads piano keys on generic define', () => {
    const r = parseDefineDirective(PIANO_C)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(r.name).toBe('C')
    expect(r.instrument).toBe('piano')
    expect(r.keys).toEqual([0, 4, 7])
    expect(r.frets).toBeUndefined()
  })

  it('infers guitar from 6 frets on generic define', () => {
    const r = parseDefineDirective(GENERIC_GUITAR)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(r.instrument).toBe('guitar')
    expect(r.directive).toBe('define')
    expect(r.frets).toHaveLength(6)
  })

  it('infers ukulele from 4 frets on generic define', () => {
    const r = parseDefineDirective(GENERIC_UKE)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(r.instrument).toBe('ukulele')
    expect(r.frets).toHaveLength(4)
  })

  it('keeps keys and guitar voicing on a mixed generic define', () => {
    const raw = '{define: C base-fret 1 frets 3 2 0 0 0 3 keys 0 4 7}'
    const r = parseDefineDirective(raw)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(r.instrument).toBe('piano')
    expect(r.directive).toBe('define')
    expect(r.frets).toEqual([3, 2, 0, 0, 0, 3])
    expect(r.baseFret).toBe(1)
    expect(r.keys).toEqual([0, 4, 7])
    const out = serializeDefine(r)
    expect(out).toContain('frets 3 2 0 0 0 3')
    expect(out).toContain('keys 0 4 7')
    expect(out).toContain('base-fret 1')
    expect(parseDefineDirective(out).class).toBe('parse')
  })

  it('treats unknown fret arity as miss', () => {
    expect(parseDefineDirective('{define: Am frets 0 1 2}').class).toBe('miss')
    expect(parseDefineDirective('{define: Am frets 0 1 2 3 4}').class).toBe('miss')
    expect(parseDefineDirective('{define: Am}').class).toBe('miss')
    expect(parseDefineDirective('{define: Am base-fret 1}').class).toBe('miss')
  })

  it('misses define-guitar without six frets', () => {
    expect(parseDefineDirective('{define-guitar: Am keys 0 4 7}').class).toBe('miss')
    expect(parseDefineDirective('{define-guitar: Am frets 0 0 0 3}').class).toBe('miss')
  })
})

describe('serializeDefine', () => {
  it('emits ChordPro text that round-trips', () => {
    const r = parseDefineDirective(GUITAR_AM)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const out = serializeDefine(r)
    expect(out).toMatch(/^\{define-guitar:\s/)
    expect(out).toContain('Am')
    expect(out).toContain('base-fret 1')
    expect(out).toContain('frets x 0 2 2 1 0')
    expect(out).toContain('fingers x 0 2 3 1 0')
    expect(parseDefineDirective(out)).toEqual(r)
  })

  it('emits piano keys on generic define', () => {
    const r = parseDefineDirective(PIANO_C)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const out = serializeDefine(r)
    expect(out).toBe('{define: C keys 0 4 7}')
  })
})

describe('parse() exposes defines', () => {
  it('collects hyphenated defines and keeps them out of lyrics', () => {
    const src = `{title:X}\n${GUITAR_AM}\n[Am]oi`
    const view = parse(src)
    expect(view.defines).toHaveLength(1)
    expect(view.defines[0]).toMatchObject({ name: 'Am', instrument: 'guitar' })
    const lyrics = view.sections.flatMap((s) => s.lines).filter((l) => l.type === 'lyrics')
    expect(lyrics).toHaveLength(1)
    if (lyrics[0]?.type !== 'lyrics') return
    expect(lyrics[0].words.some((w) => /define/.test(w.lyric))).toBe(false)
    expect(lyrics[0].words.some((w) => w.chord === 'Am')).toBe(true)
  })

  it('is exported from src/core/index.ts', () => {
    expect(typeof parseDefineDirective).toBe('function')
    expect(typeof serializeDefine).toBe('function')
  })
})

describe('writeDefines', () => {
  it('places the define block after META_KEYS header and before lyrics', () => {
    const r = parseDefineDirective(GUITAR_AM)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const src = '{title:X}\n{key:G}\n\n[G]letra\n{c:(nota)}'
    const out = writeDefines(src, [r])
    const lines = out.split('\n')
    const keyAt = lines.findIndex((l) => l.startsWith('{key:'))
    const defAt = lines.findIndex((l) => l.startsWith('{define-guitar:'))
    const lyricAt = lines.findIndex((l) => l.includes('[G]letra'))
    expect(defAt).toBeGreaterThan(keyAt)
    expect(lyricAt).toBeGreaterThan(defAt)
    expect(out).toContain('{title:X}')
    expect(out.match(/\{define-guitar:/g)).toHaveLength(1)
  })

  it('replaces existing define lines instead of stacking them', () => {
    const r = parseDefineDirective(GUITAR_AM)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const src = `{title:X}\n${UKE_C}\n[G]letra`
    const out = writeDefines(src, [r])
    expect(out).toContain('{define-guitar:')
    expect(out).not.toContain('{define-ukulele:')
  })
})

describe('writeMeta keeps defines', () => {
  it('leaves define lines in place and does not list them in META_KEYS', () => {
    const src = `{title:X}\n{key:G}\n${GUITAR_AM}\n[Am]oi`
    const out = writeMeta(src, { title: 'Y', key: 'G' })
    expect(out).toContain('{define-guitar:')
    expect(out).toContain('Am')
    expect(out).toContain('[Am]oi')
    expect(out).toContain('{title:Y}')
    expect(META_KEYS as readonly string[]).not.toContain('define')
    expect(META_KEYS as readonly string[]).not.toContain('define-guitar')
    expect(META_KEYS as readonly string[]).not.toContain('define-ukulele')
  })
})

describe('fixtures/define-roundtrip.cho', () => {
  it('has at least one {define-guitar:} used in tests', () => {
    const src = loadFixture('define-roundtrip.cho')
    expect(src).toMatch(/\{define-guitar:/)
    const view = parse(src)
    expect(view.defines.some((d) => d.instrument === 'guitar')).toBe(true)
  })
})

describe('transposeDefine', () => {
  it('returns null when any guitar fret is open', () => {
    const r = parseDefineDirective(GENERIC_GUITAR)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, 2, false)).toBeNull()
  })

  it('bumps base-fret when every slot is fretted or muted', () => {
    const r = parseDefineDirective('{define-guitar: F base-fret 1 frets 1 3 3 2 1 1}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, 2, false)).toMatchObject({
      name: 'G',
      baseFret: 3,
      frets: [1, 3, 3, 2, 1, 1],
    })
  })

  it('drops a barred guitar define whose base-fret would fall below 1', () => {
    const r = parseDefineDirective('{define-guitar: F base-fret 1 frets 1 3 3 2 1 1}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, -1, false)).toBeNull()
  })

  it('shifts piano keys and wraps pitch-classes 0–11', () => {
    const r = parseDefineDirective(PIANO_C)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, 2, false)).toMatchObject({ name: 'D', keys: [2, 6, 9] })
    const b = parseDefineDirective('{define: B keys 11 3 6}')
    expect(b.class).toBe('parse')
    if (b.class !== 'parse') return
    expect(transposeDefine(b, 1, false)).toMatchObject({ name: 'C', keys: [0, 4, 7] })
  })

  it('adds n without wrapping keys outside 0–11', () => {
    const r = parseDefineDirective('{define: C keys 48 52 55}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, 2, false)).toMatchObject({ name: 'D', keys: [50, 54, 57] })
  })

  it('stores shifted sounding pitch classes for a relative piano spelling', () => {
    const r = parseDefineDirective('{define: D keys 0 4 7}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, 2, false)).toMatchObject({ name: 'E', keys: [4, 8, 11] })
  })

  it('stores the sounding classes of a relative tie, not the shifted intervals', () => {
    const r = parseDefineDirective('{define: F7sus4 keys 0 5 10}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, 2, false)).toMatchObject({ name: 'G7sus4', keys: [7, 0, 5] })
  })

  it('round-trips a relative sus2 through absolute pitch classes', () => {
    const r = parseDefineDirective('{define: Dsus2 keys 0 7}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const up = transposeDefine(r, 3, false)
    expect(up).toMatchObject({ name: 'Fsus2', keys: [5, 0] })
    if (!up) return
    expect(transposeDefine(up, -3, false)).toMatchObject({ name: 'Dsus2', keys: [2, 9] })
  })

  it('stores relative keys when absolute classes would be re-read on Gsus2', () => {
    const r = parseDefineDirective('{define: Dsus2 keys 0 7}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const up = transposeDefine(r, 5, false)
    expect(up).toMatchObject({ name: 'Gsus2', keys: [0, 7] })
    if (!up) return
    expect(transposeDefine(up, -5, false)).toMatchObject({ name: 'Dsus2', keys: [2, 9] })
  })

  it('stores absolute MIDI keys when C keys 0 2 do not round-trip on D', () => {
    const line = '{define: C keys 0 2}'
    const raw = parseDefineDirective(line)
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    expect(() => transposeDefine(raw, 2, false)).not.toThrow()
    expect(transposeDefine(raw, 2, false)).toMatchObject({ name: 'D', keys: [62, 64] })

    const src = `${line}\n[C]`
    expect(() => transpose(parse(src), 2)).not.toThrow()
    expect(transpose(parse(src), 2).defines).toMatchObject([{ name: 'D', keys: [62, 64] }])
    expect(() => exportCho(src, { semitones: 2 })).not.toThrow()
    const out = exportCho(src, { semitones: 2 })
    const exported = parse(out).defines[0]
    expect(exported).toMatchObject({ name: 'D', keys: [62, 64] })
    if (!exported) return
    const hit = resolveDiagram({ token: exported.name, instrument: 'piano', overrides: [exported] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: exported.name })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([2, 4])
    expect(draw.litNotes).toEqual(['D', 'E'])

    const back = transposeDefine(exported, -2, false)
    expect(back).toMatchObject({ name: 'C', keys: [60, 62] })
    if (!back) return
    const backHit = resolveDiagram({ token: back.name, instrument: 'piano', overrides: [back] })
    expect(backHit.class).toBe('hit')
    if (backHit.class !== 'hit') return
    const backDraw = drawDiagram({ instrument: 'piano', voicing: backHit.voicing, token: back.name })
    expect(backDraw.kind).toBe('piano')
    if (backDraw.kind !== 'piano') return
    expect(backDraw.lit).toEqual([0, 2])
    expect(backDraw.litNotes).toEqual(['C', 'D'])
  })

  it('keeps D keys 62 64 at or above 60 after a -60 transpose', () => {
    const raw = parseDefineDirective('{define: D keys 62 64}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    expect(() => transposeDefine(raw, -60, false)).not.toThrow()
    const shifted = transposeDefine(raw, -60, false)
    expect(shifted).toMatchObject({ name: 'D', keys: [62, 64] })
    expect(shifted?.keys?.every((k) => k >= 60)).toBe(true)
    if (!shifted) return
    const hit = resolveDiagram({ token: shifted.name, instrument: 'piano', overrides: [shifted] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: shifted.name })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([2, 4])
    expect(draw.litNotes).toEqual(['D', 'E'])
  })
})

describe('transpose/setKey apply the same define rewrite as export', () => {
  it('drops the open-G override from view.defines', () => {
    const src = loadFixture('define-roundtrip.cho')
    const view = parse(src)
    expect(view.defines).toHaveLength(1)
    expect(transpose(view, 2).defines).toEqual([])
    expect(setKey(view, 'A').defines).toEqual([])
  })
})

describe('rewriteToKey rewrites define lines before writeMeta', () => {
  it('omits an open-string guitar define', () => {
    const src = '{title:X}\n{key:G}\n{define-guitar: G base-fret 1 frets 3 2 0 0 0 3}\n[G]oi'
    const r = rewriteToKey(src, 'A')
    expect(r).not.toBeNull()
    expect(r!.source).not.toMatch(/\{define-guitar:/)
    expect(r!.source).toMatch(/\[A\]/)
    expect(r!.source).toMatch(/\{key:A\}/)
  })

  it('bumps a barred guitar define with the same delta as the body', () => {
    const src = '{title:X}\n{key:C}\n{define-guitar: F base-fret 1 frets 1 3 3 2 1 1}\n[F]oi'
    const r = rewriteToKey(src, 'G')
    expect(r).not.toBeNull()
    expect(r!.source).toMatch(/\{define-guitar:\s*G\b/)
    expect(r!.source).toContain('base-fret 3')
    expect(r!.source).toMatch(/\[G\]/)
  })
})

```

#### tests/core/resolve-diagram.test.ts

```ts
import { describe, expect, it } from 'vitest'
import {
  drawDiagram,
  parseChordToken,
  resolveDiagram,
  type ChordDefine,
} from '../../src/core/index'
import { parseDefineDirective, transposeDefine } from '../../src/core/define'
import { keyIndex } from '../../src/core/transpose'

const AM_OVERRIDE: ChordDefine = {
  name: 'Am',
  instrument: 'guitar',
  directive: 'define-guitar',
  baseFret: 1,
  frets: ['x', 0, 1, 2, 2, 0],
  fingers: ['x', 0, 1, 3, 2, 0],
}

describe('resolveDiagram', () => {
  it('is exported from src/core/index.ts', () => {
    expect(typeof resolveDiagram).toBe('function')
  })

  it('hits C7M as the maj7 voicing', () => {
    const guitar = resolveDiagram({ token: 'C7M', instrument: 'guitar' })
    expect(guitar.class).toBe('hit')
    if (guitar.class !== 'hit') return
    expect(guitar.source).toBe('dictionary')
    expect(guitar.voicing.frets).toEqual(['x', 3, 2, 0, 0, 0])
    expect(guitar.voicing.frets).toHaveLength(6)

    const piano = resolveDiagram({ token: 'C7M', instrument: 'piano' })
    expect(piano.class).toBe('hit')
    if (piano.class !== 'hit') return
    expect(piano.voicing.keys).toEqual([0, 4, 7, 11])
  })

  it('misses C7+ instead of guessing aug or maj7', () => {
    const r = resolveDiagram({ token: 'C7+', instrument: 'guitar' })
    expect(r.class).toBe('miss')
    if (r.class !== 'miss') return
    expect(r.reason).toBe('unknown-token')
  })

  it('prefers a file override over the package dictionary', () => {
    const dict = resolveDiagram({ token: 'Am', instrument: 'guitar' })
    expect(dict.class).toBe('hit')
    if (dict.class !== 'hit') return
    expect(dict.source).toBe('dictionary')
    expect(dict.voicing.frets).toEqual(['x', 0, 2, 2, 1, 0])

    const over = resolveDiagram({
      token: 'Am',
      instrument: 'guitar',
      overrides: [AM_OVERRIDE],
    })
    expect(over.class).toBe('hit')
    if (over.class !== 'hit') return
    expect(over.source).toBe('override')
    expect(over.voicing.frets).toEqual(['x', 0, 1, 2, 2, 0])
    expect(over.voicing.fingers).toEqual(['x', 0, 1, 3, 2, 0])
    expect(over.voicing.frets).not.toEqual(dict.voicing.frets)
  })

  it('matches an override by canonical quality so C7M hits a Cmaj7 define', () => {
    const def: ChordDefine = {
      name: 'Cmaj7',
      instrument: 'guitar',
      directive: 'define-guitar',
      baseFret: 1,
      frets: ['x', 3, 2, 0, 0, 3],
    }
    const r = resolveDiagram({ token: 'C7M', instrument: 'guitar', overrides: [def] })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    expect(r.source).toBe('override')
    expect(r.voicing.frets).toEqual(['x', 3, 2, 0, 0, 3])
  })

  it('uses the guitar token as shapeName, not the concert lyric', () => {
    const shape = resolveDiagram({ token: 'Am', instrument: 'guitar' })
    const concert = resolveDiagram({ token: 'Bm', instrument: 'guitar' })
    expect(shape.class).toBe('hit')
    expect(concert.class).toBe('hit')
    if (shape.class !== 'hit' || concert.class !== 'hit') return
    expect(shape.voicing.frets).toEqual(['x', 0, 2, 2, 1, 0])
    expect(concert.voicing.frets).not.toEqual(shape.voicing.frets)
  })

  it('uses the piano token as concert', () => {
    const r = resolveDiagram({ token: 'Bm', instrument: 'piano' })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    expect(r.voicing.keys).toEqual([0, 3, 7])
    expect(r.voicing.frets).toBeUndefined()
  })

  it('does not apply a guitar override to piano', () => {
    const r = resolveDiagram({
      token: 'Am',
      instrument: 'piano',
      overrides: [AM_OVERRIDE],
    })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    expect(r.source).toBe('dictionary')
    expect(r.voicing.keys).toEqual([0, 3, 7])
  })

  it('returns one voicing per name — the lowest open', () => {
    const c = resolveDiagram({ token: 'C', instrument: 'guitar' })
    expect(c.class).toBe('hit')
    if (c.class !== 'hit') return
    expect(c.voicing.frets).toEqual(['x', 3, 2, 0, 1, 0])
    const again = resolveDiagram({ token: 'C', instrument: 'guitar' })
    expect(again).toEqual(c)
  })

  it('ships ukulele GCEA (four strings) and not baritone', () => {
    const uke = resolveDiagram({ token: 'C', instrument: 'ukulele' })
    expect(uke.class).toBe('hit')
    if (uke.class !== 'hit') return
    expect(uke.voicing.frets).toEqual([0, 0, 0, 3])
    expect(uke.voicing.frets).toHaveLength(4)
  })

  it('classifies quote junk as unknown-token', () => {
    const r = resolveDiagram({ token: 'A4"', instrument: 'guitar' })
    expect(r.class).toBe('miss')
    if (r.class !== 'miss') return
    expect(r.reason).toBe('unknown-token')
  })

  it('classifies a parsed name with no voicing as no-shape', () => {
    const r = resolveDiagram({ token: 'Cm7(11)', instrument: 'ukulele' })
    expect(r.class).toBe('miss')
    if (r.class !== 'miss') return
    expect(r.reason).toBe('no-shape')
  })

  it('does not inherit Object.prototype keys as a dictionary hit', () => {
    for (const token of ['CtoString', 'Cconstructor']) {
      const r = resolveDiagram({ token, instrument: 'guitar' })
      expect(r.class, token).toBe('miss')
      if (r.class !== 'miss') continue
      expect(r.reason, token).toBe('unknown-token')
    }
  })

  it('G/B guitar is a miss without a matching bass override', () => {
    const r = resolveDiagram({ token: 'G/B', instrument: 'guitar' })
    expect(r.class).toBe('miss')
    if (r.class !== 'miss') return
    expect(r.reason).toBe('no-shape')
  })

  it('hits G/B from {define-guitar: G/B ...}', () => {
    const def: ChordDefine = {
      name: 'G/B',
      instrument: 'guitar',
      directive: 'define-guitar',
      baseFret: 1,
      frets: ['x', 2, 0, 0, 0, 3],
    }
    const r = resolveDiagram({ token: 'G/B', instrument: 'guitar', overrides: [def] })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    expect(r.source).toBe('override')
    expect(r.voicing.frets).toEqual(['x', 2, 0, 0, 0, 3])
  })

  it('does not match G/B against {define-guitar: G}', () => {
    const def: ChordDefine = {
      name: 'G',
      instrument: 'guitar',
      directive: 'define-guitar',
      baseFret: 1,
      frets: [3, 2, 0, 0, 0, 3],
    }
    const r = resolveDiagram({ token: 'G/B', instrument: 'guitar', overrides: [def] })
    expect(r.class).toBe('miss')
    if (r.class !== 'miss') return
    expect(r.reason).toBe('no-shape')
  })

  it('piano override absolute keys light A C E for Am', () => {
    const def: ChordDefine = {
      name: 'Am',
      instrument: 'piano',
      directive: 'define',
      keys: [9, 0, 4],
    }
    const r = resolveDiagram({ token: 'Am', instrument: 'piano', overrides: [def] })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    expect(r.source).toBe('override')
    expect(r.voicing.keys).toEqual([0, 3, 7])
    const d = drawDiagram({ instrument: 'piano', voicing: r.voicing, token: 'Am' })
    expect(d.kind).toBe('piano')
    if (d.kind !== 'piano') return
    expect(d.lit.slice().sort((a, b) => a - b)).toEqual([0, 4, 9])
    expect(new Set(d.litNotes)).toEqual(new Set(['A', 'C', 'E']))
  })

  it('treats a piano-key score tie as absolute', () => {
    const g7sus4 = resolveDiagram({
      token: 'G7sus4',
      instrument: 'piano',
      overrides: [
        { name: 'G7sus4', instrument: 'piano', directive: 'define', keys: [7, 0, 5] },
      ],
    })
    expect(g7sus4.class).toBe('hit')
    if (g7sus4.class !== 'hit') return
    expect(g7sus4.voicing.keys).toEqual([0, 5, 10])
    const d7 = drawDiagram({ instrument: 'piano', voicing: g7sus4.voicing, token: 'G7sus4' })
    expect(d7.kind).toBe('piano')
    if (d7.kind !== 'piano') return
    expect(d7.litNotes).toEqual(['G', 'C', 'F'])

    const gsus4 = resolveDiagram({
      token: 'Gsus4',
      instrument: 'piano',
      overrides: [{ name: 'Gsus4', instrument: 'piano', directive: 'define', keys: [7, 0] }],
    })
    expect(gsus4.class).toBe('hit')
    if (gsus4.class !== 'hit') return
    expect(gsus4.voicing.keys).toEqual([0, 5])
    const ds = drawDiagram({ instrument: 'piano', voicing: gsus4.voicing, token: 'Gsus4' })
    expect(ds.kind).toBe('piano')
    if (ds.kind !== 'piano') return
    expect(ds.litNotes).toEqual(['G', 'C'])

    const rel = resolveDiagram({
      token: 'Am',
      instrument: 'piano',
      overrides: [{ name: 'Am', instrument: 'piano', directive: 'define', keys: [0, 3, 7] }],
    })
    expect(rel.class).toBe('hit')
    if (rel.class !== 'hit') return
    expect(rel.voicing.keys).toEqual([0, 3, 7])
    const dRel = drawDiagram({ instrument: 'piano', voicing: rel.voicing, token: 'Am' })
    expect(dRel.kind).toBe('piano')
    if (dRel.kind !== 'piano') return
    expect(dRel.litNotes).toEqual(['A', 'C', 'E'])

    const c = resolveDiagram({
      token: 'C',
      instrument: 'piano',
      overrides: [{ name: 'C', instrument: 'piano', directive: 'define', keys: [0, 4, 7] }],
    })
    expect(c.class).toBe('hit')
    if (c.class !== 'hit') return
    expect(c.voicing.keys).toEqual([0, 4, 7])
    const dC = drawDiagram({ instrument: 'piano', voicing: c.voicing, token: 'C' })
    expect(dC.kind).toBe('piano')
    if (dC.kind !== 'piano') return
    expect(dC.litNotes).toEqual(['C', 'E', 'G'])
  })

  it('keeps a relative piano-key tie when its characteristic tones win', () => {
    const f7sus4 = resolveDiagram({
      token: 'F7sus4',
      instrument: 'piano',
      overrides: [
        { name: 'F7sus4', instrument: 'piano', directive: 'define', keys: [0, 5, 10] },
      ],
    })
    expect(f7sus4.class).toBe('hit')
    if (f7sus4.class !== 'hit') return
    expect(f7sus4.voicing.keys).toEqual([0, 5, 10])
    const d = drawDiagram({ instrument: 'piano', voicing: f7sus4.voicing, token: 'F7sus4' })
    expect(d.kind).toBe('piano')
    if (d.kind !== 'piano') return
    expect(d.lit).toEqual([5, 10, 3])
    expect(d.litNotes).toEqual(['F', 'A#', 'D#'])
  })

  it('breaks a piano-key score tie toward the slash bass that sounds in only one reading', () => {
    const r = resolveDiagram({
      token: 'D7M(9)/B',
      instrument: 'piano',
      overrides: [
        { name: 'D7M(9)/B', instrument: 'piano', directive: 'define', keys: [11, 2, 1, 4] },
      ],
    })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    const d = drawDiagram({ instrument: 'piano', voicing: r.voicing, token: 'D7M(9)/B' })
    expect(d.kind).toBe('piano')
    if (d.kind !== 'piano') return
    expect(d.lit).toEqual([11, 2, 1, 4])
    expect(d.litNotes).toEqual(['B', 'D', 'C#', 'E'])
  })

  it('draws a transposed relative piano define as the new chord', () => {
    const raw = parseDefineDirective('{define: D keys 0 4 7}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const plain = resolveDiagram({ token: 'D', instrument: 'piano', overrides: [raw] })
    expect(plain.class).toBe('hit')
    if (plain.class !== 'hit') return
    const plainDraw = drawDiagram({ instrument: 'piano', voicing: plain.voicing, token: 'D' })
    expect(plainDraw.kind).toBe('piano')
    if (plainDraw.kind !== 'piano') return
    expect(plainDraw.litNotes).toEqual(['D', 'F#', 'A'])

    const shifted = transposeDefine(raw, 2, false)
    expect(shifted).toMatchObject({ name: 'E', keys: [4, 8, 11] })
    if (!shifted) return
    const hit = resolveDiagram({ token: shifted.name, instrument: 'piano', overrides: [shifted] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: shifted.name })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.litNotes).toEqual(['E', 'G#', 'B'])

    const c = parseDefineDirective('{define: C keys 0 4 7}')
    expect(c.class).toBe('parse')
    if (c.class !== 'parse') return
    const cShift = transposeDefine(c, 2, false)
    expect(cShift).toMatchObject({ name: 'D', keys: [2, 6, 9] })
    if (!cShift) return
    const cHit = resolveDiagram({ token: cShift.name, instrument: 'piano', overrides: [cShift] })
    expect(cHit.class).toBe('hit')
    if (cHit.class !== 'hit') return
    const cDraw = drawDiagram({ instrument: 'piano', voicing: cHit.voicing, token: cShift.name })
    expect(cDraw.kind).toBe('piano')
    if (cDraw.kind !== 'piano') return
    expect(cDraw.litNotes).toEqual(['D', 'F#', 'A'])
  })

  it('draws F7sus4 and its +2 transpose from the same relative reading', () => {
    const raw = parseDefineDirective('{define: F7sus4 keys 0 5 10}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const plain = resolveDiagram({ token: 'F7sus4', instrument: 'piano', overrides: [raw] })
    expect(plain.class).toBe('hit')
    if (plain.class !== 'hit') return
    const plainDraw = drawDiagram({ instrument: 'piano', voicing: plain.voicing, token: 'F7sus4' })
    expect(plainDraw.kind).toBe('piano')
    if (plainDraw.kind !== 'piano') return
    expect(plainDraw.lit).toEqual([5, 10, 3])
    expect(plainDraw.litNotes).toEqual(['F', 'A#', 'D#'])

    const shifted = transposeDefine(raw, 2, false)
    expect(shifted).toMatchObject({ name: 'G7sus4', keys: [7, 0, 5] })
    if (!shifted) return
    const hit = resolveDiagram({ token: shifted.name, instrument: 'piano', overrides: [shifted] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: shifted.name })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([7, 0, 5])
    expect(draw.litNotes).toEqual(['G', 'C', 'F'])
  })

  it('round-trips Dsus2 keys 0 7 through +3 and back to D A', () => {
    const raw = parseDefineDirective('{define: Dsus2 keys 0 7}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const up = transposeDefine(raw, 3, false)
    expect(up).toMatchObject({ name: 'Fsus2', keys: [5, 0] })
    if (!up) return
    const upHit = resolveDiagram({ token: up.name, instrument: 'piano', overrides: [up] })
    expect(upHit.class).toBe('hit')
    if (upHit.class !== 'hit') return
    const upDraw = drawDiagram({ instrument: 'piano', voicing: upHit.voicing, token: up.name })
    expect(upDraw.kind).toBe('piano')
    if (upDraw.kind !== 'piano') return
    expect(upDraw.lit).toEqual([5, 0])
    expect(upDraw.litNotes).toEqual(['F', 'C'])

    const back = transposeDefine(up, -3, false)
    expect(back).toMatchObject({ name: 'Dsus2', keys: [2, 9] })
    if (!back) return
    const backHit = resolveDiagram({ token: back.name, instrument: 'piano', overrides: [back] })
    expect(backHit.class).toBe('hit')
    if (backHit.class !== 'hit') return
    const backDraw = drawDiagram({ instrument: 'piano', voicing: backHit.voicing, token: back.name })
    expect(backDraw.kind).toBe('piano')
    if (backDraw.kind !== 'piano') return
    expect(backDraw.lit).toEqual([2, 9])
    expect(backDraw.litNotes).toEqual(['D', 'A'])
  })

  it('round-trips Dsus2 keys 0 7 through +5 to G D and back to D A', () => {
    const raw = parseDefineDirective('{define: Dsus2 keys 0 7}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const up = transposeDefine(raw, 5, false)
    expect(up).toMatchObject({ name: 'Gsus2', keys: [0, 7] })
    if (!up) return
    const upHit = resolveDiagram({ token: up.name, instrument: 'piano', overrides: [up] })
    expect(upHit.class).toBe('hit')
    if (upHit.class !== 'hit') return
    const upDraw = drawDiagram({ instrument: 'piano', voicing: upHit.voicing, token: up.name })
    expect(upDraw.kind).toBe('piano')
    if (upDraw.kind !== 'piano') return
    expect(upDraw.lit).toEqual([7, 2])
    expect(upDraw.litNotes).toEqual(['G', 'D'])

    const back = transposeDefine(up, -5, false)
    expect(back).toMatchObject({ name: 'Dsus2', keys: [2, 9] })
    if (!back) return
    const backHit = resolveDiagram({ token: back.name, instrument: 'piano', overrides: [back] })
    expect(backHit.class).toBe('hit')
    if (backHit.class !== 'hit') return
    const backDraw = drawDiagram({ instrument: 'piano', voicing: backHit.voicing, token: back.name })
    expect(backDraw.kind).toBe('piano')
    if (backDraw.kind !== 'piano') return
    expect(backDraw.lit).toEqual([2, 9])
    expect(backDraw.litNotes).toEqual(['D', 'A'])
  })

  it('draws D9 keys 0 4 7 14 as D F# A E', () => {
    const raw = parseDefineDirective('{define: D9 keys 0 4 7 14}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const hit = resolveDiagram({ token: 'D9', instrument: 'piano', overrides: [raw] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: 'D9' })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([2, 6, 9, 4])
    expect(draw.litNotes).toEqual(['D', 'F#', 'A', 'E'])
  })
})

const TUNING = {
  guitar: [4, 9, 2, 7, 11, 4],
  ukulele: [7, 0, 4, 9],
} as const

const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

/**
 * Intervals from the tonic. 14 sounds as 2 and 17 sounds as 5, so those
 * are already reduced here. A sounding pitch class outside `allowed` is
 * illegal. `required` must be present. The fifth (7) may be omitted when
 * it is allowed. The root may be omitted once `required` is present.
 * Shell (9 and maj9 only): the major third may be omitted when the
 * characteristic seventh and the ninth are both present.
 */
const CHORD_ORACLE: Record<
  string,
  { allowed: number[]; required: number[]; shell?: { seventh: number; ninth: number; third: number } }
> = {
  major: { allowed: [0, 4, 7], required: [4] },
  m: { allowed: [0, 3, 7], required: [3] },
  '5': { allowed: [0, 7], required: [7] },
  '6': { allowed: [0, 4, 7, 9], required: [4, 9] },
  '6add9': { allowed: [0, 4, 7, 9, 2], required: [4, 9, 2] },
  '7': { allowed: [0, 4, 7, 10], required: [4, 10] },
  '9': { allowed: [0, 4, 7, 10, 2], required: [10, 2], shell: { seventh: 10, ninth: 2, third: 4 } },
  add9: { allowed: [0, 4, 7, 2], required: [4, 2] },
  maj7: { allowed: [0, 4, 7, 11], required: [4, 11] },
  maj9: { allowed: [0, 4, 7, 11, 2], required: [11, 2], shell: { seventh: 11, ninth: 2, third: 4 } },
  m6: { allowed: [0, 3, 7, 9], required: [3, 9] },
  m7: { allowed: [0, 3, 7, 10], required: [3, 10] },
  m9: { allowed: [0, 3, 7, 10, 2], required: [3, 10, 2] },
  sus2: { allowed: [0, 2, 7], required: [2] },
  sus4: { allowed: [0, 5, 7], required: [5] },
  '7sus4': { allowed: [0, 5, 7, 10], required: [5, 10] },
  dim: { allowed: [0, 3, 6], required: [3, 6] },
}

const GRID: { quality: string; suffix: string; aliases?: string[] }[] = [
  { quality: 'major', suffix: '' },
  { quality: 'm', suffix: 'm' },
  { quality: '5', suffix: '5' },
  { quality: '6', suffix: '6' },
  { quality: '6add9', suffix: '6(9)' },
  { quality: '7', suffix: '7' },
  { quality: '9', suffix: '7(9)' },
  { quality: 'add9', suffix: '9' },
  { quality: 'maj7', suffix: 'maj7', aliases: ['7M', 'M7'] },
  { quality: 'maj9', suffix: '7M(9)' },
  { quality: 'm6', suffix: 'm6' },
  { quality: 'm7', suffix: 'm7' },
  { quality: 'm9', suffix: 'm9' },
  { quality: 'sus2', suffix: 'sus2', aliases: ['2'] },
  { quality: 'sus4', suffix: 'sus4', aliases: ['4', 'sus'] },
  { quality: '7sus4', suffix: '7sus4', aliases: ['7(4)'] },
  { quality: 'dim', suffix: 'dim', aliases: ['º', '°'] },
]

/** Parser spellings that share a pitch class. E#=F, Fb=E, B#=C, Cb=B. */
const ENHARMONIC: ReadonlyArray<readonly [string, string]> = [
  ['C#', 'Db'],
  ['D#', 'Eb'],
  ['F#', 'Gb'],
  ['G#', 'Ab'],
  ['A#', 'Bb'],
  ['E#', 'F'],
  ['Fb', 'E'],
  ['B#', 'C'],
  ['Cb', 'B'],
]

const M11 = [0, 3, 7, 10, 2, 5] as const

function pitchClasses(instrument: 'guitar' | 'ukulele', frets: Array<number | 'x'>): Set<number> {
  const open = TUNING[instrument]
  const pcs = new Set<number>()
  for (let i = 0; i < open.length; i++) {
    const fret = frets[i]
    if (fret === 'x' || fret === undefined) continue
    pcs.add((open[i]! + fret) % 12)
  }
  return pcs
}

function oracleFailure(quality: string, rootPc: number, sounded: Set<number>): string | null {
  const spec = CHORD_ORACLE[quality]
  if (!spec) return `no oracle for ${quality}`
  const rel = new Set([...sounded].map((pc) => (pc - rootPc + 12) % 12))
  const allowed = new Set(spec.allowed)
  const foreign = [...rel].filter((tone) => !allowed.has(tone))
  if (foreign.length) return `foreign ${foreign.join(',')}`
  const missing = spec.required.filter((tone) => !rel.has(tone))
  if (missing.length) return `missing ${missing.join(',')}`
  if (spec.shell) {
    const shell = rel.has(spec.shell.seventh) && rel.has(spec.shell.ninth)
    if (!shell && !rel.has(spec.shell.third)) return 'missing third'
  }
  if (rel.size === 0) return 'silent'
  return null
}

function dictionaryFrets(
  token: string,
  instrument: 'guitar' | 'ukulele',
): { frets: Array<number | 'x'> } | { error: string } {
  const r = resolveDiagram({ token, instrument })
  if (r.class !== 'hit') return { error: r.reason }
  if (r.source !== 'dictionary') return { error: `source ${r.source}` }
  const frets = r.voicing.frets
  if (!frets?.length) return { error: 'no frets' }
  const want = instrument === 'guitar' ? 6 : 4
  if (frets.length !== want) return { error: `length ${frets.length}` }
  for (const fret of frets) {
    if (fret === 'x') continue
    if (!Number.isInteger(fret) || fret < 0 || fret > 9) return { error: `fret ${String(fret)}` }
  }
  return { frets }
}

describe('dictionary chord identity', () => {
  it('hits every dictionary quality on all 12 roots for guitar and ukulele', () => {
    const failures: string[] = []
    let checked = 0
    for (const instrument of ['guitar', 'ukulele'] as const) {
      for (const root of ROOTS) {
        const rootPc = keyIndex(root)
        if (rootPc === null) {
          failures.push(`${root}: no pitch class`)
          continue
        }
        for (const row of GRID) {
          const token = `${root}${row.suffix}`
          const parsed = parseChordToken(token)
          if (parsed.class !== 'parse' || parsed.quality !== row.quality) {
            failures.push(`${token}: quality ${parsed.class === 'parse' ? parsed.quality : parsed.class}`)
            continue
          }
          checked++
          const got = dictionaryFrets(token, instrument)
          if ('error' in got) {
            failures.push(`${instrument} ${token}: ${got.error}`)
            continue
          }
          const why = oracleFailure(row.quality, rootPc, pitchClasses(instrument, got.frets))
          if (why) failures.push(`${instrument} ${token} ${got.frets.join('')}: ${why}`)
          for (const alias of row.aliases ?? []) {
            const aliasToken = `${root}${alias}`
            const aliasParsed = parseChordToken(aliasToken)
            if (aliasParsed.class !== 'parse' || aliasParsed.quality !== row.quality) {
              failures.push(`${aliasToken}: quality ${aliasParsed.class === 'parse' ? aliasParsed.quality : aliasParsed.class}`)
              continue
            }
            const alt = dictionaryFrets(aliasToken, instrument)
            if ('error' in alt) {
              failures.push(`${instrument} ${aliasToken}: ${alt.error}`)
              continue
            }
            if (alt.frets.join('') !== got.frets.join('')) {
              failures.push(`${instrument} ${aliasToken} ${alt.frets.join('')} !== ${token} ${got.frets.join('')}`)
            }
          }
        }
      }
    }
    expect({ checked, failures }).toEqual({ checked: 17 * 12 * 2, failures: [] })
  })

  it('keeps C9 (add9) distinct from C7(9) (dominant 9)', () => {
    expect(parseChordToken('C9')).toMatchObject({ class: 'parse', quality: 'add9' })
    expect(parseChordToken('C7(9)')).toMatchObject({ class: 'parse', quality: '9' })
    for (const instrument of ['guitar', 'ukulele'] as const) {
      for (const root of ROOTS) {
        const add = dictionaryFrets(`${root}9`, instrument)
        const dom = dictionaryFrets(`${root}7(9)`, instrument)
        expect('error' in add, `${instrument} ${root}9`).toBe(false)
        expect('error' in dom, `${instrument} ${root}7(9)`).toBe(false)
        if ('error' in add || 'error' in dom) continue
        expect(add.frets, `${instrument} ${root}`).not.toEqual(dom.frets)
      }
    }
  })

  it('spells enharmonic roots as the same grip', () => {
    const failures: string[] = []
    for (const instrument of ['guitar', 'ukulele'] as const) {
      for (const [a, b] of ENHARMONIC) {
        for (const row of GRID) {
          const left = dictionaryFrets(`${a}${row.suffix}`, instrument)
          const right = dictionaryFrets(`${b}${row.suffix}`, instrument)
          if ('error' in left) {
            failures.push(`${instrument} ${a}/${b} ${row.quality}: ${left.error}`)
            continue
          }
          if ('error' in right) {
            failures.push(`${instrument} ${a}/${b} ${row.quality}: ${right.error}`)
            continue
          }
          if (left.frets.join('') !== right.frets.join('')) {
            failures.push(`${instrument} ${a}${row.suffix} ${left.frets.join('')} !== ${b}${row.suffix} ${right.frets.join('')}`)
          }
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('records m7(11) as a fretted miss and a piano hit', () => {
    for (const instrument of ['guitar', 'ukulele'] as const) {
      for (const root of ROOTS) {
        const r = resolveDiagram({ token: `${root}m7(11)`, instrument })
        expect(r, `${instrument} ${root}m7(11)`).toEqual({ class: 'miss', reason: 'no-shape' })
      }
    }
    for (const root of ROOTS) {
      const rootPc = keyIndex(root)
      expect(rootPc, root).not.toBeNull()
      if (rootPc === null) continue
      const r = resolveDiagram({ token: `${root}m7(11)`, instrument: 'piano' })
      expect(r.class, root).toBe('hit')
      if (r.class !== 'hit') continue
      expect(r.source).toBe('dictionary')
      const lit = (r.voicing.keys ?? []).map((k) => ((rootPc + k) % 12 + 12) % 12)
      const want = M11.map((iv) => (rootPc + iv) % 12)
      expect(new Set(lit), root).toEqual(new Set(want))
    }
  })

  it('rejects the grips that omit the tone the quality is named for', () => {
    const cmaj9 = resolveDiagram({ token: 'C7M(9)', instrument: 'guitar' })
    expect(cmaj9.class).toBe('hit')
    if (cmaj9.class === 'hit' && cmaj9.voicing.frets) {
      expect(pitchClasses('guitar', cmaj9.voicing.frets).has(11)).toBe(true)
      expect(cmaj9.voicing.frets).not.toEqual(['x', 3, 2, 0, 3, 0])
    }

    const a69 = resolveDiagram({ token: 'A6(9)', instrument: 'guitar' })
    expect(a69.class).toBe('hit')
    if (a69.class === 'hit' && a69.voicing.frets) {
      expect(pitchClasses('guitar', a69.voicing.frets).has(11)).toBe(true)
      expect(a69.voicing.frets).not.toEqual(['x', 0, 2, 2, 2, 2])
    }

    const am7 = resolveDiagram({ token: 'Am7', instrument: 'ukulele' })
    expect(am7.class).toBe('hit')
    if (am7.class === 'hit' && am7.voicing.frets) {
      expect(pitchClasses('ukulele', am7.voicing.frets).has(7)).toBe(true)
    }

    const gdim = resolveDiagram({ token: 'Gdim', instrument: 'ukulele' })
    expect(gdim.class).toBe('hit')
    if (gdim.class === 'hit' && gdim.voicing.frets) {
      expect(gdim.voicing.frets).not.toEqual([0, 2, 3, 2])
    }
  })
})
```


### Callers / dependents (read-only context)

#### src/core/export-cho.ts:1-24

```ts
import { DIR, rewriteDefineLines } from './define'
import { transposeToken, usesFlats } from './transpose'

export function exportCho(
  source: string,
  opts?: { key?: string | null; semitones?: number; capo?: number },
): string {
  const n = opts?.semitones ?? 0
  const capo = opts?.capo ?? 0
  let out = source
  const keyMatch = source.match(/\{\s*key\s*:\s*([^}]*)\}/i)
  const sourceKey = keyMatch?.[1]?.trim() ?? opts?.key ?? null
  const flats = usesFlats(sourceKey)
  if (n) {
    out = rewriteDefineLines(
      out
        .replace(/\[([^\]]*)\]/g, (_, c: string) => `[${transposeToken(c, n, flats)}]`)
        .replace(/^(\s*\{\s*key\s*:\s*)([^}]*)\}/gim, (_, a: string, k: string) => {
          return `${a}${transposeToken(k.trim(), n, flats)}}`
        }),
      n,
      flats,
    )
  }
```

#### src/core/parse.ts:290-294

```ts
  const displayKey = view.meta.key ? transposeToken(view.meta.key, semis, flats) : null
  const defines = view.defines
    .map((d) => transposeDefine(d, semis, flats))
    .filter((d): d is ChordDefine => d !== null)
  return { ...view, sections, transposeSemitones: semis, displayKey, defines }
```

#### src/core/resolve-diagram.ts:61-71

```ts
function fromDefine(def: ChordDefine, want: Canonical): DiagramVoicing {
  const voicing: DiagramVoicing = {}
  if (def.frets?.length) {
    voicing.baseFret = def.baseFret ?? 1
    voicing.frets = [...def.frets]
  }
  if (def.fingers) voicing.fingers = [...def.fingers]
  if (def.keys?.length) {
    voicing.keys = pianoKeysToRelative(def.keys, want.rootPc, want.quality, want.bassPc)
  }
  return voicing
```


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

- Vue single-file components
- Color, font, and modal layout
- Auto-scroll timing
- Guitar and ukulele fret dictionary rows

## Out of scope for this review

- Style, naming, formatting unless they hide substantive issues
- Items in the Non-goals list above
- Files not in the diff or its direct dependents

## Artifacts to review

### Diff
Ref: 008249e63eaa9d65a4a51c379b8540f07bd5ddd9..4e0e1e539848c973f1a68d938a72914f17ac9995

---BEGIN DIFF---
diff --git a/src/core/chord-dict.ts b/src/core/chord-dict.ts
index 66f43c4..3e1c511 100644
--- a/src/core/chord-dict.ts
+++ b/src/core/chord-dict.ts
@@ -144,7 +144,8 @@ function scorePianoReadings(keys: readonly number[], rootPc: number, quality: st
 
 /**
  * Sounding pitch classes of the one piano reading, in key order.
- * A key outside 0–11 is already absolute: return mod 12 and skip the reading.
+ * Absolute marker: every key is >= 60. Only then return mod 12 and skip
+ * the reading. A 14 or 17 beside 0–11, or 48 52 55, stays on the heuristic.
  * Absolute: the stored classes. Relative: `(root + key) % 12`.
  * Draw stores those classes as intervals from the root.
  */
@@ -154,7 +155,7 @@ export function pianoSoundingPitchClasses(
   quality: string,
   bassPc: number | null = null,
 ): number[] {
-  if (keys.some((k) => k < 0 || k > 11)) return keys.map((k) => mod12(k))
+  if (keys.length > 0 && keys.every((k) => k >= 60)) return keys.map((k) => mod12(k))
   const { pcs, intervals, absSet, relSet, absScore, relScore } = scorePianoReadings(keys, rootPc, quality)
   const absolute = () => [...pcs]
   const relative = () => pcs.map((k) => mod12(rootPc + k))
diff --git a/src/core/define.ts b/src/core/define.ts
index add8b3d..7082830 100644
--- a/src/core/define.ts
+++ b/src/core/define.ts
@@ -195,10 +195,14 @@ function sameOrder(a: readonly number[], b: readonly number[]): boolean {
  * 0–11 keys: shift the draw's sounding classes, then keep the absolute list
  * or the relative list that the renamed chord reads back as that sequence.
  * When neither candidate reads that sequence, store 60 + pc. Do not throw.
- * A key outside 0–11 stays MIDI: add n, no wrap.
+ * Keys that are all >= 60 add n, then store 60 + (result mod 12).
+ * Any other key outside 0–11 adds n and does not wrap.
  */
 function transposePianoKeys(def: ChordDefine, n: number, flats: boolean): number[] {
   const keys = def.keys ?? []
+  if (keys.length > 0 && keys.every((k) => k >= 60)) {
+    return keys.map((k) => 60 + mod12(k + n))
+  }
   const midi = () => keys.map((k) => shiftKey(k, n))
   if (!keys.length || !keys.every(isPitchClass)) return midi()
   const parsed = parseChordToken(def.name)
@@ -227,8 +231,8 @@ function transposePianoKeys(def: ChordDefine, n: number, flats: boolean): number
  * Guitar/ukulele: bump `baseFret` when every slot is >0 or `x`; drop if any
  * string is open (fret 0) or the new base would fall below 1. Piano keys
  * inside 0–11 are stored so the renamed chord reads the shifted sounding
- * classes, or as 60 + pc when neither 0–11 candidate does. MIDI keys add n
- * and do not wrap.
+ * classes, or as 60 + pc when neither 0–11 candidate does. Keys that are
+ * all >= 60 add n and stay >= 60. Other keys outside 0–11 add n and do not wrap.
  */
 export function transposeDefine(def: ChordDefine, n: number, flats: boolean): ChordDefine | null {
   if (!n) return { ...def }
diff --git a/tests/core/define-directive.test.ts b/tests/core/define-directive.test.ts
index f483eba..6fb5f13 100644
--- a/tests/core/define-directive.test.ts
+++ b/tests/core/define-directive.test.ts
@@ -328,6 +328,25 @@ describe('transposeDefine', () => {
     expect(backDraw.lit).toEqual([0, 2])
     expect(backDraw.litNotes).toEqual(['C', 'D'])
   })
+
+  it('keeps D keys 62 64 at or above 60 after a -60 transpose', () => {
+    const raw = parseDefineDirective('{define: D keys 62 64}')
+    expect(raw.class).toBe('parse')
+    if (raw.class !== 'parse') return
+    expect(() => transposeDefine(raw, -60, false)).not.toThrow()
+    const shifted = transposeDefine(raw, -60, false)
+    expect(shifted).toMatchObject({ name: 'D', keys: [62, 64] })
+    expect(shifted?.keys?.every((k) => k >= 60)).toBe(true)
+    if (!shifted) return
+    const hit = resolveDiagram({ token: shifted.name, instrument: 'piano', overrides: [shifted] })
+    expect(hit.class).toBe('hit')
+    if (hit.class !== 'hit') return
+    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: shifted.name })
+    expect(draw.kind).toBe('piano')
+    if (draw.kind !== 'piano') return
+    expect(draw.lit).toEqual([2, 4])
+    expect(draw.litNotes).toEqual(['D', 'E'])
+  })
 })
 
 describe('transpose/setKey apply the same define rewrite as export', () => {
diff --git a/tests/core/resolve-diagram.test.ts b/tests/core/resolve-diagram.test.ts
index 616319d..6b59d0f 100644
--- a/tests/core/resolve-diagram.test.ts
+++ b/tests/core/resolve-diagram.test.ts
@@ -415,6 +415,20 @@ describe('resolveDiagram', () => {
     expect(backDraw.lit).toEqual([2, 9])
     expect(backDraw.litNotes).toEqual(['D', 'A'])
   })
+
+  it('draws D9 keys 0 4 7 14 as D F# A E', () => {
+    const raw = parseDefineDirective('{define: D9 keys 0 4 7 14}')
+    expect(raw.class).toBe('parse')
+    if (raw.class !== 'parse') return
+    const hit = resolveDiagram({ token: 'D9', instrument: 'piano', overrides: [raw] })
+    expect(hit.class).toBe('hit')
+    if (hit.class !== 'hit') return
+    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: 'D9' })
+    expect(draw.kind).toBe('piano')
+    if (draw.kind !== 'piano') return
+    expect(draw.lit).toEqual([2, 6, 9, 4])
+    expect(draw.litNotes).toEqual(['D', 'F#', 'A', 'E'])
+  })
 })
 
 const TUNING = {
---END DIFF---

### Modified files (full content for context)

#### src/core/chord-dict.ts

```ts
/**
 * Package chord dictionary: one lowest-open voicing per name.
 * Guitar is EADGBE (6). Ukulele is GCEA (4). No baritone.
 * Lookups use Object.hasOwn so prototype keys stay a miss.
 */

export type DictInstrument = 'guitar' | 'ukulele' | 'piano'
export type FretSlot = number | 'x'

export type DictVoicing = {
  instrument: DictInstrument
  baseFret?: number
  frets?: FretSlot[]
  fingers?: FretSlot[]
  keys?: number[]
}

/** Canonical quality → pitch-class intervals from the tonic. */
const QUALITY_INTERVALS: Record<string, number[]> = Object.create(null)
QUALITY_INTERVALS.major = [0, 4, 7]
QUALITY_INTERVALS.m = [0, 3, 7]
QUALITY_INTERVALS['5'] = [0, 7]
QUALITY_INTERVALS['6'] = [0, 4, 7, 9]
QUALITY_INTERVALS['6add9'] = [0, 4, 7, 9, 14]
QUALITY_INTERVALS['7'] = [0, 4, 7, 10]
QUALITY_INTERVALS['9'] = [0, 4, 7, 10, 14]
QUALITY_INTERVALS.add9 = [0, 4, 7, 14]
QUALITY_INTERVALS.maj7 = [0, 4, 7, 11]
QUALITY_INTERVALS.maj9 = [0, 4, 7, 11, 14]
QUALITY_INTERVALS.m6 = [0, 3, 7, 9]
QUALITY_INTERVALS.m7 = [0, 3, 7, 10]
QUALITY_INTERVALS.m9 = [0, 3, 7, 10, 14]
QUALITY_INTERVALS.m11 = [0, 3, 7, 10, 14, 17]
QUALITY_INTERVALS.sus2 = [0, 2, 7]
QUALITY_INTERVALS.sus4 = [0, 5, 7]
QUALITY_INTERVALS['7sus4'] = [0, 5, 7, 10]
QUALITY_INTERVALS.dim = [0, 3, 6]

/** 12 roots, C=0 … B=11. `x` mute; digits are fret numbers from the nut. */
const GUITAR: Record<string, string[]> = Object.create(null)
GUITAR.major = ['x32010', 'x43121', 'xx0232', 'xx1343', '022100', '133211', '244322', '320003', '431114', 'x02220', 'x13331', 'x24442']
GUITAR.m = ['x35543', 'x46654', 'xx0231', 'xx1342', '022000', '133111', '244222', '355333', '466444', 'x02210', 'x13321', 'x24432']
GUITAR['7'] = ['x32310', 'x43421', 'xx0212', 'xx1323', '020100', '131211', '242322', '320001', '431112', 'x02020', 'x13131', 'x21202']
GUITAR.maj7 = ['x32000', 'x43111', 'xx0222', 'xx1333', '021100', '132211', '243322', '320002', '431113', 'x02120', 'x13231', 'x24342']
GUITAR.m7 = ['x35343', 'x46454', 'xx0211', 'xx1322', '020000', '131111', '242222', '353333', '464444', 'x02010', 'x13121', 'x20202']
GUITAR.sus2 = ['x30013', 'x41124', 'xx0230', 'xx1341', '024400', '133013', '244124', '300233', '411344', 'x02200', 'x13311', 'x24422']
GUITAR.sus4 = ['x33011', 'x44122', 'xx0233', 'xx1344', '022200', '133311', '244422', '330013', '441124', 'x02230', 'x13341', 'x24452']
GUITAR['7sus4'] = ['x33311', 'x44422', 'xx0213', 'xx1324', '020200', '131311', '242422', '330011', '441122', 'x02030', 'x13141', 'x24252']
GUITAR.add9 = ['x32030', 'x43141', 'x54252', 'x65363', '024100', '133213', '244324', '320203', '431314', 'x02420', 'x13531', 'x24642']
GUITAR['5'] = ['x355xx', 'x466xx', 'xx023x', 'xx134x', '022xxx', '133xxx', '244xxx', '355xxx', '466xxx', 'x022xx', 'x133xx', 'x244xx']
GUITAR['6'] = ['x32210', 'x43321', 'xx0202', 'xx1313', '022120', '133231', '244342', '320000', '431111', 'x02222', 'x13333', 'x24444']
GUITAR['6add9'] = ['x32230', 'x43341', '000202', '111011', '022122', '133233', '244344', '320200', '431311', '022222', 'x10011', 'x21122']
GUITAR['9'] = ['x32330', 'x43441', 'xx0210', 'xx1321', '020102', '131213', '242324', '320201', '431312', 'x02000', 'x13111', 'x21222']
GUITAR.maj9 = ['020010', '131121', 'xx0220', 'xx1331', '021102', '132213', '243324', '320202', '431313', 'x02100', 'x13211', 'x24322']
GUITAR.m6 = ['x0101x', '012120', 'xx0201', 'xx1312', '022020', '133131', '244242', '355353', '466464', 'x02212', 'x13323', 'x24434']
GUITAR.m9 = ['x30343', 'x41454', 'x52565', 'x63676', '020002', '131113', '242224', '353335', '464446', 'x05500', 'x16611', 'x20222']
GUITAR.dim = ['x3454x', 'x4565x', 'xx0131', 'xx1242', '0120xx', '1231xx', '2342xx', '3453xx', '4564xx', 'x0121x', 'x1232x', 'x2343x']

const UKULELE: Record<string, string[]> = Object.create(null)
UKULELE.major = ['0003', '1114', '2220', '3331', '4442', '2010', '3121', '0232', '1343', '2100', '3211', '4322']
UKULELE.m = ['0333', '1444', '2210', '3321', '0432', '1543', '2120', '0231', '1342', '2000', '3111', '4222']
UKULELE['7'] = ['0001', '1112', '2223', '3334', '1202', '2313', '3424', '0212', '1323', '0100', '1211', '2322']
UKULELE.maj7 = ['0002', '1113', '2224', '3335', '1302', '2413', '3524', '0222', '1333', '1100', '2211', '3322']
UKULELE.m7 = ['0331', '1442', '2213', '3324', '0202', '1313', '2424', '0211', '1322', '0000', '1111', '2222']
UKULELE.sus2 = ['0233', '1344', '2200', '3311', '4422', '0013', '1124', '0230', '1341', '2402', '3513', '4624']
UKULELE.sus4 = ['0013', '1124', '2230', '3341', '4452', '3011', '4122', '0233', '1344', '2200', '3311', '4422']
UKULELE['7sus4'] = ['0011', '1122', '2233', '3344', '2202', '3313', '4424', '0213', '1324', '0200', '1311', '2422']
UKULELE.add9 = ['0203', '1314', '2420', '3531', '4642', '0010', '1121', '0252', '1363', '2102', '3213', '4324']
UKULELE['5'] = ['0033', '1144', '2255', 'x3x1', 'xx02', '5013', '6124', '0235', '13xx', '2400', '3511', '4622']
UKULELE['6'] = ['0000', '1111', '2222', '3333', '4444', '2213', '3324', '0202', '1313', '2424', '0211', '1322']
UKULELE['6add9'] = ['0200', '1311', '2422', '0011', '1122', '0210', '1321', '2202', '1011', '2122', '3233', '4344']
UKULELE['9'] = ['0201', '1312', '2423', '3534', '4645', '0310', '1421', '0570', '1021', '0102', '1213', '2324']
UKULELE.maj9 = ['0202', '1313', '2424', '3535', '1606', '0500', '1521', '0670', '0041', '1102', '2011', '3122']
UKULELE.m6 = ['0330', '1441', '2212', '3323', '0102', '1213', '2324', '0201', '1312', '2423', '0111', '1222']
UKULELE.m9 = ['3335', '1302', '5505', '6616', '0425', '1336', '1600', '0560', '1671', '0002', '1113', '2224']
UKULELE.dim = ['x323', '010x', '121x', 'x320', '0x01', '1x12', '2020', '01x1', '12x2', '23x3', 'x101', 'x212']

function decodeFrets(packed: string): FretSlot[] {
  const out: FretSlot[] = []
  for (const ch of packed) {
    if (ch === 'x') out.push('x')
    else out.push(Number(ch))
  }
  return out
}

export function pianoKeysOf(quality: string): number[] | null {
  if (!Object.hasOwn(QUALITY_INTERVALS, quality)) return null
  const keys = QUALITY_INTERVALS[quality]
  return keys ? [...keys] : null
}

function mod12(n: number): number {
  return ((n % 12) + 12) % 12
}

/** Tones that name the quality. A power chord's only characteristic tone is the fifth; other qualities drop the root and the fifth. */
function characteristicIntervals(quality: string, intervals: readonly number[]): number[] {
  if (quality === '5') return [7]
  const seen = new Set<number>()
  const out: number[] = []
  for (const iv of intervals) {
    const tone = mod12(iv)
    if (tone === 0 || tone === 7 || seen.has(tone)) continue
    seen.add(tone)
    out.push(tone)
  }
  return out
}

function characteristicCount(sounding: Set<number>, rootPc: number, tones: readonly number[]): number {
  const heard = new Set<number>()
  for (const pc of sounding) heard.add(mod12(pc - rootPc))
  let count = 0
  for (const tone of tones) {
    if (heard.has(tone)) count++
  }
  return count
}

type PianoReading = {
  pcs: number[]
  intervals: number[]
  absSet: Set<number>
  relSet: Set<number>
  absScore: number
  relScore: number
}

function scorePianoReadings(keys: readonly number[], rootPc: number, quality: string): PianoReading {
  const pcs = keys.map((k) => mod12(k))
  const intervals = pianoKeysOf(quality) ?? [0]
  const expected = intervals.map((iv) => mod12(rootPc + iv))
  const absSet = new Set(pcs)
  const relSet = new Set(pcs.map((k) => mod12(rootPc + k)))
  let absScore = 0
  let relScore = 0
  for (const pc of expected) {
    if (absSet.has(pc)) absScore++
    if (relSet.has(pc)) relScore++
  }
  return { pcs, intervals, absSet, relSet, absScore, relScore }
}

/**
 * Sounding pitch classes of the one piano reading, in key order.
 * Absolute marker: every key is >= 60. Only then return mod 12 and skip
 * the reading. A 14 or 17 beside 0–11, or 48 52 55, stays on the heuristic.
 * Absolute: the stored classes. Relative: `(root + key) % 12`.
 * Draw stores those classes as intervals from the root.
 */
export function pianoSoundingPitchClasses(
  keys: readonly number[],
  rootPc: number,
  quality: string,
  bassPc: number | null = null,
): number[] {
  if (keys.length > 0 && keys.every((k) => k >= 60)) return keys.map((k) => mod12(k))
  const { pcs, intervals, absSet, relSet, absScore, relScore } = scorePianoReadings(keys, rootPc, quality)
  const absolute = () => [...pcs]
  const relative = () => pcs.map((k) => mod12(rootPc + k))
  if (absScore > relScore) return absolute()
  if (relScore > absScore) return relative()
  // Score tie: a slash bass that sounds in only one reading picks that reading.
  if (bassPc != null) {
    const bass = mod12(bassPc)
    const inAbs = absSet.has(bass)
    const inRel = relSet.has(bass)
    if (inAbs !== inRel) return inAbs ? absolute() : relative()
  }
  const tones = characteristicIntervals(quality, intervals)
  if (characteristicCount(relSet, rootPc, tones) > characteristicCount(absSet, rootPc, tones)) return relative()
  return absolute()
}

/** File `{define}` keys may be absolute pitch classes; dictionary keys are intervals from the tonic. */
export function pianoKeysToRelative(
  keys: number[],
  rootPc: number,
  quality: string,
  bassPc: number | null = null,
): number[] {
  return pianoSoundingPitchClasses(keys, rootPc, quality, bassPc).map((pc) => mod12(pc - rootPc))
}

export function lookupDict(
  instrument: DictInstrument,
  rootPc: number,
  quality: string,
): DictVoicing | null {
  const pc = ((rootPc % 12) + 12) % 12
  if (instrument === 'piano') {
    const keys = pianoKeysOf(quality)
    if (!keys) return null
    return { instrument: 'piano', keys }
  }
  const table = instrument === 'guitar' ? GUITAR : UKULELE
  if (!Object.hasOwn(table, quality)) return null
  const packed = table[quality]?.[pc]
  if (!packed) return null
  const frets = decodeFrets(packed)
  const want = instrument === 'guitar' ? 6 : 4
  if (frets.length !== want) return null
  return { instrument, baseFret: 1, frets }
}
```

#### src/core/define.ts

```ts
/**
 * ChordPro `{define}` / `{define-guitar}` / `{define-ukulele}` — file override,
 * not package dictionary. Generic `{define:}` infers instrument from payload.
 */

import { pianoSoundingPitchClasses } from './chord-dict'
import { parseChordToken } from './parse-chord'
import { keyIndex, transposeToken } from './transpose'

export const DIR = /^\s*\{\s*([a-zA-Z_][a-zA-Z0-9_-]*)\s*:?\s*([^}]*)\}\s*$/

export type DefineDirective = 'define' | 'define-guitar' | 'define-ukulele'
export type DefineInstrument = 'guitar' | 'ukulele' | 'piano'

export type ChordDefine = {
  name: string
  instrument: DefineInstrument
  directive: DefineDirective
  baseFret?: number
  frets?: Array<number | 'x'>
  fingers?: Array<number | 'x'>
  keys?: number[]
}

export type DefineResult = ({ class: 'parse' } & ChordDefine) | { class: 'miss' }

const KEYWORDS = new Set(['base-fret', 'frets', 'fingers', 'keys'])

export function isDefineKey(k: string): boolean {
  const x = k.toLowerCase()
  return x === 'define' || x === 'define-guitar' || x === 'define-ukulele'
}

function miss(): DefineResult {
  return { class: 'miss' }
}

function parseFret(tok: string): number | 'x' | null {
  const t = tok.toLowerCase()
  if (t === 'x' || t === '-1') return 'x'
  if (/^\d+$/.test(tok)) return Number(tok)
  return null
}

function parseFinger(tok: string): number | 'x' | null {
  const t = tok.toLowerCase()
  if (t === 'x' || t === '-') return 'x'
  if (/^\d+$/.test(tok)) return Number(tok)
  return null
}

function takeValues(tokens: string[], from: number): { vals: string[]; next: number } {
  const vals: string[] = []
  let i = from
  while (i < tokens.length && !KEYWORDS.has((tokens[i] ?? '').toLowerCase())) {
    vals.push(tokens[i] ?? '')
    i++
  }
  return { vals, next: i }
}

function fmtSlots(xs: Array<number | 'x'>): string {
  return xs.map((v) => (v === 'x' ? 'x' : String(v))).join(' ')
}

export function parseDefineDirective(raw: string): DefineResult {
  const m = String(raw ?? '').match(DIR)
  if (!m) return miss()
  const key = (m[1] ?? '').toLowerCase()
  if (!isDefineKey(key)) return miss()
  const directive = key as DefineDirective
  const body = (m[2] ?? '').trim()
  if (!body) return miss()

  const tokens = body.split(/\s+/).filter(Boolean)
  const name = tokens[0] ?? ''
  if (!name) return miss()

  let baseFret: number | undefined
  let frets: Array<number | 'x'> | undefined
  let fingers: Array<number | 'x'> | undefined
  let keys: number[] | undefined
  let i = 1
  while (i < tokens.length) {
    const kw = (tokens[i] ?? '').toLowerCase()
    if (kw === 'base-fret') {
      const n = Number(tokens[i + 1])
      if (!Number.isFinite(n) || n < 1) return miss()
      baseFret = n
      i += 2
      continue
    }
    if (kw === 'frets') {
      const { vals, next } = takeValues(tokens, i + 1)
      const parsed: Array<number | 'x'> = []
      for (const v of vals) {
        const f = parseFret(v)
        if (f === null) return miss()
        parsed.push(f)
      }
      frets = parsed
      i = next
      continue
    }
    if (kw === 'fingers') {
      const { vals, next } = takeValues(tokens, i + 1)
      const parsed: Array<number | 'x'> = []
      for (const v of vals) {
        const f = parseFinger(v)
        if (f === null) return miss()
        parsed.push(f)
      }
      fingers = parsed
      i = next
      continue
    }
    if (kw === 'keys') {
      const { vals, next } = takeValues(tokens, i + 1)
      const parsed: number[] = []
      for (const v of vals) {
        const n = Number(v)
        if (!Number.isFinite(n) || !/^-?\d+$/.test(v)) return miss()
        parsed.push(n)
      }
      keys = parsed
      i = next
      continue
    }
    return miss()
  }

  let instrument: DefineInstrument | null = null
  if (directive === 'define-guitar') {
    if (frets?.length !== 6) return miss()
    instrument = 'guitar'
  } else if (directive === 'define-ukulele') {
    if (frets?.length !== 4) return miss()
    instrument = 'ukulele'
  } else if (keys && keys.length) {
    instrument = 'piano'
  } else if (frets?.length === 6) {
    instrument = 'guitar'
  } else if (frets?.length === 4) {
    instrument = 'ukulele'
  } else {
    return miss()
  }

  if (fingers && frets && fingers.length !== frets.length) return miss()
  if (fingers && !frets?.length) return miss()

  const parsed: DefineResult = {
    class: 'parse',
    name,
    instrument,
    directive,
  }
  if (keys?.length) parsed.keys = keys
  if (frets?.length) {
    parsed.baseFret = baseFret ?? 1
    parsed.frets = frets
  }
  if (fingers) parsed.fingers = fingers
  return parsed
}

export function serializeDefine(def: ChordDefine): string {
  let body = `${def.directive}: ${def.name}`
  if (def.frets?.length) {
    body += ` base-fret ${def.baseFret ?? 1} frets ${fmtSlots(def.frets)}`
    if (def.fingers) body += ` fingers ${fmtSlots(def.fingers)}`
  }
  if (def.keys?.length) body += ` keys ${def.keys.join(' ')}`
  return `{${body}}`
}

function isPitchClass(k: number): boolean {
  return k >= 0 && k <= 11
}

function mod12(n: number): number {
  return ((n % 12) + 12) % 12
}

function shiftKey(k: number, n: number): number {
  if (isPitchClass(k)) return mod12(k + n)
  return k + n
}

function sameOrder(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((pc, i) => pc === b[i])
}

/**
 * 0–11 keys: shift the draw's sounding classes, then keep the absolute list
 * or the relative list that the renamed chord reads back as that sequence.
 * When neither candidate reads that sequence, store 60 + pc. Do not throw.
 * Keys that are all >= 60 add n, then store 60 + (result mod 12).
 * Any other key outside 0–11 adds n and does not wrap.
 */
function transposePianoKeys(def: ChordDefine, n: number, flats: boolean): number[] {
  const keys = def.keys ?? []
  if (keys.length > 0 && keys.every((k) => k >= 60)) {
    return keys.map((k) => 60 + mod12(k + n))
  }
  const midi = () => keys.map((k) => shiftKey(k, n))
  if (!keys.length || !keys.every(isPitchClass)) return midi()
  const parsed = parseChordToken(def.name)
  if (parsed.class !== 'parse') return midi()
  const rootPc = keyIndex(parsed.root)
  if (rootPc === null) return midi()
  const bassPc = parsed.bass != null ? keyIndex(parsed.bass) : null
  if (parsed.bass != null && bassPc === null) return midi()
  const sounding = pianoSoundingPitchClasses(keys, rootPc, parsed.quality, bassPc)
  const shifted = sounding.map((k) => shiftKey(k, n))
  const renamed = parseChordToken(transposeToken(def.name, n, flats))
  if (renamed.class !== 'parse') return shifted
  const newRoot = keyIndex(renamed.root)
  if (newRoot === null) return shifted
  const newBass = renamed.bass != null ? keyIndex(renamed.bass) : null
  if (renamed.bass != null && newBass === null) return shifted
  const readsShifted = (candidate: readonly number[]) =>
    sameOrder(pianoSoundingPitchClasses(candidate, newRoot, renamed.quality, newBass), shifted)
  if (readsShifted(shifted)) return shifted
  const relative = shifted.map((pc) => mod12(pc - newRoot))
  if (readsShifted(relative)) return relative
  return shifted.map((pc) => 60 + pc)
}

/**
 * Guitar/ukulele: bump `baseFret` when every slot is >0 or `x`; drop if any
 * string is open (fret 0) or the new base would fall below 1. Piano keys
 * inside 0–11 are stored so the renamed chord reads the shifted sounding
 * classes, or as 60 + pc when neither 0–11 candidate does. Keys that are
 * all >= 60 add n and stay >= 60. Other keys outside 0–11 add n and do not wrap.
 */
export function transposeDefine(def: ChordDefine, n: number, flats: boolean): ChordDefine | null {
  if (!n) return { ...def }
  if (def.frets?.some((f) => f === 0)) return null
  const next: ChordDefine = { ...def, name: transposeToken(def.name, n, flats) }
  if (def.frets?.length) {
    const base = (def.baseFret ?? 1) + n
    if (base < 1) return null
    next.baseFret = base
  }
  if (def.keys?.length) next.keys = transposePianoKeys(def, n, flats)
  return next
}

export function transposeDefineLine(line: string, n: number, flats: boolean): string | null {
  const def = asChordDefine(parseDefineDirective(line))
  if (!def) return line
  const next = transposeDefine(def, n, flats)
  return next ? serializeDefine(next) : null
}

export function rewriteDefineLines(source: string, n: number, flats: boolean): string {
  if (!n) return source
  return String(source ?? '')
    .split('\n')
    .flatMap((line) => {
      if (!isDefineKey(line.match(DIR)?.[1] ?? '')) return [line]
      const next = transposeDefineLine(line, n, flats)
      return next == null ? [] : [next]
    })
    .join('\n')
}

export function asChordDefine(r: DefineResult): ChordDefine | null {
  if (r.class !== 'parse') return null
  const { class: _c, ...def } = r
  return def
}

/** Header keys the define block sits after — META_KEYS plus t/st/artist. */
const DEFINE_HEADER = new Set([
  'title',
  't',
  'subtitle',
  'st',
  'artist',
  'composer',
  'key',
  'transpose',
  'tempo',
  'time',
  'duration',
  'capo',
  'x_origem',
  'x_youtube',
  'x_strum',
  'x_strum_set',
])

/**
 * Rewrite `{define…}` lines: drop the old ones and land the block immediately
 * after the META_KEYS header, before the first lyric or comment.
 */
export function writeDefines(source: string, defines: ChordDefine[]): string {
  const lines = String(source ?? '')
    .split('\n')
    .filter((l) => {
      const m = l.match(DIR)
      return !(m && isDefineKey(m[1] ?? ''))
    })
  let lastMeta = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (!line.trim()) continue
    const m = line.match(DIR)
    const k = (m?.[1] ?? '').toLowerCase()
    if (m && DEFINE_HEADER.has(k)) {
      lastMeta = i
      continue
    }
    break
  }
  lines.splice(lastMeta + 1, 0, ...defines.map(serializeDefine))
  return lines.join('\n')
}
```

#### tests/core/define-directive.test.ts

```ts
import { describe, expect, it } from 'vitest'
import {
  META_KEYS,
  drawDiagram,
  exportCho,
  parse,
  parseDefineDirective,
  resolveDiagram,
  rewriteToKey,
  serializeDefine,
  setKey,
  transpose,
  writeDefines,
  writeMeta,
} from '../../src/core/index'
import { DIR, transposeDefine } from '../../src/core/define'
import { loadFixture } from '../helpers/load-fixture'

const GUITAR_AM =
  '{define-guitar: Am base-fret 1 frets x 0 2 2 1 0 fingers x 0 2 3 1 0}'
const UKE_C =
  '{define-ukulele: C base-fret 1 frets 0 0 0 3 fingers 0 0 0 3}'
const PIANO_C = '{define: C keys 0 4 7}'
const GENERIC_GUITAR = '{define: G base-fret 1 frets 3 2 0 0 0 3}'
const GENERIC_UKE = '{define: C frets 0 0 0 3}'

describe('DIR hyphenated define keys', () => {
  it('accepts define-guitar and define-ukulele as full keys', () => {
    const guitar = GUITAR_AM.match(DIR)
    expect(guitar?.[1]?.toLowerCase()).toBe('define-guitar')
    expect(guitar?.[2]?.trim().startsWith('Am')).toBe(true)

    const uke = UKE_C.match(DIR)
    expect(uke?.[1]?.toLowerCase()).toBe('define-ukulele')
    expect(uke?.[2]?.trim().startsWith('C')).toBe(true)

    const generic = PIANO_C.match(DIR)
    expect(generic?.[1]?.toLowerCase()).toBe('define')
  })
})

describe('parseDefineDirective', () => {
  it('reads frets, fingers, and base-fret on define-guitar', () => {
    const r = parseDefineDirective(GUITAR_AM)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(r.name).toBe('Am')
    expect(r.instrument).toBe('guitar')
    expect(r.directive).toBe('define-guitar')
    expect(r.baseFret).toBe(1)
    expect(r.frets).toEqual(['x', 0, 2, 2, 1, 0])
    expect(r.fingers).toEqual(['x', 0, 2, 3, 1, 0])
  })

  it('reads frets and fingers on define-ukulele', () => {
    const r = parseDefineDirective(UKE_C)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(r.name).toBe('C')
    expect(r.instrument).toBe('ukulele')
    expect(r.directive).toBe('define-ukulele')
    expect(r.frets).toEqual([0, 0, 0, 3])
    expect(r.fingers).toEqual([0, 0, 0, 3])
  })

  it('reads piano keys on generic define', () => {
    const r = parseDefineDirective(PIANO_C)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(r.name).toBe('C')
    expect(r.instrument).toBe('piano')
    expect(r.keys).toEqual([0, 4, 7])
    expect(r.frets).toBeUndefined()
  })

  it('infers guitar from 6 frets on generic define', () => {
    const r = parseDefineDirective(GENERIC_GUITAR)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(r.instrument).toBe('guitar')
    expect(r.directive).toBe('define')
    expect(r.frets).toHaveLength(6)
  })

  it('infers ukulele from 4 frets on generic define', () => {
    const r = parseDefineDirective(GENERIC_UKE)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(r.instrument).toBe('ukulele')
    expect(r.frets).toHaveLength(4)
  })

  it('keeps keys and guitar voicing on a mixed generic define', () => {
    const raw = '{define: C base-fret 1 frets 3 2 0 0 0 3 keys 0 4 7}'
    const r = parseDefineDirective(raw)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(r.instrument).toBe('piano')
    expect(r.directive).toBe('define')
    expect(r.frets).toEqual([3, 2, 0, 0, 0, 3])
    expect(r.baseFret).toBe(1)
    expect(r.keys).toEqual([0, 4, 7])
    const out = serializeDefine(r)
    expect(out).toContain('frets 3 2 0 0 0 3')
    expect(out).toContain('keys 0 4 7')
    expect(out).toContain('base-fret 1')
    expect(parseDefineDirective(out).class).toBe('parse')
  })

  it('treats unknown fret arity as miss', () => {
    expect(parseDefineDirective('{define: Am frets 0 1 2}').class).toBe('miss')
    expect(parseDefineDirective('{define: Am frets 0 1 2 3 4}').class).toBe('miss')
    expect(parseDefineDirective('{define: Am}').class).toBe('miss')
    expect(parseDefineDirective('{define: Am base-fret 1}').class).toBe('miss')
  })

  it('misses define-guitar without six frets', () => {
    expect(parseDefineDirective('{define-guitar: Am keys 0 4 7}').class).toBe('miss')
    expect(parseDefineDirective('{define-guitar: Am frets 0 0 0 3}').class).toBe('miss')
  })
})

describe('serializeDefine', () => {
  it('emits ChordPro text that round-trips', () => {
    const r = parseDefineDirective(GUITAR_AM)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const out = serializeDefine(r)
    expect(out).toMatch(/^\{define-guitar:\s/)
    expect(out).toContain('Am')
    expect(out).toContain('base-fret 1')
    expect(out).toContain('frets x 0 2 2 1 0')
    expect(out).toContain('fingers x 0 2 3 1 0')
    expect(parseDefineDirective(out)).toEqual(r)
  })

  it('emits piano keys on generic define', () => {
    const r = parseDefineDirective(PIANO_C)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const out = serializeDefine(r)
    expect(out).toBe('{define: C keys 0 4 7}')
  })
})

describe('parse() exposes defines', () => {
  it('collects hyphenated defines and keeps them out of lyrics', () => {
    const src = `{title:X}\n${GUITAR_AM}\n[Am]oi`
    const view = parse(src)
    expect(view.defines).toHaveLength(1)
    expect(view.defines[0]).toMatchObject({ name: 'Am', instrument: 'guitar' })
    const lyrics = view.sections.flatMap((s) => s.lines).filter((l) => l.type === 'lyrics')
    expect(lyrics).toHaveLength(1)
    if (lyrics[0]?.type !== 'lyrics') return
    expect(lyrics[0].words.some((w) => /define/.test(w.lyric))).toBe(false)
    expect(lyrics[0].words.some((w) => w.chord === 'Am')).toBe(true)
  })

  it('is exported from src/core/index.ts', () => {
    expect(typeof parseDefineDirective).toBe('function')
    expect(typeof serializeDefine).toBe('function')
  })
})

describe('writeDefines', () => {
  it('places the define block after META_KEYS header and before lyrics', () => {
    const r = parseDefineDirective(GUITAR_AM)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const src = '{title:X}\n{key:G}\n\n[G]letra\n{c:(nota)}'
    const out = writeDefines(src, [r])
    const lines = out.split('\n')
    const keyAt = lines.findIndex((l) => l.startsWith('{key:'))
    const defAt = lines.findIndex((l) => l.startsWith('{define-guitar:'))
    const lyricAt = lines.findIndex((l) => l.includes('[G]letra'))
    expect(defAt).toBeGreaterThan(keyAt)
    expect(lyricAt).toBeGreaterThan(defAt)
    expect(out).toContain('{title:X}')
    expect(out.match(/\{define-guitar:/g)).toHaveLength(1)
  })

  it('replaces existing define lines instead of stacking them', () => {
    const r = parseDefineDirective(GUITAR_AM)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const src = `{title:X}\n${UKE_C}\n[G]letra`
    const out = writeDefines(src, [r])
    expect(out).toContain('{define-guitar:')
    expect(out).not.toContain('{define-ukulele:')
  })
})

describe('writeMeta keeps defines', () => {
  it('leaves define lines in place and does not list them in META_KEYS', () => {
    const src = `{title:X}\n{key:G}\n${GUITAR_AM}\n[Am]oi`
    const out = writeMeta(src, { title: 'Y', key: 'G' })
    expect(out).toContain('{define-guitar:')
    expect(out).toContain('Am')
    expect(out).toContain('[Am]oi')
    expect(out).toContain('{title:Y}')
    expect(META_KEYS as readonly string[]).not.toContain('define')
    expect(META_KEYS as readonly string[]).not.toContain('define-guitar')
    expect(META_KEYS as readonly string[]).not.toContain('define-ukulele')
  })
})

describe('fixtures/define-roundtrip.cho', () => {
  it('has at least one {define-guitar:} used in tests', () => {
    const src = loadFixture('define-roundtrip.cho')
    expect(src).toMatch(/\{define-guitar:/)
    const view = parse(src)
    expect(view.defines.some((d) => d.instrument === 'guitar')).toBe(true)
  })
})

describe('transposeDefine', () => {
  it('returns null when any guitar fret is open', () => {
    const r = parseDefineDirective(GENERIC_GUITAR)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, 2, false)).toBeNull()
  })

  it('bumps base-fret when every slot is fretted or muted', () => {
    const r = parseDefineDirective('{define-guitar: F base-fret 1 frets 1 3 3 2 1 1}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, 2, false)).toMatchObject({
      name: 'G',
      baseFret: 3,
      frets: [1, 3, 3, 2, 1, 1],
    })
  })

  it('drops a barred guitar define whose base-fret would fall below 1', () => {
    const r = parseDefineDirective('{define-guitar: F base-fret 1 frets 1 3 3 2 1 1}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, -1, false)).toBeNull()
  })

  it('shifts piano keys and wraps pitch-classes 0–11', () => {
    const r = parseDefineDirective(PIANO_C)
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, 2, false)).toMatchObject({ name: 'D', keys: [2, 6, 9] })
    const b = parseDefineDirective('{define: B keys 11 3 6}')
    expect(b.class).toBe('parse')
    if (b.class !== 'parse') return
    expect(transposeDefine(b, 1, false)).toMatchObject({ name: 'C', keys: [0, 4, 7] })
  })

  it('adds n without wrapping keys outside 0–11', () => {
    const r = parseDefineDirective('{define: C keys 48 52 55}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, 2, false)).toMatchObject({ name: 'D', keys: [50, 54, 57] })
  })

  it('stores shifted sounding pitch classes for a relative piano spelling', () => {
    const r = parseDefineDirective('{define: D keys 0 4 7}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, 2, false)).toMatchObject({ name: 'E', keys: [4, 8, 11] })
  })

  it('stores the sounding classes of a relative tie, not the shifted intervals', () => {
    const r = parseDefineDirective('{define: F7sus4 keys 0 5 10}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    expect(transposeDefine(r, 2, false)).toMatchObject({ name: 'G7sus4', keys: [7, 0, 5] })
  })

  it('round-trips a relative sus2 through absolute pitch classes', () => {
    const r = parseDefineDirective('{define: Dsus2 keys 0 7}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const up = transposeDefine(r, 3, false)
    expect(up).toMatchObject({ name: 'Fsus2', keys: [5, 0] })
    if (!up) return
    expect(transposeDefine(up, -3, false)).toMatchObject({ name: 'Dsus2', keys: [2, 9] })
  })

  it('stores relative keys when absolute classes would be re-read on Gsus2', () => {
    const r = parseDefineDirective('{define: Dsus2 keys 0 7}')
    expect(r.class).toBe('parse')
    if (r.class !== 'parse') return
    const up = transposeDefine(r, 5, false)
    expect(up).toMatchObject({ name: 'Gsus2', keys: [0, 7] })
    if (!up) return
    expect(transposeDefine(up, -5, false)).toMatchObject({ name: 'Dsus2', keys: [2, 9] })
  })

  it('stores absolute MIDI keys when C keys 0 2 do not round-trip on D', () => {
    const line = '{define: C keys 0 2}'
    const raw = parseDefineDirective(line)
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    expect(() => transposeDefine(raw, 2, false)).not.toThrow()
    expect(transposeDefine(raw, 2, false)).toMatchObject({ name: 'D', keys: [62, 64] })

    const src = `${line}\n[C]`
    expect(() => transpose(parse(src), 2)).not.toThrow()
    expect(transpose(parse(src), 2).defines).toMatchObject([{ name: 'D', keys: [62, 64] }])
    expect(() => exportCho(src, { semitones: 2 })).not.toThrow()
    const out = exportCho(src, { semitones: 2 })
    const exported = parse(out).defines[0]
    expect(exported).toMatchObject({ name: 'D', keys: [62, 64] })
    if (!exported) return
    const hit = resolveDiagram({ token: exported.name, instrument: 'piano', overrides: [exported] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: exported.name })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([2, 4])
    expect(draw.litNotes).toEqual(['D', 'E'])

    const back = transposeDefine(exported, -2, false)
    expect(back).toMatchObject({ name: 'C', keys: [60, 62] })
    if (!back) return
    const backHit = resolveDiagram({ token: back.name, instrument: 'piano', overrides: [back] })
    expect(backHit.class).toBe('hit')
    if (backHit.class !== 'hit') return
    const backDraw = drawDiagram({ instrument: 'piano', voicing: backHit.voicing, token: back.name })
    expect(backDraw.kind).toBe('piano')
    if (backDraw.kind !== 'piano') return
    expect(backDraw.lit).toEqual([0, 2])
    expect(backDraw.litNotes).toEqual(['C', 'D'])
  })

  it('keeps D keys 62 64 at or above 60 after a -60 transpose', () => {
    const raw = parseDefineDirective('{define: D keys 62 64}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    expect(() => transposeDefine(raw, -60, false)).not.toThrow()
    const shifted = transposeDefine(raw, -60, false)
    expect(shifted).toMatchObject({ name: 'D', keys: [62, 64] })
    expect(shifted?.keys?.every((k) => k >= 60)).toBe(true)
    if (!shifted) return
    const hit = resolveDiagram({ token: shifted.name, instrument: 'piano', overrides: [shifted] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: shifted.name })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([2, 4])
    expect(draw.litNotes).toEqual(['D', 'E'])
  })
})

describe('transpose/setKey apply the same define rewrite as export', () => {
  it('drops the open-G override from view.defines', () => {
    const src = loadFixture('define-roundtrip.cho')
    const view = parse(src)
    expect(view.defines).toHaveLength(1)
    expect(transpose(view, 2).defines).toEqual([])
    expect(setKey(view, 'A').defines).toEqual([])
  })
})

describe('rewriteToKey rewrites define lines before writeMeta', () => {
  it('omits an open-string guitar define', () => {
    const src = '{title:X}\n{key:G}\n{define-guitar: G base-fret 1 frets 3 2 0 0 0 3}\n[G]oi'
    const r = rewriteToKey(src, 'A')
    expect(r).not.toBeNull()
    expect(r!.source).not.toMatch(/\{define-guitar:/)
    expect(r!.source).toMatch(/\[A\]/)
    expect(r!.source).toMatch(/\{key:A\}/)
  })

  it('bumps a barred guitar define with the same delta as the body', () => {
    const src = '{title:X}\n{key:C}\n{define-guitar: F base-fret 1 frets 1 3 3 2 1 1}\n[F]oi'
    const r = rewriteToKey(src, 'G')
    expect(r).not.toBeNull()
    expect(r!.source).toMatch(/\{define-guitar:\s*G\b/)
    expect(r!.source).toContain('base-fret 3')
    expect(r!.source).toMatch(/\[G\]/)
  })
})

```

#### tests/core/resolve-diagram.test.ts

```ts
import { describe, expect, it } from 'vitest'
import {
  drawDiagram,
  parseChordToken,
  resolveDiagram,
  type ChordDefine,
} from '../../src/core/index'
import { parseDefineDirective, transposeDefine } from '../../src/core/define'
import { keyIndex } from '../../src/core/transpose'

const AM_OVERRIDE: ChordDefine = {
  name: 'Am',
  instrument: 'guitar',
  directive: 'define-guitar',
  baseFret: 1,
  frets: ['x', 0, 1, 2, 2, 0],
  fingers: ['x', 0, 1, 3, 2, 0],
}

describe('resolveDiagram', () => {
  it('is exported from src/core/index.ts', () => {
    expect(typeof resolveDiagram).toBe('function')
  })

  it('hits C7M as the maj7 voicing', () => {
    const guitar = resolveDiagram({ token: 'C7M', instrument: 'guitar' })
    expect(guitar.class).toBe('hit')
    if (guitar.class !== 'hit') return
    expect(guitar.source).toBe('dictionary')
    expect(guitar.voicing.frets).toEqual(['x', 3, 2, 0, 0, 0])
    expect(guitar.voicing.frets).toHaveLength(6)

    const piano = resolveDiagram({ token: 'C7M', instrument: 'piano' })
    expect(piano.class).toBe('hit')
    if (piano.class !== 'hit') return
    expect(piano.voicing.keys).toEqual([0, 4, 7, 11])
  })

  it('misses C7+ instead of guessing aug or maj7', () => {
    const r = resolveDiagram({ token: 'C7+', instrument: 'guitar' })
    expect(r.class).toBe('miss')
    if (r.class !== 'miss') return
    expect(r.reason).toBe('unknown-token')
  })

  it('prefers a file override over the package dictionary', () => {
    const dict = resolveDiagram({ token: 'Am', instrument: 'guitar' })
    expect(dict.class).toBe('hit')
    if (dict.class !== 'hit') return
    expect(dict.source).toBe('dictionary')
    expect(dict.voicing.frets).toEqual(['x', 0, 2, 2, 1, 0])

    const over = resolveDiagram({
      token: 'Am',
      instrument: 'guitar',
      overrides: [AM_OVERRIDE],
    })
    expect(over.class).toBe('hit')
    if (over.class !== 'hit') return
    expect(over.source).toBe('override')
    expect(over.voicing.frets).toEqual(['x', 0, 1, 2, 2, 0])
    expect(over.voicing.fingers).toEqual(['x', 0, 1, 3, 2, 0])
    expect(over.voicing.frets).not.toEqual(dict.voicing.frets)
  })

  it('matches an override by canonical quality so C7M hits a Cmaj7 define', () => {
    const def: ChordDefine = {
      name: 'Cmaj7',
      instrument: 'guitar',
      directive: 'define-guitar',
      baseFret: 1,
      frets: ['x', 3, 2, 0, 0, 3],
    }
    const r = resolveDiagram({ token: 'C7M', instrument: 'guitar', overrides: [def] })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    expect(r.source).toBe('override')
    expect(r.voicing.frets).toEqual(['x', 3, 2, 0, 0, 3])
  })

  it('uses the guitar token as shapeName, not the concert lyric', () => {
    const shape = resolveDiagram({ token: 'Am', instrument: 'guitar' })
    const concert = resolveDiagram({ token: 'Bm', instrument: 'guitar' })
    expect(shape.class).toBe('hit')
    expect(concert.class).toBe('hit')
    if (shape.class !== 'hit' || concert.class !== 'hit') return
    expect(shape.voicing.frets).toEqual(['x', 0, 2, 2, 1, 0])
    expect(concert.voicing.frets).not.toEqual(shape.voicing.frets)
  })

  it('uses the piano token as concert', () => {
    const r = resolveDiagram({ token: 'Bm', instrument: 'piano' })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    expect(r.voicing.keys).toEqual([0, 3, 7])
    expect(r.voicing.frets).toBeUndefined()
  })

  it('does not apply a guitar override to piano', () => {
    const r = resolveDiagram({
      token: 'Am',
      instrument: 'piano',
      overrides: [AM_OVERRIDE],
    })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    expect(r.source).toBe('dictionary')
    expect(r.voicing.keys).toEqual([0, 3, 7])
  })

  it('returns one voicing per name — the lowest open', () => {
    const c = resolveDiagram({ token: 'C', instrument: 'guitar' })
    expect(c.class).toBe('hit')
    if (c.class !== 'hit') return
    expect(c.voicing.frets).toEqual(['x', 3, 2, 0, 1, 0])
    const again = resolveDiagram({ token: 'C', instrument: 'guitar' })
    expect(again).toEqual(c)
  })

  it('ships ukulele GCEA (four strings) and not baritone', () => {
    const uke = resolveDiagram({ token: 'C', instrument: 'ukulele' })
    expect(uke.class).toBe('hit')
    if (uke.class !== 'hit') return
    expect(uke.voicing.frets).toEqual([0, 0, 0, 3])
    expect(uke.voicing.frets).toHaveLength(4)
  })

  it('classifies quote junk as unknown-token', () => {
    const r = resolveDiagram({ token: 'A4"', instrument: 'guitar' })
    expect(r.class).toBe('miss')
    if (r.class !== 'miss') return
    expect(r.reason).toBe('unknown-token')
  })

  it('classifies a parsed name with no voicing as no-shape', () => {
    const r = resolveDiagram({ token: 'Cm7(11)', instrument: 'ukulele' })
    expect(r.class).toBe('miss')
    if (r.class !== 'miss') return
    expect(r.reason).toBe('no-shape')
  })

  it('does not inherit Object.prototype keys as a dictionary hit', () => {
    for (const token of ['CtoString', 'Cconstructor']) {
      const r = resolveDiagram({ token, instrument: 'guitar' })
      expect(r.class, token).toBe('miss')
      if (r.class !== 'miss') continue
      expect(r.reason, token).toBe('unknown-token')
    }
  })

  it('G/B guitar is a miss without a matching bass override', () => {
    const r = resolveDiagram({ token: 'G/B', instrument: 'guitar' })
    expect(r.class).toBe('miss')
    if (r.class !== 'miss') return
    expect(r.reason).toBe('no-shape')
  })

  it('hits G/B from {define-guitar: G/B ...}', () => {
    const def: ChordDefine = {
      name: 'G/B',
      instrument: 'guitar',
      directive: 'define-guitar',
      baseFret: 1,
      frets: ['x', 2, 0, 0, 0, 3],
    }
    const r = resolveDiagram({ token: 'G/B', instrument: 'guitar', overrides: [def] })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    expect(r.source).toBe('override')
    expect(r.voicing.frets).toEqual(['x', 2, 0, 0, 0, 3])
  })

  it('does not match G/B against {define-guitar: G}', () => {
    const def: ChordDefine = {
      name: 'G',
      instrument: 'guitar',
      directive: 'define-guitar',
      baseFret: 1,
      frets: [3, 2, 0, 0, 0, 3],
    }
    const r = resolveDiagram({ token: 'G/B', instrument: 'guitar', overrides: [def] })
    expect(r.class).toBe('miss')
    if (r.class !== 'miss') return
    expect(r.reason).toBe('no-shape')
  })

  it('piano override absolute keys light A C E for Am', () => {
    const def: ChordDefine = {
      name: 'Am',
      instrument: 'piano',
      directive: 'define',
      keys: [9, 0, 4],
    }
    const r = resolveDiagram({ token: 'Am', instrument: 'piano', overrides: [def] })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    expect(r.source).toBe('override')
    expect(r.voicing.keys).toEqual([0, 3, 7])
    const d = drawDiagram({ instrument: 'piano', voicing: r.voicing, token: 'Am' })
    expect(d.kind).toBe('piano')
    if (d.kind !== 'piano') return
    expect(d.lit.slice().sort((a, b) => a - b)).toEqual([0, 4, 9])
    expect(new Set(d.litNotes)).toEqual(new Set(['A', 'C', 'E']))
  })

  it('treats a piano-key score tie as absolute', () => {
    const g7sus4 = resolveDiagram({
      token: 'G7sus4',
      instrument: 'piano',
      overrides: [
        { name: 'G7sus4', instrument: 'piano', directive: 'define', keys: [7, 0, 5] },
      ],
    })
    expect(g7sus4.class).toBe('hit')
    if (g7sus4.class !== 'hit') return
    expect(g7sus4.voicing.keys).toEqual([0, 5, 10])
    const d7 = drawDiagram({ instrument: 'piano', voicing: g7sus4.voicing, token: 'G7sus4' })
    expect(d7.kind).toBe('piano')
    if (d7.kind !== 'piano') return
    expect(d7.litNotes).toEqual(['G', 'C', 'F'])

    const gsus4 = resolveDiagram({
      token: 'Gsus4',
      instrument: 'piano',
      overrides: [{ name: 'Gsus4', instrument: 'piano', directive: 'define', keys: [7, 0] }],
    })
    expect(gsus4.class).toBe('hit')
    if (gsus4.class !== 'hit') return
    expect(gsus4.voicing.keys).toEqual([0, 5])
    const ds = drawDiagram({ instrument: 'piano', voicing: gsus4.voicing, token: 'Gsus4' })
    expect(ds.kind).toBe('piano')
    if (ds.kind !== 'piano') return
    expect(ds.litNotes).toEqual(['G', 'C'])

    const rel = resolveDiagram({
      token: 'Am',
      instrument: 'piano',
      overrides: [{ name: 'Am', instrument: 'piano', directive: 'define', keys: [0, 3, 7] }],
    })
    expect(rel.class).toBe('hit')
    if (rel.class !== 'hit') return
    expect(rel.voicing.keys).toEqual([0, 3, 7])
    const dRel = drawDiagram({ instrument: 'piano', voicing: rel.voicing, token: 'Am' })
    expect(dRel.kind).toBe('piano')
    if (dRel.kind !== 'piano') return
    expect(dRel.litNotes).toEqual(['A', 'C', 'E'])

    const c = resolveDiagram({
      token: 'C',
      instrument: 'piano',
      overrides: [{ name: 'C', instrument: 'piano', directive: 'define', keys: [0, 4, 7] }],
    })
    expect(c.class).toBe('hit')
    if (c.class !== 'hit') return
    expect(c.voicing.keys).toEqual([0, 4, 7])
    const dC = drawDiagram({ instrument: 'piano', voicing: c.voicing, token: 'C' })
    expect(dC.kind).toBe('piano')
    if (dC.kind !== 'piano') return
    expect(dC.litNotes).toEqual(['C', 'E', 'G'])
  })

  it('keeps a relative piano-key tie when its characteristic tones win', () => {
    const f7sus4 = resolveDiagram({
      token: 'F7sus4',
      instrument: 'piano',
      overrides: [
        { name: 'F7sus4', instrument: 'piano', directive: 'define', keys: [0, 5, 10] },
      ],
    })
    expect(f7sus4.class).toBe('hit')
    if (f7sus4.class !== 'hit') return
    expect(f7sus4.voicing.keys).toEqual([0, 5, 10])
    const d = drawDiagram({ instrument: 'piano', voicing: f7sus4.voicing, token: 'F7sus4' })
    expect(d.kind).toBe('piano')
    if (d.kind !== 'piano') return
    expect(d.lit).toEqual([5, 10, 3])
    expect(d.litNotes).toEqual(['F', 'A#', 'D#'])
  })

  it('breaks a piano-key score tie toward the slash bass that sounds in only one reading', () => {
    const r = resolveDiagram({
      token: 'D7M(9)/B',
      instrument: 'piano',
      overrides: [
        { name: 'D7M(9)/B', instrument: 'piano', directive: 'define', keys: [11, 2, 1, 4] },
      ],
    })
    expect(r.class).toBe('hit')
    if (r.class !== 'hit') return
    const d = drawDiagram({ instrument: 'piano', voicing: r.voicing, token: 'D7M(9)/B' })
    expect(d.kind).toBe('piano')
    if (d.kind !== 'piano') return
    expect(d.lit).toEqual([11, 2, 1, 4])
    expect(d.litNotes).toEqual(['B', 'D', 'C#', 'E'])
  })

  it('draws a transposed relative piano define as the new chord', () => {
    const raw = parseDefineDirective('{define: D keys 0 4 7}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const plain = resolveDiagram({ token: 'D', instrument: 'piano', overrides: [raw] })
    expect(plain.class).toBe('hit')
    if (plain.class !== 'hit') return
    const plainDraw = drawDiagram({ instrument: 'piano', voicing: plain.voicing, token: 'D' })
    expect(plainDraw.kind).toBe('piano')
    if (plainDraw.kind !== 'piano') return
    expect(plainDraw.litNotes).toEqual(['D', 'F#', 'A'])

    const shifted = transposeDefine(raw, 2, false)
    expect(shifted).toMatchObject({ name: 'E', keys: [4, 8, 11] })
    if (!shifted) return
    const hit = resolveDiagram({ token: shifted.name, instrument: 'piano', overrides: [shifted] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: shifted.name })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.litNotes).toEqual(['E', 'G#', 'B'])

    const c = parseDefineDirective('{define: C keys 0 4 7}')
    expect(c.class).toBe('parse')
    if (c.class !== 'parse') return
    const cShift = transposeDefine(c, 2, false)
    expect(cShift).toMatchObject({ name: 'D', keys: [2, 6, 9] })
    if (!cShift) return
    const cHit = resolveDiagram({ token: cShift.name, instrument: 'piano', overrides: [cShift] })
    expect(cHit.class).toBe('hit')
    if (cHit.class !== 'hit') return
    const cDraw = drawDiagram({ instrument: 'piano', voicing: cHit.voicing, token: cShift.name })
    expect(cDraw.kind).toBe('piano')
    if (cDraw.kind !== 'piano') return
    expect(cDraw.litNotes).toEqual(['D', 'F#', 'A'])
  })

  it('draws F7sus4 and its +2 transpose from the same relative reading', () => {
    const raw = parseDefineDirective('{define: F7sus4 keys 0 5 10}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const plain = resolveDiagram({ token: 'F7sus4', instrument: 'piano', overrides: [raw] })
    expect(plain.class).toBe('hit')
    if (plain.class !== 'hit') return
    const plainDraw = drawDiagram({ instrument: 'piano', voicing: plain.voicing, token: 'F7sus4' })
    expect(plainDraw.kind).toBe('piano')
    if (plainDraw.kind !== 'piano') return
    expect(plainDraw.lit).toEqual([5, 10, 3])
    expect(plainDraw.litNotes).toEqual(['F', 'A#', 'D#'])

    const shifted = transposeDefine(raw, 2, false)
    expect(shifted).toMatchObject({ name: 'G7sus4', keys: [7, 0, 5] })
    if (!shifted) return
    const hit = resolveDiagram({ token: shifted.name, instrument: 'piano', overrides: [shifted] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: shifted.name })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([7, 0, 5])
    expect(draw.litNotes).toEqual(['G', 'C', 'F'])
  })

  it('round-trips Dsus2 keys 0 7 through +3 and back to D A', () => {
    const raw = parseDefineDirective('{define: Dsus2 keys 0 7}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const up = transposeDefine(raw, 3, false)
    expect(up).toMatchObject({ name: 'Fsus2', keys: [5, 0] })
    if (!up) return
    const upHit = resolveDiagram({ token: up.name, instrument: 'piano', overrides: [up] })
    expect(upHit.class).toBe('hit')
    if (upHit.class !== 'hit') return
    const upDraw = drawDiagram({ instrument: 'piano', voicing: upHit.voicing, token: up.name })
    expect(upDraw.kind).toBe('piano')
    if (upDraw.kind !== 'piano') return
    expect(upDraw.lit).toEqual([5, 0])
    expect(upDraw.litNotes).toEqual(['F', 'C'])

    const back = transposeDefine(up, -3, false)
    expect(back).toMatchObject({ name: 'Dsus2', keys: [2, 9] })
    if (!back) return
    const backHit = resolveDiagram({ token: back.name, instrument: 'piano', overrides: [back] })
    expect(backHit.class).toBe('hit')
    if (backHit.class !== 'hit') return
    const backDraw = drawDiagram({ instrument: 'piano', voicing: backHit.voicing, token: back.name })
    expect(backDraw.kind).toBe('piano')
    if (backDraw.kind !== 'piano') return
    expect(backDraw.lit).toEqual([2, 9])
    expect(backDraw.litNotes).toEqual(['D', 'A'])
  })

  it('round-trips Dsus2 keys 0 7 through +5 to G D and back to D A', () => {
    const raw = parseDefineDirective('{define: Dsus2 keys 0 7}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const up = transposeDefine(raw, 5, false)
    expect(up).toMatchObject({ name: 'Gsus2', keys: [0, 7] })
    if (!up) return
    const upHit = resolveDiagram({ token: up.name, instrument: 'piano', overrides: [up] })
    expect(upHit.class).toBe('hit')
    if (upHit.class !== 'hit') return
    const upDraw = drawDiagram({ instrument: 'piano', voicing: upHit.voicing, token: up.name })
    expect(upDraw.kind).toBe('piano')
    if (upDraw.kind !== 'piano') return
    expect(upDraw.lit).toEqual([7, 2])
    expect(upDraw.litNotes).toEqual(['G', 'D'])

    const back = transposeDefine(up, -5, false)
    expect(back).toMatchObject({ name: 'Dsus2', keys: [2, 9] })
    if (!back) return
    const backHit = resolveDiagram({ token: back.name, instrument: 'piano', overrides: [back] })
    expect(backHit.class).toBe('hit')
    if (backHit.class !== 'hit') return
    const backDraw = drawDiagram({ instrument: 'piano', voicing: backHit.voicing, token: back.name })
    expect(backDraw.kind).toBe('piano')
    if (backDraw.kind !== 'piano') return
    expect(backDraw.lit).toEqual([2, 9])
    expect(backDraw.litNotes).toEqual(['D', 'A'])
  })

  it('draws D9 keys 0 4 7 14 as D F# A E', () => {
    const raw = parseDefineDirective('{define: D9 keys 0 4 7 14}')
    expect(raw.class).toBe('parse')
    if (raw.class !== 'parse') return
    const hit = resolveDiagram({ token: 'D9', instrument: 'piano', overrides: [raw] })
    expect(hit.class).toBe('hit')
    if (hit.class !== 'hit') return
    const draw = drawDiagram({ instrument: 'piano', voicing: hit.voicing, token: 'D9' })
    expect(draw.kind).toBe('piano')
    if (draw.kind !== 'piano') return
    expect(draw.lit).toEqual([2, 6, 9, 4])
    expect(draw.litNotes).toEqual(['D', 'F#', 'A', 'E'])
  })
})

const TUNING = {
  guitar: [4, 9, 2, 7, 11, 4],
  ukulele: [7, 0, 4, 9],
} as const

const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

/**
 * Intervals from the tonic. 14 sounds as 2 and 17 sounds as 5, so those
 * are already reduced here. A sounding pitch class outside `allowed` is
 * illegal. `required` must be present. The fifth (7) may be omitted when
 * it is allowed. The root may be omitted once `required` is present.
 * Shell (9 and maj9 only): the major third may be omitted when the
 * characteristic seventh and the ninth are both present.
 */
const CHORD_ORACLE: Record<
  string,
  { allowed: number[]; required: number[]; shell?: { seventh: number; ninth: number; third: number } }
> = {
  major: { allowed: [0, 4, 7], required: [4] },
  m: { allowed: [0, 3, 7], required: [3] },
  '5': { allowed: [0, 7], required: [7] },
  '6': { allowed: [0, 4, 7, 9], required: [4, 9] },
  '6add9': { allowed: [0, 4, 7, 9, 2], required: [4, 9, 2] },
  '7': { allowed: [0, 4, 7, 10], required: [4, 10] },
  '9': { allowed: [0, 4, 7, 10, 2], required: [10, 2], shell: { seventh: 10, ninth: 2, third: 4 } },
  add9: { allowed: [0, 4, 7, 2], required: [4, 2] },
  maj7: { allowed: [0, 4, 7, 11], required: [4, 11] },
  maj9: { allowed: [0, 4, 7, 11, 2], required: [11, 2], shell: { seventh: 11, ninth: 2, third: 4 } },
  m6: { allowed: [0, 3, 7, 9], required: [3, 9] },
  m7: { allowed: [0, 3, 7, 10], required: [3, 10] },
  m9: { allowed: [0, 3, 7, 10, 2], required: [3, 10, 2] },
  sus2: { allowed: [0, 2, 7], required: [2] },
  sus4: { allowed: [0, 5, 7], required: [5] },
  '7sus4': { allowed: [0, 5, 7, 10], required: [5, 10] },
  dim: { allowed: [0, 3, 6], required: [3, 6] },
}

const GRID: { quality: string; suffix: string; aliases?: string[] }[] = [
  { quality: 'major', suffix: '' },
  { quality: 'm', suffix: 'm' },
  { quality: '5', suffix: '5' },
  { quality: '6', suffix: '6' },
  { quality: '6add9', suffix: '6(9)' },
  { quality: '7', suffix: '7' },
  { quality: '9', suffix: '7(9)' },
  { quality: 'add9', suffix: '9' },
  { quality: 'maj7', suffix: 'maj7', aliases: ['7M', 'M7'] },
  { quality: 'maj9', suffix: '7M(9)' },
  { quality: 'm6', suffix: 'm6' },
  { quality: 'm7', suffix: 'm7' },
  { quality: 'm9', suffix: 'm9' },
  { quality: 'sus2', suffix: 'sus2', aliases: ['2'] },
  { quality: 'sus4', suffix: 'sus4', aliases: ['4', 'sus'] },
  { quality: '7sus4', suffix: '7sus4', aliases: ['7(4)'] },
  { quality: 'dim', suffix: 'dim', aliases: ['º', '°'] },
]

/** Parser spellings that share a pitch class. E#=F, Fb=E, B#=C, Cb=B. */
const ENHARMONIC: ReadonlyArray<readonly [string, string]> = [
  ['C#', 'Db'],
  ['D#', 'Eb'],
  ['F#', 'Gb'],
  ['G#', 'Ab'],
  ['A#', 'Bb'],
  ['E#', 'F'],
  ['Fb', 'E'],
  ['B#', 'C'],
  ['Cb', 'B'],
]

const M11 = [0, 3, 7, 10, 2, 5] as const

function pitchClasses(instrument: 'guitar' | 'ukulele', frets: Array<number | 'x'>): Set<number> {
  const open = TUNING[instrument]
  const pcs = new Set<number>()
  for (let i = 0; i < open.length; i++) {
    const fret = frets[i]
    if (fret === 'x' || fret === undefined) continue
    pcs.add((open[i]! + fret) % 12)
  }
  return pcs
}

function oracleFailure(quality: string, rootPc: number, sounded: Set<number>): string | null {
  const spec = CHORD_ORACLE[quality]
  if (!spec) return `no oracle for ${quality}`
  const rel = new Set([...sounded].map((pc) => (pc - rootPc + 12) % 12))
  const allowed = new Set(spec.allowed)
  const foreign = [...rel].filter((tone) => !allowed.has(tone))
  if (foreign.length) return `foreign ${foreign.join(',')}`
  const missing = spec.required.filter((tone) => !rel.has(tone))
  if (missing.length) return `missing ${missing.join(',')}`
  if (spec.shell) {
    const shell = rel.has(spec.shell.seventh) && rel.has(spec.shell.ninth)
    if (!shell && !rel.has(spec.shell.third)) return 'missing third'
  }
  if (rel.size === 0) return 'silent'
  return null
}

function dictionaryFrets(
  token: string,
  instrument: 'guitar' | 'ukulele',
): { frets: Array<number | 'x'> } | { error: string } {
  const r = resolveDiagram({ token, instrument })
  if (r.class !== 'hit') return { error: r.reason }
  if (r.source !== 'dictionary') return { error: `source ${r.source}` }
  const frets = r.voicing.frets
  if (!frets?.length) return { error: 'no frets' }
  const want = instrument === 'guitar' ? 6 : 4
  if (frets.length !== want) return { error: `length ${frets.length}` }
  for (const fret of frets) {
    if (fret === 'x') continue
    if (!Number.isInteger(fret) || fret < 0 || fret > 9) return { error: `fret ${String(fret)}` }
  }
  return { frets }
}

describe('dictionary chord identity', () => {
  it('hits every dictionary quality on all 12 roots for guitar and ukulele', () => {
    const failures: string[] = []
    let checked = 0
    for (const instrument of ['guitar', 'ukulele'] as const) {
      for (const root of ROOTS) {
        const rootPc = keyIndex(root)
        if (rootPc === null) {
          failures.push(`${root}: no pitch class`)
          continue
        }
        for (const row of GRID) {
          const token = `${root}${row.suffix}`
          const parsed = parseChordToken(token)
          if (parsed.class !== 'parse' || parsed.quality !== row.quality) {
            failures.push(`${token}: quality ${parsed.class === 'parse' ? parsed.quality : parsed.class}`)
            continue
          }
          checked++
          const got = dictionaryFrets(token, instrument)
          if ('error' in got) {
            failures.push(`${instrument} ${token}: ${got.error}`)
            continue
          }
          const why = oracleFailure(row.quality, rootPc, pitchClasses(instrument, got.frets))
          if (why) failures.push(`${instrument} ${token} ${got.frets.join('')}: ${why}`)
          for (const alias of row.aliases ?? []) {
            const aliasToken = `${root}${alias}`
            const aliasParsed = parseChordToken(aliasToken)
            if (aliasParsed.class !== 'parse' || aliasParsed.quality !== row.quality) {
              failures.push(`${aliasToken}: quality ${aliasParsed.class === 'parse' ? aliasParsed.quality : aliasParsed.class}`)
              continue
            }
            const alt = dictionaryFrets(aliasToken, instrument)
            if ('error' in alt) {
              failures.push(`${instrument} ${aliasToken}: ${alt.error}`)
              continue
            }
            if (alt.frets.join('') !== got.frets.join('')) {
              failures.push(`${instrument} ${aliasToken} ${alt.frets.join('')} !== ${token} ${got.frets.join('')}`)
            }
          }
        }
      }
    }
    expect({ checked, failures }).toEqual({ checked: 17 * 12 * 2, failures: [] })
  })

  it('keeps C9 (add9) distinct from C7(9) (dominant 9)', () => {
    expect(parseChordToken('C9')).toMatchObject({ class: 'parse', quality: 'add9' })
    expect(parseChordToken('C7(9)')).toMatchObject({ class: 'parse', quality: '9' })
    for (const instrument of ['guitar', 'ukulele'] as const) {
      for (const root of ROOTS) {
        const add = dictionaryFrets(`${root}9`, instrument)
        const dom = dictionaryFrets(`${root}7(9)`, instrument)
        expect('error' in add, `${instrument} ${root}9`).toBe(false)
        expect('error' in dom, `${instrument} ${root}7(9)`).toBe(false)
        if ('error' in add || 'error' in dom) continue
        expect(add.frets, `${instrument} ${root}`).not.toEqual(dom.frets)
      }
    }
  })

  it('spells enharmonic roots as the same grip', () => {
    const failures: string[] = []
    for (const instrument of ['guitar', 'ukulele'] as const) {
      for (const [a, b] of ENHARMONIC) {
        for (const row of GRID) {
          const left = dictionaryFrets(`${a}${row.suffix}`, instrument)
          const right = dictionaryFrets(`${b}${row.suffix}`, instrument)
          if ('error' in left) {
            failures.push(`${instrument} ${a}/${b} ${row.quality}: ${left.error}`)
            continue
          }
          if ('error' in right) {
            failures.push(`${instrument} ${a}/${b} ${row.quality}: ${right.error}`)
            continue
          }
          if (left.frets.join('') !== right.frets.join('')) {
            failures.push(`${instrument} ${a}${row.suffix} ${left.frets.join('')} !== ${b}${row.suffix} ${right.frets.join('')}`)
          }
        }
      }
    }
    expect(failures).toEqual([])
  })

  it('records m7(11) as a fretted miss and a piano hit', () => {
    for (const instrument of ['guitar', 'ukulele'] as const) {
      for (const root of ROOTS) {
        const r = resolveDiagram({ token: `${root}m7(11)`, instrument })
        expect(r, `${instrument} ${root}m7(11)`).toEqual({ class: 'miss', reason: 'no-shape' })
      }
    }
    for (const root of ROOTS) {
      const rootPc = keyIndex(root)
      expect(rootPc, root).not.toBeNull()
      if (rootPc === null) continue
      const r = resolveDiagram({ token: `${root}m7(11)`, instrument: 'piano' })
      expect(r.class, root).toBe('hit')
      if (r.class !== 'hit') continue
      expect(r.source).toBe('dictionary')
      const lit = (r.voicing.keys ?? []).map((k) => ((rootPc + k) % 12 + 12) % 12)
      const want = M11.map((iv) => (rootPc + iv) % 12)
      expect(new Set(lit), root).toEqual(new Set(want))
    }
  })

  it('rejects the grips that omit the tone the quality is named for', () => {
    const cmaj9 = resolveDiagram({ token: 'C7M(9)', instrument: 'guitar' })
    expect(cmaj9.class).toBe('hit')
    if (cmaj9.class === 'hit' && cmaj9.voicing.frets) {
      expect(pitchClasses('guitar', cmaj9.voicing.frets).has(11)).toBe(true)
      expect(cmaj9.voicing.frets).not.toEqual(['x', 3, 2, 0, 3, 0])
    }

    const a69 = resolveDiagram({ token: 'A6(9)', instrument: 'guitar' })
    expect(a69.class).toBe('hit')
    if (a69.class === 'hit' && a69.voicing.frets) {
      expect(pitchClasses('guitar', a69.voicing.frets).has(11)).toBe(true)
      expect(a69.voicing.frets).not.toEqual(['x', 0, 2, 2, 2, 2])
    }

    const am7 = resolveDiagram({ token: 'Am7', instrument: 'ukulele' })
    expect(am7.class).toBe('hit')
    if (am7.class === 'hit' && am7.voicing.frets) {
      expect(pitchClasses('ukulele', am7.voicing.frets).has(7)).toBe(true)
    }

    const gdim = resolveDiagram({ token: 'Gdim', instrument: 'ukulele' })
    expect(gdim.class).toBe('hit')
    if (gdim.class === 'hit' && gdim.voicing.frets) {
      expect(gdim.voicing.frets).not.toEqual([0, 2, 3, 2])
    }
  })
})
```


### Callers / dependents (read-only context)

#### src/core/export-cho.ts:1-24

```ts
import { DIR, rewriteDefineLines } from './define'
import { transposeToken, usesFlats } from './transpose'

export function exportCho(
  source: string,
  opts?: { key?: string | null; semitones?: number; capo?: number },
): string {
  const n = opts?.semitones ?? 0
  const capo = opts?.capo ?? 0
  let out = source
  const keyMatch = source.match(/\{\s*key\s*:\s*([^}]*)\}/i)
  const sourceKey = keyMatch?.[1]?.trim() ?? opts?.key ?? null
  const flats = usesFlats(sourceKey)
  if (n) {
    out = rewriteDefineLines(
      out
        .replace(/\[([^\]]*)\]/g, (_, c: string) => `[${transposeToken(c, n, flats)}]`)
        .replace(/^(\s*\{\s*key\s*:\s*)([^}]*)\}/gim, (_, a: string, k: string) => {
          return `${a}${transposeToken(k.trim(), n, flats)}}`
        }),
      n,
      flats,
    )
  }
```

#### src/core/parse.ts:290-294

```ts
  const displayKey = view.meta.key ? transposeToken(view.meta.key, semis, flats) : null
  const defines = view.defines
    .map((d) => transposeDefine(d, semis, flats))
    .filter((d): d is ChordDefine => d !== null)
  return { ...view, sections, transposeSemitones: semis, displayKey, defines }
```

#### src/core/resolve-diagram.ts:61-71

```ts
function fromDefine(def: ChordDefine, want: Canonical): DiagramVoicing {
  const voicing: DiagramVoicing = {}
  if (def.frets?.length) {
    voicing.baseFret = def.baseFret ?? 1
    voicing.frets = [...def.frets]
  }
  if (def.fingers) voicing.fingers = [...def.fingers]
  if (def.keys?.length) {
    voicing.keys = pianoKeysToRelative(def.keys, want.rootPc, want.quality, want.bassPc)
  }
  return voicing
```


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

- `QUALITY_INTERVALS` in `src/core/chord-dict.ts` uses the numbers 14 and 17. The largest value in that table is 17. Verify by reading the table.
- `tests/core/define-directive.test.ts` expects `{define: C keys 48 52 55}` transposed by +2 to store keys `[50, 54, 57]`. That test does not mention keys `48 50`. Verify by reading the test.
- `exportCho` in `src/core/export-cho.ts` calls `rewriteDefineLines`, and `transpose` in `src/core/parse.ts` maps defines through `transposeDefine`, both without try/catch.
- At commit `008249e63eaa9d65a4a51c379b8540f07bd5ddd9`, `pianoSoundingPitchClasses` returned `mod12` when any key was outside 0–11. Verify with `git show 008249e63eaa9d65a4a51c379b8540f07bd5ddd9:src/core/chord-dict.ts`.
- `src/core/chord-dict.ts` does not import `src/core/define.ts`. Verify by reading its import lines.

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

Targeted execution against both revisions reproduced three regressions: extended relative keys transpose to incorrect notes, MIDI keys below 60 can be reinterpreted as relative intervals, and transposing MIDI keys above 60 discards octave information. The added tests do not cover these cases.

## Findings

### F-001 [major] Correctness — src/core/define.ts:201-207

**Evidence:**
```ts
function transposePianoKeys(def: ChordDefine, n: number, flats: boolean): number[] {
  const keys = def.keys ?? []
  if (keys.length > 0 && keys.every((k) => k >= 60)) {
    return keys.map((k) => 60 + mod12(k + n))
  }
  const midi = () => keys.map((k) => shiftKey(k, n))
  if (!keys.length || !keys.every(isPitchClass)) return midi()
```

**Claim:** Transposing the newly supported `{define: D9 keys 0 4 7 14}` by +2 produces E9 displaying F#–A#–C#–G# instead of E–G#–B–F#, because the presence of 14 bypasses sounding-class preservation and the shifted values are interpreted again relative to the renamed root.

**Impact:** Changing the song key produces a piano diagram inconsistent with its chord label; exported definitions retain the incorrect notes.

**Recommendation:** Apply sounding-class preservation and candidate readback validation to extended relative keys as well as 0–11 keys, and add a resolve/draw test after transposing the new D9 example.

**Confidence:** high

---

### F-002 [major] Backward compatibility — src/core/chord-dict.ts:158-163

**Evidence:**
```ts
  if (keys.length > 0 && keys.every((k) => k >= 60)) return keys.map((k) => mod12(k))
  const { pcs, intervals, absSet, relSet, absScore, relScore } = scorePianoReadings(keys, rootPc, quality)
  const absolute = () => [...pcs]
  const relative = () => pcs.map((k) => mod12(rootPc + k))
  if (absScore > relScore) return absolute()
  if (relScore > absScore) return relative()
```

**Claim:** `{define: D keys 50 52}`, previously displayed as D–E, now displays E–F# because MIDI values below 60 enter the heuristic and its characteristic-tone tiebreaker selects the relative reading.

**Impact:** Existing absolute MIDI overrides display different pitches without any source change; this also breaks an ordinary +2 transposition of `{define: C keys 48 50}`, which generates exactly this definition.

**Recommendation:** Preserve an unambiguous absolute interpretation for supported MIDI input separately from extended relative intervals, and test both direct resolution and transposition of MIDI definitions below 60.

**Confidence:** high

---

### F-003 [major] Data integrity — src/core/define.ts:203-204

**Evidence:**
```ts
  if (keys.length > 0 && keys.every((k) => k >= 60)) {
    return keys.map((k) => 60 + mod12(k + n))
```

**Claim:** Transposing `{define: C keys 60 64 79}` by +2 now stores `[62, 66, 69]` instead of `[62, 66, 81]`, because modulo normalization collapses every MIDI note into the same octave.

**Impact:** Transposed CHO exports lose the original register and voicing spacing; transposing back produces `[60, 64, 67]`, permanently losing the original 79 even though the pitch-class diagram conceals the loss.

**Recommendation:** Distinguish generated absolute pitch-class markers from imported MIDI notes and preserve `key + n` for MIDI data; add serialization and inverse-transposition tests using a voicing spanning multiple octaves.

**Confidence:** high

## Questions (non-findings)

## Out of scope

- Vue single-file components, colors, fonts, and modal layout.
- Auto-scroll timing.
- Guitar and ukulele fret dictionary rows.
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

No product edits in this review. Three majors stay open. F3 was not started.

## Self-review against code-quality gates

- G1 read-before-claim: N/A for a fix — no product edit. Cited lines are `src/core/define.ts:201-207` and `src/core/chord-dict.ts:158-163`.
- G2 soft-language: N/A — no fix description.
- G3 anti-tautology: N/A — no new test in this review.
- G4 fixture realism: N/A — no new fixture.
- G7 anti-premature-abstraction: N/A — no new helper.
