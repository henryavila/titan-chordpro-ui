<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChordproViewer } from 'titan-chordpro-ui/vue'
import { readMeta, toPlain } from 'titan-chordpro-ui'
import { pdfText } from 'titan-chordpro-ui/pdf'
import { catalogToFixtures, fetchPreviewCatalog } from './preview-catalog'
const bundledRaw = import.meta.glob('../fixtures/**/*.{cho,chordpro,onsong}', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>
function idFromPath(path: string): string {
  const base = path.split('/').pop() ?? path
  return base.replace(/\.(cho|chordpro|onsong)$/i, '')
}
const bundled: Record<string, string> = {
  ...Object.fromEntries(Object.entries(bundledRaw).map(([path, src]) => [idFromPath(path), src])),
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

const DEFAULT_ID = bundled['escuta-meu-clamor-sda-86']
  ? 'escuta-meu-clamor-sda-86'
  : Object.keys(bundled).find((k) => k !== 'vazio') ?? 'vazio'
const id = ref(DEFAULT_ID)
const source = ref(fixtures.value[id.value] ?? '')

function pick(next: string) {
  id.value = next
  source.value = fixtures.value[next] ?? ''
}

// ------------------------------------------------------- rehearsal (setlist)

/**
 * `?ficha=1` is composition A: the Vue component inside a host page that has
 * its own chrome. Default (no query) is composition B: a standalone 100dvh
 * page. Same `<ChordproViewer>`, no iframe.
 *
 * A ficha de ensaio liga a lista sozinha (`juntas`); `?ensaio=off` desliga,
 * `?ensaio=demanda` testa cifra que chega depois.
 */
const ficha = params.get('ficha') === '1'
const ensaioParam = params.get('ensaio')
const setlist =
  ensaioParam === 'demanda'
    ? 'demanda'
    : ensaioParam === 'off'
      ? 'off'
      : ensaioParam === 'juntas' || (ficha && !ensaioParam)
        ? 'juntas'
        : 'off'
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
    const any = Object.entries(fixtures.value).find(([k, v]) => k !== 'vazio' && v.trim())?.[1] ?? ''
    setTimeout(() => resolve(toPlain(any)), 900)
  })

/** Flattens the frame the way a host embedding into a scrolling page would. */
const breakFrame = params.get('quebrar') === '1'

/**
 * The SDA ficha is a light page, and a chart embedded in it has to be one too:
 * `?tema=claro|escuro` pins the viewer, which is what the host embedding it
 * would do through the `theme` prop.
 */
const tema = params.get('tema')
const hostTheme = tema === 'claro' ? 'light' : tema === 'escuro' ? 'dark' : ficha ? 'light' : 'auto'

const liveHref = computed(() => {
  const q = new URLSearchParams(params)
  q.delete('ficha')
  if (setlist !== 'off' && !q.has('ensaio')) q.set('ensaio', setlist)
  const s = q.toString()
  return s ? `?${s}` : '?'
})

const fichaMeta = computed(() => readMeta(source.value))

onMounted(async () => {
  const wanted = params.get('song')
  if (wanted && wanted in fixtures.value) pick(wanted)
  const catalog = await fetchPreviewCatalog()
  if (!catalog) return
  // Keep the repo fixtures. Preview dir *adds* charts; it must not wipe the
  // setlist down to a single generated file.
  fixtures.value = { ...fixtures.value, ...catalogToFixtures(catalog) }
  if (wanted && wanted in fixtures.value) pick(wanted)
})
</script>

