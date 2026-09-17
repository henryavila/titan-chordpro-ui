/**
 * Eager corpus chunk — dynamically imported when the demo needs every chart
 * (setlist, or a `?song=` that is not the seed). Keep this off the first paint.
 */
const bundledRaw = import.meta.glob('../../fixtures/sda/*.{cho,chordpro,onsong}', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

function idFromPath(path: string): string {
  const base = path.split('/').pop() ?? path
  return base.replace(/\.(cho|chordpro|onsong)$/i, '')
}

export function allFixtures(): Record<string, string> {
  return {
    ...Object.fromEntries(
      Object.entries(bundledRaw).map(([path, src]) => [idFromPath(path), src]),
    ),
    vazio: '',
  }
}
