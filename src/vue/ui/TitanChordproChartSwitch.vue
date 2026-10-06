<script setup lang="ts">
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
    <div v-if="open" class="titan-chordpro-chart-menu titan-chordpro-version-menu" role="dialog" aria-label="Versão">
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
