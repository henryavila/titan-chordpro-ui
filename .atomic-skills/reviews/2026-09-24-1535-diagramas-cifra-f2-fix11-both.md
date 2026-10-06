---
date: 2026-09-24T18:35:00-0300
topic: diagramas-cifra-f2-fix11-both
artifact: b57bf30c3c127832937faab01d757dc203e151af..3d0c3c6fbec833aa9f08c4d9c20acfd9ffe1e890
skill: review-code
mode: both-codex
reviewer: gpt-6-astra
provider: codex
provider_version: codex-cli 0.155.0
same_family_remap: false
model_source: explicit
final_verdict: needs_changes
counts_local: {blocker: 0, critical: 0, major: 0, minor: 0, nit: 0}
counts_blind: {blocker: 0, critical: 0, major: 1, minor: 0, nit: 0}
counts_final: {blocker: 0, critical: 0, major: 1, minor: 0, nit: 0}
framing_delta: {dropped: 1, maintained: 0, emerged: 1}
schema_version: "1.1"
---

# Cross-Model Review — diagramas-cifra F2 fix11

**Ref:** `b57bf30c3c127832937faab01d757dc203e151af..3d0c3c6fbec833aa9f08c4d9c20acfd9ffe1e890`
**Mode:** both-codex
**Provider:** codex
**Model:** gpt-6-astra (explicit)
**Files:** src/core/chord-dict.ts, src/core/define.ts, src/core/resolve-diagram.ts, tests/core/define-directive.test.ts, tests/core/export-cho.test.ts, tests/core/resolve-diagram.test.ts

## Local

verdict: clean
counts: blocker=0 critical=0 major=0 minor=0
passes: 2

No local findings. Checklist ok at `src/core/chord-dict.ts:103-110`, `src/core/define.ts:179-197`, `src/core/resolve-diagram.ts:69`.

## Pass 1 (blind)

---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 1, minor: 0, nit: 0}
reviewer: gpt-6
pass: blind
schema_version: "1.0"
---

### F-001 [major] Backward compatibility — src/core/chord-dict.ts:103-105

**Claim:** Reopening `{define: D keys 2 6 9}` displays E–G#–B because the reader adds D’s root to numbers the previous exporter stored as absolute classes.

**Impact:** Charts saved by that exporter show different piano notes. Tests replaced the old expectation and do not import the previous exporter’s output.

**Recommendation:** Migrate those definitions to unambiguous MIDI before the new reading. Add a regression that imports the base revision’s export.

**Confidence:** high

## Pass 2 (informed)

---
verdict: needs_changes
counts: {blocker: 0, critical: 0, major: 1, minor: 0, nit: 0}
reviewer: gpt-6
pass: informed
schema_version: "1.0"
---

### F-001 [major] Correctness — src/core/chord-dict.ts:103-105

**Evidence:** `pianoSoundingPitchClasses` treats the list as MIDI when any key is above 17. `transposePianoKeys` uses the same test.

**Claim:** `{define: D keys 12 16 19}` draws C–E–G instead of D–F#–A because 19 makes the whole list MIDI.

**Impact:** Transposing by two semitones exports `{define: E keys 26 30 33}`, which then reads as F#–A#–C# instead of E–G#–B. ChordPro keys are relative and may sit past one octave. https://www.chordpro.org/chordpro/directives-define/#defining-chords-for-keyboard-instruments

**Recommendation:** Keep relative keys of any size when the list is an interval spelling. Do not infer MIDI from a single value above 17. Add draw and export tests for `12 16 19`.

**Confidence:** high

## Pass 2 reconciliation

### Dropped from blind pass

- F-001-blind [major] Backward compatibility — DROPPED: the reviewed commit is not on origin/main, v0.7.0 has no `pianoSoundingPitchClasses`, and ChordPro requires a relative reading. `D keys 2 6 9` is an interval spelling.

### Maintained

- _(none)_

### Emerged

- F-001-final [major] Correctness — emerged: ChordPro allows relative keys past the diagram. One key above 17 currently flips `12 16 19` into MIDI.

## Disposition

Fix. A list that contains a key in 0–17 stays distances, including 12, 16, and 19. MIDI remains only when every key is above 17, or any key is below 0. Do not restore absolute-versus-interval scoring.

## Self-review against code-quality gates

- G1 read-before-claim: N/A — no product edit in this review.
- G2 soft-language: scanned; 0 ban-list hits in the disposition line.
- G3 anti-tautology: N/A.
- G4 fixture realism: N/A.
- G7 anti-premature-abstraction: N/A.
