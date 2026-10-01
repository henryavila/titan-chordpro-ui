import type { model } from '@coderline/alphatab'

export async function loadNotation(bytes: Uint8Array): Promise<model.Score> {
  const { importer, Settings } = await import('@coderline/alphatab')
  return importer.ScoreLoader.loadScoreFromBytes(bytes, new Settings())
}

export function excerptTrack(score: model.Score, track: number, start: number, end?: number): model.Track {
  const selected = score.tracks[track - 1]
  if (!selected) throw new Error('A faixa escolhida não existe neste arquivo.')
  if (start > score.masterBars.length || (end !== undefined && end > score.masterBars.length))
    throw new Error(`O arquivo tem ${score.masterBars.length} compassos. Ajuste o trecho.`)
  return selected
}

export function hasTab(track: model.Track): boolean {
  return track.staves.some(staff => staff.isStringed && !staff.isPercussion &&
    staff.bars.some(bar => bar.voices.some(voice => voice.beats.some(beat =>
      beat.notes.some(note => note.isStringed)))))
}

/** Remove incoming connections whose origin has no renderer in this excerpt.
 * Only call on a private rendering copy. Connections within the excerpt, note
 * pitches, durations and the original imported document remain intact.
 */
export function isolateExcerpt(score: model.Score, start: number, end = score.masterBars.length): model.Score {
  const outside = (beat: model.Beat) => beat.voice.bar.index < start - 1 || beat.voice.bar.index >= end
  for (const track of score.tracks) for (const staff of track.staves) for (const bar of staff.bars)
    for (const voice of bar.voices) for (const beat of voice.beats) {
      if (outside(beat)) {
        beat.isLegatoOrigin = false
        continue
      }
      if (beat.effectSlurOrigin && outside(beat.effectSlurOrigin)) {
        beat.effectSlurOrigin.effectSlurDestination = null
        beat.effectSlurOrigin.isEffectSlurOrigin = false
        beat.effectSlurOrigin = null
      }
      for (const note of beat.notes) {
        if (note.tieOrigin && outside(note.tieOrigin.beat)) {
          note.tieOrigin.tieDestination = null
          note.tieOrigin = null
          note.isTieDestination = false
        }
        if (note.slurOrigin && outside(note.slurOrigin.beat)) {
          note.slurOrigin.slurDestination = null
          note.slurOrigin = null
          note.isSlurDestination = false
        }
        if (note.hammerPullOrigin && outside(note.hammerPullOrigin.beat)) {
          note.hammerPullOrigin.hammerPullDestination = null
          note.hammerPullOrigin.isHammerPullOrigin = false
          note.hammerPullOrigin = null
        }
        if (note.slideOrigin && outside(note.slideOrigin.beat)) {
          note.slideOrigin.slideTarget = null
          note.slideOrigin = null
        }
      }
    }
  return score
}
