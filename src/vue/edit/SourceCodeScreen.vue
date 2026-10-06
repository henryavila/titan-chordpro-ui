<script setup lang="ts">
import { ref } from 'vue'
import CpvIcon from '../icon/CpvIcon.vue'

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
  <div class="cpv-source-screen" data-source-screen role="dialog" aria-modal="true" aria-label="Código fonte">
    <div class="cpv-source-screen-bar">
      <span class="cpv-source-screen-title">Código fonte</span>
      <span style="flex:1;" />
      <button
        type="button"
        data-copy-source
        class="cpv-source-screen-copy"
        @click="copy"
      >
        <CpvIcon name="copy" :size="14" />
        {{ copied ? 'Copiado' : 'Copiar' }}
      </button>
      <button type="button" class="cpv-ghost" aria-label="Fechar código fonte" @click="emit('close')">
        <CpvIcon name="x" :size="16" />
      </button>
      <span v-if="note" class="cpv-source-screen-note">{{ note }}</span>
    </div>
    <textarea
      ref="area"
      class="cpv-source-screen-code"
      readonly
      spellcheck="false"
      aria-label="Código fonte da música"
      :value="source"
    />
  </div>
</template>
