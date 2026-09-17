export type StrumSampleId = 'down' | 'up' | 'downAccent' | 'upAccent' | 'mute' | 'palm'

/** Milliseconds from buffer start to perceived attack (peak). */
export const STRUM_ATTACK_MS: Record<StrumSampleId, number> = {
  down: 35.0,
  up: 35.8,
  downAccent: 35.0,
  upAccent: 35.8,
  mute: 26.1,
  palm: 15.7,
}

export const STRUM_SAMPLE_IDS = Object.keys(STRUM_ATTACK_MS) as StrumSampleId[]
