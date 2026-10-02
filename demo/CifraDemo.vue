<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  AUDIO_ART_MEDIA_PX,
  convert,
  hashText,
  readMeta,
  setRehearsalAudio,
  writeMeta,
  type SaveStrumPresetPayload,
  type StrumPreset,
  type Suggestion,
} from '@henryavila/titan-chordpro-ui'
import refAudioUrl from './ref-nasce-cantado.m4a?url'
import refPlaybackUrl from './ref-nasce-playback.m4a?url'
import altAudioUrl from './ref-audio.wav?url'
import altPlaybackUrl from './ref-audio-playback.wav?url'
import refArtUrl from './ref-audio-art.jpg?url'
import { TitanChordpro } from '@henryavila/titan-chordpro-ui/vue'
import { catalogToFixtures, fetchPreviewCatalog } from './preview-catalog'
import {
  FAIL_ID,
  bundledImages,
  defaultSongId,
  loadAllFixtures,
  mergeCatalog,
  seedFixtures,
  songsFor,
} from './host/charts'
import { loadScoreImage, loadScoreImages, persistScoreImage } from './host/image-store'
import {
  DEMO_SUGGESTIONS_KEY, demoOfficialKey, persistDemoSuggestion,
  readDemoOfficial, readDemoSuggestions, writeDemoOfficial, writeDemoSuggestions,
} from './host/suggestion-store'
import BootShell from './BootShell.vue'
import HostSite from './host/HostSite.vue'
import { hostTheme, labQuery, palcoHref, writeEditMode, type Surface } from './host/recipe'

const props = defineProps<{ surface: Surface; lista: boolean }>()

