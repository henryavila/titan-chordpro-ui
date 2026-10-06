import type { Overlay, OverlayOp } from '@henryavila/titan-chordpro-ui'
import type { UpdatePlan } from './persist'

export type UpdCard = {
  id: string
  label: string
  on: boolean
  conflict: boolean
  why: string
  mine: string
  theirs: string
}

export function updateCards(plan: UpdatePlan | null): UpdCard[] {
  if (!plan) return []
  return plan.items.map((it) => ({
    id: it.id,
    label: it.label,
    on: !!plan.pick[it.id],
    conflict: it.conflict,
    why: it.ok ? it.note : 'A linha oficial mudou aqui — escolha qual fica',
    mine: it.mine,
    theirs: it.theirs,
  }))
}

export function toggledUpdate(plan: UpdatePlan | null, id: string): UpdatePlan | null {
  if (!plan) return null
  return { items: plan.items, pick: { ...plan.pick, [id]: !plan.pick[id] } }
}

export function keepUpdateChoice(deps: {
  plan: UpdatePlan | null
  version: string
  save: (next: Overlay | null) => void
  clear: () => void
  toast: (msg: string) => void
}): void {
  const d = deps.plan
  if (!d) return
  const ops: OverlayOp[] = d.items.filter((it) => d.pick[it.id]).map((it) => it.op)
  deps.save(ops.length ? { baseVersion: deps.version, ops, at: Date.now() } : null)
  deps.clear()
  deps.toast(ops.length ? 'Ajustes reaplicados na versão nova' : 'Você está na versão nova')
}

export function adoptUpdateChoice(deps: {
  save: (next: Overlay | null) => void
  clear: () => void
  showOriginal: (next: boolean) => void
  toast: (msg: string) => void
}): void {
  deps.save(null)
  deps.clear()
  deps.showOriginal(false)
  deps.toast('Versão nova adotada')
}
