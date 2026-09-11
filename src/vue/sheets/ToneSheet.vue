<script setup lang="ts">
import CpvIcon from '../icon/CpvIcon.vue'
defineProps<{
  shownKey: string
  hasOffset: boolean
  offsetLabel: string
  capoLabel: string
  capoHint: string
  hasCapo: boolean
  hasReset: boolean
  /** The chart is showing both chords (capo shape + real). */
  dual: boolean
}>()
const emit = defineEmits<{
  close: []
  down: []
  up: []
  capoDown: []
  capoUp: []
  reset: []
  dual: []
}>()
</script>

<template>
  <div style="position:absolute;inset:0;z-index:28;">
    <div class="cpv-scrim" @click="emit('close')" />
    <div class="cpv-bottom-sheet cpv-veil-2" role="dialog" aria-label="Tom e capotraste">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Tom e capotraste</span>
        <button class="cpv-ghost" aria-label="Fechar" style="width:36px;height:36px;border-radius:12px;background:var(--surface);color:var(--muted);" @click="emit('close')"><CpvIcon name="x" :size="16" /></button>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button aria-label="Baixar meio tom" style="flex:none;width:60px;height:56px;border:1px solid var(--chord-edge);border-radius:16px;background:var(--chord-soft);color:var(--chord);font-size:22px;cursor:pointer;" @click="emit('down')">−</button>
        <span style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
          <span style="font-family:'Space Mono',monospace;font-size:30px;font-weight:700;color:var(--chord);line-height:1;">{{ shownKey }}</span>
          <span v-if="hasOffset" style="font-family:'Space Mono',monospace;font-size:11px;font-weight:700;color:var(--muted);">{{ offsetLabel }} semitons do original</span>
        </span>
        <button aria-label="Subir meio tom" style="flex:none;width:60px;height:56px;border:1px solid var(--chord-edge);border-radius:16px;background:var(--chord-soft);color:var(--chord);font-size:22px;cursor:pointer;" @click="emit('up')">+</button>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="flex:1;font-size:13px;font-weight:600;color:var(--text);">Capotraste</span>
        <button aria-label="Capo abaixo" style="flex:none;width:48px;height:44px;border:1px solid var(--line);border-radius:13px;background:transparent;color:var(--text);font-size:18px;cursor:pointer;" @click="emit('capoDown')">−</button>
        <span style="flex:none;min-width:86px;text-align:center;font-family:'Space Mono',monospace;font-size:14px;font-weight:700;color:var(--chord);">{{ capoLabel }}</span>
        <button aria-label="Capo acima" style="flex:none;width:48px;height:44px;border:1px solid var(--line);border-radius:13px;background:transparent;color:var(--text);font-size:18px;cursor:pointer;" @click="emit('capoUp')">+</button>
      </div>
      <span style="font-size:12px;line-height:1.5;color:var(--muted);text-wrap:pretty;">{{ capoHint }}</span>
      <button
        v-if="hasCapo"
        data-dual
        role="switch"
        :aria-checked="dual"
        :style="{ border: `1px solid ${dual ? 'var(--chord-edge)' : 'var(--line)'}`, background: dual ? 'var(--chord-soft)' : 'transparent' }"
        style="display:flex;align-items:center;gap:11px;width:100%;padding:13px 12px;border-radius:14px;color:var(--text);font-family:inherit;text-align:left;cursor:pointer;"
        @click="emit('dual')"
      >
        <span :style="{ background: dual ? 'var(--chord)' : 'var(--line)' }" style="flex:none;width:34px;height:20px;border-radius:10px;position:relative;">
          <span :style="{ left: dual ? '16px' : '2px', background: dual ? 'var(--chord-ink)' : 'var(--muted)' }" style="position:absolute;top:2px;width:16px;height:16px;border-radius:50%;transition:left .16s ease;" />
        </span>
        <span style="display:flex;flex-direction:column;gap:2px;min-width:0;">
          <span style="font-size:13px;font-weight:600;">Modo dual</span>
          <span style="font-size:11.5px;line-height:1.4;color:var(--muted);text-wrap:pretty;">Duas cifras na mesma linha: quem está com capo e quem não está.</span>
        </span>
      </button>
      <button
        v-if="hasReset"
        style="height:48px;border:0;border-radius:14px;background:var(--chord-fill);color:var(--chord);font-size:13.5px;font-weight:600;cursor:pointer;"
        @click="emit('reset')"
      >
        Voltar ao tom original, sem capo
      </button>
    </div>
  </div>
</template>
