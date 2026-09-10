<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
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

/**
 * `?embed=1` puts the viewer inside a real iframe with the fullscreen permission;
 * `?embed=bloqueado` inside one where it is explicitly denied. It is the only
 * way to check that half of the embed contract from the device itself:
 * everything else about the two frames is identical, so whatever changes is the
 * permission and nothing else.
 *
 * The denial is spelled `allow="fullscreen 'none'"` rather than by leaving the
 * attribute out, and that is not a shortcut — measured in Chromium and WebKit,
 * a *same-origin* frame inherits the permission by default (the Permissions
 * Policy allowlist for `fullscreen` is `self`), so no attribute at all still
 * grants it. Only a cross-origin embed is refused by omission, and `'none'` is
 * how that state is reproduced from one origin. `sandbox` does not work here:
 * it makes the origin opaque, and the dev server then refuses the app's own
 * modules by CORS.
 */
const embed = params.get('embed')
/**
 * The SDA ficha is a light page, and a chart embedded in it has to be one too:
 * `?tema=claro|escuro` pins the viewer, which is what the host embedding it
 * would do through the `theme` prop.
 */
const tema = params.get('tema')
const hostTheme = tema === 'claro' ? 'light' : tema === 'escuro' ? 'dark' : 'auto'

const embedSrc = computed(() => {
  const q = new URLSearchParams(params)
  q.delete('embed')
  // The ficha is light, so the chart inside it is too — the host's decision,
  // carried here by the query string instead of a prop because the viewer is
  // behind an iframe.
  if (!q.has('tema')) q.set('tema', 'claro')
  return `?${q.toString()}`
})

/** What the host page knows about the song without parsing a chart itself. */
const fichaMeta = computed(() => readMeta(source.value))

/**
 * The host half of the frame-expansion contract, and the only way to try it
 * from a phone.
 *
 * An iframe cannot paint outside its own box, and iPhone Safari has no
 * Fullscreen API for elements — so in an embed there the viewer has no road to
 * the screen of its own. This is the road: the viewer asks, and the page that
 * owns the `<iframe>` puts that element over the viewport. Ten lines on the
 * host side, and the chart gets the whole phone.
 *
 * `?embed=bloqueado` deliberately declares nothing, so that route keeps showing
 * what a host that has not implemented this looks like: no button at all,
 * rather than one that lights up and moves nothing.
 */
const frame = ref<HTMLIFrameElement | null>(null)
const frameFull = ref(false)
const hostExpands = embed !== null && embed !== 'bloqueado'

function tellViewer(msg: Record<string, unknown>) {
  frame.value?.contentWindow?.postMessage({ source: 'titan-chordpro-host', ...msg }, '*')
}

function onViewerMessage(e: MessageEvent) {
  if (!frame.value || e.source !== frame.value.contentWindow) return
  const m = e.data as { source?: string; type?: string; on?: boolean } | null
  if (!m || typeof m !== 'object' || m.source !== 'titan-chordpro') return
  if (m.type === 'hello') {
    tellViewer({ type: 'capabilities', expandFrame: hostExpands })
    return
  }
  if (m.type === 'expand') {
    frameFull.value = m.on === true
    // Confirm, always: it is what lets the viewer follow a frame the host
    // collapses on its own.
    tellViewer({ type: 'expanded', on: frameFull.value })
  }
}

