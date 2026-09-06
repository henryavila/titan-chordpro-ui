<script setup lang="ts">
import { ref } from 'vue'
import { ChordproViewer } from '../../src/vue'
import source from '../../fixtures/escuta-meu-clamor-sda-86.cho?raw'
const modes = ref<'local' | 'content'>('content')
const fonts = ref('fallback')
async function loadFonts() {
  await Promise.all([import('@fontsource/figtree/400.css'), import('@fontsource/sora/400.css'), import('@fontsource/space-mono/700.css')])
  await Promise.all([document.fonts.load('18px Figtree'), document.fonts.load('18px Sora'), document.fonts.load('700 22px "Space Mono"')])
  fonts.value = 'loaded'
}
const theme = ref<'auto' | 'light' | 'dark'>('light')
const themeControl = ref<'host' | 'preference'>('host')
</script>
<template>
  <div id="host" style="font-family:Arial,sans-serif;height:calc(100vh - 30px)">
    <button id="load-fonts" @click="loadFonts">Load fonts</button>
    <span id="fonts-state">{{ fonts }}</span>
    <select id="host-modes" v-model="modes"><option>content</option><option>local</option></select>
    <select id="host-theme" v-model="theme"><option>light</option><option>dark</option><option>auto</option></select>
    <select id="host-control" v-model="themeControl"><option>host</option><option>preference</option></select>
    <ChordproViewer :source="source" :theme="theme" :theme-control="themeControl" :auto-hide="false" :modes="modes" song-id="sda-86" />
  </div>
</template>
