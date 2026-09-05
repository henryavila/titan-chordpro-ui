/**
 * Drawing a score with VexFlow. The same path serves the editor (with a
 * selection and clickable notes) and the reading surface.
 *
 * VexFlow is optional: a host that never shows a `{sos}` block should not have
 * to ship an engraver. It is looked for on `window.Vex` (a CDN tag) and, when
 * that is absent, imported from the package if it happens to be installed.
 * Without either, the caller falls back to showing the source text.
 */

import { beatsOf, beatsPerBar, keyOf, layout, NAMES, tabOf } from '../../core/score'
import type { ScoreNote } from '../../core/score'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Vex = any

let cached: Vex | null = null
let pending: Promise<Vex | null> | null = null

/** VexFlow if it is already on the page — no await, for a synchronous redraw. */
export function vexNow(): Vex | null {
  if (cached) return cached
  const w = globalThis as unknown as { Vex?: { Flow?: Vex } }
  const flow = w.Vex?.Flow
  if (flow) cached = flow
  return cached
}

export function loadVex(): Promise<Vex | null> {
  const now = vexNow()
  if (now) return Promise.resolve(now)
  if (pending) return pending
  pending = import(/* @vite-ignore */ 'vexflow')
    .then((m: any) => {
      cached = m?.Flow ?? m?.Vex?.Flow ?? m?.default?.Flow ?? m ?? null
      return cached
    })
    .catch(() => null)
  return pending
}

export type DrawOpts = {
  view?: 'score' | 'tab' | 'both'
  /** Two staves, treble and bass — for what a keyboard reads. */
  grand?: boolean
  time?: string
  minWidth?: number
  ink?: string
  accent?: string
  dim?: string
  /** Index of the note the editor has selected. */
  sel?: number
  /** Index of the note being played back. */
  playIdx?: number
  onPick?: (i: number) => void
}

export type DrawResult = { width: number; height: number } | null

