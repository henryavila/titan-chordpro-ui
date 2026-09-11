# Guerreiro — validar import Cifra Club + batidas

Use este prompt numa sessão limpa (ou você mesmo). Objetivo: **provar** que o plano consolidado ficou certo no código e na UI — não só “parece ok”.

Repo: `titan-chordpro-ui`  
Plano SoT: `.ai/memory/plano-import-cifraclub-2026-09-11.md`

---

## Missão

Validar o import do Cifra Club após a implementação de 2026-09-11:

1. Meta (tempo, compasso, capo, YouTube, duration)
2. Corpo da cifra (tabs fora, refrão, intro)
3. Batida visual (toggle, essências, sync com metrônomo)
4. Sem regressão no que já existia

**Critério de DONE:** cada item da checklist abaixo é PASS com evidência (comando, trecho de source, ou comportamento observado). Qualquer FAIL → reportar com repro + causa provável.

---

## Contexto que você precisa saber

### Decisões de produto (não reinventar)

| Tema | Regra |
|------|-------|
| Versão | Sempre **Principal** |
| Capo CC | Acordes no CC = **formas**; no Titan = o que **soa** + `{capo:N}` |
| Duration | Do clipe YouTube (`metadata.youtubeID`), não da videoaula |
| `( Am G )` | **Não** converter |
| Batida UI | Botão mostrar/ocultar; 4 essências: normal · acento · mute · abafada |
| Ghost | código CC `23` → seta vazia |

### Arquivos-chave

- `src/core/import-chordpro.ts` — parse HTML + convert
- `src/core/strum.ts` — mapa códigos → slots / `{x_strum:}`
- `src/core/timeline.ts` — `durationFromYoutubeHtml`
- `src/vue/edit/NewChartDialog.vue` — fetch YT duration
- `src/vue/StrumStrip.vue` + toggle em `ChordproViewer.vue`
- `demo/preview-plugin.ts` — `/__cifra_fetch`, `/__youtube_duration`
- Fixtures: `tests/helpers/cifraclub-tu-es-tabs.html`, `cifraclub-wonderwall-capo.html`, `cifraclub-ceu-azul-strum.html`

---

## Fase A — testes automatizados (obrigatório)

Rodar e colar o resumo:

```bash
cd /Volumes/External/code/titan-chordpro-ui
npx vitest run tests/core/import-chordpro.test.ts tests/core/strum.test.ts tests/core/youtube-duration.test.ts tests/vue/new-chart.test.ts tests/vue/strum-strip.test.ts
```

**PASS** se todos verdes.  
**FAIL** se qualquer um quebrar — abrir o teste e dizer se é regressão de produto ou fixture.

Opcional regressão:

```bash
npx vitest run tests/core/ tests/vue/metronome.test.ts tests/vue/setlist.test.ts
```

---

## Fase B — smoke de convert (sem rede)

```bash
npx tsx -e '
import { readFileSync } from "fs"
import { convert, readMeta, parseXStrum, durationFromYoutubeHtml } from "./src/core/index.ts"

const tu = convert(readFileSync("./tests/helpers/cifraclub-tu-es-tabs.html","utf8"))
const m = readMeta(tu.source)
console.log("TU_ES", {
  tempo: m.tempo, time: m.time, key: m.key, capo: m.capo,
  yt: m.x_youtube, duration: m.duration,
  strum: m.x_strum,
})
console.log("slots0-3", parseXStrum(m.x_strum||"")?.slots.slice(0,4))
console.log("has TAB?", /\\{sot\\}|E\\|-/.test(tu.source))
console.log("intro", /INTRODUÇÃO/.test(tu.source))

const ww = convert(readFileSync("./tests/helpers/cifraclub-wonderwall-capo.html","utf8"))
console.log("WONDERWALL", readMeta(ww.source))
console.log("ww shapes gone?", /\\[Em\\]/.test(ww.source), "sounding F#m?", /\\[F#m\\]/.test(ww.source))

const ceu = convert(readFileSync("./tests/helpers/cifraclub-ceu-azul-strum.html","utf8"))
console.log("CEU muted mark Da?", /Da/.test(readMeta(ceu.source).x_strum||""))

console.log("YT dur", durationFromYoutubeHtml("<meta itemprop=\"duration\" content=\"PT7M57S\">"))
'
```

### Esperado

| Check | Esperado |
|-------|----------|
| Tu És tempo/time | `71` / `4/4` |
| Tu És yt | `YXnQ02HYB1w` (clipe, **não** `aCQsjDqczQo`) |
| Tu És capo | ausente (0) |
| Tu És tabs | sem `{sot}` / `E\|---` |
| Tu És intro | `{c:INTRODUÇÃO}` |
| slots 0–3 | hit↓, ghost↑, ghost↓, hit↑ |
| Wonderwall | `{capo:2}`, `{key:F#m}`, tem `[F#m]`, **não** fica só em Em como tom final |
| Céu Azul | `x_strum` contém `Da` (abafada) |
| YT parser | `07:57` |

