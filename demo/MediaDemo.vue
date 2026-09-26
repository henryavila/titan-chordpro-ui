<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { ChordproViewer } from '@henryavila/titan-chordpro-ui/vue'
import nasce from '../fixtures/sda/100-nasce-em-mim.cho?raw'
import sung from './ref-nasce-cantado.m4a?url'
import playback from './ref-nasce-playback.m4a?url'
import artUrl from './ref-audio-art.jpg?url'
import { AUDIO_ART_MEDIA_PX } from '@henryavila/titan-chordpro-ui'
import { MEDIA_DEMO_PAGE_TITLE, MEDIA_DEMO_SONG_ID, rehearsalChart } from './media-host'

document.title = MEDIA_DEMO_PAGE_TITLE

const includeChartArt =
  typeof location === 'undefined' || new URLSearchParams(location.search).get('capa') !== '0'

const defaultAudioArt = {
  url: artUrl,
  width: AUDIO_ART_MEDIA_PX,
  height: AUDIO_ART_MEDIA_PX,
}

const source = ref(
  rehearsalChart({
    chart: nasce,
    sung,
    playback,
    artUrl,
    includeArt: includeChartArt,
  }),
)

/** Host reads the public Media Session API — same thing the lock screen sees. */
function sessionSnap() {
  const ms = typeof navigator === 'undefined' ? undefined : navigator.mediaSession
  const meta = ms?.metadata
  const art = meta?.artwork?.[0]
  return {
    title: meta?.title ?? '',
    artist: meta?.artist ?? '',
    album: meta?.album ?? '',
    sizes: art?.sizes ?? '',
    state: ms?.playbackState || 'none',
  }
}

const snap = ref(sessionSnap())
let timer = 0
function tick() {
  snap.value = sessionSnap()
}
onMounted(() => {
  tick()
  timer = window.setInterval(tick, 250)
})
onUnmounted(() => {
  window.clearInterval(timer)
})
</script>

<template>
  <div class="media-demo" data-media-demo>
    <header class="media-demo-bar" data-media-session aria-live="polite">
      <p class="media-demo-kicker">Central de Mídia</p>
      <p class="media-demo-line">
        <span data-page-title>{{ MEDIA_DEMO_PAGE_TITLE }}</span>
        <span aria-hidden="true"> → </span>
        <span data-media-title>{{ snap.title || '…' }}</span>
      </p>
      <p class="media-demo-meta">
        <span data-media-artist>{{ snap.artist || '—' }}</span>
        ·
        <span data-media-album>{{ snap.album || '—' }}</span>
        ·
        <span data-media-art-sizes>{{ snap.sizes || '—' }}</span>
        ·
        <span data-media-state>{{ snap.state }}</span>
      </p>
    </header>
    <div class="media-demo-stage">
      <ChordproViewer
        :source="source"
        :song-id="MEDIA_DEMO_SONG_ID"
        :default-audio-art="defaultAudioArt"
        edit-mode="none"
        @update:source="source = $event"
      />
    </div>
  </div>
</template>

<style scoped>
.media-demo {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100dvh;
  background: #0b0d12;
  color: #eaecf2;
  font-family: Sora, system-ui, sans-serif;
}
.media-demo-bar {
  flex: none;
  padding:
    max(8px, env(safe-area-inset-top))
    max(12px, env(safe-area-inset-right))
    8px
    max(12px, env(safe-area-inset-left));
  background: #141820;
  border-bottom: 1px solid #2a3140;
}
.media-demo-kicker {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8b93a7;
}
.media-demo-line,
.media-demo-meta {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.35;
}
.media-demo-line {
  font-weight: 600;
}
.media-demo-meta {
  color: #8b93a7;
}
.media-demo-stage {
  flex: 1;
  min-height: 0;
  position: relative;
}
</style>
