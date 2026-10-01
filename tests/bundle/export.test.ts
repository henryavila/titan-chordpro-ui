import { readFileSync } from 'node:fs'
import { unzip } from '../helpers/unzip-bundle'
import { describe, expect, it, vi } from 'vitest'
import { audioTracksOf, normalizeSource, readScoreReference, writeScoreReference } from '../../src/core'
import { exportChartBundle } from '../../src/bundle'


const fixture = normalizeSource(readFileSync('fixtures/013-ele-vive-em-mim-partitura.cho', 'utf8'))
const gp = new Uint8Array(readFileSync('fixtures/notation/notes.gp'))
const png = new Uint8Array(readFileSync('fixtures/assets/ele-vive-intro.png'))
const audio = new Uint8Array(readFileSync('demo/ref-audio.wav'))
const ref = writeScoreReference({ src: 'private/solo.gp?token=secret', track: 1, start: 1, end: 1 })

describe('Cifra completa offline archive', () => {
  it('includes original scores, images, both audio roles and host art, rewriting every attachment locally', async () => {
    const source = fixture + '\n' + ref + '\n' + ref + '\n{x_titan_audio_sung: https://media.example/voz.wav}\n{x_titan_audio_playback: https://media.example/voz.wav}\n{x_titan_youtube: abc123}\n{x_titan_source: https://origin.example/song}'
    const loadAsset = vi.fn(async (_ref: string, kind: string) => ({ bytes: kind === 'score' ? gp : kind === 'audio' ? audio : png }))
    const result = await exportChartBundle(source, { loadAsset, onlineReferences: 'provenance', extras: [{ role: 'audio-cover', data: { bytes: png }, width: 512, height: 512 }, { role: 'slide-background', data: { bytes: png } }] })
    const entries = unzip(result.bytes)
    const text = new TextDecoder().decode(entries.get(result.chart))
    expect(text).not.toContain('https://')
    expect(text).not.toContain('token=secret')
    expect(text).not.toContain('{x_titan_youtube:')
    expect(text).toContain('[Gsus]x')
    expect(text).toContain('track=1 start=1 end=1')
    expect(loadAsset.mock.calls.filter(([, kind]) => kind === 'score')).toHaveLength(1)
    expect(loadAsset.mock.calls.filter(([, kind]) => kind === 'audio')).toHaveLength(1)
    const manifest = JSON.parse(new TextDecoder().decode(entries.get('manifest.json')))
    expect(manifest.offline).toBe(true)
    for (const asset of manifest.assets) expect(entries.has(asset.path)).toBe(true)
    expect(manifest.assets.find((a: { kind: string }) => a.kind === 'audio').roles).toEqual(['sung', 'playback'])
    expect(audioTracksOf(text).sung).toMatch(/^audios\//)
    const scoreLine = text.split('\n').find(line => line.includes('src="solos/'))!
    expect(entries.get(readScoreReference(scoreLine)!.src)).toEqual(gp)
    expect(new TextDecoder().decode(entries.get('ORIGEM.txt'))).toContain('abc123')
    expect(source).toContain('token=secret')
    expect(result.filename).toMatch(/^cifra-completa-.*\.zip$/)
  })
  it('packs hidden attachments and retains their source markers', async () => {
    const source = ref.split('\n').map(line => '#~ ' + line).join('\n')
    const result = await exportChartBundle(source, { loadAsset: async () => ({ bytes: gp }) })
    const text = new TextDecoder().decode(unzip(result.bytes).get(result.chart))
    expect(text).toContain('#~ {x_titan_score: src="solos/solo-1.gp"')
    expect(text).toBe('#~ {x_titan_score: src="solos/solo-1.gp" track=1 start=1 end=1}')
  })
  it('retains service references as provenance without fetching them', async () => {
    const loadAsset = vi.fn()
    const result = await exportChartBundle('{x_titan_audio_sung: https://open.spotify.com/track/id}\n{x_titan_youtube: abc123}', { loadAsset, onlineReferences: 'provenance' })
    expect(loadAsset).not.toHaveBeenCalled()
    const entries = unzip(result.bytes)
    expect(new TextDecoder().decode(entries.get(result.chart))).not.toContain('https://')
    expect(new TextDecoder().decode(entries.get('ORIGEM.txt'))).toContain('spotify.com')
  })
  it('rejects undeclared relative dependencies and external SVG resources', async () => {
    await expect(exportChartBundle('{include: other.cho}')).rejects.toThrow('include')
    await expect(exportChartBundle(fixture + '\n{x_titan_video: clip.mp4}', { loadAsset: async () => ({ bytes: png }) })).rejects.toThrow('x_titan_video')
    await expect(exportChartBundle(fixture + '\n{x_titan_audio_extra: extra.wav}', { loadAsset: async () => ({ bytes: png }) })).rejects.toThrow('x_titan_audio_extra')
    await expect(exportChartBundle(fixture + '\n{x_audio: old.wav}', { loadAsset: async () => ({ bytes: png }) })).rejects.toThrow('x_audio')
    await expect(exportChartBundle('{image: vector.svg}', { loadAsset: async () => ({ bytes: new TextEncoder().encode('<svg><image href="https://example.com/picture.png"/></svg>') }) })).rejects.toThrow('SVG')
    const result = await exportChartBundle('{image: vector.svg}', { loadAsset: async () => ({ bytes: new TextEncoder().encode('<svg><defs><linearGradient id="color"/></defs><rect fill="url(#color)"/></svg>') }) })
    expect(result.assetCount).toBe(1)
  })
  it('does not download a partial package on missing, empty, HTML or streaming media', async () => {
    await expect(exportChartBundle(ref)).rejects.toThrow('app')
    await expect(exportChartBundle(ref, { loadAsset: async () => { throw new Error('403') } })).rejects.toThrow('solo')
    await expect(exportChartBundle(ref, { loadAsset: async () => ({ bytes: new Uint8Array() }) })).rejects.toThrow('vazio')
    await expect(exportChartBundle(ref, { loadAsset: async () => ({ bytes: new TextEncoder().encode('<html>login</html>') }) })).rejects.toThrow('página')
    await expect(exportChartBundle('{x_titan_audio_sung: https://media.example/a.m3u8}', { loadAsset: async () => ({ bytes: new TextEncoder().encode('#EXTM3U\nhttps://media.example/part.ts') }) })).rejects.toThrow('transmissão')
  })
})
