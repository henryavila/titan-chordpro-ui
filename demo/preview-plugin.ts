import { readdirSync, readFileSync, statSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { extname, join } from 'node:path'
import type { Plugin } from 'vite'
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
    },
  }
}
