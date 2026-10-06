<script setup lang="ts">
import { computed } from 'vue'
import type { ChartBlock } from '@henryavila/titan-chordpro-ui'

const props = defineProps<{
  block: ChartBlock
  shown: boolean
  domId: string
  tabRow: string
  tabLabelPx: string
  tabPx: string
  editing: boolean
}>()
const emit = defineEmits<{ editScore: [] }>()
const tab = computed(() => (props.block.kind === 'tab' ? props.block : null))
</script>

<template>
  <div v-if="tab" v-show="shown" :id="domId" class="titan-chordpro-tab">
    <div v-for="(ex, j) in tab.extras" :key="'e' + j" class="titan-chordpro-tab-extra">{{ ex }}</div>
    <div class="titan-chordpro-tab-staves">
      <div
        v-for="(st, j) in tab.staves"
        :key="j"
        class="titan-chordpro-tab-row"
        :style="{ height: tabRow }"
      >
        <span class="titan-chordpro-tab-label" :style="{ fontSize: tabLabelPx }">{{ st.label }}</span>
        <span class="titan-chordpro-tab-rule" />
        <span class="titan-chordpro-tab-tokens">
          <template v-for="(tk, k) in st.tokens" :key="k">
            <!-- The run sits in its own element: a whitespace-only text
                 run inside a flex box is dropped, and the stave rule and
                 the column alignment would go with it. -->
            <span v-if="tk.kind === 'gap'" class="titan-chordpro-tab-gap" :style="{ fontSize: tabPx }"><span>{{ tk.text }}</span></span>
            <span v-else-if="tk.kind === 'mark'" class="titan-chordpro-tab-mark" :style="{ fontSize: tabPx }"><span>{{ tk.text }}</span></span>
            <span v-else class="titan-chordpro-tab-bar" />
          </template>
        </span>
      </div>
    </div>
    <div v-if="editing" class="titan-chordpro-figure-cap" style="padding-top:8px;">
      <span style="flex:1;" />
      <button class="titan-chordpro-figure-btn titan-chordpro-figure-btn--go" type="button" @click="emit('editScore')">Editar</button>
    </div>
  </div>
</template>
