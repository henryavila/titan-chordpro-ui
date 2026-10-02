import type { Ref } from 'vue'
import type { ChartBlock } from '@henryavila/titan-chordpro-ui'
import type { WriteMode } from '../../public'

export type BlockEditOpts = {
  /** The text being edited, as the editor sees it right now. */
  source: Ref<string>
  /** Blocks of that same text, in the order they are on screen. */
  blocks: Ref<ChartBlock[]>
  editing: Ref<boolean>
  wMode: Ref<WriteMode | null>
  /** Capo of the whole song — what a block with no capo of its own follows. */
  songCapo: Ref<number>
  flats: Ref<boolean>
  root: Ref<HTMLElement | null>
  scroller: Ref<HTMLElement | null>
  write: (next: string, message?: string) => void
  toast: (msg: string) => void
}

export type ChordEdit = { li: number; idx: number }
export type PickerMode = 'insert' | 'replace' | null

/** Instance flags that are not rendered, so they stay off the ref graph. */
export type EditLatch = {
  /** Guards the click a browser fires after a pill drag ends. */
  pillAt: number
  /** Set when Escape unmounts the row input, so its blur cannot commit. */
  skipCommit: boolean
}
