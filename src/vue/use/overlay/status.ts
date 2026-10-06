import type { Suggestion, SuggestionStatus } from '@henryavila/titan-chordpro-ui'

export function sugStatus(s: Suggestion): SuggestionStatus {
  const open = s.ops.length
  const accepted = (s.resolvedOps ?? []).filter((o) => o.disposition === 'accepted').length
  const refused = (s.resolvedOps ?? []).filter((o) => o.disposition === 'refused').length
  if (open > 0) return accepted > 0 || refused > 0 ? 'partial' : 'pending'
  if (accepted > 0 && refused > 0) return 'partial'
  if (accepted > 0) return 'accepted'
  if (refused > 0) return 'refused'
  return 'pending'
}

export function isOpenForAdmin(s: Suggestion): boolean {
  const st = sugStatus(s)
  return st === 'pending' || (st === 'partial' && s.ops.length > 0)
}

export function openSuggestions(all: Suggestion[]): Suggestion[] {
  return all.filter(isOpenForAdmin)
}

export function suggestionsForReader(
  all: Suggestion[],
  songId: string,
  actorKey: string | undefined,
): Suggestion[] {
  return all.filter((s) => {
    if (s.songId !== songId) return false
    if (actorKey) return s.actorKey === actorKey
    return true
  })
}
