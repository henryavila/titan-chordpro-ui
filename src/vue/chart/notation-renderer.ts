/** Titan's excerpt compositor. The importer/engraver provides musical geometry;
 * Titan owns the systems, colors and layout, without mounting a document viewer. */
import type { model } from '@coderline/alphatab'
import type { ScoreReference, TabRhythm } from '@henryavila/titan-chordpro-ui'
import type { NoteNameFormat } from '../public'
import bravuraUrl from '@coderline/alphatab/font/Bravura.woff2?url'
import { excerptTrack, hasTab, isolateExcerpt } from './notation-loader'

export type NotationPalette = { ink: string; secondary: string; line: string; accent: string }
export type NoteName = { x: number; text: string; row: number }
export type NotationSystem = { content: string | HTMLCanvasElement; width: number; height: number; first: number; last: number; noteNames: NoteName[] }
export const PAPER_PALETTE: NotationPalette = { ink: '#13161d', secondary: '#434957', line: '#737b88', accent: '#17713c' }
let font: Promise<void> | undefined
function loadFont(): Promise<void> {
  return font ??= new FontFace('TitanNotation', `url(${JSON.stringify(bravuraUrl)})`).load().then(face => {
    document.fonts.add(face)
  }).catch(error => { font = undefined; throw error })
}

export async function drawNotation(score: model.Score, reference: ScoreReference, options: {
  mode: 'tab' | 'score'; rhythm?: TabRhythm; width: number; scale: number; palette: NotationPalette; engine?: 'svg' | 'html5'; noteNames?: boolean; noteNameFormat?: NoteNameFormat
}): Promise<NotationSystem[]> {
  await loadFont()
  const alpha = await import('@coderline/alphatab')
  // Rendering owns its model: repeated previews and other copies must retain
  // the complete imported music, including links crossing this excerpt's edge.
  score = isolateExcerpt(alpha.model.JsonConverter.jsObjectToScore(alpha.model.JsonConverter.scoreToJsObject(score)), reference.start, reference.end)
  const track = excerptTrack(score, reference.track, reference.start, reference.end)
  if (options.mode === 'tab' && !hasTab(track)) throw new Error('Um dos solos não contém posições nas cordas. Escolha Partitura ou Nenhum.')
  for (const staff of track.staves) {
    staff.showStandardNotation = options.mode === 'score'
    staff.showTablature = options.mode === 'tab' && staff.isStringed
    staff.showSlash = false
    staff.showNumbered = false
  }
  const settings = new alpha.Settings()
  settings.core.engine = options.engine ?? 'svg'
  settings.core.useWorkers = false
  settings.core.enableLazyLoading = false
  settings.core.includeNoteBounds = options.noteNames === true
  settings.display.layoutMode = alpha.LayoutMode.Page
  settings.display.systemsLayoutMode = alpha.SystemsLayoutMode.Automatic
  settings.display.scale = options.scale
  settings.display.startBar = reference.start
  settings.display.barCount = reference.end === undefined ? -1 : reference.end - reference.start + 1
  settings.display.padding = [8, 8, 8, 8]
  settings.display.staveProfile = alpha.StaveProfile.Default
  const rhythm = options.rhythm ?? reference.rhythm ?? 'extended'
  settings.notation.rhythmMode = rhythm === 'none' ? alpha.TabRhythmMode.Hidden : alpha.TabRhythmMode.ShowWithBars
  const resources = settings.display.resources
  // The low-level canvas uses the same font-family field as alphaTab's browser facade.
  Object.assign(resources, { smuflFontFamilyName: 'TitanNotation' })
  const color = (value: string) => alpha.model.Color.fromJson(value) ?? new alpha.model.Color(19, 22, 29)
  resources.mainGlyphColor = color(options.palette.ink)
  resources.secondaryGlyphColor = color(options.palette.secondary)
  resources.staffLineColor = color(options.palette.line)
  resources.barSeparatorColor = color(options.palette.line)
  resources.barNumberColor = color(options.palette.accent)
  resources.scoreInfoColor = color(options.palette.ink)
  // Remove document furniture, retain musical articulations and written timing.
  for (const element of [alpha.NotationElement.ScoreTitle, alpha.NotationElement.ScoreSubTitle,
    alpha.NotationElement.ScoreArtist, alpha.NotationElement.ScoreAlbum, alpha.NotationElement.ScoreWords,
    alpha.NotationElement.ScoreMusic, alpha.NotationElement.ScoreWordsAndMusic, alpha.NotationElement.ScoreCopyright,
    alpha.NotationElement.GuitarTuning, alpha.NotationElement.TrackNames, alpha.NotationElement.ChordDiagrams,
    alpha.NotationElement.EffectChordNames, alpha.NotationElement.EffectLyrics, alpha.NotationElement.EffectText,
    alpha.NotationElement.EffectMarker]) settings.notation.elements.set(element, false)
  const renderer = new alpha.rendering.ScoreRenderer(settings)
  if (options.mode === 'tab' && rhythm !== 'none') useTabRhythm(renderer, track, rhythm, alpha.model.Duration.Half)
  renderer.width = Math.max(240, options.width)
  const systems: NotationSystem[] = []
  let failure: Error | undefined
  renderer.error.on(error => { failure = error })
  renderer.partialRenderFinished.on(part => {
    // Title/tuning/credits are independent document chunks, never excerpt music.
    if (part.firstMasterBarIndex < 0 || part.lastMasterBarIndex < reference.start - 1) return
    if (typeof part.renderResult !== 'string' && !(part.renderResult instanceof HTMLCanvasElement)) return
    const content = typeof part.renderResult === 'string'
      ? part.renderResult.replaceAll('class="at"', `class="at" style="font: ${resources.engravingSettings.musicFontSize}px TitanNotation"`)
      : part.renderResult
    systems.push({ content, width: part.width, height: part.height,
      first: part.firstMasterBarIndex + 1, last: part.lastMasterBarIndex + 1, noteNames: [] })
  })
  try {
    renderer.renderScore(score, [reference.track - 1])
    if (failure) throw failure
    if (!systems.length) throw new Error('O trecho não contém notas para desenhar.')
    if (options.noteNames) for (const system of systems) system.noteNames = namesInSystem(renderer, system, reference.start, options.mode, options.noteNameFormat ?? 'letter')
    return systems
  } finally { renderer.destroy() }
}

