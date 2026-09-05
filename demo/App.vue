<script setup lang="ts">
import { ref } from 'vue'
import { ChordproViewer } from 'titan-chordpro-ui/vue'
import jesus1 from '../fixtures/jesus-tu-es-a-minha-vida-1.cho?raw'
import adoralo from '../fixtures/ministerio-tons/010-adoralo.cho?raw'
import eleVive from '../fixtures/ministerio-tons/013-ele-vive-em-mim.cho?raw'
import eleVivePartitura from '../fixtures/ministerio-tons/013-ele-vive-em-mim-partitura.cho?raw'
import emGratidao from '../fixtures/ministerio-tons/002-em-gratidao.cho?raw'
import ofertinha from '../fixtures/ministerio-tons/088-minha-ofertinha.cho?raw'

const fixtures: Record<string, string> = {
  'jesus-1': jesus1,
  adoralo,
  'ele-vive': eleVive,
  'ele-vive-img': eleVivePartitura,
  'em-gratidao': emGratidao,
  ofertinha,
  vazio: '',
}

// `{image:}` carries a reference, never a URL — the host resolves it. Here the
// demo maps `assets/<file>` onto the bundled fixture images.
const assets = import.meta.glob('../fixtures/assets/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>
const byName = new Map(
  Object.entries(assets).map(([path, url]) => [path.split('/').pop() ?? path, url]),
)
function resolveImage(src: string): string {
  return byName.get(src.split('/').pop() ?? src) ?? src
}

/** The scores this host can serve — what "Inserir · Imagem" offers to pick. */
const images = [...byName.keys()].map((file) => ({
  file,
  label: file.replace(/\.png$/, '').replace(/-/g, ' '),
}))

const id = ref('jesus-1')
const source = ref(fixtures[id.value] ?? '')

function pick(next: string) {
  id.value = next
  source.value = fixtures[next] ?? ''
}
</script>

<template>
  <div style="height:100%;position:relative;">
    <ChordproViewer
      :source="source"
      :song-id="id"
      modes="both"
      :resolve-image="resolveImage"
      :images="images"
      @update:source="source = $event"
    />
    <label style="position:absolute;top:8px;left:8px;z-index:50;display:flex;align-items:center;gap:6px;height:28px;padding:0 8px 0 10px;border-radius:9px;background:var(--veil,#10131A);border:1px solid var(--line,rgba(255,255,255,.1));color:var(--muted,#888F9E);font-family:Sora,system-ui,sans-serif;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;font-weight:700;backdrop-filter:blur(16px);">
      Demo
      <select :value="id" style="height:22px;border:0;background:transparent;color:var(--text,#EAECF2);font-family:inherit;font-size:11px;letter-spacing:0;text-transform:none;font-weight:600;" @change="pick(($event.target as HTMLSelectElement).value)">
        <option v-for="k in Object.keys(fixtures)" :key="k" :value="k">{{ k }}</option>
      </select>
    </label>
  </div>
</template>
