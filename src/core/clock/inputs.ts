import type { TitanChordproDocument } from '../types'
import { songDurationSec } from './duration'
import { beatsPerBar, marksPerBeat, sheetBpm } from './meter'

/** Clock inputs a chart provides; `bpmOverride` is the reader's own tempo. */
export function clockOf(view: TitanChordproDocument, bpmOverride?: number | null) {
  return {
    bpm: bpmOverride || sheetBpm(view.meta.tempo) || 100,
    beatsPerBar: beatsPerBar(view.meta.time),
    marksPerBeat: marksPerBeat(view.meta.time),
    durationSec: songDurationSec(view.meta.duration),
  }
}
