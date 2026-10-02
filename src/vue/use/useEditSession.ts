import { computed, ref, type Ref } from 'vue'
import {
  createSourceSession,
  normalizeSource,
  readMeta,
  type Lens,
  type ReadingCtx,
} from '@henryavila/titan-chordpro-ui'
import type { SongSpot } from './useSetlist'
import type { WriteMode } from '../public'

/**
 * Edit session around `createSourceSession`.
 *
 * Owns `lastSrc`. Publishing, saving and accepting a chart all write it here,
 * and `syncHostSource` reads it here. A second copy would treat the host's
 * echo as a new chart and drop tone, scroll and the draft.
 */
export type UseEditSessionOpts = {
  initialSource: string
  propMode: () => 'view' | 'edit'
  editSeen: () => boolean
  markEditSeen: () => void
  emitDirty: (value: boolean) => void
  emitSource: (value: string) => void
  emitSave: (value: string) => void
  emitMode: (value: 'view' | 'edit') => void
  toast: (msg: string) => void
  ov: () => {
    commitLocalFrom: (text: string, ctx: ReadingCtx) => void
    baseFor: (mode: WriteMode | null) => string
    setOfficial: (text: string) => void
    reset: () => void
    load: () => { transpose?: number; capo?: number; dual?: boolean } | null
    myPanel: Ref<boolean>
    showOriginal: Ref<boolean>
  }
  stopScroll: () => void
  met: () => { stop: () => void; loadBpm: () => void }
  offset: Ref<number>
  capo: Ref<number>
  capoMap: Ref<boolean>
  zen: Ref<boolean>
  lens: Ref<Lens>
  hideComments: Ref<boolean>
  metOpen: Ref<boolean>
  capoOpen: Ref<boolean>
  toneOpen: Ref<boolean>
  moreOpen: Ref<boolean>
  metaOpen: Ref<boolean>
  srcOpen: Ref<boolean>
  sheet: () => { value: boolean }
  pdf: () => { value: 'idle' | 'busy' | 'error' }
  slides: () => { value: 'idle' | 'busy' | 'error' }
  closeBatida: () => void
  exitEnsaioBatida: () => void
  beditReset: () => void
  clearScoreEditors: () => void
  hostSource: () => string
  setlist: () => { takeRestore: () => SongSpot | null; on: Ref<boolean> }
  initialCapo: () => number | undefined
  initialDual: () => boolean | undefined
  scroller: Ref<HTMLElement | null>
  mul: Ref<number>
  parkPlayhead: (u: number) => void
  canEditNow: () => boolean
  editModeResolved: () => 'local' | 'persisted' | 'none'
}

