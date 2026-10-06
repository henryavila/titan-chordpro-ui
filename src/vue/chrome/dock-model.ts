import type { TitanChordproIconName } from '../icon/paths'
import type { WriteMode } from '../public'
import type { BlockEditApi } from '../use/useBlockEdit'

/** Props of the computer dock. Events stay on the parent. */
export type WideDockModel = {
  hidden: boolean
  showMine: boolean
  mineLabel: string
  showOriginal: boolean
  hintFit: boolean
  scrolling: boolean
  mul: number
  etaLabel: string
  progress: number
  setlistOn: boolean
  noPrev: boolean
  noNext: boolean
  posLabel: string
  scrollTitle: string
  scrollOff: boolean
  rollLive: boolean
  fitOn: boolean
  letra: boolean
  partitura: boolean
  partituraOn: boolean
  scoreReading: boolean
  hasKey: boolean
  nashvilleOn: boolean
  hideComments: boolean
  metRunning: boolean
  metBpm: number
  hasStrum: boolean
  strumOn: boolean
  /** Ensaio Batida chrome profile active. */
  ensaioBatida: boolean
  themeTitle: string
  themeIcon: TitanChordproIconName
  themeLabel: string
  canEdit: boolean
  dirty: boolean
}

/** Props of the phone dock. */
export type PhoneDockModel = {
  hidden: boolean
  hintFit: boolean
  letra: boolean
  partitura: boolean
  partituraOn: boolean
  scoreReading: boolean
  dockCtrlH: string
  setlistOn: boolean
  noPrev: boolean
  noNext: boolean
  posLabel: string
  nextChipShort: string
  scrolling: boolean
  mul: number
  etaLabel: string
  progress: number
  width: number
  dockPlayName: string
  scrollTitle: string
  scrollOff: boolean
  rollLive: boolean
  dockPlayLabeled: boolean
  dockPlayLabel: string
  dockTypeW: string
  bp: string
  canEdit: boolean
  dirty: boolean
  fitOn: boolean
  queueCount?: number
}

/** Props of the edit dock. */
export type EditDockModel = {
  compact: boolean
  editHint: boolean
  clipLabel: string | null
  edit: BlockEditApi
  wMode: WriteMode | null
  showSource: boolean
  lintOk: boolean
  themeTitle: string
  themeIcon: TitanChordproIconName
  /** Batida create/edit is available in local and persisted edit. */
  hasStrum: boolean
}

/** Props of the edit identity bar. */
export type EditHeadModel = {
  phone: boolean
  compact: boolean
  contentEdit: boolean
  pageMax: string
  chromePad: string
  editBadge: string
  wMode: WriteMode | null
  title: string
  subtitle: string
  metaGapLabel: string
  metaSummary: string
  metaGaps: number
  dirty: boolean
  canUndo: boolean
  canRedo: boolean
  confirmDiscard: boolean
  discardLabel: string
}

/** Props of the phone overflow sheet. */
export type MoreSheetModel = {
  themeTitle: string
  themeIcon: TitanChordproIconName
  themeLabel: string
  hasKey: boolean
  nashvilleOn: boolean
  nashvilleHint: string
  hideComments: boolean
  metBpm: number
  metRunning: boolean
  hasStrum: boolean
  strumOn: boolean
  ensaioBatida: boolean
  /** Partitura reading hides chord-chart controls. */
  scoreReading: boolean
  showMine: boolean
  showOriginal: boolean
  mineCount: number
  showQueue: boolean
  pendingCount: number
}
