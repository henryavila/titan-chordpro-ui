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
        repertório. Tema, edição, import e carga preguiçosa são props nas
        mesmas páginas — não uma grade 16×. Guia:
        <code>docs/CONSUMER.md</code>.
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
  min-height: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 48px 24px 72px;
  color: #eaecf2;
  font-family: Sora, system-ui, sans-serif;
}
.hero {
  margin-bottom: 36px;
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
  font-size: clamp(28px, 4vw, 40px);
  letter-spacing: -0.03em;
  font-weight: 700;
}
.lead {
  margin: 0;
  max-width: 46rem;
  font-size: 16px;
  line-height: 1.55;
  color: #c4c9d4;
}
.lead code,
.note code,
.card code {
  font-family: 'Space Mono', ui-monospace, monospace;
  font-size: 0.92em;
}
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: stretch;
}
@media (min-width: 800px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
}
.card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
  padding: 22px 22px 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
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
  font-size: 22px;
  letter-spacing: -0.02em;
}
.why {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.5;
  color: #c4c9d4;
}
.card pre {
  margin: 4px 0 8px;
  padding: 12px 14px;
  overflow: auto;
  background: #07080c;
  border-radius: 10px;
  color: #c4c9d4;
  font: 12px/1.45 'Space Mono', ui-monospace, monospace;
}
.go {
  align-self: flex-start;
  margin-top: auto;
  padding: 8px 14px;
  border-radius: 8px;
  background: #84dfa6;
  color: #10131a;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
}
.note,
.lab {
  margin-top: 40px;
  max-width: 46rem;
}
.note h2,
.lab h2 {
  margin: 0 0 8px;
  font-size: 16px;
}
.note p,
.lab p {
  margin: 0;
  color: #888f9e;
  font-size: 14px;
  line-height: 1.55;
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
  padding: 12px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.lab a {
  color: #84dfa6;
  font-weight: 600;
  text-decoration: none;
}
.lab span {
  color: #888f9e;
  font-size: 13px;
  line-height: 1.45;
}
</style>
