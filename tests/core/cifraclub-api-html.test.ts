import { describe, expect, it, vi } from 'vitest'
import { convert, fromCifraClubHtml, readMeta } from '../../src/core/import-chordpro'
import {
  cifraClubSlugs,
  cifraClubVersionToHtml,
  loadCifraClubHtml,
} from '../../src/core/cifraclub-api-html'

const PATTERN = [7, 23, 23, 19, 23, 19, 7, 23, 23, 19, 23, 19, 7, 23, 7, 19]
const TIME = ['1', 'x', 'x', 'x', '2', 'x', 'x', 'x', '3', 'x', 'x', 'x', '4', 'x', 'x', 'x']

/** Shape of `GET /v3/version/{artista}/{musica}` — not a saved page. */
const WONDERWALL = {
  key: 'A',
  shapeKey: 'G',
  stdKey: 'F#m',
  stdShapeKey: 'Em',
  capo: 2,
  youtubeId: '6hzrDeceEKc',
  music: { name: 'Wonderwall' },
  artist: { name: 'Oasis' },
  strumming: [
    {
      description: 'Pop Rock',
      pattern: PATTERN,
      bpm: 87,
      time_signature: TIME,
      section: 'Ritmo Padrão',
    },
  ],
  content: `[Intro] <b>Em7</b>  <b>G</b>

#t1#[TAB - Intro]
   <b>Em7</b>
#t2#E|-------0--|
B|-3--3-----|#/t2##/t1#

[Primeira Parte]
<b>Em7</b>
    Uma letra qualquer
`,
}

describe('Cifra Club version JSON → HTML the parser already reads', () => {
  it('uses stdShapeKey, not key, and keeps the API content text', () => {
    const html = cifraClubVersionToHtml(WONDERWALL)
    expect(html).not.toBeNull()
    expect(html).toContain('data-anchor="--chord-tone">Em<')
    expect(html).not.toContain('chord-tone">A<')
    expect(html).toContain('"timeSignature"')
    expect(html).not.toContain('time_signature')
    expect(html).toContain('"youtubeID":"6hzrDeceEKc"')
    expect(html).toContain('<b>Em7</b>')

    const page = fromCifraClubHtml(html!)
    expect(page.key).toBe('Em')
    expect(page.capo).toBe('2')
    expect(page.title).toBe('Wonderwall')
    expect(page.subtitle).toBe('Oasis')
    expect(page.youtubeId).toBe('6hzrDeceEKc')
    expect(page.tempo).toBe('87')
    expect(page.time).toBe('4/4')
    expect(page.strums).toHaveLength(1)
    expect(page.body).toContain('Uma letra qualquer')
    expect(page.body).not.toMatch(/#t1#|E\|/)

    const r = convert(html!)
    const meta = readMeta(r.source)
    expect(meta.key).toBe('Em')
    expect(meta.capo).toBe('2')
    expect(meta.x_youtube).toBe('6hzrDeceEKc')
    expect(r.source).not.toContain('{sot}')
    expect(r.source).toContain('[Em7]')
  })

  it('omits capo 0 and still reads a bare <b> chord', () => {
    const html = cifraClubVersionToHtml({
      key: 'A',
      stdShapeKey: 'D',
      capo: 0,
      youtubeId: 'YXnQ02HYB1w',
      music: { name: 'Tu És / Águas Purificadoras (Pot-pourri)' },
      artist: { name: 'Florianópolis House Of Prayer (fhop music)' },
      strumming: [{ pattern: PATTERN, bpm: 71, time_signature: TIME, section: 'Padrão' }],
      content: '<b>Bm7</b>  <b>A/C#</b>\nJunto ao poço estava eu\n',
    })
    const page = fromCifraClubHtml(html!)
    expect(page.key).toBe('D')
    expect(page.capo).toBe('0')
    expect(page.subtitle).toBe('Florianópolis House Of Prayer (fhop music)')
    expect(page.body).toContain('Bm7')
    expect(readMeta(convert(html!).source).capo).toBeUndefined()
  })

  it('reads the two first slugs and refuses anything else', () => {
    expect(cifraClubSlugs('https://www.cifraclub.com.br/oasis/wonderwall/simplificada/')).toEqual({
      artist: 'oasis',
      song: 'wonderwall',
    })
    expect(cifraClubSlugs('https://cifraclub.com.br/Oasis/Wonderwall')).toEqual({
      artist: 'oasis',
      song: 'wonderwall',
    })
    expect(cifraClubSlugs('https://www.cifraclub.com.br/oa_sis/wonderwall/')).toBeNull()
    expect(cifraClubSlugs('https://example.com/oasis/wonderwall')).toBeNull()
  })

  it('falls back to the version API when the page is Access Denied', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.startsWith('https://www.cifraclub.com.br/')) {
        return new Response('<HTML><HEAD><TITLE>Access Denied</TITLE></HEAD></HTML>', { status: 403 })
      }
      expect(url).toBe('https://api.cifraclub.com.br/v3/version/oasis/wonderwall')
      expect(new Headers(init?.headers).get('referer')).toBe('https://www.cifraclub.com.br/')
      expect(init?.redirect).toBe('manual')
      return new Response(JSON.stringify(WONDERWALL), { status: 200 })
    })
    const html = await loadCifraClubHtml(
      'https://www.cifraclub.com.br/oasis/wonderwall/simplificada/',
      fetchImpl as unknown as typeof fetch,
    )
    expect(fromCifraClubHtml(html!).key).toBe('Em')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('keeps a real page and does not call the API', async () => {
    const page = '<pre data-chord-content="true"><b data-chord-name="G">G</b>\nLetra aqui</pre>'
    const fetchImpl = vi.fn(async () => new Response(page, { status: 200 }))
    const html = await loadCifraClubHtml('https://www.cifraclub.com.br/oasis/wonderwall/', fetchImpl as unknown as typeof fetch)
    expect(html).toBe(page)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('does not follow an API redirect', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('api.cifraclub.com.br')) {
        return new Response('', { status: 302, headers: { location: 'https://evil.example/x' } })
      }
      return new Response('<TITLE>Access Denied</TITLE>', { status: 403 })
    })
    expect(
      await loadCifraClubHtml('https://www.cifraclub.com.br/oasis/wonderwall/', fetchImpl as unknown as typeof fetch),
    ).toBeNull()
  })
})
