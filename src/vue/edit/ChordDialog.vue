<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'

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
  <div
    class="cpv-modal"
    data-chord-dialog
    :style="{ alignItems: compact ? 'flex-end' : 'center', padding: compact ? '0' : '20px' }"
  >
    <div class="cpv-scrim" @click="emit('close')" />
    <div
      class="cpv-veil-2 cpv-modal-card"
      role="dialog"
      aria-modal="true"
      aria-label="Acorde"
      :style="{
        maxWidth: compact ? '100%' : '340px',
        padding: compact ? '15px 15px 22px' : '15px',
        borderRadius: compact ? '20px 20px 0 0' : '18px',
      }"
    >
      <span class="cpv-modal-kicker">Acorde</span>
      <input
        ref="input"
        data-chord-input
        class="cpv-chord-input"
        :value="modelValue"
        aria-label="Nome do acorde"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @keydown="onKey"
      >
      <div v-if="vocab.length" style="display:flex;flex-wrap:wrap;gap:5px;">
        <button
          v-for="v in vocab"
          :key="v"
          class="cpv-vocab-btn"
          type="button"
          @click="emit('update:modelValue', v)"
        >{{ v }}</button>
      </div>
      <div style="display:flex;gap:7px;">
        <button class="cpv-modal-btn cpv-modal-btn--danger" data-chord-remove type="button" @click="emit('remove')">Remover</button>
        <span style="flex:1;" />
        <button class="cpv-modal-btn" type="button" @click="emit('close')">Cancelar</button>
        <button class="cpv-modal-btn cpv-modal-btn--primary" data-chord-apply type="button" @click="emit('apply')">Aplicar</button>
      </div>
    </div>
  </div>
</template>
