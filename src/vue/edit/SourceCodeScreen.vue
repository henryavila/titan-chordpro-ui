<script setup lang="ts">
import { ref } from 'vue'
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'
import TitanChordproIconButton from '../ui/TitanChordproIconButton.vue'

const props = defineProps<{
  source: string
  /** Shown when the file holds more than one cifra. */
  note?: string
}>()

const emit = defineEmits<{
  close: []
  copied: []
  failed: []
}>()

const copied = ref(false)
const area = ref<HTMLTextAreaElement | null>(null)
let copiedT = 0

function markCopied() {
  copied.value = true
  emit('copied')
  window.clearTimeout(copiedT)
  copiedT = window.setTimeout(() => (copied.value = false), 1600)
}

async function copy() {
  const text = props.source
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard')
    await navigator.clipboard.writeText(text)
    markCopied()
  } catch {
    const el = area.value
    if (!el) {
      emit('failed')
      return
    }
    el.focus()
    el.select()
    const ok = document.execCommand('copy')
    if (ok) markCopied()
    else emit('failed')
  }
}
</script>

<template>
  <div class="titan-chordpro-source-screen" data-source-screen role="dialog" aria-modal="true" aria-label="Código fonte">
    <div class="titan-chordpro-source-screen-bar">
      <span class="titan-chordpro-source-screen-title">Código fonte</span>
      <span v-if="note" class="titan-chordpro-source-screen-note">{{ note }}</span>
      <button
        type="button"
        data-copy-source
        class="titan-chordpro-source-screen-copy"
        @click="copy"
      >
        <TitanChordproIcon name="copy" :size="14" />
        {{ copied ? 'Copiado' : 'Copiar' }}
      </button>
      <TitanChordproIconButton icon="x" muted aria-label="Fechar código fonte" @click="emit('close')" />
    </div>
    <textarea
      ref="area"
      class="titan-chordpro-source-screen-code"
      readonly
      spellcheck="false"
      aria-label="Código fonte da música"
      :value="source"
    />
  </div>
</template>
