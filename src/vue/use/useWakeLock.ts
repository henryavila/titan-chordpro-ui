/**
 * Keep the device screen on while the viewer is mounted.
 *
 * Screen Wake Lock is a page API (HTTPS, visible tab). It does not need a PWA.
 * Chrome often wants a user gesture on the first ask; iOS Safari 16.4+ works in
 * a tab. The lock is dropped when the tab hides — we ask again on return.
 *
 * Always on for this product: rehearsal/presentation must not dim mid-chorus.
 * No toggle. Missing API or a denied request is a silent no-op.
 */

type WakeLockSentinelLike = {
  released: boolean
  release: () => Promise<void>
  addEventListener: (type: 'release', fn: () => void) => void
  removeEventListener: (type: 'release', fn: () => void) => void
}

type WakeLockNav = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> }
}

function nav(): WakeLockNav | null {
  return typeof navigator === 'undefined' ? null : (navigator as WakeLockNav)
}

export function useWakeLock() {
  let wanted = false
  let sentinel: WakeLockSentinelLike | null = null
  let inflight: Promise<void> | null = null

  function onSentinelRelease() {
    if (sentinel) {
      sentinel.removeEventListener('release', onSentinelRelease)
      sentinel = null
    }
    if (wanted) void acquire()
  }

  async function acquire() {
    if (!wanted) return
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
    const api = nav()?.wakeLock
    if (!api?.request) return
    if (sentinel && !sentinel.released) return
    if (inflight) return inflight
    inflight = (async () => {
      try {
        const next = await api.request('screen')
        if (!wanted) {
          await next.release().catch(() => {})
          return
        }
        sentinel = next
        next.addEventListener('release', onSentinelRelease)
      } catch {
        /* permission, battery saver, hidden document — retry on the next gesture */
      }
    })()
    try {
      await inflight
    } finally {
      inflight = null
    }
  }

  function onVisibility() {
    if (document.visibilityState === 'visible') void acquire()
  }

  function onGesture() {
    void acquire()
  }

  function start() {
    if (wanted) return
    wanted = true
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pointerdown', onGesture, { passive: true })
    window.addEventListener('keydown', onGesture, { passive: true })
    void acquire()
  }

  function stop() {
    wanted = false
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pointerdown', onGesture)
    window.removeEventListener('keydown', onGesture)
    const held = sentinel
    sentinel = null
    if (held) {
      held.removeEventListener('release', onSentinelRelease)
      if (!held.released) void held.release().catch(() => {})
    }
  }

  return { start, stop }
}
