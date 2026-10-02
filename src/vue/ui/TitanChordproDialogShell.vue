<script setup lang="ts">
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    compact?: boolean
    label: string
    kicker?: string
    closable?: boolean
    scrimClick?: boolean
    z?: number
    panelClass?: string
  }>(),
  { compact: false, closable: true, scrimClick: true },
)

defineEmits<{
  close: []
}>()
</script>

<template>
  <div class="titan-chordpro-sheet" :class="{ 'is-compact': compact }" :style="z != null ? { zIndex: z } : undefined">
    <div class="titan-chordpro-scrim" @click="scrimClick && $emit('close')" />
    <div
      class="titan-chordpro-dialog titan-chordpro-veil-2"
      :class="panelClass"
      role="dialog"
      aria-modal="true"
      :aria-label="label"
      v-bind="$attrs"
    >
      <div v-if="kicker || closable" class="titan-chordpro-dialog-head">
        <span v-if="kicker" class="titan-chordpro-modal-kicker">{{ kicker }}</span>
        <span v-else />
        <button
          v-if="closable"
          type="button"
          class="titan-chordpro-ghost titan-chordpro-icon-btn"
          aria-label="Fechar"
          style="color:var(--muted)"
          @click="$emit('close')"
        ><TitanChordproIcon name="x" :size="16" /></button>
      </div>
      <slot />
    </div>
  </div>
</template>
