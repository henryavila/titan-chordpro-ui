<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, useId } from 'vue'
import CpvIcon from '../icon/CpvIcon.vue'

const props = defineProps<{ modelValue: string | number; label: string; caption?: string; compact?: boolean; options: Array<{ value: string | number; label: string }> }>()
const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const open = ref(false)
const above = ref(false)
const menuShift = ref(0)
const menu = ref<HTMLElement | null>(null)
const menuHeight = ref(220)
const active = ref(0)
const listId = useId()
const options = computed(() => props.options)
const selected = computed(() => Math.max(0, options.value.findIndex(option => option.value === props.modelValue)))
async function focusOption(index: number) {
  active.value = index
  await nextTick()
  root.value?.querySelectorAll<HTMLElement>('[role="option"]')[index]?.focus()
}
async function show() {
  above.value = false
  menuShift.value = 0
  menuHeight.value = 220
  open.value = true
  await nextTick()
  const bounds = trigger.value?.getBoundingClientRect()
  if (bounds) {
    let left = 8
    let right = window.innerWidth - 8
    let top = 8
    let bottom = window.innerHeight - 8
    for (let parent = root.value?.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent)
      if (/(auto|scroll|hidden|clip)/.test(style.overflowX)) {
        const rect = parent.getBoundingClientRect()
        left = Math.max(left, rect.left + 8)
        right = Math.min(right, rect.right - 8)
      }
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY)) {
        const rect = parent.getBoundingClientRect()
        top = Math.max(top, rect.top + 8)
        bottom = Math.min(bottom, rect.bottom - 8)
      }
    }
    const menuBounds = menu.value?.getBoundingClientRect()
    if (menuBounds) menuShift.value = Math.max(left - menuBounds.left, Math.min(0, right - menuBounds.right))
    const belowSpace = bottom - bounds.bottom - 6
    const aboveSpace = bounds.top - top - 6
    const needed = Math.min(220, menu.value?.scrollHeight ?? 220)
    above.value = belowSpace < needed && aboveSpace > belowSpace
    menuHeight.value = Math.max(44, Math.min(220, above.value ? aboveSpace : belowSpace))
  }
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
  <div ref="root" class="cpv-score-zoom" :class="{ 'cpv-score-choice-compact': compact }" @focusout="onFocusout">
    <button ref="trigger" type="button" class="cpv-score-zoom-trigger" :aria-label="label" :title="`${label}: ${options[selected]!.label}`"
      aria-haspopup="listbox" :aria-expanded="open" :aria-controls="open ? listId : undefined"
      @keydown.space.stop @keydown.enter.stop
      @click="open ? close() : show()" @keydown.down.prevent.stop="show" @keydown.up.prevent.stop="show">
      <span v-if="caption !== ''" class="cpv-score-zoom-label">{{ caption ?? label }}</span>
      <span class="cpv-score-choice-value">{{ options[selected]!.label }}</span>
      <CpvIcon name="chevronDown" :size="14" />
    </button>
    <div v-if="open" ref="menu" :id="listId"
      :style="{ transform: `translateX(${menuShift}px)`, top: above ? 'auto' : undefined, bottom: above ? 'calc(100% + 6px)' : undefined, maxHeight: `${menuHeight}px`, overflowY: 'auto' }" class="cpv-score-zoom-menu" role="listbox" :aria-label="label"
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
