<script setup lang="ts">
import { ref, useId } from 'vue'
import ExportFileButton from './ExportFileButton.vue'
import TitanChordproDialogShell from '../ui/TitanChordproDialogShell.vue'
import TitanChordproSeg from '../ui/TitanChordproSeg.vue'
withDefaults(
  defineProps<{
    exportKeyNote: string
    pdfBusy: boolean
    hasNotation?: boolean
    pdfError?: string
    slidesBusy?: boolean
    ppsxBusy?: boolean
    bundleBusy?: boolean
    bundleError?: string
    /** Phone width: the dialog becomes a bottom sheet. */
    compact?: boolean
    /** The reader has a personal version: the file has to say which one it is. */
    hasOverlay?: boolean
    exportOrig?: boolean
    /** Name of the open version, when the song has more than one. */
    chartLabel?: string
  }>(),
  { compact: false, hasOverlay: false, exportOrig: false, slidesBusy: false, ppsxBusy: false },
)
const emit = defineEmits<{
  close: []
  cho: []
  pdf: [notation: 'tab' | 'score' | 'none']
  slides: []
  ppsx: []
  bundle: []
  pick: [orig: boolean]
}>()
const notationGroup = useId()
const confirmPdf = ref(false)
const notation = ref<'tab' | 'score' | 'none'>('score')
</script>

<template>
  <TitanChordproDialogShell
    :compact="compact"
    label="Exportar"
    :kicker="`Exportar ${exportKeyNote}`"
    @close="emit('close')"
  >
      <TitanChordproSeg
        v-if="hasOverlay"
        label="Qual versão exportar"
        :value="exportOrig ? 'orig' : 'mine'"
        :options="[
          { value: 'mine', label: 'Minha versão', attrs: { 'data-export-mine': '' } },
          { value: 'orig', label: 'Oficial', attrs: { 'data-export-orig': '' } },
        ]"
        @pick="emit('pick', $event === 'orig')"
      />
      <ExportFileButton id="cho" ext=".cho" label="ChordPro" :hint="chartLabel || undefined" @click="emit('cho')" />
      <ExportFileButton
        id="bundle"
        ext="ZIP"
        label="Cifra completa"
        hint="ChordPro, solos, imagens e áudios · offline"
        :busy="bundleBusy"
        :disabled="bundleBusy"
        @click="emit('bundle')"
      />
      <p v-if="bundleError" role="alert" style="font-size:13px;padding:0 4px">{{ bundleError }}</p>
      <ExportFileButton
        id="pdf"
        ext="PDF"
        label="Documento"
        :busy="pdfBusy"
        :disabled="pdfBusy"
        @click="hasNotation ? (confirmPdf = true) : emit('pdf', 'score')"
      />
      <div v-if="confirmPdf" style="padding:12px 2px" data-pdf-confirm>
        <fieldset :disabled="pdfBusy" style="border:0;padding:0;margin:0 0 12px">
          <legend style="font-weight:600;margin-bottom:10px">Solos de Guitar Pro/MusicXML no PDF</legend>
          <label v-for="choice in ([['tab', 'TAB'], ['score', 'Partitura'], ['none', 'Nenhum']] as const)"
            :key="choice[0]" style="display:inline-flex;align-items:center;gap:5px;margin-right:12px">
            <input v-model="notation" type="radio" :name="notationGroup" :value="choice[0]">{{ choice[1] }}
          </label>
        </fieldset>
        <button type="button" class="titan-chordpro-surface-btn" data-pdf-download :disabled="pdfBusy" @click="emit('pdf', notation)">
          {{ pdfBusy ? 'Gerando PDF…' : 'Gerar PDF' }}
        </button>
      </div>
      <p v-if="pdfError" role="alert" style="font-size:13px;padding:0 4px">{{ pdfError }}</p>
      <ExportFileButton id="slides" ext=".slja" label="Slide Louvor JA" :busy="slidesBusy" @click="emit('slides')" />
      <ExportFileButton
        id="ppsx"
        ext=".ppsx"
        label="PowerPoint"
        hint="Abre direto em apresentação · letra em caixa alta"
        :busy="ppsxBusy"
        @click="emit('ppsx')"
      />
  </TitanChordproDialogShell>
</template>
