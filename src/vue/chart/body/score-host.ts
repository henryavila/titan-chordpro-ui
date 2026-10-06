export type ScoreHost = {
  view: 'tab' | 'score'
  tabAvailable: boolean
  zoom: number
  zoomLabel: string
  downloading: boolean
  download: () => void
  fileBytes: Uint8Array | null
  fileType: string
  rhythm: string
  setRhythm: (value: string | number) => void
  noteNamesOn: boolean
  setNoteNames: (value: boolean) => void
}
