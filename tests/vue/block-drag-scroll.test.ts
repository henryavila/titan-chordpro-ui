import { readFileSync } from 'node:fs'
import { computed, ref } from 'vue'
import { expect, it, vi } from 'vitest'
import { layoutChart, parse, writeScoreReference } from '../../src/core'
import { useBlockEdit } from '../../src/vue/use/useBlockEdit'

it.each(['before move', 'before release'])('drops a solo after the visible chorus when the chart scrolls %s', timing => {
  const solo = writeScoreReference({ src: '/solo.gp', track: 1, start: 3, end: 11 })
  const source = ref(`${solo}\n\n${readFileSync('fixtures/013-ele-vive-em-mim-partitura.cho', 'utf8')}`)
  const blocks = computed(() => layoutChart(parse(source.value)))
  const chorus = blocks.value.findIndex(b => b.kind === 'chorus')
  const root = document.createElement('div')
  let scroll = 0
  blocks.value.forEach((_, bi) => {
    const el = document.createElement('div')
    el.dataset.block = String(bi)
    el.getBoundingClientRect = () => ({ top: bi * 100 - scroll, height: 100 }) as DOMRect
    root.append(el)
  })
  const edit = useBlockEdit({ source, blocks, root: ref(root), scroller: ref(root), editing: ref(true),
    wMode: ref('persisted'), songCapo: ref(0), flats: ref(false), toast: vi.fn(), write: next => { source.value = next } })
  edit.gripDown(new PointerEvent('pointerdown', { button: 0, clientY: 50 }), 0)
  if (timing === 'before move') scroll = chorus * 100
  window.dispatchEvent(new PointerEvent('pointermove', { clientY: 110 }))
  if (timing === 'before release') scroll = chorus * 100
  window.dispatchEvent(new PointerEvent('pointerup', { clientY: 110 }))
  const moved = blocks.value.findIndex(b => b.kind === 'score' && b.text === solo)
  expect(blocks.value[moved - 1]?.kind).toBe('chorus')
  expect(source.value.indexOf(solo)).toBeGreaterThan(source.value.indexOf('{eoc}'))
})
