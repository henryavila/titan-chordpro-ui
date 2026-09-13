/** Shared by Pages Functions — keep tiny; do not import the Vue/core package. */

export const UA = 'Mozilla/5.0 (compatible; titan-chordpro-ui)'

const CIFRA_HOSTS = new Set(['cifraclub.com.br', 'www.cifraclub.com.br'])

export function cifraOk(url: string): boolean {
  try {
    return CIFRA_HOSTS.has(new URL(url).hostname)
  } catch {
    return false
  }
}

export const YT_ID = /^[A-Za-z0-9_-]{11}$/

export function corsHeaders(origin: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin && origin !== 'null' ? origin : '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    Vary: 'Origin',
  }
}
