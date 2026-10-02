<script setup lang="ts">
import TitanChordproActionButton from './TitanChordproActionButton.vue'

withDefaults(
  defineProps<{
    busy?: boolean
    acceptDisabled?: boolean
    refuseLabel?: string
    acceptLabel?: string
    refuseAttrs?: Record<string, string>
    acceptAttrs?: Record<string, string>
  }>(),
  { busy: false, acceptDisabled: false, refuseLabel: 'Recusar', acceptLabel: 'Aceitar' },
)

defineEmits<{
  refuse: []
  accept: []
}>()
</script>

<template>
  <span class="titan-chordpro-choice-pair">
    <TitanChordproActionButton
      v-bind="refuseAttrs"
      tone="ghost"
      size="sm"
      bordered
      :disabled="busy"
      @click="$emit('refuse')"
    >{{ refuseLabel }}</TitanChordproActionButton>
    <TitanChordproActionButton
      v-bind="acceptAttrs"
      tone="pill"
      size="sm"
      :disabled="busy || acceptDisabled"
      @click="$emit('accept')"
    >{{ acceptLabel }}</TitanChordproActionButton>
  </span>
</template>
