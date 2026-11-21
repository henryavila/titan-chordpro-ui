<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { versionMenuOffset } from './TitanChordproVersionMenuOffset'

export type ChartSwitchItem = { id: string; label: string; isDefault?: boolean }

const open = defineModel<boolean>('open', { default: false })

defineProps<{
  charts: ChartSwitchItem[]
  label: string
  /** Reading chip and edit chip share this piece. Edit adds the test hook. */
  edit?: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

/** Room kept between the menu and the edges of the root. */
const MENU_MARGIN = 8

const menu = ref<HTMLElement | null>(null)
const menuShift = ref(0)

function measure() {
  if (typeof window === 'undefined') return
  const el = menu.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const root = el.closest('[data-titan-chordpro-root]')
  const limit = root instanceof HTMLElement ? root.getBoundingClientRect() : null
  const left = limit ? limit.left : 0
  const right = limit ? limit.right : window.innerWidth
  menuShift.value = versionMenuOffset(rect.left, rect.right, left, right, MENU_MARGIN)
}

watch(
  open,
  async (isOpen) => {
    menuShift.value = 0
    if (!isOpen) return
    await nextTick()
    measure()
  },
  { immediate: true },
)

function choose(id: string) {
  open.value = false
  emit('select', id)
}
</script>

<template>
  <span class="titan-chordpro-version-chip">
    <button
      type="button"
      data-chart-switch
      class="titan-chordpro-head-chip"
      :data-chart-edit-label="edit ? '' : undefined"
      aria-label="Versão"
      @click="open = !open"
    >
      <span class="titan-chordpro-chart-switch-label">{{ label }}</span>
    </button>
    <div
      v-if="open"
      ref="menu"
      class="titan-chordpro-chart-menu titan-chordpro-version-menu titan-chordpro-veil-2"
      role="dialog"
      aria-label="Versão"
      :style="{ transform: `translateX(${menuShift}px)` }"
    >
      <button
        v-for="chart in charts"
        :key="chart.id"
        type="button"
        :data-chart-option="chart.id"
        class="titan-chordpro-version-row"
        @click="choose(chart.id)"
      >
        <slot name="row" :chart="chart">{{ chart.label }}</slot>
      </button>
      <slot />
    </div>
  </span>
</template>
