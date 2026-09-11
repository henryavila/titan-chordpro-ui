import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { ChordproViewer } from '../../src/vue'
import MetaDialog from '../../src/vue/edit/MetaDialog.vue'
import { memoryStore } from '../../src/core'

const mounted: ReturnType<typeof mount>[] = []
afterEach(() => {
  mounted.splice(0).forEach((w) => w.unmount())
})

const SRC = `{title: Uma}
{subtitle: Ministério}
{key: G}
{tempo: 90}
{time: 4/4}
{duration: 04:26}

{c:Verso}
[G]letra
`

function dialog(source = SRC) {
  const w = mount(MetaDialog, {
    props: { compact: false, source },
    attachTo: document.body,
  })
  mounted.push(w)
  return w
}

function viewer(props: Record<string, unknown> = {}) {
  const w = mount(ChordproViewer, {
    props: {
      source: SRC,
      storage: memoryStore(),
      autoHide: false,
      modes: 'content',
      ...props,
    },
    attachTo: document.body,
  })
  mounted.push(w)
  return w
}

async function enterContent(w: ReturnType<typeof viewer>) {
  await w.get('[data-edit]').trigger('click')
  await flushPromises()
}

describe('MetaDialog', () => {
  it('loads every known header field into the form', () => {
    const w = dialog()
    expect((w.get('[data-meta-title]').element as HTMLInputElement).value).toBe('Uma')
    expect((w.get('[data-meta-subtitle]').element as HTMLInputElement).value).toBe('Ministério')
    expect((w.get('[data-meta-tempo]').element as HTMLInputElement).value).toBe('90')
    expect((w.get('[data-meta-duration]').element as HTMLInputElement).value).toBe('04:26')
    expect(w.get('[data-meta-key-shown]').text()).toBe('G')
    expect(w.get('[data-meta-time="4/4"]').attributes('style')).toContain('var(--chord)')
  })

  it('writes duration, time and reference back into the source on apply', async () => {
    const w = dialog('{title: Só}\n[G]a\n')
    await w.get('[data-meta-duration]').setValue('345')
    await w.get('[data-meta-time="6/8"]').trigger('click')
    await w.get('[data-meta-origem]').setValue('https://youtu.be/abc')
    await w.get('[data-meta-apply]').trigger('click')
    const next = w.emitted('apply')?.at(-1)?.[0] as string
    expect(next).toMatch(/\{duration:03:45\}/)
    expect(next).toMatch(/\{time:6\/8\}/)
    expect(next).toMatch(/\{x_origem:https:\/\/youtu\.be\/abc\}/)
    expect(next).toContain('[G]a')
  })

  it('masks duration as MM:SS while typing', async () => {
    const w = dialog('{title: Só}\n[G]a\n')
    await w.get('[data-meta-duration]').setValue('426')
    expect((w.get('[data-meta-duration]').element as HTMLInputElement).value).toBe('4:26')
    await w.get('[data-meta-duration]').trigger('blur')
    expect((w.get('[data-meta-duration]').element as HTMLInputElement).value).toBe('04:26')
  })

  it('keeps the body intact when only the header changes', async () => {
    const body = '{c:Intro}\n[G]x///\n\n[G]linha cantada'
    const w = dialog(`{title: T}\n${body}`)
    await w.get('[data-meta-title]').setValue('Novo')
    await w.get('[data-meta-apply]').trigger('click')
    const next = w.emitted('apply')?.at(-1)?.[0] as string
    expect(next).toContain('{title:Novo}')
    expect(next).toContain(body)
  })
})

describe('edit chrome · dedicated metadata door', () => {
  it('offers the metadata button in both edits', async () => {
    const content = viewer({ modes: 'content' })
    await enterContent(content)
    expect(content.find('[data-meta-open]').exists()).toBe(true)
    expect(content.find('[data-meta-locked]').exists()).toBe(false)

    const local = viewer({ modes: 'local', songId: 'uma' })
    await local.get('[data-edit]').trigger('click')
    await flushPromises()
    expect(local.find('[data-meta-open]').exists()).toBe(true)
    expect(local.find('[data-meta-locked]').exists()).toBe(false)
  })

  it('opens the dialog and applies duration into the working source', async () => {
    const w = viewer({
      source: '{title: Uma}\n{key: G}\n{tempo: 90}\n{time: 4/4}\n\n[G]letra\n',
    })
    await enterContent(w)
    await w.get('[data-meta-open]').trigger('click')
    await flushPromises()
    expect(w.find('[data-meta-dialog]').exists()).toBe(true)
    await w.get('[data-meta-duration]').setValue('04:26')
    await w.get('[data-meta-apply]').trigger('click')
    await flushPromises()
    expect(w.find('[data-meta-dialog]').exists()).toBe(false)
    expect((w.vm as { getSource: () => string }).getSource()).toMatch(/\{duration:04:26\}/)
    expect(w.emitted('dirty')?.at(-1)?.[0]).toBe(true)
  })

  it('local edit applies meta into the personal overlay without emitting update:source', async () => {
    const storage = memoryStore()
    const w = viewer({
      modes: 'local',
      songId: 'uma',
      storage,
      source: '{title: Uma}\n{key: G}\n{tempo: 90}\n{time: 4/4}\n\n[G]letra\n',
    })
    await w.get('[data-edit]').trigger('click')
    await flushPromises()
    const before = w.emitted('update:source')?.length ?? 0
    await w.get('[data-meta-open]').trigger('click')
    await flushPromises()
    await w.get('[data-meta-duration]').setValue('04:26')
    await w.get('[data-meta-apply]').trigger('click')
    await flushPromises()
    expect((w.vm as { getSource: () => string }).getSource()).toMatch(/\{duration:04:26\}/)
    expect(w.emitted('update:source')?.length ?? 0).toBe(before)
    expect(storage.get('cpv:my:uma')).toBeTruthy()
  })

  it('flags a missing duration on the dedicated button', async () => {
    const w = viewer({
      source: '{title: Uma}\n{key: G}\n{tempo: 90}\n{time: 4/4}\n\n[G]letra\n',
    })
    await enterContent(w)
    const btn = w.get('[data-meta-open]')
    expect(btn.attributes('title')).toMatch(/duração/i)
  })
})
