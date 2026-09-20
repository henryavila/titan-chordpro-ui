import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  convert,
  detect,
  detectKeyRewrite,
  fromCifraClubHtml,
  fromPlain,
  hostOk,
  isChord,
  isChordLine,
  looksLikeCifraClubHtml,
  missingOf,
  readMeta,
  rewriteToKey,
  titleFromUrl,
  toPlain,
  writeMeta,
} from '../../src/core/import-chordpro'
import { looksLikeOnSong } from '../../src/core/onsong'
import { layoutChart, parse } from '../../src/core'
import { JESUS_1, loadFixture } from '../helpers/load-fixture'

const helpers = join(dirname(fileURLToPath(import.meta.url)), '../helpers')
const UNIDOS = readFileSync(join(helpers, 'cifraclub-unidos.html'), 'utf8')
const TU_ES_TABS = readFileSync(join(helpers, 'cifraclub-tu-es-tabs.html'), 'utf8')
const WONDERWALL_CAPO = readFileSync(join(helpers, 'cifraclub-wonderwall-capo.html'), 'utf8')
const CEU_AZUL_STRUM = readFileSync(join(helpers, 'cifraclub-ceu-azul-strum.html'), 'utf8')

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
    expect(fromPlain('Verso 1:\nG  C')).toContain('{c:Verso 1}')
  })

  it('turns Intro into INTRODUÇÃO — the Titan label', () => {
    expect(fromPlain('Intro:\nG  C')).toContain('{c:INTRODUÇÃO}')
    expect(fromPlain('[Intro] G  C')).toContain('{c:INTRODUÇÃO}')
    expect(fromPlain('Introdução:\nG  C')).toContain('{c:INTRODUÇÃO}')
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

  it('maps Portuguese aliases to English keys and rewrites them', () => {
    const src = '{title:T}\n{x_origem:https://cifraclub.com.br/a}\n{x_audio_cantado:https://cdn/a.m4a?h=1}\n[G]a\n'
    expect(readMeta(src)).toMatchObject({
      title: 'T',
      x_source: 'https://cifraclub.com.br/a',
      x_audio_sung: 'https://cdn/a.m4a?h=1',
    })
    const out = writeMeta(src, readMeta(src))
    expect(out).toContain('{x_source:https://cifraclub.com.br/a}')
    expect(out).toContain('{x_audio_sung:https://cdn/a.m4a?h=1}')
    expect(out).not.toContain('x_origem')
    expect(out).not.toContain('x_audio_cantado')
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
    expect(out).toContain('{c:INTRODUÇÃO}')
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
    expect(r.source).toContain('{c:INTRODUÇÃO}')
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
    const chorus = choruses[0]
    expect(chorus?.kind).toBe('chorus')
    if (chorus?.kind !== 'chorus') throw new Error('expected chorus')
    expect(chorus.rows.length).toBeGreaterThan(1)
    const verse = blocks.find(
      (b) => b.kind === 'stanza' && b.rows.some((row) => /andorinha/.test(row.plain)),
    )
    expect(verse?.kind).toBe('stanza')
    if (verse?.kind !== 'stanza') throw new Error('expected stanza')
    expect(verse.rows.length).toBeGreaterThan(1)
  })

  it('drops Cifra Club tablature blocks and keeps the rehearsal chart once', () => {
    const page = fromCifraClubHtml(TU_ES_TABS)
    expect(page.body).toContain('[Intro] Bm7')
    expect(page.body).toContain('[Primeira Parte]')
    expect(page.body).toContain('[Pré-Refrão]')
    expect(page.body).toContain('[Refrão]')
    expect(page.body).not.toMatch(/\[TAB\b/i)
    expect(page.body).not.toMatch(/E\|-+/)
    expect(page.body).not.toMatch(/Parte \d+ de \d+/)

    const r = convert(TU_ES_TABS)
    expect(r.format).toBe('cifraclub')
    expect(r.source).toContain('{c:INTRODUÇÃO}')
    expect(r.source).toContain('[Bm7] [A/C#] [G2]')
    expect(r.source).toContain('{c:Primeira Parte}')
    expect(r.source).toContain('{c:Pré-Refrão}')
    expect(r.source).toContain('{soc}')
    expect(r.source).not.toContain('{sot}')
    expect(r.source).not.toMatch(/\{c:TAB/i)
    // Intro chords appear once — not again as a TAB caption.
    expect(r.source.match(/\[Bm7\] \[A\/C#\] \[G2\]/g)).toHaveLength(1)
    expect(r.source).toContain('Junto ao poço')
  })

  it('reads tempo, time, youtube and strum from the songData payload', () => {
    const page = fromCifraClubHtml(TU_ES_TABS)
    expect(page.tempo).toBe('71')
    expect(page.time).toBe('4/4')
    expect(page.youtubeId).toBe('YXnQ02HYB1w')
    expect(page.capo).toBe('0')
    expect(page.strums).toHaveLength(1)
    expect(page.strums[0]?.bpm).toBe(71)
    expect(page.strums[0]?.slots).toHaveLength(16)
    expect(page.strums[0]?.slots[0]).toEqual({ dir: 'down', contact: 'hit', essence: 'normal' })
    expect(page.strums[0]?.slots[1]?.contact).toBe('ghost')

    const r = convert(TU_ES_TABS)
    const meta = readMeta(r.source)
    expect(meta.tempo).toBe('71')
    expect(meta.time).toBe('4/4')
    expect(meta.x_youtube).toBe('YXnQ02HYB1w')
    expect(meta.capo).toBeUndefined()
    expect(meta.x_strum).toContain('bpm=71')
    expect(meta.x_strum).toContain('pat=')
    expect(missingOf(meta).filter((k) => k === 'tempo' || k === 'time')).toEqual([])
  })

  it('keeps the written chords when the page has a capo that matches the tom', () => {
    const page = fromCifraClubHtml(WONDERWALL_CAPO)
    expect(page.capo).toBe('2')
    expect(page.key).toBe('Em')
    expect(page.body).toContain('Em')

    const r = convert(WONDERWALL_CAPO)
    const meta = readMeta(r.source)
    expect(meta.key).toBe('Em')
    expect(meta.capo).toBe('2')
    expect(meta.transpose).toBeUndefined()
    expect(r.source).toContain('[Em]')
    expect(r.source).not.toContain('[F#m]')
    expect(r.source).toMatch(/\{capo:2\}/)
    expect(r.keyRewrite).toBeUndefined()
    expect(detectKeyRewrite(r.source)).toBeNull()
  })

  it('offers a key rewrite on import and does not apply it until confirmed', () => {
    const html = `<!DOCTYPE html><html><head>
<script type="application/ld+json">{"@type":"MusicComposition","name":"O Rei vem vindo"}</script>
<script>self.__next_f.push([1,"{\\"songData\\":{\\"config\\":{\\"capo\\":1,\\"keyShape\\":\\"G\\"}}}"])</script>
</head><body>
<span data-anchor="--chord-tone">Ab</span>
<pre class="_crVx" data-chord-content="true"><div class="kvMV">
<b data-chord-name="G" data-chord-original-text="G">G</b>  <b data-chord-name="C" data-chord-original-text="C">C</b>  <b data-chord-name="D" data-chord-original-text="D">D</b>
O Rei vem vindo
</div></pre>
</body></html>`
    const page = fromCifraClubHtml(html)
    expect(page.key).toBe('Ab')
    expect(page.capo).toBe('1')
    expect(page.body).toContain('G')

    const r = convert(html)
    expect(r.keyRewrite).toEqual({ declaredKey: 'Ab', writtenKey: 'G', capo: 1 })
    expect(r.source).toContain('[G]')
    expect(r.source).not.toContain('[Ab]')
    expect(r.source).toMatch(/\{capo:1\}/)

    const done = rewriteToKey(r.source, r.keyRewrite!.declaredKey)
    expect(done).not.toBeNull()
    expect(readMeta(done!.source)).toMatchObject({ key: 'Ab' })
    expect(readMeta(done!.source).transpose).toBeUndefined()
    expect(done!.source).toContain('[Ab]')
    expect(done!.source).not.toMatch(/\{capo:/)
  })

  it('import of a mismatched ChordPro offers the same rewrite as the button', () => {
    const src = loadFixture('sda/082-o-rei-vem-vindo.cho')
    const imported = convert(src)
    expect(imported.changed).toBe(false)
    expect(imported.keyRewrite).toEqual({ declaredKey: 'Ab', writtenKey: 'G', capo: 1 })
    expect(imported.source).toContain('[G]')
    expect(detectKeyRewrite(imported.source)).toEqual(imported.keyRewrite)
    const confirmed = rewriteToKey(imported.source, imported.keyRewrite!.declaredKey)
    const button = rewriteToKey(src, 'Ab')
    expect(confirmed).not.toBeNull()
    expect(button).not.toBeNull()
    expect(confirmed!.source.trim()).toBe(button!.source.trim())
  })

  it('rewrites a fake-capo chart into the declared key and drops the capo', () => {
    const src = loadFixture('sda/082-o-rei-vem-vindo.cho')
    const r = rewriteToKey(src, 'Ab')
    expect(r).not.toBeNull()
    expect(r!.from).toBe('G')
    expect(r!.to).toBe('Ab')
    expect(r!.transpose).toBe(0)
    const meta = readMeta(r!.source)
    expect(meta.key).toBe('Ab')
    expect(meta.transpose).toBeUndefined()
    expect(meta.capo).toBeUndefined()
    expect(r!.source).toContain('[Ab]')
    expect(r!.source).toContain('[Db]')
    expect(r!.source).not.toMatch(/\[G\]/)
    expect(r!.source).toContain('O Rei vem')
    expect(detectKeyRewrite(r!.source)).toBeNull()
  })

  it('does not rewrite a chart whose {key:} is already the tom, even if V outnumbers I', () => {
    const src = loadFixture('sda/091-o-melhor-lugar-do-mundo.cho')
    expect(detectKeyRewrite(src)).toBeNull()
    const r = rewriteToKey(src, 'A')
    expect(r).not.toBeNull()
    expect(r!.from).toBe('A')
    expect(r!.to).toBe('A')
    expect(r!.transpose).toBe(0)
    expect(readMeta(r!.source).transpose).toBeUndefined()
    expect(r!.source).toContain('[A] No mundo')
    expect(r!.source).toMatch(/\[E\]x\/\/\//)
  })

  it('takes the written key from capo vs {key:}, not the first chord and not the most frequent root', () => {
    const src = `{title:X}
{key:Ab}
{capo:1}

{c:INTRODUÇÃO}
[D]x/// [D]x/// [D]x/// [D]x///
[G]x///
letra [G]aqui
`
    expect(detectKeyRewrite(src)).toEqual({ declaredKey: 'Ab', writtenKey: 'G', capo: 1 })
    const r = rewriteToKey(src, 'Ab')
    expect(r!.from).toBe('G')
    expect(r!.transpose).toBe(0)
    expect(readMeta(r!.source).transpose).toBeUndefined()
    expect(r!.source).toContain('[Ab]')
    expect(r!.source).toContain('[Eb]')
    expect(r!.source).not.toMatch(/\{capo:/)
  })

  it('does not offer rewrite for a real capo whose body is already in {key:}', () => {
    const src = `{title:X}
{key:G}
{capo:2}

[G]linha [C]do [D]verso
`
    expect(detectKeyRewrite(src)).toBeNull()
    const r = rewriteToKey(src, 'G')
    expect(r!.transpose).toBe(0)
    expect(r!.source).toContain('[G]linha')
    expect(r!.source).toMatch(/\{capo:2\}/)
  })

  it('keeps every strumming section and maps abafada (code 0)', () => {
    const page = fromCifraClubHtml(CEU_AZUL_STRUM)
    expect(page.strums.length).toBe(2)
    expect(page.strums[0]?.label).toContain('Parte 1')
    const muted = page.strums[0]?.slots.find((s) => s.essence === 'muted')
    expect(muted).toEqual({ dir: 'down', contact: 'hit', essence: 'muted' })
    const r = convert(CEU_AZUL_STRUM)
    // Active pattern in x_strum; full set in x_strum_set
    expect(readMeta(r.source).x_strum).toContain('Da')
    expect(readMeta(r.source).x_strum_set).toBeTruthy()
    expect(readMeta(r.source).x_strum_set!.split('|').length).toBe(3)
  })
})
