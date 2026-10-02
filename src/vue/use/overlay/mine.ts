import { diffOps, isTuneOp, opCtxNote, opLabel, tuneText } from '@henryavila/titan-chordpro-ui'
import type { Overlay, OverlayOp, ReadingCtx, TuneOp } from '@henryavila/titan-chordpro-ui'
import type { WriteMode } from '../../public'

export type OpCard = {
  id: string
  label: string
  note: string
  from: string
  to: string
}

export function readingBase(
  wMode: WriteMode | null,
  showOriginal: boolean,
  official: string,
  applied: string,
): string {
  if (wMode === 'persisted' || showOriginal) return official
  return applied
}

export function mineVersionLabel(count: number): string {
  return `Minha versão · ${count} ${count === 1 ? 'ajuste' : 'ajustes'}`
}

export function revertAllButtonLabel(confirming: boolean): string {
  return confirming ? 'Confirmar — descartar tudo' : 'Voltar ao original'
}

export function opCards(ops: OverlayOp[]): OpCard[] {
  return ops.map((op) => ({
    id: op.id,
    label: opLabel(op),
    note: opCtxNote(op),
    from: isTuneOp(op) || op.type === 'insert' ? '' : op.before.join(' / ').slice(0, 70),
    to: isTuneOp(op) ? tuneText(op) : op.type === 'delete' ? '' : op.after.join(' / ').slice(0, 70),
  }))
}

/** A local edit saves itself: it is the musician's phone, there is no "save". */
export function commitLocalOverlay(deps: {
  existing: Overlay | null
  official: string
  text: string
  ctx: ReadingCtx
  version: string
  save: (next: Overlay | null) => void
}): void {
  const tune = (deps.existing?.ops ?? []).filter(isTuneOp)
  const ops: OverlayOp[] = [...tune, ...diffOps(deps.official, deps.text, deps.ctx)]
  deps.save({ baseVersion: deps.version, ops, at: Date.now() })
}

export function revertOverlayOp(deps: {
  sending: boolean
  existing: Overlay | null
  id: string
  version: string
  save: (next: Overlay | null) => void
  toast: (msg: string) => void
}): void {
  if (deps.sending) return
  if (!deps.existing) return
  const ops = deps.existing.ops.filter((o) => o.id !== deps.id)
  deps.save({ baseVersion: deps.version, ops, at: Date.now() })
  deps.toast('Ajuste revertido ao original')
}

export function revertEveryOp(deps: {
  sending: boolean
  confirming: boolean
  arm: () => void
  disarm: () => void
  save: (next: Overlay | null) => void
  closePanel: () => void
  showOriginal: (next: boolean) => void
  toast: (msg: string) => void
}): void {
  if (deps.sending) return
  if (!deps.confirming) {
    deps.arm()
    return
  }
  deps.disarm()
  deps.save(null)
  deps.closePanel()
  deps.showOriginal(false)
  deps.toast('Sua versão foi descartada — de volta ao original')
}

/** Pin the key and capo the reader arrived at, so the chart opens there. */
export function fixTuneOp(deps: {
  existing: Overlay | null
  version: string
  transpose: number
  capo: number
  dual: boolean
  save: (next: Overlay | null) => void
  toast: (msg: string) => void
}): void {
  const rest = (deps.existing?.ops ?? []).filter((o) => !isTuneOp(o))
  if (!deps.transpose && !deps.capo) {
    deps.save(rest.length ? { baseVersion: deps.version, ops: rest, at: Date.now() } : null)
    deps.toast('Tom fixo removido')
    return
  }
  const op: TuneOp = {
    id: 'tune',
    type: 'tune',
    transpose: deps.transpose,
    capo: deps.capo,
    dual: !!(deps.capo && deps.dual),
    ctx: { transpose: deps.transpose, capo: deps.capo },
  }
  deps.save({ baseVersion: deps.version, ops: [...rest, op], at: Date.now() })
  deps.toast('Tom e capo fixados nesta cifra')
}
