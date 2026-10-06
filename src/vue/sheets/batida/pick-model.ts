import type { StrumSlot } from '@henryavila/titan-chordpro-ui'

const ESS_LABEL: Record<string, string> = {
  normal: 'Normal',
  accent: 'Acento',
  mute: 'Mute',
  muted: 'Abafada',
}

const ESS_ORDER = ['normal', 'accent', 'mute', 'muted'] as const

export type PickColumn = {
  dir: 'down' | 'up'
  label: string
  hits: StrumSlot[]
  ghost: StrumSlot | null
}

export type PickBoard = {
  singleDir: boolean
  /** Null when the picker is locked to one hand direction. */
  dualColumns: PickColumn[] | null
  singleHits: StrumSlot[]
  singleGhost: StrumSlot | null
}

export function isSingleDir(choices: StrumSlot[]): boolean {
  const dirs = new Set(choices.map((c) => c.dir).filter(Boolean))
  return dirs.size === 1
}

/** Primary mark — same vocabulary as StrumStrip. */
export function pickGlyph(s: StrumSlot): string {
  if (s.dir == null) return '·'
  if (s.contact === 'ghost') return s.dir === 'up' ? '↑' : '↓'
  if (s.essence === 'muted') return '×'
  if (s.dir === 'up') return '↑'
  if (s.dir === 'down') return '↓'
  return '·'
}

/** Secondary copy — no arrow (the tile already shows direction). */
export function pickLabel(s: StrumSlot): string {
  if (s.contact === 'ghost') return 'Passa'
  return ESS_LABEL[s.essence ?? 'normal'] ?? 'Normal'
}

export function pickDirWord(s: StrumSlot): string {
  if (s.dir == null) return ''
  return s.dir === 'up' ? 'cima' : 'baixo'
}

export function pickToneClass(s: StrumSlot): string {
  if (s.dir == null) return 'is-empty'
  if (s.contact === 'ghost') return 'is-ghost'
  if (s.essence === 'accent') return 'is-accent'
  if (s.essence === 'mute') return 'is-mute'
  if (s.essence === 'muted') return 'is-muted'
  return 'is-hit'
}

export function pickAria(s: StrumSlot): string {
  if (s.contact === 'ghost') return `Passa ${pickDirWord(s)}`
  return `${pickLabel(s)} ${pickDirWord(s)}`
}

export function pickTitleHint(dirHint: string | undefined, choices: StrumSlot[]): string {
  if (dirHint) return dirHint
  if (isSingleDir(choices)) {
    const d = choices[0]?.dir
    return d === 'up' ? 'só ↑' : d === 'down' ? 'só ↓' : ''
  }
  return 'Defina o sentido'
}

/** Dual-dir: one column per hand direction (baixo | cima). Single-dir: flat hit list. */
export function pickBoard(choices: StrumSlot[]): PickBoard {
  const hits = choices.filter((c) => c.contact === 'hit')
  const ghosts = choices.filter((c) => c.contact === 'ghost')
  const singleDir = isSingleDir(choices)
  if (singleDir) {
    return {
      singleDir,
      dualColumns: null,
      singleHits: ESS_ORDER.map((e) => hits.find((h) => h.essence === e)).filter(
        (h): h is StrumSlot => !!h,
      ),
      singleGhost: ghosts[0] ?? null,
    }
  }
  return {
    singleDir,
    dualColumns: (['down', 'up'] as const).map((dir) => ({
      dir,
      label: dir === 'down' ? 'Baixo' : 'Cima',
      hits: ESS_ORDER.map((e) => hits.find((h) => h.dir === dir && h.essence === e)).filter(
        (h): h is StrumSlot => !!h,
      ),
      ghost: ghosts.find((g) => g.dir === dir) ?? null,
    })),
    singleHits: [],
    singleGhost: null,
  }
}
