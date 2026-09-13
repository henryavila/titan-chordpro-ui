import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import SetlistSheet, { type SetlistItem } from '../../src/vue/sheets/SetlistSheet.vue'

const item = (over: Partial<SetlistItem> = {}): SetlistItem => ({
  i: 0,
  id: 'a',
  num: '01',
  title: 'Uma',
  sub: '',
  keyLabel: 'G',
  hasKey: true,
  bpmLabel: '80',
  current: false,
  failed: false,
  busy: false,
  seen: false,
  ...over,
})

function mockVisualViewport(view: { w: number; h: number; x?: number; y?: number }) {
  const listeners = new Map<string, Set<() => void>>()
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: {
      width: view.w,
      height: view.h,
      offsetLeft: view.x ?? 0,
      offsetTop: view.y ?? 0,
      addEventListener: (type: string, fn: () => void) => {
        if (!listeners.has(type)) listeners.set(type, new Set())
        listeners.get(type)!.add(fn)
      },
      removeEventListener: (type: string, fn: () => void) => {
        listeners.get(type)?.delete(fn)
      },
    },
  })
  return {
    shrink(h: number) {
      const vv = window.visualViewport as unknown as { height: number }
      vv.height = h
      listeners.get('resize')?.forEach((fn) => fn())
    },
  }
}

function hostBox(w: number, h: number) {
  const host = document.createElement('div')
  // Same containing block the viewer uses in production — Vue's data-v-app wrapper is not it.
  host.className = 'cpv-root'
  host.style.position = 'relative'
  host.style.width = `${w}px`
  host.style.height = `${h}px`
  host.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: w,
      bottom: h,
      width: w,
      height: h,
      toJSON: () => ({}),
    }) as DOMRect
  document.body.appendChild(host)
  return host
}

const mounted: ReturnType<typeof mount>[] = []
const hosts: HTMLElement[] = []

afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  hosts.splice(0).forEach((h) => h.remove())
  Reflect.deleteProperty(window, 'visualViewport')
})

describe('SetlistSheet above the soft keyboard', () => {
  it('raises the compact overlay when the visual viewport shrinks under the keyboard', async () => {
    const host = hostBox(390, 844)
    hosts.push(host)
    mockVisualViewport({ w: 390, h: 500 })

    const w = mount(SetlistSheet, {
      attachTo: host,
      props: {
        compact: true,
        headLabel: '12 músicas',
        seenLabel: '3 ensaiadas',
        showSearch: true,
        query: 'Uma',
        items: [item()],
        noHit: false,
      },
    })
    mounted.push(w)
    await nextTick()

    const overlay = w.get('[data-setlist-overlay]').element as HTMLElement
    // 844 − 500 = 344px of keyboard — flex-end must sit above it, not behind it.
    expect(overlay.style.bottom).toBe('344px')
    expect(overlay.style.top).toBe('0px')
  })

  it('keeps inset 0 when the visual viewport still fills the host', async () => {
    const host = hostBox(390, 844)
    hosts.push(host)
    mockVisualViewport({ w: 390, h: 844 })

    const w = mount(SetlistSheet, {
      attachTo: host,
      props: {
        compact: true,
        headLabel: '12',
        seenLabel: '',
        showSearch: true,
        query: '',
        items: [item(), item({ i: 1, id: 'b', title: 'Duas' })],
        noHit: false,
      },
    })
    mounted.push(w)
    await nextTick()

    const overlay = w.get('[data-setlist-overlay]').element as HTMLElement
    expect(overlay.style.bottom).toBe('0px')
  })

  it('updates when the keyboard opens after mount', async () => {
    const host = hostBox(390, 844)
    hosts.push(host)
    const vv = mockVisualViewport({ w: 390, h: 844 })

    const w = mount(SetlistSheet, {
      attachTo: host,
      props: {
        compact: true,
        headLabel: '12',
        seenLabel: '',
        showSearch: true,
        query: '',
        items: [item()],
        noHit: false,
      },
    })
    mounted.push(w)
    await nextTick()
    expect((w.get('[data-setlist-overlay]').element as HTMLElement).style.bottom).toBe('0px')

    vv.shrink(480)
    await nextTick()
    expect((w.get('[data-setlist-overlay]').element as HTMLElement).style.bottom).toBe('364px')
  })

  it('lifts the compact sheet to the top while searching — no-hit must not sit under the keyboard', async () => {
    const host = hostBox(390, 844)
    hosts.push(host)
    mockVisualViewport({ w: 390, h: 844 })

    const w = mount(SetlistSheet, {
      attachTo: host,
      props: {
        compact: true,
        headLabel: '12 músicas',
        seenLabel: '',
        showSearch: true,
        query: '',
        items: [item()],
        noHit: false,
      },
    })
    mounted.push(w)
    await nextTick()

    const overlay = w.get('[data-setlist-overlay]')
    expect(getComputedStyle(overlay.element).alignItems).toBe('flex-end')

    // Focus alone lifts — overlay keyboards often never resize visualViewport.
    await w.get('[data-setlist-search]').trigger('focus')
    await nextTick()
    expect(getComputedStyle(overlay.element).alignItems).toBe('flex-start')

    await w.setProps({ query: 'zzz', items: [], noHit: true })
    await nextTick()
    expect(getComputedStyle(overlay.element).alignItems).toBe('flex-start')
    expect(w.text()).toContain('Nenhuma música')

    // Query kept after blur still lifts; clearing returns to the bottom sheet.
    await w.get('[data-setlist-search]').trigger('blur')
    await nextTick()
    expect(getComputedStyle(overlay.element).alignItems).toBe('flex-start')

    await w.setProps({ query: '', items: [item()], noHit: false })
    await nextTick()
    expect(getComputedStyle(overlay.element).alignItems).toBe('flex-end')
  })
})
