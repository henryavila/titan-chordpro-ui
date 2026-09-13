<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  applyStrumPreset,
  formatXStrum,
  resizePattern,
  setSlot,
  type StrumPattern,
  type StrumSlot,
} from '@henryavila/titan-chordpro-ui'
import CpvIcon from '../icon/CpvIcon.vue'
import BatidaPresets from '../edit/BatidaPresets.vue'
import BatidaSlotPicker from '../edit/BatidaSlotPicker.vue'

const props = withDefaults(
  defineProps<{
    compact: boolean
    pattern: StrumPattern
    barBeats: number
    canDelete: boolean
    /** Host capability — off hides the presets section. */
    presetsEnabled?: boolean
  }>(),
  { presetsEnabled: true },
)

const emit = defineEmits<{
  close: []
  save: [pattern: StrumPattern]
  delete: []
}>()

const draft = ref<StrumPattern>(clonePattern(props.pattern))
const pickIndex = ref(-1)
const label = ref(props.pattern.label || 'Padrão')
const grid = ref(props.pattern.grid || props.pattern.slots.length || 16)
const baselineKey = ref(snapshotKey(draft.value, label.value))

watch(
  () => props.pattern,
  (p) => {
    draft.value = clonePattern(p)
    label.value = p.label || 'Padrão'
    grid.value = p.grid || p.slots.length || 16
    pickIndex.value = -1
    baselineKey.value = snapshotKey(draft.value, label.value)
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
  )
  if (!next) return
  draft.value = next
  label.value = next.label || 'Padrão'
  grid.value = next.grid
  pickIndex.value = -1
}

function save() {
  const next: StrumPattern = {
    ...draft.value,
    label: label.value.trim() || 'Padrão',
    grid: draft.value.slots.length,
  }
  emit('save', next)
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

      <BatidaPresets v-if="presetsEnabled" @apply="applyPreset" />

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
              style="min-height:52px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--text);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:6px 4px;font:inherit;"
              @click="openPick(i)"
            >
              <span style="font-size:16px;font-weight:700;line-height:1;">{{ glyph(draft.slots[i]!) }}</span>
              <span style="font-size:9.5px;color:var(--muted);line-height:1;min-height:10px;">{{ shortTag(draft.slots[i]!) || '\u00a0' }}</span>
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
  </div>
</template>

<style scoped>
.batida-slot.is-ghost {
  color: color-mix(in srgb, var(--text) 55%, transparent);
}
.batida-slot.is-accent {
  color: var(--chord);
  border-color: var(--chord-edge) !important;
}
.batida-slot.is-focus {
  box-shadow: inset 0 0 0 1px var(--chord-edge);
  background: var(--chord-soft) !important;
}
.batida-slot.is-muted {
  color: var(--muted);
}
</style>
