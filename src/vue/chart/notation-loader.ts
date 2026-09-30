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
