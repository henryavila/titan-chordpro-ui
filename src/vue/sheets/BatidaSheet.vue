<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  applyStrumPreset,
  beatsInMeter,
  densityFromGrid,
  draftStrumPreset,
  emptyPattern,
  formatXStrum,
  gridFromDensity,
  hasStrumAnchor,
  inferSixEightPulse,
  isCompleteStrumPattern,
  isEmptySlot,
  repairStrumPattern,
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
import CpvIcon from '../icon/CpvIcon.vue'
import BatidaPresets from '../edit/BatidaPresets.vue'
import BatidaSlotPicker from '../edit/BatidaSlotPicker.vue'
import { slotIndexAtClock } from '../use/useStrumSound'

const props = withDefaults(
  defineProps<{
    compact: boolean
    pattern: StrumPattern
    /** Named patterns in the set (defaults to `[pattern]`). */
    patterns?: StrumPattern[]
    activeIndex?: number
    barBeats: number
    canDelete: boolean
    /** Host capability — off hides the presets section. */
    presetsEnabled?: boolean
    /** Host-owned catalog (never shipped by the package). */
    presets?: StrumPreset[]
    /** Acoustic one-shots armed (same flag as the metronome “Som da batida”). */
    soundEnabled?: boolean
    /** Editor preview loop is running. */
    previewRunning?: boolean
    /**
     * Absolute beat clock from the editor preview (−1 = none).
     * Same units as the StrumStrip metronome clock.
     */
    previewClock?: number
  }>(),
  {
    presetsEnabled: false,
    activeIndex: 0,
    presets: () => [],
    soundEnabled: false,
    previewRunning: false,
    previewClock: -1,
  },
)

const emit = defineEmits<{
  close: []
  save: [pattern: StrumPattern]
  'save-set': [set: StrumPatternSet]
  delete: []
  'select-pattern': [index: number]
  'add-pattern': []
  'duplicate-pattern': []
  'remove-pattern': []
  'save-preset': [payload: SaveStrumPresetPayload]
  'toggle-sound': []
  /** Pattern + the same bar-beat count the grid is drawn with — audio must share it. */
  'toggle-preview': [payload: { pattern: StrumPattern; barBeats: number }]
  'update-preview': [pattern: StrumPattern]
  audition: [slot: StrumSlot]
}>()

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
const presetNameInput = ref<HTMLInputElement | null>(null)
/** Pending preset apply when the draft is dirty — UI confirm instead of window.confirm. */
const pendingPresetId = ref<string | null>(null)
const pendingPresetLabel = computed(() => {
  const id = pendingPresetId.value
  if (!id) return ''
  return props.presets.find((p) => p.id === id)?.label ?? id
})
const canSave = computed(() => isCompleteStrumPattern(draft.value))
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

function clonePattern(p: StrumPattern): StrumPattern {
  return repairStrumPattern({
    ...p,
    slots: p.slots.map((s) => ({ ...s })),
  })
}

function snapshotKey(p: StrumPattern, lab: string): string {
  return formatXStrum({
    ...p,
    label: lab.trim() || 'Padrão',
    grid: p.slots.length,
  })
}

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

function glyph(s: StrumSlot): string {
  if (isEmptySlot(s)) return '·'
  if (s.essence === 'muted') return '×'
  if (s.dir === 'up') return '↑'
  if (s.dir === 'down') return '↓'
  return '·'
}

function shortTag(s: StrumSlot): string {
  if (isEmptySlot(s)) return 'vazio'
  if (s.contact === 'rest' || s.contact === 'ghost') return 'passa'
  if (s.essence === 'accent') return 'acento'
  if (s.essence === 'mute') return 'mute'
  if (s.essence === 'muted') return 'abafada'
  return ''
}

function slotClass(s: StrumSlot): string {
  const bits = ['batida-slot']
  if (isEmptySlot(s)) bits.push('is-empty')
  if (s.contact === 'ghost' || s.contact === 'rest') bits.push('is-ghost')
  if (s.essence === 'accent') bits.push('is-accent')
  if (s.essence === 'mute') bits.push('is-mute')
  if (s.essence === 'muted') bits.push('is-muted')
  return bits.join(' ')
}

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

