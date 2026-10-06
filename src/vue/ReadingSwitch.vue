<script setup lang="ts">
defineProps<{
  letra: boolean
  /** Whole-song staff is available on this chart. */
  partitura: boolean
  partituraOn: boolean
  /** `bar` sits in the wide chrome; `dock` fills the phone dock row. */
  variant: 'bar' | 'dock'
  height?: string
}>()
defineEmits<{
  cifra: []
  letra: []
  partitura: []
}>()
</script>

<template>
  <div
    class="titan-chordpro-reading"
    :class="`is-${variant}`"
    role="group"
    :aria-label="partitura ? 'Cifra, letra ou partitura' : 'Cifra ou letra'"
    data-reading-switch
    :title="partitura ? 'Cifra, letra ou partitura (L)' : 'Cifra ou letra (L)'"
    :style="height ? { height } : undefined"
  >
    <button
      type="button"
      data-reading="cifra"
      :aria-pressed="letra || partituraOn ? 'false' : 'true'"
      :class="{ 'is-on': !letra && !partituraOn }"
      @click="$emit('cifra')"
    >Cifra</button>
    <button
      type="button"
      data-reading="letra"
      :aria-pressed="letra && !partituraOn ? 'true' : 'false'"
      :class="{ 'is-on': letra && !partituraOn }"
      @click="$emit('letra')"
    >Letra</button>
    <button
      v-if="partitura"
      type="button"
      data-reading="partitura"
      aria-label="Partitura da música"
      :aria-pressed="partituraOn ? 'true' : 'false'"
      :class="{ 'is-on': partituraOn }"
      @click="$emit('partitura')"
    >Partitura</button>
  </div>
</template>
