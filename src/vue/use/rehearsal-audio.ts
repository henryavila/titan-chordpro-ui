/**
 * Rehearsal sound model (ensaio-batida design):
 * UI "Fonte" maps onto the existing metSound / metStrumSound prefs.
 * Rolar may run the beat clock silently so practice prefs do not leak on stage.
 */

export type SoundSource = 'mute' | 'click' | 'batida'

export function sourceFromPrefs(
  sound: boolean,
  strumSound: boolean,
  hasStrum: boolean,
): SoundSource {
  if (hasStrum && strumSound) return 'batida'
  if (sound) return 'click'
  return 'mute'
}

/** Soft click is only meaningful when the primary source is batida. */
export function softClickFromPrefs(
  sound: boolean,
  strumSound: boolean,
  hasStrum: boolean,
): boolean {
  return hasStrum && strumSound && sound
}

export function prefsFromSource(
  source: SoundSource,
  softClick: boolean,
): { sound: boolean; strumSound: boolean } {
  if (source === 'mute') return { sound: false, strumSound: false }
  if (source === 'click') return { sound: true, strumSound: false }
  return { sound: softClick, strumSound: true }
}

/**
 * Effective audible channels for this run.
 * `rollSilent` forces both off (Rolar outside Ensaio Batida).
 */
export function effectiveChannels(opts: {
  sound: boolean
  strumSound: boolean
  rollSilent: boolean
}): { click: boolean; strum: boolean } {
  if (opts.rollSilent) return { click: false, strum: false }
  return { click: opts.sound, strum: opts.strumSound }
}

/** Should this Rolar start mute the metronome/strum audio? */
export function shouldRollSilent(rehearsalFocus: 'off' | 'batida'): boolean {
  return rehearsalFocus !== 'batida'
}

/** Batida one-shots stay off during the count-in bar (click/visual only). */
export function strumAudibleDuringRun(opts: {
  strumSound: boolean
  rollSilent: boolean
  countIn: number
}): boolean {
  if (opts.rollSilent || !opts.strumSound) return false
  if (opts.countIn > 0) return false
  return true
}