const fixtures = ref(seedFixtures())
const { resolveImage: resolveBundled } = bundledImages()
/** Object URLs for images this browser already stored. The chart only keeps the name. */
const uploadedUrls = ref(new Map<string, string>())
function resolveImage(src: string) {
  return uploadedUrls.value.get(src) ?? resolveBundled(src)
}
function imageExt(file: File): string {
  const fromName = file.name.match(/\.(png|jpe?g|webp|gif)$/i)?.[0]?.toLowerCase()
  if (fromName === '.jpeg') return '.jpg'
  if (fromName) return fromName
  if (file.type === 'image/png') return '.png'
  if (file.type === 'image/webp') return '.webp'
  if (file.type === 'image/gif') return '.gif'
  return '.jpg'
}
async function uploadImage(file: File): Promise<{ ref: string }> {
  const refName = `uploads/${Date.now().toString(36)}${imageExt(file)}`
  await persistScoreImage(refName, file)
  const url = URL.createObjectURL(file)
  const next = new Map(uploadedUrls.value)
  next.set(refName, url)
  uploadedUrls.value = next
  return { ref: refName }
}
/** The same demo blob store also retains original notation files across reloads. */
async function uploadScore(file: File): Promise<{ ref: string }> {
  const ext = file.name.match(/\.(gp[345]?|gpx|xml|musicxml|mxl)$/i)?.[0]?.toLowerCase()
  if (!ext) throw new Error('Escolha um arquivo Guitar Pro ou MusicXML.')
  // randomUUID can be absent on HTTP/LAN previews. The reference is an
  // opaque filename; getRandomValues also works without a secure context.
  const id = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')
  const refName = `solos/${id}${ext}`
  await persistScoreImage(refName, file)
  const next = new Map(uploadedUrls.value)
  next.set(refName, URL.createObjectURL(file))
  uploadedUrls.value = next
  return { ref: refName }
}
const lab = labQuery(typeof location === 'undefined' ? '' : location.search)
/** Demo host: the personal overlay stays in ChartStore; the queue is host-owned. */
const suggestionQueue = ref<Suggestion[]>(readDemoSuggestions())
function updateSuggestionQueue(queue: Suggestion[]) {
  writeDemoSuggestions(queue)
  suggestionQueue.value = queue
}
function saveOfficial(text: string) {
  source.value = text
  officialSource.value = text
  writeDemoOfficial(id.value, text)
}
async function loadDemoAsset(reference: string, kind: 'score' | 'image' | 'audio') {
  const stored = kind === 'audio' ? null : await loadScoreImage(reference)
  if (stored) return { ...stored, filename: reference.split('/').at(-1) }
  const resolved = kind === 'audio' ? reference : resolveImage(reference)
  const url = new URL(resolved, document.baseURI)
  if (!['http:', 'https:', 'blob:'].includes(url.protocol)) throw new Error('Anexo inválido')
  const response = await fetch(url.href)
  if (!response.ok) throw new Error('Não foi possível abrir o anexo')
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') || undefined,
    filename: reference.split(/[/?#]/).filter(Boolean).at(-1),
  }
}
function onDemoStorage(event: StorageEvent) {
  if (event.key === DEMO_SUGGESTIONS_KEY) suggestionQueue.value = readDemoSuggestions()
  if (event.key === demoOfficialKey(id.value)) {
    const next = readDemoOfficial(id.value) ?? fixtures.value[id.value] ?? ''
    source.value = next
    officialSource.value = next
  }
}

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
function withAudio(cho: string, slot = 0) {
  if (!lab.audio || !cho.trim()) return cho
  const alt = slot % 2 === 1
  let next = setRehearsalAudio(cho, {
    ...(lab.audio === 'cantado' || lab.audio === 'ambos'
      ? { sung: alt ? altAudioUrl : refAudioUrl }
      : {}),
    ...(lab.audio === 'playback' || lab.audio === 'ambos'
      ? { playback: alt ? altPlaybackUrl : refPlaybackUrl }
      : {}),
    ...(lab.capa
      ? { art: { url: refArtUrl, width: AUDIO_ART_MEDIA_PX, height: AUDIO_ART_MEDIA_PX } }
      : {}),
  })
  const m = readMeta(next)
  if (!m.artist && !m.subtitle) {
    next = writeMeta(next, { ...m, artist: 'Hinário Adventista' })
  }
  return next
}

const initialOfficial = lab.criar ? '' : withAudio(readDemoOfficial(id.value) ?? fixtures.value[id.value] ?? '')
const source = ref(initialOfficial)
const officialSource = ref(initialOfficial)
const version = computed(() => `demo-${hashText(officialSource.value)}`)

function pick(next: string) {
  id.value = next
  source.value = withAudio(readDemoOfficial(next) ?? fixtures.value[next] ?? '')
  officialSource.value = source.value
}

const listaMode = computed(() => {
  // Authoring a missing chart is one song, not a rehearsal.
  if (lab.criar || !props.lista) return 'off' as const
  return lab.carga
})
const editMode = writeEditMode(lab)
const actorKey = editMode === 'local' ? 'demo-musico' : undefined
/** Only the lab `?ensaio=demanda` path asks for charts after open. */
const lazyLista = computed(() => listaMode.value === 'demanda')
const songs = computed(() => {
  const list = songsFor(fixtures.value, listaMode.value)
  if (!list || !lab.audio) return list
  return list.map((s, i) => ({
    ...s,
    source: s.source ? withAudio(s.source, i) : s.source,
  }))
})
const theme = computed(() => hostTheme(props.surface, lab.tema))
const liveHref = computed(() =>
  palcoHref(props.lista, typeof location === 'undefined' ? '' : location.search),
)
const meta = computed(() => readMeta(source.value))

const ccPages = import.meta.glob('../tests/helpers/cifraclub-pages/*.html', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>

async function capturedCifra(slug: string): Promise<string | null> {
  const hit = Object.entries(ccPages).find(([path]) => path.endsWith(`/${slug}.html`))
  if (!hit) return null
  return convert(await hit[1]()).source
}

const needsCorpus =
  !lab.criar && !lab.cc && (props.lista || !!(lab.song && !(lab.song in fixtures.value)))
const boot = ref(needsCorpus || !!lab.cc)

/**
 * Pretends an external API: a few seconds of wait so the skeleton and the
 * live prev/next/list can be felt. Juntas demos never call this.
 */
const loadSong = (songId: string) =>
  new Promise<string>((resolve, reject) => {
    const ms = 2200 + Math.floor(Math.random() * 1400)
    setTimeout(() => {
      if (songId === FAIL_ID) reject(new Error('rede'))
      else {
        const list = songsFor(fixtures.value, listaMode.value) ?? []
        const slot = Math.max(0, list.findIndex((s) => s.id === songId))
        resolve(withAudio(fixtures.value[songId] ?? '', slot))
      }
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

const readPdf = async (file: File) => {
  const { pdfText } = await import('@henryavila/titan-chordpro-ui/pdf')
  return pdfText(file)
}

const chartBind = computed(() => ({
  source: source.value,
  theme: theme.value,
  accent: lab.accent || 'verde',
  lens: lab.lens ?? undefined,
  hideComments: lab.hideComments,
  songId: id.value,
  version: listaMode.value === 'off' ? version.value : undefined,
  songs: songs.value,
  loadSong: lazyLista.value ? loadSong : undefined,
  fetchChart,
  fetchYoutubeDuration,
  readPdf,
  editMode,
  actorKey,
  resolveImage,
  uploadImage,
  uploadScore,
  resolveScore: resolveImage,
  loadBundleAsset: loadDemoAsset,
  persistSuggestion: persistDemoSuggestion,
  suggestionQueue: suggestionQueue.value,
  capabilities: { batidaPresets: true, debugSwipe: lab.zonas },
  strumPresets: strumPresets.value,
}))

const chartOn = {
  'update:source': (value: string) => {
    source.value = value
  },
  'save-content': saveOfficial,
  'update:suggestionQueue': updateSuggestionQueue,
  'save-strum-preset': onSaveStrumPreset,
}

onMounted(async () => {
  window.addEventListener('storage', onDemoStorage)
  try {
    const stored = await loadScoreImages().catch(() => [])
    const next = new Map(uploadedUrls.value)
    for (const row of stored) {
      if (!next.has(row.ref)) next.set(row.ref, URL.createObjectURL(row.blob))
    }
    uploadedUrls.value = next
    if (lab.cc) {
      const src = await capturedCifra(lab.cc)
      if (src) {
        id.value = lab.cc
        source.value = src
        officialSource.value = src
        return
      }
    }
    if (needsCorpus) {
      fixtures.value = mergeCatalog(fixtures.value, await loadAllFixtures())
      if (!lab.criar) {
        const next =
          lab.song && lab.song in fixtures.value ? lab.song : defaultSongId(fixtures.value)
        pick(next)
      }
    }
  } finally {
    boot.value = false
  }
  if (lab.cc) return
  const catalog = await fetchPreviewCatalog()
  if (!catalog) return
  fixtures.value = mergeCatalog(fixtures.value, catalogToFixtures(catalog))
  if (lab.criar) {
    pick('vazio')
    return
  }
  if (lab.song && lab.song in fixtures.value) pick(lab.song)
})
onUnmounted(() => window.removeEventListener('storage', onDemoStorage))
</script>

<template>
  <BootShell v-if="boot" :variant="surface" />

  <HostSite
    v-else-if="surface === 'site'"
    :title="meta.title || 'Cifra'"
    :subtitle="meta.subtitle ?? ''"
    :song-key="meta.key ?? ''"
    :lista="lista"
    :live-href="liveHref"
  >
    <TitanChordpro v-bind="chartBind" theme-control="host" v-on="chartOn" />
  </HostSite>

  <div
    v-else
    :data-surface="surface"
    :data-lista="lista ? '1' : '0'"
    :data-carga="listaMode"
    :style="lab.quebrar ? 'height:auto;' : 'height:100%;'"
  >
    <TitanChordpro v-bind="chartBind" v-on="chartOn" />
  </div>
</template>
