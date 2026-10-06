import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import ScoreOptionsMenu from '../../src/vue/chart/ScoreOptionsMenu.vue'
import '../../src/vue/titan-chordpro.css'

/**
 * The options sheet is teleported to document.body. Button chrome that only
 * lives on `.titan-chordpro-root` never reaches it, and the rows paint as the
 * browser's white button: short, unpadded, stuck together.
 * jsdom does not resolve `var(--surface)`, so the painted color is asserted
 * in tests/browser/notation.spec.ts.
 */

const widths = [390, 1280] as const

function setWidth(px: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: px })
}

describe('score options menu actions', () => {
  const roots: HTMLElement[] = []
  const mounted: ReturnType<typeof mount>[] = []

  afterEach(() => {
    mounted.splice(0).forEach(w => w.unmount())
    roots.splice(0).forEach(el => el.remove())
    document.body.querySelectorAll('.titan-chordpro-score-sheet').forEach(el => el.remove())
  })

  it.each(widths)('keeps action rows spaced at %ipx, outside the viewer root', async (width) => {
    setWidth(width)
    const root = document.createElement('div')
    root.className = 'titan-chordpro-root'
    document.body.appendChild(root)
    roots.push(root)
    const wrapper = mount(ScoreOptionsMenu, {
      attachTo: root,
      props: {
        label: 'Solo',
        view: 'tab',
        tabAvailable: true,
        rhythm: 'default',
        noteNames: false,
        zoom: 0,
        zoomLabel: '110%',
        canEdit: true,
        canDelete: true,
        text: '{x_titan_score:}',
      },
    })
    mounted.push(wrapper)
    await wrapper.get('button[aria-label="Opções de Solo"]').trigger('click')

    const sheet = document.body.querySelector('.titan-chordpro-score-sheet')
    expect(sheet, 'menu must leave the viewer').toBeTruthy()
    expect(root.contains(sheet)).toBe(false)
    const buttons = [...document.body.querySelectorAll<HTMLButtonElement>('.titan-chordpro-score-sheet button.titan-chordpro-surface-btn')]
    expect(buttons).toHaveLength(5)
    expect(sheet!.querySelector('[data-read-song]')).toBeTruthy()
    expect(sheet!.querySelector('[data-adjust-score]')).toBeTruthy()
    expect(sheet!.querySelector('[data-remove-score]')).toBeTruthy()
    for (const button of buttons) {
      const style = getComputedStyle(button)
      expect(style.paddingLeft).toBe('14px')
      expect(style.paddingRight).toBe('14px')
      expect(style.minHeight).toBe('44px')
      expect(style.borderRadius).toBe('13px')
    }
    expect(getComputedStyle(sheet!.querySelector('.titan-chordpro-score-more-card')!).gap).toBe('6px')
  })
})
