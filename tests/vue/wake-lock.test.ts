import { afterEach, describe, expect, it, vi } from 'vitest'
import { useWakeLock } from '../../src/vue/use/useWakeLock'

type FakeSentinel = {
  released: boolean
  release: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  fireRelease: () => void
}

function installWakeLock() {
  const listeners = new Map<string, Set<() => void>>()
  const sentinels: FakeSentinel[] = []
  const request = vi.fn(async () => {
    const releaseFns = new Set<() => void>()
    const sentinel: FakeSentinel = {
      released: false,
      release: vi.fn(async () => {
        sentinel.released = true
        releaseFns.forEach((fn) => fn())
      }),
      addEventListener: vi.fn((type: string, fn: () => void) => {
        if (type === 'release') releaseFns.add(fn)
      }),
      removeEventListener: vi.fn((type: string, fn: () => void) => {
        if (type === 'release') releaseFns.delete(fn)
      }),
      fireRelease() {
        sentinel.released = true
        releaseFns.forEach((fn) => fn())
      },
    }
    sentinels.push(sentinel)
    return sentinel
  })
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: { request },
  })
  return { request, sentinels, listeners }
}

let hook: ReturnType<typeof useWakeLock> | null = null
afterEach(() => {
  hook?.stop()
  hook = null
  Reflect.deleteProperty(navigator, 'wakeLock')
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  vi.restoreAllMocks()
})

describe('screen wake lock', () => {
  it('asks for a screen lock as soon as the viewer starts', async () => {
    const api = installWakeLock()
    hook = useWakeLock()
    hook.start()
    await Promise.resolve()
    expect(api.request).toHaveBeenCalledWith('screen')
    expect(api.sentinels).toHaveLength(1)
  })

  it('does not ask twice while it already holds a lock', async () => {
    const api = installWakeLock()
    hook = useWakeLock()
    hook.start()
    await Promise.resolve()
    window.dispatchEvent(new Event('pointerdown'))
    await Promise.resolve()
    expect(api.request).toHaveBeenCalledTimes(1)
  })

  it('asks again when the tab comes back to the foreground', async () => {
    const api = installWakeLock()
    hook = useWakeLock()
    hook.start()
    await Promise.resolve()
    api.sentinels[0]!.fireRelease()
    await Promise.resolve()
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    const afterHide = api.request.mock.calls.length
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()
    expect(api.request.mock.calls.length).toBeGreaterThan(afterHide)
  })

  it('does not ask while the tab is hidden', async () => {
    const api = installWakeLock()
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    hook = useWakeLock()
    hook.start()
    await Promise.resolve()
    expect(api.request).not.toHaveBeenCalled()
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  })

  it('releases on stop and does not re-ask after that', async () => {
    const api = installWakeLock()
    hook = useWakeLock()
    hook.start()
    await Promise.resolve()
    hook.stop()
    await Promise.resolve()
    expect(api.sentinels[0]!.release).toHaveBeenCalled()
    api.sentinels[0]!.fireRelease()
    await Promise.resolve()
    expect(api.request).toHaveBeenCalledTimes(1)
  })

  it('is a no-op when the browser has no wakeLock', () => {
    hook = useWakeLock()
    expect(() => hook!.start()).not.toThrow()
    expect(() => hook!.stop()).not.toThrow()
  })

  it('swallows a denied request', async () => {
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: vi.fn(async () => { throw new Error('NotAllowedError') }) },
    })
    hook = useWakeLock()
    hook.start()
    await Promise.resolve()
    expect(() => hook!.stop()).not.toThrow()
  })
})
