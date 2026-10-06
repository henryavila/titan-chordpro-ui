import { readFileSync } from 'node:fs'
import { computed, ref } from 'vue'
import { expect, it, vi } from 'vitest'
import { layoutChart, parse, writeScoreReference } from '../../src/core'
import { useBlockEdit } from '../../src/vue/use/useBlockEdit'

it('uses the release position when the last move still pointed above the introduction', () => {
  const solo = writeScoreReference({ src: 'fixtures/notation/notes.gp', track: 1, start: 1 })
  const source = ref(`${solo}\n\n${readFileSync('fixtures/sda/h031-jesus-tu-es-a-minha-vida.cho', 'utf8')}`)
  const blocks = computed(() => layoutChart(parse(source.value)))
  const intro = blocks.value.findIndex(b => b.kind === 'stanza')
  const root = document.createElement('div')
  blocks.value.forEach((_, bi) => {
    const el = document.createElement('div')
    el.dataset.block = String(bi)
    el.getBoundingClientRect = () => ({ top: bi * 100, height: 100 }) as DOMRect
    root.append(el)
  })
  const edit = useBlockEdit({ source, blocks, root: ref(root), scroller: ref(root), editing: ref(true),
    wMode: ref('persisted'), songCapo: ref(0), flats: ref(false), toast: vi.fn(), write: next => { source.value = next } })
  edit.gripDown(new PointerEvent('pointerdown', { button: 0, clientY: 20 }), 0)
  window.dispatchEvent(new PointerEvent('pointermove', { clientY: 30 }))
  window.dispatchEvent(new PointerEvent('pointerup', { clientY: (intro + 1) * 100 }))
  const moved = blocks.value.findIndex(b => b.kind === 'score' && b.text === solo)
  expect(blocks.value[moved - 1]?.kind).toBe('stanza')
  expect(source.value.indexOf(solo)).toBeGreaterThan(source.value.indexOf('[G]x///'))
  expect(source.value.indexOf(solo)).toBeLessThan(source.value.indexOf('Je[G]sus'))
})
