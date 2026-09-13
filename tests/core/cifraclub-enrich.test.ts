import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  applyCifraClubEnrich,
  chartBody,
  convert,
  proposeCifraClubEnrich,
  readMeta,
  youtubeEmbedUrl,
  youtubeWatchUrl,
} from '../../src/core/import-chordpro'

const helpers = join(dirname(fileURLToPath(import.meta.url)), '../helpers')
const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const TU_ES = readFileSync(join(helpers, 'cifraclub-tu-es-tabs.html'), 'utf8')
const WONDERWALL = readFileSync(join(helpers, 'cifraclub-wonderwall-capo.html'), 'utf8')
const TUA_CC_NO_STRUM = readFileSync(join(helpers, 'cifraclub-tua-vontade-no-strum.html'), 'utf8')
const TUA = readFileSync(join(root, 'fixtures/sda/005-tua-vontade.cho'), 'utf8')

describe('chartBody / youtube urls', () => {
  it('strips known meta headers and keeps the sung body', () => {
    const body = chartBody(TUA)
    expect(body).toContain('{c:(INTRODUÇÃO)}')
    expect(body).toContain('[E]x//')
    expect(body).not.toMatch(/\{title:/)
    expect(body).not.toMatch(/\{tempo:/)
  })

  it('builds watch and embed urls', () => {
    expect(youtubeWatchUrl('YXnQ02HYB1w')).toBe('https://www.youtube.com/watch?v=YXnQ02HYB1w')
    expect(youtubeEmbedUrl('YXnQ02HYB1w')).toBe('https://www.youtube.com/embed/YXnQ02HYB1w')
    expect(youtubeWatchUrl('')).toBe('')
  })
})

describe('proposeCifraClubEnrich — meta only, no convert', () => {
  it('fills empty rich fields and leaves the SDA body byte-equal', () => {
    const url = 'https://www.cifraclub.com.br/florianopolis-house-of-prayer/tu-es-aguas-purificadoras/'
    const proposal = proposeCifraClubEnrich(TUA, TU_ES, { url })
    const applied = applyCifraClubEnrich(TUA, proposal, { youtubeId: proposal.youtube?.remoteId })

    expect(chartBody(applied)).toBe(chartBody(TUA))
    expect(applied).not.toContain('[Bm7]') // CC body never imported
    expect(readMeta(applied).x_origem).toBe(url)
    // local already has x_strum — keep-local omits batida from the patch
    expect(proposal.patch.x_strum).toBeUndefined()
    expect(readMeta(applied).x_strum).toContain('bpm=75')
    expect(readMeta(applied).x_strum).not.toContain('bpm=71')
    expect(readMeta(applied).x_youtube).toBe('YXnQ02HYB1w')
    // local already had tempo/time/duration — fill-empty keeps them
    expect(readMeta(applied).tempo).toBe('75')
    expect(readMeta(applied).time).toBe('6/8')
    expect(readMeta(applied).duration).toBe('03:59')
    expect(proposal.conflicts.some((c) => c.key === 'tempo')).toBe(true)
  })

  it('does not write x_youtube until the caller chooses', () => {
    const proposal = proposeCifraClubEnrich(TUA, TU_ES, {
      url: 'https://www.cifraclub.com.br/a/b/',
    })
    expect(proposal.youtube?.remoteId).toBe('YXnQ02HYB1w')
    expect(proposal.youtube?.songTitle).toMatch(/Tua Vontade/i)
    expect(proposal.patch.x_youtube).toBeUndefined()

    const without = applyCifraClubEnrich(TUA, proposal)
    expect(readMeta(without).x_youtube).toBeUndefined()

    const withPick = applyCifraClubEnrich(TUA, proposal, { youtubeId: 'YXnQ02HYB1w' })
    expect(readMeta(withPick).x_youtube).toBe('YXnQ02HYB1w')
  })

  it('keeps local x_strum (keep-local)', () => {
    const local = `{title:X}\n{x_strum:bpm=40;meter=4/4;grid=8;label=Old;pat=DUDU}\n[G]a\n`
    const proposal = proposeCifraClubEnrich(local, TU_ES)
    expect(proposal.patch.x_strum).toBeUndefined()
    const next = applyCifraClubEnrich(local, proposal)
    expect(readMeta(next).x_strum).toContain('bpm=40')
    expect(readMeta(next).x_strum).not.toContain('bpm=71')
    expect(chartBody(next)).toBe(chartBody(local))
  })

  it('fills x_strum when local lacks it and CC has strum', () => {
    const local = `{title:X}\n[G]a\n`
    const proposal = proposeCifraClubEnrich(local, TU_ES)
    expect(proposal.patch.x_strum).toContain('bpm=71')
    const next = applyCifraClubEnrich(local, proposal)
    expect(readMeta(next).x_strum).toContain('bpm=71')
    expect(chartBody(next)).toBe(chartBody(local))
  })

  it('warns about capo and never writes {capo:} or transposes the body', () => {
    const local = `{title:Local}\n{key:Em}\n[Em]hello\n`
    const proposal = proposeCifraClubEnrich(local, WONDERWALL, {
      url: 'https://www.cifraclub.com.br/oasis/wonderwall/',
    })
    expect(proposal.capoWarning).toMatch(/capo 2/i)
    const next = applyCifraClubEnrich(local, proposal, {
      youtubeId: proposal.youtube?.remoteId,
    })
    expect(readMeta(next).capo).toBeUndefined()
    expect(next).toContain('[Em]hello')
    expect(next).not.toContain('[F#m]')
    expect(chartBody(next)).toBe(chartBody(local))
  })

  it('does not go through convert — convert would rewrite the body', () => {
    const converted = convert(TU_ES).source
    expect(converted).toContain('[Bm7]')
    const enriched = applyCifraClubEnrich(TUA, proposeCifraClubEnrich(TUA, TU_ES))
    expect(enriched).not.toContain('[Bm7]')
    expect(chartBody(enriched)).toBe(chartBody(TUA))
  })

  it('fills empty key/tempo when the local chart lacks them', () => {
    const sparse = `{title:Só título}\n[G]linha\n`
    const proposal = proposeCifraClubEnrich(sparse, TU_ES)
    expect(proposal.patch.key).toBeTruthy()
    expect(proposal.patch.tempo).toBe('71')
    expect(proposal.patch.time).toBe('4/4')
    const next = applyCifraClubEnrich(sparse, proposal)
    expect(readMeta(next).tempo).toBe('71')
    expect(chartBody(next)).toBe(chartBody(sparse))
  })

  it('flags when Cifra Club has no strummings (Tua Vontade-style page)', () => {
    const proposal = proposeCifraClubEnrich(TUA, TUA_CC_NO_STRUM, {
      url: 'https://www.cifraclub.com.br/adoradores/tua-vontade/',
    })
    expect(proposal.strumMissing).toBe(true)
    expect(proposal.patch.x_strum).toBeUndefined()
    expect(proposal.strumMissing).not.toBe(proposeCifraClubEnrich(TUA, TU_ES).strumMissing)
  })
})
