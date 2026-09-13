import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ToneSheet from '../../src/vue/sheets/ToneSheet.vue'
import MetronomeSheet from '../../src/vue/sheets/MetronomeSheet.vue'

const toneBase = {
  shownKey: 'G',
  hasOffset: false,
  offsetLabel: '0',
  capoLabel: 'Sem capo',
  capoHint: 'A cifra fica no tom real.',
  hasCapo: false,
  hasReset: false,
  dual: false,
}

function tone(over: Partial<typeof toneBase> & { songCaption?: string } = {}) {
  return mount(ToneSheet, { props: { ...toneBase, ...over } })
}

function dialogKids(w: ReturnType<typeof tone>) {
  return w.get('[role="dialog"]').element.childElementCount
}

const metBase = {
  compact: true,
  running: false,
  beat: 0,
  bpm: 120,
  bar: 4,
  chartBpm: 120,
  overridden: false,
  sound: true,
  pulseHead: false,
  follow: true,
  countInOn: false,
  scrolling: false,
  scrollable: true,
  tapCount: 0,
  time: '4/4',
}

function met(over: Partial<typeof metBase> = {}) {
  return mount(MetronomeSheet, { props: { ...metBase, ...over } })
}

describe('a sheet does not grow when a reset action becomes available', () => {
  it('keeps the tone reset in the layout at the original key, disabled', () => {
    const w = tone()
    const btn = w.get('[data-tone-reset]')
    expect(btn.attributes('disabled')).toBeDefined()
    expect(btn.text()).toMatch(/tom original/i)
  })

  it('emits reset only when the key or capo has moved', async () => {
    const idle = tone()
    await idle.get('[data-tone-reset]').trigger('click')
    expect(idle.emitted('reset')).toBeUndefined()
    idle.unmount()

    const moved = tone({ hasReset: true, hasOffset: true, songCaption: 'G · + ½ tom' })
    expect(moved.get('[data-tone-reset]').attributes('disabled')).toBeUndefined()
    await moved.get('[data-tone-reset]').trigger('click')
    expect(moved.emitted('reset')).toHaveLength(1)
    moved.unmount()
  })

  it('keeps dual in the layout without a capo, so putting a capo on does not insert a row', () => {
    const w = tone()
    const sw = w.get('[data-dual]')
    expect(sw.attributes('disabled')).toBeDefined()
  })

  it('does not add or drop dialog rows when tom, capo or the caption change', () => {
    const idle = tone()
    const moved = tone({
      hasReset: true,
      hasOffset: true,
      hasCapo: true,
      dual: true,
      songCaption: 'G · + ½ tom',
      capoLabel: '2ª casa',
      capoHint: 'F · A# · Dm · C · G',
    })
    expect(dialogKids(moved)).toBe(dialogKids(idle))
    idle.unmount()
    moved.unmount()
  })

  it('keeps the metronome reset in the layout at the chart tempo, disabled', () => {
    const w = met()
    const btn = w.get('[data-met-reset]')
    expect(btn.attributes('disabled')).toBeDefined()
    expect(btn.text()).toMatch(/andamento da cifra/i)
  })

  it('does not add a metronome row when the reader overrides the BPM', () => {
    const idle = met()
    const moved = met({ overridden: true, bpm: 132 })
    expect(moved.get('[role="dialog"]').element.childElementCount).toBe(
      idle.get('[role="dialog"]').element.childElementCount,
    )
    expect(moved.get('[data-met-reset]').attributes('disabled')).toBeUndefined()
    idle.unmount()
    moved.unmount()
  })
})
