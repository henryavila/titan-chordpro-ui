<script setup lang="ts">
defineProps<{
  title: string
  subtitle: string
  songKey: string
  lista: boolean
  liveHref: string
}>()
</script>

<template>
  <!--
    This is the consumer's page, not Titan. Different type, different chrome,
    so the boundary is visible: Titan is only the chart frame.
  -->
  <div class="host" data-host-site>
    <header class="host-nav">
      <a class="host-brand" href="/">Hinário Exemplo</a>
      <nav class="host-links">
        <a href="/">Demos Titan</a>
        <span>Repertório</span>
        <span>Escalas</span>
      </nav>
    </header>

    <div class="host-band">
      <p class="host-kicker">Ficha da música · site do consumer</p>
      <p class="host-title">{{ title || 'Cifra' }}</p>
      <p v-if="subtitle" class="host-value">{{ subtitle }}</p>
      <p class="host-value">Compasso 4/4</p>
      <span class="host-flag">chrome do site{{ lista ? ' · ensaio' : '' }}</span>
    </div>

    <div class="host-row">
      <p class="host-label">Link externo</p>
      <a class="host-link" href="#" @click.prevent>https://www.youtube.com/watch?v=9yZt5ekdceI</a>
    </div>

    <div class="host-row">
      <div class="host-tools">
        <span class="host-tone">
          Tom da reunião
          <select>
            <option>{{ songKey || 'C' }}</option>
            <option>C</option>
            <option>D</option>
            <option>E</option>
          </select>
        </span>
        <span class="host-chips">
          <a class="host-live" :href="liveHref">Tocar ao vivo</a>
          <button type="button">PDF do site</button>
        </span>
      </div>

      <div class="host-frame">
        <slot />
      </div>
    </div>

    <div class="host-band">
      <p class="host-label">Arquivos</p>
      <a class="host-link" href="#" @click.prevent>partitura-piano.pdf</a>
      <a class="host-link" href="#" @click.prevent>audio-referencia.mp3</a>
    </div>

    <div class="host-row">
      <p class="host-label">Histórico</p>
      <p class="host-value">Alterada há 3 dias, por Henry Avila</p>
      <p class="host-value">Antes disso, há 2 meses</p>
    </div>

    <div class="host-band">
      <p class="host-label">Escalas</p>
      <p class="host-value">Domingo, 9h — Domingo, 18h</p>
    </div>
  </div>
</template>

<style scoped>
.host {
  height: 100%;
  overflow-y: auto;
  scroll-snap-type: y proximity;
  background: #f7f1e8;
  color: #1c1916;
  font-family: Georgia, 'Times New Roman', serif;
  -webkit-text-size-adjust: 100%;
}
.host-nav {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 24px;
  padding: 14px 26px;
  background: #1b2a4a;
  color: #f4efe6;
  font-family: system-ui, -apple-system, sans-serif;
}
.host-brand {
  color: inherit;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-decoration: none;
}
.host-links {
  display: flex;
  gap: 18px;
  font-size: 13px;
  opacity: 0.9;
}
.host-links a {
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid rgba(244, 239, 230, 0.45);
}
.host-band > *,
.host-row > * {
  max-width: 1040px;
  margin-left: auto;
  margin-right: auto;
}
.host-band,
.host-row {
  position: relative;
  padding: 22px 26px;
  border-bottom: 1px solid #e4d9c8;
}
.host-band {
  background: #efe6d6;
}
.host-kicker,
.host-label {
  margin: 0 0 8px;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6b5e4e;
}
.host-title {
  margin: 4px 0 8px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.host-value {
  margin: 0 0 4px;
  font-size: 15px;
  color: #5c5348;
  line-height: 1.5;
}
.host-link {
  display: block;
  margin-bottom: 4px;
  font-size: 15px;
  color: #8b2e1f;
  text-decoration: none;
  word-break: break-all;
}
.host-flag {
  position: absolute;
  top: 18px;
  right: max(26px, calc((100% - 1040px) / 2));
  font: 700 9.5px/1 system-ui, sans-serif;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8a7b68;
  border: 1px solid #d9ccb8;
  border-radius: 999px;
  padding: 4px 8px;
}
.host-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px 14px;
  margin-bottom: 16px;
  font-family: system-ui, -apple-system, sans-serif;
}
.host-tone {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #5c5348;
}
.host-tone select {
  font: inherit;
  font-size: 13px;
  color: #1c1916;
  background: #fff;
  border: 1px solid #d4c7b4;
  border-radius: 8px;
  padding: 6px 8px;
  min-width: 62px;
}
.host-chips {
  display: flex;
  gap: 8px;
  align-items: center;
}
.host-chips button,
.host-live {
  font: inherit;
  font-size: 12.5px;
  color: #1c1916;
  background: #e8dccb;
  border: 0;
  border-radius: 7px;
  padding: 7px 12px;
  cursor: pointer;
  text-decoration: none;
}
.host-live {
  background: #8b2e1f;
  color: #fff;
  font-weight: 600;
}
.host-frame {
  height: 100dvh;
  min-height: 560px;
  overflow: hidden;
  scroll-snap-align: start;
  scroll-margin-top: 0;
  border-radius: 12px;
  border: 1px solid #e4d9c8;
  background: #0b0d12;
}
@media (max-width: 640px) {
  .host-nav,
  .host-band,
  .host-row {
    padding-left: 16px;
    padding-right: 16px;
  }
  .host-flag {
    display: none;
  }
  .host-tools {
    justify-content: flex-start;
  }
}
</style>