function isPreviewActive(i: number): boolean {
  return props.previewRunning === true && previewSlot.value === i
}

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
    props.presets,
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
    presetNameInput.value?.focus()
    presetNameInput.value?.select()
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
    presetNameInput.value?.focus()
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
  if (!isCompleteStrumPattern(draft.value)) return
  const next = commitActiveToList()
  if (!isCompleteStrumPattern(next)) return
  emit('save', next)
  emit('save-set', { activeIndex: draftActive.value, patterns: draftPatterns.value.map(clonePattern) })
}

</script>

<template>
  <div
    class="cpv-sheet batida-sheet-root"
    :class="{ 'is-compact': compact }"
    style="z-index:28;"
  >
    <div class="cpv-scrim" data-batida-scrim @click="emit('close')" />
    <div
      class="cpv-veil-2 batida-sheet-panel"
      :class="{ 'is-compact': compact }"
      role="dialog"
      aria-label="Batida"
      aria-modal="true"
      data-batida-sheet
    >
      <div v-if="compact" class="batida-sheet-grab" />
      <div class="batida-sheet-head">
        <span class="batida-sheet-kicker">Batida</span>
        <button class="cpv-ghost" aria-label="Fechar" style="width:34px;height:34px;color:var(--muted);" @click="emit('close')">
          <CpvIcon name="x" :size="16" />
        </button>
      </div>

      <div data-batida-patterns class="batida-patterns">
        <button
          v-for="(p, i) in draftPatterns"
          :key="i"
          type="button"
          :data-batida-pattern="i"
          :class="{ 'is-active': i === draftActive }"
          class="batida-pattern-chip"
          @click="selectPattern(i)"
        >{{ p.label || `Padrão ${i + 1}` }}</button>
        <button
          type="button"
          data-batida-add
          class="batida-pattern-chip is-ghost"
          title="Adicionar"
          aria-label="Adicionar padrão"
          @click="addPattern"
        >+</button>
        <button
          type="button"
          data-batida-dup
          class="batida-pattern-chip is-ghost"
          title="Duplicar"
          aria-label="Duplicar padrão"
          @click="duplicatePattern"
        >Duplicar</button>
        <button
          v-if="draftPatterns.length > 1"
          type="button"
          data-batida-remove-pattern
          class="batida-pattern-chip is-ghost"
          title="Remover"
          aria-label="Remover padrão"
          @click="removePattern"
        >Remover</button>
      </div>

      <div class="batida-meta-row">
        <label class="batida-field batida-field-grow">
          <span class="batida-field-label">Nome</span>
          <input
            v-model="label"
            data-batida-label
            type="text"
            class="batida-field-control"
          />
        </label>
        <label class="batida-field">
          <span class="batida-field-label">Densidade</span>
          <select
            data-batida-density
            data-batida-grid
            :value="String(density)"
            class="batida-field-control"
            @change="onDensityChange(($event.target as HTMLSelectElement).value)"
          >
            <option value="2">2 / tempo</option>
            <option value="4">4 / tempo</option>
          </select>
        </label>
        <label
          v-if="isSixEight"
          class="batida-field"
        >
          <span class="batida-field-label">6/8</span>
          <select
            data-batida-pulse
            :value="String(sixEightPulse)"
            class="batida-field-control"
            @change="onSixEightPulseChange(($event.target as HTMLSelectElement).value)"
          >
            <option value="2">2 compostos</option>
            <option value="6">6 colcheias</option>
          </select>
        </label>
        <div v-if="draft.bpm" class="batida-bpm">
          <span>{{ draft.bpm }} BPM</span>
        </div>
      </div>

      <BatidaPresets
        v-if="presetsEnabled"
        :presets="presets"
        @apply="applyPreset"
        @save="saveAsPreset"
      />

      <div class="batida-grid-bar" data-batida-sound-row>
        <button
          type="button"
          class="batida-sound-chip"
          data-batida-sound
          :aria-pressed="soundEnabled ? 'true' : 'false'"
          :aria-label="soundEnabled ? 'Som ligado' : 'Som desligado'"
          @click="emit('toggle-sound')"
        >
          <span class="batida-sound-knob" :class="{ 'is-on': soundEnabled }">
            <span class="batida-sound-thumb" :class="{ 'is-on': soundEnabled }" />
          </span>
          <span data-batida-sound-label>{{ soundEnabled ? 'Som' : 'Mudo' }}</span>
        </button>
        <button
          type="button"
          class="batida-preview-btn"
          :class="previewRunning ? 'batida-btn-ghost' : 'batida-btn-primary'"
          data-batida-preview
          :disabled="!canSave"
          :aria-disabled="!canSave ? 'true' : 'false'"
          :aria-pressed="previewRunning ? 'true' : 'false'"
          :aria-label="previewRunning ? 'Parar' : 'Ouvir'"
          @click="onTogglePreview"
        >{{ previewRunning ? 'Parar' : 'Ouvir' }}</button>
        <span class="batida-grid-bar-spacer" />
        <button
          v-if="canRestart"
          type="button"
          data-batida-restart
          class="batida-restart-link"
          aria-label="Recomeçar"
          @click="restartCreation"
        >Recomeçar</button>
      </div>

      <div
        data-batida-beats
        class="batida-beats"
      >
        <div
          v-for="row in beatRows"
          :key="row.beat"
          data-batida-beat-row
          class="batida-beat-row"
        >
          <span class="batida-beat-num">{{ row.beat }}</span>
          <div class="batida-beat-slots" :style="{ gridTemplateColumns: `repeat(${row.indices.length}, minmax(0, 1fr))` }">
            <button
              v-for="i in row.indices"
              :key="i"
              type="button"
              :class="[slotClass(draft.slots[i]!), { 'is-focus': pickIndex === i, 'is-preview': isPreviewActive(i) }]"
              :data-batida-slot="i"
              :aria-label="`tempo ${row.beat}, subdivisão ${(i % slotsPerBeat) + 1}`"
              @click="openPick(i)"
            >
              <span class="batida-slot-gl" aria-hidden="true">
                {{ glyph(draft.slots[i]!) }}
                <span
                  v-if="draft.slots[i]!.contact === 'hit' && draft.slots[i]!.essence === 'mute'"
                  class="batida-slot-dot"
                />
              </span>
              <span class="batida-slot-tag">{{ shortTag(draft.slots[i]!) || '\u00a0' }}</span>
            </button>
          </div>
        </div>
      </div>

      <div class="batida-sheet-actions">
        <button
          v-if="canDelete"
          type="button"
          data-batida-delete
          class="batida-btn-ghost"
          @click="emit('delete')"
        >Apagar</button>
        <span class="batida-actions-spacer" />
        <button
          type="button"
          data-batida-save
          class="batida-btn-primary"
          :disabled="!canSave"
          :aria-disabled="!canSave ? 'true' : 'false'"
          @click="save"
        >Salvar</button>
      </div>
    </div>

    <BatidaSlotPicker
      v-if="pickSlot && pickIndex >= 0"
      :compact="compact"
      :current="pickSlot"
      :pattern="draft"
      :slot-index="pickIndex"
      :beat-label="pickBeatLabel"
      :dir-hint="pickDirHint"
      @close="pickIndex = -1"
      @pick="applyPick"
    />

    <div
      v-if="pendingPresetId"
      class="cpv-sheet"
      style="z-index:32;"
      data-batida-preset-replace-dialog
    >
      <div class="cpv-scrim" data-batida-preset-replace-scrim @click="cancelPendingPreset" />
      <div
        class="cpv-dialog cpv-veil-2"
        role="dialog"
        aria-modal="true"
        aria-label="Substituir batida"
        style="max-width:380px;gap:12px;"
      >
        <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Substituir batida</span>
        <p style="margin:0;font-size:13px;line-height:1.45;color:var(--text);">
          A batida atual tem alterações. Substituir pelo preset
          <strong style="color:var(--chord);">{{ pendingPresetLabel }}</strong>?
        </p>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:2px;">
          <button
            type="button"
            class="cpv-ghost"
            data-batida-preset-replace-cancel
            style="height:38px;padding:0 14px;border-radius:11px;color:var(--muted);font-size:13px;font-weight:600;"
            @click="cancelPendingPreset"
          >Manter atual</button>
          <button
            type="button"
            data-batida-preset-replace-ok
            style="height:38px;padding:0 16px;border-radius:11px;border:0;background:var(--chord);color:var(--chord-ink);font:inherit;font-size:13px;font-weight:700;cursor:pointer;"
            @click="commitPreset(pendingPresetId!)"
          >Substituir</button>
        </div>
      </div>
    </div>

    <div
      v-if="presetNameOpen"
      class="cpv-sheet"
      style="z-index:32;"
      data-batida-preset-name-dialog
    >
      <div class="cpv-scrim" data-batida-preset-name-scrim @click="closePresetName" />
      <div
        class="cpv-dialog cpv-veil-2"
        role="dialog"
        aria-modal="true"
        aria-label="Salvar como preset"
        style="max-width:380px;gap:12px;"
      >
        <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Salvar como preset</span>
        <p style="margin:0;font-size:13px;line-height:1.45;color:var(--muted);">
          O nome fica no catálogo do sistema. A batida atual é enviada para o host gravar.
        </p>
        <label style="display:flex;flex-direction:column;gap:6px;">
          <span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);font-weight:700;">Nome</span>
          <input
            ref="presetNameInput"
            v-model="presetName"
            data-batida-preset-name
            type="text"
            maxlength="80"
            autocomplete="off"
            style="height:42px;border-radius:12px;border:1px solid var(--line);background:var(--canvas,var(--surface));color:var(--text);padding:0 12px;font:inherit;font-size:14px;font-weight:600;"
            @keydown.enter.prevent="confirmPresetName"
            @keydown.escape.prevent="closePresetName"
          />
        </label>
        <span
          v-if="presetNameErr"
          data-batida-preset-name-err
          style="font-size:12px;color:var(--danger);"
        >{{ presetNameErr }}</span>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:2px;">
          <button
            type="button"
            class="cpv-ghost"
            data-batida-preset-name-cancel
            style="height:38px;padding:0 14px;border-radius:11px;color:var(--muted);font-size:13px;font-weight:600;"
            @click="closePresetName"
          >Cancelar</button>
          <button
            type="button"
            data-batida-preset-name-ok
            style="height:38px;padding:0 16px;border-radius:11px;border:0;background:var(--chord);color:var(--chord-ink);font:inherit;font-size:13px;font-weight:700;cursor:pointer;"
            @click="confirmPresetName"
          >Salvar preset</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Desktop: centered modal (not a phone sheet docked to the side). */