<template>
  <!-- Composition A: a real ficha — blocks above and below the chart.
       The frame is 100dvh in the page flow. Scroll parks it on the
       viewport (snap), dock included. `?ficha=1`. -->
  <div v-if="ficha" class="sda">
    <div class="sda-band">
      <p class="sda-label">Tempo ritmico</p>
      <p class="sda-value">4/4</p>
      <p class="sda-title">{{ fichaMeta.title || 'Cifra' }}</p>
      <p v-if="fichaMeta.subtitle" class="sda-value">{{ fichaMeta.subtitle }}</p>
      <span class="sda-flag">demo · ficha{{ setlist !== 'off' ? ' · ensaio' : '' }}</span>
    </div>

    <div class="sda-row">
      <p class="sda-label">Link externo</p>
      <a class="sda-link" href="#" @click.prevent>https://www.youtube.com/watch?v=9yZt5ekdceI</a>
    </div>

    <div class="sda-row">
      <div class="sda-tools">
        <span class="sda-tone">
          Tom da música <em>beta</em>
          <select>
            <option>{{ fichaMeta.key || 'C' }}</option>
            <option>C</option>
            <option>D</option>
            <option>E</option>
          </select>
          <select>
            <option></option>
            <option>capo 1</option>
          </select>
        </span>
        <span class="sda-chips">
          <a class="sda-live" :href="liveHref">Tocar ao vivo</a>
          <button>PDF</button>
          <button>Chordpro</button>
        </span>
      </div>

      <div class="sda-frame">
        <ChordproViewer
          :source="source"
          :theme="hostTheme"
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
      </div>
    </div>

    <div class="sda-band">
      <p class="sda-label">Arquivos</p>
      <a class="sda-link" href="#" @click.prevent>partitura-piano.pdf</a>
      <a class="sda-link" href="#" @click.prevent>audio-referencia.mp3</a>
    </div>

    <div class="sda-row">
      <p class="sda-label">Histórico</p>
      <p class="sda-value">Alterada há 3 dias, por Henry Avila</p>
      <p class="sda-value">Antes disso, há 2 meses</p>
    </div>

    <div class="sda-band">
      <p class="sda-label">Escalas</p>
      <p class="sda-value">Domingo, 9h — Domingo, 18h</p>
    </div>
  </div>

  <div v-else :style="breakFrame ? 'height:auto;' : 'height:100%;'">
    <ChordproViewer
      :source="source"
      :theme="hostTheme"
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

<style scoped>
/**
 * A real ficha: bands above and below, chart 100dvh in the flow.
 * Snap parks the frame on the viewport so the dock sits on the fold.
 */
.sda {
  height: 100%;
  overflow-y: auto;
  scroll-snap-type: y proximity;
  background: #FFFFFF;
  color: #20242B;
  font-family: Sora, system-ui, -apple-system, sans-serif;
  -webkit-text-size-adjust: 100%;
}
.sda-band > *,
.sda-row > * { max-width: 1040px; margin-left: auto; margin-right: auto; }
.sda-band,
.sda-row {
  padding: 22px 26px;
  border-bottom: 1px solid #E5E8EC;
}
.sda-band { background: #F4F6F8; }
.sda-band,
.sda-row {
  position: relative;
}
.sda-label {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #20242B;
}
.sda-title {
  margin: 8px 0 4px;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.sda-value { margin: 0 0 4px; font-size: 14px; color: #6B7280; line-height: 1.5; }
.sda-link {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  color: #E8462F;
  text-decoration: none;
  word-break: break-all;
}
.sda-flag {
  position: absolute;
  top: 18px;
  right: max(26px, calc((100% - 1040px) / 2));
  font: 700 9.5px/1 'Space Mono', monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8A919E;
  border: 1px solid #DCE0E6;
  border-radius: 999px;
  padding: 4px 8px;
}
.sda-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px 14px;
  margin-bottom: 16px;
}
.sda-tone { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #6B7280; }
.sda-tone em {
  font-style: normal;
  font-size: 11px;
  font-weight: 600;
  color: #E8462F;
  background: #FDECEA;
  border-radius: 5px;
  padding: 2px 6px;
}
.sda-tone select {
  font: inherit;
  font-size: 13px;
  color: #20242B;
  background: #FFFFFF;
  border: 1px solid #D5DAE1;
  border-radius: 8px;
  padding: 6px 8px;
  min-width: 62px;
}
.sda-chips { display: flex; gap: 8px; align-items: center; }
.sda-chips button,
.sda-live {
  font: inherit;
  font-size: 12.5px;
  color: #2C3340;
  background: #EEF1F5;
  border: 0;
  border-radius: 7px;
  padding: 7px 12px;
  cursor: pointer;
  text-decoration: none;
}
.sda-live { background: #E8462F; color: #fff; font-weight: 600; }
.sda-frame {
  height: 100dvh;
  min-height: 560px;
  overflow: hidden;
  scroll-snap-align: start;
  scroll-margin-top: 0;
  border-radius: 12px;
  border: 1px solid #E5E8EC;
}
@media (max-width: 640px) {
  .sda-band,
  .sda-row { padding: 18px 16px; }
  .sda-flag { top: 15px; right: 16px; }
  .sda-tools { justify-content: flex-start; }
}
</style>