export function drawScore(host: HTMLElement | null, notes: ScoreNote[], opts: DrawOpts = {}): DrawResult {
  const V = vexNow()
  if (!V || !host) return null
  const ink = opts.ink || '#EAECF2'
  const accent = opts.accent || '#84DFA6'
  const dim = opts.dim || '#888F9E'
  const perBar = beatsPerBar(opts.time)
  host.innerHTML = ''
  if (!notes.length) return null
  const grand = !!opts.grand
  const view = grand ? 'score' : (opts.view ?? 'both')
  const cols = layout(notes, perBar)
  const inkS = { fillStyle: ink, strokeStyle: ink }
  const selS = { fillStyle: accent, strokeStyle: accent }
  const minW = opts.minWidth || 620
  const W = Math.max(minW, cols.length * 46 + 150)
  const H = grand ? 218 : view === 'both' ? 226 : 146
  const r = new V.Renderer(host, V.Renderer.Backends.SVG)
  r.resize(W, H)
  const ctx = r.getContext()
  ctx.setFillStyle(ink)
  ctx.setStrokeStyle(ink)
  const total = beatsOf(notes) || perBar
  const mk = (arr: unknown[]) =>
    new V.Voice({ num_beats: total, beat_value: 4 }).setStrict(false).addTickables(arr)
  const styleFor = (c: any) => (c.i === opts.playIdx || c.i === opts.sel ? selS : inkS)
  const mkNote = (c: any, clef: string) => {
    if (c.n.rest) {
      const rn = new V.StaveNote({ keys: [clef === 'bass' ? 'd/3' : 'b/4'], duration: `${c.dur}r`, clef })
      rn.setStyle(styleFor(c))
      return rn
    }
    const sn = new V.StaveNote({ keys: [keyOf(c.n.midi)], duration: c.dur, clef })
    if ((NAMES[c.n.midi % 12] as string).includes('#')) sn.addModifier(new V.Accidental('#'), 0)
    sn.setStyle(styleFor(c))
    return sn
  }

  if (grand) {
    const tre: unknown[] = []
    const bas: unknown[] = []
    for (const c of cols) {
      if (c.kind === 'bar') {
        tre.push(new V.BarNote().setStyle(inkS))
        bas.push(new V.BarNote().setStyle(inkS))
        continue
      }
      const low = !c.n.rest && (c.n.midi ?? 60) < 60
      tre.push(low ? new V.GhostNote({ duration: c.dur }) : mkNote(c, 'treble'))
      bas.push(low ? mkNote(c, 'bass') : new V.GhostNote({ duration: c.dur }))
    }
    const s1 = new V.Stave(26, 2, W - 44)
    s1.addClef('treble').addTimeSignature(opts.time || '4/4').setStyle(inkS).setContext(ctx).draw()
    const s2 = new V.Stave(26, 100, W - 44)
    s2.addClef('bass').addTimeSignature(opts.time || '4/4').setStyle(inkS).setContext(ctx).draw()
    new V.StaveConnector(s1, s2).setType(V.StaveConnector.type.BRACE).setContext(ctx).draw()
    new V.StaveConnector(s1, s2).setType(V.StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw()
    const v1 = mk(tre)
    const v2 = mk(bas)
    new V.Formatter().joinVoices([v1]).joinVoices([v2]).format([v1, v2], W - 150)
    v1.draw(ctx, s1)
    v2.draw(ctx, s2)
    return { width: W, height: H }
  }

  const sN: unknown[] = []
  const tN: unknown[] = []
  const ties: Array<{ first: unknown; last: unknown }> = []
  const marks: any[] = []
  const hit: Array<{ i: number; sn: any; tn: any }> = []
  let pend: unknown = null
  for (const c of cols) {
    if (c.kind === 'bar') {
      const b1 = new V.BarNote().setStyle(inkS)
      const b2 = new V.BarNote().setStyle(inkS)
      sN.push(b1)
      tN.push(b2)
      marks.push(b1)
      continue
    }
    const sn = mkNote(c, 'treble')
    if (pend) {
      ties.push({ first: pend, last: sn })
      pend = null
    }
    if (c.tieNext) pend = sn
    sN.push(sn)
    const pos = tabOf(c.n)
    const tn = new V.TabNote({
      positions: [pos ? { str: pos.str + 1, fret: pos.fret } : { str: 3, fret: 0 }],
      duration: c.dur,
    })
    tn.setStyle(styleFor(c))
    tN.push(tn)
    hit.push({ i: c.i, sn, tn })
  }
  let stave: any = null
  let tabstave: any = null
  let v1: any = null
  let v2: any = null
  if (view !== 'tab') {
    stave = new V.Stave(10, view === 'both' ? 2 : 14, W - 24)
    stave.addClef('treble').addTimeSignature(opts.time || '4/4').setStyle(inkS).setContext(ctx).draw()
    v1 = mk(sN)
  }
  if (view !== 'score') {
    tabstave = new V.TabStave(10, view === 'both' ? 106 : 12, W - 24)
    tabstave.addClef('tab').addTimeSignature(opts.time || '4/4').setStyle(inkS).setContext(ctx).draw()
    v2 = mk(tN)
  }
  // Both staves need the same starting x: otherwise the same tick lands in
  // different columns and the tab stops sitting under its note.
  if (stave && tabstave) {
    const x = Math.max(stave.getNoteStartX(), tabstave.getNoteStartX())
    stave.setNoteStartX(x)
    tabstave.setNoteStartX(x)
  }
  const fm = new V.Formatter()
  const vs: unknown[] = []
  if (v1) {
    fm.joinVoices([v1])
    vs.push(v1)
  }
  if (v2) {
    fm.joinVoices([v2])
    vs.push(v2)
  }
  fm.format(vs, W - 120)
  if (v1) v1.draw(ctx, stave)
  if (v2) v2.draw(ctx, tabstave)
  if (v1) for (const t of ties) new V.StaveTie({ first_note: t.first, last_note: t.last }).setContext(ctx).draw()

  // Bar number above the barline, the way printed music does it.
  const anchor = stave || tabstave
  const topY = anchor.getYForTopText(1) - (stave ? 6 : 2)
  ctx.save()
  ctx.setFont('Space Mono, monospace', 9, 'bold')
  ctx.setFillStyle(dim)
  ctx.fillText('1', anchor.getNoteStartX() + 2, topY)
  const trailing = cols.length > 0 && cols[cols.length - 1]?.kind === 'bar'
  const last = marks.length - (trailing ? 1 : 0)
  marks.forEach((b, k) => {
    if (k >= last) return
    let x = 0
    try {
      x = b.getAbsoluteX()
    } catch {
      x = 0
    }
    if (x > 0) ctx.fillText(String(k + 2), x + 5, topY)
  })
  ctx.restore()

  // VexFlow writes the tab numbers in Arial: move them to the app's mono.
  try {
    host.querySelectorAll('text').forEach((t) => {
      if ((t.getAttribute('font-family') ?? '').includes('Arial')) {
        t.setAttribute('font-family', "'Space Mono', monospace")
        t.setAttribute('font-weight', '700')
      }
    })
  } catch {
    /* no SVG */
  }

  // Clicking the drawn note selects it — the staff stops being output only.
  const onPick = opts.onPick
  if (onPick) {
    for (const h of hit) {
      for (const n of [h.sn, h.tn]) {
        let el: SVGElement | null = null
        try {
          el = n.getSVGElement ? n.getSVGElement() : (n.attrs?.el ?? null)
        } catch {
          el = null
        }
        if (!el) continue
        el.style.cursor = 'pointer'
        el.addEventListener('click', (ev) => {
          ev.stopPropagation()
          onPick(h.i)
        })
      }
    }
  }
  return { width: W, height: H }
}
