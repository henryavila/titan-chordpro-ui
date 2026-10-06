<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  applyCifraClubEnrich,
  MISSING_LABEL,
  proposeCifraClubEnrich,
  readMeta,
  rewriteToKey,
  trazerCcStrumChoice,
  writeMeta,
  youtubeEmbedUrl,
  type CcStrumChoice,
  type ChartMeta,
  type EnrichProposal,
} from '@henryavila/titan-chordpro-ui'
import TitanChordproActionButton from '../../ui/TitanChordproActionButton.vue'
import TitanChordproChip from '../../ui/TitanChordproChip.vue'
import { cifraReadFailed } from './cifra-url'
import CifraClubLink from './CifraClubLink.vue'
import { fillYoutubeDuration } from './youtube-duration'

/**
 * Completar com Cifra Club — meta only. Never replaces the chart body.
 * The address field is the same link Nova cifra uses to bring a page in.
 */
const props = withDefaults(
  defineProps<{
    compact: boolean
    source: string
    meta: ChartMeta
    fetchChart?: (url: string) => Promise<string>
    fetchYoutubeDuration?: (videoId: string) => Promise<string>
    online?: boolean
  }>(),
  { online: true },
)
const emit = defineEmits<{ apply: [source: string] }>()

type EnrichPhase = 'idle' | 'busy' | 'preview' | 'youtube' | 'error'
const enrichPhase = ref<EnrichPhase>('idle')
const enrichUrl = ref('')
const enrichErr = ref('')
const enrichNote = ref('')
const proposal = ref<EnrichProposal | null>(null)
const ytPick = ref<'remote' | 'local' | 'skip' | ''>('')
/** Batida conflict: Manter (default) vs Trazer CC. */
const strumPick = ref<'keep' | 'replace'>('keep')
const enrichRewrite = ref<'go' | 'keep' | null>(null)

const canFetch = computed(() => !!props.fetchChart)
const netOk = computed(() => props.online !== false)

const patchLabels = computed(() => {
  const p = proposal.value?.patch
  if (!p) return [] as string[]
  const out: string[] = []
  if (p.x_titan_strum) out.push('batida (x_titan_strum)')
  if (p.x_titan_source) out.push('origem')
  for (const k of ['title', 'subtitle', 'key', 'tempo', 'time', 'duration'] as const) {
    if (p[k]) out.push(MISSING_LABEL[k] ?? k)
  }
  return out
})

const strumConflictNote = computed(() => {
  const c = proposal.value?.strumConflict
  if (!c) return ''
  const loc = c.local.patterns[c.local.activeIndex] ?? c.local.patterns[0]
  const rem = c.remote.patterns[0]
  const localBit = loc
    ? `${loc.label || 'Padrão'}${loc.bpm != null ? ` · ${loc.bpm} bpm` : ''}`
    : 'local'
  const remoteBit =
    c.remote.patterns.length > 1
      ? `${c.remote.patterns.length} padrões CC`
      : rem
        ? `${rem.label || 'Padrão'}${rem.bpm != null ? ` · ${rem.bpm} bpm` : ''}`
        : 'CC'
  return `Batida local (${localBit}) e Cifra Club (${remoteBit}) — escolha Manter ou Trazer CC.`
})

function resetEnrich() {
  enrichPhase.value = 'idle'
  enrichErr.value = ''
  enrichNote.value = ''
  proposal.value = null
  ytPick.value = ''
  strumPick.value = 'keep'
  enrichRewrite.value = null
}

function onBlocked(message: string) {
  enrichErr.value = message
  if (message) enrichPhase.value = 'error'
}

async function onGo(url: string) {
  if (!props.fetchChart) return
  enrichUrl.value = url
  enrichPhase.value = 'busy'
  enrichErr.value = ''
  try {
    const html = await props.fetchChart(url)
    const live = writeMeta(props.source, props.meta)
    const p = proposeCifraClubEnrich(live, html, { url })
    proposal.value = p
    ytPick.value = ''
    strumPick.value = 'keep'
    if (p.youtube) {
      enrichPhase.value = 'youtube'
      enrichNote.value = p.capoWarning ?? ''
    } else {
      enrichPhase.value = 'preview'
      enrichNote.value = p.capoWarning ?? ''
    }
  } catch {
    enrichErr.value = cifraReadFailed('enrich').message
    enrichPhase.value = 'error'
  }
}