const SHARP_NAMES = ['Dó', 'Dó♯', 'Ré', 'Ré♯', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Sol♯', 'Lá', 'Lá♯', 'Si']
const FLAT_NAMES = ['Dó', 'Ré♭', 'Ré', 'Mi♭', 'Mi', 'Fá', 'Sol♭', 'Sol', 'Lá♭', 'Lá', 'Si♭', 'Si']
const SHARP_LETTERS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_LETTERS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

function pitchName(value: number, flats: boolean, format: NoteNameFormat): string {
  const pitch = ((Math.round(value) % 12) + 12) % 12
  return (format === 'solfege' ? (flats ? FLAT_NAMES : SHARP_NAMES) : (flats ? FLAT_LETTERS : SHARP_LETTERS))[pitch]!
}

/** The lookup uses document coordinates; each partial render is one staff system. */
function namesInSystem(renderer: import('@coderline/alphatab').rendering.ScoreRenderer, system: NotationSystem, start: number, mode: 'tab' | 'score', format: NoteNameFormat): NoteName[] {
  const lookup = renderer.boundsLookup
  if (!lookup) return []
  const staffSystem = lookup.staffSystems.find(bounds => bounds.bars.some(bar => bar.index === system.first - 1))
  if (!staffSystem) return []
  const labels: NoteName[] = []
  const seen = new Set<string>()
  for (const master of staffSystem.bars) {
    if (master.index < Math.max(start - 1, system.first - 1) || master.index >= system.last) continue
    for (const bar of master.bars) for (const beat of bar.beats) {
      const notes = beat.beat.notes.filter(note => !note.isPercussion && Number.isFinite(note.realValue))
      if (!notes.length) continue
      const flats = Number(bar.bar.keySignature) < 0
      const names = notes.map(note => pitchName(note.calculateRealValue(mode === 'tab', true), flats, format))
      const x = beat.onNotesX - staffSystem.realBounds.x
      const key = `${Math.round(x)}:${names.join('/')}`
      if (seen.has(key)) continue
      seen.add(key)
      labels.push({ x, text: names.join(' · '), row: 0 })
    }
  }
  labels.sort((a, b) => a.x - b.x)
  const ctx = document.createElement('canvas').getContext('2d')
  if (ctx) ctx.font = '600 11px sans-serif'
  const rowEnds: number[] = []
  for (const label of labels) {
    const halfWidth = (ctx?.measureText(label.text).width ?? label.text.length * 7) / 2
    label.x = Math.max(halfWidth, Math.min(system.width - halfWidth, label.x))
    const left = label.x - halfWidth
    let row = rowEnds.findIndex(end => left >= end + 4)
    if (row < 0) { row = rowEnds.length; rowEnds.push(0) }
    label.row = row
    rowEnds[row] = label.x + halfWidth
  }
  return labels
}

/** alphaTab 1.8 has neither a short-stem setting nor distinct half-note stems. Keep this internal geometry seam local
 * to this renderer (no prototype/global changes), before each system is painted.
 * Both SVG and PDF canvas use the same stem geometry. */
function useTabRhythm(renderer: import('@coderline/alphatab').rendering.ScoreRenderer, track: model.Track, rhythm: 'base' | 'extended', half: model.Duration) {
  type TabBar = {
    drawnLineCount: number
    lineSpacing: number
    getLineY(line: number): number
    smuflMetrics: { stemThickness: number }
    paintBeamingStem(beat: model.Beat, cy: number, x: number, top: number, bottom: number,
      canvas: { fillRect(x: number, y: number, width: number, height: number): void }): void
  }
  const patched = new WeakSet<TabBar>()
  renderer.partialLayoutFinished.on(part => {
    if (part.firstMasterBarIndex < 0) return
    const layout = (renderer as unknown as { layout?: { getRendererForBar(key: string, bar: model.Bar): TabBar | null } }).layout
    if (!layout?.getRendererForBar) throw new Error('Esta versão do renderizador não suporta o ritmo da TAB.')
    for (const staff of track.staves) for (const bar of staff.bars.slice(part.firstMasterBarIndex, part.lastMasterBarIndex + 1)) {
      const tab = layout.getRendererForBar('tab', bar)
      if (!tab || patched.has(tab)) continue
      patched.add(tab)
      const originalStem = tab.paintBeamingStem
      tab.paintBeamingStem = function (beat, cy, x, top, bottom, canvas) {
        // Titan's Guitar Pro profile: one short half-note stem, exactly 50%
        // of the quarter-note base stem. Extension never lengthens half notes.
        // See docs/NOTACAO-VISUAL.md; flags/beams/dots stay with the engraver.
        if (rhythm === 'extended' && beat.duration !== half) {
          originalStem.call(this, beat, cy, x, top, bottom, canvas)
          return
        }
        const end = Math.max(top, bottom)
        const baseStart = Math.max(Math.min(top, bottom), cy + this.getLineY(this.drawnLineCount - 1) + this.lineSpacing / 2)
        const baseHeight = Math.max(0, end - baseStart)
        const height = beat.duration === half ? baseHeight / 2 : baseHeight
        if (height > 0) canvas.fillRect(x, end - height, this.smuflMetrics.stemThickness, height)
      }
    }
  })
}