---

## Fase C — UI no browser (obrigatório se tiver demo)

```bash
npm run dev
# abrir http://127.0.0.1:5173/standalone.html?criar=1
```

Host precisa de `fetchChart` + `fetchYoutubeDuration` (já na demo).

### C1 — Import FHOP

1. Aba Cifra Club → colar:
   `https://www.cifraclub.com.br/florianopolis-house-of-prayer/tu-es-aguas-purificadoras/`
2. Esperar a ficha.

**Conferir na ficha:**

- [ ] Andamento **71**
- [ ] Compasso **4/4**
- [ ] Tom **D**
- [ ] Duração preenchida (~**07:57** se o proxy YT respondeu; se falhar rede, campo vazio + pedido de duração — OK, anotar)
- [ ] Link **Abrir no YouTube** aponta para `YXnQ02HYB1w`
- [ ] Nota não pede tempo/compasso se já vieram

3. Completar duração se faltar → abrir a cifra.

**Conferir no reader:**

- [ ] Botão **↓↑ Batida** aparece
- [ ] Clique mostra faixa com setas; segundo clique oculta
- [ ] Há setas cheias e “vazias” (ghost mais claras)
- [ ] Abrir metrônomo + Iniciar → fatia do compasso atual destaca na faixa
- [ ] Corpo sem bloco de tablatura ASCII repetindo a intro
- [ ] Intro rotulada como INTRODUÇÃO

### C2 — Capo (se quiser rede ao vivo)

Importar uma cifra com capo > 0 (ex. Wonderwall no CC) **ou** colar o HTML da fixture via aba Texto (se o detect cifraclub pegar o HTML):

- Preferível: `convert` da fixture já validou; na UI, o caminho feliz é URL real com capo.
- **PASS:** tom soando ≠ formas do CC; `{capo:N}` ativo; dual faz sentido (formas = soa − N).

### C3 — Regressão rápida

- [ ] Unidos / cifra sem songData rico ainda importa corpo + título
- [ ] Colar plain `G  C\nletra` ainda funciona
- [ ] Sem `{x_strum:}` → botão Batida **não** aparece

---

## Fase D — caça a regressão (adversarial)

Procurar e marcar PASS/FAIL:

1. **YouTube errado:** duration/link da *videoaula* em vez do clipe → FAIL
2. **Capo invertido:** arquivo ficou com formas do CC + `{capo:}` sem transpor → FAIL (dual quebrado)
3. **Tabs vazaram** de novo no ChordPro → FAIL
4. **Refrão** abre `{soc}` e não fecha / pinta verso como refrão → FAIL
5. **Batida** sempre visível sem toggle → FAIL (produto: usuário escolhe)
6. **Palm+acento (8/20)** classificado como mute em vez de acento → FAIL (contrato v1)
7. **`( Bm7 A/C# )`** virou linha de acordes automaticamente → FAIL (proibido)
8. Core faz `fetch` de rede → FAIL

---

## Relatório final (cole na conversa)

```markdown
## Validação import CC + batidas

**Data:**
**Branch / HEAD:**

### Resultados
| Fase | Status | Notas |
|------|--------|-------|
| A testes | PASS/FAIL | |
| B smoke convert | PASS/FAIL | |
| C1 UI FHOP | PASS/FAIL | duration YT: sim/não |
| C2 capo | PASS/FAIL/SKIP | |
| C3 regressão | PASS/FAIL | |
| D adversarial | PASS/FAIL | itens: |

### Evidências
- (comandos / trechos de `{…}` / o que viu na UI)

### FAILS
- …

### Veredito
- [ ] APROVADO para uso
- [ ] BLOQUEADO — listar correções mínimas
```

---

## Prompt curto (copiar para outro agente)

```text
Valide a implementação do import Cifra Club + batidas no repo titan-chordpro-ui
seguindo o checklist em .ai/memory/plano-import-cifraclub-2026-09-11.md e o
guerreiro prompt-validar-import-cifraclub.md (se disponível na sessão).

Faça: (1) vitest dos arquivos de import/strum/youtube/new-chart/strum-strip;
(2) smoke tsx convert nas fixtures tu-es, wonderwall-capo, ceu-azul;
(3) se possível npm run dev e exercitar standalone.html?criar=1 com a URL
https://www.cifraclub.com.br/florianopolis-house-of-prayer/tu-es-aguas-purificadoras/
conferindo tempo 71, 4/4, youtube clipe, duration, toggle Batida, metrônomo.

Não implemente features novas. Reporte PASS/FAIL com evidência no formato
do relatório final do guerreiro. Claim DONE só com evidência observada.
```
