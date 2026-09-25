import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  convert,
  fromCifraClubHtml,
  looksLikeCifraClubHtml,
  readMeta,
} from '../../src/core/import-chordpro'

/**
 * Pages captured 2026-09-24. Each file is the chart `<pre>` plus the JSON-LD
 * and songData scripts from that URL — the markup Titan actually reads.
 * A Cifra Club redesign that drops the chart, keeps only a fragment, or lets
 * the tablature through fails here. Class renames that the parser still
 * understands do not.
 */
const dir = join(dirname(fileURLToPath(import.meta.url)), '../helpers/cifraclub-pages')
const page = (name: string) => readFileSync(join(dir, name), 'utf8')

const TAB_LEAK = /\[(?:TAB|Tab|Tablatura)\b|Parte \d+ de \d+|[EBGDA]\|-{2,}|\{sot\}/

function held(html: string) {
  expect(looksLikeCifraClubHtml(html)).toBe(true)
  const parsed = fromCifraClubHtml(html)
  const result = convert(html)
  expect(result.format).toBe('cifraclub')
  const lines = parsed.body.split('\n').filter((l) => l.trim())
  const lyric = result.source.replace(/\[[^\]]*\]/g, '')
  return { parsed, result, lines, lyric, meta: readMeta(result.source) }
}

describe('Cifra Club pages captured from the live site', () => {
  it('Tu És / Águas Purificadoras keeps the chart and drops the mid-song tabs', () => {
    const html = page('tu-es-aguas-purificadoras.html')
    expect(html).toMatch(/\[TAB - Intro\]/)
    expect(html).toMatch(/Parte 1 de 2/)
    const { parsed, result, lines, lyric, meta } = held(html)
    expect(lines.length).toBeGreaterThan(100)
    expect(parsed.title).toBe('Tu És / Águas Purificadoras (Pot-pourri)')
    expect(parsed.subtitle).toBe('Florianópolis House Of Prayer (fhop music)')
    expect(parsed.key).toBe('D')
    expect(meta).toMatchObject({
      title: 'Tu És / Águas Purificadoras (Pot-pourri)',
      key: 'D',
      tempo: '71',
      time: '4/4',
      x_youtube: 'YXnQ02HYB1w',
    })
    expect(meta.x_strum).toContain('bpm=71')
    expect(meta.x_strum).toContain('meter=4/4')
    expect(meta.capo).toBeUndefined()
    expect(result.source).toContain('{c:INTRODUÇÃO}')
    expect(result.source).toContain('{c:Primeira Parte}')
    expect(result.source).toContain('{c:Pré-Refrão}')
    expect(result.source).toContain('{soc}')
    expect(lyric).toContain('Junto ao poço')
    expect(lyric).toContain('de beber')
    expect(lyric).toContain('Quero beber do teu rio')
    expect(result.source.match(/\[Bm7\] \[A\/C#\] \[G2\]/g)).toHaveLength(1)
    expect(parsed.body).not.toMatch(TAB_LEAK)
    expect(result.source).not.toMatch(TAB_LEAK)
  })

  it('Tua Vontade keeps the chart when the page has no batida and no clip', () => {
    const html = page('tua-vontade.html')
    const { parsed, result, lines, lyric, meta } = held(html)
    expect(lines.length).toBeGreaterThan(40)
    expect(parsed.title).toBe('Tua Vontade')
    expect(parsed.subtitle).toBe('Adoradores Novo Tempo')
    expect(parsed.key).toBe('E')
    expect(parsed.youtubeId).toBe('')
    expect(parsed.strums).toHaveLength(0)
    expect(meta.tempo).toBeUndefined()
    expect(meta.x_youtube).toBeUndefined()
    expect(meta.x_strum).toBeUndefined()
    expect(meta.capo).toBeUndefined()
    expect(result.source).toContain('{c:INTRODUÇÃO}')
    expect(result.source).toContain('[E] [F#m7] [D9]')
    expect(lyric).toContain('eu Te seguirei')
    expect(lyric).toContain('Tua vontade')
    expect(result.source).toContain('{soc}')
    expect(result.source).toContain('{c:Final}')
    expect(parsed.body).not.toMatch(TAB_LEAK)
    expect(result.source).not.toMatch(TAB_LEAK)
  })

  it('Unidos Em Cristo keeps one chorus and the syllable dots land on the words', () => {
    const html = page('unidos-em-cristo.html')
    const { parsed, result, lines, meta } = held(html)
    expect(lines.length).toBeGreaterThan(60)
    expect(parsed.title).toBe('Unidos Em Cristo')
    expect(parsed.subtitle).toBe('Novo Hinário Adventista')
    expect(parsed.key).toBe('G')
    expect(meta.x_youtube).toBe('LCRzBt65wQA')
    expect(meta.capo).toBeUndefined()
    expect(parsed.strums).toHaveLength(0)
    expect(result.source).toContain('{c:INTRODUÇÃO}')
    expect(result.source).toContain('[G/D] [D7(4)] [G] [C/E] [D/F#]')
    expect(result.source).toContain('[G9]Uma andorinha nco [D/G]faz verao')
    expect(result.source).toMatch(/andorinha[^\n]+\n\[G7\(4\)\]/)
    expect(result.source).not.toMatch(/andorinha[^\n]+\n\n\[G7\(4\)\]/)
    expect(result.source).toContain('{soc}')
    expect(result.source).toContain('força esta na')
    expect(parsed.body).not.toMatch(TAB_LEAK)
    expect(result.source).not.toMatch(TAB_LEAK)
  })

  it('Meu Farol keeps the written chords and only offers the key rewrite', () => {
    const html = page('meu-farol.html')
    const { parsed, result, lines, lyric, meta } = held(html)
    expect(lines.length).toBeGreaterThan(60)
    expect(parsed.title).toBe('Meu Farol')
    expect(parsed.subtitle).toBe('Ministério Jovem')
    expect(parsed.key).toBe('G')
    expect(parsed.youtubeId).toBe('')
    expect(parsed.strums).toHaveLength(0)
    expect(meta.key).toBe('G')
    expect(meta.capo).toBeUndefined()
    expect(meta.transpose).toBeUndefined()
    expect(result.keyRewrite).toEqual({ declaredKey: 'G', writtenKey: 'A', capo: 0, k: 2 })
    expect(result.source).toContain('{c:INTRODUÇÃO}')
    expect(result.source).toContain('[A]')
    expect(lyric).toContain('Nas batalhas')
    expect(result.source).toContain('{soc}')
    expect(lyric).toContain('Meu farol')
    expect(result.source).not.toContain('[G]Nas batalhas')
    expect(parsed.body).not.toMatch(TAB_LEAK)
    expect(result.source).not.toMatch(TAB_LEAK)
  })
})
