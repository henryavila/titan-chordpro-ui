<script setup lang="ts">
import { beatsInMeter, type StrumPattern } from '@henryavila/titan-chordpro-ui'
import type { QueueOpCard, QueueRow } from '../use/useOverlay'
import TitanChordproIcon from '../icon/TitanChordproIcon.vue'
import TitanChordproActionButton from '../ui/TitanChordproActionButton.vue'
import TitanChordproListRow from '../ui/TitanChordproListRow.vue'
import StrumStrip from '../StrumStrip.vue'
import ScoreReview from './ScoreReview.vue'

defineProps<{
  title: string
  showBack: boolean
  empty: boolean
  /** 1 = charts, 2 = requests for one chart, 3 = the adjustments of one request. */
  level: 1 | 2 | 3
  songs: QueueRow[]
  sugs: QueueRow[]
  ops: QueueOpCard[]
  actorName?: string
  previewStrum?: StrumPattern[] | null
  /** Official batida(s) — the preview strip diffs against these. */
  officialStrum?: StrumPattern[] | null
  /** How many open ops still apply cleanly (level 3). */
  batchApplies?: number
  batchConflicts?: number
  busy?: boolean
  resolveScore?: (src: string) => string
}>()

function barBeatsOf(p: StrumPattern): number {
  return beatsInMeter(p.meter || '4/4')
}

function compareAt(list: StrumPattern[] | null | undefined, i: number): StrumPattern | null {
  if (!list?.length) return null
  return list[i] ?? list[0] ?? null
}
const emit = defineEmits<{
  back: []
  close: []
  pickSong: [key: string]
  pickSug: [key: string]
  accept: [id: string]
  refuse: [id: string]
  acceptBatch: []
  refuseBatch: []
}>()
</script>