export function useEditSession(opts: UseEditSessionOpts) {
  const session = createSourceSession({ source: opts.initialSource })
  /** Working source: the draft while editing, the host source otherwise. */
  const working = ref(opts.initialSource)
  const rev = ref(0)
  let lastSrc: string | null = null
  const wMode = ref<WriteMode | null>(null)
  const localMode = ref<'view' | 'edit' | null>(null)
  const confirmDiscard = ref(false)
  /** Reading context at the moment the edit started — it travels with the ops. */
  let enterCtx: ReadingCtx = { transpose: 0, capo: 0 }
  let discardT = 0

  const mode = computed(() => localMode.value ?? opts.propMode())
  const isEdit = computed(() => mode.value === 'edit')
  const dirty = computed(() => {
    rev.value
    // The phone version has no save: each keystroke is already stored.
    if (wMode.value === 'local') return false
    return session.dirty()
  })
  const lint = computed(() => {
    rev.value
    return session.lint()
  })
  const canUndo = computed(() => {
    rev.value
    return session.canUndo()
  })
  const canRedo = computed(() => {
    rev.value
    return session.canRedo()
  })
  const discardLabel = computed(() => (confirmDiscard.value ? 'Confirmar descarte' : 'Descartar'))

  function touch() {
    working.value = session.getSource()
    rev.value += 1
    // Editing something IS the lesson: the hint has nothing left to teach.
    if (isEdit.value && !opts.editSeen()) opts.markEditSeen()
    // A local edit saves itself: there is no button, so every keystroke becomes
    // an anchored adjustment on top of the official text.
    if (isEdit.value && wMode.value === 'local') opts.ov().commitLocalFrom(working.value, enterCtx)
    // Content mode is the official chart: the host must see the draft so a
    // form submit (Nova, etc.) can persist it even before "Salvar para todos".
    publishContentSource()
    opts.emitDirty(dirty.value)
  }

  /**
   * Echo the working source to the host without the watcher treating it as a
   * new chart. `lastSrc` is the same guard `save()` uses.
   */
  function publishContentSource() {
    if (!isEdit.value || wMode.value !== 'persisted') return
    const cur = session.getSource()
    lastSrc = cur
    opts.emitSource(cur)
  }

  /**
   * Re-baseline the editor on the current base text. Every overlay change makes
   * the reader's version a different text — the draft cannot survive it, which
   * is why reverting an adjustment drops what was typed on top of it.
   */
  function forceBase() {
    const b = opts.ov().baseFor(wMode.value)
    // Also when the text already matches: `reset` is what moves the saved
    // baseline, and a local edit that ends level with its base is not a draft.
    if (session.getSource() === b && !session.dirty()) return
    session.reset(b)
    touch()
  }

  function publishBatidaSource(next: string) {
    session.replace(next)
    // Local edit is overlay-only — the official chart changes when the musician
    // suggests and the owner accepts. Persisted (and view cycle) write through.
    if (wMode.value !== 'local') {
      lastSrc = next
      opts.emitSource(next)
    }
    touch()
  }

  /** Text we just handed the host. `syncHostSource` must not read it as a new chart. */
  function acceptHostEcho(text: string) {
    lastSrc = text
  }

  /** "For everyone" has no server draft: saving IS publishing. */
  function save() {
    if (wMode.value === 'local') return
    session.commit()
    touch()
    const cur = session.getSource()
    // The host may echo the saved text straight back as `source`: without this
    // the watcher would read it as a new chart and reset tone, scroll and draft.
    lastSrc = cur
    opts.emitSource(cur)
    opts.emitSave(cur)
    opts.ov().setOfficial(cur)
    opts.toast('Salvo — todos os músicos passam a ler assim')
  }

  /**
   * Discard goes back to the last SAVED text, not to the host source: what has
   * already been handed to the app cannot be thrown away by one click. And the
   * click is double, because the undo stack cannot bring it back.
   */
  function discard() {
    if (!confirmDiscard.value) {
      confirmDiscard.value = true
      window.clearTimeout(discardT)
      discardT = window.setTimeout(() => (confirmDiscard.value = false), 4000)
      return
    }
    window.clearTimeout(discardT)
    confirmDiscard.value = false
    session.discard()
    opts.metaOpen.value = false
    touch()
  }

  function onDraft(next: string) {
    // The step was already opened by the pane: keystrokes coalesce into it.
    session.edit(next)
    touch()
  }

  function undo() {
    session.undo()
    touch()
  }

  function redo() {
    session.redo()
    touch()
  }

  function applyMeta(next: string) {
    session.replace(next)
    opts.metaOpen.value = false
    touch()
  }

  function beginEdit(kind: WriteMode) {
    opts.stopScroll()
    // The badge and the panel are both hidden in edit: a click left running here
    // would be audible with nothing on screen able to stop it.
    opts.met().stop()
    // The adjustment was made against what was on screen: the reading context
    // travels with it, so it can be read back for what it was.
    enterCtx = { transpose: opts.offset.value, capo: opts.capo.value, dual: !!(opts.capo.value && opts.capoMap.value) }
    // You do not edit a projection: transpose goes back to neutral, and `fitOn`
    // already answers false while editing. Writing `fit` here instead would turn
    // "the reader never chose" into "the reader chose off" — and, once persisted,
    // hold the fit off for good after a single visit to the editor.
    opts.offset.value = 0
    opts.capo.value = 0
    opts.zen.value = false
    opts.lens.value = 'none'
    opts.hideComments.value = false
    opts.metOpen.value = false
    opts.met().stop()
    opts.exitEnsaioBatida()
    opts.sheet().value = false
    opts.capoOpen.value = false
    opts.toneOpen.value = false
    opts.moreOpen.value = false
    opts.metaOpen.value = false
    opts.closeBatida()
    opts.ov().myPanel.value = false
    opts.ov().showOriginal.value = false
    opts.beditReset()
    opts.clearScoreEditors()
    wMode.value = kind
    localMode.value = 'edit'
    if (!session.dirty()) forceBase()
    opts.emitMode('edit')
    opts.toast(
      kind === 'local'
        ? 'Só para você — salva neste celular, dá para voltar ao original'
        : 'Para todos — salvar altera a cifra do sistema',
    )
  }

  function enterEdit() {
    if (!opts.canEditNow()) return
    const role = opts.editModeResolved()
    if (role === 'none') return
    beginEdit(role)
  }

  function exitEdit() {
    if (!isEdit.value) return
    const local = wMode.value === 'local'
    if (!local && dirty.value) opts.toast('Rascunho não salvo — continua aqui quando você voltar')
    opts.srcOpen.value = false
    opts.metaOpen.value = false
    opts.beditReset()
    opts.clearScoreEditors()
    wMode.value = null
    localMode.value = 'view'
    // The local draft has already become the overlay; a "for everyone" draft
    // that was never saved stays on screen, so it cannot be lost by leaving.
    if (local || !session.dirty()) forceBase()
    opts.offset.value = enterCtx.transpose
    opts.capo.value = enterCtx.capo
    opts.capoMap.value = !!enterCtx.dual
    opts.emitMode('view')
  }

  /**
   * A new source (host or fixture) stops the scroll and resets tone and position.
   * File `{capo:}` is not the live capo — that starts at 0 unless the musician
   * already pinned one (setlist spot, host initialCapo, personal overlay).
   */
  function syncHostSource() {
    const raw = opts.hostSource()
    if (raw === lastSrc) return
    // Where the song being opened was left, when it has been read before.
    const spot: SongSpot | null = opts.setlist().takeRestore()
    const first = lastSrc === null
    const lost = !first && session.dirty()
    lastSrc = raw
    const src = normalizeSource(raw)
    session.reset(src)
    opts.metaOpen.value = false
    confirmDiscard.value = false
    wMode.value = null
    opts.capo.value = 0
    opts.stopScroll()
    const fileT = Number(readMeta(src).transpose)
    opts.offset.value = Number.isFinite(fileT) ? fileT : 0
    opts.mul.value = 1
    // Coming back to a song already rehearsed: tone, capo and speed are picked
    // back up. A tone the reader pinned still wins, just below.
    if (spot) {
      opts.offset.value = spot.offset
      opts.capo.value = spot.capo
      opts.mul.value = spot.mul
    }
    const initialCapo = opts.initialCapo()
    if (typeof initialCapo === 'number') opts.capo.value = Math.max(0, Math.min(9, initialCapo))
    // Reading lens and comment filter stay: they are the reader's choice for the
    // rehearsal, not part of the chart. Song switch must not kick a singer out
    // of Só letra (or Nashville) mid-set.
    const initialDual = opts.initialDual()
    opts.capoMap.value = typeof initialDual === 'boolean' ? initialDual : true
    opts.metOpen.value = false
    opts.met().stop()
    opts.parkPlayhead(spot ? spot.u || 0 : 0)
    opts.pdf().value = 'idle'
    opts.slides().value = 'idle'
    opts.sheet().value = false
    touch()
    // The reader's own version of THIS chart, and the key they pinned to it.
    const ov = opts.ov()
    ov.reset()
    const tune = ov.load()
    if (tune) {
      opts.offset.value = tune.transpose || 0
      opts.capo.value = tune.capo || 0
      opts.capoMap.value = !!tune.dual
    }
    forceBase()
    // The stored BPM belongs to the song: it reloads with the chart.
    opts.met().loadBpm()
    if (spot) {
      // The saved place only exists once the new chart has painted.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (opts.scroller.value) opts.scroller.value.scrollTop = spot.top
        }),
      )
    } else if (!first && opts.scroller.value) opts.scroller.value.scrollTop = 0
    // Swapping the chart drops the draft — but the loss has to be said, not silent.
    if (lost) {
      opts.toast(
        opts.setlist().on.value
          ? 'Você trocou de música — o rascunho anterior foi descartado'
          : 'Nova cifra recebida — o rascunho anterior foi descartado',
      )
    }
  }

  function clearDiscardTimer() {
    window.clearTimeout(discardT)
  }

  return {
    session,
    working,
    mode,
    isEdit,
    wMode,
    confirmDiscard,
    dirty,
    lint,
    canUndo,
    canRedo,
    discardLabel,
    touch,
    forceBase,
    publishBatidaSource,
    acceptHostEcho,
    save,
    discard,
    undo,
    redo,
    onDraft,
    applyMeta,
    beginEdit,
    enterEdit,
    exitEdit,
    syncHostSource,
    clearDiscardTimer,
  }
}
