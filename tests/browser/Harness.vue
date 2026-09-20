<script setup lang="ts">
import { computed, ref } from 'vue'
import { setAudioArt, setAudioUrl } from '../../src/core'
import type { Lens } from '../../src/vue'
import { ChordproViewer } from '../../src/vue'
import raw from '../../fixtures/sda/084-escuta-meu-clamor.cho?raw'
import refAudio from '../../demo/ref-audio.wav?url'
import refArt from '../../demo/ref-audio-art.jpg?url'
import oRei from '../../fixtures/sda/082-o-rei-vem-vindo.cho?raw'
import jesus from '../../fixtures/sda/087-jesus-tu-es-a-minha-vida-sobe-o-tom-original.cho?raw'

const catalog = import.meta.glob('../../fixtures/sda/*.cho', {
  query: '?raw',
  eager: true,
  import: 'default',
}) as Record<string, string>

/**
 * Off by default so no test has to fight a chrome that vanishes under it; the
 * one test that is about the auto-hide asks for it with `?autoHide=1`.
 */
const q = new URLSearchParams(location.search)
const autoHide = q.get('autoHide') === '1'
/** The reported voiceless intro: editor spacing must match reading. */
const PLAYED =
  '{title:T}\n{key:G}\n\n{c:Intro}\n[G/D]x///   [D7(4)]x///    [G]x///    [C/E]x/    [D/F#]//\n'
function pickSource(): string {
  const name = q.get('chart')
  if (name === 'played') return PLAYED
  if (name && name !== '084') {
    const hit = Object.entries(catalog).find(([k]) => k.endsWith(`/${name}`) || k.endsWith(`/${name}.cho`))
    if (hit) return String(hit[1])
  }
  /** Scroll is gated on `{duration:}`. The default fixture has none; the harness adds one so layout tests can still roll. */
  return `{duration: 04:26}\n${raw}`
}
const source = (() => {
  const rawCho = pickSource()
  const mode = q.get('audio')
  if (!mode) return rawCho
  let next = rawCho
  if (mode === '1' || mode === 'ambos' || mode === 'cantado') {
    next = setAudioUrl(next, refAudio, 'cantado')
  }
  if (mode === '1' || mode === 'ambos' || mode === 'playback') {
    next = setAudioUrl(next, refAudio, 'playback')
  }
  return setAudioArt(next, refArt)
})()
const fitDefault = q.get('fit') !== '0'
const capoQ = q.get('capo')
const initialCapo = capoQ != null && capoQ !== '' ? Math.max(0, Math.min(9, Number(capoQ))) : undefined
const dualQ = q.get('dual')
const initialDual = dualQ === '0' ? false : dualQ === '1' ? true : undefined
const editMode = ref<'local' | 'persisted'>('persisted')
const fonts = ref('fallback')
async function loadFonts() {
  await Promise.all([import('@fontsource/figtree/400.css'), import('@fontsource/sora/400.css'), import('@fontsource/space-mono/700.css')])
  await Promise.all([document.fonts.load('18px Figtree'), document.fonts.load('18px Sora'), document.fonts.load('700 22px "Space Mono"')])
  fonts.value = 'loaded'
}
/**
 * `?ficha=1` is a real host page: blocks above and below the chart, and a
 * 100dvh frame in the flow. Default is the standalone page.
 */
const ficha = q.get('ficha') === '1'
const lista = q.get('lista')
const songs = computed(() => {
  if (lista === 'busca') {
    // Search only appears above 10 songs — enough real fixtures for the keyboard overlay test.
    return Object.entries(catalog)
      .slice(0, 12)
      .map(([path, source], i) => ({
        id: `s${i}`,
        title: path.split('/').pop()?.replace(/\.cho$/, '') ?? `Música ${i + 1}`,
        source: String(source),
      }))
  }
  if (lista === '1') {
    return [
      { id: 'o-rei', title: '082 - O Rei vem vindo', source: oRei },
      { id: 'jesus', title: 'Jesus, Tu És a minha vida', source: jesus },
    ]
  }
  return undefined
})
const theme = ref<'auto' | 'light' | 'dark'>('light')
const themeControl = ref<'host' | 'preference'>('host')
const lensQ = q.get('lens')
const lens: Lens =
  lensQ === 'letra' || lensQ === 'nashville' || lensQ === 'none' ? lensQ : 'none'
const hideComments = q.get('comentarios') === '0'
</script>
<template>
  <div
    id="host"
    :data-ficha="ficha ? '1' : '0'"
    :style="ficha
      ? 'font-family:Arial,sans-serif;height:100%;overflow-y:auto;scroll-snap-type:y proximity;background:#eef1f5'
      : 'font-family:Arial,sans-serif;height:100%;display:flex;flex-direction:column'"
  >
    <div
      v-if="ficha"
      id="host-above"
      style="padding:20px 16px;background:#fff;border-bottom:1px solid #ddd;min-height:280px"
    >
      <p id="host-nav" style="margin:0 0 12px;font-size:22px;font-weight:700">Ficha da música</p>
      <p style="margin:0 0 12px;color:#555;line-height:1.5">
        Letra, vídeo, avisos da banda e o restante do artigo da ficha. Isto não
        é um header: ocupa mais de uma tela no celular, e a cifra vem depois.
      </p>
      <p style="margin:0;color:#555;line-height:1.5">
        Mais um bloco acima — tom da reunião, escala, observações de arranjo —
        para o teste ver o chart nascer abaixo da dobra.
      </p>
    </div>
    <div
      id="host-tools"
      :style="ficha
        ? 'box-sizing:border-box;padding:12px 16px;background:#1a1d26;color:#fff;display:flex;align-items:center;gap:8px;flex-wrap:wrap'
        : 'flex:none;height:28px;overflow:hidden;display:flex;align-items:center;gap:6px;padding:0 8px;box-sizing:border-box'"
    >
      <button id="load-fonts" @click="loadFonts">Load fonts</button>
      <span id="fonts-state">{{ fonts }}</span>
      <select id="host-modes" v-model="editMode"><option>persisted</option><option>local</option></select>
      <select id="host-theme" v-model="theme"><option>light</option><option>dark</option><option>auto</option></select>
      <select id="host-control" v-model="themeControl"><option>host</option><option>preference</option></select>
    </div>
    <div
      id="host-frame"
      :style="ficha
        ? 'height:100dvh;min-height:560px;overflow:hidden;scroll-snap-align:start'
        : 'flex:1;min-height:0;position:relative'"
    >
      <ChordproViewer
        :source="source"
        :songs="songs"
        :theme="theme"
        :theme-control="themeControl"
        :lens="lens"
        :hide-comments="hideComments"
        :auto-hide="autoHide"
        :edit-mode="editMode"
        :fit-default="fitDefault"
        :initial-capo="initialCapo"
        :initial-dual="initialDual"
        song-id="sda-86"
      />
    </div>
    <div
      v-if="ficha"
      id="host-below"
      style="padding:24px 16px;background:#fff;border-top:1px solid #ddd;min-height:420px"
    >
      <p style="margin:0 0 8px;font-weight:700">Arquivos e histórico</p>
      <p style="margin:0;color:#555;line-height:1.5">
        Conteúdo abaixo da cifra: partituras, áudio, quem alterou, escalas.
        A ficha continua depois que a cifra termina.
      </p>
    </div>
  </div>
</template>
