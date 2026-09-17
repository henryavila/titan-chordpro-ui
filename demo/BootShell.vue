<script setup lang="ts">
withDefaults(defineProps<{ variant?: 'standalone' | 'site' }>(), {
  variant: 'standalone',
})
</script>

<template>
  <div
    class="cpv-boot"
    :data-boot-theme="variant"
    data-boot-shell
    role="status"
    aria-busy="true"
    aria-live="polite"
  >
    <div class="cpv-boot-head">
      <span class="cpv-boot-kicker">titan-chordpro-ui</span>
      <span class="cpv-boot-title">Cifra</span>
    </div>
    <div class="cpv-boot-page">
      <div class="cpv-boot-spin" aria-hidden="true" />
      <p class="cpv-boot-msg">Preparando a cifra…</p>
    </div>
  </div>
</template>

<style src="./boot-shell.css"></style>
