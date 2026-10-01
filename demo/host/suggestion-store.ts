import type { Suggestion } from '@henryavila/titan-chordpro-ui'

/** Browser-only stand-in for the consumer's suggestions API. Shared by demo tabs. */
export const DEMO_SUGGESTIONS_KEY = 'cpv:sug'
export const demoOfficialKey = (songId: string) => `cpv:demo:official:${songId}`

export function readDemoSuggestions(): Suggestion[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(DEMO_SUGGESTIONS_KEY) || '[]')
    return Array.isArray(value) ? value as Suggestion[] : []
  } catch { return [] }
}

export function writeDemoSuggestions(queue: Suggestion[]): void {
  // A real consumer performs this write in its backend. The demo deliberately
  // lets quota/storage errors reject persistSuggestion instead of claiming sent.
  localStorage.setItem(DEMO_SUGGESTIONS_KEY, JSON.stringify(queue))
}

export async function persistDemoSuggestion(suggestion: Suggestion): Promise<void> {
  const queue = readDemoSuggestions()
  writeDemoSuggestions([...queue.filter((item) => item.id !== suggestion.id), suggestion])
}

export function readDemoOfficial(songId: string): string | null {
  try { return localStorage.getItem(demoOfficialKey(songId)) } catch { return null }
}

export function writeDemoOfficial(songId: string, source: string): void {
  localStorage.setItem(demoOfficialKey(songId), source)
}
