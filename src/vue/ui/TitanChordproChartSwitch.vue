<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'
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

let resizeObserver: ResizeObserver | null = null
let resizeHandler: (() => void) | null = null

function measure() {
  if (typeof window === 'undefined') return
  const el = menu.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  // The rect already carries the shift we applied, so take it back before
  // asking for the next one; otherwise a second measure sees a menu that
  // looks like it fits and undoes the shift.
  const applied = menuShift.value
  const left = rect.left - applied
  const right = rect.right - applied
  const root = el.closest('[data-titan-chordpro-root]')
  const limit = root instanceof HTMLElement ? root.getBoundingClientRect() : null
  const limitLeft = limit ? limit.left : 0
  const limitRight = limit ? limit.right : window.innerWidth
  menuShift.value = versionMenuOffset(left, right, limitLeft, limitRight, MENU_MARGIN)
}

function stopTracking() {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (resizeHandler && typeof window !== 'undefined') {
    window.removeEventListener('resize', resizeHandler)
  }
  resizeHandler = null
}

function startTracking() {
  const el = menu.value
  if (!el) return
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => measure())
    resizeObserver.observe(el)
  }
  if (typeof window !== 'undefined') {
    resizeHandler = () => measure()
    window.addEventListener('resize', resizeHandler)
  }
}

watch(
  open,
  async (isOpen) => {
    stopTracking()
    menuShift.value = 0
    if (!isOpen) return
    await nextTick()
    measure()
    startTracking()
  },
  { immediate: true },
)

onBeforeUnmount(stopTracking)

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
      class="titan-chordpro-head-chip titan-chordpro-chart-switch"
      :data-chart-edit-label="edit ? '' : undefined"
      aria-label="Versão"
      aria-haspopup="dialog"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="titan-chordpro-chart-switch-label">{{ label }}</span>
      <TitanChordproIcon
        name="chevronDown"
        :size="11"
        class="titan-chordpro-chart-switch-caret"
        :data-open="open ? '' : undefined"
      />
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
