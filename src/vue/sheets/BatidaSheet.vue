<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  applyStrumPreset,
  draftStrumPreset,
  emptyPattern,
  formatXStrum,
  resizePattern,
  setSlot,
  type SaveStrumPresetPayload,
  type StrumPattern,
  type StrumPatternSet,
  type StrumPreset,
  type StrumSlot,
} from '@henryavila/titan-chordpro-ui'
import CpvIcon from '../icon/CpvIcon.vue'
import BatidaPresets from '../edit/BatidaPresets.vue'
import BatidaSlotPicker from '../edit/BatidaSlotPicker.vue'

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
  }>(),
  { presetsEnabled: false, activeIndex: 0, presets: () => [] },
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
const baselineKey = ref(snapshotKey(draft.value, label.value))
const presetNameOpen = ref(false)
const presetName = ref('')
const presetNameErr = ref('')
const presetNameInput = ref<HTMLInputElement | null>(null)

function loadActive(p: StrumPattern) {
  draft.value = clonePattern(p)
  label.value = p.label || 'Padrão'
  grid.value = p.grid || p.slots.length || 16
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
  return {
    ...p,
    slots: p.slots.map((s, i) => normalizeSlot(s, i)),
  }
}

/** Legacy rest (-) edits as passa; creator never writes rest. */
function normalizeSlot(s: StrumSlot, i: number): StrumSlot {
  if (s.contact === 'rest') {
    return { dir: i % 2 === 0 ? 'down' : 'up', contact: 'ghost', essence: null }
  }
  return { ...s }
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

const barBeats = computed(() => Math.max(1, props.barBeats || 4))
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
  if (s.contact === 'rest') return '↓'
  if (s.essence === 'muted') return '×'
  if (s.dir === 'up') return '↑'
  if (s.dir === 'down') return '↓'
  return '×'
}

function shortTag(s: StrumSlot): string {
  if (s.contact === 'rest' || s.contact === 'ghost') return 'passa'
  if (s.essence === 'accent') return 'acento'
  if (s.essence === 'mute') return 'mute'
  if (s.essence === 'muted') return 'abafada'
  return ''
}

function slotClass(s: StrumSlot): string {
  const bits = ['batida-slot']
  if (s.contact === 'ghost' || s.contact === 'rest') bits.push('is-ghost')
  if (s.essence === 'accent') bits.push('is-accent')
  if (s.essence === 'mute') bits.push('is-mute')
  if (s.essence === 'muted') bits.push('is-muted')
  return bits.join(' ')
}

function onGridChange(raw: string) {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return
  grid.value = n
  draft.value = resizePattern({ ...draft.value, label: label.value }, n)
  pickIndex.value = -1
}

function openPick(i: number) {
  pickIndex.value = i
}

function applyPick(slot: StrumSlot) {
  if (pickIndex.value < 0) return
  draft.value = setSlot(draft.value, pickIndex.value, slot)
  pickIndex.value = -1
}

function applyPreset(presetId: string) {
  if (isDraftDirty() && !window.confirm('Substituir a batida atual por este preset?')) return
  const next = applyStrumPreset(
    { ...draft.value, label: label.value.trim() || 'Padrão' },
    presetId,
    props.presets,
  )
  if (!next) return
  draft.value = next
  label.value = next.label || 'Padrão'
  grid.value = next.grid
  pickIndex.value = -1
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
  const next = commitActiveToList()
  emit('save', next)
  emit('save-set', { activeIndex: draftActive.value, patterns: draftPatterns.value.map(clonePattern) })
}

const geom = computed(() =>
  props.compact
    ? {
        left: '0',
        right: '0',
        bottom: '0',
        width: 'auto',
        maxHeight: '88%',
        padding: '12px 14px calc(14px + env(safe-area-inset-bottom))',
        borderRadius: '20px 20px 0 0',
      }
    : {
        left: 'auto',
        right: '16px',
        top: '72px',
        bottom: '18px',
        width: 'min(420px,calc(100% - 32px))',
        maxHeight: 'none',
        padding: '14px',
        borderRadius: '18px',
      },
)
</script>

