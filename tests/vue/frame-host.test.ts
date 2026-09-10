import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFrameHost } from '../../src/vue/use/useFrameHost'

/**
 * jsdom is always the top document, so the frame has to be faked: a stand-in
 * `parent` that records what the viewer posts, and hand-delivered messages that
 * carry the `source` a real one would.
 */
type Posted = { msg: Record<string, unknown>; target: string }

let posted: Posted[]
let fakeParent: { postMessage: (m: unknown, t: string) => void }

function fromHost(data: unknown, opts: { origin?: string; source?: unknown } = {}) {
  window.dispatchEvent(
    new MessageEvent('message', {
      data,
      origin: opts.origin ?? 'https://sda.example',
      source: ('source' in opts ? opts.source : fakeParent) as MessageEventSource | null,
    }),
  )
}

beforeEach(() => {
  posted = []
  fakeParent = { postMessage: (msg, target) => posted.push({ msg: msg as Record<string, unknown>, target }) }
  Object.defineProperty(window, 'parent', { configurable: true, get: () => fakeParent })
})

afterEach(() => {
  Reflect.deleteProperty(window, 'parent')
  vi.restoreAllMocks()
})

describe('asking the page that owns the frame', () => {
  it('says hello on start, and stays silent when it is not framed at all', () => {
    const framed = useFrameHost()
    framed.start()
    expect(posted.map((p) => p.msg.type)).toEqual(['hello'])
    framed.dispose()

    posted = []
    Object.defineProperty(window, 'parent', { configurable: true, get: () => window })
    const top = useFrameHost()
    top.start()
    expect(posted).toEqual([])
    top.dispose()
  })

  it('never assumes the host can expand — only a host saying so turns it on', () => {
    const fh = useFrameHost()
    fh.start()
    // Being inside a frame is not a capability. A viewer that took it for one
    // would offer a button that lights up and moves nothing, which is the bug
    // this whole road came from.
    expect(fh.canExpand.value).toBe(false)
    fh.expand(true)
    expect(posted.filter((p) => p.msg.type === 'expand')).toEqual([])

    fromHost({ source: 'titan-chordpro-host', type: 'capabilities', expandFrame: true })
    expect(fh.canExpand.value).toBe(true)
    fh.expand(true)
    expect(posted.at(-1)?.msg).toEqual({ source: 'titan-chordpro', type: 'expand', version: 1, on: true })
    fh.dispose()
  })

  it('learns the host origin from its first message instead of broadcasting forever', () => {
    const fh = useFrameHost()
    fh.start()
    // Nothing framed can read its parent's origin, so the opening line has to
    // go to everyone; after that there is a known address to use.
    expect(posted[0]?.target).toBe('*')
    fromHost({ source: 'titan-chordpro-host', type: 'capabilities', expandFrame: true })
    fh.expand(true)
    expect(posted.at(-1)?.target).toBe('https://sda.example')
    fh.dispose()
  })

  it('follows a frame the host collapses by its own hand', () => {
    const seen: boolean[] = []
    const fh = useFrameHost({ onExpanded: (on) => seen.push(on) })
    fh.start()
    fromHost({ source: 'titan-chordpro-host', type: 'capabilities', expandFrame: true })
    fromHost({ source: 'titan-chordpro-host', type: 'expanded', on: true })
    // A back gesture, a close button of the host's own: immersive has to follow
    // it down the same way it follows the browser leaving fullscreen.
    fromHost({ source: 'titan-chordpro-host', type: 'expanded', on: false })
    expect(seen).toEqual([true, false])
    // Repeats are not events.
    fromHost({ source: 'titan-chordpro-host', type: 'expanded', on: false })
    expect(seen).toEqual([true, false])
    fh.dispose()
  })
})

describe('what it refuses to listen to', () => {
  it('ignores anything that did not come from the page holding the frame', () => {
    const fh = useFrameHost()
    fh.start()
    const other = { postMessage: () => {} }
    fromHost({ source: 'titan-chordpro-host', type: 'capabilities', expandFrame: true }, { source: other })
    fromHost({ source: 'titan-chordpro-host', type: 'capabilities', expandFrame: true }, { source: null })
    expect(fh.canExpand.value).toBe(false)
    fh.dispose()
  })

  it('ignores traffic that is not this protocol, whatever shape it arrives in', () => {
    const fh = useFrameHost()
    fh.start()
    for (const junk of [
      null,
      'capabilities',
      42,
      { type: 'capabilities', expandFrame: true },
      { source: 'someone-else', type: 'capabilities', expandFrame: true },
      { source: 'titan-chordpro-host', type: 'capabilities', expandFrame: 'yes' },
    ]) {
      fromHost(junk)
    }
    // The last one matters most: only a real boolean turns the button on.
    expect(fh.canExpand.value).toBe(false)
    fh.dispose()
  })

  it('stops listening once disposed', () => {
    const fh = useFrameHost()
    fh.start()
    fh.dispose()
    fromHost({ source: 'titan-chordpro-host', type: 'capabilities', expandFrame: true })
    expect(fh.canExpand.value).toBe(false)
  })
})
