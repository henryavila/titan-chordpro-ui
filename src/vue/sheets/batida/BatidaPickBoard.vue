<script setup lang="ts">
import { computed } from 'vue'
import type { StrumSlot } from '@henryavila/titan-chordpro-ui'
import BatidaPickChoice from './BatidaPickChoice.vue'
import { pickBoard, pickDirWord } from './pick-model'

const props = defineProps<{
  choices: StrumSlot[]
  current: StrumSlot
}>()

const emit = defineEmits<{
  pick: [slot: StrumSlot]
}>()

const board = computed(() => pickBoard(props.choices))
</script>

<template>
  <!-- Dual direction: column Baixo | column Cima (never mix in one row). -->
  <div
    v-if="board.dualColumns"
    class="batida-pick-dirs"
    data-batida-pick-dirs
  >
    <div
      v-for="col in board.dualColumns"
      :key="col.dir"
      class="batida-pick-dir-col"
      :data-batida-dir-col="col.dir"
    >
      <div class="batida-pick-sec">{{ col.label }} · tocar</div>
      <BatidaPickChoice
        v-for="s in col.hits"
        :key="`${s.dir}-${s.essence}`"
        :value="s"
        :current="current"
        kind="hit"
        @pick="emit('pick', $event)"
      />
      <div class="batida-pick-sec">Passar</div>
      <BatidaPickChoice
        v-if="col.ghost"
        :value="col.ghost"
        :current="current"
        kind="ghost"
        sub="não tocar"
        @pick="emit('pick', $event)"
      />
    </div>
  </div>

  <!-- Single direction: 2-column option grid is fine. -->
  <template v-else>
    <div class="batida-pick-sec">Tocar</div>
    <div class="batida-pick-grid is-options">
      <BatidaPickChoice
        v-for="s in board.singleHits"
        :key="`${s.dir}-${s.essence}`"
        :value="s"
        :current="current"
        kind="hit"
        @pick="emit('pick', $event)"
      />
    </div>
    <div class="batida-pick-sec">Passar / não tocar</div>
    <div class="batida-pick-grid is-options">
      <BatidaPickChoice
        v-if="board.singleGhost"
        :value="board.singleGhost"
        :current="current"
        kind="ghost"
        :sub="`${pickDirWord(board.singleGhost)} · não tocar`"
        @pick="emit('pick', $event)"
      />
    </div>
  </template>
</template>

<style scoped>
.batida-pick-sec {
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  font-weight: 700;
  padding: 2px 2px 0;
}
.batida-pick-dirs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: start;
}
.batida-pick-dir-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.batida-pick-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.batida-pick-grid.is-options {
  grid-template-columns: 1fr 1fr;
}
</style>
