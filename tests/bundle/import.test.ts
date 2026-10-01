import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { audioArtOf, audioTracksOf, normalizeSource, readScoreReference, writeScoreReference } from '../../src/core'
import { exportChartBundle, importChartBundle } from '../../src/bundle'
import { crc32 } from '../../src/slides/zip'
import { unzip } from '../../src/bundle/unzip'

const fixture = normalizeSource(readFileSync('fixtures/013-ele-vive-em-mim-partitura.cho', 'utf8'))
const gp = new Uint8Array(readFileSync('fixtures/notation/notes.gp'))
const png = new Uint8Array(readFileSync('fixtures/assets/ele-vive-intro.png'))
const audio = new Uint8Array(readFileSync('demo/ref-audio.wav'))
const ref = writeScoreReference({ src: 'private/solo.gp?token=secret', track: 1, start: 1, end: 1, name: 'Solo de entrada' })

function concat(parts: Uint8Array[]): Uint8Array {
  const n = parts.reduce((s, p) => s + p.length, 0)
  const out = new Uint8Array(n)
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}
function u16(n: number): Uint8Array {
  const b = new Uint8Array(2)
  new DataView(b.buffer).setUint16(0, n, true)
  return b
}
function u32(n: number): Uint8Array {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n, true)
  return b
}
function nameBytes(name: string): Uint8Array {
  const out = new Uint8Array(name.length)
  for (let i = 0; i < name.length; i++) out[i] = name.charCodeAt(i) & 0xff
  return out
}
function zipStored(members: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const member of members) {
    const name = nameBytes(member.name)
    const crc = crc32(member.data)
    const local = concat([
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
      u16(20), u16(0), u16(0), u16(0), u16(0x0021),
      u32(crc), u32(member.data.length), u32(member.data.length),
      u16(name.length), u16(0), name, member.data,
    ])
    const central = concat([
      new Uint8Array([0x50, 0x4b, 0x01, 0x02]),
      u16(20), u16(20), u16(0), u16(0), u16(0), u16(0x0021),
      u32(crc), u32(member.data.length), u32(member.data.length),
      u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    ])
    locals.push(local)
    centrals.push(central)
    offset += local.length
  }
  const centralDir = concat(centrals)
  return concat([
    ...locals,
    centralDir,
    concat([
      new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
      u16(0), u16(0), u16(members.length), u16(members.length),
      u32(centralDir.length), u32(offset), u16(0),
    ]),
  ])
}

async function packFull() {
  const source = fixture + '\n' + ref + '\n' + ref + '\n{x_titan_audio_sung: https://media.example/voz.wav}\n{x_titan_audio_playback: https://media.example/voz.wav}\n{x_titan_youtube: abc123}\n{x_titan_source: https://origin.example/song}'
  return exportChartBundle(source, {
    loadAsset: async (_ref, kind) => ({ bytes: kind === 'score' ? gp : kind === 'audio' ? audio : png }),
    onlineReferences: 'provenance',
    extras: [
      { role: 'audio-cover', data: { bytes: png }, width: 512, height: 512 },
      { role: 'slide-background', data: { bytes: png } },
    ],
  })
}