<template>
  <div style="position:absolute;inset:0;z-index:28;">
    <div class="cpv-scrim" data-batida-scrim @click="emit('close')" />
    <div
      class="cpv-veil-2"
      role="dialog"
      aria-label="Batida"
      data-batida-sheet
      :style="geom"
      style="position:absolute;overflow-y:auto;display:flex;flex-direction:column;gap:12px;animation:cpv-rise .2s ease-out;"
    >
      <div v-if="compact" style="width:40px;height:4px;border-radius:99px;background:var(--line);margin:0 auto;" />
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Batida</span>
        <button class="cpv-ghost" aria-label="Fechar" style="width:34px;height:34px;color:var(--muted);" @click="emit('close')">
          <CpvIcon name="x" :size="16" />
        </button>
      </div>

      <p
        data-batida-multi-warn
        style="margin:0;font-size:12px;line-height:1.45;color:var(--muted);"
      >
        A batida <b style="color:var(--text);font-weight:600;">não acompanha</b> automaticamente verso/refrão — escolha o padrão ativo.
      </p>

      <div data-batida-patterns style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
        <button
          v-for="(p, i) in draftPatterns"
          :key="i"
          type="button"
          :data-batida-pattern="i"
          :class="{ 'is-active': i === draftActive }"
          class="batida-pattern-chip"
          style="height:32px;padding:0 12px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--text);font:inherit;font-size:12px;font-weight:600;cursor:pointer;"
          @click="selectPattern(i)"
        >{{ p.label || `Padrão ${i + 1}` }}</button>
        <button
          type="button"
          data-batida-add
          class="cpv-ghost"
          title="Adicionar padrão"
          aria-label="Adicionar padrão"
          style="height:32px;padding:0 10px;border-radius:999px;border:1px dashed var(--line);color:var(--muted);font-size:12px;font-weight:600;cursor:pointer;"
          @click="addPattern"
        >+</button>
        <button
          type="button"
          data-batida-dup
          class="cpv-ghost"
          title="Duplicar padrão"
          aria-label="Duplicar padrão"
          style="height:32px;padding:0 10px;border-radius:999px;border:1px solid var(--line);color:var(--muted);font-size:12px;font-weight:600;cursor:pointer;"
          @click="duplicatePattern"
        >Duplicar</button>
        <button
          v-if="draftPatterns.length > 1"
          type="button"
          data-batida-remove-pattern
          class="cpv-ghost"
          title="Remover padrão"
          aria-label="Remover padrão"
          style="height:32px;padding:0 10px;border-radius:999px;border:1px solid var(--line);color:var(--muted);font-size:12px;font-weight:600;cursor:pointer;"
          @click="removePattern"
        >Remover</button>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <label style="flex:1;min-width:140px;display:flex;flex-direction:column;gap:4px;">
          <span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);font-weight:700;">Nome</span>
          <input
            v-model="label"
            data-batida-label
            type="text"
            style="height:38px;padding:0 12px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--text);font:inherit;"
          />
        </label>
        <label style="width:96px;display:flex;flex-direction:column;gap:4px;">
          <span style="font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);font-weight:700;">Grade</span>
          <select
            data-batida-grid
            :value="String(grid)"
            style="height:38px;padding:0 10px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--text);font:inherit;"
            @change="onGridChange(($event.target as HTMLSelectElement).value)"
          >
            <option value="8">8</option>
            <option value="12">12</option>
            <option value="16">16</option>
          </select>
        </label>
        <div v-if="draft.bpm" style="display:flex;flex-direction:column;justify-content:flex-end;padding-bottom:8px;">
          <span style="font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:13px;font-weight:700;color:var(--text);">{{ draft.bpm }} BPM</span>
        </div>
      </div>

      <BatidaPresets
        v-if="presetsEnabled"
        :presets="presets"
        @apply="applyPreset"
        @save="saveAsPreset"
      />

      <p style="margin:0;font-size:12px;line-height:1.45;color:var(--muted);">
        Toque um <b style="color:var(--text);font-weight:600;">marco</b> para escolher — tocar ou passar (não tocar).
      </p>

      <div
        data-batida-beats
        :style="{ display: 'flex', flexDirection: 'column', gap: compact ? '8px' : '6px' }"
      >
        <div
          v-for="row in beatRows"
          :key="row.beat"
          data-batida-beat-row
          style="display:flex;align-items:center;gap:8px;"
        >
          <span
            style="flex:none;width:18px;font-family:var(--cpv-font-chords,'Space Mono',monospace);font-size:12px;font-weight:700;color:var(--muted);text-align:center;"
          >{{ row.beat }}</span>
          <div style="flex:1;display:grid;gap:4px;" :style="{ gridTemplateColumns: `repeat(${row.indices.length}, minmax(0, 1fr))` }">
            <button
              v-for="i in row.indices"
              :key="i"
              type="button"
              :class="[slotClass(draft.slots[i]!), { 'is-focus': pickIndex === i }]"
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

      <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
        <button
          v-if="canDelete"
          type="button"
          data-batida-delete
          class="cpv-ghost"
          style="height:42px;padding:0 14px;border-radius:12px;border:1px solid var(--line);color:var(--muted);font-size:13px;font-weight:600;"
          @click="emit('delete')"
        >Apagar</button>
        <span style="flex:1;" />
        <button
          type="button"
          data-batida-save
          style="height:42px;padding:0 18px;border-radius:12px;border:0;background:var(--chord);color:var(--chord-ink);font:inherit;font-size:13.5px;font-weight:700;cursor:pointer;"
          @click="save"
        >Salvar</button>
      </div>
    </div>

    <BatidaSlotPicker
      v-if="pickSlot"
      :compact="compact"
      :current="pickSlot"
      :beat-label="pickBeatLabel"
      @close="pickIndex = -1"
      @pick="applyPick"
    />

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
.batida-slot {
  position: relative;
  min-height: 58px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 8px 4px 6px;
  font: inherit;
  transition: border-color 0.12s, background 0.12s, box-shadow 0.12s;
}
.batida-slot-gl {
  position: relative;
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
  min-height: 24px;
  display: grid;
  place-items: center;
}
.batida-slot-tag {
  font-size: 9.5px;
  font-weight: 600;
  color: var(--muted);
  line-height: 1;
  min-height: 10px;
  letter-spacing: 0.02em;
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
  font-size: 26px;
  color: var(--chord);
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
  font-size: 20px;
  font-weight: 700;
  color: var(--muted);
}
.batida-slot.is-focus {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--chord) 28%, transparent);
  border-color: var(--chord-edge);
  background: var(--chord-soft);
}
.batida-pattern-chip.is-active {
  background: var(--chord-soft) !important;
  border-color: var(--chord-edge) !important;
  color: var(--chord) !important;
}
</style>
