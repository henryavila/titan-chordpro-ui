<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useId } from 'vue'
import CpvIcon from '../icon/CpvIcon.vue'

const props = defineProps<{ modelValue: number; automaticLabel: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const open = ref(false)
const active = ref(0)
const listId = useId()
const options = computed(() => [
  { value: 0, label: `Automático (${props.automaticLabel})` },
  ...[1.1, 1.3, 1.5, 2].map(value => ({ value, label: `${Math.round(value * 100)}%` })),
])
const selected = computed(() => Math.max(0, options.value.findIndex(option => option.value === props.modelValue)))
async function focusOption(index: number) {
  active.value = index
  await nextTick()
  root.value?.querySelectorAll<HTMLElement>('[role="option"]')[index]?.focus()
}
function show() {
  open.value = true
  void focusOption(selected.value)
}
function close(restoreFocus = false) {
  open.value = false
  if (restoreFocus) trigger.value?.focus()
}
function choose(index: number) {
  emit('update:modelValue', options.value[index]!.value)
  close(true)
}
function onKeydown(event: KeyboardEvent) {
  const count = options.value.length
  let index = active.value
  if (event.key === 'ArrowDown') index = (index + 1) % count
  else if (event.key === 'ArrowUp') index = (index + count - 1) % count
  else if (event.key === 'Home') index = 0
  else if (event.key === 'End') index = count - 1
  else if (event.key === 'Escape') close(true)
  else if (event.key === 'Enter' || event.key === ' ') choose(index)
  else return
  event.preventDefault()
  event.stopPropagation()
  if (open.value) void focusOption(index)
}
function onPointerdown(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) close()
}
function onFocusout(event: FocusEvent) {
  if (!root.value?.contains(event.relatedTarget as Node | null)) close()
}
onMounted(() => document.addEventListener('pointerdown', onPointerdown))
onUnmounted(() => document.removeEventListener('pointerdown', onPointerdown))
</script>

<template>
  <div ref="root" class="cpv-score-zoom" @focusout="onFocusout">
    <button ref="trigger" type="button" class="cpv-score-zoom-trigger" aria-label="Zoom do solo"
      aria-haspopup="listbox" :aria-expanded="open" :aria-controls="open ? listId : undefined"
      @keydown.space.stop @keydown.enter.stop
      @click="open ? close() : show()" @keydown.down.prevent.stop="show" @keydown.up.prevent.stop="show">
      <span class="cpv-score-zoom-label">Zoom</span>
      <span>{{ options[selected]!.label }}</span>
      <CpvIcon name="chevronDown" :size="14" />
    </button>
    <div v-if="open" :id="listId" class="cpv-score-zoom-menu" role="listbox" aria-label="Zoom do solo"
      @keydown="onKeydown">
      <button v-for="(option, index) in options" :key="option.value" type="button" role="option"
        class="cpv-score-zoom-option" :aria-selected="modelValue === option.value"
        :tabindex="active === index ? 0 : -1" @click="choose(index)" @focus="active = index">
        <span>{{ option.label }}</span>
        <CpvIcon v-if="modelValue === option.value" name="check" :size="16" />
      </button>
    </div>
  </div>
</template>