describe('importChartBundle', () => {
  it('persists GPX/audio/images once and rewrites every local reference to the host', async () => {
    const packed = await packFull()
    const persistAsset = vi.fn(async (asset: { path: string; kind: string; filename: string; bytes: Uint8Array; roles: string[] }) => {
      const n = persistAsset.mock.calls.length
      if (asset.kind === 'score') return { ref: `solos/host-${n}.gpx` }
      if (asset.kind === 'audio') return { ref: `https://cdn.example/host-${n}.wav` }
      return { ref: `/imagens/host-${n}.png` }
    })
    const imported = await importChartBundle(packed.bytes, { persistAsset })
    expect(imported.source).toContain('[Gsus]x')
    expect(imported.source).toContain('name="Solo de entrada"')
    expect(imported.source).toContain('track=1 start=1 end=1')
    expect(imported.source).toContain('{x_titan_youtube: abc123}')
    expect(imported.source).toContain('{x_titan_source: https://origin.example/song}')
    expect(imported.source).not.toContain('token=secret')
    expect(imported.source).not.toContain('solos/solo-')
    expect(imported.source).not.toContain('audios/audio-')
    expect(imported.source).not.toContain('assets/ele-vive-intro.png')
    expect(imported.source).toMatch(/\{image:\s*\/imagens\/host-\d+\.png/)
    expect(imported.personal).toBe(false)
    const scoreLine = imported.source.split('\n').find(line => line.includes('src="solos/host-'))!
    expect(readScoreReference(scoreLine)!.src).toMatch(/^solos\/host-\d+\.gpx$/)
    expect(imported.source.split('\n').filter(line => line.includes('{x_titan_score:'))).toHaveLength(2)
    expect(readScoreReference(imported.source.split('\n').filter(line => line.includes('{x_titan_score:'))[0]!)!.src)
      .toBe(readScoreReference(imported.source.split('\n').filter(line => line.includes('{x_titan_score:'))[1]!)!.src)
    expect(audioTracksOf(imported.source).sung).toMatch(/^https:\/\/cdn\.example\/host-\d+\.wav$/)
    expect(audioTracksOf(imported.source).playback).toBe(audioTracksOf(imported.source).sung)
    expect(audioArtOf(imported.source)?.url).toMatch(/^\/imagens\/host-\d+\.png$/)
    expect(persistAsset.mock.calls.filter(([asset]) => asset.kind === 'score')).toHaveLength(1)
    expect(persistAsset.mock.calls.filter(([asset]) => asset.kind === 'audio')).toHaveLength(1)
    const scoreCall = persistAsset.mock.calls.find(([asset]) => asset.kind === 'score')![0]
    expect(scoreCall.filename).toMatch(/\.gp$/)
    expect(scoreCall.bytes).toEqual(gp)
    expect(scoreCall.roles).toEqual(['notation'])
    const audioCall = persistAsset.mock.calls.find(([asset]) => asset.kind === 'audio')![0]
    expect(audioCall.bytes).toEqual(audio)
    expect(audioCall.roles).toEqual(['sung', 'playback'])
    expect(imported.assets.some(asset => asset.roles.includes('slide-background'))).toBe(true)
    expect(imported.provenance.map(item => item.kind)).toEqual(expect.arrayContaining(['youtube', 'source']))
  })

  it('hands the host a .gpx score with track and bars intact', async () => {
    const src = writeScoreReference({ src: 'arquivos/solo.gpx', track: 2, start: 3, end: 8 })
    const packed = await exportChartBundle(src, { loadAsset: async () => ({ bytes: gp }) })
    const persistAsset = vi.fn(async (asset: { filename: string; kind: string; bytes: Uint8Array }) => {
      expect(asset.kind).toBe('score')
      expect(asset.filename).toMatch(/\.gpx$/)
      expect(asset.bytes).toEqual(gp)
      return { ref: 'solos/importado.gpx' }
    })
    const imported = await importChartBundle(packed.bytes, { persistAsset })
    expect(readScoreReference(imported.source)).toMatchObject({ src: 'solos/importado.gpx', track: 2, start: 3, end: 8 })
  })

  it('keeps hidden attachments hidden after the host stores them', async () => {
    const source = ref.split('\n').map(line => '#~ ' + line).join('\n')
    const packed = await exportChartBundle(source, { loadAsset: async () => ({ bytes: gp }) })
    const imported = await importChartBundle(packed.bytes, {
      persistAsset: async () => ({ ref: 'solos/guardado.gpx' }),
    })
    expect(imported.source).toBe('#~ {x_titan_score: src="solos/guardado.gpx" track=1 start=1 end=1 name="Solo de entrada"}')
  })

  it('marks a personal chart and restores origem only when asked', async () => {
    const packed = await exportChartBundle('{title: Hi}\n{x_titan_source: https://origin.example/song}\n{x_titan_youtube: abc123}', {
      personal: true,
      onlineReferences: 'provenance',
    })
    const withRestore = await importChartBundle(packed.bytes, { persistAsset: async () => ({ ref: 'x' }) })
    expect(withRestore.personal).toBe(true)
    expect(withRestore.source).toContain('{x_titan_source: https://origin.example/song}')
    expect(withRestore.source).not.toContain('versão pessoal')
    const without = await importChartBundle(packed.bytes, { persistAsset: async () => ({ ref: 'x' }), restoreProvenance: false })
    expect(without.source).not.toContain('{x_titan_youtube:')
    expect(without.provenance.find(item => item.kind === 'youtube')?.value).toBe('abc123')
  })

  it('reads a stored (uncompressed) Titan ZIP the same way as a deflated one', async () => {
    const cho = '{title: Hi}\n{x_titan_score: src="solos/solo-1.gpx" track=1 start=1 end=1}'
    const manifest = JSON.stringify({
      format: 'titan-chordpro-bundle', version: 1, offline: true, chart: 'hi.cho',
      assets: [{ path: 'solos/solo-1.gpx', kind: 'score', roles: ['notation'] }],
    }, null, 2) + '\n'
    const bytes = zipStored([
      { name: 'hi.cho', data: new TextEncoder().encode(cho) },
      { name: 'solos/solo-1.gpx', data: gp },
      { name: 'manifest.json', data: new TextEncoder().encode(manifest) },
    ])
    const imported = await importChartBundle(bytes, { persistAsset: async () => ({ ref: 'solos/app.gpx' }) })
    expect(readScoreReference(imported.source.split('\n')[1]!)!.src).toBe('solos/app.gpx')
    const members = await unzip(bytes)
    expect(members.get('solos/solo-1.gpx')).toEqual(gp)
  })

  it('does not import when the host cannot persist, the ZIP is incomplete, or the ref is unsafe', async () => {
    const packed = await exportChartBundle(ref, { loadAsset: async () => ({ bytes: gp }) })
    await expect(importChartBundle(packed.bytes, { persistAsset: undefined as never })).rejects.toThrow('guardar')
    await expect(importChartBundle(packed.bytes, { persistAsset: async () => { throw new Error('disk') } })).rejects.toThrow('solo')
    await expect(importChartBundle(packed.bytes, { persistAsset: async () => ({ ref: '' }) })).rejects.toThrow('vazia')
    await expect(importChartBundle(packed.bytes, { persistAsset: async () => ({ ref: 'a}b' }) })).rejects.toThrow('inválidos')
    await expect(importChartBundle(new Uint8Array([1, 2, 3, 4]), { persistAsset: async () => ({ ref: 'x' }) })).rejects.toThrow('ZIP')
    const entries = await unzip(packed.bytes)
    const sabotaged = zipStored([...entries].map(([name, data]) => ({ name, data })).filter(entry => entry.name !== 'solos/solo-1.gp'))
    await expect(importChartBundle(sabotaged, { persistAsset: async () => ({ ref: 'x' }) })).rejects.toThrow('anexo')
    const unsafe = zipStored([
      { name: 'hi.cho', data: new TextEncoder().encode('{title: Hi}') },
      { name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify({
        format: 'titan-chordpro-bundle', version: 1, chart: '../hi.cho', assets: [],
      })) },
    ])
    await expect(importChartBundle(unsafe, { persistAsset: async () => ({ ref: 'x' }) })).rejects.toThrow('cifra')
    const traversal = zipStored([
      { name: 'hi.cho', data: new TextEncoder().encode('{title: Hi}') },
      { name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify({
        format: 'titan-chordpro-bundle', version: 1, chart: 'hi.cho',
        assets: [{ path: '../secret.gpx', kind: 'score', roles: ['notation'] }],
      })) },
    ])
    await expect(importChartBundle(traversal, { persistAsset: async () => ({ ref: 'x' }) })).rejects.toThrow('caminho')
  })

  it('does not keep leftover http(s) media that is missing from the ZIP', async () => {
    const persistAsset = vi.fn(async () => ({ ref: 'https://cdn.example/voz.wav' }))
    const bytes = zipStored([
      { name: 'hi.cho', data: new TextEncoder().encode('{title: Hi}\n{x_titan_audio_sung: https://evil.example/voz.wav}') },
      { name: 'audios/audio-1.wav', data: audio },
      { name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify({
        format: 'titan-chordpro-bundle', version: 1, chart: 'hi.cho',
        assets: [{ path: 'audios/audio-1.wav', kind: 'audio', roles: ['sung'] }],
      })) },
    ])
    await expect(importChartBundle(bytes, { persistAsset })).rejects.toThrow('anexo')
    expect(persistAsset).not.toHaveBeenCalled()
  })

  it('rejects a chart attachment whose manifest kind does not match', async () => {
    const persistAsset = vi.fn(async () => ({ ref: 'solos/app.gpx' }))
    const bytes = zipStored([
      { name: 'hi.cho', data: new TextEncoder().encode('{title: Hi}\n{x_titan_score: src="solos/solo-1.gpx" track=1 start=1 end=1}') },
      { name: 'solos/solo-1.gpx', data: gp },
      { name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify({
        format: 'titan-chordpro-bundle', version: 1, chart: 'hi.cho',
        assets: [{ path: 'solos/solo-1.gpx', kind: 'image', roles: ['chart-image'] }],
      })) },
    ])
    await expect(importChartBundle(bytes, { persistAsset })).rejects.toThrow('tipo')
    expect(persistAsset).not.toHaveBeenCalled()
  })

  it('rejects a host audio or cover ref the player cannot play', async () => {
    const packed = await exportChartBundle(
      '{title: Hi}\n{x_titan_audio_sung: https://media.example/voz.wav}',
      { loadAsset: async () => ({ bytes: audio }) },
    )
    await expect(importChartBundle(packed.bytes, { persistAsset: async () => ({ ref: 'storage/faixa.mp3' }) })).rejects.toThrow('player')
    await expect(importChartBundle(packed.bytes, { persistAsset: async () => ({ ref: 'file:///tmp/a.mp3' }) })).rejects.toThrow('player')
    const withCover = await exportChartBundle('{title: Hi}', {
      extras: [{ role: 'audio-cover', data: { bytes: png }, width: 512, height: 512 }],
    })
    await expect(importChartBundle(withCover.bytes, { persistAsset: async () => ({ ref: 'storage/capa.png' }) })).rejects.toThrow('player')
  })

  it('rewrites host refs and origem URLs with $ literally', async () => {
    const cho = [
      '{title: Hi}',
      '# Origem registrada em ORIGEM.txt.',
      '{image: imagens/imagem-1.png}',
      '{x_titan_score: src="solos/solo-1.gpx" track=1 start=1 end=1}',
      '{x_titan_audio_sung: audios/audio-1.wav}',
    ].join('\n')
    const bytes = zipStored([
      { name: 'hi.cho', data: new TextEncoder().encode(cho) },
      { name: 'solos/solo-1.gpx', data: gp },
      { name: 'imagens/imagem-1.png', data: png },
      { name: 'audios/audio-1.wav', data: audio },
      { name: 'ORIGEM.txt', data: new TextEncoder().encode('source: https://origin.example/song?q=$1&x=$&\n') },
      { name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify({
        format: 'titan-chordpro-bundle', version: 1, chart: 'hi.cho',
        assets: [
          { path: 'solos/solo-1.gpx', kind: 'score', roles: ['notation'] },
          { path: 'imagens/imagem-1.png', kind: 'image', roles: ['chart-image'] },
          { path: 'audios/audio-1.wav', kind: 'audio', roles: ['sung'] },
        ],
      })) },
    ])
    const imported = await importChartBundle(bytes, {
      persistAsset: async (asset) => {
        if (asset.kind === 'score') return { ref: 'solos/app-$&-$1.gpx' }
        if (asset.kind === 'audio') return { ref: 'https://cdn.example/a$1.wav' }
        return { ref: '/imagens/app-$1.png' }
      },
    })
    expect(readScoreReference(imported.source.split('\n').find(line => line.includes('src='))!)!.src).toBe('solos/app-$&-$1.gpx')
    expect(imported.source).toContain('{image: /imagens/app-$1.png}')
    expect(imported.source).toContain('{x_titan_audio_sung: https://cdn.example/a$1.wav}')
    expect(imported.source).toContain('{x_titan_source: https://origin.example/song?q=$1&x=$&}')
    expect(imported.source).not.toMatch(/src="solos\/app-src=/)
  })

  it('rejects a ZIP that has local files but no end-of-central-directory', async () => {
    const persistAsset = vi.fn(async () => ({ ref: 'solos/app.gpx' }))
    const complete = zipStored([
      { name: 'hi.cho', data: new TextEncoder().encode('{title: Hi}\n{x_titan_score: src="solos/solo-1.gpx" track=1 start=1 end=1}') },
      { name: 'solos/solo-1.gpx', data: gp },
      { name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify({
        format: 'titan-chordpro-bundle', version: 1, chart: 'hi.cho',
        assets: [{ path: 'solos/solo-1.gpx', kind: 'score', roles: ['notation'] }],
      })) },
    ])
    const view = new DataView(complete.buffer, complete.byteOffset, complete.byteLength)
    let cut = -1
    for (let i = 0; i + 4 <= complete.length; i++) {
      if (view.getUint32(i, true) === 0x02014b50) { cut = i; break }
    }
    expect(cut).toBeGreaterThan(0)
    await expect(importChartBundle(complete.subarray(0, cut), { persistAsset })).rejects.toThrow('ZIP')
    expect(persistAsset).not.toHaveBeenCalled()
  })

  it('rejects JSON error bodies disguised as GPX or audio', async () => {
    const persistAsset = vi.fn(async () => ({ ref: 'solos/app.gpx' }))
    const fake = new TextEncoder().encode('{"error":"not found","message":"gone"}')
    const asScore = zipStored([
      { name: 'hi.cho', data: new TextEncoder().encode('{title: Hi}\n{x_titan_score: src="solos/solo-1.gpx" track=1 start=1 end=1}') },
      { name: 'solos/solo-1.gpx', data: fake },
      { name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify({
        format: 'titan-chordpro-bundle', version: 1, chart: 'hi.cho',
        assets: [{ path: 'solos/solo-1.gpx', kind: 'score', roles: ['notation'] }],
      })) },
    ])
    await expect(importChartBundle(asScore, { persistAsset })).rejects.toThrow('página')
    const asAudio = zipStored([
      { name: 'hi.cho', data: new TextEncoder().encode('{title: Hi}\n{x_titan_audio_sung: audios/audio-1.mp3}') },
      { name: 'audios/audio-1.mp3', data: fake },
      { name: 'manifest.json', data: new TextEncoder().encode(JSON.stringify({
        format: 'titan-chordpro-bundle', version: 1, chart: 'hi.cho',
        assets: [{ path: 'audios/audio-1.mp3', kind: 'audio', roles: ['sung'] }],
      })) },
    ])
    await expect(importChartBundle(asAudio, { persistAsset })).rejects.toThrow('página')
    expect(persistAsset).not.toHaveBeenCalled()
  })
})
