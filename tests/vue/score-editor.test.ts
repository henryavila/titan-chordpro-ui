import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { serialize as serializeScore } from '../../src/core/score'
import ScoreEditor from '../../src/vue/edit/ScoreEditor.vue'

const TAB = ['e|--12--|', 'B|------|', 'G|------|', 'D|------|', 'A|------|', 'E|------|'].join('\n')

const mounted: ReturnType<typeof mount>[] = []
let width = 1200

function editor(props: Record<string, unknown> = {}) {
  const w = mount(ScoreEditor, { props, attachTo: document.body })
  mounted.push(w)
  return w
}

async function press(key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  window.dispatchEvent(event)
  await flushPromises()
  return event
}

function fretPressed(w: ReturnType<typeof mount>): string | undefined {
  return w.findAll('.titan-chordpro-edp-fret').find((b) => b.attributes('aria-pressed') === 'true')?.text()
}

function sourceOf(w: ReturnType<typeof mount>): string {
  return w.get('pre').text()
}

async function showSource(w: ReturnType<typeof mount>) {
  if (!w.find('pre').exists()) await w.get('[data-score-src]').trigger('click')
}

beforeEach(() => {
  width = 1200
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width)
})

afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('score editor', () => {
  it('opens a new score on the demo phrase, clean, in the wide layout', async () => {
    const w = editor({ title: 'Solo', subtitle: 'Intro' })
    await flushPromises()
    expect(w.get('[data-score-editor]').classes()).toContain('titan-chordpro-edp')
    expect(w.text()).toContain('Solo')
    expect(w.text()).toContain('Intro')
    expect(w.text()).toContain('4/4 · 92 BPM · tom de D · afinação EADGBE')
    expect(w.find('.titan-chordpro-edp-dirty').exists()).toBe(false)
    expect(w.get('[data-score-save]').attributes('style')).toContain('opacity: 0.6')
    expect(w.get('.titan-chordpro-edp-title').attributes('style')).toContain('min-width: 220px')
    expect(w.text()).toContain('a nota nova entra depois da selecionada')
    expect(w.text()).toContain('0–12 digita a casa')
    expect(w.get('[data-swap-inst]').text()).toContain('Violão')
    expect(w.findAll('.titan-chordpro-edp-cell').length).toBeGreaterThan(0)
    expect(fretPressed(w)).toBe('0')
    await showSource(w)
    expect(sourceOf(w)).toBe(serializeScore(
      [
        { midi: 62, dur: '8' },
        { midi: 64, dur: '8' },
        { midi: 67, dur: 'q' },
        { midi: 69, dur: '8', slide: true },
        { midi: 71, dur: '8' },
        { midi: 67, dur: 'h' },
        { midi: 62, dur: 'q' },
        { midi: 64, dur: 'q' },
      ],
    ))
    expect(w.emitted('save')).toBeUndefined()
  })

  it('loads a saved score and a legacy text tab, and stays blank when the text is neither', async () => {
    const saved = editor({
      source: '{x_titan_start_of_score: time=3/4 key=Bb tempo=60 tuning=DADGAD}\n| c4:q |\n{x_titan_end_of_score}',
    })
    expect(saved.text()).toContain('3/4 · 60 BPM · tom de Bb · afinação DADGAD')
    expect(saved.find('.titan-chordpro-edp-imported').exists()).toBe(false)
    await showSource(saved)
    expect(sourceOf(saved)).toContain('c4:q')
    expect(sourceOf(saved)).toContain('time=3/4')

    const imported = editor({ source: TAB })
    expect(imported.get('.titan-chordpro-edp-imported').text()).toContain('TAB em texto importada: 1 notas')
    expect(fretPressed(imported)).toBe('12')

    const blank = editor({ source: 'não é partitura' })
    expect(blank.find('.titan-chordpro-edp-cell').exists()).toBe(true)
    expect(blank.text()).toContain('Toque numa corda abaixo para escrever a primeira nota')
    expect(blank.find('.titan-chordpro-edp-imported').exists()).toBe(false)
  })

  it('asks before discarding dirty work, then forgets the question', async () => {
    vi.useFakeTimers()
    const w = editor()
    await flushPromises()
    await w.get('[data-score-cancel]').trigger('click')
    expect(w.emitted('cancel')).toHaveLength(1)

    const dirty = editor()
    await flushPromises()
    await dirty.get('.titan-chordpro-edp-fret').trigger('click')
    expect(dirty.find('.titan-chordpro-edp-dirty').exists()).toBe(true)
    await dirty.get('[data-score-cancel]').trigger('click')
    expect(dirty.emitted('cancel')).toBeUndefined()
    expect(dirty.get('[data-score-cancel]').text()).toBe('Confirmar')
    await vi.advanceTimersByTimeAsync(3999)
    expect(dirty.get('[data-score-cancel]').text()).toBe('Confirmar')
    await vi.advanceTimersByTimeAsync(1)
    expect(dirty.get('[data-score-cancel]').text()).toBe('Descartar')
    await dirty.get('[data-score-cancel]').trigger('click')
    expect(dirty.get('[data-score-cancel]').text()).toBe('Confirmar')
    await dirty.get('[data-score-cancel]').trigger('click')
    expect(dirty.emitted('cancel')).toHaveLength(1)
  })

  it('saves the block and keeps the altered mark until the next edit', async () => {
    const w = editor()
    await flushPromises()
    await w.get('[data-score-save]').trigger('click')
    const first = w.emitted('save')?.[0]?.[0] as string
    expect(first).toContain('{x_titan_start_of_score:')
    expect(w.find('.titan-chordpro-edp-dirty').exists()).toBe(false)

    const frets = w.findAll('.titan-chordpro-edp-fret')
    await frets[5]!.trigger('click')
    expect(w.find('.titan-chordpro-edp-dirty').exists()).toBe(true)
    expect(w.get('[data-score-save]').attributes('style')).toContain('opacity: 1')
    await w.get('[data-score-save]').trigger('click')
    const second = w.emitted('save')?.[1]?.[0] as string
    expect(second).toContain('@1/5')
    expect(w.find('.titan-chordpro-edp-dirty').exists()).toBe(true)
    await w.get('[data-add-rest]').trigger('click')
    expect(w.find('.titan-chordpro-edp-dirty').exists()).toBe(true)
  })

  it('writes frets, rests, slides and figures, and undoes them', async () => {
    const w = editor()
    await flushPromises()
    await w.get('button[title="Mínima"]').trigger('click')
    expect(w.get('button[title="Mínima"]').attributes('aria-pressed')).toBe('true')
    expect(w.text()).toContain('compasso fechado')
    const slide = w.findAll('button').find((b) => b.text() === 'Slide')!
    await slide.trigger('click')
    expect(slide.attributes('aria-pressed')).toBe('true')
    await w.get('[data-add-rest]').trigger('click')
    await showSource(w)
    expect(sourceOf(w)).toContain('e4:h~s')
    expect(sourceOf(w)).not.toContain('@1/0')
    expect(sourceOf(w)).toContain('r:h')

    await w.findAll('button').find((b) => b.text() === 'Desfazer')!.trigger('click')
    expect(sourceOf(w)).not.toContain('r:h')
    await w.get('[data-del-note]').trigger('click')
    expect(sourceOf(w)).not.toContain('e4:h~s')
    await w.findAll('button').find((b) => b.text() === 'Desfazer')!.trigger('click')
    expect(sourceOf(w)).toContain('e4:h~s')
  })

  it('keeps only the last sixty edits', async () => {
    const w = editor()
    await flushPromises()
    for (let i = 0; i < 61; i++) await w.get('[data-add-rest]').trigger('click')
    await showSource(w)
    expect(sourceOf(w).match(/r:q/g)).toHaveLength(61)
    const undo = w.findAll('button').find((b) => b.text() === 'Desfazer')!
    for (let i = 0; i < 60; i++) await undo.trigger('click')
    expect(sourceOf(w).match(/r:q/g)).toHaveLength(1)
    expect(undo.attributes('disabled')).toBe('')
    await undo.trigger('click')
    expect(sourceOf(w).match(/r:q/g)).toHaveLength(1)
  })

  it('types a two-digit fret on the same note, then a fresh digit after the pause', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(1_000)
    const w = editor()
    await flushPromises()
    await press('1')
    expect(fretPressed(w)).toBe('1')
    vi.setSystemTime(1_699)
    await press('2')
    expect(fretPressed(w)).toBe('12')
    vi.setSystemTime(1_699 + 700)
    await press('3')
    expect(fretPressed(w)).toBe('3')
    await press('4')
    await press('ArrowLeft')
    await press('9')
    expect(fretPressed(w)).toBe('9')
  })

  it('moves, retunes and deletes from the keyboard, and ignores keys aimed at a field', async () => {
    const w = editor()
    await flushPromises()
    expect(fretPressed(w)).toBe('0')
    await press('ArrowLeft')
    expect(fretPressed(w)).toBe('3')
    await press('ArrowRight')
    expect(fretPressed(w)).toBe('0')
    await press('ArrowUp')
    expect(fretPressed(w)).toBe('1')
    await press('ArrowDown')
    expect(fretPressed(w)).toBe('0')
    for (let i = 0; i < 30; i++) await press('ArrowDown')
    await showSource(w)
    expect(sourceOf(w)).toContain('e2:q')
    await press('ArrowDown')
    expect(sourceOf(w)).toContain('e2:q')

    const before = sourceOf(w)
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }))
    await flushPromises()
    expect(sourceOf(w)).toBe(before)
    await press('Backspace')
    expect(sourceOf(w)).not.toBe(before)

    await press('z', { ctrlKey: true })
    expect(sourceOf(w)).toBe(before)
    const undo = await press('z', { ctrlKey: true })
    expect(undo.defaultPrevented).toBe(true)

    await press(' ')
    expect(w.get('[data-play]').text()).toContain('Parar')
    await press(' ')
    expect(w.get('[data-play]').text()).toContain('Tocar')
    await press('Escape')
    expect(w.emitted('cancel')).toBeUndefined()
    expect(w.get('[data-score-cancel]').text()).toBe('Confirmar')
  })

  it('plays the phrase and stops', async () => {
    vi.useFakeTimers()
    const w = editor()
    await vi.runAllTimersAsync()
    await w.get('[data-play]').trigger('click')
    expect(w.get('[data-play]').text()).toContain('Parar')
    const playing = () =>
      w.findAll('.titan-chordpro-edp-cell').filter((c) => String(c.attributes('style')).includes('var(--chord-fill)')).map((c) => c.attributes('aria-label'))
    const first = playing()
    expect(first.length).toBeGreaterThan(0)
    await vi.advanceTimersByTimeAsync(0.5 * (60 / 92) * 1000 - 1)
    expect(playing()).toEqual(first)
    await vi.advanceTimersByTimeAsync(2)
    expect(playing()).not.toEqual(first)
    await w.get('[data-play]').trigger('click')
    expect(w.get('[data-play]').text()).toContain('Tocar')
    expect(playing()).toEqual([])
  })

  it('jumps to a bar and switches entry, view and grand staff', async () => {
    const w = editor()
    await flushPromises()
    expect(w.text()).toContain('3 de 4 tempos')
    const bars = w.findAll('.titan-chordpro-edp-bar')
    expect(bars).toHaveLength(2)
    await bars[1]!.trigger('click')
    expect(w.text()).toContain('compasso 2 · tempo 2')

    await w.get('[data-grand]').trigger('click')
    expect(w.get('[data-grand]').attributes('aria-pressed')).toBe('true')
    const view = w.get('[aria-label="Vista da partitura"]')
    expect(view.findAll('button').every((b) => b.attributes('aria-pressed') === 'false')).toBe(true)
    await view.get('button').trigger('click')
    expect(w.get('[data-grand]').attributes('aria-pressed')).toBe('false')
    expect(view.get('button').attributes('aria-pressed')).toBe('true')

    await w.get('[data-swap-inst]').trigger('click')
    expect(w.get('[data-swap-inst]').text()).toContain('Piano')
    expect(w.text()).toContain('4/4 · 92 BPM · tom de D')
    expect(w.text()).not.toContain('afinação')
    expect(w.findAll('.titan-chordpro-edp-white')).toHaveLength(15)
    expect(w.findAll('.titan-chordpro-edp-black')).toHaveLength(10)
    expect(w.text()).toContain('oitavas 4–6')
    expect(w.text()).toContain('no violão:')
    await w.get('[aria-label="Uma oitava acima"]').trigger('click')
    expect(w.text()).toContain('oitavas 5–7')
    for (let i = 0; i < 5; i++) await w.get('[aria-label="Uma oitava acima"]').trigger('click')
    expect(w.text()).toContain('oitavas 6–8')
    for (let i = 0; i < 10; i++) await w.get('[aria-label="Uma oitava abaixo"]').trigger('click')
    expect(w.text()).toContain('oitavas 2–4')
    await w.get('.titan-chordpro-edp-white').trigger('click')
    await showSource(w)
    expect(sourceOf(w)).toContain('c2:q')
    await press('5')
    expect(sourceOf(w)).toContain('c2:q')
    expect(w.text()).toContain('↑/↓ move a altura')
  })

  it('adds a note on an empty string and pins an existing note to another string', async () => {
    const w = editor({ source: '{x_titan_start_of_score: time=4/4 key=D tempo=92 tuning=EADGBE}\n| e4:q |\n{x_titan_end_of_score}' })
    await flushPromises()
    const plus = w.findAll('.titan-chordpro-edp-cell').find((c) => c.attributes('aria-label') === 'Nova nota na corda G')!
    await plus.trigger('click')
    await showSource(w)
    expect(sourceOf(w)).toContain('g3:q@3/0')
    const pinned = w.findAll('.titan-chordpro-edp-cell').find((c) => c.text() === '0' && c.attributes('aria-label')?.startsWith('Corda e'))!
    await pinned.trigger('click')
    expect(sourceOf(w)).toContain('e4:q@1/0')
  })

  it('hides the writing hint and tightens the header when the editor is narrow', async () => {
    width = 400
    const w = editor()
    await flushPromises()
    expect(w.text()).not.toContain('a nota nova entra depois da selecionada')
    expect(w.get('.titan-chordpro-edp-title').attributes('style')).toContain('min-width: 150px')
    expect(w.get('.titan-chordpro-edp-stage').attributes('style')).toContain('min-height: 210px')
  })

  it('leaves modifier chords other than undo for the chart behind the editor', async () => {
    const w = editor()
    const bubble: string[] = []
    const hear = (e: KeyboardEvent) => bubble.push(e.key)
    window.addEventListener('keydown', hear)
    await press('z', { ctrlKey: true })
    await press('ArrowLeft', { altKey: true })
    window.removeEventListener('keydown', hear)
    expect(bubble).toEqual(['z', 'ArrowLeft'])
    expect(fretPressed(w)).toBe('0')
  })
})
