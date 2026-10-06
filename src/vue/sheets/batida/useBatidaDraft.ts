import { computed, nextTick, ref, watch } from 'vue'
import {
  applyStrumPreset,
  beatsInMeter,
  densityFromGrid,
  draftStrumPreset,
  emptyPattern,
  gridFromDensity,
  hasStrumAnchor,
  inferSixEightPulse,
  isCompleteStrumPattern,
  requiredDir,
  resizePattern,
  setSlotCascading,
  type SaveStrumPresetPayload,
  type SixEightPulse,
  type StrumDensity,
  type StrumPattern,
  type StrumPatternSet,
  type StrumPreset,
  type StrumSlot,
} from '@henryavila/titan-chordpro-ui'
import { slotIndexAtClock } from '../../use/useStrumSound'
import { clonePattern, snapshotKey } from './draft'

export type BatidaDraftProps = {
  pattern: StrumPattern
  /** Named patterns in the set (defaults to `[pattern]`). */
  patterns?: StrumPattern[]
  activeIndex?: number
  barBeats: number
  /** Host-owned catalog (never shipped by the package). */
  presets?: StrumPreset[]
  /** Editor preview loop is running. */
  previewRunning?: boolean
  /**
   * Absolute beat clock from the editor preview (−1 = none).
   * Same units as the StrumStrip metronome clock.
   */
  previewClock?: number
}

export type BatidaNameDialog = {
  focus: () => void
  select: () => void
}

type BatidaEmit = {
  (event: 'save', pattern: StrumPattern): void
  (event: 'save-set', set: StrumPatternSet): void
  (event: 'select-pattern', index: number): void
  (event: 'add-pattern'): void
  (event: 'duplicate-pattern'): void
  (event: 'remove-pattern'): void
  (event: 'save-preset', payload: SaveStrumPresetPayload): void
  (event: 'toggle-preview', payload: { pattern: StrumPattern; barBeats: number }): void
  (event: 'update-preview', pattern: StrumPattern): void
  (event: 'audition', slot: StrumSlot): void
}

