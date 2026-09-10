import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fullscreenAvailable,
  fullscreenStatus,
  useFullscreen,
  warnIfHostBlocksFullscreen,
} from '../../src/vue/use/useFullscreen'

type Spelling = 'std' | 'webkit' | 'none'

/**
 * jsdom ships none of this, which is itself the iPhone Safari shape — so every
 * other browser in the matrix has to be built by hand.
 */
function browser(opts: { spelling: Spelling; enabled?: boolean }) {
  const el = document.createElement('div')
  const calls: string[] = []
  const d = document as unknown as Record<string, unknown>
  const e = el as unknown as Record<string, unknown>
  const undo: Array<() => void> = []

  const set = (obj: Record<string, unknown>, key: string, value: unknown) => {
    const had = key in obj
    const prev = obj[key]
    obj[key] = value
    undo.push(() => {
      if (had) obj[key] = prev
      else delete obj[key]
    })
  }

  let current: Element | null = null
  const enter = (name: string) => () => {
    calls.push(name)
    current = el
    document.dispatchEvent(new Event(opts.spelling === 'webkit' ? 'webkitfullscreenchange' : 'fullscreenchange'))
    return Promise.resolve()
  }
  const leave = (name: string) => () => {
    calls.push(name)
    current = null
    document.dispatchEvent(new Event(opts.spelling === 'webkit' ? 'webkitfullscreenchange' : 'fullscreenchange'))
    return Promise.resolve()
  }

  if (opts.spelling === 'std') {
    set(e, 'requestFullscreen', enter('requestFullscreen'))
    set(d, 'exitFullscreen', leave('exitFullscreen'))
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => current })
    undo.push(() => Reflect.deleteProperty(document, 'fullscreenElement'))
  }
  if (opts.spelling === 'webkit') {
    set(e, 'webkitRequestFullscreen', enter('webkitRequestFullscreen'))
    set(d, 'webkitExitFullscreen', leave('webkitExitFullscreen'))
    Object.defineProperty(document, 'webkitFullscreenElement', { configurable: true, get: () => current })
    undo.push(() => Reflect.deleteProperty(document, 'webkitFullscreenElement'))
  }
  if (opts.spelling !== 'none') {
    const key = opts.spelling === 'webkit' ? 'webkitFullscreenEnabled' : 'fullscreenEnabled'
    set(d, key, opts.enabled ?? true)
  }

  return { el, calls, restore: () => undo.reverse().forEach((fn) => fn()) }
}

let open: { restore: () => void } | null = null
afterEach(() => {
  open?.restore()
  open = null
  vi.restoreAllMocks()
})

describe('what the platform actually allows', () => {
  it('reads a browser with no element fullscreen as unsupported — the iPhone Safari case', () => {
    const b = (open = browser({ spelling: 'none' }))
    expect(fullscreenStatus(b.el)).toBe('unsupported')
    expect(fullscreenAvailable(b.el)).toBe(false)
  })

  it('reads methods present and the API disabled as the host blocking it, never as the browser', () => {
    // Present and disabled at once is a state only an iframe with no
    // `allow="fullscreen"` produces, and it is one attribute away from working.
    const b = (open = browser({ spelling: 'std', enabled: false }))
    expect(fullscreenStatus(b.el)).toBe('blocked-by-host')
    expect(fullscreenAvailable(b.el)).toBe(false)
  })

  it('reads a permitted document as ok, in either spelling', () => {
    const std = (open = browser({ spelling: 'std' }))
    expect(fullscreenStatus(std.el)).toBe('ok')
    std.restore()
    const webkit = (open = browser({ spelling: 'webkit' }))
    expect(fullscreenStatus(webkit.el)).toBe('ok')
  })

  it('says the host is blocking it out loud, once, and stays quiet everywhere else', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const quiet = (open = browser({ spelling: 'std' }))
    warnIfHostBlocksFullscreen(quiet.el)
    expect(warn).not.toHaveBeenCalled()
    quiet.restore()

    const blocked = (open = browser({ spelling: 'std', enabled: false }))
    warnIfHostBlocksFullscreen(blocked.el)
    warnIfHostBlocksFullscreen(blocked.el)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('allow="fullscreen"')
  })
})

describe('asking, in the spelling the browser has', () => {
  it('uses the webkit prefix where that is the only one there', async () => {
    const b = (open = browser({ spelling: 'webkit' }))
    const fs = useFullscreen()
    fs.start()
    expect(await fs.request(b.el)).toBe(true)
    expect(b.calls).toEqual(['webkitRequestFullscreen'])
    expect(fs.active.value).toBe(true)
    await fs.exit()
    expect(b.calls).toEqual(['webkitRequestFullscreen', 'webkitExitFullscreen'])
    fs.dispose()
  })

  it('never asks where asking is refused, so the caller learns before promising anything', async () => {
    const b = (open = browser({ spelling: 'std', enabled: false }))
    const fs = useFullscreen()
    fs.start()
    expect(await fs.request(b.el)).toBe(false)
    expect(b.calls).toEqual([])
    fs.dispose()
  })

  it('reports leaving by the browser own hand, in either spelling', async () => {
    for (const spelling of ['std', 'webkit'] as const) {
      const b = (open = browser({ spelling }))
      const seen: boolean[] = []
      const fs = useFullscreen({ onChange: (on) => seen.push(on) })
      fs.start()
      await fs.request(b.el)
      // The reader's own Esc, or the Android system gesture: nothing of ours ran.
      await fs.exit()
      expect(seen).toEqual([true, false])
      fs.dispose()
      b.restore()
      open = null
    }
  })
})
