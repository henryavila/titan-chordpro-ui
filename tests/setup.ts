class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = RO as unknown as typeof ResizeObserver
}

if (typeof globalThis.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      // Own, writable fields — Vue Test Utils assigns `button` / coords onto
      // the event after construct, and MouseEvent's prototype getters throw.
      const own: Record<string, unknown> = {
        pointerId: init.pointerId ?? 0,
        pointerType: String(init.pointerType ?? ''),
        isPrimary: init.isPrimary ?? true,
        button: init.button ?? 0,
        buttons: init.buttons ?? 0,
        clientX: init.clientX ?? 0,
        clientY: init.clientY ?? 0,
      }
      for (const [key, value] of Object.entries(own)) {
        Object.defineProperty(this, key, { value, writable: true, configurable: true })
      }
    }
  }
  globalThis.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent
}

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('dark'),
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false
    },
  })) as typeof window.matchMedia
}

// Node 25+ exposes a global localStorage accessor without backing storage.
// Browser tests must consistently use jsdom's origin-scoped implementation.
const domWindow = (globalThis as unknown as { jsdom: { window: Window } }).jsdom.window
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: domWindow.localStorage })
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: domWindow.sessionStorage })
