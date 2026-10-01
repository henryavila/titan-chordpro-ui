<script setup lang="ts">
import { computed } from 'vue'
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'
import type { TitanChordproIconName } from '../icon/paths'
import type { BlockEditApi } from '../use/useBlockEdit'

const props = defineProps<{
  /** Source line where a block inserted from this button lands. */
  at: number
  edit: BlockEditApi
  items: Array<{ icon: TitanChordproIconName; label: string; go: () => void }>
  /** Last slot opens upward so the menu stays above the dock. */
  up?: boolean
}>()

const open = computed(
  () => props.edit.insertMenu.value && props.edit.insertAtLine.value === props.at,
)
</script>

<template>
  <div class="titan-chordpro-insert-slot" :class="{ 'is-open': open, 'is-up': up }">
    <span class="titan-chordpro-insert-rule" aria-hidden="true" />
    <button
      type="button"
      class="titan-chordpro-insert-plus"
      data-insert
      :data-insert-at="at"
      :aria-expanded="open ? 'true' : 'false'"
      aria-label="Inserir neste ponto"
      title="Inserir neste ponto"
      @click.stop="edit.openInsert(at)"
    >
      <TitanChordproIcon name="plus" :size="14" />
    </button>
    <span class="titan-chordpro-insert-rule" aria-hidden="true" />
    <div v-if="open" class="titan-chordpro-insert-menu titan-chordpro-veil-2" @click.stop>
      <div class="titan-chordpro-insert-where">Neste ponto</div>
      <button
        v-for="it in items"
        :key="it.label"
        class="titan-chordpro-insert-item"
        type="button"
        @click="it.go()"
      >
        <span><TitanChordproIcon :name="it.icon" :size="16" /></span>{{ it.label }}
      </button>
    </div>
  </div>
</template>
