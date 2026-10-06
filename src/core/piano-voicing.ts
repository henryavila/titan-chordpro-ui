/**
 * Piano close voicings. One octave above the bass, never a ninth stacked
 * on top: the 9th is the same key as the 2nd and keeps the degree 9.
 * A written bass is the lowest note. Without one, each chord tone takes
 * a turn in the bass.
 */

import { pianoKeysOf } from './chord-dict'
import { noteAtSemitones } from './transpose'

export type PianoTone = {
  midi: number
  degree: string
}

export type PianoInversion = {
  label: string
  tones: PianoTone[]
}

const DEGREE_BY_INTERVAL: Record<number, string> = {
  0: '1',
  1: 'b2',
  2: '2',
  3: 'b3',
  4: '3',
  5: '4',
  6: 'b5',
  7: '5',
  8: '#5',
  9: '6',
  10: 'b7',
  11: '7',
  14: '9',
  17: '11',
}

function mod12(n: number): number {
  return ((n % 12) + 12) % 12
}

/** Degree a stored interval prints. 14 is 9, 17 is 11, not 2 and 4. */
export function pianoDegreeFor(interval: number): string {
  if (Object.hasOwn(DEGREE_BY_INTERVAL, interval)) return DEGREE_BY_INTERVAL[interval] ?? '1'
  return DEGREE_BY_INTERVAL[mod12(interval)] ?? '1'
}

type RelTone = { step: number; degree: string }

/** One degree per pitch class. A 9th or 11th wins over the collapsed 2nd or 4th. */
function relTones(intervals: readonly number[]): RelTone[] {
  const byStep = new Map<number, RelTone>()
  for (const interval of intervals) {
    const step = mod12(interval)
    const prev = byStep.get(step)
    if (!prev || interval >= 12) byStep.set(step, { step, degree: pianoDegreeFor(interval) })
  }
  return [...byStep.values()].sort((a, b) => a.step - b.step)
}

/** Notes within the octave above `bassPc`. The bass midi is the lowest. */
function closeVoicing(rootPc: number, bassPc: number, tones: readonly RelTone[]): PianoTone[] {
  const bassMidi = 60 + bassPc
  const out = tones.map((tone) => ({
    midi: bassMidi + mod12(rootPc + tone.step - bassPc),
    degree: tone.degree,
  }))
  out.sort((a, b) => a.midi - b.midi)
  return out
}

/**
 * Slash: the written bass lowest, plus the plain chord. The extra bass is
 * added when it is not already a chord tone. No slash: one voicing per
 * chord tone, root first.
 */
export function pianoInversions(opts: {
  token: string
  root: string
  rootPc: number
  quality: string
  bassPc: number | null
}): PianoInversion[] | null {
  const intervals = pianoKeysOf(opts.quality)
  if (!intervals) return null
  const baseTones = relTones(intervals)
  const head = opts.token.split('/')[0] || opts.token
  if (opts.bassPc != null) {
    const step = mod12(opts.bassPc - opts.rootPc)
    let slashTones = baseTones
    if (!slashTones.some((tone) => tone.step === step)) {
      slashTones = [...slashTones, { step, degree: pianoDegreeFor(step) }].sort((a, b) => a.step - b.step)
    }
    const withBass: PianoInversion = {
      label: opts.token,
      tones: closeVoicing(opts.rootPc, opts.bassPc, slashTones),
    }
    if (opts.bassPc === opts.rootPc) return [withBass]
    return [
      withBass,
      { label: head, tones: closeVoicing(opts.rootPc, opts.rootPc, baseTones) },
    ]
  }
  return baseTones.map((bass) => {
    const bassPc = mod12(opts.rootPc + bass.step)
    const spelled = noteAtSemitones(opts.root, bass.step)
    const label = bass.step === 0 || !spelled ? head : `${head}/${spelled}`
    return { label, tones: closeVoicing(opts.rootPc, bassPc, baseTones) }
  })
}
