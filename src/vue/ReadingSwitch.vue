<script setup lang="ts">
defineProps<{
  letra: boolean
  /** `bar` sits in the wide chrome; `dock` fills the phone dock row. */
  variant: 'bar' | 'dock'
  height?: string
}>()
defineEmits<{
  cifra: []
  letra: []
}>()
</script>

<template>
  <div
    class="cpv-reading"
    :class="`is-${variant}`"
    role="group"
    aria-label="Cifra ou letra"
    data-reading-switch
    title="Cifra ou letra (L)"
    :style="height ? { height } : undefined"
  >
    <button
      type="button"
      data-reading="cifra"
      :aria-pressed="letra ? 'false' : 'true'"
      :class="{ 'is-on': !letra }"
      @click="$emit('cifra')"
    >Cifra</button>
    <button
      type="button"
      data-reading="letra"
      :aria-pressed="letra ? 'true' : 'false'"
      :class="{ 'is-on': letra }"
      @click="$emit('letra')"
    >Letra</button>
  </div>
</template>