async function commitEnrich() {
  const p = proposal.value
  if (!p) return
  if (p.youtube && !ytPick.value) {
    enrichErr.value = 'Escolha qual vídeo usar, ou pule o YouTube'
    return
  }
  enrichPhase.value = 'busy'
  enrichErr.value = ''
  const youtubeId =
    ytPick.value === 'remote'
      ? p.youtube?.remoteId
      : ytPick.value === 'local'
        ? p.youtube?.localId
        : null
  const live = writeMeta(props.source, props.meta)
  let strum: CcStrumChoice = 'keep'
  if (p.strumConflict && strumPick.value === 'replace') {
    strum = trazerCcStrumChoice(p.strumConflict)
  }
  let next = applyCifraClubEnrich(live, p, { youtubeId: youtubeId || null, strum })
  let m = readMeta(next)
  if (youtubeId) m = await fillYoutubeDuration(m, youtubeId, props.fetchYoutubeDuration, { onlyIfEmpty: true })
  next = writeMeta(next, m)
  if (p.keyRewrite && enrichRewrite.value === 'go') {
    const done = rewriteToKey(next, p.keyRewrite.declaredKey)
    if (done?.changed) next = done.source
  }
  emit('apply', next)
}
</script>

<template>
  <div
    data-meta-enrich
    style="display:flex;flex-direction:column;gap:10px;padding:12px 14px;border-radius:15px;background:var(--surface);border:1px solid var(--line);"
  >
    <CifraClubLink
      v-model:url="enrichUrl"
      voice="enrich"
      :busy="enrichPhase === 'busy'"
      :online="netOk"
      :can-fetch="canFetch"
      :blocking-error="enrichPhase === 'error' ? enrichErr : ''"
      @blocked="onBlocked"
      @go="onGo"
    />

    <!-- YouTube ask -->
    <div
      v-if="enrichPhase === 'youtube' && proposal?.youtube"
      data-meta-enrich-youtube
      style="display:flex;flex-direction:column;gap:10px;padding-top:4px;"
    >
      <div style="display:flex;flex-direction:column;gap:4px;">
        <span style="font-size:12.5px;font-weight:700;">Qual vídeo é o certo?</span>
        <span data-meta-enrich-yt-title style="font-size:12px;color:var(--muted);">{{ proposal.youtube.songTitle }}</span>
      </div>
      <div :style="{ gridTemplateColumns: props.compact ? '1fr' : '1fr 1fr' }" style="display:grid;gap:10px;">
        <TitanChordproChip
          v-if="proposal.youtube.remoteId"
          static
          size="pad"
          data-meta-enrich-yt-remote
          :class="{ 'is-on': ytPick === 'remote' }"
          @click="ytPick = 'remote'"
        >
          <span style="font-size:11px;font-weight:700;">Cifra Club</span>
          <a
            :href="proposal.youtube.remoteUrl"
            target="_blank"
            rel="noopener noreferrer"
            data-meta-enrich-yt-remote-link
            style="font-size:10.5px;font-family:var(--titan-chordpro-font-chords,'Space Mono',monospace);color:var(--chord);text-decoration:none;word-break:break-all;"
            @click.stop
          >{{ proposal.youtube.remoteUrl }}</a>
          <div style="position:relative;width:100%;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#000;">
            <iframe
              :src="youtubeEmbedUrl(proposal.youtube.remoteId)"
              title="YouTube Cifra Club"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
              style="position:absolute;inset:0;width:100%;height:100%;border:0;"
            />
          </div>
          <TitanChordproChip
            data-meta-enrich-yt-pick-remote
            size="choice"
            :on="ytPick === 'remote'"
            @click.stop="ytPick = 'remote'"
          >Usar este</TitanChordproChip>
        </TitanChordproChip>
        <TitanChordproChip
          v-if="proposal.youtube.localId"
          static
          size="pad"
          data-meta-enrich-yt-local
          :class="{ 'is-on': ytPick === 'local' }"
          @click="ytPick = 'local'"
        >
          <span style="font-size:11px;font-weight:700;">Já na cifra</span>
          <a
            :href="proposal.youtube.localUrl"
            target="_blank"
            rel="noopener noreferrer"
            data-meta-enrich-yt-local-link
            style="font-size:10.5px;font-family:var(--titan-chordpro-font-chords,'Space Mono',monospace);color:var(--chord);text-decoration:none;word-break:break-all;"
            @click.stop
          >{{ proposal.youtube.localUrl }}</a>
          <div style="position:relative;width:100%;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#000;">
            <iframe
              :src="youtubeEmbedUrl(proposal.youtube.localId)"
              title="YouTube local"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
              style="position:absolute;inset:0;width:100%;height:100%;border:0;"
            />
          </div>
          <TitanChordproChip
            data-meta-enrich-yt-pick-local
            size="choice"
            :on="ytPick === 'local'"
            @click.stop="ytPick = 'local'"
          >Usar este</TitanChordproChip>
        </TitanChordproChip>
      </div>
      <button
        type="button"
        data-meta-enrich-yt-skip
        style="align-self:flex-start;height:30px;padding:0 10px;border:1px solid var(--line);border-radius:9px;background:transparent;color:var(--muted);font-family:inherit;font-size:11.5px;font-weight:600;cursor:pointer;"
        @click="ytPick = 'skip'"
      >Pular YouTube</button>
    </div>

    <!-- Preview patch -->
    <div
      v-if="(enrichPhase === 'preview' || enrichPhase === 'youtube') && proposal"
      data-meta-enrich-preview
      style="display:flex;flex-direction:column;gap:6px;"
    >
      <span v-if="patchLabels.length" style="font-size:12px;line-height:1.45;color:var(--text);">
        Vai preencher: <strong>{{ patchLabels.join(', ') }}</strong>
      </span>
      <span v-else style="font-size:12px;line-height:1.45;color:var(--muted);">Nada novo além do que você escolher no YouTube.</span>
      <span
        v-if="proposal.strumMissing"
        data-meta-enrich-no-strum
        style="font-size:12px;line-height:1.45;color:var(--muted);text-wrap:pretty;"
      >Cifra Club não traz batida nesta página (o menu Batidas pode aparecer vazio).</span>
      <div
        v-if="proposal.strumConflict"
        data-meta-enrich-strum-conflict
        style="display:flex;flex-direction:column;gap:8px;padding:10px 12px;border-radius:12px;background:var(--canvas);border:1px solid var(--line);"
      >
        <span style="font-size:12px;line-height:1.45;color:var(--text);text-wrap:pretty;">{{ strumConflictNote }}</span>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <TitanChordproChip data-meta-enrich-strum-keep size="choice" :on="strumPick === 'keep'" @click="strumPick = 'keep'">Manter</TitanChordproChip>
          <TitanChordproChip data-meta-enrich-strum-replace size="choice" :on="strumPick === 'replace'" @click="strumPick = 'replace'">Trazer CC</TitanChordproChip>
        </div>
        <span
          v-if="strumPick === 'replace' && (proposal.strumConflict.local.patterns.length > 1 || proposal.strumConflict.remote.patterns.length > 1)"
          style="font-size:11px;line-height:1.45;color:var(--muted);text-wrap:pretty;"
        >A batida ativa local fica como cópia nomeada; os padrões do Cifra Club entram ativos.</span>
      </div>
      <span
        v-for="c in proposal.conflicts"
        :key="c.key"
        data-meta-enrich-conflict
        style="font-size:11.5px;line-height:1.45;color:var(--muted);"
      >Mantido local: {{ MISSING_LABEL[c.key] ?? c.key }} {{ c.local }} (CC {{ c.remote }})</span>
      <span v-if="enrichNote || proposal.capoWarning" data-meta-enrich-capo style="font-size:11.5px;line-height:1.45;color:var(--muted);">{{ enrichNote || proposal.capoWarning }}</span>
      <div
        v-if="proposal.keyRewrite"
        data-meta-enrich-rewrite
        style="display:flex;flex-direction:column;gap:8px;padding:8px 0 0;"
      >
        <span style="font-size:12px;line-height:1.45;color:var(--muted);text-wrap:pretty;">
          Declarado: <strong style="color:var(--text);">{{ proposal.keyRewrite.declaredKey }}</strong>.
          Escrito: <strong style="color:var(--text);">{{ proposal.keyRewrite.writtenKey }}</strong>.
        </span>
        <TitanChordproChip data-meta-enrich-rewrite-go size="choice" :on="enrichRewrite === 'go'" @click="enrichRewrite = 'go'">Reescrever em {{ proposal.keyRewrite.declaredKey }}</TitanChordproChip>
        <TitanChordproChip data-meta-enrich-rewrite-keep size="choice" :on="enrichRewrite === 'keep'" @click="enrichRewrite = 'keep'">Manter</TitanChordproChip>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;padding-top:4px;">
        <TitanChordproActionButton
          data-meta-enrich-apply
          size="md"
          :disabled="Boolean(proposal.youtube && !ytPick)"
          @click="commitEnrich"
        >Trazer metadados</TitanChordproActionButton>
        <TitanChordproActionButton data-meta-enrich-cancel tone="ghost" @click="resetEnrich">Cancelar busca</TitanChordproActionButton>
      </div>
      <span v-if="enrichErr" data-meta-enrich-error style="font-size:12px;color:var(--danger);">{{ enrichErr }}</span>
    </div>
  </div>
</template>
