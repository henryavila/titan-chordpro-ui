import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  convert,
  detect,
  fromCifraClubHtml,
  fromPlain,
  hostOk,
  isChord,
  isChordLine,
  looksLikeCifraClubHtml,
  missingOf,
  readMeta,
  titleFromUrl,
  toPlain,
  writeMeta,
} from '../../src/core/import-chordpro'
import { looksLikeOnSong } from '../../src/core/onsong'
import { layoutChart, parse } from '../../src/core'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

const UNIDOS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../helpers/cifraclub-unidos.html'),
  'utf8',
)

describe('recognising what was handed over', () => {
  it('knows nothing from something', () => {
    expect(detect('')).toBe('vazio')
    expect(detect('   \n  ')).toBe('vazio')
  })

  it('spots ChordPro by its directives', () => {
    expect(detect(loadFixture(JESUS_1))).toBe('chordpro')
    expect(detect('{title:Uma}\n[G]Letra')).toBe('chordpro')
  })

  it('spots an OnSong header', () => {
    expect(detect('Title: Uma\nArtist: Alguém\n\n[G]Letra')).toBe('onsong')
  })

  it('falls back to chords above the lyric', () => {
    expect(detect('G       C\nUma letra qualquer')).toBe('plain')
  })

  /**
   * `onsong.ts` normalises silently inside `parse()`; this module converts on
   * purpose. They may do different amounts of work, but they must never
   * disagree about *what* an OnSong header is.
   */
  it('agrees with the implicit path on what an OnSong header looks like', () => {
    const onsong = 'Title: Uma\nArtist: Alguém\nKey: G\n\nG       C\nUma letra qualquer'
    expect(detect(onsong)).toBe('onsong')
    expect(looksLikeOnSong(onsong)).toBe(true)
    // And neither claims a real ChordPro chart is OnSong.
    expect(looksLikeOnSong(loadFixture(JESUS_1))).toBe(false)
    expect(detect(loadFixture(JESUS_1))).toBe('chordpro')
  })
})

describe('chords above the lyric become chords in the lyric', () => {
  it('puts each chord on the column it was written at', () => {
    // C sits on column 8, which lands right after "Uma letr".
    expect(fromPlain('G       C\nUma letra qualquer')).toBe('[G]Uma letr[C]a qualquer')
  })

  it('never moves a chord behind the one before it', () => {
    // Two chords crowded onto the same column still come out in order.
    const out = fromPlain('G C\nUma')
    expect(out.indexOf('[G]')).toBeLessThan(out.indexOf('[C]'))
  })

  it('a chord line with no lyric under it stays a chord line', () => {
    expect(fromPlain('G  C  D')).toBe('[G] [C] [D]')
  })

  it('turns a chorus heading into {soc}/{eoc}, and closes it', () => {
    const out = fromPlain('Refrão:\nG\nUma letra')
    expect(out).toContain('{soc}')
    expect(out.trimEnd().endsWith('{eoc}')).toBe(true)
  })

  it('a blank after the refrain is the next verse, not more chorus', () => {
    const out = fromPlain('[Refrão]\nG       C\nPois a força\n\nG       C\nUma voz sozinha')
    expect(out.indexOf('{eoc}')).toBeGreaterThan(-1)
    expect(out.indexOf('{eoc}')).toBeLessThan(out.indexOf('Uma voz'))
  })

  it('names other sections as comments', () => {
    expect(fromPlain('Intro:\nG  C')).toContain('{c:Intro}')
  })

  it('keeps a tab as a tab', () => {
    const tab = 'e|---0---|\nB|---1---|\nG|---0---|\nD|---2---|\nA|---3---|\nE|-------|'
    const out = fromPlain(tab)
    expect(out).toContain('{sot}')
    expect(out).toContain('{eot}')
    expect(out).toContain('e|---0---|')
  })

  it('what it produces is readable by the parser', () => {
    const view = parse(fromPlain('Intro:\nG  C\n\nRefrão:\nG       C\nUma letra qualquer'))
    expect(view.sections.length).toBeGreaterThan(0)
    expect(view.sections.some((s) => s.kind === 'chorus')).toBe(true)
  })
})