.batida-sheet-panel {
  position: relative;
  width: 100%;
  max-width: 720px;
  max-height: min(860px, calc(100% - 40px));
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 22px 24px 20px;
  border-radius: 20px;
  animation: cpv-rise 0.2s ease-out;
  box-shadow: var(--shadow);
}
.batida-sheet-panel.is-compact {
  max-width: 100%;
  max-height: 88%;
  padding: 12px 14px calc(14px + env(safe-area-inset-bottom));
  border-radius: 20px 20px 0 0;
  gap: 12px;
  box-shadow: none;
}
.batida-sheet-grab {
  width: 40px;
  height: 4px;
  border-radius: 99px;
  background: var(--line);
  margin: 0 auto;
}
.batida-sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.batida-sheet-kicker {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
}
.batida-sheet-panel.is-compact .batida-sheet-kicker {
  font-size: 9.5px;
}
.batida-grid-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 6px 0;
  margin: 0;
  background: color-mix(in srgb, var(--sheet, var(--surface)) 92%, transparent);
  backdrop-filter: blur(8px);
}
.batida-grid-bar-spacer {
  flex: 1;
  min-width: 8px;
}
.batida-sound-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  border-radius: 11px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.batida-sound-knob {
  flex: none;
  width: 28px;
  height: 16px;
  border-radius: 8px;
  background: var(--line);
  position: relative;
}
.batida-sound-knob.is-on {
  background: var(--chord);
}
.batida-sound-thumb {
  position: absolute;
  top: 1px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--muted);
  transition: left 0.16s ease;
}
.batida-sound-thumb.is-on {
  left: 12px;
  background: var(--chord-ink);
}
.batida-preview-btn {
  min-width: 88px;
  height: 40px;
  padding: 0 18px;
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 700;
}
.batida-preview-btn.batida-btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.batida-restart-link {
  height: 36px;
  padding: 0 6px;
  border: 0;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.batida-restart-link:hover {
  color: var(--text);
}
.batida-patterns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.batida-pattern-chip {
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.batida-pattern-chip.is-ghost {
  background: transparent;
  border-style: dashed;
  color: var(--muted);
}
.batida-pattern-chip.is-active {
  background: var(--chord-soft);
  border-color: var(--chord-edge);
  color: var(--chord);
}
.batida-meta-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-end;
}
.batida-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 160px;
}
.batida-field-grow {
  flex: 1;
  min-width: 200px;
}
.batida-field-label {
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
}
.batida-field-control {
  height: 42px;
  padding: 0 12px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
  font: inherit;
}
.batida-sheet-panel.is-compact .batida-field-control {
  height: 38px;
}
.batida-bpm {
  display: flex;
  align-items: flex-end;
  padding-bottom: 10px;
  font-family: var(--cpv-font-chords, 'Space Mono', monospace);
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}
.batida-beats {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0;
}
.batida-sheet-panel.is-compact .batida-beats {
  gap: 8px;
}
.batida-beat-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.batida-beat-num {
  flex: none;
  width: 22px;
  font-family: var(--cpv-font-chords, 'Space Mono', monospace);
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
  text-align: center;
}
.batida-beat-slots {
  flex: 1;
  display: grid;
  gap: 8px;
}
.batida-sheet-panel.is-compact .batida-beat-slots {
  gap: 4px;
}
.batida-slot {
  position: relative;
  min-height: 72px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 6px 8px;
  font: inherit;
  transition: border-color 0.12s, background 0.12s, box-shadow 0.12s;
}
.batida-sheet-panel.is-compact .batida-slot {
  min-height: 58px;
  border-radius: 12px;
  gap: 3px;
  padding: 8px 4px 6px;
}
.batida-slot.is-empty {
  border-style: dashed;
  background: transparent;
}
.batida-slot.is-empty .batida-slot-gl {
  font-weight: 500;
  color: var(--muted);
}
.batida-slot-gl {
  position: relative;
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
  min-height: 28px;
  display: grid;
  place-items: center;
}
.batida-sheet-panel.is-compact .batida-slot-gl {
  font-size: 22px;
  min-height: 24px;
}
.batida-slot-tag {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1;
  min-height: 11px;
  letter-spacing: 0.02em;
}
.batida-sheet-panel.is-compact .batida-slot-tag {
  font-size: 9.5px;
  min-height: 10px;
}
.batida-slot-dot {
  position: absolute;
  bottom: -1px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--text);
}
.batida-slot.is-ghost .batida-slot-gl {
  font-weight: 500;
  color: color-mix(in srgb, var(--text) 38%, transparent);
}
.batida-slot.is-ghost {
  border-style: dashed;
}
.batida-slot.is-accent .batida-slot-gl {
  font-size: 30px;
  color: var(--chord);
}
.batida-sheet-panel.is-compact .batida-slot.is-accent .batida-slot-gl {
  font-size: 26px;
}
.batida-slot.is-accent {
  border-color: var(--chord-edge);
}
.batida-slot.is-accent .batida-slot-tag {
  color: var(--chord);
}
.batida-slot.is-mute .batida-slot-gl {
  font-weight: 800;
}
.batida-slot.is-muted .batida-slot-gl {
  font-size: 22px;
  font-weight: 700;
  color: var(--muted);
}
.batida-slot.is-focus {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--chord) 28%, transparent);
  border-color: var(--chord-edge);
  background: var(--chord-soft);
}
.batida-slot.is-preview {
  border-color: var(--chord-edge);
  background: var(--chord-soft);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--chord) 40%, transparent);
}
.batida-sheet-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.batida-actions-spacer {
  flex: 1;
  font-size: 12px;
  color: var(--muted);
}
.batida-btn-ghost {
  height: 44px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}
.batida-btn-primary {
  height: 44px;
  padding: 0 22px;
  border-radius: 12px;
  border: 0;
  background: var(--chord);
  color: var(--chord-ink);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.batida-btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.batida-sheet-panel.is-compact .batida-btn-ghost,
.batida-sheet-panel.is-compact .batida-btn-primary {
  height: 42px;
  font-size: 13px;
}
</style>
