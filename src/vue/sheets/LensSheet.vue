<script setup lang="ts">
import { computed } from 'vue'
import type { Lens } from 'titan-chordpro-ui'
import CpvIcon from '../icon/CpvIcon.vue'

const props = defineProps<{
  compact: boolean
  lens: Lens
  hasKey: boolean
  /** The chart is already showing two chords per line. */
  twin: boolean
  capo: number
  hideComments: boolean
}>()
const emit = defineEmits<{
  close: []
  pick: [lens: Lens]
  toggleComments: []
}>()

const options = computed(() => [
  {
    key: 'none' as Lens,
    label: 'Sem lente',
    hint: 'Nomes de acorde como estão na cifra.',
    off: false,
  },
  {
    key: 'nashville' as Lens,
    label: 'Nashville (graus)',
    hint: !props.hasKey
      ? 'Precisa de {key:} na cifra.'
      : props.twin
        ? 'Graus valem para os dois grupos — substitui o modo dual.'
        : '1 4 5 6m em vez de G C D Em.',
    off: !props.hasKey,
  },
])

const geom = computed(() =>
  props.compact
    ? {
        left: '0',
        right: '0',
        transform: 'none',
        bottom: '0',
        width: 'auto',
        maxHeight: '76%',
        padding: '16px 14px calc(16px + env(safe-area-inset-bottom))',
        borderRadius: '20px 20px 0 0',
      }
    : {
        left: '50%',
        right: 'auto',
        transform: 'translateX(-50%)',
        bottom: '96px',
        width: 'min(340px,calc(100% - 32px))',
        maxHeight: '70%',
        padding: '14px',
        borderRadius: '17px',
      },
)
</script>

<template>
  <div style="position:absolute;inset:0;z-index:26;">
    <div class="cpv-scrim" @click="emit('close')" />
    <div
      class="cpv-veil-2"
      role="dialog"
      aria-label="Lentes de leitura"
      :style="geom"
      style="position:absolute;overflow-y:auto;display:flex;flex-direction:column;gap:12px;animation:cpv-rise .2s ease-out;"
    >
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Lentes de leitura</span>
        <button class="cpv-ghost" aria-label="Fechar" style="width:26px;height:26px;color:var(--muted);" @click="emit('close')"><CpvIcon name="x" :size="14" /></button>
      </div>

      <div role="radiogroup" style="display:flex;flex-direction:column;gap:6px;">
        <button
          v-for="o in options"
          :key="o.key"
          role="radio"
          :aria-checked="lens === o.key"
          :disabled="o.off"
          :data-lens="o.key"
          :style="{
            border: `1px solid ${lens === o.key ? 'var(--chord-edge)' : 'var(--line)'}`,
            background: lens === o.key ? 'var(--chord-soft)' : 'transparent',
            opacity: o.off ? '0.45' : '1',
          }"
          style="display:flex;align-items:flex-start;gap:10px;width:100%;padding:10px 11px;border-radius:12px;color:var(--text);font-family:inherit;text-align:left;cursor:pointer;"
          @click="emit('pick', o.key)"
        >
          <span
            :style="{ borderColor: lens === o.key ? 'var(--chord)' : 'var(--line)' }"
            style="flex:none;width:15px;height:15px;margin-top:2px;border-radius:50%;border:1.5px solid;display:flex;align-items:center;justify-content:center;"
          >
            <span
              :style="{ background: lens === o.key ? 'var(--chord)' : 'transparent' }"
              style="width:7px;height:7px;border-radius:50%;"
            />
          </span>
          <span style="display:flex;flex-direction:column;gap:3px;min-width:0;">
            <span style="font-size:13px;font-weight:600;">{{ o.label }}</span>
            <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">{{ o.hint }}</span>
          </span>
        </button>
      </div>

      <div v-if="twin && capo > 0" style="padding:9px 10px;border-radius:12px;background:var(--chord-soft);border:1px solid var(--chord-edge);">
        <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">Modo dual no capo {{ capo }} — as duas cifras aparecem na música inteira.</span>
      </div>

      <div style="height:1px;background:var(--line-soft);" />

      <button
        data-comments-toggle
        :style="{
          border: `1px solid ${hideComments ? 'var(--sel-line)' : 'var(--line)'}`,
          background: hideComments ? 'var(--sel)' : 'transparent',
        }"
        style="display:flex;align-items:center;gap:10px;width:100%;padding:10px 11px;border-radius:12px;color:var(--text);font-family:inherit;text-align:left;cursor:pointer;"
        @click="emit('toggleComments')"
      >
        <span
          :style="{ background: hideComments ? 'var(--line)' : 'var(--chord)' }"
          style="flex:none;width:30px;height:18px;border-radius:9px;position:relative;"
        >
          <span
            :style="{ left: hideComments ? '2px' : '14px', background: hideComments ? 'var(--muted)' : 'var(--chord-ink)' }"
            style="position:absolute;top:2px;width:14px;height:14px;border-radius:50%;transition:left .16s ease;"
          />
        </span>
        <span style="display:flex;flex-direction:column;gap:3px;">
          <span style="font-size:13px;font-weight:600;">{{ hideComments ? 'Comentários ocultos' : 'Comentários de ensaio' }}</span>
          <span style="font-size:11.5px;line-height:1.45;color:var(--muted);">Só na leitura — o texto continua no arquivo.</span>
        </span>
      </button>
    </div>
  </div>
</template>
