<script setup lang="ts">
import { computed } from 'vue'
import { listSlotChoices, slotEquals, type StrumSlot } from '@henryavila/titan-chordpro-ui'
import CpvIcon from '../icon/CpvIcon.vue'

const props = defineProps<{
  compact: boolean
  current: StrumSlot
  beatLabel: string
}>()

const emit = defineEmits<{
  close: []
  pick: [slot: StrumSlot]
}>()

const ESS_LABEL: Record<string, string> = {
  normal: 'Normal',
  accent: 'Acento',
  mute: 'Mute',
  muted: 'Abafada',
}

const choices = computed(() => listSlotChoices())
const hits = computed(() => choices.value.filter((c) => c.contact === 'hit'))
const ghosts = computed(() => choices.value.filter((c) => c.contact === 'ghost'))

function glyph(s: StrumSlot): string {
  if (s.contact === 'ghost') return s.dir === 'up' ? '↑' : '↓'
  if (s.essence === 'muted') return '×'
  return s.dir === 'up' ? '↑' : '↓'
}

function nameOf(s: StrumSlot): string {
  if (s.contact === 'ghost') return s.dir === 'up' ? 'Passa ↑' : 'Passa ↓'
  const arrow = s.dir === 'up' ? '↑' : '↓'
  return `${arrow}  ${ESS_LABEL[s.essence ?? 'normal'] ?? 'Normal'}`
}

function subOf(s: StrumSlot): string {
  if (s.contact === 'ghost') return 'Não tocar · mão passa'
  return s.dir === 'up' ? 'Cima · toque' : 'Baixo · toque'
}

const geom = computed(() =>
  props.compact
    ? {
        left: '0',
        right: '0',
        bottom: '0',
        width: 'auto',
        maxHeight: '78%',
        padding: '14px 14px calc(14px + env(safe-area-inset-bottom))',
        borderRadius: '20px 20px 0 0',
      }
    : {
        left: 'auto',
        right: '16px',
        bottom: '96px',
        width: 'min(340px,calc(100% - 32px))',
        maxHeight: '72%',
        padding: '14px',
        borderRadius: '17px',
      },
)

const essOrder = ['normal', 'accent', 'mute', 'muted'] as const
</script>

<template>
  <div style="position:absolute;inset:0;z-index:29;">
    <div class="cpv-scrim" data-batida-pick-scrim @click="emit('close')" />
    <div
      class="cpv-veil-2"
      role="dialog"
      aria-label="Escolher batida"
      data-batida-picker
      :style="geom"
      style="position:absolute;overflow-y:auto;display:flex;flex-direction:column;gap:10px;animation:cpv-rise .2s ease-out;"
    >
      <div style="display:flex;align-items:center;gap:10px;">
        <span
          style="width:36px;height:36px;border-radius:11px;background:var(--chord-soft);color:var(--chord);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;"
          aria-hidden="true"
        >{{ glyph(current) }}</span>
        <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;">
          <span style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;">{{ beatLabel }}</span>
          <span style="font-size:14px;font-weight:700;color:var(--text);">Escolher batida</span>
        </span>
        <button class="cpv-ghost" aria-label="Fechar" style="width:34px;height:34px;color:var(--muted);" @click="emit('close')">
          <CpvIcon name="x" :size="16" />
        </button>
      </div>

      <div style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;padding:2px 2px 0;">Tocar</div>
      <div
        v-for="e in essOrder"
        :key="e"
        style="display:grid;grid-template-columns:1fr 1fr;gap:6px;"
      >
        <button
          v-for="s in hits.filter((h) => h.essence === e)"
          :key="`${s.dir}-${s.essence}`"
          type="button"
          class="cpv-surface-btn"
          data-batida-choice="hit"
          :aria-pressed="slotEquals(s, current) ? 'true' : 'false'"
          :style="{
            justifyContent: 'flex-start',
            gap: '10px',
            padding: '10px 12px',
            borderColor: slotEquals(s, current) ? 'var(--chord-edge)' : undefined,
            background: slotEquals(s, current) ? 'var(--chord-soft)' : undefined,
          }"
          @click="emit('pick', s)"
        >
          <span style="font-size:16px;font-weight:700;width:18px;text-align:center;">{{ glyph(s) }}</span>
          <span style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0;">
            <span style="font-size:13px;font-weight:600;">{{ nameOf(s) }}</span>
            <span style="font-size:11px;color:var(--muted);">{{ subOf(s) }}</span>
          </span>
        </button>
      </div>

      <div style="font-size:9.5px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-weight:700;padding:6px 2px 0;">Passar / não tocar</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
        <button
          v-for="s in ghosts"
          :key="`ghost-${s.dir}`"
          type="button"
          class="cpv-surface-btn"
          data-batida-choice="ghost"
          :aria-pressed="slotEquals(s, current) ? 'true' : 'false'"
          :style="{
            justifyContent: 'flex-start',
            gap: '10px',
            padding: '10px 12px',
            borderColor: slotEquals(s, current) ? 'var(--chord-edge)' : undefined,
            background: slotEquals(s, current) ? 'var(--chord-soft)' : undefined,
          }"
          @click="emit('pick', s)"
        >
          <span style="font-size:16px;font-weight:700;width:18px;text-align:center;opacity:0.55;">{{ glyph(s) }}</span>
          <span style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0;">
            <span style="font-size:13px;font-weight:600;">{{ nameOf(s) }}</span>
            <span style="font-size:11px;color:var(--muted);">{{ subOf(s) }}</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
