import { ref } from 'vue'

/**
 * The Fullscreen API as it really exists in the wild — and, more usefully, an
 * honest answer to whether it exists *here*, before anything is promised to
 * the reader.
 *
 * Three different things are true at once, and a viewer that cannot tell them
 * apart offers fullscreen everywhere and delivers it in one place, in silence:
 *
 * - **iPhone Safari has no element fullscreen.** It shipped behind an
 *   experimental flag in 17.2 and is off by default, so `requestFullscreen` is
 *   simply absent. Only `<video>` is ever allowed out. There is nothing to ask
 *   and nothing to retry — the ~110px of Safari chrome is not winnable.
 * - **WebKit before 16.4 and the in-app WebViews** (Instagram, Facebook, older
 *   Android WebView) only expose the `webkit` prefix, event included. Asking
 *   unprefixed there fails for no reason other than the spelling.
 * - **In a cross-origin iframe the API is present but disabled** unless the host
 *   wrote `allow="fullscreen"` on the frame. `fullscreenEnabled` is the only way
 *   to know that before asking, and it is what separates "this browser cannot"
 *   from "this embed was not allowed to".
 *
 * `available()` collapses the three into the one question the viewer needs
 * answered: is there a browser chrome to win back, or not?
 */

type FsElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void
}

type FsDocument = Document & {
  webkitFullscreenElement?: Element | null
  webkitFullscreenEnabled?: boolean
  webkitExitFullscreen?: () => Promise<void> | void
}

/**
 * Both spellings, always. A browser that has the unprefixed API fires only the
 * unprefixed event; one that has only the prefix fires only the prefixed one;
 * and the pair that carried both through the 16.x transition fires both, which
 * is harmless because the handler reads the DOM rather than the event.
 */
const CHANGE_EVENTS = ['fullscreenchange', 'webkitfullscreenchange'] as const

function fsDoc(): FsDocument | null {
  return typeof document === 'undefined' ? null : (document as FsDocument)
}

/** The element the browser currently holds fullscreen, prefix included. */
export function fullscreenElement(): Element | null {
  const d = fsDoc()
  if (!d) return null
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null
}

/**
 * - `ok` — asking will mean something.
 * - `unsupported` — the platform has no element fullscreen at all (iPhone
 *   Safari). Nothing the page or the host can do about it.
 * - `blocked-by-host` — the methods are all there and every call will be
 *   refused, because this is a cross-origin frame embedded without
 *   `allow="fullscreen"`. Measured in Chromium and WebKit: the default
 *   Permissions Policy allowlist for `fullscreen` is `self`, so a same-origin
 *   frame inherits the permission and needs no attribute; only a cross-origin
 *   one does. That case is a single attribute away from working, which is
 *   exactly why it must not be reported as "your browser can't".
 */
export type FullscreenStatus = 'ok' | 'unsupported' | 'blocked-by-host'

export function fullscreenStatus(el: HTMLElement | null): FullscreenStatus {
  const d = fsDoc()
  if (!d || !el) return 'unsupported'
  const target = el as FsElement
  if (!(target.requestFullscreen ?? target.webkitRequestFullscreen)) return 'unsupported'
  const enabled = d.fullscreenEnabled ?? d.webkitFullscreenEnabled ?? false
  if (enabled) return 'ok'
  // Present and disabled at once is not something a top-level document can be:
  // the permission is the only thing that turns a working API off.
  return 'blocked-by-host'
}

/** Whether asking would mean anything. */
export function fullscreenAvailable(el: HTMLElement | null): boolean {
  return fullscreenStatus(el) === 'ok'
}

export type FullscreenOpts = {
  /**
   * Called when the browser enters or leaves fullscreen by any hand — ours,
   * the reader's Esc, or the Android system gesture. Leaving that way has to
   * reach app state, or immersive mode outlives the fullscreen it came with.
   */
  onChange?: (active: boolean) => void
}

export function useFullscreen(opts: FullscreenOpts = {}) {
  /** True while the browser really holds us fullscreen — never our intent. */
  const active = ref(fullscreenElement() !== null)

  function sync() {
    const on = fullscreenElement() !== null
    if (on === active.value) return
    active.value = on
    opts.onChange?.(on)
  }

  /** Ask, and report what the browser actually did rather than what we wanted. */
  async function request(el: HTMLElement | null): Promise<boolean> {
    if (!fullscreenAvailable(el)) return false
    const target = el as FsElement
    const fn = target.requestFullscreen ?? target.webkitRequestFullscreen
    try {
      await fn?.call(target)
      return fullscreenElement() !== null
    } catch {
      // Refused at the gesture: no user activation, or the permission was
      // withdrawn between the check and the call.
      return false
    }
  }

  async function exit(): Promise<void> {
    const d = fsDoc()
    if (!d || !fullscreenElement()) return
    const fn = d.exitFullscreen ?? d.webkitExitFullscreen
    try {
      await fn?.call(d)
    } catch {
      /* already out */
    }
  }

  function start() {
    const d = fsDoc()
    if (!d) return
    CHANGE_EVENTS.forEach((ev) => d.addEventListener(ev, sync))
    sync()
  }

  function dispose() {
    const d = fsDoc()
    if (!d) return
    CHANGE_EVENTS.forEach((ev) => d.removeEventListener(ev, sync))
  }

  return { active, available: fullscreenAvailable, status: fullscreenStatus, request, exit, start, dispose }
}

const HOST_WARNING =
  '[Titan Chordpro] Tela cheia bloqueada pelo host: o viewer está num <iframe> ' +
  'cross-origin sem `allow="fullscreen"`, então a Fullscreen API existe e recusa ' +
  'toda chamada. Acrescente allow="fullscreen" ao iframe (um frame de mesma origem ' +
  'herda a permissão e não precisa). Sem isso o modo imersivo só consegue esconder ' +
  'a moldura do próprio viewer — `position:fixed` não escapa de um iframe. ' +
  'Ver docs/EMBED-SDA.md.'

let hostWarned = false

/**
 * Said out loud once, because it fails in silence and reads as a bug in the
 * viewer: the reader taps "tela cheia", gets the reduced frame, and nobody on
 * either side of the embed learns that one attribute was missing.
 */
export function warnIfHostBlocksFullscreen(el: HTMLElement | null): void {
  if (hostWarned || fullscreenStatus(el) !== 'blocked-by-host') return
  hostWarned = true
  console.warn(HOST_WARNING)
}
