import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSurfaceGuard } from '../../src/vue/use/useSurfaceGuard'

/**
 * `parentH` is what the parent measures *after* the probe drops the floor —
 * the number that decides whether the host framed the viewer or not.
 */
function frame(rootH: number, parentH: number) {
  const parent = document.createElement('div')
  const el = document.createElement('div')
  parent.appendChild(el)
  document.body.appendChild(parent)
  Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => rootH })
  Object.defineProperty(parent, 'clientHeight', { configurable: true, get: () => parentH })
  return el
}

/** A framed viewer stands on the floor; a collapsed parent reports ~nothing. */
const FRAMED = { root: 600, parent: 600 }
const COLLAPSED = { root: 460, parent: 0 }

function guardFor(size: { root: number; parent: number }, opts: { enabled?: boolean; immersive?: boolean } = {}) {
  const el = frame(size.root, size.parent)
  return useSurfaceGuard({
    root: ref(el),
    immersive: ref(opts.immersive ?? false),
    enabled: ref(opts.enabled ?? true),
  })
}

let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.useFakeTimers()
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('the host has to give the frame a height', () => {
  it('accuses a collapsed parent — but only once a second look agrees', () => {
    const g = guardFor(COLLAPSED)
    g.start()

    // First look lands, and says nothing: during first layout the frame shows
    // collapsed for an instant, and that must not be reported.
    vi.advanceTimersByTime(500)
    expect(g.bad.value).toBe(false)
    expect(warn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1200)
    expect(g.bad.value).toBe(true)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]?.[0])).toContain('docs/CONSUMER.md')
  })

  it('says nothing when the parent has a height', () => {
    const g = guardFor(FRAMED)
    g.start()
    vi.advanceTimersByTime(5000)
    expect(g.bad.value).toBe(false)
    expect(warn).not.toHaveBeenCalled()
  })

  it('warns once, however many times it re-checks', () => {
    const g = guardFor(COLLAPSED)
    g.start()
    vi.advanceTimersByTime(1700)
    g.check()
    g.check()
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('a host that turns the guard off is not nagged', () => {
    const g = guardFor(COLLAPSED, { enabled: false })
    g.start()
    vi.advanceTimersByTime(5000)
    expect(g.bad.value).toBe(false)
    expect(warn).not.toHaveBeenCalled()
  })

  it('immersive is not a collapse: the root is fixed, no parent governs it', () => {
    const g = guardFor(COLLAPSED, { immersive: true })
    g.start()
    vi.advanceTimersByTime(5000)
    expect(g.bad.value).toBe(false)
    expect(warn).not.toHaveBeenCalled()
  })

  it('a root measuring zero is nobody laid out — display:none, or no layout at all', () => {
    const g = guardFor({ root: 0, parent: 0 })
    g.start()
    vi.advanceTimersByTime(5000)
    expect(g.bad.value).toBe(false)
    expect(warn).not.toHaveBeenCalled()
  })

  it('closing the banner settles it for the session', () => {
    const g = guardFor(COLLAPSED)
    g.start()
    vi.advanceTimersByTime(1700)
    expect(g.bad.value).toBe(true)

    g.dismiss()
    expect(g.bad.value).toBe(false)
    g.check()
    vi.advanceTimersByTime(5000)
    expect(g.bad.value).toBe(false)
  })

  it('stops accusing as soon as the host fixes the height', () => {
    const el = frame(460, 0)
    let parentH = 0
    Object.defineProperty(el.parentElement as HTMLElement, 'clientHeight', {
      configurable: true,
      get: () => parentH,
    })
    const g = useSurfaceGuard({ root: ref(el), immersive: ref(false), enabled: ref(true) })
    g.start()
    vi.advanceTimersByTime(1700)
    expect(g.bad.value).toBe(true)

    parentH = 620
    g.check()
    expect(g.bad.value).toBe(false)
  })
})
