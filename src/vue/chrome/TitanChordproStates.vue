<script setup lang="ts">
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'
import TitanChordproSetlistNav from '../ui/TitanChordproSetlistNav.vue'

defineProps<{
  failing: boolean
  songLoading: boolean
  listEmpty: boolean
  isEmpty: boolean
  canStartNew: boolean
  fatal: string
  isLoading: boolean
  failTitle: string
  loadTitle: string
  posLabel: string
  noPrev: boolean
  noNext: boolean
  emptyTitle: string
}>()

const emit = defineEmits<{
  retry: []
  openList: []
  prev: []
  next: []
  start: [kind: 'import' | 'blank']
}>()
</script>

<template>
  <div v-if="failing" class="titan-chordpro-center" role="alert" data-song-fail>
    <div class="titan-chordpro-veil-2" style="width:100%;max-width:340px;display:flex;flex-direction:column;gap:14px;padding:20px;border-radius:18px;border:1px solid var(--line);box-shadow:var(--shadow);">
      <div style="display:flex;flex-direction:column;gap:6px;text-align:left;">
        <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--danger);font-weight:700;">Não carregou</span>
        <span style="font-size:15px;font-weight:600;letter-spacing:-0.015em;line-height:1.3;text-wrap:pretty;">{{ failTitle }}</span>
        <span style="font-size:12.5px;line-height:1.55;color:var(--muted);text-wrap:pretty;">Esta cifra não chegou. As outras da lista continuam disponíveis.</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <button
          data-song-retry
          style="height:44px;padding:0 16px;border:0;border-radius:13px;background:var(--chord);color:var(--chord-ink);font-family:inherit;font-size:13.5px;font-weight:700;cursor:pointer;"
          @click="emit('retry')"
        >Tentar de novo</button>
        <div class="titan-chordpro-song-fail-nav">
          <TitanChordproSetlistNav
            density="phone"
            :no-prev="noPrev"
            :no-next="noNext"
            :pos-label="posLabel"
            next-label="Lista"
            @prev="emit('prev')"
            @open-list="emit('openList')"
            @next="emit('next')"
          />
        </div>
      </div>
    </div>
  </div>

  <div
    v-else-if="songLoading"
    class="titan-chordpro-song-skel"
    data-song-loading
    role="status"
    :aria-label="`Buscando ${loadTitle || 'cifra'}`"
  >
    <div class="titan-chordpro-song-skel-head titan-chordpro-veil">
      <button data-setlist-open title="Abrir a lista do ensaio" class="titan-chordpro-song-skel-title" @click="emit('openList')">
        <span class="titan-chordpro-song-skel-pos">{{ posLabel }}</span>
        <span class="titan-chordpro-song-skel-name">
          <span>{{ loadTitle || '…' }}</span>
          <span>Buscando cifra…</span>
        </span>
      </button>
    </div>
    <div class="titan-chordpro-song-skel-page" aria-hidden="true">
      <div v-for="n in 6" :key="n" class="titan-chordpro-song-skel-row" :style="{ '--i': n }">
        <span class="titan-chordpro-song-skel-bar titan-chordpro-song-skel-chords" />
        <span class="titan-chordpro-song-skel-bar titan-chordpro-song-skel-lyric" />
      </div>
    </div>
    <div class="titan-chordpro-song-skel-dock titan-chordpro-veil">
      <TitanChordproSetlistNav
        density="phone"
        :no-prev="noPrev"
        :no-next="noNext"
        :pos-label="posLabel"
        next-label="Lista"
        @prev="emit('prev')"
        @open-list="emit('openList')"
        @next="emit('next')"
      />
    </div>
  </div>

  <div v-else-if="listEmpty" class="titan-chordpro-center" data-empty-setlist>
    <div class="titan-chordpro-ph" />
    <div style="font-size:15px;font-weight:600;">Nenhuma música na lista</div>
    <div style="font-size:13px;color:var(--muted);max-width:300px;line-height:1.55;">O ensaio ainda não tem repertório.</div>
  </div>

  <div v-else-if="isEmpty" class="titan-chordpro-center">
    <div v-if="canStartNew" style="width:100%;max-width:420px;display:flex;flex-direction:column;gap:16px;text-align:left;">
      <div style="display:flex;flex-direction:column;gap:7px;">
        <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--danger);font-weight:700;">Para todos</span>
        <span style="font-size:19px;font-weight:700;letter-spacing:-0.02em;line-height:1.25;">{{ emptyTitle }}</span>
        <span style="font-size:12.5px;line-height:1.55;color:var(--muted);text-wrap:pretty;">Ainda não existe cifra aqui. O que você criar vira a cifra do sistema — todos os músicos passam a ler assim.</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:9px;">
        <button
          data-start-import
          style="display:flex;align-items:center;gap:12px;width:100%;padding:14px;border:1px solid var(--chord-edge);border-radius:15px;background:var(--chord-soft);color:var(--text);font-family:inherit;text-align:left;cursor:pointer;"
          @click="emit('start', 'import')"
        >
          <span style="flex:none;width:34px;height:34px;border-radius:11px;background:var(--chord);color:var(--chord-ink);display:flex;align-items:center;justify-content:center;"><TitanChordproIcon name="fileInput" :size="16" /></span>
          <span style="display:flex;flex-direction:column;gap:3px;min-width:0;">
            <span style="font-size:14.5px;font-weight:700;">Importar</span>
            <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">Link do CifraClub, arquivo .cho ou PDF, ou texto colado — inclusive OnSong.</span>
          </span>
        </button>
        <button
          data-start-blank
          style="display:flex;align-items:center;gap:12px;width:100%;padding:14px;border:1px solid var(--line);border-radius:15px;background:transparent;color:var(--text);font-family:inherit;text-align:left;cursor:pointer;"
          @click="emit('start', 'blank')"
        >
          <span style="flex:none;width:34px;height:34px;border-radius:11px;border:1px dashed var(--line);display:flex;align-items:center;justify-content:center;color:var(--muted);"><TitanChordproIcon name="filePlus" :size="16" /></span>
          <span style="display:flex;flex-direction:column;gap:3px;min-width:0;">
            <span style="font-size:14.5px;font-weight:700;">Começar em branco</span>
            <span style="font-size:11.5px;line-height:1.45;color:var(--muted);text-wrap:pretty;">Digitar letra e acordes no editor, do zero.</span>
          </span>
        </button>
      </div>
    </div>
    <template v-else>
      <div class="titan-chordpro-ph" />
      <div style="font-size:15px;font-weight:600;">Nenhuma cifra carregada</div>
      <div style="font-size:13px;color:var(--muted);max-width:300px;line-height:1.55;">O host ainda não entregou uma fonte ChordPro para esta cifra.</div>
    </template>
  </div>

  <div v-else-if="fatal" class="titan-chordpro-center" role="alert">
    <div class="titan-chordpro-fatal-mark"><TitanChordproIcon name="alertTri" :size="22" /></div>
    <div style="font-size:15px;font-weight:600;">Não foi possível ler esta cifra</div>
    <div style="font-size:13px;color:var(--muted);max-width:340px;line-height:1.55;text-wrap:pretty;">{{ fatal }}</div>
  </div>

  <div v-else-if="isLoading" class="titan-chordpro-center">
    <div class="titan-chordpro-spin" />
    <div style="font-size:13px;color:var(--muted);">Preparando a cifra…</div>
  </div>
</template>
