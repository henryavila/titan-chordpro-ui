<script setup lang="ts">
import ChordproViewer from '../../src/vue/ChordproViewer.vue'
import { writeScoreReference } from '../../src/core'
import source from '../../fixtures/sda/084-escuta-meu-clamor.cho?raw'
import gpUrl from '../../fixtures/notation/bends.gp?url'
import xmlUrl from '../../fixtures/notation/bends.musicxml?url'
import audioUrl from '../../demo/ref-audio.wav?url'
import playbackUrl from '../../demo/ref-audio-playback.wav?url'
import imageUrl from '../../fixtures/assets/ele-vive-intro.png?url'
import pianoUrl from '../../fixtures/notation/piano.musicxml?url'
const params = new URLSearchParams(location.search)
const file = params.get('file')
const text = writeScoreReference({ src: file?.startsWith('piano') ? pianoUrl : file === 'xml' ? xmlUrl : gpUrl, track: 1, start: 1, ...(file === 'piano-long' ? {} : { end: 2 }) })
const base = file === 'piano-long' ? text + '\n' + source : source + '\n' + text
const chart = params.has('bundle') ? base + `\n{image: ${imageUrl}}\n{x_titan_audio_sung: ${audioUrl}}\n{x_titan_audio_playback: ${playbackUrl}}\n{x_titan_youtube: abc123}` : base
</script>
<template><div style="height:100dvh"><ChordproViewer :source="chart" :song-id="file ?? 'demo'" :auto-hide="false" theme="light" /></div></template>
