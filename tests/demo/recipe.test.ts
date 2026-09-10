import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { DEMOS, LAB, hubRedirect, hostTheme, labQuery, palcoHref } from '../../demo/host/recipe'
import { defaultSongId, songsFor } from '../../demo/host/charts'
import Hub from '../../demo/Hub.vue'
import CifraDemo from '../../demo/CifraDemo.vue'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const fixtures = {
  'escuta-meu-clamor-sda-86': '{title: Escuta}\n{key: Gm}\n[Gm]a\n',
  'entrega-1': '{title: Entrega}\n{subtitle: Hinário}\n{key: C}\n[C]b\n',
  vazio: '',
}

describe('the four consumer recipes', () => {
  it('are exactly standalone/site × with/without list', () => {
    expect(DEMOS.map((d) => d.id)).toEqual([
      'standalone',
      'standalone-lista',
      'site',
      'site-lista',
    ])
    expect(new Set(DEMOS.map((d) => d.href)).size).toBe(4)
    expect(DEMOS.filter((d) => d.surface === 'standalone' && !d.lista)).toHaveLength(1)
    expect(DEMOS.filter((d) => d.surface === 'standalone' && d.lista)).toHaveLength(1)
    expect(DEMOS.filter((d) => d.surface === 'site' && !d.lista)).toHaveLength(1)
    expect(DEMOS.filter((d) => d.surface === 'site' && d.lista)).toHaveLength(1)
  })

  it('points at real HTML files a consumer can open', () => {
    for (const demo of DEMOS) {
      const file = join(root, 'demo', demo.href.replace(/^\//, ''))
      expect(existsSync(file), file).toBe(true)
    }
  })

  it('does not sell an iframe, a fifth composition, or query-string soup', () => {
    const snippets = DEMOS.map((d) => d.snippet).join('\n')
    expect(snippets.toLowerCase()).not.toMatch(/<iframe/)
    expect(DEMOS.some((d) => /não é iframe/.test(d.useWhen.toLowerCase()))).toBe(true)
    expect(DEMOS.every((d) => d.snippet.includes('ChordproViewer'))).toBe(true)
    expect(DEMOS.filter((d) => d.lista).every((d) => d.snippet.includes(':songs'))).toBe(true)
    expect(DEMOS.filter((d) => !d.lista).every((d) => !d.snippet.includes(':songs'))).toBe(true)
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
    ['?song=entrega-1', '/standalone.html?song=entrega-1'],
    ['?quebrar=1', '/standalone.html?quebrar=1'],
    ['?tema=claro', '/standalone.html?tema=claro'],
    ['?ficha=1&song=x&tema=claro', '/site-lista.html?song=x&tema=claro'],
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
    })
    expect(labQuery('?song=a&tema=escuro&quebrar=1&ensaio=demanda')).toEqual({
      song: 'a',
      tema: 'escuro',
      quebrar: true,
      carga: 'demanda',
    })
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
  it('links every recipe plus the lab pages', () => {
    const w = mount(Hub)
    const hrefs = w.findAll('a').map((a) => a.attributes('href'))
    for (const demo of DEMOS) expect(hrefs).toContain(demo.href)
    for (const lab of LAB) expect(hrefs).toContain(lab.href)
  })

  /**
   * Phone widths used to grow past the viewport: grid items default to
   * min-width:auto and the snippet <pre> forced ~537px into a 390px frame.
   */
  it('lets recipe cards shrink so the page does not scroll sideways', () => {
    const w = mount(Hub, { attachTo: document.body })
    try {
      const hub = w.get('[data-demo-hub]').element
      const card = w.get('.card').element
      const pre = w.get('.card pre').element
      expect(getComputedStyle(hub).overflowX).toMatch(/clip|hidden/)
      expect(parseFloat(getComputedStyle(card).minWidth)).toBe(0)
      expect(getComputedStyle(pre).overflowX).toMatch(/auto|scroll/)
      expect(getComputedStyle(pre).maxWidth).toBe('100%')
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
})

describe('bundled fixtures', () => {
  it('default song is a real chart', () => {
    const id = defaultSongId(fixtures)
    expect(id).toBe('escuta-meu-clamor-sda-86')
    expect(defaultSongId({ vazio: '', sozinha: '{title:X}\n' })).toBe('sozinha')
  })
})
