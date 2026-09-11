import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import {
  DEMOS,
  GROUPS,
  PAGES,
  demosOf,
  hubRedirect,
  hostTheme,
  labQuery,
  palcoHref,
  writeModes,
} from '../../demo/host/recipe'
import { defaultSongId, songsFor } from '../../demo/host/charts'
import Hub from '../../demo/Hub.vue'
import CifraDemo from '../../demo/CifraDemo.vue'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const fixtures = {
  '001-tudo-que-ha-de-bom-em-mim': '{title: Tudo}\n{key: C}\n[C]a\n',
  '078-entrega-h310': '{title: Entrega}\n{subtitle: Hinário}\n{key: C}\n[C]b\n',
  vazio: '',
}

describe('the four HTML mounts', () => {
  it('are standalone/site × with/without list — not a fifth page', () => {
    expect(PAGES.map((d) => d.id)).toEqual([
      'standalone',
      'standalone-lista',
      'site',
      'site-lista',
    ])
    expect(new Set(PAGES.map((d) => d.href)).size).toBe(4)
    expect(PAGES.filter((d) => d.surface === 'standalone' && !d.lista)).toHaveLength(1)
    expect(PAGES.filter((d) => d.surface === 'standalone' && d.lista)).toHaveLength(1)
    expect(PAGES.filter((d) => d.surface === 'site' && !d.lista)).toHaveLength(1)
    expect(PAGES.filter((d) => d.surface === 'site' && d.lista)).toHaveLength(1)
  })

  it('points at real HTML files a consumer can open', () => {
    for (const page of PAGES) {
      const file = join(root, 'demo', page.href.replace(/^\//, ''))
      expect(existsSync(file), file).toBe(true)
    }
  })
})

describe('the catalog', () => {
  it('is the 2×2 of incorporating, plus create, accent and a bad host', () => {
    expect(GROUPS.map((g) => g.id)).toEqual(['incorporar', 'criar', 'acento', 'host'])
    expect(DEMOS.every((d) => GROUPS.some((g) => g.id === d.group))).toBe(true)
    expect(DEMOS.map((d) => d.id).length).toBe(new Set(DEMOS.map((d) => d.id)).size)
    expect(demosOf('incorporar').map((d) => d.id)).toEqual([
      'standalone',
      'standalone-apresentacao',
      'shell',
      'shell-apresentacao',
    ])
  })

  it('keeps the four states and the extras on those cells, not as sibling types', () => {
    const hrefs = DEMOS.map((d) => d.href)
    const extra = DEMOS.flatMap((d) => d.extra ?? []).map((l) => l.href)
    expect(hrefs).toContain('/standalone.html')
    expect(hrefs).toContain('/standalone-lista.html')
    expect(hrefs).toContain('/site.html')
    expect(hrefs).toContain('/site-lista.html')
    expect(hrefs).toContain('/standalone.html?criar=1')
    expect(hrefs).not.toContain('/site.html?criar=1')
    expect(hrefs).toContain('/standalone.html?quebrar=1')
    expect(hrefs).toContain('/standalone.html?accent=verde')
    expect(hrefs).toContain('/standalone.html?accent=teal')
    expect(hrefs.some((h) => h.includes('accent=') && h.includes('4F46E5'))).toBe(true)
    expect(extra).toContain('/standalone.html?song=013-ele-vive-em-mim')
    expect(extra).toContain('/standalone.html?modes=local')
    expect(extra).toContain('/standalone.html?modes=content')
    expect(extra).toContain('/standalone.html?modes=none')
    expect(extra).toContain('/standalone-lista.html?ensaio=demanda')
  })

  it('ships a compact ChordproViewer call on every catalog entry', () => {
    for (const demo of DEMOS) {
      expect(demo.call, demo.id).toMatch(/<ChordproViewer/)
      expect(demo.call, demo.id).toMatch(/\/>/)
    }
    expect(DEMOS.find((d) => d.id === 'standalone-apresentacao')?.call).toMatch(/:songs="songs"/)
    expect(DEMOS.find((d) => d.id === 'standalone-apresentacao')?.call).not.toMatch(/song-id/)
    expect(DEMOS.find((d) => d.id === 'shell-apresentacao')?.call).not.toMatch(/song-id/)
    expect(DEMOS.find((d) => d.id === 'criar')?.call).toMatch(/modes="content"/)
    expect(DEMOS.find((d) => d.id === 'accent-teal')?.call).toMatch(/accent="teal"/)
    expect(DEMOS.find((d) => d.id === 'accent-hex')?.call).toMatch(/accent="#4F46E5"/)
  })

  it('only links the four mounts, with query flags', () => {
    const pages = new Set(PAGES.map((p) => p.href))
    for (const demo of DEMOS) {
      expect(pages.has(demo.href.split('?')[0] ?? ''), demo.href).toBe(true)
      for (const link of demo.extra ?? []) {
        expect(pages.has(link.href.split('?')[0] ?? ''), link.href).toBe(true)
      }
    }
  })

  it('keeps each group non-empty', () => {
    for (const group of GROUPS) {
      expect(demosOf(group.id).length, group.id).toBeGreaterThan(0)
    }
  })
})

describe('hubRedirect keeps old ?ficha= / ?ensaio= bookmarks', () => {
  it('leaves a clean / on the hub', () => {
    expect(hubRedirect('')).toBeNull()
    expect(hubRedirect('?')).toBeNull()
  })

  it.each([
    ['?ficha=1', '/site-lista.html'],
    ['?ficha=1&ensaio=off', '/site.html'],
    ['?ficha=1&ensaio=demanda', '/site-lista.html?ensaio=demanda'],
    ['?ensaio=juntas', '/standalone-lista.html'],
    ['?ensaio=demanda', '/standalone-lista.html?ensaio=demanda'],
    ['?song=001-tudo-que-ha-de-bom-em-mim', '/standalone.html?song=001-tudo-que-ha-de-bom-em-mim'],
    ['?quebrar=1', '/standalone.html?quebrar=1'],
    ['?tema=claro', '/standalone.html?tema=claro'],
    ['?ficha=1&song=x&tema=claro', '/site-lista.html?song=x&tema=claro'],
    ['?criar=1', '/standalone.html?criar=1'],
    ['?ficha=1&criar=1', '/site.html?criar=1'],
    ['?modes=local', '/standalone.html?modes=local'],
    ['?accent=teal', '/standalone.html?accent=teal'],
  ])('%s → %s', (search, href) => {
    expect(hubRedirect(search)).toBe(href)
  })
})

describe('labQuery', () => {
  it('reads song, theme, broken frame and lazy setlist', () => {
    expect(labQuery('')).toEqual({
      song: null,
      tema: null,
      quebrar: false,
      carga: 'juntas',
      criar: false,
      modes: null,
      accent: null,
    })
    expect(labQuery('?song=a&tema=escuro&quebrar=1&ensaio=demanda')).toEqual({
      song: 'a',
      tema: 'escuro',
      quebrar: true,
      carga: 'demanda',
      criar: false,
      modes: null,
      accent: null,
    })
  })

  it('reads the empty-chart authoring flag', () => {
    expect(labQuery('?criar=1')).toMatchObject({ criar: true, song: null })
    expect(labQuery('?criar=1&ensaio=demanda')).toMatchObject({
      criar: true,
      carga: 'demanda',
    })
  })

  it('reads write modes from the query', () => {
    expect(labQuery('?modes=local').modes).toBe('local')
    expect(labQuery('?modes=content').modes).toBe('content')
    expect(labQuery('?modes=none').modes).toBe('none')
    expect(labQuery('?modes=both').modes).toBe('both')
    expect(labQuery('?modes=nope').modes).toBeNull()
  })

  it('reads the host accent, named or hex', () => {
    expect(labQuery('?accent=teal').accent).toBe('teal')
    expect(labQuery('?accent=%234F46E5').accent).toBe('#4F46E5')
  })
})

describe('writeModes', () => {
  it('defaults to both, and creating a chart is always for everyone', () => {
    expect(writeModes(labQuery(''))).toBe('both')
    expect(writeModes(labQuery('?modes=local'))).toBe('local')
    expect(writeModes(labQuery('?criar=1'))).toBe('content')
    expect(writeModes(labQuery('?criar=1&modes=local'))).toBe('content')
  })
})

describe('songsFor', () => {
  it('omits the prop when the recipe has no list — not an empty setlist', () => {
    expect(songsFor(fixtures, 'off')).toBeUndefined()
  })

  it('turns rehearsal on from two real charts, sources inline in juntas', () => {
    const list = songsFor(fixtures, 'juntas')
    expect(list?.length).toBeGreaterThanOrEqual(2)
    expect(list?.every((s) => s.source)).toBe(true)
    expect(list?.some((s) => s.id === 'vazio')).toBe(false)
  })

  it('drops sources and plants a failing neighbour in demanda', () => {
    const list = songsFor(fixtures, 'demanda')
    expect(list?.every((s) => !s.source)).toBe(true)
    expect(list?.some((s) => s.id === 'falha-de-rede' && s.title === 'Cifra que não chega')).toBe(
      true,
    )
  })
})

describe('hostTheme / palcoHref', () => {
  it('pins a site chart to light unless the lab asks otherwise', () => {
    expect(hostTheme('site', null)).toBe('light')
    expect(hostTheme('standalone', null)).toBe('auto')
    expect(hostTheme('site', 'escuro')).toBe('dark')
    expect(hostTheme('standalone', 'claro')).toBe('light')
  })

  it('sends Tocar ao vivo to the matching palco, not another ficha', () => {
    expect(palcoHref(false, '?song=a&tema=claro')).toBe('/standalone.html?song=a&tema=claro')
    expect(palcoHref(true, '?ensaio=demanda')).toBe('/standalone-lista.html?ensaio=demanda')
  })
})

describe('Hub', () => {
  it('links every catalog entry, grouped', () => {
    const w = mount(Hub)
    const hrefs = w.findAll('a').map((a) => a.attributes('href'))
    for (const demo of DEMOS) expect(hrefs).toContain(demo.href)
    for (const group of GROUPS) expect(w.find(`[data-group="${group.id}"]`).exists()).toBe(true)
    expect(w.text()).not.toMatch(/Laboratório/)
    expect(w.text()).not.toMatch(/quatro receitas/i)
    expect(w.text()).not.toMatch(/\bPalco\b/)
    expect(w.text()).not.toMatch(/\bFicha\b/)
    expect(w.text()).not.toMatch(/\bEnsaio\b/)
    for (const demo of DEMOS) {
      expect(w.get(`[data-demo="${demo.id}"] [data-call]`).text()).toContain('ChordproViewer')
    }
    expect(w.get('[data-demo="standalone"] .more').text()).toMatch(/Partitura/)
    expect(w.get('[data-demo="standalone-apresentacao"] .more').text()).toMatch(/demanda/i)
  })

  /**
   * Phone widths used to grow past the viewport: grid items default to
   * min-width:auto and a snippet <pre> forced ~537px into a 390px frame.
   */
  it('lets cards shrink so the page does not scroll sideways', () => {
    const w = mount(Hub, { attachTo: document.body })
    try {
      const hub = w.get('[data-demo-hub]').element
      const card = w.get('.card').element
      expect(getComputedStyle(hub).overflowX).toMatch(/clip|hidden/)
      expect(parseFloat(getComputedStyle(card).minWidth)).toBe(0)
      const call = w.get('[data-call]').element
      expect(getComputedStyle(call).whiteSpace).toMatch(/pre-wrap/)
      expect(parseFloat(getComputedStyle(call).minWidth)).toBe(0)
    } finally {
      w.unmount()
    }
  })
})

describe('CifraDemo', () => {
  const stub = { ChordproViewer: true }

  it('does not pass songs when the recipe has no list', () => {
    const w = mount(CifraDemo, {
      props: { surface: 'standalone', lista: false },
      global: { stubs: stub },
    })
    expect(w.getComponent({ name: 'ChordproViewer' }).props('songs')).toBeUndefined()
  })

  it('passes a rehearsal list when the recipe has one', () => {
    const w = mount(CifraDemo, {
      props: { surface: 'standalone', lista: true },
      global: { stubs: stub },
    })
    const songs = w.getComponent({ name: 'ChordproViewer' }).props('songs') as { id: string }[]
    expect(songs.length).toBeGreaterThanOrEqual(2)
  })

  it('wires loadSong only for the demanda lab, not the juntas recipe', () => {
    const juntas = mount(CifraDemo, {
      props: { surface: 'standalone', lista: true },
      global: { stubs: stub },
    })
    expect(juntas.getComponent({ name: 'ChordproViewer' }).props('loadSong')).toBeUndefined()

    const prev = window.location.search
    window.history.replaceState({}, '', '?ensaio=demanda')
    try {
      const demanda = mount(CifraDemo, {
        props: { surface: 'standalone', lista: true },
        global: { stubs: stub },
      })
      expect(typeof demanda.getComponent({ name: 'ChordproViewer' }).props('loadSong')).toBe(
        'function',
      )
      demanda.unmount()
    } finally {
      window.history.replaceState({}, '', prev || '/')
    }
    juntas.unmount()
  })

  it('wraps the viewer in host chrome only inside another site', () => {
    const site = mount(CifraDemo, {
      props: { surface: 'site', lista: false },
      global: { stubs: stub },
    })
    expect(site.find('[data-host-site]').exists()).toBe(true)
    const palco = mount(CifraDemo, {
      props: { surface: 'standalone', lista: false },
      global: { stubs: stub },
    })
    expect(palco.find('[data-host-site]').exists()).toBe(false)
  })

  it('opens the empty-chart flow when criar is on', () => {
    const prev = window.location.search
    window.history.replaceState({}, '', '?criar=1')
    try {
      const w = mount(CifraDemo, {
        props: { surface: 'standalone', lista: true },
        global: { stubs: stub },
      })
      const viewer = w.getComponent({ name: 'ChordproViewer' })
      expect(viewer.props('source')).toBe('')
      expect(viewer.props('modes')).toBe('content')
      expect(viewer.props('songs')).toBeUndefined()
      expect(viewer.props('songId')).toBe('vazio')
      expect(typeof viewer.props('fetchChart')).toBe('function')
      expect(typeof viewer.props('readPdf')).toBe('function')
      w.unmount()
    } finally {
      window.history.replaceState({}, '', prev || '/')
    }
  })

  it('honours ?accent= as the host primary', () => {
    const prev = window.location.search
    window.history.replaceState({}, '', '?accent=teal')
    try {
      const w = mount(CifraDemo, {
        props: { surface: 'standalone', lista: false },
        global: { stubs: stub },
      })
      expect(w.getComponent({ name: 'ChordproViewer' }).props('accent')).toBe('teal')
      w.unmount()
    } finally {
      window.history.replaceState({}, '', prev || '/')
    }
  })

  it('honours ?modes= on an ordinary chart', () => {
    const prev = window.location.search
    window.history.replaceState({}, '', '?modes=local')
    try {
      const w = mount(CifraDemo, {
        props: { surface: 'standalone', lista: false },
        global: { stubs: stub },
      })
      expect(w.getComponent({ name: 'ChordproViewer' }).props('modes')).toBe('local')
      w.unmount()
    } finally {
      window.history.replaceState({}, '', prev || '/')
    }
  })

  it('keeps a real chart and both write modes on the ordinary recipes', () => {
    const prev = window.location.search
    window.history.replaceState({}, '', '/')
    try {
      const w = mount(CifraDemo, {
        props: { surface: 'standalone', lista: false },
        global: { stubs: stub },
      })
      const viewer = w.getComponent({ name: 'ChordproViewer' })
      expect(String(viewer.props('source'))).toMatch(/\{/)
      expect(viewer.props('modes')).toBe('both')
      w.unmount()
    } finally {
      window.history.replaceState({}, '', prev || '/')
    }
  })
})

describe('bundled fixtures', () => {
  it('default song is a real chart', () => {
    const id = defaultSongId(fixtures)
    expect(id).toBe('001-tudo-que-ha-de-bom-em-mim')
    expect(defaultSongId({ vazio: '', sozinha: '{title:X}\n' })).toBe('sozinha')
  })
})
