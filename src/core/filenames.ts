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