onMounted(() => {
  if (embed === null) return
  window.addEventListener('message', onViewerMessage)
  // A viewer that finished loading before this listener existed already sent
  // its `hello` into the void, so say it unprompted too.
  tellViewer({ type: 'capabilities', expandFrame: hostExpands })
})
onUnmounted(() => window.removeEventListener('message', onViewerMessage))

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
  <!-- A stand-in SDA ficha, not a frame on a blank page: the chart is one
       block inside a page that has its own sections above and below it, its own
       controls beside it, and its own light theme. That is the only shape in
       which "tela cheia" means anything — against a frame that already fills
       the screen there is nothing to win, and the demo would prove nothing.
       The frame's CSS is the recipe from docs/EMBED-SDA.md. -->
  <div v-if="embed" class="sda">
    <div class="sda-band">
      <p class="sda-label">Tempo ritmico</p>
      <p class="sda-value">4/4</p>
      <span class="sda-flag">demo · {{ embed === 'bloqueado' ? 'host NÃO expande' : 'host expande' }}</span>
    </div>

    <div class="sda-row">
      <p class="sda-label">Link externo</p>
      <a class="sda-link" href="#" @click.prevent>https://www.youtube.com/watch?v=9yZt5ekdceI</a>
    </div>

    <div class="sda-row">
      <div class="sda-tools">
        <span class="sda-tone">
          Tom da música <em>beta</em>
          <select><option>C</option><option>D</option><option>E</option></select>
          <select><option></option><option>capo 1</option></select>
        </span>
        <span class="sda-chips"><button>PDF</button><button>Chordpro</button></span>
      </div>

      <!-- The whole host side of it: one element, moved. -->
      <div class="sda-frame" :class="{ 'is-full': frameFull }">
        <iframe
          ref="frame"
          :src="embedSrc"
          :allow="embed === 'bloqueado' ? `fullscreen 'none'` : 'fullscreen'"
          title="Cifra"
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
 * The SDA ficha as it really looks: a light page of labelled bands, an accent
 * that is red, and the chart as one block among others. Nothing here is the
 * viewer's design — the point is that it is somebody else's.
 */
.sda {
  height: 100%;
  overflow-y: auto;
  background: #FFFFFF;
  color: #20242B;
  font-family: Sora, system-ui, -apple-system, sans-serif;
  -webkit-text-size-adjust: 100%;
}
/**
 * Every real site caps its content column, and that cap is what the embed
 * actually gets — a viewer that only ever saw a flexible host would never meet
 * the width it will live in.
 */
.sda-band > *,
.sda-row > * { max-width: 1040px; margin-left: auto; margin-right: auto; }
.sda-band,
.sda-row {
  padding: 22px 26px;
  border-bottom: 1px solid #E5E8EC;
  position: relative;
}
.sda-band { background: #F4F6F8; }
.sda-label {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #20242B;
}
.sda-value { margin: 0 0 4px; font-size: 14px; color: #6B7280; }
.sda-link {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
  color: #E8462F;
  text-decoration: none;
  word-break: break-all;
}
/* Not part of the SDA: which of the two hosts is being simulated. */
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
.sda-chips { display: flex; gap: 8px; }
.sda-chips button {
  font: inherit;
  font-size: 12.5px;
  color: #2C3340;
  background: #EEF1F5;
  border: 0;
  border-radius: 7px;
  padding: 7px 12px;
  cursor: pointer;
}
/**
 * The contract: a defined height on the frame's immediate ancestor. It is a
 * block the page scrolls past — the chart is part of the ficha, not the ficha —
 * which is exactly what makes a full screen worth asking for.
 *
 * The floor is not the 460px of `.cpv-root`: that is where the viewer stands,
 * not where it works. Measured on a 390px phone, the metronome sheet alone is
 * 552px tall, so a frame under that clips a control the reader came for.
 *
 * So the frame takes the whole screen height. The chart is still one block of
 * the ficha — the page scrolls past it, there are sections above and below —
 * but while it is on screen it gets every pixel of height there is, which is
 * the most any host can honestly give an embed.
 */
.sda-frame {
  height: 100dvh;
  min-height: 560px;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid #E5E8EC;
}
.sda-frame iframe { width: 100%; height: 100%; border: 0; display: block; }
/* And this is the whole expansion: one element, over the viewport. */
.sda-frame.is-full {
  position: fixed;
  inset: 0;
  height: 100%;
  min-height: 0;
  z-index: 2147483000;
  border: 0;
  border-radius: 0;
}

@media (max-width: 640px) {
  .sda-band,
  .sda-row { padding: 18px 16px; }
  .sda-flag { top: 15px; right: 16px; }
  .sda-tools { justify-content: flex-start; }
}
</style>
