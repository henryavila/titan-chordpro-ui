import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { layoutChart, parse, writeScoreReference, type ChartBlock } from '@henryavila/titan-chordpro-ui'
import ChartBody from '../../src/vue/chart/ChartBody.vue'
import type { BlockEditApi } from '../../src/vue/use/useBlockEdit'
import { buildRow } from '../../src/vue/use/block-edit/rows'
import { ELE_VIVE_IMG, loadFixture } from '../helpers/load-fixture'

const sizes = {
  lyricPx: '18px',
  chordPx: '13px',
  shapePx: '11px',
  chordBox: '32px',
  chordBoxPlain: '18px',
  tabPx: '13px',
  tabLabelPx: '12px',
  tabRow: '16px',
  rowPad: '2px',
  blockGap: '8px',
}

function blocksOf(source: string, editing = false): ChartBlock[] {
  return layoutChart(parse(source), { editing })
}

function editStub(source: string, over: Record<string, unknown> = {}): BlockEditApi {
  const lines = source.split('\n')
  return {
    dropAt: ref(null),
    inSel: () => false,
    inDrag: () => false,
    gripDown: () => {},
    gripKey: () => {},
    canDelete: ref(false),
    clip: ref(null),
    editRow: ref<number | null>(null),
    editKind: ref<'lyric' | 'comment'>('lyric'),
    rowText: ref(''),
    rowCaret: ref<number | null>(null),
    wantRowFocus: ref(false),
    insertMenu: ref(false),
    insertAtLine: ref<number | null>(null),
    openInsert: () => {},
    layoutPills: () => {},
    buildRow: (li: number) => buildRow(lines[li] ?? '', li),
    insertChordAtCaret: vi.fn(),
    onRowKey: () => {},
    commitRow: () => {},
    editComment: vi.fn(),
    rowClick: vi.fn(),
    chordDown: () => {},
    chordKey: () => {},
    pasteHarmony: vi.fn(),
    resetBlockShift: vi.fn(),
    unhideBlock: vi.fn(),
    deleteBlock: vi.fn(),
    ...over,
  } as unknown as BlockEditApi
}

function mountBody(source: string, props: Record<string, unknown> = {}, editing = false) {
  return mount(ChartBody, {
    props: { blocks: blocksOf(source, editing), ...sizes, ...props },
    global: {
      stubs: {
        ScoreFigure: { template: '<div data-score />' },
        ExternalScore: {
          props: ['zoom', 'lockScore', 'preferredView', 'text'],
          template: '<div data-external-stub :data-zoom="zoom ?? \'\'" :data-lock="lockScore ? \'true\' : \'false\'" />',
        },
      },
    },
  })
}

