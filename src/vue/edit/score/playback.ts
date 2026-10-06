import { BEATS } from '@henryavila/titan-chordpro-ui'

export function noteSeconds(dur: string, tempo: number): number {
  return (BEATS[dur] ?? 1) * (60 / (tempo || 92))
}

export function beepNote(
  ac: AudioContext | null,
  inst: 'guitar' | 'piano',
  midi: number,
  sec: number,
): AudioContext | null {
  try {
    const AC = (globalThis as unknown as { AudioContext?: typeof AudioContext }).AudioContext
    if (!AC || typeof midi !== 'number') return ac
    ac = ac ?? new AC()
    const t = ac.currentTime
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.type = inst === 'piano' ? 'sine' : 'triangle'
    o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.12, sec * 0.92))
    o.connect(g).connect(ac.destination)
    o.start(t)
    o.stop(t + sec + 0.05)
    return ac
  } catch {
    return ac
  }
}
