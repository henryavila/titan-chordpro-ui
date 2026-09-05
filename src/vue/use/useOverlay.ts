import { computed, ref, type Ref } from 'vue'
import {
  absorbInto,
  applyOps,
  checkUpdate,
  diffOps,
  isTuneOp,
  opCtxNote,
  opLabel,
  overlaid,
  overlayKey,
  STORE_KEYS,
  tuneText,
  readStoredJson as readStored,
  writeStoredJson as writeStored,
} from 'titan-chordpro-ui'
import type { ChartStore, Overlay, OverlayOp, ReadingCtx, Suggestion, TuneOp } from 'titan-chordpro-ui'
import type { WriteMode } from '../public'

export type { ModesProp, WriteMode } from '../public'

export type OverlayOpts = {
  songId: Ref<string>
  version: Ref<string>
  /** The chart as the host handed it. */
  hostSource: Ref<string>
  title: Ref<string>
  /** Sending suggestions is a host capability, not a reader preference. */
  suggestions: Ref<boolean>
  toast: (msg: string) => void
  /** Where the overlay and the queue are kept — the host's call, not ours. */
  store: ChartStore
  /** The base text changed under the reader: the editor has to re-baseline. */
  onBaseChange: () => void
  onSaveContent?: (text: string) => void
}

export type OpCard = {
  id: string
  label: string
  note: string
  from: string
  to: string
}

export type UpdCard = {
  id: string
  label: string
  on: boolean
  conflict: boolean
  why: string
  mine: string
  theirs: string
}

export type QueueRow = { key: string; label: string; hint: string }
export type QueueOpCard = OpCard & { fits: boolean; warn: string }

type UpdatePlan = NonNullable<ReturnType<typeof checkUpdate>>

const SUG_KEY = STORE_KEYS.suggestions

/**
 * The reader's own version of a chart, and the queue of adjustments they can
 * send to whoever owns it. Storage is the phone: an overlay never travels
 * unless the musician asks for it.
 */
