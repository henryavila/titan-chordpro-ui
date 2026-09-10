<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { readMeta, toPlain } from 'titan-chordpro-ui'
import { pdfText } from 'titan-chordpro-ui/pdf'
import { ChordproViewer } from 'titan-chordpro-ui/vue'
import { catalogToFixtures, fetchPreviewCatalog } from './preview-catalog'
import {
  FAIL_ID,
  bundledFixtures,
  bundledImages,
  defaultSongId,
  mergeCatalog,
  songsFor,
} from './host/charts'
import HostSite from './host/HostSite.vue'
import { hostTheme, labQuery, palcoHref, type Surface } from './host/recipe'

const props = defineProps<{ surface: Surface; lista: boolean }>()

const fixtures = ref(bundledFixtures())
const { images, resolveImage } = bundledImages()
const lab = labQuery(typeof location === 'undefined' ? '' : location.search)

const id = ref(
  lab.song && lab.song in fixtures.value ? lab.song : defaultSongId(fixtures.value),
)
const source = ref(fixtures.value[id.value] ?? '')

function pick(next: string) {
  id.value = next
  source.value = fixtures.value[next] ?? ''
}

const listaMode = computed(() => {
  if (!props.lista) return 'off' as const
  return lab.carga
})
const songs = computed(() => songsFor(fixtures.value, listaMode.value))
const theme = computed(() => hostTheme(props.surface, lab.tema))
const liveHref = computed(() =>
  palcoHref(props.lista, typeof location === 'undefined' ? '' : location.search),
)
const meta = computed(() => readMeta(source.value))

const loadSong = (songId: string) =>
  new Promise<string>((resolve, reject) => {
    setTimeout(() => {
      if (songId === FAIL_ID) reject(new Error('rede'))
      else resolve(fixtures.value[songId] ?? '')
    }, 900)
  })

const fetchChart = (url: string) =>
  new Promise<string>((resolve) => {
    void url
    const any =
      Object.entries(fixtures.value).find(([k, v]) => k !== 'vazio' && v.trim())?.[1] ?? ''
    setTimeout(() => resolve(toPlain(any)), 900)
  })

onMounted(async () => {
  const catalog = await fetchPreviewCatalog()
  if (!catalog) return
  fixtures.value = mergeCatalog(fixtures.value, catalogToFixtures(catalog))
  if (lab.song && lab.song in fixtures.value) pick(lab.song)
})
</script>

<template>
  <HostSite
    v-if="surface === 'site'"
    :title="meta.title || 'Cifra'"
    :subtitle="meta.subtitle ?? ''"
    :song-key="meta.key ?? ''"
    :lista="lista"
    :live-href="liveHref"
  >
    <ChordproViewer
      :source="source"
      :theme="theme"
      theme-control="host"
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
  </HostSite>

  <div
    v-else
    :data-surface="surface"
    :data-lista="lista ? '1' : '0'"
    :style="lab.quebrar ? 'height:auto;' : 'height:100%;'"
  >
    <ChordproViewer
      :source="source"
      :theme="theme"
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
