import { computed, ref, type Ref } from 'vue'
import {
  addChord as addChordAt,
  blockLabel,
  blockSpan,
  copyHarmony as copyHarmonyOf,
  deleteBlock as deleteBlockAt,
  duplicateBlock as duplicateBlockAt,
  groupAfter,
  hideBlock as hideBlockAt,
  insertAt,
  insertBlock as insertBlockAt,
  insertImage,
  lastChordName,
  markCtx,
  moveBlock as moveBlockTo,
  moveChord as moveChordTo,
  pasteHarmony as pasteHarmonyOn,
  playedColumns,
  removeChord as removeChordAt,
  renameChord,
  rowParts,
  setBlockCapo as setBlockCapoOn,
  setComment,
  setLyric,
  shiftBlock,
  shiftLabel,
  toggleBlockDual as toggleBlockDualOn,
  unhideBlock as unhideBlockAt,
} from '@henryavila/titan-chordpro-ui'
import type { ChartBlock, Harmony, InsertKind, PlayedCol } from '@henryavila/titan-chordpro-ui'
import type { WriteMode } from '../public'

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
/** A score the host already has on file, offered as a reference for the source. */
export type { ImageChoice } from '../public'

/** A lyric row as the editor draws it: measurable syllables plus loose chords. */
export type EditToken = { isWord: boolean; chars: Array<{ ch: string; i: number }> }
export type EditRow = {
  li: number
  tokens: EditToken[]
  chords: Array<{ name: string; off: number }>
  plain: string
  /** Voiceless intro/interlude: columns like reading, not a pile of pills. */
  played: boolean
  columns: PlayedCol[]
}

/**
 * Editing a chart by its blocks: selection, reordering, the chord pills and
 * the in-place text. Every action goes through `core/block-edit` and comes back
 * as new source — nothing here keeps a parallel model of the song.
 */
