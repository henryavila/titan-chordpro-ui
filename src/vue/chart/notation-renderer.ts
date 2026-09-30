/** Titan's excerpt compositor. The importer/engraver provides musical geometry;
 * Titan owns the systems, colors and layout, without mounting a document viewer. */
import type { model } from '@coderline/alphatab'
import type { ScoreReference } from '@henryavila/titan-chordpro-ui'
import bravuraUrl from '@coderline/alphatab/font/Bravura.woff2?url'
import { excerptTrack, hasTab } from './notation-loader'

export type NotationPalette = { ink: string; secondary: string; line: string; accent: string }
export type NotationSystem = { content: string | HTMLCanvasElement; width: number; height: number; first: number; last: number }
export const PAPER_PALETTE: NotationPalette = { ink: '#13161d', secondary: '#434957', line: '#737b88', accent: '#17713c' }
let font: Promise<void> | undefined
function loadFont(): Promise<void> {
  return font ??= new FontFace('TitanNotation', `url(${JSON.stringify(bravuraUrl)})`).load().then(face => {
    document.fonts.add(face)
  }).catch(error => { font = undefined; throw error })
}

export async function drawNotation(score: model.Score, reference: ScoreReference, options: {
  mode: 'tab' | 'score'; width: number; scale: number; palette: NotationPalette; engine?: 'svg' | 'html5'
}): Promise<NotationSystem[]> {
  await loadFont()
  const alpha = await import('@coderline/alphatab')
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
  settings.display.layoutMode = alpha.LayoutMode.Page
  settings.display.systemsLayoutMode = alpha.SystemsLayoutMode.Automatic
  settings.display.scale = options.scale
  settings.display.startBar = reference.start
  settings.display.barCount = reference.end === undefined ? -1 : reference.end - reference.start + 1
  settings.display.padding = [8, 8, 8, 8]
  settings.display.staveProfile = alpha.StaveProfile.Default
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
      first: part.firstMasterBarIndex + 1, last: part.lastMasterBarIndex + 1 })
  })
  try {
    renderer.renderScore(score, [reference.track - 1])
    if (failure) throw failure
    if (!systems.length) throw new Error('O trecho não contém notas para desenhar.')
    return systems
  } finally { renderer.destroy() }
}
