<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'standalone' | 'site' }>(), {
  variant: 'standalone',
})
</script>

<template>
  <div
    class="titan-chordpro-boot"
    :data-boot-theme="variant"
    data-boot-shell
    role="status"
    aria-busy="true"
    aria-live="polite"
  >
    <div class="titan-chordpro-boot-head">
      <span class="titan-chordpro-boot-kicker">titan-chordpro-ui</span>
      <span class="titan-chordpro-boot-title">Cifra</span>
    </div>
    <div class="titan-chordpro-boot-page">
      <div class="titan-chordpro-boot-spin" aria-hidden="true" />
      <p class="titan-chordpro-boot-msg">Preparando a cifra…</p>
    </div>
  </div>
</template>

<style src="./boot-shell.css"></style>
