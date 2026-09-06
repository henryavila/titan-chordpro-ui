class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = RO as unknown as typeof ResizeObserver
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
