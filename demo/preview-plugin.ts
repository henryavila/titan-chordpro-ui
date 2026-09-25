import { readdirSync, readFileSync, statSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { extname, join } from 'node:path'
import type { Plugin } from 'vite'
import { loadCifraClubHtml } from '../src/core/cifraclub-api-html'
import { hostOk } from '../src/core/import-chordpro'
import type { PreviewFile } from './preview-catalog'

export const PREVIEW_EXTS = new Set([
  '.cho',
  '.chordpro',
  '.chopro',
  '.onsong',
  '.txt',
  '.pro',
  '.crd',
])

export function listPreviewFiles(dir: string): PreviewFile[] {
  const used = new Set<string>()
  const files: PreviewFile[] = []
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith('.')) continue
    const full = join(dir, name)
    if (!statSync(full).isFile()) continue
    const ext = extname(name).toLowerCase()
    if (!PREVIEW_EXTS.has(ext)) continue
    let id = name.slice(0, name.length - ext.length)
    if (used.has(id)) id = name
    used.add(id)
    files.push({ id, name, source: readFileSync(full, 'utf8') })
  }
  return files
}

export function handlePreviewRequest(dir: string | undefined) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void): void => {
    const path = (req.url ?? '').split('?')[0]
    if (path !== '/__titan_preview') {
      next()
      return
    }
    if (!dir) {
      res.statusCode = 204
      res.end()
      return
    }
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ files: listPreviewFiles(dir), dir }))
  }
}

/**
 * The browser cannot read cifraclub.com.br from the demo page. This is the
 * host backend the viewer asks for: HTML for convert(). The public page is
 * often 403; then the version API is turned into the same HTML shape.
 */
export function handleCifraFetch(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
): void {
  const raw = req.url ?? ''
  const path = raw.split('?')[0]
  if (path !== '/__cifra_fetch') {
    next()
    return
  }
  const target = new URL(raw, 'http://local').searchParams.get('url') ?? ''
  if (!hostOk(target)) {
    res.statusCode = 400
    res.end()
    return
  }
  void (async () => {
    try {
      const html = await loadCifraClubHtml(target)
      if (!html) {
        res.statusCode = 502
        res.end()
        return
      }
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(html)
    } catch {
      res.statusCode = 502
      res.end()
    }
  })()
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/

/**
 * Duration of a YouTube clip for `{duration:}` after a Cifra Club import.
 * The watch page carries lengthSeconds; the browser cannot fetch it itself.
 */
export function handleYoutubeDuration(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
): void {
  const raw = req.url ?? ''
  const path = raw.split('?')[0]
  if (path !== '/__youtube_duration') {
    next()
    return
  }
  const id = new URL(raw, 'http://local').searchParams.get('id') ?? ''
  if (!YT_ID.test(id)) {
    res.statusCode = 400
    res.end()
    return
  }
  void (async () => {
    try {
      const r = await fetch(`https://www.youtube.com/watch?v=${id}`, {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; titan-chordpro-ui)' },
      })
      const html = await r.text()
      res.statusCode = r.ok ? 200 : 502
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(html)
    } catch {
      res.statusCode = 502
      res.end()
    }
  })()
}

export function previewDirPlugin(dir = process.env.TITAN_PREVIEW_DIR): Plugin {
  return {
    name: 'titan-preview-dir',
    config(config) {
      if (!dir) return
      const server = config.server ?? {}
      const fs = server.fs ?? {}
      const allow = fs.allow ?? []
      config.server = { ...server, fs: { ...fs, allow: [...allow, dir] } }
    },
    configureServer(server) {
      server.middlewares.use(handlePreviewRequest(dir))
      server.middlewares.use(handleCifraFetch)
      server.middlewares.use(handleYoutubeDuration)
    },
  }
}
