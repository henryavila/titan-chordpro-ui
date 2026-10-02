<script setup lang="ts">
import { computed, ref } from 'vue'
import TitanChordproIconButton from './TitanChordproIconButton.vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** center: modal. sheet: bottom. anchor: no veil, chart stays live. workbench: wide editor. bleed: full frame. */
    variant?: 'center' | 'sheet' | 'anchor' | 'workbench' | 'bleed'
    compact?: boolean
    label: string
    kicker?: string
    closable?: boolean
    closeLabel?: string
    scrimClick?: boolean
    z?: number
    panelClass?: string
    rootClass?: string
    rootStyle?: Record<string, string>
    panelStyle?: Record<string, string>
    /** Hooks that must sit on the veil, such as data-batida-scrim. */
    scrimAttrs?: Record<string, string>
    /** Hooks that must sit on the overlay, such as data-setlist-overlay. */
    rootAttrs?: Record<string, string>
  }>(),
  {
    variant: 'center',
    compact: false,
    closable: true,
    closeLabel: 'Fechar',
    scrimClick: true,
  },
)

defineEmits<{
  close: []
}>()

const rootEl = ref<HTMLElement | null>(null)
defineExpose({ rootEl })

const closeDensity = computed(() => {
  if (props.variant === 'workbench') return 'workbench' as const
  if (props.variant === 'bleed') return 'import' as const
  if (props.compact || props.variant === 'sheet') return 'phone' as const
  return 'bar' as const
})

/** Workbench and bleed bring their own panel class. A dialog box would cap them at 400px. */
const panelKind = computed(() => {
  if (props.variant === 'sheet') return 'sheet' as const
  if (props.variant === 'workbench' || props.variant === 'bleed') return 'bare' as const
  return 'dialog' as const
})
</script>

<template>
  <div
    ref="rootEl"
    class="titan-chordpro-sheet"
    :class="[rootClass, `is-${variant}`, { 'is-compact': compact || variant === 'sheet' }]"
    :style="[z != null ? { zIndex: String(z) } : undefined, rootStyle]"
    v-bind="rootAttrs"
  >
    <div
      v-if="variant !== 'anchor'"
      class="titan-chordpro-scrim"
      v-bind="scrimAttrs"
      @click="scrimClick && $emit('close')"
    />
    <div
      :class="[
        panelKind === 'sheet' ? 'titan-chordpro-bottom-sheet' : panelKind === 'dialog' ? 'titan-chordpro-dialog' : '',
        'titan-chordpro-veil-2',
        panelClass,
      ]"
      :style="panelStyle"
      role="dialog"
      :aria-modal="variant === 'anchor' ? 'false' : 'true'"
      :aria-label="label"
      v-bind="$attrs"
    >
      <div v-if="kicker || closable || $slots.title" class="titan-chordpro-dialog-head">
        <slot name="title">
          <span v-if="kicker" class="titan-chordpro-modal-kicker">{{ kicker }}</span>
          <span v-else />
        </slot>
        <TitanChordproIconButton
          v-if="closable"
          icon="x"
          :density="closeDensity"
          muted
          title="Fechar"
          :aria-label="closeLabel"
          @click="$emit('close')"
        />
      </div>
      <slot />
    </div>
  </div>
</template>
