import { describe, expect, it, vi } from 'vitest'
import { catalogToFixtures, fetchPreviewCatalog } from '../../demo/preview-catalog'
import { handleCifraFetch, handlePreviewRequest, listPreviewFiles } from '../../demo/preview-plugin'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

function tmpCharts(): string {
  const dir = mkdtempSync(join(tmpdir(), 'titan-preview-'))
  writeFileSync(join(dir, 'Ao-olhar-pra-cruz.txt'), '{title: Ao olhar pra cruz}\n[C]oi\n')
  writeFileSync(join(dir, 'song.chordpro'), '{title: Song}\n[G]hey\n')
  writeFileSync(join(dir, 'readme.md'), 'nope')
  mkdirSync(join(dir, 'nested'))
  return dir
}

describe('preview catalog', () => {
  it('returns null on 204', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 204 }))
    expect(await fetchPreviewCatalog(fetcher as unknown as typeof fetch)).toBeNull()
  })

  it('returns null when files is empty', async () => {
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify({ files: [] }), { status: 200 }),
    )
    expect(await fetchPreviewCatalog(fetcher as unknown as typeof fetch)).toBeNull()
  })

  it('maps catalog ids to sources', async () => {
    const payload = {
      files: [
        { id: 'ao-olhar', name: 'Ao-olhar-pra-cruz.txt', source: '{title: A}\n' },
        { id: 'song', name: 'song.chordpro', source: '{title: S}\n' },
      ],
    }
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify(payload), { status: 200 }),
    )
    const catalog = await fetchPreviewCatalog(fetcher as unknown as typeof fetch)
    expect(catalogToFixtures(catalog!)).toEqual({
      'ao-olhar': '{title: A}\n',
      song: '{title: S}\n',
    })
  })
})

describe('preview plugin', () => {
  it('lists txt and chordpro, skips other files', () => {
    const dir = tmpCharts()
    const files = listPreviewFiles(dir)
    const names = files.map((f) => f.name).sort()
    expect(names).toEqual(['Ao-olhar-pra-cruz.txt', 'song.chordpro'])
    expect(files.find((f) => f.id === 'Ao-olhar-pra-cruz')?.source).toContain('{title: Ao olhar')
  })

  it('writes JSON for GET /__titan_preview', () => {
    const dir = tmpCharts()
    const chunks: Buffer[] = []
    const res = {
      statusCode: 0,
      headers: {} as Record<string, string>,
      setHeader(k: string, v: string) {
        this.headers[k] = v
      },
      end(body?: string | Buffer) {
        if (body) chunks.push(Buffer.from(body))
      },
    }
    const req = { url: '/__titan_preview' }
    let nextCalled = false
    handlePreviewRequest(dir)(
      req as IncomingMessage,
      res as unknown as ServerResponse,
      () => {
        nextCalled = true
      },
    )
    expect(nextCalled).toBe(false)
    expect(res.headers['Content-Type']).toMatch(/json/)
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
      files: { id: string }[]
    }
    expect(body.files).toHaveLength(2)
  })

  it('204 when dir is unset', () => {
    const res = {
      statusCode: 0,
      end() {},
    }
    handlePreviewRequest(undefined)(
      { url: '/__titan_preview' } as IncomingMessage,
      res as unknown as ServerResponse,
      () => {
        throw new Error('should not next')
      },
    )
    expect(res.statusCode).toBe(204)
  })

  it('refuses a fetch that is not Cifra Club', () => {
    const res = { statusCode: 0, end() {} }
    let next = false
    handleCifraFetch(
      { url: '/__cifra_fetch?url=https://example.com/x' } as IncomingMessage,
      res as unknown as ServerResponse,
      () => {
        next = true
      },
    )
    expect(next).toBe(false)
    expect(res.statusCode).toBe(400)
  })

  it('returns chart HTML when the Cifra Club page is denied', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('api.cifraclub.com.br')) {
        return new Response(
          JSON.stringify({
            stdShapeKey: 'Em',
            capo: 2,
            music: { name: 'Wonderwall' },
            artist: { name: 'Oasis' },
            content: '<b>Em7</b>\nUma letra qualquer\n',
          }),
          { status: 200 },
        )
      }
      return new Response('<TITLE>Access Denied</TITLE>', { status: 403 })
    })
    vi.stubGlobal('fetch', fetchMock)
    try {
      const res = await new Promise<{ statusCode: number; body: string }>((resolve) => {
        const out = {
          statusCode: 0,
          setHeader() {},
          end(body?: string) {
            resolve({ statusCode: out.statusCode, body: body ?? '' })
          },
        }
        handleCifraFetch(
          {
            url:
              '/__cifra_fetch?url=' +
              encodeURIComponent('https://www.cifraclub.com.br/oasis/wonderwall/'),
          } as IncomingMessage,
          out as unknown as ServerResponse,
          () => {
            throw new Error('next')
          },
        )
      })
      expect(res.statusCode).toBe(200)
      expect(res.body).toContain('chord-tone">Em<')
      expect(res.body).toContain('<b>Em7</b>')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