describe('ChartBody reading', () => {
  it('keeps x/// on the lyric and opens the shape from the chord that was tapped', async () => {
    const source = loadFixture('sda/035-perto-quero-estar.cho')
    const w = mountBody(source)
    const lyrics = w.findAll('.titan-chordpro-lyric').map((node) => node.text())
    expect(lyrics.some((text) => text.includes('x///'))).toBe(true)
    const hit = w.get('[data-diagram-hit]')
    await hit.trigger('click')
    expect(w.emitted('diagram')?.[0]?.[0]).toEqual({
      shapeName: hit.attributes('data-shape'),
      concert: hit.attributes('data-concert'),
      capoFret: 0,
    })
    w.unmount()
  })

  it('draws the chord as text when diagrams are off', () => {
    const w = mountBody(loadFixture('sda/035-perto-quero-estar.cho'), { diagrams: false })
    expect(w.find('[data-diagram-hit]').exists()).toBe(false)
    expect(w.find('.titan-chordpro-chord').exists()).toBe(true)
    expect(w.find('.titan-chordpro-lyric').text()).toMatch(/x\/{1,3}|\/\//)
    w.unmount()
  })

  it('names a rehearsal comment and leaves no insert seam under it', async () => {
    const source = loadFixture('sda/035-perto-quero-estar.cho')
    const edit = editStub(source)
    const w = mountBody(source, { edit })
    expect(w.get('.titan-chordpro-comment-text').text()).toContain('INTRODUÇÃO')
    const comment = w.get('.titan-chordpro-comment').element.closest('.titan-chordpro-blockrow')
    expect(comment?.previousElementSibling?.classList.contains('titan-chordpro-insert-slot')).toBe(true)
    expect(comment?.nextElementSibling?.classList.contains('titan-chordpro-insert-slot')).toBe(false)
    expect(comment?.nextElementSibling?.classList.contains('titan-chordpro-blockrow')).toBe(true)
    await w.get('.titan-chordpro-comment').trigger('click')
    expect(edit.editComment).toHaveBeenCalledWith(expect.any(Number), 'INTRODUÇÃO')
    w.unmount()
  })

  it('sends a personal mark back without opening the line', async () => {
    const source = loadFixture('sda/035-perto-quero-estar.cho')
    const blocks = blocksOf(source)
    const stanza = blocks.find((block) => block.kind === 'stanza' || block.kind === 'chorus')
    const li = stanza && (stanza.kind === 'stanza' || stanza.kind === 'chorus') ? stanza.rows[0]?.li : undefined
    expect(li).toEqual(expect.any(Number))
    const edit = editStub(source)
    const w = mountBody(source, { edit, mineLines: new Map([[li!, 'mine']]) })
    await w.get(`[data-row="${li}"] [data-mine-dot]`).trigger('click')
    expect(w.emitted('revertLine')?.[0]).toEqual([li])
    expect(edit.rowClick).not.toHaveBeenCalled()
    w.unmount()
  })

  it('inserts a chord at the caret of the line being typed', async () => {
    const source = '{title: T}\n\n[C]ola mundo\n'
    const edit = editStub(source)
    const blocks = blocksOf(source)
    const stanza = blocks.find((block) => block.kind === 'stanza')
    const li = stanza && stanza.kind === 'stanza' ? stanza.rows[0]!.li : -1
    edit.editRow.value = li
    edit.editKind.value = 'lyric'
    edit.rowText.value = 'ola mundo'
    edit.rowCaret.value = 2
    const w = mount(ChartBody, {
      props: { blocks, ...sizes, edit },
    })
    const input = w.get('.titan-chordpro-row-input').element as HTMLInputElement
    input.setSelectionRange(4, 4)
    await w.get('[data-insert-chord]').trigger('pointerdown')
    expect(edit.insertChordAtCaret).toHaveBeenCalledWith(4)
    w.unmount()
  })
})

describe('ChartBody notation', () => {
  it('folds a tablature without dropping the control that brings it back', () => {
    const source = loadFixture('sda/013-ele-vive-em-mim.cho')
    const blocks = blocksOf(source)
    const index = blocks.findIndex((block) => block.kind === 'tab')
    const ids = blocks.map((_, i) => (i === index ? 'tab-1' : null))
    const w = mountBody(source, { blocks, notationIds: ids, collapsedNotation: new Set(['tab-1']) })
    const toggle = w.get('[data-toggle-notation]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.text()).toContain('Tablatura')
    const controls = toggle.attributes('aria-controls')
    expect(controls).toBeTruthy()
    const tab = w.get(`[id="${controls}"]`)
    expect(tab.classes()).toContain('titan-chordpro-tab')
    expect((tab.element as HTMLElement).style.display).toBe('none')
    expect(tab.find('.titan-chordpro-tab-label').text()).toBe('E')
    expect(tab.find('.titan-chordpro-tab-bar').exists()).toBe(true)
    expect(w.find('[data-notation-collapsed="true"]').exists()).toBe(true)
    w.unmount()
  })

  it('names an external solo and offers the partitura reading', async () => {
    const source = `{title: T}\n\n${writeScoreReference({ src: '/solo.gp', track: 1, start: 1, end: 4, name: 'Solo guitarra' })}\n`
    const w = mountBody(source)
    expect(w.get('.titan-chordpro-notation-title').text()).toBe('Solo guitarra')
    await w.get('[data-read-song]').trigger('click')
    const blocks = blocksOf(source)
    const index = blocks.findIndex((block) => block.kind === 'score')
    expect(w.emitted('readSongScore')?.[0]).toEqual([index])
    expect(w.get('[data-external-stub]').attributes('data-lock')).toBe('false')
    w.unmount()
  })

  it('keeps a whole-song staff on the partitura and returns through Cifra', async () => {
    const source = `{title: T}\n\n${writeScoreReference({ src: '/solo.gp', track: 1, start: 1, end: 8, name: 'Música' })}\n`
    const w = mountBody(source, { songScore: true, scoreZoom: 1.4 })
    expect(w.find('.titan-chordpro-song-score').exists()).toBe(true)
    expect(w.find('[data-toggle-notation]').exists()).toBe(false)
    await w.get('[data-leave-song]').trigger('click')
    const index = blocksOf(source).findIndex((block) => block.kind === 'score')
    expect(w.emitted('readSongScore')?.[0]).toEqual([index])
    const stub = w.get('[data-external-stub]')
    expect(stub.attributes('data-lock')).toBe('true')
    expect(stub.attributes('data-zoom')).toBe('1.4')
    w.unmount()
  })

  it('says when a score excerpt cannot be drawn', () => {
    const reference = writeScoreReference({ src: '/solo.gp', track: 1, start: 1, end: 2 })
    const source = `{title: T}\n\n${reference.replace('{x_titan_score:', '{x_titan_start_of_score:')}\n{x_titan_end_of_score}\n`
    const w = mountBody(source)
    expect(w.get('[data-invalid-score]').text()).toContain('Trecho de partitura inválido')
    w.unmount()
  })

  it('removes an inline excerpt from the block that owns it', async () => {
    const source = loadFixture(ELE_VIVE_IMG)
    const edit = editStub(source, { canDelete: ref(true) })
    const w = mountBody(source, { edit }, true)
    await w.get('[data-remove-score]').trigger('click')
    const index = blocksOf(source, true).findIndex((block) => block.kind === 'score' && !block.text.startsWith('{x_titan_score:'))
    expect(edit.deleteBlock).toHaveBeenCalledWith(index)
    w.unmount()
  })
})

describe('ChartBody images and editor marks', () => {
  it('resolves a scanned score, then opens it to full height', async () => {
    const w = mountBody(loadFixture(ELE_VIVE_IMG), {
      resolveImage: (src: string) => `/cdn/${src}`,
    })
    const figure = w.get('figure.titan-chordpro-figure')
    const img = figure.get('img')
    expect(img.attributes('src')).toBe('/cdn/assets/ele-vive-intro.png')
    expect(img.attributes('alt')).toContain('ele-vive-intro.png')
    expect(img.classes()).toContain('titan-chordpro-image-clip')
    expect(figure.text()).toContain('Ver inteira')
    await figure.get('button').trigger('click')
    expect(figure.get('img').classes()).toContain('titan-chordpro-image-full')
    expect(figure.text()).toContain('Reduzir')
    w.unmount()
  })

  it('inverts light paper in the dark theme and stops at the file’s own width', async () => {
    const w = mountBody('{title: T}\n\n{image: assets/ele-vive-intro.png}\n', {
      theme: 'dark',
      autoInvertScores: true,
      resolveImage: (src: string) => `https://paper.test/light/${src}`,
    })
    const img = w.get('img').element as HTMLImageElement
    Object.defineProperty(img, 'naturalWidth', { configurable: true, value: 640 })
    const pixels = new Uint8ClampedArray(40 * 40 * 4)
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 250
      pixels[i + 1] = 250
      pixels[i + 2] = 250
      pixels[i + 3] = 255
    }
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: () => {},
      getImageData: () => ({ data: pixels }),
    })) as unknown as typeof original
    try {
      await w.get('img').trigger('load')
      expect(img.style.maxWidth).toBe('640px')
      expect(img.style.width).toBe('100%')
      expect(img.style.filter).toContain('invert')
      expect(img.parentElement?.style.background).toBe('transparent')
      await w.setProps({ theme: 'light' })
      await nextTick()
      await nextTick()
      expect(img.style.filter).toBe('')
      expect(img.parentElement?.style.background).toMatch(/#FFFFFF|rgb\(255,\s*255,\s*255\)/)
    } finally {
      HTMLCanvasElement.prototype.getContext = original
    }
    w.unmount()
  })

  it('leaves a scan alone when the host turns inversion off', async () => {
    const w = mountBody('{title: T}\n\n{image: assets/ele-vive-fim.png}\n', {
      theme: 'dark',
      autoInvertScores: false,
      resolveImage: (src: string) => `https://paper.test/off/${src}`,
    })
    const img = w.get('img').element as HTMLImageElement
    Object.defineProperty(img, 'naturalWidth', { configurable: true, value: 320 })
    await w.get('img').trigger('load')
    expect(img.style.maxWidth).toBe('320px')
    expect(img.style.filter).toBe('')
    expect(img.parentElement?.style.background).toMatch(/#FFFFFF|rgb\(255,\s*255,\s*255\)/)
    w.unmount()
  })

  it('counts a hidden stretch and strips the chords from its preview', async () => {
    const source = '{title: T}\n\n#~ [G]linha oculta\n#~ [Am]segunda\n\n[C]fica\n'
    const edit = editStub(source)
    const w = mountBody(source, { edit }, true)
    expect(w.get('.titan-chordpro-hidden-label').text()).toContain('2 linhas')
    expect(w.get('.titan-chordpro-hidden-preview').text()).toBe('linha oculta')
    await w.get('.titan-chordpro-hidden-btn').trigger('click')
    expect(edit.unhideBlock).toHaveBeenCalledWith(0)
    w.unmount()
  })

  it('names a block transposition and offers the song key', async () => {
    const source = '{title: T}\n\n#^+1\n[C]ola\n'
    const edit = editStub(source)
    const w = mountBody(source, { edit }, true)
    expect(w.get('.titan-chordpro-block-tag--key').text()).toBe('este bloco: +1 semitom')
    await w.get('.titan-chordpro-block-tag-btn').trigger('click')
    expect(edit.resetBlockShift).toHaveBeenCalledWith(0)
    w.unmount()
  })

  it('says when a block carries a capo of its own', () => {
    const w = mountBody('{title: T}\n\n#capo:2\n[G]ola\n')
    expect(w.get('.titan-chordpro-block-tag').text()).toBe('capo 2 neste bloco')
    w.unmount()
  })

  it('shows a trailing execution note as a note, not a rehearsal label', async () => {
    const source = '{title: T}\n\n[C]ola\n{c: com palheta}\n'
    const edit = editStub(source)
    const w = mountBody(source, { edit })
    expect(w.get('.titan-chordpro-note-label').text()).toBe('Execução')
    expect(w.get('.titan-chordpro-note-item').text()).toBe('com palheta')
    await w.get('.titan-chordpro-note-item').trigger('click')
    expect(edit.editComment).toHaveBeenCalledWith(expect.any(Number), 'com palheta')
    w.unmount()
  })
})
