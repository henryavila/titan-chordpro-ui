<script setup lang="ts">
defineProps<{ title: string }>()
const emit = defineEmits<{ readSong: [] }>()
</script>

<template>
  <div class="titan-chordpro-notation-fold">
    <span class="titan-chordpro-notation-title">{{ title }}</span>
    <button
      type="button"
      class="titan-chordpro-song-read is-on"
      data-leave-song
      @click.stop="emit('readSong')"
    >Cifra</button>
  </div>
</template>
