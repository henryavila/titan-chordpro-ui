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

function chartPart(chartId?: string): string {
  if (!chartId || chartId === 'default') return ''
  const slug = slugify(chartId)
  return slug ? `-${slug}` : ''
}

export function buildChoFilename(title: string, key: string | null, chartId?: string): string {
  const slug = slugify(title)
  const suffix = key ? `-${keyPart(key)}` : ''
  return `${slug}${chartPart(chartId)}${suffix}.cho`
}

export function buildPdfFilename(title: string, key: string | null, chartId?: string): string {
  const slug = slugify(title)
  const chart = chartId && chartId !== 'default' ? `-${slugify(chartId)}` : ''
  const suffix = key ? `-tom-${keyPart(key)}` : ''
  return `cifra-${slug}${chart}${suffix}.pdf`
}

export function buildSljaFilename(title: string, chartId?: string): string {
  const slug = slugify(title) || 'cifra'
  return `slides-${slug}${chartPart(chartId)}.slja`
}
