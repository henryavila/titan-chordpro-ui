import { jsPDF } from 'jspdf'
import { layoutChart } from '../core/layout'
import { transposeToken, usesFlats } from '../core/transpose'
import type { ChartBlock, ChordProView } from '../core/types'

export type PdfOptions = {
  title?: string
  personal?: boolean
}

function pairOf(segs: Array<{ chord: string; text: string }>): [string, string] {
  let c = ''
  let l = ''
  for (const s of segs) {
    if (s.chord) {
      if (c.length > l.length) l += ' '.repeat(c.length - l.length)
      c += ' '.repeat(Math.max(0, l.length - c.length)) + s.chord + ' '
    }
    l += s.text
  }
  return [c.replace(/\s+$/, ''), l.replace(/\s+$/, '')]
}

function wrapPair(c0: string, l0: string, n: number): Array<[string, string]> {
  let c = c0
  let l = l0
  const out: Array<[string, string]> = []
  while (l.length > n || c.length > n) {
    let cut = Math.min(n, Math.max(l.length, c.length))
    let b = l.lastIndexOf(' ', cut)
    if (b < n * 0.55) b = cut
    out.push([c.slice(0, b).replace(/\s+$/, ''), l.slice(0, b).replace(/\s+$/, '')])
    c = c.slice(b)
    l = l.slice(b)
    let k = 0
    while (l[k] === ' ') k++
    if (k && !c.slice(0, k).trim()) {
      l = l.slice(k)
      c = c.slice(k)
    }
  }
  out.push([c, l])
  return out
}

export async function renderPdf(view: ChordProView, opts: PdfOptions = {}): Promise<Uint8Array> {
  const meta = view.meta
  const rows = layoutChart(view)
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = 595.28
  const H = 841.89
  const M = 48
  const R = W - M
  const FS = 10.5
  const CW = FS * 0.6
  const LH = 13.2
  const GAP = 7
  const CLH = 10.6
  const FSC = 12.2
  const CSC = CW - FSC * 0.6
  const cols = Math.floor((R - M) / CW)
  const title = opts.title ?? meta.title ?? 'Sem título'
  const flats = usesFlats(meta.key)
  const keyNote = view.displayKey
    ? `Tom ${view.displayKey}`
    : meta.key
      ? `Tom ${transposeToken(meta.key, view.transposeSemitones, flats)}`
      : ''
  const personal = opts.personal ? '  ·  versão pessoal' : ''
  let y = 0
  let page = 0

  const header = () => {
    if (page === 1) {
      doc.setFont('helvetica', 'bold').setFontSize(17).setTextColor(20)
      doc.text(title, M, M + 6)
      const sub = [meta.subtitle, meta.artist].filter(Boolean).join(' · ')
      const info = [keyNote + personal, meta.tempo ? `${meta.tempo} BPM` : '', meta.time, meta.duration]
        .filter(Boolean)
        .join('   ')
      doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(110)
      if (sub) doc.text(sub, M, M + 21)
      if (info) doc.text(info, R, M + 6, { align: 'right' })
      y = M + (sub ? 40 : 32)
    } else {
      doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(140)
      doc.text(title, M, M - 6)
      if (keyNote) doc.text(keyNote, R, M - 6, { align: 'right' })
      y = M + 10
    }
    doc.setDrawColor(220).setLineWidth(0.7).line(M, y - 10, R, y - 10)
    doc.setFontSize(8.5).setTextColor(160).setFont('helvetica', 'normal')
    doc.text(String(page), W / 2, H - 30, { align: 'center' })
  }

  const nextPage = () => {
    if (page) doc.addPage()
    page++
    header()
  }
  const room = (h: number) => {
    if (y + h > H - M) nextPage()
  }
  nextPage()

  for (const block of rows) {
    if (block.kind === 'comment') {
      room(24)
      y += 6
      doc.setFont('helvetica', 'bold').setFontSize(8.6).setTextColor(90)
      const t = block.text.toUpperCase()
      doc.text(t, M, y)
      const tw = doc.getTextWidth(t)
      doc.setDrawColor(228).setLineWidth(0.7).line(M + tw + 8, y - 3, R, y - 3)
      y += 12
      continue
    }
    if (block.kind === 'note') {
      const txt = block.items.join('\n')
      doc.setFont('helvetica', 'italic').setFontSize(9).setTextColor(105)
      const ls = doc.splitTextToSize(txt, R - M - 18)
      room(ls.length * 11 + 16)
      doc.setFillColor(245, 246, 248).rect(M, y - 8, R - M, ls.length * 11 + 12, 'F')
      doc.text(ls, M + 9, y + 2)
      y += ls.length * 11 + 16
      continue
    }
    if (block.kind === 'tab' || block.kind === 'score') {
      const ls = block.text.replace(/^\n+|\n+$/g, '').split('\n')
      const wide = ls.reduce((a, t) => Math.max(a, t.length), 0)
      let fs = 8.6
      if (wide > 0) fs = Math.max(5.6, Math.min(8.6, (R - M - 6) / (wide * 0.6)))
      const lh = fs * 1.22
      const h = ls.length * lh + GAP
      if (y + h > H - M && h <= H - 2 * M) nextPage()
      doc.setFont('courier', 'normal').setFontSize(fs).setTextColor(60)
      for (const t of ls) {
        room(lh)
        doc.text(t, M + 4, y)
        y += lh
      }
      y += GAP
      continue
    }
    if (block.kind !== 'stanza' && block.kind !== 'chorus') continue
    const chorus = block.kind === 'chorus'
    const x = M + (chorus ? 14 : 0)
    let ruleTop = y - 9
    for (const r of block.rows) {
      const [c0, l0] = pairOf(r.segs)
      for (const [c, l] of wrapPair(c0, l0, cols - (chorus ? 3 : 0))) {
        room(c ? LH + CLH : LH)
        if (y - 9 < ruleTop) ruleTop = y - 9
        if (c) {
          doc.setFont('courier', 'bold').setFontSize(FSC).setTextColor(17, 84, 48)
          doc.text(c, x, y, { charSpace: CSC })
          y += CLH
        }
        doc.setFont('courier', 'normal').setFontSize(FS).setTextColor(25)
        doc.text(l, x, y)
        y += LH
        if (chorus) {
          doc.setDrawColor(24, 96, 56).setLineWidth(1.4).line(M + 2, ruleTop, M + 2, y - 6)
        }
      }
    }
    y += GAP + (chorus ? 4 : 0)
  }

  const out = doc.output('arraybuffer')
  return new Uint8Array(out)
}