export function useBatidaDraft(props: BatidaDraftProps, emit: BatidaEmit) {
  function initialPatterns(): StrumPattern[] {
    if (props.patterns?.length) return props.patterns.map(clonePattern)
    return [clonePattern(props.pattern)]
  }

  const draftPatterns = ref<StrumPattern[]>(initialPatterns())
  const draftActive = ref(
    Math.max(0, Math.min(props.activeIndex ?? 0, initialPatterns().length - 1)),
  )
  const draft = ref<StrumPattern>(clonePattern(draftPatterns.value[draftActive.value] ?? props.pattern))
  const pickIndex = ref(-1)
  const label = ref(draft.value.label || 'Padrão')
  const grid = ref(draft.value.grid || draft.value.slots.length || 16)
  const sixEightPulse = ref<SixEightPulse>(
    inferSixEightPulse(draft.value.meter, grid.value) ?? 2,
  )
  const baselineKey = ref(snapshotKey(draft.value, label.value))
  const presetNameOpen = ref(false)
  const presetName = ref('')
  const presetNameErr = ref('')
  const presetNameDialog = ref<BatidaNameDialog | null>(null)
  /** Pending preset apply when the draft is dirty — UI confirm instead of window.confirm. */
  const pendingPresetId = ref<string | null>(null)
  const pendingPresetLabel = computed(() => {
    const id = pendingPresetId.value
    if (!id) return ''
    return props.presets?.find((p) => p.id === id)?.label ?? id
  })

  function snapshotActive(): StrumPattern {
    return {
      ...draft.value,
      label: label.value.trim() || draft.value.label || 'Padrão',
      grid: draft.value.slots.length,
    }
  }

  const canSave = computed(() => {
    const list = draftPatterns.value.map((p, i) => (i === draftActive.value ? snapshotActive() : p))
    return list.length > 0 && list.every(isCompleteStrumPattern)
  })
  const isSixEight = computed(() => String(draft.value.meter || '').trim() === '6/8')
  const density = computed<StrumDensity>(() => {
    const d = densityFromGrid(draft.value.meter, grid.value, sixEightPulse.value)
    return d === 2 || d === 4 ? d : 4
  })

  function loadActive(p: StrumPattern) {
    draft.value = clonePattern(p)
    label.value = p.label || 'Padrão'
    grid.value = p.grid || p.slots.length || 16
    sixEightPulse.value = inferSixEightPulse(p.meter, grid.value) ?? 2
    pickIndex.value = -1
    baselineKey.value = snapshotKey(draft.value, label.value)
  }

  function commitActiveToList() {
    const next: StrumPattern = {
      ...draft.value,
      label: label.value.trim() || 'Padrão',
      grid: draft.value.slots.length,
    }
    draftPatterns.value = draftPatterns.value.map((p, i) =>
      i === draftActive.value ? next : p,
    )
    return next
  }

  watch(
    () => [props.pattern, props.patterns, props.activeIndex] as const,
    () => {
      draftPatterns.value = initialPatterns()
      draftActive.value = Math.max(
        0,
        Math.min(props.activeIndex ?? 0, draftPatterns.value.length - 1),
      )
      loadActive(draftPatterns.value[draftActive.value] ?? props.pattern)
    },
  )

  function isDraftDirty(): boolean {
    return snapshotKey(draft.value, label.value) !== baselineKey.value
  }

  const barBeats = computed(() =>
    Math.max(1, beatsInMeter(draft.value.meter || '4/4', sixEightPulse.value) || props.barBeats || 4),
  )
  const slotsPerBeat = computed(() =>
    Math.max(1, Math.round((draft.value.grid || draft.value.slots.length) / barBeats.value)),
  )

  const beatRows = computed(() => {
    const spb = slotsPerBeat.value
    const rows: { beat: number; indices: number[] }[] = []
    for (let b = 0; b < barBeats.value; b++) {
      const indices: number[] = []
      for (let k = 0; k < spb; k++) {
        const i = b * spb + k
        if (i < draft.value.slots.length) indices.push(i)
      }
      rows.push({ beat: b + 1, indices })
    }
    return rows
  })

  const pickSlot = computed(() =>
    pickIndex.value >= 0 ? draft.value.slots[pickIndex.value] : null,
  )

  const pickBeatLabel = computed(() => {
    if (pickIndex.value < 0) return ''
    const spb = slotsPerBeat.value
    const beat = Math.floor(pickIndex.value / spb) % barBeats.value + 1
    const sub = (pickIndex.value % spb) + 1
    return `Tempo ${beat} · pulso ${sub}`
  })

  function onDensityChange(raw: string) {
    const d = Number(raw) === 2 ? 2 : 4
    const n = gridFromDensity(draft.value.meter || '4/4', d, sixEightPulse.value)
    grid.value = n
    draft.value = resizePattern({ ...draft.value, label: label.value }, n)
    pickIndex.value = -1
  }

  function onSixEightPulseChange(raw: string) {
    const pulse: SixEightPulse = Number(raw) === 6 ? 6 : 2
    sixEightPulse.value = pulse
    const n = gridFromDensity(draft.value.meter || '6/8', density.value, pulse)
    grid.value = n
    draft.value = resizePattern({ ...draft.value, label: label.value, meter: '6/8' }, n)
    pickIndex.value = -1
  }

  function openPick(i: number) {
    pickIndex.value = i
  }

  function snapshotDraft(): StrumPattern {
    return {
      ...draft.value,
      label: label.value.trim() || draft.value.label || 'Padrão',
      grid: draft.value.slots.length,
      slots: draft.value.slots.map((s) => ({ ...s })),
    }
  }

  function applyPick(slot: StrumSlot) {
    if (pickIndex.value < 0) return
    draft.value = setSlotCascading(draft.value, pickIndex.value, slot)
    grid.value = draft.value.slots.length
    pickIndex.value = -1
    if (slot.contact === 'hit') emit('audition', slot)
    if (props.previewRunning) emit('update-preview', snapshotDraft())
  }

  const previewSlot = computed(() =>
    slotIndexAtClock(
      props.previewClock ?? -1,
      draft.value.slots.length,
      draft.value.grid || draft.value.slots.length,
      barBeats.value,
    ),
  )

  function onTogglePreview() {
    emit('toggle-preview', { pattern: snapshotDraft(), barBeats: barBeats.value })
  }

  watch(
    draft,
    () => {
      if (props.previewRunning) emit('update-preview', snapshotDraft())
    },
    { deep: true },
  )

  /** Clear slots back to empty so the musician can set a new hand-direction anchor. */
  function restartCreation() {
    const cur = draft.value
    draft.value = emptyPattern({
      bpm: cur.bpm,
      meter: cur.meter,
      grid: cur.grid || cur.slots.length || grid.value,
      label: label.value.trim() || cur.label || 'Padrão',
    })
    grid.value = draft.value.slots.length
    pickIndex.value = -1
  }

  const canRestart = computed(() => hasStrumAnchor(draft.value))

  const pickDirHint = computed(() => {
    if (pickIndex.value < 0) return ''
    if (!hasStrumAnchor(draft.value)) return 'Defina o sentido'
    const d = requiredDir(draft.value, pickIndex.value)
    return d === 'up' ? 'só ↑' : d === 'down' ? 'só ↓' : ''
  })

  function applyPreset(presetId: string) {
    if (isDraftDirty()) {
      pendingPresetId.value = presetId
      return
    }
    commitPreset(presetId)
  }

  function commitPreset(presetId: string) {
    const next = applyStrumPreset(
      { ...draft.value, label: label.value.trim() || 'Padrão' },
      presetId,
      props.presets ?? [],
    )
    pendingPresetId.value = null
    if (!next) return
    draft.value = next
    label.value = next.label || 'Padrão'
    grid.value = next.grid
    pickIndex.value = -1
    baselineKey.value = snapshotKey(draft.value, label.value)
  }

  function cancelPendingPreset() {
    pendingPresetId.value = null
  }

  function saveAsPreset() {
    presetName.value = label.value.trim() || draft.value.label || 'Padrão'
    presetNameErr.value = ''
    presetNameOpen.value = true
    void nextTick(() => {
      presetNameDialog.value?.focus()
      presetNameDialog.value?.select()
    })
  }

  function closePresetName() {
    presetNameOpen.value = false
    presetNameErr.value = ''
  }

  function confirmPresetName() {
    const name = presetName.value.trim()
    if (!name) {
      presetNameErr.value = 'Dê um nome ao preset'
      presetNameDialog.value?.focus()
      return
    }
    emit(
      'save-preset',
      draftStrumPreset({ ...draft.value, label: name, grid: grid.value }, name),
    )
    closePresetName()
  }

  function selectPattern(i: number) {
    if (i === draftActive.value || i < 0 || i >= draftPatterns.value.length) return
    commitActiveToList()
    draftActive.value = i
    loadActive(draftPatterns.value[i]!)
    emit('select-pattern', i)
  }

  function addPattern() {
    commitActiveToList()
    const base = draftPatterns.value[draftActive.value] ?? draft.value
    const neu = emptyPattern({
      bpm: base.bpm,
      meter: base.meter,
      grid: base.grid || base.slots.length || 16,
      label: `Padrão ${draftPatterns.value.length + 1}`,
    })
    draftPatterns.value = [...draftPatterns.value, neu]
    draftActive.value = draftPatterns.value.length - 1
    loadActive(neu)
    emit('add-pattern')
  }

  function duplicatePattern() {
    commitActiveToList()
    const cur = draftPatterns.value[draftActive.value]!
    const copy: StrumPattern = {
      ...clonePattern(cur),
      label: `${cur.label || 'Padrão'} (cópia)`,
    }
    const next = [...draftPatterns.value]
    next.splice(draftActive.value + 1, 0, copy)
    draftPatterns.value = next
    draftActive.value = draftActive.value + 1
    loadActive(copy)
    emit('duplicate-pattern')
  }

  function removePattern() {
    if (draftPatterns.value.length <= 1) return
    const next = draftPatterns.value.filter((_, i) => i !== draftActive.value)
    const i = Math.min(draftActive.value, next.length - 1)
    draftPatterns.value = next
    draftActive.value = i
    loadActive(next[i]!)
    emit('remove-pattern')
  }

  function save() {
    if (!canSave.value) return
    const next = commitActiveToList()
    if (!draftPatterns.value.every(isCompleteStrumPattern)) return
    emit('save', next)
    emit('save-set', {
      activeIndex: draftActive.value,
      patterns: draftPatterns.value.map(clonePattern),
    })
  }

  return {
    draftPatterns,
    draftActive,
    draft,
    pickIndex,
    label,
    sixEightPulse,
    presetNameOpen,
    presetName,
    presetNameErr,
    presetNameDialog,
    pendingPresetId,
    pendingPresetLabel,
    canSave,
    isSixEight,
    density,
    pickSlot,
    pickBeatLabel,
    pickDirHint,
    previewSlot,
    canRestart,
    beatRows,
    slotsPerBeat,
    onDensityChange,
    onSixEightPulseChange,
    openPick,
    applyPick,
    onTogglePreview,
    restartCreation,
    applyPreset,
    commitPreset,
    cancelPendingPreset,
    saveAsPreset,
    closePresetName,
    confirmPresetName,
    selectPattern,
    addPattern,
    duplicatePattern,
    removePattern,
    save,
  }
}
