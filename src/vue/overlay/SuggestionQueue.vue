<script setup lang="ts">
import { computed, ref } from 'vue'
import { beatsInMeter, layoutChartFull, parse, type StrumPattern } from '@henryavila/titan-chordpro-ui'
import type { QueueOpCard, QueueReview, QueueRow } from '../use/useOverlay'
import ChartBody from '../chart/ChartBody.vue'
import CpvIcon from '../icon/CpvIcon.vue'
import StrumStrip from '../StrumStrip.vue'

const props = defineProps<{
  title: string
  showBack: boolean
  empty: boolean
  /** 1 = charts, 2 = requests for one chart, 3 = the adjustments of one request. */
  level: 1 | 2 | 3
  phone: boolean
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
  review?: QueueReview | null
}>()

const railOpen = ref(false)
const chartPane = ref<HTMLElement | null>(null)

const blocks = computed(() => {
  const source = props.review?.source
  if (!source) return []
  return layoutChartFull(parse(source), { lens: 'none', editing: false }).blocks
})

const reviewScale = {
  lyricPx: '17px',
  chordPx: '12px',
  shapePx: '11px',
  chordBox: '28px',
  chordBoxPlain: '16px',
  tabPx: '13px',
  tabLabelPx: '11px',
  tabRow: '22px',
  rowPad: '4px',
  blockGap: '14px',
}

function barBeatsOf(p: StrumPattern): number {
  return beatsInMeter(p.meter || '4/4')
}

function compareAt(list: StrumPattern[] | null | undefined, i: number): StrumPattern | null {
  if (!list?.length) return null
  return list[i] ?? list[0] ?? null
}

