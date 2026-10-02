/**
 * Open and close of a tab or score region.
 * `key` is already lower case — callers fold it before they ask.
 */
export type NotationEdge = 'tab-open' | 'tab-close' | 'score-open' | 'score-close'

export function notationEdge(key: string): NotationEdge | null {
  if (key === 'sot' || key === 'start_of_tab') return 'tab-open'
  if (key === 'eot' || key === 'end_of_tab') return 'tab-close'
  if (key === 'x_titan_start_of_score') return 'score-open'
  if (key === 'x_titan_end_of_score') return 'score-close'
  return null
}