export function useBlockEdit(opts: BlockEditOpts) {
  const sel = ref<number | null>(null)
  const dragBi = ref<number | null>(null)
  const dropAt = ref<number | null>(null)
  const editRow = ref<number | null>(null)
  const editKind = ref<'lyric' | 'comment'>('lyric')
  const rowText = ref('')
  const chordEdit = ref<ChordEdit | null>(null)
  const chordText = ref('')
  const placing = ref(false)
  const clip = ref<Harmony | null>(null)
  const insertMenu = ref(false)
  const picker = ref<PickerMode>(null)
  /** Guards the click a browser fires after a pill drag ends. */
  let pillAt = 0
  /** Set when Escape unmounts the row input, so its blur cannot commit. */
  let skipCommit = false
  /** Focus the row/chord input on the next paint — never on touch. */
  const wantRowFocus = ref(false)
  const wantChordFocus = ref(false)

  const lines = computed(() => opts.source.value.split('\n'))
  const blocks = computed(() => opts.blocks.value)
  const selBlock = computed<ChartBlock | null>(() =>
    sel.value === null ? null : (blocks.value[sel.value] ?? null),
  )

  function write(next: string[], message?: string) {
    opts.write(next.join('\n'), message)
  }

  function clearSel() {
    sel.value = null
    editRow.value = null
  }

  function reset() {
    clearSel()
    dragBi.value = null
    dropAt.value = null
    chordEdit.value = null
    placing.value = false
    insertMenu.value = false
    picker.value = null
    clip.value = null
  }

  // --------------------------------------------------------------- chords

  function moveChord(li: number, idx: number, off: number) {
    const cur = lines.value[li] ?? ''
    const p = rowParts(cur)
    const c = p.chords[idx]
    if (!c) return
    const at = Math.max(0, Math.min(p.plain.length, off))
    if (c.off === at) return
    const out = [...lines.value]
    out[li] = moveChordTo(cur, idx, at)
    write(out)
  }

  /** Places a chord and answers where it landed in the line's chord order. */
  function addChord(li: number, off: number, name: string): number {
    const cur = lines.value[li] ?? ''
    const p = rowParts(cur)
    const at = Math.max(0, Math.min(p.plain.length, off))
    const out = [...lines.value]
    out[li] = addChordAt(cur, at, name)
    write(out)
    // `rowJoin` sorts by offset and the new chord goes in last, so among the
    // ones already on that syllable it lands after them.
    return p.chords.filter((c) => c.off <= at).length
  }

  function applyChord() {
    const e = chordEdit.value
    if (!e) return
    const cur = lines.value[e.li] ?? ''
    const name = chordText.value.trim()
    const out = [...lines.value]
    out[e.li] = name ? renameChord(cur, e.idx, name) : removeChordAt(cur, e.idx)
    write(out, name ? undefined : 'Acorde removido')
    chordEdit.value = null
  }

  function dropChord() {
    chordText.value = ''
    applyChord()
  }

  function openChord(li: number, idx: number, name: string, focus: boolean) {
    chordText.value = name
    chordEdit.value = { li, idx }
    insertMenu.value = false
    wantChordFocus.value = focus
  }

  function nearestChar(chars: HTMLElement[], x: number, y: number): number | null {
    let best: number | null = null
    let bd = Infinity
    for (const c of chars) {
      const r = c.getBoundingClientRect()
      const dx = x < r.left ? r.left - x : x > r.right ? x - r.right : 0
      const dy = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0
      // Vertical distance weighs four times: a wrapped row must not steal the
      // drop from the visual line the finger is actually on.
      const d = dx + dy * 4
      if (d < bd) {
        bd = d
        best = Number(c.dataset.i)
      }
    }
    return best
  }

  /**
   * On touch, dragging has to be earned: a ring fills from the moment the
   * finger lands. Before it arms, the same gesture scrolls the chart as usual.
   */
  function chordDown(e: PointerEvent, li: number, idx: number, name: string) {
    if (e.button != null && e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const pill = e.currentTarget as HTMLElement
    const row = pill.closest('[data-row]') as HTMLElement | null
    if (!row) return
    const chars = Array.from(row.querySelectorAll<HTMLElement>('[data-i]'))
    const x0 = e.clientX
    const y0 = e.clientY
    // Finger, pen — and a mouse at phone width too, so the behaviour can be
    // tried in a preview without a device in hand.
    const touch = e.pointerType !== 'mouse' || window.innerWidth < 600
    const HOLD = 340
    const SLOP = touch ? 12 : 5
    let armed = !touch
    let moved = false
    let panned = false
    let target: number | null = null
    let lastY = e.clientY
    let ring: HTMLElement | null = null
    let raf = 0
    const t0 = performance.now()

    const mark = (i: number) => {
      for (const c of chars) c.style.boxShadow = ''
      const t = chars.find((c) => Number(c.dataset.i) === i)
      if (t) t.style.boxShadow = 'inset 2px 0 0 var(--chord)'
    }
    const killRing = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      ring?.parentNode?.removeChild(ring)
      ring = null
    }

    if (touch) {
      ring = document.createElement('span')
      ring.className = 'cpv-pill-ring'
      pill.appendChild(ring)
      const tick = () => {
        const p = Math.min(1, (performance.now() - t0) / HOLD)
        const deg = (p * 360).toFixed(1)
        if (ring)
          ring.style.background = `conic-gradient(from -90deg, var(--chord) ${deg}deg, rgba(140,145,158,0.30) ${deg}deg)`
        if (p < 1) {
          raf = requestAnimationFrame(tick)
          return
        }
        raf = 0
        armed = true
        pill.style.transform = 'scale(1.06)'
        pill.style.boxShadow = '0 8px 18px -8px rgba(0,0,0,0.6)'
        try {
          navigator.vibrate?.(12)
        } catch {
          /* haptics are a nicety */
        }
      }
      raf = requestAnimationFrame(tick)
    }

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - x0
      const dy = ev.clientY - y0
      if (!armed) {
        if (!panned && Math.abs(dx) + Math.abs(dy) < SLOP) return
        killRing()
        panned = true
        const sc = opts.scroller.value
        if (sc) sc.scrollTop -= ev.clientY - lastY
        lastY = ev.clientY
        return
      }
      if (panned) return
      if (!moved && Math.abs(dx) + Math.abs(dy) < SLOP) return
      moved = true
      pill.style.opacity = '0.9'
      pill.style.zIndex = '6'
      pill.style.cursor = 'grabbing'
      pill.style.transform = `translate(${dx}px,${dy}px)${touch ? ' scale(1.06)' : ''}`
      const i = nearestChar(chars, ev.clientX, ev.clientY)
      if (i != null) {
        target = i
        mark(i)
      }
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      killRing()
      for (const c of chars) c.style.boxShadow = ''
      pill.style.transform = ''
      pill.style.opacity = ''
      pill.style.zIndex = ''
      pill.style.cursor = ''
      pill.style.boxShadow = ''
      // Guarded by time: were a boolean used, a click the browser then swallows
      // would leave the flag stuck and eat the next tap.
      pillAt = Date.now()
      if (panned) return
      if (moved) {
        if (target != null) moveChord(li, idx, target)
        return
      }
      openChord(li, idx, name, !touch)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  /** The pill was reachable by Tab but not operable by keyboard. */
  function chordKey(e: KeyboardEvent, li: number, idx: number, name: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      openChord(li, idx, name, true)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      e.stopPropagation()
      const c = rowParts(lines.value[li] ?? '').chords[idx]
      if (c) moveChord(li, idx, c.off + (e.key === 'ArrowLeft' ? -1 : 1))
    }
  }

  // ---------------------------------------------------------- text in place

  function rowClick(e: MouseEvent, li: number, plain: string) {
    if (Date.now() - pillAt < 350) return
    if (placing.value) {
      const t = e.target as HTMLElement | null
      const i = t?.dataset ? Number(t.dataset.i) : NaN
      const off = Number.isFinite(i) ? i : plain.length
      const name = lastChordName(opts.source.value)
      const idx = addChord(li, off, name)
      placing.value = false
      // Naming is part of placing: the new chord opens its editor filled in.
      if (idx >= 0) openChord(li, idx, name, true)
      return
    }
    skipCommit = false
    editKind.value = 'lyric'
    rowText.value = plain
    editRow.value = li
    insertMenu.value = false
    wantRowFocus.value = true
  }

  /**
   * A rehearsal comment is text too. Renaming one used to mean opening the
   * source — including the ones the Insert menu had just created.
   */
  function editComment(li: number, text: string) {
    skipCommit = false
    editKind.value = 'comment'
    rowText.value = text
    editRow.value = li
    insertMenu.value = false
    wantRowFocus.value = true
  }

  function commitRow() {
    const li = editRow.value
    if (li === null || skipCommit) {
      skipCommit = false
      editRow.value = null
      return
    }
    if (editKind.value === 'comment') {
      const r = setComment(lines.value, li, rowText.value)
      write(r.lines, r.message || undefined)
    } else {
      const out = [...lines.value]
      out[li] = setLyric(out[li] ?? '', rowText.value)
      write(out)
    }
    editRow.value = null
  }

  function onRowKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitRow()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      // The input unmounts without a blur: the flag has to be cleared here, or
      // the next commit (of another row) went out with it.
      skipCommit = true
      editRow.value = null
      skipCommit = false
    }
  }

  // --------------------------------------------------------------- blocks

  function toggleSel(bi: number) {
    sel.value = sel.value === bi ? null : bi
    editRow.value = null
  }

  function gripKey(e: KeyboardEvent, bi: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggleSel(bi)
    }
  }

  function gripDown(e: PointerEvent, bi: number) {
    if (e.button != null && e.button !== 0) return
    e.preventDefault()
    const y0 = e.clientY
    const rects = Array.from(opts.root.value?.querySelectorAll<HTMLElement>('[data-block]') ?? []).map(
      (el) => ({ bi: Number(el.dataset.block), r: el.getBoundingClientRect() }),
    )
    let moved = false
    const move = (ev: PointerEvent) => {
      if (!moved && Math.abs(ev.clientY - y0) < 7) return
      moved = true
      if (dragBi.value !== bi) dragBi.value = bi
      let t: number | null = null
      for (const it of rects)
        if (ev.clientY < it.r.top + it.r.height / 2) {
          t = it.bi
          break
        }
      if (t === null) t = rects.length ? (rects[rects.length - 1]?.bi ?? 0) + 1 : 0
      if (dropAt.value !== t) dropAt.value = t
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      const to = dropAt.value
      dropAt.value = null
      dragBi.value = null
      if (moved) {
        if (to !== null) moveBlock(bi, to)
      } else toggleSel(bi)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  function moveBlock(from: number, to: number) {
    const r = moveBlockTo(lines.value, blocks.value, from, to)
    if (!r) {
      sel.value = from
      return
    }
    write(r.lines, r.message)
    sel.value = r.sel
    editRow.value = null
  }

  /** Reordering without a drag: keyboard and thumb have to reach it too. */
  function nudgeBlock(dir: number) {
    const bi = sel.value
    if (bi === null) return
    const sp = blockSpan(blocks.value, bi)
    if (!sp) return
    if (dir < 0) {
      if (sp.first > 0) {
        const prev = blockSpan(blocks.value, sp.first - 1)
        if (prev) moveBlock(bi, prev.first)
      }
    } else if (bi < blocks.value.length - 1) moveBlock(bi, groupAfter(blocks.value, bi + 1))
  }

  /**
   * After an insert the new block has to show up already selected — otherwise
   * the action looks like it did nothing.
   */
  function focusLine(li: number) {
    requestAnimationFrame(() => {
      const bs = blocks.value
      let bi = -1
      for (let i = 0; i < bs.length; i++) {
        if ((bs[i]?.li1 ?? -1) >= li) {
          bi = i
          break
        }
      }
      if (bi < 0) return
      sel.value = bi
      const el = opts.root.value?.querySelector<HTMLElement>(`[data-block="${bi}"]`)
      const sc = opts.scroller.value
      if (!el || !sc) return
      const top = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop
      sc.scrollTop = Math.max(0, top - 130)
    })
  }

  function deleteBlock() {
    if (sel.value === null) return
    const r = deleteBlockAt(lines.value, blocks.value, sel.value)
    if (!r) return
    write(r.lines, r.message)
    clearSel()
  }

  function hideBlock() {
    if (sel.value === null) return
    const r = hideBlockAt(lines.value, blocks.value, sel.value)
    if (!r) return
    write(r.lines, r.message)
    clearSel()
  }

  function unhideBlock(bi: number) {
    const r = unhideBlockAt(lines.value, blocks.value, bi)
    if (!r) return
    write(r.lines, r.message)
    clearSel()
  }

  function duplicateBlock() {
    if (sel.value === null) return
    const r = duplicateBlockAt(lines.value, blocks.value, sel.value)
    if (!r) return
    write(r.lines, r.message)
    focusLine(r.focusLine)
  }

  function secShift(n: number) {
    const b = selBlock.value
    if (!b) return
    const r = shiftBlock(lines.value, b, n, opts.flats.value)
    if (!r) return
    write(r.lines, r.message)
  }

  function secReset() {
    const b = selBlock.value
    if (!b) return
    const ctx = markCtx(lines.value, b)
    if (ctx?.shiftTotal) secShift(-ctx.shiftTotal)
  }

  /** Reset the block a grip is not on — the badge drawn beside the block. */
  function resetBlockShift(bi: number) {
    sel.value = bi
    secReset()
  }

  function setBlockCapo(step: number, drop: boolean) {
    const b = selBlock.value
    if (!b) return
    const r = setBlockCapoOn(lines.value, b, step, drop, opts.songCapo.value)
    if (!r) return
    write(r.lines, r.message)
  }

  function toggleBlockDual() {
    const b = selBlock.value
    if (!b) return
    const r = toggleBlockDualOn(lines.value, b)
    if (!r) return
    write(r.lines, r.message)
  }

  // ------------------------------------------------------- copy harmony

  function copyHarmony() {
    if (sel.value === null) return
    const h = copyHarmonyOf(lines.value, blocks.value, sel.value)
    if (!h) return
    clip.value = h
    opts.toast('Harmonia copiada — cole em quantos blocos quiser')
  }

  function pasteHarmony(bi: number) {
    const c = clip.value
    if (!c) return
    const r = pasteHarmonyOn(lines.value, blocks.value, bi, c)
    if (!r) return
    write(r.lines, r.message)
  }

  function togglePlacing() {
    placing.value = !placing.value
    editRow.value = null
  }

  // ------------------------------------------------------------ inserting

  /** Index of the block sitting at the top of the reading area. */
  function visibleBlock(): number | null {
    const sc = opts.scroller.value
    const root = opts.root.value
    if (!sc || !root) return null
    const top = sc.getBoundingClientRect().top + 140
    let best: number | null = null
    for (const el of root.querySelectorAll<HTMLElement>('[data-block]')) {
      if (el.getBoundingClientRect().bottom > top) {
        best = Number(el.dataset.block)
        break
      }
    }
    return best
  }

  /**
   * Without a selection the new block went to the end of the file, far out of
   * sight: it looked like inserting had done nothing. With none, it lands after
   * the block that is on screen.
   */
  function insertTarget(): number | null {
    return sel.value ?? visibleBlock()
  }

  function whereToInsert(): number {
    return insertAt(blocks.value, insertTarget(), lines.value.length)
  }

  /**
   * Where the menu says the block will land. It is a snapshot taken when the
   * menu opens, because the answer depends on what is scrolled into view —
   * and a label that says "at the end" while the block lands mid-chart is
   * worse than no label.
   */
  const insertWhere = ref('No fim da cifra')
  function toggleInsertMenu() {
    const open = !insertMenu.value
    insertMenu.value = open
    if (!open) return
    const bi = insertTarget()
    insertWhere.value = bi === null ? 'No fim da cifra' : `Depois de ${blockLabel(blocks.value, bi)}`
  }

  function insertBlock(kind: InsertKind) {
    const at = whereToInsert()
    const r = insertBlockAt(lines.value, at, kind)
    write(r.lines, r.message)
    insertMenu.value = false
    sel.value = null
    focusLine(r.focusLine)
  }

  function pickImage(file: string) {
    const replace = picker.value === 'replace'
    const r = insertImage(lines.value, blocks.value, sel.value, whereToInsert(), file, replace)
    write(r.lines, r.message)
    picker.value = null
    focusLine(r.focusLine)
  }

  function openPicker(mode: Exclude<PickerMode, null>) {
    picker.value = mode
    insertMenu.value = false
  }

  /**
   * A new score goes into the file empty and the editor opens on top of it.
   * Cancelling undoes the insert — no ghost block is left behind in the chart.
   */
  function insertScore(): { li0: number; li1: number } {
    const at = whereToInsert()
    const out = [...lines.value]
    out.splice(at, 0, '{sos: time=4/4 key=D tempo=92 tuning=EADGBE}', '{eos}', '')
    write(out, 'Partitura nova')
    insertMenu.value = false
    picker.value = null
    sel.value = null
    return { li0: at, li1: at + 1 }
  }

  /** Swap one block's lines for new ones — how the score editor writes back. */
  function replaceSpan(li0: number, li1: number, text: string, message: string) {
    const out = [...lines.value]
    out.splice(li0, Math.max(1, li1 - li0 + 1), ...text.split('\n'))
    write(out, message)
  }

  // ------------------------------------------------------------ rendering

  /** A row split into measurable syllables — what a chord can be dropped on. */
  function buildRow(li: number): EditRow {
    const raw = lines.value[li] ?? ''
    const p = rowParts(raw)
    const columns = playedColumns(raw)
    const tokens: EditToken[] = []
    let i = 0
    while (i < p.plain.length) {
      const sp = /\s/.test(p.plain[i] as string)
      let j = i
      while (j < p.plain.length && /\s/.test(p.plain[j] as string) === sp) j++
      const chars: Array<{ ch: string; i: number }> = []
      for (let k = i; k < j; k++) chars.push({ ch: p.plain[k] as string, i: k })
      tokens.push({ isWord: !sp, chars })
      i = j
    }
    return {
      li,
      tokens,
      chords: p.chords.map((c) => ({ name: c.name, off: c.off })),
      plain: p.plain,
      played: columns !== null,
      columns: columns ?? [],
    }
  }

  /**
   * Chord pills leave the flow: their position comes from measuring the real
   * syllable, once per visual line, avoiding collisions left to right — and if
   * the last one runs past the edge, pushing the earlier ones back left.
   */
  function layoutPills() {
    const root = opts.root.value
    if (!opts.editing.value || !root) return
    for (const row of root.querySelectorAll<HTMLElement>('[data-row]')) {
      // Played lines keep the reading columns: pills are in the flow.
      if (row.hasAttribute('data-played')) continue
      const rr = row.getBoundingClientRect()
      const chars = row.querySelectorAll<HTMLElement>('[data-i]')
      const last = chars.length ? chars[chars.length - 1]?.getBoundingClientRect() : null
      const items: Array<{ pill: HTMLElement; x: number; y: number; w: number; h: number }> = []
      for (const pill of row.querySelectorAll<HTMLElement>('[data-pill]')) {
        const off = Number(pill.dataset.pill)
        const t = row.querySelector<HTMLElement>(`[data-i="${off}"]`)
        const r = t ? t.getBoundingClientRect() : last
        const x = r ? (t ? r.left : r.right) - rr.left : 0
        const y = r ? r.top - rr.top : 0
        items.push({ pill, x, y, w: pill.offsetWidth, h: pill.offsetHeight || 23 })
      }
      const byLine = new Map<number, typeof items>()
      for (const it of items) {
        const bucket = byLine.get(it.y)
        if (bucket) bucket.push(it)
        else byLine.set(it.y, [it])
      }
      for (const lineItems of byLine.values()) {
        lineItems.sort((p, q) => p.x - q.x)
        for (let i = 1; i < lineItems.length; i++) {
          const prev = lineItems[i - 1] as (typeof items)[number]
          const cur = lineItems[i] as (typeof items)[number]
          const min = prev.x + prev.w + 4
          if (cur.x < min) cur.x = min
        }
        for (let i = lineItems.length - 1; i >= 0; i--) {
          const cur = lineItems[i] as (typeof items)[number]
          const max = rr.width - cur.w
          if (cur.x > max) cur.x = Math.max(0, max)
          if (i > 0) {
            const prev = lineItems[i - 1] as (typeof items)[number]
            const prevMax = cur.x - prev.w - 4
            if (prev.x > prevMax) prev.x = Math.max(0, prevMax)
          }
        }
      }
      for (const it of items) {
        it.pill.style.left = `${it.x.toFixed(1)}px`
        it.pill.style.top = `${Math.max(0, it.y - it.h - 3).toFixed(1)}px`
      }
    }
  }

  // ------------------------------------------------------------ selection

  const selSpan = computed(() =>
    opts.editing.value && sel.value !== null ? blockSpan(blocks.value, sel.value) : null,
  )
  const dragSpan = computed(() =>
    dragBi.value === null ? null : blockSpan(blocks.value, dragBi.value),
  )
  /** A label moves with its stanza, so it lights up with it too. */
  const inSel = (bi: number) =>
    bi === sel.value || !!(selSpan.value?.hasLab && bi === selSpan.value.first)
  const inDrag = (bi: number) =>
    bi === dragBi.value || !!(dragSpan.value?.hasLab && bi === dragSpan.value.first)

  const selLabel = computed(() =>
    sel.value === null ? '' : blockLabel(blocks.value, sel.value),
  )
  const selMarks = computed(() => {
    const b = selBlock.value
    return b ? markCtx(lines.value, b) : null
  })
  const selShift = computed(() => selMarks.value?.shiftTotal ?? 0)
  const selShiftLabel = computed(() => shiftLabel(selShift.value))
  const selHasChords = computed(
    () => selBlock.value?.kind === 'stanza' || selBlock.value?.kind === 'chorus',
  )
  const selIsScore = computed(
    () => selBlock.value?.kind === 'tab' || selBlock.value?.kind === 'score',
  )
  const selIsImage = computed(() => selBlock.value?.kind === 'image')
  const selIsHidden = computed(() => selBlock.value?.kind === 'hidden')
  const selCapoOwn = computed(() => selMarks.value?.capoVal != null)
  const selCapoLabel = computed(() => {
    const own = selMarks.value?.capoVal
    if (own != null) return own === 0 ? 'sem capo' : `casa ${own}`
    const c = opts.songCapo.value
    return c === 0 ? 'sem capo' : `casa ${c} (música)`
  })
  const selDualOn = computed(() => selCapoOwn.value && selMarks.value?.capoMapOn !== false)

  return {
    sel,
    selBlock,
    dragBi,
    dropAt,
    editRow,
    editKind,
    rowText,
    chordEdit,
    chordText,
    placing,
    clip,
    insertMenu,
    picker,
    wantRowFocus,
    wantChordFocus,
    inSel,
    inDrag,
    selLabel,
    selShift,
    selShiftLabel,
    selHasChords,
    selIsScore,
    selIsImage,
    selIsHidden,
    selCapoOwn,
    selCapoLabel,
    selDualOn,
    insertWhere,
    buildRow,
    layoutPills,
    clearSel,
    reset,
    toggleSel,
    gripKey,
    gripDown,
    nudgeBlock,
    moveBlock,
    deleteBlock,
    hideBlock,
    unhideBlock,
    duplicateBlock,
    secShift,
    secReset,
    resetBlockShift,
    setBlockCapo,
    toggleBlockDual,
    copyHarmony,
    pasteHarmony,
    togglePlacing,
    insertBlock,
    insertScore,
    toggleInsertMenu,
    replaceSpan,
    openPicker,
    pickImage,
    chordDown,
    chordKey,
    applyChord,
    dropChord,
    rowClick,
    editComment,
    commitRow,
    onRowKey,
    focusLine,
  }
}

/** Everything the editing surface needs, handed down as one object. */
export type BlockEditApi = ReturnType<typeof useBlockEdit>
