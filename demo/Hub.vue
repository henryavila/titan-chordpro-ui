<script setup lang="ts">
import { GROUPS, demosOf } from './host/recipe'
</script>

<template>
  <div class="hub" data-demo-hub>
    <header class="hero">
      <p class="mark">titan-chordpro-ui</p>
      <h1>Demos</h1>
      <p class="lead">
        O mesmo <code>&lt;ChordproViewer&gt;</code>. Standalone ou no shell do
        consumer. Uma cifra ou uma apresentação ao vivo.
      </p>
    </header>

    <section
      v-for="group in GROUPS"
      :key="group.id"
      class="group"
      :data-group="group.id"
      :aria-labelledby="`g-${group.id}`"
    >
      <h2 :id="`g-${group.id}`">{{ group.title }}</h2>
      <p class="section-lead">{{ group.lead }}</p>
      <div class="grid">
        <article
          v-for="demo in demosOf(group.id)"
          :key="demo.id"
          class="card"
          :class="{ warn: demo.warn }"
          :data-demo="demo.id"
        >
          <p class="kicker">
            <span
              v-if="demo.swatch"
              class="swatch"
              :style="{ background: demo.swatch }"
              aria-hidden="true"
            />{{ demo.kicker }}
          </p>
          <h3>{{ demo.title }}</h3>
          <p class="why">{{ demo.blurb }}</p>
          <pre class="call" data-call>{{ demo.call }}</pre>
          <a class="go" :href="demo.href">Abrir</a>
          <nav v-if="demo.extra?.length" class="more">
            <a v-for="link in demo.extra" :key="link.href" :href="link.href">{{ link.label }}</a>
          </nav>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hub {
  box-sizing: border-box;
  width: 100%;
  max-width: 1120px;
  min-height: 100%;
  min-height: 100dvh;
  margin: 0 auto;
  padding:
    max(24px, env(safe-area-inset-top))
    max(16px, env(safe-area-inset-right))
    max(48px, env(safe-area-inset-bottom))
    max(16px, env(safe-area-inset-left));
  color: #eaecf2;
  font-family: Sora, system-ui, sans-serif;
  overflow-x: clip;
}
@media (min-width: 600px) {
  .hub {
    padding:
      max(40px, env(safe-area-inset-top))
      max(24px, env(safe-area-inset-right))
      max(64px, env(safe-area-inset-bottom))
      max(24px, env(safe-area-inset-left));
  }
}
@media (min-width: 960px) {
  .hub {
    padding:
      max(48px, env(safe-area-inset-top))
      max(28px, env(safe-area-inset-right))
      max(80px, env(safe-area-inset-bottom))
      max(28px, env(safe-area-inset-left));
  }
}
.hero {
  margin-bottom: clamp(28px, 5vw, 40px);
  min-width: 0;
}
.mark {
  margin: 0 0 10px;
  font: 700 11px/1 'Space Mono', ui-monospace, monospace;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #84dfa6;
}
h1 {
  margin: 0 0 12px;
  font-size: clamp(28px, 6vw, 44px);
  letter-spacing: -0.03em;
  font-weight: 700;
  text-wrap: balance;
}
.lead {
  margin: 0;
  max-width: 40rem;
  font-size: clamp(14.5px, 2.8vw, 16px);
  line-height: 1.55;
  color: #c4c9d4;
  text-wrap: pretty;
}
.lead code {
  font-family: 'Space Mono', ui-monospace, monospace;
  font-size: 0.92em;
  overflow-wrap: anywhere;
}
.group {
  min-width: 0;
}
.group + .group {
  margin-top: clamp(32px, 5vw, 48px);
}
.group h2 {
  margin: 0 0 6px;
  font-size: clamp(18px, 3vw, 22px);
  letter-spacing: -0.02em;
  font-weight: 700;
}
.section-lead {
  margin: 0 0 14px;
  max-width: 40rem;
  color: #888f9e;
  font-size: clamp(13px, 2.5vw, 14px);
  line-height: 1.5;
  text-wrap: pretty;
}
.grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(10px, 2vw, 14px);
  align-items: stretch;
  width: 100%;
  min-width: 0;
}
@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (min-width: 1020px) {
  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
.card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  height: 100%;
  padding: clamp(14px, 2.5vw, 18px) clamp(14px, 2.4vw, 18px) clamp(12px, 2vw, 16px);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: clamp(12px, 2vw, 16px);
}
.card.warn {
  border-color: rgba(232, 156, 92, 0.45);
  background: rgba(232, 156, 92, 0.06);
}
.kicker {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font: 700 11px/1 'Space Mono', ui-monospace, monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #84dfa6;
}
.swatch {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
}
.card.warn .kicker {
  color: #e89c5c;
}
.card h3 {
  margin: 0;
  font-size: clamp(16px, 2.8vw, 18px);
  letter-spacing: -0.02em;
  font-weight: 700;
  text-wrap: balance;
}
.why {
  margin: 0;
  font-size: clamp(13px, 2.4vw, 14px);
  line-height: 1.5;
  color: #c4c9d4;
  text-wrap: pretty;
}
.call {
  margin: 2px 0 0;
  padding: 10px 11px;
  min-width: 0;
  max-width: 100%;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #c4c9d4;
  font: 400 11px/1.45 'Space Mono', ui-monospace, monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overflow-x: auto;
}
.go {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
  margin-top: auto;
  min-height: 44px;
  padding: 8px 14px;
  border-radius: 8px;
  background: #84dfa6;
  color: #10131a;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  touch-action: manipulation;
}
.card.warn .go {
  background: transparent;
  color: #e89c5c;
  border: 1px solid rgba(232, 156, 92, 0.55);
}
.more {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  min-width: 0;
}
.more a {
  font-size: 12px;
  font-weight: 600;
  color: #84dfa6;
  text-decoration: none;
  overflow-wrap: anywhere;
}
.more a:hover {
  text-decoration: underline;
}
</style>
