<script setup lang="ts">
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'
import TitanChordproStepper from '../ui/TitanChordproStepper.vue'
import TitanChordproSwitchRow from '../ui/TitanChordproSwitchRow.vue'
defineProps<{
  shownKey: string
  hasOffset: boolean
  offsetLabel: string
  songCaption?: string
  capoLabel: string
  capoHint: string
  /** New capo shapes as chips; empty → show `capoHint` text. */
  capoShapes?: string[]
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
    <div class="titan-chordpro-scrim" @click="emit('close')" />
    <div class="titan-chordpro-bottom-sheet titan-chordpro-veil-2" role="dialog" aria-label="Tom e capotraste">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Tom e capotraste</span>
        <button class="titan-chordpro-ghost" aria-label="Fechar" style="width:36px;height:36px;border-radius:12px;background:var(--surface);color:var(--muted);" @click="emit('close')"><TitanChordproIcon name="x" :size="16" /></button>
      </div>
      <TitanChordproStepper size="lg" down-label="Baixar meio tom" up-label="Subir meio tom" @down="emit('down')" @up="emit('up')">
        <span style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;">
          <span data-tone-playing-key style="font-family:'Space Mono',monospace;font-size:30px;font-weight:700;color:var(--chord);line-height:1;">{{ shownKey }}</span>
          <span data-tone-shift style="font-size:12px;font-weight:600;color:var(--muted);text-align:center;min-height:18px;">{{ songCaption || '\u00a0' }}</span>
        </span>
      </TitanChordproStepper>
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="flex:1;font-size:13px;font-weight:600;color:var(--text);">Capotraste</span>
        <TitanChordproStepper size="md" down-label="Capo abaixo" up-label="Capo acima" @down="emit('capoDown')" @up="emit('capoUp')">
          <span style="flex:none;min-width:86px;text-align:center;font-family:'Space Mono',monospace;font-size:14px;font-weight:700;color:var(--chord);">{{ capoLabel }}</span>
        </TitanChordproStepper>
      </div>
      <div v-if="capoShapes?.length" data-capo-hint class="titan-chordpro-capo-hint">
        <span v-for="(s, i) in capoShapes" :key="`${s}-${i}`" class="titan-chordpro-capo-chip" data-capo-chip>{{ s }}</span>
      </div>
      <span v-else data-capo-hint class="titan-chordpro-capo-hint--text">{{ capoHint }}</span>
      <TitanChordproSwitchRow
        data-dual
        :on="dual"
        :disabled="!hasCapo"
        title="Modo dual"
        :hint="hasCapo ? (dual ? 'Duas cifras na mesma linha: quem está com capo e quem não está.' : 'Desligado, a cifra vira as formas do capo — quem toca sozinho.') : 'Liga com o capotraste: duas cifras, ou só as formas.'"
        @click="hasCapo && $emit('dual')"
      />
      <button
        data-tone-reset
        :disabled="!hasReset"
        :style="{
          opacity: hasReset ? '1' : '0.4',
          cursor: hasReset ? 'pointer' : 'default',
        }"
        style="height:48px;border:0;border-radius:14px;background:var(--chord-fill);color:var(--chord);font-size:13.5px;font-weight:600;"
        @click="hasReset && $emit('reset')"
      >
        Voltar ao tom original
      </button>
    </div>
  </div>
</template>
