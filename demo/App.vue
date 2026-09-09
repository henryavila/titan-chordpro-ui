<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChordproViewer } from 'titan-chordpro-ui/vue'
import { readMeta, toPlain } from 'titan-chordpro-ui'
import { pdfText } from 'titan-chordpro-ui/pdf'
import { catalogToFixtures, fetchPreviewCatalog } from './preview-catalog'
import jesus1 from '../fixtures/jesus-tu-es-a-minha-vida-1.cho?raw'
import adoralo from '../fixtures/ministerio-tons/010-adoralo.cho?raw'
import eleVive from '../fixtures/ministerio-tons/013-ele-vive-em-mim.cho?raw'
import eleVivePartitura from '../fixtures/ministerio-tons/013-ele-vive-em-mim-partitura.cho?raw'
import emGratidao from '../fixtures/ministerio-tons/002-em-gratidao.cho?raw'
import ofertinha from '../fixtures/ministerio-tons/088-minha-ofertinha.cho?raw'

const bundled: Record<string, string> = {
  'jesus-1': jesus1,
  adoralo,
  'ele-vive': eleVive,
  'ele-vive-img': eleVivePartitura,
  'em-gratidao': emGratidao,
  ofertinha,
  vazio: '',
}
const fixtures = ref<Record<string, string>>({ ...bundled })

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

/**
 * No controls on top of the chart: the demo is the surface itself. What used to
 * be a picker is the query string — `?song=`, `?ensaio=juntas|demanda`,
 * `?quebrar=1` — so nothing overlays the thing being looked at.
 */
const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search)

const id = ref('jesus-1')
const source = ref(fixtures.value[id.value] ?? '')

function pick(next: string) {
  id.value = next
  source.value = fixtures.value[next] ?? ''
}

// ------------------------------------------------------- rehearsal (setlist)

const setlist = params.get('ensaio') === 'juntas' ? 'juntas' : params.get('ensaio') === 'demanda' ? 'demanda' : 'off'
const FAIL_ID = 'falha-de-rede'

const songs = computed(() => {
  if (setlist === 'off') return undefined
  const ids = Object.keys(fixtures.value).filter((k) => k !== 'vazio')
  const list = ids.map((k) => {
    const meta = readMeta(fixtures.value[k] ?? '')
    return {
      id: k,
      title: meta.title || k,
      subtitle: meta.subtitle ?? '',
      key: meta.key ?? '',
      ...(setlist === 'juntas' ? { source: fixtures.value[k] ?? '' } : {}),
    }
  })
  // One that never arrives, so the "Não carregou" panel is reachable.
  if (setlist === 'demanda') {
    list.splice(2, 0, { id: FAIL_ID, title: 'Cifra que não chega', subtitle: '', key: 'A' })
  }
  return list
})

/** Deliberately slow: the point is the chrome staying usable while it waits. */
const loadSong = (songId: string) =>
  new Promise<string>((resolve, reject) => {
    setTimeout(() => {
      if (songId === FAIL_ID) reject(new Error('rede'))
      else resolve(fixtures.value[songId] ?? '')
    }, 900)
  })

// ---------------------------------------------------------- new chart (import)

/**
 * The host's backend, mocked: the browser cannot reach another site from here.
 * It answers with a real chart flattened to plain text, so the import goes
 * through the actual converter rather than a shortcut.
 */
const fetchChart = (url: string) =>
  new Promise<string>((resolve) => {
    void url
    setTimeout(() => resolve(toPlain(fixtures.value['ele-vive'] ?? '')), 900)
  })

/** Flattens the frame the way a host embedding into a scrolling page would. */
const breakFrame = params.get('quebrar') === '1'

onMounted(async () => {
  const wanted = params.get('song')
  if (wanted && wanted in fixtures.value) pick(wanted)
  const catalog = await fetchPreviewCatalog()
  if (!catalog) return
  fixtures.value = catalogToFixtures(catalog)
  const keys = Object.keys(fixtures.value)
  const next = wanted && wanted in fixtures.value ? wanted : keys[0]
  if (next) pick(next)
})
</script>

<template>
  <div :style="breakFrame ? 'height:auto;' : 'height:100%;'">
    <ChordproViewer
      :source="source"
      :song-id="id"
      :songs="songs"
      :load-song="loadSong"
      :fetch-chart="fetchChart"
      :read-pdf="(file: File) => pdfText(file)"
      modes="both"
      :resolve-image="resolveImage"
      :images="images"
      @update:source="source = $event"
    />
  </div>
</template>