describe('convert says what it did', () => {
  it('leaves ChordPro alone and says nothing changed', () => {
    const src = loadFixture(JESUS_1)
    const r = convert(src)
    expect(r.format).toBe('chordpro')
    expect(r.changed).toBe(false)
    expect(r.source).toBe(src.replace(/\r/g, '').replace(/[ \t]+$/gm, '').trim())
  })

  it('reports the format it converted from', () => {
    expect(convert('G\nUma').label).toBe('acordes sobre a letra')
    expect(convert('Title: Uma\n\nG\nUma').label).toBe('OnSong')
  })

  it('empty in, empty out — and no crash', () => {
    expect(convert('')).toEqual({ source: '', format: 'vazio', label: '', changed: false })
  })
})

describe('the chart\'s own details', () => {
  it('reads the header, including the short forms', () => {
    expect(readMeta('{t:Uma}\n{st:Alguém}\n{key:G}')).toMatchObject({
      title: 'Uma', subtitle: 'Alguém', key: 'G',
    })
  })

  it('rewrites the header instead of stacking a second one', () => {
    const out = writeMeta('{key:C}\n{title:Velho}\n[G]Letra', { title: 'Novo', key: 'G' })
    expect(out.match(/\{key:/g)).toHaveLength(1)
    expect(out.match(/\{title:/g)).toHaveLength(1)
    expect(out).toContain('{title:Novo}')
    expect(out).toContain('[G]Letra')
  })

  it('keeps the canonical order whatever order it was given', () => {
    const out = writeMeta('[G]Letra', { key: 'G', title: 'Uma', tempo: '80' })
    expect(out.split('\n').slice(0, 3)).toEqual(['{title:Uma}', '{key:G}', '{tempo:80}'])
  })

  it('drops a key the caller left blank', () => {
    expect(writeMeta('[G]x', { title: 'Uma', key: '  ' })).not.toContain('{key:')
  })

  it('lists what is still missing before it can stand for everyone', () => {
    expect(missingOf({ title: 'Uma' })).toEqual(['key', 'tempo', 'time', 'duration'])
    expect(missingOf({ title: 'U', key: 'G', tempo: '80', time: '4/4' })).toEqual(['duration'])
    expect(missingOf({ title: 'U', key: 'G', tempo: '80', time: '4/4', duration: '04:26' })).toEqual([])
  })

  it('a duration too short to roll is still missing', () => {
    expect(missingOf({ title: 'U', key: 'G', tempo: '80', time: '4/4', duration: '5' })).toEqual(['duration'])
    expect(missingOf({ title: 'U', key: 'G', tempo: '80', time: '4/4', duration: 'abc' })).toEqual(['duration'])
  })

  it('reads and rewrites duration with the other header details', () => {
    expect(readMeta('{duration:04:26}\n[G]Letra')).toMatchObject({ duration: '04:26' })
    const out = writeMeta('[G]Letra', {
      title: 'Uma',
      key: 'G',
      tempo: '80',
      time: '4/4',
      duration: '04:26',
    })
    expect(out.split('\n').slice(0, 5)).toEqual([
      '{title:Uma}',
      '{key:G}',
      '{tempo:80}',
      '{time:4/4}',
      '{duration:04:26}',
    ])
  })

  it('survives a round trip', () => {
    const src = writeMeta('[G]Letra', {
      title: 'Uma',
      key: 'G',
      tempo: '80',
      time: '4/4',
      duration: '04:26',
    })
    expect(missingOf(readMeta(src))).toEqual([])
  })
})

describe('where a chart can come from', () => {
  it('accepts cifraclub and nothing else', () => {
    expect(hostOk('https://www.cifraclub.com.br/x/y/')).toBe(true)
    expect(hostOk('https://cifraclub.com.br/x/y/')).toBe(true)
    expect(hostOk('https://exemplo.com/x')).toBe(false)
    expect(hostOk('nem url')).toBe(false)
  })

  it('guesses a title and an artist from the address', () => {
    expect(titleFromUrl('https://www.cifraclub.com.br/ministerio-jovem/meu-farol/')).toEqual({
      title: 'Meu Farol', subtitle: 'Ministerio Jovem',
    })
  })

  it('does not throw on a broken address', () => {
    expect(titleFromUrl('///')).toEqual({ title: '', subtitle: '' })
  })
})

describe('going back out to plain text', () => {
  it('lifts the chords above the lyric again', () => {
    const plain = toPlain('[G]Uma let[C]ra')
    const [chords, lyric] = plain.split('\n')
    expect(lyric).toBe('Uma letra')
    expect(chords?.indexOf('G')).toBe(0)
    expect(chords?.indexOf('C')).toBe('Uma let'.length)
  })

  it('round-trips through the converter', () => {
    const original = '[G]Uma letr[C]a qualquer'
    expect(fromPlain(toPlain(original))).toBe(original)
  })

  it('names the chorus so the converter can find it again', () => {
    expect(toPlain('{soc}\n[G]Uma\n{eoc}')).toContain('[Refrão]')
  })

  it('a rehearsal comment is still a comment after a round trip through plain', () => {
    const src = '{c:(INTRODUÇÃO - strings, piano e violino)}\n[D]x//   [G/D]x//'
    const out = fromPlain(toPlain(src))
    expect(out).toContain('{c:INTRODUÇÃO - strings, piano e violino}')
    expect(out).not.toMatch(/\[INTRODUÇÃO/)
    const view = parse(out)
    expect(view.sections.some((s) => s.lines.some((l) => l.type === 'comment'))).toBe(true)
  })
})

describe('Cifra Club chords and HTML', () => {
  it('accepts the qualities Cifra Club writes', () => {
    for (const name of ['G/D', 'D7(4)', 'C7M', 'C7M(9)', 'Em7(11)', 'D7(9/11)', 'C9/E', 'Bb9', 'Eb°', 'G6', 'Am7']) {
      expect(isChord(name), name).toBe(true)
    }
    expect(isChord('Intro')).toBe(false)
    expect(isChordLine('G/D  D7(4)  G  C/E  D/F#')).toBe(true)
  })

  it('a [Intro] sitting on the same line as the chords is a section, not lyrics', () => {
    const out = fromPlain('[Intro] G/D  D7(4)  G  C/E  D/F#')
    expect(out).toContain('{c:Intro}')
    expect(out).toContain('[G/D]')
    expect(out).toContain('[D7(4)]')
    expect(out).not.toContain('[Intro]')
  })

  it('reads the Unidos em Cristo page the site actually serves', () => {
    expect(looksLikeCifraClubHtml(UNIDOS)).toBe(true)
    const page = fromCifraClubHtml(UNIDOS)
    expect(page.title).toBe('Unidos Em Cristo')
    expect(page.subtitle).toBe('Novo Hinário Adventista')
    expect(page.key).toBe('G')
    expect(page.body).toContain('[Intro]')
    expect(page.body).toContain('G/D')
    expect(page.body).toContain('D7(4)')
    // Dots stay in the plain pair so merge can read the attack column.
    expect(page.body).toContain('U.ma andorinha nco f.az verao')
    expect(page.body).toContain('[Refrão]')

    const r = convert(UNIDOS)
    expect(r.format).toBe('cifraclub')
    expect(r.label).toBe('Cifra Club')
    expect(r.source).toContain('{title:Unidos Em Cristo}')
    expect(r.source).toContain('{key:G}')
    expect(r.source).toContain('{c:Intro}')
    expect(r.source).toContain('[G/D]')
    expect(r.source).toContain('[D7(4)]')
    expect(r.source).toContain('[G9]Uma andorinha nco [D/G]faz verao')
    expect(r.source).not.toMatch(/U\.ma|f\.az|a\.té|m\.ulti|uni\.ao/)
    const view = parse(r.source)
    expect(view.meta.title).toBe('Unidos Em Cristo')
    expect(view.meta.key).toBe('G')
    // A blank between every Cifra Club pair was splitting the editor into
    // one chorus/stanza box per line.
    expect(r.source).toMatch(/andorinha[^\n]+\n\[G7\(4\)\]/)
    expect(r.source).not.toMatch(/andorinha[^\n]+\n\n\[G7\(4\)\]/)
    const blocks = layoutChart(view)
    const choruses = blocks.filter((b) => b.kind === 'chorus')
    expect(choruses).toHaveLength(1)
    expect(choruses[0]?.rows.length).toBeGreaterThan(1)
    const verse = blocks.find((b) => b.kind === 'stanza' && b.rows.some((row) => /andorinha/.test(row.plain)))
    expect(verse?.rows.length).toBeGreaterThan(1)
  })
})
