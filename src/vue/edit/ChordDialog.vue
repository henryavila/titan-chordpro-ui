<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import TitanChordproDialogShell from '../ui/TitanChordproDialogShell.vue'

const props = defineProps<{
  modelValue: string
  /** Chord names already in this chart — the fastest way to name a new one. */
  vocab: string[]
  compact: boolean
  /** Whether to take the caret: never on touch, where the keyboard would cover the chart. */
  autofocus: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  apply: []
  remove: []
  close: []
}>()

const input = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  if (!props.autofocus) return
  await nextTick()
  input.value?.focus()
  input.value?.select()
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    emit('apply')
  } else if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation()
    emit('close')
  }
}
</script>

<template>
  <TitanChordproDialogShell
    variant="center"
    :compact="compact"
    :z="34"
    label="Acorde"
    kicker="Acorde"
    :closable="false"
    :root-attrs="{ 'data-chord-dialog': '' }"
    panel-class="titan-chordpro-modal-card"
    :panel-style="{
      maxWidth: compact ? '100%' : '340px',
      padding: compact ? '15px 15px 22px' : '15px',
      borderRadius: compact ? '20px 20px 0 0' : '18px',
    }"
    @close="emit('close')"
  >
      <input
        ref="input"
        data-chord-input
        class="titan-chordpro-chord-input"
        :value="modelValue"
        aria-label="Nome do acorde"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @keydown="onKey"
      >
      <div v-if="vocab.length" style="display:flex;flex-wrap:wrap;gap:5px;">
        <button
          v-for="v in vocab"
          :key="v"
          class="titan-chordpro-vocab-btn"
          type="button"
          @click="emit('update:modelValue', v)"
        >{{ v }}</button>
      </div>
      <div style="display:flex;gap:7px;">
        <button class="titan-chordpro-modal-btn titan-chordpro-modal-btn--danger" data-chord-remove type="button" @click="emit('remove')">Remover</button>
        <span style="flex:1;" />
        <button class="titan-chordpro-modal-btn" type="button" @click="emit('close')">Cancelar</button>
        <button class="titan-chordpro-modal-btn titan-chordpro-modal-btn--primary" data-chord-apply type="button" @click="emit('apply')">Aplicar</button>
      </div>
  </TitanChordproDialogShell>
</template>
