<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  memoryStore,
  readMeta,
  type SaveStrumPresetPayload,
  type StrumPreset,
} from '@henryavila/titan-chordpro-ui'
import { pdfText } from '@henryavila/titan-chordpro-ui/pdf'
import { ChordproViewer } from '@henryavila/titan-chordpro-ui/vue'
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
import { hostTheme, labQuery, palcoHref, writeModes, type Surface } from './host/recipe'

const props = defineProps<{ surface: Surface; lista: boolean }>()

const fixtures = ref(bundledFixtures())
const { images, resolveImage } = bundledImages()
const lab = labQuery(typeof location === 'undefined' ? '' : location.search)
/** Demo is ephemeral: reload clears prefs, overlay, and session edits. */
const store = memoryStore()

/**
 * Host-owned batida presets (demo stand-in for SDA storage).
 * The package emits `save-strum-preset`; the consumer persists and feeds the list back.
 */
const strumPresets = ref<StrumPreset[]>([])
function onSaveStrumPreset(payload: SaveStrumPresetPayload) {
  const id = payload.id?.trim() || `preset-${Date.now().toString(36)}`
  const next: StrumPreset = { id, label: payload.label, pattern: payload.pattern }
  const i = strumPresets.value.findIndex((p) => p.id === id)
  strumPresets.value =
    i >= 0
      ? strumPresets.value.map((p, idx) => (idx === i ? next : p))
      : [...strumPresets.value, next]
}

const id = ref(
  lab.criar
    ? 'vazio'
    : lab.song && lab.song in fixtures.value
      ? lab.song
      : defaultSongId(fixtures.value),
)
const source = ref(lab.criar ? '' : (fixtures.value[id.value] ?? ''))

function pick(next: string) {
  id.value = next
  source.value = fixtures.value[next] ?? ''
}

const listaMode = computed(() => {
  // Authoring a missing chart is one song, not a rehearsal.
  if (lab.criar || !props.lista) return 'off' as const
  return lab.carga
})
const modes = writeModes(lab)
/** Only the lab `?ensaio=demanda` path asks for charts after open. */
const lazyLista = computed(() => listaMode.value === 'demanda')
const songs = computed(() => songsFor(fixtures.value, listaMode.value))
const theme = computed(() => hostTheme(props.surface, lab.tema))
const liveHref = computed(() =>
  palcoHref(props.lista, typeof location === 'undefined' ? '' : location.search),
)
const meta = computed(() => readMeta(source.value))

/**
 * Pretends an external API: a few seconds of wait so the skeleton and the
 * live prev/next/list can be felt. Juntas demos never call this.
 */
const loadSong = (songId: string) =>
  new Promise<string>((resolve, reject) => {
    const ms = 2200 + Math.floor(Math.random() * 1400)
    setTimeout(() => {
      if (songId === FAIL_ID) reject(new Error('rede'))
      else resolve(fixtures.value[songId] ?? '')
    }, ms)
  })

const fetchChart = async (url: string) => {
  const r = await fetch('/__cifra_fetch?' + new URLSearchParams({ url }))
  if (!r.ok) throw new Error('rede')
  return r.text()
}

const fetchYoutubeDuration = async (videoId: string) => {
  const r = await fetch('/__youtube_duration?' + new URLSearchParams({ id: videoId }))
  if (!r.ok) throw new Error('rede')
  return r.text()
}

onMounted(async () => {
  const catalog = await fetchPreviewCatalog()
  if (!catalog) return
  fixtures.value = mergeCatalog(fixtures.value, catalogToFixtures(catalog))
  if (lab.criar) {
    pick('vazio')
    return
  }
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
      :accent="lab.accent || 'verde'"
      :lens="lab.lens || 'none'"
      :hide-comments="lab.hideComments"
      :song-id="id"
      :songs="songs"
      :storage="store"
      :load-song="lazyLista ? loadSong : undefined"
      :fetch-chart="fetchChart"
      :fetch-youtube-duration="fetchYoutubeDuration"
      :read-pdf="(file: File) => pdfText(file)"
      :modes="modes"
      :resolve-image="resolveImage"
      :images="images"
      :capabilities="{ batidaPresets: true }"
      :strum-presets="strumPresets"
      @update:source="source = $event"
      @save-content="source = $event"
      @save-strum-preset="onSaveStrumPreset"
    />
  </HostSite>

  <div
    v-else
    :data-surface="surface"
    :data-lista="lista ? '1' : '0'"
    :data-carga="listaMode"
    :style="lab.quebrar ? 'height:auto;' : 'height:100%;'"
  >
    <ChordproViewer
      :source="source"
      :theme="theme"
      :accent="lab.accent || 'verde'"
      :lens="lab.lens || 'none'"
      :hide-comments="lab.hideComments"
      :song-id="id"
      :songs="songs"
      :storage="store"
      :load-song="lazyLista ? loadSong : undefined"
      :fetch-chart="fetchChart"
      :fetch-youtube-duration="fetchYoutubeDuration"
      :read-pdf="(file: File) => pdfText(file)"
      :modes="modes"
      :resolve-image="resolveImage"
      :images="images"
      :capabilities="{ batidaPresets: true }"
      :strum-presets="strumPresets"
      @update:source="source = $event"
      @save-content="source = $event"
      @save-strum-preset="onSaveStrumPreset"
    />
  </div>
</template>
