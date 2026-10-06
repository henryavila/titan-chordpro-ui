/**
 * Página pública do Cifra Club muitas vezes responde 403.
 * `fetchChart` continua recebendo HTML. Isto monta a página mínima que
 * `fromCifraClubHtml` já lê, a partir do JSON de `/v3/version/`.
 * O tom da página é `stdShapeKey` — não `key`.
 */

const HOSTS = new Set(['cifraclub.com.br', 'www.cifraclub.com.br'])
const SLUG = /^[a-z0-9-]+$/
const KEY = /^[A-G][#b]?m?$/
const YT = /^[A-Za-z0-9_-]{11}$/
const UA = 'Mozilla/5.0 (compatible; titan-chordpro-ui)'
const DENIED = /<title>\s*access denied\s*<\/title>/i

export function cifraClubSlugs(pageUrl: string): { artist: string; song: string } | null {
  try {
    const url = new URL(pageUrl)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    if (!HOSTS.has(url.hostname)) return null
    const parts = url.pathname.split('/').filter(Boolean).map((part) => {
      try {
        return decodeURIComponent(part).toLowerCase()
      } catch {
        return ''
      }
    })
    const artist = parts[0] ?? ''
    const song = parts[1] ?? ''
    if (!SLUG.test(artist) || !SLUG.test(song)) return null
    return { artist, song }
  } catch {
    return null
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function nameOf(value: unknown): string {
  if (!value || typeof value !== 'object' || !('name' in value)) return ''
  return text((value as { name: unknown }).name)
}

function strummingsOf(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return []
  const out: unknown[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const pattern = Array.isArray(row.pattern) ? row.pattern.map((n) => Number(n) || 0) : []
    if (!pattern.length) continue
    const sig = Array.isArray(row.time_signature)
      ? row.time_signature
      : Array.isArray(row.timeSignature)
        ? row.timeSignature
        : []
    const bpm = typeof row.bpm === 'number' ? row.bpm : Number(row.bpm) || null
    const section = text(row.section) || 'Padrão'
    out.push({
      timeSignature: sig.map(String),
      pattern,
      bpm,
      section,
    })
  }
  return out
}

function scriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

/** `null` quando não há `content` — não inventa uma cifra. */
export function cifraClubVersionToHtml(json: unknown): string | null {
  if (!json || typeof json !== 'object') return null
  const row = json as Record<string, unknown>
  const content = typeof row.content === 'string' ? row.content : ''
  if (!content.trim()) return null
  const key = text(row.stdShapeKey)
  const keyOk = KEY.test(key) ? key : ''
  const capoN = Number(row.capo)
  const capo = Number.isFinite(capoN) && capoN >= 0 ? Math.floor(capoN) : 0
  const youtubeId = text(row.youtubeId)
  const youtubeID = YT.test(youtubeId) ? youtubeId : ''
  const ld = scriptJson({
    '@type': 'MusicComposition',
    name: nameOf(row.music),
    byArtist: { name: nameOf(row.artist) },
  })
  const payload = scriptJson({
    config: { capo, keyShape: keyOk },
    metadata: youtubeID ? { youtubeID } : {},
    strummings: strummingsOf(row.strumming),
  })
  const tone = keyOk ? `<button data-anchor="--chord-tone">${keyOk}</button>` : ''
  return `<!DOCTYPE html><script type="application/ld+json">${ld}</script><script>${payload}</script>${tone}<pre>${content}</pre>`
}

export function pageLooksLikeChart(status: number, html: string): boolean {
  if (status < 200 || status >= 300) return false
  if (DENIED.test(html.slice(0, 1500))) return false
  if (/data-chord-content|data-chord-name\s*=/.test(html)) return true
  return /<pre\b/i.test(html) && /<b\b/i.test(html)
}

/**
 * Página quando ela é a cifra; senão o HTML montado da API de versão.
 * Não segue redirect da API. `null` se nenhum dos dois trouxer cifra.
 */
export async function loadCifraClubHtml(
  pageUrl: string,
  doFetch: typeof fetch = fetch,
): Promise<string | null> {
  const slugs = cifraClubSlugs(pageUrl)
  if (!slugs) return null
  try {
    const page = await doFetch(pageUrl, {
      headers: { accept: 'text/html', 'user-agent': UA },
      redirect: 'follow',
    })
    const html = await page.text()
    if (pageLooksLikeChart(page.status, html)) return html
  } catch {
    // página ilegível — tenta a API
  }
  try {
    const res = await doFetch(`https://api.cifraclub.com.br/v3/version/${slugs.artist}/${slugs.song}`, {
      headers: {
        accept: 'application/json',
        referer: 'https://www.cifraclub.com.br/',
        'user-agent': UA,
      },
      redirect: 'manual',
    })
    if (res.status < 200 || res.status >= 300) return null
    return cifraClubVersionToHtml(await res.json())
  } catch {
    return null
  }
}
