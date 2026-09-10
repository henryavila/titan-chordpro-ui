<script setup lang="ts">
import { DEMOS, LAB } from './host/recipe'
</script>

<template>
  <div class="hub" data-demo-hub>
    <header class="hero">
      <p class="mark">titan-chordpro-ui</p>
      <h1>Como o host monta a cifra</h1>
      <p class="lead">
        O mesmo <code>&lt;ChordproViewer&gt;</code>, quatro receitas. A lista é
        estado do host, não uma composição extra. Sem iframe.
      </p>
    </header>

    <section class="grid" aria-label="Receitas">
      <article v-for="demo in DEMOS" :key="demo.id" class="card">
        <p class="kicker">{{ demo.kicker }}</p>
        <h2>{{ demo.title }}</h2>
        <p class="why">{{ demo.useWhen }}</p>
        <pre><code>{{ demo.snippet }}</code></pre>
        <a class="go" :href="demo.href">Abrir demo</a>
      </article>
    </section>

    <section class="note">
      <h2>Por que só estas quatro</h2>
      <p>
        O contrato do pacote tem dois eixos: a cifra <em>é</em> a página, ou
        mora <em>dentro</em> de uma ficha; e o host passa uma cifra, ou um
        repertório (com <code>source</code> inline). Tema, edição e import
        são props nas mesmas páginas; <code>loadSong</code> lento fica no
        laboratório. Guia: <code>docs/CONSUMER.md</code>.
      </p>
    </section>

    <section class="lab">
      <h2>Laboratório</h2>
      <p>Casos para quem está implementando o host, não para copiar.</p>
      <ul>
        <li v-for="item in LAB" :key="item.href">
          <a :href="item.href">{{ item.title }}</a>
          <span>{{ item.note }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.hub {
  box-sizing: border-box;
  width: 100%;
  max-width: 1080px;
  min-height: 100%;
  min-height: 100dvh;
  margin: 0 auto;
  padding:
    max(24px, env(safe-area-inset-top))
    max(16px, env(safe-area-inset-right))
    max(40px, env(safe-area-inset-bottom))
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
      max(72px, env(safe-area-inset-bottom))
      max(28px, env(safe-area-inset-left));
  }
}
.hero {
  margin-bottom: clamp(24px, 4vw, 36px);
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
  font-size: clamp(24px, 6vw, 40px);
  letter-spacing: -0.03em;
  font-weight: 700;
  text-wrap: balance;
}
.lead {
  margin: 0;
  max-width: 46rem;
  font-size: clamp(14.5px, 2.8vw, 16px);
  line-height: 1.55;
  color: #c4c9d4;
  text-wrap: pretty;
}
.lead code,
.note code,
.card code {
  font-family: 'Space Mono', ui-monospace, monospace;
  font-size: 0.92em;
  overflow-wrap: anywhere;
}
.grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(12px, 2.5vw, 16px);
  align-items: stretch;
  width: 100%;
  min-width: 0;
}
@media (min-width: 720px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  height: 100%;
  padding: clamp(16px, 3vw, 22px) clamp(14px, 2.5vw, 22px) clamp(14px, 2.5vw, 20px);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: clamp(12px, 2vw, 16px);
}
.kicker {
  margin: 0;
  font: 700 11px/1 'Space Mono', ui-monospace, monospace;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #84dfa6;
}
.card h2 {
  margin: 0;
  font-size: clamp(18px, 3.5vw, 22px);
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.why {
  margin: 0;
  font-size: clamp(13.5px, 2.6vw, 14.5px);
  line-height: 1.5;
  color: #c4c9d4;
  text-wrap: pretty;
}
.card pre {
  box-sizing: border-box;
  margin: 4px 0 8px;
  padding: 12px 14px;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  background: #07080c;
  border-radius: 10px;
  color: #c4c9d4;
  font: 12px/1.45 'Space Mono', ui-monospace, monospace;
  white-space: pre;
}
.card pre code {
  display: block;
  min-width: 0;
  overflow-wrap: normal;
}
.go {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
  margin-top: auto;
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 8px;
  background: #84dfa6;
  color: #10131a;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  touch-action: manipulation;
}
.note,
.lab {
  margin-top: clamp(28px, 5vw, 40px);
  max-width: 46rem;
  min-width: 0;
}
.note h2,
.lab h2 {
  margin: 0 0 8px;
  font-size: clamp(15px, 2.8vw, 16px);
}
.note p,
.lab p {
  margin: 0;
  color: #888f9e;
  font-size: clamp(13px, 2.5vw, 14px);
  line-height: 1.55;
  text-wrap: pretty;
}
.lab ul {
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
}
.lab li {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 12px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.lab a {
  color: #84dfa6;
  font-weight: 600;
  text-decoration: none;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  touch-action: manipulation;
}
.lab span {
  color: #888f9e;
  font-size: clamp(12.5px, 2.4vw, 13px);
  line-height: 1.45;
  overflow-wrap: anywhere;
}
</style>
