<script setup lang="ts">
import { bootShellHtml } from './boot-shell'

withDefaults(
  defineProps<{
    variant?: 'standalone' | 'site'
    title?: string
    message?: string
  }>(),
  {
    variant: 'standalone',
    title: 'Cifra',
    message: 'Preparando a cifra…',
  },
)
</script>

<template>
  <div style="display:contents" v-html="bootShellHtml(variant, title, message)"></div>
</template>

<style src="./boot-shell.css"></style>
