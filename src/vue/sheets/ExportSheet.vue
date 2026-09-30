<script setup lang="ts">
import { ref, useId } from 'vue'
import CpvIcon from '../icon/CpvIcon.vue'
withDefaults(
  defineProps<{
    exportKeyNote: string
    pdfBusy: boolean
    hasNotation?: boolean
    pdfError?: string
    slidesBusy?: boolean
    bundleBusy?: boolean
    bundleError?: string
    /** Phone width: the dialog becomes a bottom sheet. */
    compact?: boolean
    /** The reader has a personal version: the file has to say which one it is. */
    hasOverlay?: boolean
    exportOrig?: boolean
  }>(),
  { compact: false, hasOverlay: false, exportOrig: false, slidesBusy: false },
)
const emit = defineEmits<{
  close: []
  cho: []
  pdf: [notation: 'tab' | 'score' | 'none']
  slides: []
  bundle: []
  pick: [orig: boolean]
}>()
const notationGroup = useId()
const confirmPdf = ref(false)
const notation = ref<'tab' | 'score' | 'none'>('score')
</script>

<template>
  <div class="cpv-sheet" :class="{ 'is-compact': compact }">
    <div class="cpv-scrim" @click="emit('close')" />
    <div
      class="cpv-dialog cpv-veil-2"
      role="dialog"
      aria-modal="true"
      aria-label="Exportar"
    >
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0 2px 6px;">
        <span style="font-size:10.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">
          Exportar {{ exportKeyNote }}
        </span>
        <button class="cpv-ghost" aria-label="Fechar" style="width:28px;height:28px;border-radius:8px;color:var(--muted);" @click="emit('close')"><CpvIcon name="x" :size="14" /></button>
      </div>
      <div v-if="hasOverlay" style="display:flex;align-items:center;gap:6px;padding:0 2px 6px;">
        <button
          data-export-mine
          :style="{
            border: `1px solid ${exportOrig ? 'var(--line)' : 'var(--chord-edge)'}`,
            background: exportOrig ? 'transparent' : 'var(--chord-fill)',
          }"
          style="flex:1;height:34px;border-radius:10px;color:var(--text);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;"
          @click="emit('pick', false)"
        >Minha versão</button>
        <button
          data-export-orig
          :style="{
            border: `1px solid ${exportOrig ? 'var(--sel-line)' : 'var(--line)'}`,
            background: exportOrig ? 'var(--sel)' : 'transparent',
          }"
          style="flex:1;height:34px;border-radius:10px;color:var(--text);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;"
          @click="emit('pick', true)"
        >Oficial</button>
      </div>
      <button
        data-export="cho"
        class="cpv-surface-btn"
        style="width:100%;display:flex;align-items:center;gap:12px;text-align:left;"
        @click="emit('cho')"
      >
        <span style="font-family:'Space Mono',monospace;font-size:10.5px;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:3px 6px;">.cho</span>
        ChordPro
      </button>
      <button data-export="bundle" class="cpv-surface-btn" type="button" :disabled="bundleBusy"
        style="width:100%;display:flex;align-items:center;gap:12px;text-align:left" @click="emit('bundle')">
        <span style="font-family:monospace;font-size:11px;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:3px 6px">ZIP</span>
        <span>Cifra completa <small style="display:block;color:var(--muted);font-weight:400">ChordPro, solos, imagens e áudios · offline</small></span>
        <span v-if="bundleBusy" class="cpv-spin" style="width:14px;height:14px;margin-left:auto" />
      </button>
      <p v-if="bundleError" role="alert" style="font-size:13px;padding:0 4px">{{ bundleError }}</p>
      <button
        data-export="pdf"
        class="cpv-surface-btn"
        style="width:100%;display:flex;align-items:center;gap:12px;text-align:left;"
        :disabled="pdfBusy"
        @click="hasNotation ? (confirmPdf = true) : emit('pdf', 'score')"
      >
        <span style="font-family:'Space Mono',monospace;font-size:10.5px;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:3px 6px;">PDF</span>
        Documento
        <span style="flex:1;" />
        <span v-if="pdfBusy" style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;color:var(--muted);">
          <span class="cpv-spin" style="width:14px;height:14px;" />gerando…
        </span>
      </button>
      <div v-if="confirmPdf" style="padding:12px 2px" data-pdf-confirm>
        <fieldset :disabled="pdfBusy" style="border:0;padding:0;margin:0 0 12px">
          <legend style="font-weight:600;margin-bottom:10px">Solos de Guitar Pro/MusicXML no PDF</legend>
          <label v-for="choice in ([['tab', 'TAB'], ['score', 'Partitura'], ['none', 'Nenhum']] as const)"
            :key="choice[0]" style="display:inline-flex;align-items:center;gap:5px;margin-right:12px">
            <input v-model="notation" type="radio" :name="notationGroup" :value="choice[0]">{{ choice[1] }}
          </label>
        </fieldset>
        <button type="button" class="cpv-surface-btn" data-pdf-download :disabled="pdfBusy" @click="emit('pdf', notation)">
          {{ pdfBusy ? 'Gerando PDF…' : 'Gerar PDF' }}
        </button>
      </div>
      <p v-if="pdfError" role="alert" style="font-size:13px;padding:0 4px">{{ pdfError }}</p>
      <button
        data-export="slides"
        class="cpv-surface-btn"
        style="width:100%;display:flex;align-items:center;gap:12px;text-align:left;"
        @click="emit('slides')"
      >
        <span style="font-family:'Space Mono',monospace;font-size:10.5px;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:3px 6px;">.slja</span>
        Slide Louvor JA
        <span style="flex:1;" />
        <span v-if="slidesBusy" style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;color:var(--muted);">
          <span class="cpv-spin" style="width:14px;height:14px;" />gerando…
        </span>
      </button>
    </div>
  </div>
</template>
