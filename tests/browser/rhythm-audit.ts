import { rendering, model } from '@coderline/alphatab'
import { drawNotation, PAPER_PALETTE } from '../../src/vue/chart/notation-renderer'
import { loadNotation } from '../../src/vue/chart/notation-loader'
import notesUrl from '../../fixtures/notation/notes.gp?url'
import rhythmUrl from '../../fixtures/notation/rhythm.gp?url'
import tupletsUrl from '../../fixtures/notation/tuplets.gp?url'

// Observe actual canvas operations produced by the real engraver. No musical
// model, file parser, renderer, or drawing operation is replaced by a stub.
type Rect = [number, number, number, number]
type Audit = { stems: Array<{ duration: number; dots: number; rects: Rect[] }>; symbols: number[]; beams: Array<{ durations: number[]; polygons: number[][][] }> }
const render = rendering.ScoreRenderer.prototype.renderScore
let audit: Audit
rendering.ScoreRenderer.prototype.renderScore = function (...args) {
  const current = audit
  let observedCanvas = false
  this.partialLayoutFinished.on(part => {
    if (!observedCanvas && this.canvas) {
      observedCanvas = true
      const canvas = this.canvas
      const symbol = canvas.fillMusicFontSymbol.bind(canvas)
      canvas.fillMusicFontSymbol = (...a) => { current.symbols.push(a[3]); symbol(...a) }
      const symbols = canvas.fillMusicFontSymbols.bind(canvas)
      canvas.fillMusicFontSymbols = (...a) => { current.symbols.push(...a[3]); symbols(...a) }
    }
    if (part.firstMasterBarIndex < 0) return
    // alphaTab keeps these geometry APIs internal; the production integration
    // uses the same seam. Audit what each stem really paints, including PDF.
    const layout = (this as any).layout
    for (const track of this.tracks ?? []) for (const staff of track.staves)
      for (const bar of staff.bars.slice(part.firstMasterBarIndex, part.lastMasterBarIndex + 1)) {
        const tab = layout.getRendererForBar('tab', bar)
        if (!tab || tab.auditObserved) continue
        tab.auditObserved = true
        const beam = tab.paintBar
        tab.paintBar = function (cx: number, cy: number, canvas: any, helper: any, element: any) {
          const polygons: number[][][] = []
          let points: number[][] = []
          const begin = canvas.beginPath, move = canvas.moveTo, line = canvas.lineTo, fill = canvas.fill
          canvas.beginPath = () => { points = []; begin.call(canvas) }
          canvas.moveTo = (x: number, y: number) => { points.push([x, y]); move.call(canvas, x, y) }
          canvas.lineTo = (x: number, y: number) => { points.push([x, y]); line.call(canvas, x, y) }
          canvas.fill = () => { polygons.push(points); fill.call(canvas) }
          try { beam.call(this, cx, cy, canvas, helper, element) }
          finally { canvas.beginPath = begin; canvas.moveTo = move; canvas.lineTo = line; canvas.fill = fill }
          current.beams.push({ durations: helper.beats.map((b: model.Beat) => b.duration), polygons })
        }
        const stem = tab.paintBeamingStem
        tab.paintBeamingStem = function (beat: model.Beat, cy: number, x: number, top: number, bottom: number, canvas: any) {
          const rects: Rect[] = []
          const fill = canvas.fillRect
          canvas.fillRect = (...rect: Rect) => { rects.push(rect); fill.apply(canvas, rect) }
          try { stem.call(this, beat, cy, x, top, bottom, canvas) }
          finally { canvas.fillRect = fill }
          current.stems.push({ duration: beat.duration, dots: beat.dots, rects })
        }
      }
  })
  return render.apply(this, args)
}
const params = new URLSearchParams(location.search)
const engine = params.get('engine') === 'html5' ? 'html5' : 'svg'
const mode = params.get('rhythm') === 'extended' ? 'extended' : params.get('rhythm') === 'none' ? 'none' : 'base'
const file = params.get('file') || 'notes'
const url = ({ notes: notesUrl, rhythm: rhythmUrl, tuplets: tupletsUrl })[file] ?? notesUrl
try {
  const score = await loadNotation(new Uint8Array(await (await fetch(url)).arrayBuffer()))
  audit = { stems: [], symbols: [], beams: [] }
  const systems = await drawNotation(score, { src: url, track: 1, start: 1 }, { mode: 'tab', rhythm: mode, width: 1600, scale: 1.2, palette: PAPER_PALETTE, engine })
  for (const system of systems) {
    const div = document.createElement('div')
    if (typeof system.content === 'string') div.innerHTML = system.content
    else div.append(system.content)
    document.querySelector('#app')!.append(div)
  }
  // Symbol names make failures explain which duration disappeared.
  document.body.dataset.audit = JSON.stringify({ ...audit, symbols: audit.symbols.map(symbol => model.MusicFontSymbol[symbol]) })
} catch (error) { document.body.dataset.error = String(error) }