function focusOp(id: string) {
  const li = props.review?.opLine[id]
  if (li == null || !chartPane.value) return
  const node = chartPane.value.querySelector(`[data-review-li="${li}"]`)
  node?.scrollIntoView({ block: 'center' })
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
  <div data-queue class="cpv-q" style="position:absolute;inset:0;z-index:41;display:flex;flex-direction:column;background:var(--canvas);animation:cpv-fade .16s ease;">
    <div style="flex:none;display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line-soft);">
      <button
        v-if="showBack"
        aria-label="Voltar"
        data-q-back
        style="flex:none;width:32px;height:32px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--text);display:flex;align-items:center;justify-content:center;cursor:pointer;"
        @click="emit('back')"
      ><CpvIcon name="chevronLeft" :size="16" /></button>
      <span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;">
        <span style="font-size:9.5px;letter-spacing:0.16em;text-transform:uppercase;color:var(--muted);font-weight:700;">Sugestões dos músicos</span>
        <span style="font-size:15.5px;font-weight:700;color:var(--text);">{{ title }}</span>
        <span
          v-if="level === 3 && actorName"
          data-q-reviewer-actor
          style="font-size:12px;font-weight:600;color:var(--muted);"
        >De {{ actorName }}</span>
        <span v-if="level === 3 && review?.versionLabel" data-q-version style="font-size:12px;font-weight:700;color:var(--chord);">{{ review.versionLabel }}</span>
        <span v-if="level === 3 && review?.tuneLabel" data-q-tune style="font-size:12px;font-weight:600;color:var(--text);">{{ review.tuneLabel }}</span>
      </span>
      <button
        data-q-close
        style="flex:none;height:32px;padding:0 12px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--text);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;"
        @click="emit('close')"
      >Voltar à cifra</button>
    </div>

    <div v-if="level < 3" class="cpv-q-body">
      <span v-if="empty" style="font-size:12.5px;color:var(--muted);">Nenhuma sugestão pendente.</span>

      <button
        v-for="s in level === 1 ? songs : []"
        :key="s.key"
        class="cpv-surface-btn"
        data-q-song
        style="display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:56px;text-align:left;"
        @click="emit('pickSong', s.key)"
      >{{ s.label }}<span style="font-size:11.5px;font-weight:500;color:var(--muted);">{{ s.hint }}</span></button>

      <button
        v-for="s in level === 2 ? sugs : []"
        :key="s.key"
        class="cpv-surface-btn"
        data-q-sug
        style="display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:56px;text-align:left;"
        @click="emit('pickSug', s.key)"
      >
        <span style="display:flex;flex-direction:column;gap:2px;min-width:0;">
          <span v-if="s.actor" data-q-actor style="font-size:13px;font-weight:700;">{{ s.actor }}</span>
          <span>{{ s.actor ? s.hint : s.label }}</span>
        </span>
        <span v-if="!s.actor" style="font-size:11.5px;font-weight:500;color:var(--muted);">{{ s.hint }}</span>
      </button>
    </div>

    <div v-else class="cpv-q-review" :class="{ 'is-wide': !phone }">
      <div ref="chartPane" class="cpv-q-chart" data-q-chart>
        <p v-if="review?.dirty" data-q-draft class="cpv-q-draft">O rascunho desta versão não entra nesta revisão.</p>
        <p v-if="review?.missing" data-q-missing class="cpv-q-missing">Esta versão não existe mais</p>
        <p v-if="review?.foreign" data-q-foreign class="cpv-q-missing">Abra essa música para aceitar o pedido</p>
        <ChartBody
          v-if="!review?.missing && !review?.foreign && blocks.length"
          v-bind="reviewScale"
          :blocks="blocks"
          :review-lines="review?.mine ?? null"
          :struck-lines="review?.struck ?? null"
        />
      </div>

      <aside class="cpv-q-rail" :class="{ 'is-open': railOpen || !phone }" data-q-rail>
        <div class="cpv-q-batch" data-q-batch>
          <div v-if="previewStrum?.length" class="cpv-q-strum" data-q-strum-preview>
            <StrumStrip
              v-for="(p, i) in previewStrum"
              :key="`${p.label}-${i}`"
              :pattern="p"
              :compare="compareAt(officialStrum, i)"
              :bar-beats="barBeatsOf(p)"
            />
            <span v-if="officialStrum?.length" class="cpv-q-strum-legend">Destaque = mudou · seta riscada = era</span>
          </div>
          <div class="cpv-q-batch-head">
            <span data-q-count style="font-size:12.5px;font-weight:600;color:var(--text);">
              Preview: {{ batchApplies ?? 0 }} encaixam{{ (batchConflicts ?? 0) > 0 ? ` · ${batchConflicts} conflito(s)` : '' }}
            </span>
            <span class="cpv-q-batch-actions">
              <button
                data-q-refuse-batch
                style="height:32px;padding:0 11px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--muted);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;"
                @click="emit('refuseBatch')"
              >Recusar lote</button>
              <button
                v-if="!review?.missing"
                data-q-accept-batch
                :disabled="!!review?.dirty || (!(batchApplies ?? 0) && !review?.foreign)"
                style="height:32px;padding:0 12px;border:0;border-radius:10px;background:var(--pill);color:var(--pill-ink);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;"
                @click="emit('acceptBatch')"
              >Aceitar lote</button>
            </span>
          </div>
        </div>

        <div
          v-for="op in ops"
          :key="op.id"
          data-q-op
          style="display:flex;flex-wrap:wrap;align-items:flex-start;gap:10px;padding:12px;border:1px solid var(--line-soft);border-radius:13px;background:var(--surface);"
        >
          <button
            type="button"
            data-q-op-focus
            style="flex:1 1 180px;min-width:0;display:flex;flex-direction:column;gap:5px;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;"
            @click="focusOp(op.id)"
          >
            <span style="font-size:12.5px;font-weight:600;color:var(--text);">{{ op.label }}</span>
            <template v-if="!op.strum">
              <span class="cpv-op-line" style="color:var(--muted);white-space:normal;">{{ op.from }}</span>
              <span class="cpv-op-line" style="color:var(--chord);white-space:normal;">{{ op.to }}</span>
            </template>
            <span v-if="op.note" style="font-size:10.5px;color:var(--muted);">{{ op.note }}</span>
            <span v-if="op.warn" style="font-size:10.5px;font-weight:600;color:var(--danger);">{{ op.warn }}</span>
            <div v-if="op.strum" class="cpv-q-strum" data-q-strum>
              <StrumStrip
                v-for="(p, i) in (op.strum.proposed.length ? op.strum.proposed : op.strum.previous)"
                :key="`${p.label}-${i}`"
                :pattern="p"
                :compare="op.strum.proposed.length ? compareAt(op.strum.previous, i) : undefined"
                :removed="op.strum.proposed.length === 0"
                :bar-beats="barBeatsOf(p)"
              />
            </div>
          </button>
          <span style="flex:none;display:flex;align-items:center;gap:6px;">
            <button
              data-q-refuse
              style="height:32px;padding:0 11px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--muted);font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;"
              @click="emit('refuse', op.id)"
            >Recusar</button>
            <button
              v-if="!review?.missing"
              data-q-accept
              :disabled="!!review?.dirty || (!op.fits && !review?.foreign)"
              style="height:32px;padding:0 12px;border:0;border-radius:10px;background:var(--pill);color:var(--pill-ink);font-family:inherit;font-size:12px;font-weight:700;cursor:pointer;"
              @click="emit('accept', op.id)"
            >Aceitar</button>
          </span>
        </div>
      </aside>

      <div v-if="phone" class="cpv-q-dock" data-q-dock>
        <span data-q-dock-count>{{ batchApplies ?? 0 }} encaixam · {{ batchConflicts ?? 0 }} conflito(s)</span>
        <button type="button" data-q-ops-toggle @click="railOpen = !railOpen">Ajustes</button>
        <button v-if="!review?.missing" type="button" data-q-dock-accept :disabled="!!review?.dirty || (!(batchApplies ?? 0) && !review?.foreign)" @click="emit('acceptBatch')">Aceitar lote</button>
        <button type="button" data-q-dock-refuse @click="emit('refuseBatch')">Recusar lote</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cpv-q-body {
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
.cpv-q-review {
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}
.cpv-q-review.is-wide {
  flex-direction: row;
}
.cpv-q-chart {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 16px 16px 24px;
}
.cpv-q-review:not(.is-wide) .cpv-q-chart {
  padding-bottom: 92px;
}
.cpv-q-draft,
.cpv-q-missing {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
}
.cpv-q-draft { color: var(--text); }
.cpv-q-missing { color: var(--danger); }
.cpv-q-rail {
  display: none;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  overflow: auto;
  padding: 12px;
  background: var(--canvas);
}
.cpv-q-review.is-wide .cpv-q-rail {
  display: flex;
  flex: 0 0 min(360px, 42%);
  border-left: 1px solid var(--line-soft);
}
.cpv-q-review:not(.is-wide) .cpv-q-rail.is-open {
  display: flex;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 64px;
  max-height: 68%;
  z-index: 2;
  border-top: 1px solid var(--line-soft);
  box-shadow: 0 -8px 24px color-mix(in srgb, var(--text) 12%, transparent);
}
.cpv-q-dock {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--line-soft);
  background: var(--canvas);
}
.cpv-q-dock button {
  height: 34px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--text);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.cpv-q-batch {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 12px;
  border: 1px solid var(--chord-edge);
  border-radius: 13px;
  background: var(--chord-soft);
}
.cpv-q-batch-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.cpv-q-batch-actions {
  display: flex;
  gap: 6px;
  flex: none;
}
.cpv-q-strum {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  width: 100%;
  max-width: 100%;
}
.cpv-q-strum-legend {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--muted);
}
:deep(.cpv-row.is-review) {
  background: color-mix(in srgb, var(--chord) 14%, transparent);
  border-radius: 8px;
}
:deep(.cpv-row.is-struck .cpv-lyric),
:deep(.cpv-row.is-struck .cpv-chord) {
  text-decoration: line-through;
  opacity: 0.55;
}
</style>
