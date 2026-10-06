/**
 * The editor owns the keyboard while it is open. Ctrl/Cmd/Alt return before
 * stopPropagation, except undo, so the chart behind the modal can still see
 * those chords. Every other key is swallowed here.
 */
export function applyScoreKey(
  e: KeyboardEvent,
  guitar: boolean,
  act: {
    undo: () => void
    discard: () => void
    digit: (key: string) => void
    move: (delta: number) => void
    nudge: (delta: number) => void
    del: () => void
    togglePlay: () => void
  },
) {
  const t = e.target as HTMLElement | null
  if (t && (/^(input|textarea)$/i.test(t.tagName) || t.isContentEditable)) return
  if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
    act.undo()
    e.preventDefault()
    return
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return
  e.stopPropagation()
  if (e.key === 'Escape') {
    act.discard()
    e.preventDefault()
    return
  }
  if (guitar && /^[0-9]$/.test(e.key)) {
    act.digit(e.key)
    e.preventDefault()
    return
  }
  if (e.key === 'ArrowLeft') {
    act.move(-1)
    e.preventDefault()
  } else if (e.key === 'ArrowRight') {
    act.move(1)
    e.preventDefault()
  } else if (e.key === 'ArrowUp') {
    act.nudge(1)
    e.preventDefault()
  } else if (e.key === 'ArrowDown') {
    act.nudge(-1)
    e.preventDefault()
  } else if (e.key === 'Backspace') {
    act.del()
    e.preventDefault()
  } else if (e.key === ' ') {
    act.togglePlay()
    e.preventDefault()
  }
}
