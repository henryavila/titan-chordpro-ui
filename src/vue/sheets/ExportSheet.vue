<script setup lang="ts">
import CpvIcon from '../icon/CpvIcon.vue'
withDefaults(
  defineProps<{
    exportKeyNote: string
    pdfBusy: boolean
    slidesBusy?: boolean
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
  pdf: []
  slides: []
  pick: [orig: boolean]
}>()
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
      <button
        data-export="pdf"
        class="cpv-surface-btn"
        style="width:100%;display:flex;align-items:center;gap:12px;text-align:left;"
        @click="emit('pdf')"
      >
        <span style="font-family:'Space Mono',monospace;font-size:10.5px;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:3px 6px;">PDF</span>
        Documento
        <span style="flex:1;" />
        <span v-if="pdfBusy" style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;color:var(--muted);">
          <span class="cpv-spin" style="width:14px;height:14px;" />gerando…
        </span>
      </button>
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
