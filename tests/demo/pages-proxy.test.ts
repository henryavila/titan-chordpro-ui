import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { YT_ID, cifraOk } from '../../functions/_shared'
import worker from '../../functions/worker'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('demo Worker proxy gate', () => {
  it('uses Workers Assets config for the demo', () => {
    const toml = readFileSync(join(root, 'wrangler.toml'), 'utf8')
    expect(toml).not.toMatch(/pages_build_output_dir/)
    expect(toml).toMatch(/main\s*=\s*"functions\/worker\.ts"/)
    expect(toml).toMatch(/directory\s*=\s*"\.\/dist-demo"/)
  })

  it('allows only Cifra Club hosts', () => {
    expect(cifraOk('https://www.cifraclub.com.br/artista/musica/')).toBe(true)
    expect(cifraOk('https://cifraclub.com.br/artista/musica/')).toBe(true)
    expect(cifraOk('https://evil.com/?u=cifraclub.com.br')).toBe(false)
    expect(cifraOk('not-a-url')).toBe(false)
  })

  it('accepts only 11-char YouTube ids', () => {
    expect(YT_ID.test('dQw4w9WgXcQ')).toBe(true)
    expect(YT_ID.test('short')).toBe(false)
    expect(YT_ID.test('../etc/passwd')).toBe(false)
  })

  it('rejects a non-Cifra Club url on the proxy route', async () => {
    const res = await worker.fetch(
      new Request('https://demo.example/__cifra_fetch?url=https://evil.com/x'),
    )
    expect(res.status).toBe(400)
  })

  it('rejects a short YouTube id on the proxy route', async () => {
    const res = await worker.fetch(
      new Request('https://demo.example/__youtube_duration?id=short'),
    )
    expect(res.status).toBe(400)
  })

  it('answers CORS preflight on the proxy routes', async () => {
    const cifra = await worker.fetch(
      new Request('https://demo.example/__cifra_fetch', { method: 'OPTIONS' }),
    )
    const youtube = await worker.fetch(
      new Request('https://demo.example/__youtube_duration', { method: 'OPTIONS' }),
    )
    expect(cifra.status).toBe(204)
    expect(youtube.status).toBe(204)
  })

  it('leaves unknown paths to static assets', async () => {
    const res = await worker.fetch(new Request('https://demo.example/standalone.html'))
    expect(res.status).toBe(404)
  })
})