<template>
  <!-- Three levels, never a flat list: whoever owns the charts answers one
       song at a time, and each adjustment is accepted on its own. -->
  <div data-queue style="position:absolute;inset:0;z-index:41;display:flex;flex-direction:column;background:var(--canvas);animation:titan-chordpro-fade .16s ease;">
    <div style="flex:none;display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line-soft);">
      <button
        v-if="showBack"
        aria-label="Voltar"
        data-q-back
        style="flex:none;width:32px;height:32px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--text);display:flex;align-items:center;justify-content:center;cursor:pointer;"
        @click="emit('back')"
      ><TitanChordproIcon name="chevronLeft" :size="16" /></button>
      <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;">
        <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Sugestões dos músicos</span>
        <span style="font-size:15.5px;font-weight:700;color:var(--text);">{{ title }}</span>
        <span
          v-if="level === 3 && actorName"
          data-q-reviewer-actor
          style="font-size:12px;font-weight:600;color:var(--muted);"
        >De {{ actorName }}</span>
      </span>
      <button
        data-q-close
        style="flex:none;height:32px;padding:0 12px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--text);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;"
        @click="emit('close')"
      >Voltar à cifra</button>
    </div>

    <div class="titan-chordpro-q-body">
      <span v-if="empty" style="font-size:12.5px;color:var(--muted);">Nenhuma sugestão pendente.</span>

      <TitanChordproListRow
        v-for="s in level === 1 ? songs : []"
        :key="s.key"
        data-q-song
        :stack="false"
        @click="emit('pickSong', s.key)"
      >{{ s.label }}<span class="titan-chordpro-list-row-hint">{{ s.hint }}</span></TitanChordproListRow>

      <TitanChordproListRow
        v-for="s in level === 2 ? sugs : []"
        :key="s.key"
        data-q-sug
        :stack="false"
        @click="emit('pickSug', s.key)"
      >
        <span style="display:flex;flex-direction:column;gap:2px;min-width:0;">
          <span v-if="s.actor" data-q-actor style="font-size:13px;font-weight:700;">{{ s.actor }}</span>
          <span>{{ s.actor ? s.hint : s.label }}</span>
        </span>
        <span v-if="!s.actor" class="titan-chordpro-list-row-hint">{{ s.hint }}</span>
      </TitanChordproListRow>

      <div
        v-if="level === 3 && ops.length"
        class="titan-chordpro-q-batch"
        data-q-batch
      >
        <div class="titan-chordpro-q-batch-head">
          <span style="font-size:12.5px;font-weight:600;color:var(--text);">
            Preview: {{ batchApplies ?? 0 }} encaixam{{ (batchConflicts ?? 0) > 0 ? ` · ${batchConflicts} conflito(s)` : '' }}
          </span>
          <span class="titan-chordpro-q-batch-actions">
            <TitanChordproActionButton data-q-refuse-batch tone="ghost" size="sm" bordered :disabled="busy" @click="emit('refuseBatch')">Recusar lote</TitanChordproActionButton>
            <TitanChordproActionButton data-q-accept-batch tone="pill" size="sm" :disabled="busy" @click="emit('acceptBatch')">Aceitar lote</TitanChordproActionButton>
          </span>
        </div>
        <div v-if="previewStrum?.length" class="titan-chordpro-q-strum" data-q-strum-preview>
          <StrumStrip
            v-for="(p, i) in previewStrum"
            :key="`${p.label}-${i}`"
            :pattern="p"
            :compare="compareAt(officialStrum, i)"
            :bar-beats="barBeatsOf(p)"
          />
          <span
            v-if="officialStrum?.length"
            class="titan-chordpro-q-strum-legend"
          >Destaque = mudou · seta riscada = era</span>
        </div>
      </div>

      <div
        v-for="op in level === 3 ? ops : []"
        :key="op.id"
        data-q-op
        class="titan-chordpro-list-card"
      >
        <span style="flex:1 1 220px;min-width:0;display:flex;flex-direction:column;gap:5px;">
          <span style="font-size:12.5px;font-weight:600;color:var(--text);">{{ op.label }}</span>
          <ScoreReview v-for="(score, i) in op.scores" :key="i" :previous="score.previous" :proposed="score.proposed"
            :attachment="score.attachment" :resolve-score="resolveScore" />
          <template v-if="!op.strum">
            <span v-if="!op.scores.length || op.from !== '—'" class="titan-chordpro-op-line" style="color:var(--muted);white-space:normal;">{{ op.from }}</span>
            <span v-if="!op.scores.length || op.to !== '—'" class="titan-chordpro-op-line" style="color:var(--chord);white-space:normal;">{{ op.to }}</span>
          </template>
          <span v-if="op.note" style="font-size:10.5px;color:var(--muted);">{{ op.note }}</span>
          <span v-if="op.warn" style="font-size:10.5px;font-weight:600;color:var(--danger);">{{ op.warn }}</span>
          <div v-if="op.strum" class="titan-chordpro-q-strum" data-q-strum>
            <StrumStrip
              v-for="(p, i) in (op.strum.proposed.length ? op.strum.proposed : op.strum.previous)"
              :key="`${p.label}-${i}`"
              :pattern="p"
              :compare="op.strum.proposed.length ? compareAt(op.strum.previous, i) : undefined"
              :removed="op.strum.proposed.length === 0"
              :bar-beats="barBeatsOf(p)"
            />
            <span
              v-if="op.strum.previous.length && op.strum.proposed.length"
              class="titan-chordpro-q-strum-legend"
            >Destaque = mudou · seta riscada = era</span>
          </div>
        </span>
        <span style="flex:none;display:flex;align-items:center;gap:6px;">
          <TitanChordproActionButton data-q-refuse tone="ghost" size="sm" bordered :disabled="busy" @click="emit('refuse', op.id)">Recusar</TitanChordproActionButton>
          <TitanChordproActionButton data-q-accept tone="pill" size="sm" :disabled="busy || !op.fits" @click="emit('accept', op.id)">Aceitar</TitanChordproActionButton>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.titan-chordpro-q-body {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 14px 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: min(960px, 100%);
  width: 100%;
  margin: 0 auto;
}
.titan-chordpro-q-batch {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--chord-edge);
  border-radius: 13px;
  background: var(--chord-soft);
}
.titan-chordpro-q-batch-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.titan-chordpro-q-batch-actions {
  display: flex;
  gap: 6px;
  flex: none;
}
.titan-chordpro-q-strum {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  width: 100%;
  max-width: 100%;
}
.titan-chordpro-q-strum-legend {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--muted);
}
</style>
