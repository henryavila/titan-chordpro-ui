import type { Ref } from 'vue'
import { lastChordName, rowParts } from '@henryavila/titan-chordpro-ui'
import type { EditLatch } from './types'

export type GestureDeps = {
  root: Ref<HTMLElement | null>
  scroller: Ref<HTMLElement | null>
  editing: Ref<boolean>
  lines: Ref<string[]>
  source: Ref<string>
  dropAt: Ref<number | null>
  dragBi: Ref<number | null>
  placing: Ref<boolean>
  editKind: Ref<'lyric' | 'comment'>
  rowText: Ref<string>
  rowCaret: Ref<number | null>
  editRow: Ref<number | null>
  insertMenu: Ref<boolean>
  wantRowFocus: Ref<boolean>
  locals: EditLatch
  moveChord: (li: number, idx: number, off: number) => void
  addChord: (li: number, off: number, name: string) => number
  openChord: (li: number, idx: number, name: string, focus: boolean) => void
  moveBlock: (from: number, to: number) => void
  toggleSel: (bi: number) => void
  commitRow: (e?: Event) => void
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

function tappedOffset(e: Event, fallback: number): number {
  const t = e.target as HTMLElement | null
  const raw = t?.dataset?.i
  const i = raw == null || raw === '' ? NaN : Number(raw)
  return Number.isFinite(i) ? i : fallback
}

export function createGestures(d: GestureDeps) {
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
    // A long-press on touch is also the gesture that selects the lyric under
    // the finger. The chart refuses that selection for the whole hold.
    const root = d.root.value
    root?.classList.add('is-chord-drag')
    const blockSelect = (ev: Event) => ev.preventDefault()
    const clearTextSel = () => {
      const s = window.getSelection?.()
      if (s && !s.isCollapsed) s.removeAllRanges()
    }
    document.addEventListener('selectstart', blockSelect, true)
    clearTextSel()
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
      ring.className = 'titan-chordpro-pill-ring'
      pill.appendChild(ring)
      const tick = () => {
        const p = Math.min(1, (performance.now() - t0) / HOLD)
        const deg = (p * 360).toFixed(1)
        if (ring)
          ring.style.background = `conic-gradient(from -90deg, var(--chord) ${deg}deg, rgba(140,145,158,0.30) ${deg}deg)`
        if (p < 1) {
          clearTextSel()
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
      clearTextSel()
      const dx = ev.clientX - x0
      const dy = ev.clientY - y0
      if (!armed) {
        if (!panned && Math.abs(dx) + Math.abs(dy) < SLOP) return
        killRing()
        panned = true
        const sc = d.scroller.value
        if (sc) sc.scrollTop -= ev.clientY - lastY
        lastY = ev.clientY
        return
      }
      if (panned) return
      if (!moved && Math.abs(dx) + Math.abs(dy) < SLOP) return
      moved = true
      clearTextSel()
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
      document.removeEventListener('selectstart', blockSelect, true)
      root?.classList.remove('is-chord-drag')
      clearTextSel()
      killRing()
      for (const c of chars) c.style.boxShadow = ''
      pill.style.transform = ''
      pill.style.opacity = ''
      pill.style.zIndex = ''
      pill.style.cursor = ''
      pill.style.boxShadow = ''
      // Guarded by time: were a boolean used, a click the browser then swallows
      // would leave the flag stuck and eat the next tap.
      d.locals.pillAt = Date.now()
      if (panned) return
      if (moved) {
        if (target != null) d.moveChord(li, idx, target)
        return
      }
      d.openChord(li, idx, name, !touch)
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
      d.openChord(li, idx, name, true)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      e.stopPropagation()
      const c = rowParts(d.lines.value[li] ?? '').chords[idx]
      if (c) d.moveChord(li, idx, c.off + (e.key === 'ArrowLeft' ? -1 : 1))
    }
  }

  function rowClick(e: MouseEvent, li: number, plain: string) {
    if (Date.now() - d.locals.pillAt < 350) return
    if (d.placing.value) {
      const off = tappedOffset(e, plain.length)
      const name = lastChordName(d.source.value)
      const idx = d.addChord(li, off, name)
      d.placing.value = false
      // Naming is part of placing: the new chord opens its editor filled in.
      if (idx >= 0) d.openChord(li, idx, name, true)
      return
    }
    d.locals.skipCommit = false
    d.editKind.value = 'lyric'
    d.rowText.value = plain
    d.rowCaret.value = tappedOffset(e, plain.length)
    d.editRow.value = li
    d.insertMenu.value = false
    d.wantRowFocus.value = true
  }

  function onRowKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      d.commitRow()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      // The input unmounts without a blur: the flag has to be cleared here, or
      // the next commit (of another row) went out with it.
      d.locals.skipCommit = true
      d.editRow.value = null
      d.locals.skipCommit = false
    }
  }

  function gripKey(e: KeyboardEvent, bi: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      d.toggleSel(bi)
    }
  }

  function gripDown(e: PointerEvent, bi: number) {
    if (e.button != null && e.button !== 0) return
    e.preventDefault()
    const y0 = e.clientY
    let moved = false
    let pointerY = y0
    const updateTarget = () => {
      if (!moved) return
      // Scroll and notation reflow can move every block during a drag.
      const rects = Array.from(d.root.value?.querySelectorAll<HTMLElement>('[data-block]') ?? []).map(
        (el) => ({ bi: Number(el.dataset.block), r: el.getBoundingClientRect() }),
      )
      let t: number | null = null
      for (const it of rects)
        if (pointerY < it.r.top + it.r.height / 2) {
          t = it.bi
          break
        }
      if (t === null) t = rects.length ? (rects[rects.length - 1]?.bi ?? 0) + 1 : 0
      if (d.dropAt.value !== t) d.dropAt.value = t
    }
    const move = (ev: PointerEvent) => {
      pointerY = ev.clientY
      if (!moved && Math.abs(pointerY - y0) < 7) return
      moved = true
      if (d.dragBi.value !== bi) d.dragBi.value = bi
      updateTarget()
    }
    const scroller = d.scroller.value
    const up = (ev: PointerEvent) => {
      // Release can carry a newer position than the last delivered move.
      // Commit against that point, not the previous hover target.
      pointerY = ev.clientY
      updateTarget()
      scroller?.removeEventListener('scroll', updateTarget)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      const to = d.dropAt.value
      d.dropAt.value = null
      d.dragBi.value = null
      if (moved) {
        if (to !== null) d.moveBlock(bi, to)
      } else d.toggleSel(bi)
    }
    scroller?.addEventListener('scroll', updateTarget)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  /**
   * Absolute pills are measured onto their syllable. Flow pills (reading
   * columns, sung and voiceless) already reserve their width — moving them
   * would pull the chip off the letter it is anchored to.
   */
  function layoutPills() {
    const root = d.root.value
    if (!d.editing.value || !root) return
    for (const row of root.querySelectorAll<HTMLElement>('[data-row]')) {
      if (row.hasAttribute('data-played')) continue
      if (!row.querySelector('.titan-chordpro-pill:not(.titan-chordpro-pill--flow)')) continue
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

  return { chordDown, chordKey, rowClick, onRowKey, gripKey, gripDown, layoutPills }
}
