function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function keyPart(key: string | null): string {
  if (!key) return ''
  return key.toLowerCase().replace(/[^a-z0-9#b]/g, '')
}

export function buildChoFilename(title: string, key: string | null): string {
  const slug = slugify(title)
  const suffix = key ? `-${keyPart(key)}` : ''
  return `${slug}${suffix}.cho`
}

export function buildPdfFilename(title: string, key: string | null): string {
  const slug = slugify(title)
  const suffix = key ? `-tom-${keyPart(key)}` : ''
  return `cifra-${slug}${suffix}.pdf`
}

export function buildSljaFilename(title: string): string {
  const slug = slugify(title) || 'cifra'
  return `slides-${slug}.slja`
}

export function buildPpsxFilename(title: string): string {
  const slug = slugify(title) || 'cifra'
  return `slides-${slug}.ppsx`
}

const SCORE_EXT = /^(gp[345]?|gpx|xml|musicxml|mxl)$/i
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

function scoreExtension(src: string, contentType?: string): string {
  const path = src.split(/[?#]/)[0] ?? ''
  const fromPath = path.match(/\.([a-z0-9]+)$/i)?.[1]
  if (fromPath && SCORE_EXT.test(fromPath)) return fromPath.toLowerCase()
  const mime = (contentType ?? '').split(';')[0]?.trim().toLowerCase() ?? ''
  if (mime === 'application/vnd.recordare.musicxml+xml') return 'musicxml'
  if (mime === 'application/vnd.recordare.musicxml') return 'mxl'
  if (mime === 'application/xml' || mime === 'text/xml') return 'xml'
  return 'gp'
}

/** File stem for a Guitar Pro/MusicXML download: the Titan block name, filesystem-safe. */
export function scoreFilenameStem(name: string | undefined): string {
  let stem = (name ?? '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '')
  if (stem.length > 120) stem = stem.slice(0, 120).trim().replace(/[. ]+$/g, '')
  if (!stem || WINDOWS_RESERVED.test(stem)) return stem ? `_${stem}` : 'Solo'
  return stem
}

/** Original notation file named after the Titan block, with the source extension. */
export function buildScoreFilename(name: string | undefined, src: string, contentType?: string): string {
  return `${scoreFilenameStem(name)}.${scoreExtension(src, contentType)}`
}