export function useOverlay(opts: OverlayOpts) {
  /** Every read in here goes through the host's store, never the browser's. */
  const readJson = <T,>(key: string, fallback: T): T => readStored(opts.store, key, fallback)

  const overlay = ref<Overlay | null>(null)
  const showOriginal = ref(false)
  const myPanel = ref(false)
  const updDlg = ref<UpdatePlan | null>(null)
  /** Bumped on every write to the suggestion store, so the lists recompute. */
  const sugTick = ref(0)
  const officialSrc = ref<string | null>(null)
  const officialV = ref<string | null>(null)
  const exportOrig = ref(false)
  const confirmRevert = ref(false)
  const route = ref<'song' | 'queue'>('song')
  const qSong = ref<string | null>(null)
  const qSug = ref<string | null>(null)
  let revertT = 0

  // Official = what the consumer's database holds: the host source until a
  // "for everyone" save takes over from here on.
  const official = computed(() => officialSrc.value ?? opts.hostSource.value ?? '')
  const officialVersion = computed(() => officialV.value || opts.version.value || 'v1')
  const ovKey = computed(() => overlayKey(opts.songId.value))

  const applied = computed(() => overlaid(official.value, overlay.value))
  /** Line index → id of the op that put it there, in the text being read. */
  const mineLines = computed(() => (showOriginal.value ? null : applied.value.mine))
  const ovFailedCount = computed(() => (showOriginal.value ? 0 : applied.value.failed.length))
  const hasOverlay = computed(() => !!overlay.value?.ops.length)
  const mineCount = computed(() => overlay.value?.ops.length ?? 0)
  const mineLabel = computed(
    () => `Minha versão · ${mineCount.value} ${mineCount.value === 1 ? 'ajuste' : 'ajustes'}`,
  )

  /**
   * The screen's base: "for everyone" and reading the original see the raw
   * official text; reading and local editing see it with the overlay applied.
   */
  function baseFor(wMode: WriteMode | null): string {
    if (wMode === 'content' || showOriginal.value) return official.value
    return applied.value.text
  }

  function putOverlay(next: Overlay | null): Overlay | null {
    // Denied or failing storage is not the reader's problem: the overlay stays
    // live for this session either way.
    if (next) writeStored(opts.store, ovKey.value, next)
    else {
      try {
        opts.store.remove(ovKey.value)
      } catch {
        /* the host's own failure stays with the host */
      }
    }
    return next
  }

  function saveOverlay(next: Overlay | null) {
    const keep = next && next.ops.length ? next : null
    putOverlay(keep)
    overlay.value = keep
    opts.onBaseChange()
  }

  /**
   * Reading a chart: adopt what was stored, drop what the official text has
   * since absorbed, and ask before reapplying anything onto a new version.
   */
  function load(): TuneOp | null {
    let ov = readJson<Overlay | null>(ovKey.value, null)
    if (!ov || !Array.isArray(ov.ops) || !ov.ops.length) ov = null
    const base = official.value

    const abs = absorbInto(ov, base, officialVersion.value)
    if (abs.absorbed) ov = putOverlay(abs.overlay)

    const upd = checkUpdate(ov, base, officialVersion.value)
    // Nothing of ours moved: silently follow the new version.
    if (!upd && ov && ov.baseVersion !== officialVersion.value) {
      ov = putOverlay({ ...ov, baseVersion: officialVersion.value })
    }
    overlay.value = ov
    updDlg.value = upd
    showOriginal.value = false

    if (abs.absorbed && !upd) {
      const n = abs.absorbed
      window.setTimeout(
        () =>
          opts.toast(
            n === 1 ? 'Um dos seus ajustes virou oficial' : `${n} dos seus ajustes viraram oficiais`,
          ),
        30,
      )
    }
    if (upd) return null
    return (ov?.ops.find(isTuneOp) as TuneOp | undefined) ?? null
  }

  /** A local edit saves itself: it is the musician's phone, there is no "save". */
  function commitLocalFrom(text: string, ctx: ReadingCtx) {
    const tune = (overlay.value?.ops ?? []).filter(isTuneOp)
    const ops: OverlayOp[] = [...tune, ...diffOps(official.value, text, ctx)]
    saveOverlay({ baseVersion: officialVersion.value, ops, at: Date.now() })
  }

  const opList = computed<OpCard[]>(() =>
    (overlay.value?.ops ?? []).map((op) => ({
      id: op.id,
      label: opLabel(op),
      note: opCtxNote(op),
      from: isTuneOp(op) || op.type === 'insert' ? '' : op.before.join(' / ').slice(0, 70),
      to: isTuneOp(op) ? tuneText(op) : op.type === 'delete' ? '' : op.after.join(' / ').slice(0, 70),
    })),
  )

  function revertOp(id: string) {
    if (!overlay.value) return
    const ops = overlay.value.ops.filter((o) => o.id !== id)
    saveOverlay({ baseVersion: officialVersion.value, ops, at: Date.now() })
    opts.toast('Ajuste revertido ao original')
  }

  /** The dot on a personalised line: straight to reverting that stretch. */
  function revertLine(li: number) {
    const id = mineLines.value?.get(li)
    if (id) revertOp(id)
  }

  const revertAllLabel = computed(() =>
    confirmRevert.value ? 'Confirmar — descartar tudo' : 'Voltar ao original',
  )

  function revertAll() {
    if (!confirmRevert.value) {
      confirmRevert.value = true
      window.clearTimeout(revertT)
      revertT = window.setTimeout(() => (confirmRevert.value = false), 4000)
      return
    }
    window.clearTimeout(revertT)
    confirmRevert.value = false
    saveOverlay(null)
    myPanel.value = false
    showOriginal.value = false
    opts.toast('Sua versão foi descartada — de volta ao original')
  }

  function closeMy() {
    confirmRevert.value = false
    myPanel.value = false
  }

  /** Pin the key and capo the reader arrived at, so the chart opens there. */
  function fixTune(transpose: number, capo: number, dual: boolean) {
    const rest = (overlay.value?.ops ?? []).filter((o) => !isTuneOp(o))
    if (!transpose && !capo) {
      saveOverlay(
        rest.length ? { baseVersion: officialVersion.value, ops: rest, at: Date.now() } : null,
      )
      opts.toast('Tom fixo removido')
      return
    }
    const op: TuneOp = {
      id: 'tune',
      type: 'tune',
      transpose,
      capo,
      dual: !!(capo && dual),
      ctx: { transpose, capo },
    }
    saveOverlay({ baseVersion: officialVersion.value, ops: [...rest, op], at: Date.now() })
    opts.toast('Tom e capo fixados nesta cifra')
  }

  // ------------------------------------------------- the official text moved

  const updItems = computed<UpdCard[]>(() => {
    const d = updDlg.value
    if (!d) return []
    return d.items.map((it) => ({
      id: it.id,
      label: it.label,
      on: !!d.pick[it.id],
      conflict: it.conflict,
      why: it.ok ? it.note : 'A linha oficial mudou aqui — escolha qual fica',
      mine: it.mine,
      theirs: it.theirs,
    }))
  })

  function togglePick(id: string) {
    const d = updDlg.value
    if (!d) return
    updDlg.value = { items: d.items, pick: { ...d.pick, [id]: !d.pick[id] } }
  }

  function updKeep() {
    const d = updDlg.value
    if (!d) return
    const ops = d.items.filter((it) => d.pick[it.id]).map((it) => it.op)
    saveOverlay(ops.length ? { baseVersion: officialVersion.value, ops, at: Date.now() } : null)
    updDlg.value = null
    opts.toast(ops.length ? 'Ajustes reaplicados na versão nova' : 'Você está na versão nova')
  }

  function updAdopt() {
    saveOverlay(null)
    updDlg.value = null
    showOriginal.value = false
    opts.toast('Versão nova adotada')
  }

  // ------------------------------------------------------------ suggestions

  function allSug(): Suggestion[] {
    sugTick.value
    return readJson<Suggestion[]>(SUG_KEY, [])
  }

  function writeSug(list: Suggestion[]) {
    writeStored(opts.store, SUG_KEY, list)
    sugTick.value += 1
  }

  const canSuggest = computed(() => hasOverlay.value && opts.suggestions.value)

  function suggest() {
    const ov = overlay.value
    if (!ov?.ops.length) return
    writeSug([
      ...allSug(),
      {
        id: `s${Date.now()}`,
        songId: opts.songId.value,
        title: opts.title.value || opts.songId.value,
        at: Date.now(),
        baseVersion: officialVersion.value,
        ops: ov.ops,
      },
    ])
    myPanel.value = false
    opts.toast('Sugestão enviada')
  }

  // ----------------------------- the owner's queue: songs → requests → ops

  const pendingCount = computed(() => allSug().length)
  const queueOpen = computed(() => route.value === 'queue')

  function openQueue() {
    route.value = 'queue'
    qSong.value = null
    qSug.value = null
    myPanel.value = false
  }
  function closeQueue() {
    route.value = 'song'
    qSong.value = null
    qSug.value = null
  }
  function qBack() {
    if (qSug.value) qSug.value = null
    else qSong.value = null
  }

  const qSongs = computed<QueueRow[]>(() => {
    const by = new Map<string, { title: string; pedidos: number; ajustes: number }>()
    for (const s of allSug()) {
      const e = by.get(s.songId) ?? { title: s.title, pedidos: 0, ajustes: 0 }
      e.pedidos += 1
      e.ajustes += s.ops.length
      by.set(s.songId, e)
    }
    return [...by.entries()].map(([key, e]) => ({
      key,
      label: e.title,
      hint: `${e.pedidos} ${e.pedidos === 1 ? 'pedido' : 'pedidos'} · ${e.ajustes} ${e.ajustes === 1 ? 'ajuste' : 'ajustes'}`,
    }))
  })

  const qSugs = computed<QueueRow[]>(() => {
    const id = qSong.value
    if (!id) return []
    return allSug()
      .filter((s) => s.songId === id)
      .map((s) => ({
        key: s.id,
        label: new Date(s.at).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
        hint: `${s.ops.length} ${s.ops.length === 1 ? 'ajuste' : 'ajustes'} · base ${s.baseVersion}`,
      }))
  })

  const qOps = computed<QueueOpCard[]>(() => {
    const s = allSug().find((x) => x.id === qSug.value)
    if (!s) return []
    const off = official.value
    return s.ops.map((op) => {
      const fits = !applyOps(off, [op]).failed.length
      return {
        id: op.id,
        label: opLabel(op),
        note: opCtxNote(op),
        from: isTuneOp(op) || op.type === 'insert' ? '—' : op.before.join(' / ').slice(0, 90),
        to: isTuneOp(op)
          ? tuneText(op)
          : op.type === 'delete'
            ? '—'
            : op.after.join(' / ').slice(0, 90),
        fits,
        warn: fits ? '' : 'Não encaixa mais na cifra atual',
      }
    })
  })

  const qTitle = computed(() =>
    qSug.value ? 'Ajustes do pedido' : qSong.value ? 'Pedidos desta cifra' : 'Cifras com pedidos',
  )

  function dropSugOp(sugId: string, opId: string) {
    const list = allSug()
    const s = list.find((x) => x.id === sugId)
    if (!s) return
    const rest = s.ops.filter((o) => o.id !== opId)
    writeSug(
      rest.length
        ? list.map((x) => (x.id === sugId ? { ...x, ops: rest } : x))
        : list.filter((x) => x.id !== sugId),
    )
    if (!rest.length) qSug.value = null
  }

  /**
   * Accepting writes the official text and bumps the version: anyone holding an
   * overlay meets the update dialog on their next read.
   */
  function acceptOp(opId: string) {
    const sugId = qSug.value
    if (!sugId) return
    const s = allSug().find((x) => x.id === sugId)
    const op = s?.ops.find((o) => o.id === opId)
    if (!op) return
    const r = applyOps(official.value, [op])
    if (r.failed.length) {
      opts.toast('Este ajuste não encaixa mais na cifra atual')
      return
    }
    dropSugOp(sugId, opId)
    opts.toast('Aceito — já vale para todos')
    // The official text just moved under this reader too: reconcile now
    // instead of leaving a stale op to fail silently until the next load.
    if (!isTuneOp(op)) setOfficial(r.text, true)
  }

  function refuseOp(opId: string) {
    if (!qSug.value) return
    dropSugOp(qSug.value, opId)
    opts.toast('Recusado')
  }

  function setOfficial(text: string, reconcile = false) {
    officialSrc.value = text
    officialV.value = `v${Date.now().toString(36)}`
    if (opts.onSaveContent) {
      try {
        opts.onSaveContent(text)
      } catch {
        /* the host's own failure is not the reader's problem */
      }
    }
    // A save from inside the editor keeps the draft: only a change that came
    // from elsewhere re-reads what the reader still holds over it.
    if (reconcile) load()
    opts.onBaseChange()
  }

  /** A new chart arrived: everything held about the previous one goes. */
  function reset() {
    officialSrc.value = null
    officialV.value = null
    overlay.value = null
    updDlg.value = null
    showOriginal.value = false
    myPanel.value = false
    exportOrig.value = false
    confirmRevert.value = false
    closeQueue()
  }

  function dispose() {
    window.clearTimeout(revertT)
  }

  return {
    overlay,
    official,
    officialVersion,
    officialSrc,
    baseFor,
    applied,
    mineLines,
    ovFailedCount,
    hasOverlay,
    mineCount,
    mineLabel,
    showOriginal,
    myPanel,
    closeMy,
    opList,
    revertOp,
    revertLine,
    revertAll,
    revertAllLabel,
    fixTune,
    load,
    saveOverlay,
    commitLocalFrom,
    updDlg,
    updItems,
    togglePick,
    updKeep,
    updAdopt,
    canSuggest,
    suggest,
    pendingCount,
    queueOpen,
    openQueue,
    closeQueue,
    qBack,
    qSong,
    qSug,
    qSongs,
    qSugs,
    qOps,
    qTitle,
    acceptOp,
    refuseOp,
    setOfficial,
    exportOrig,
    reset,
    dispose,
  }
}
