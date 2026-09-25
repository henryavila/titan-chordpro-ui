# Guia do consumer — `@henryavila/titan-chordpro-ui`

Como um app Vue 3 ou Nuxt **incorpora** a UI de 1 cifra. Este pacote não é um
iframe, não é um site, e **não amarra um consumer específico**. Quem consome
escolhe a composição; o Titan entrega o mesmo componente.

Demo neste repo (`pnpm dev`): índice em `/`. O mesmo `<ChordproViewer>`;
**não** há iframe. Quatro estados (standalone × shell, uma cifra ×
apresentação ao vivo), mais criar, acento e um host errado. Cada card traz
a chamada resumida.

| URL | O que é |
|---|---|
| `/` | Índice das demos |
| `/standalone.html` | Standalone: a cifra é a página |
| `/standalone-lista.html` | Standalone com apresentação (`songs`) |
| `/site.html` | Vue no shell do consumer (conteúdo acima e abaixo) |
| `/site-lista.html` | Shell com apresentação |

Query nas mesmas páginas: `criar=1`, `editMode` (local / persisted / none),
`ensaio=demanda` (fontes sob demanda), `song`, `tema`, `accent` (`verde` /
`teal` / `#hex`), `lens` (`none` / `letra` / `nashville`), `comentarios=0`
(oculta `{c:}` de ensaio), `quebrar=1`, `audio=1` (cantado+playback na demo; `audio=cantado` / `audio=playback` só um; `capa=0` = arte genérica).
Alias legado: `modes` (`content`→`persisted`).

Bookmarks antigos (`/?ficha=1`, `/?ensaio=juntas`) redirecionam para a página nova.

---

## 1. Instalar

```sh
pnpm add @henryavila/titan-chordpro-ui
# peers: vue ^3.5 (obrigatório para a UI)
#        vexflow (só se for desenhar {sos}/{sot})
#        pdfjs-dist (só se for importar PDF)
```

```ts
import { ChordproViewer } from '@henryavila/titan-chordpro-ui/vue'
// o pacote já puxa o CSS; importe de novo só para controlar a ordem:
import '@henryavila/titan-chordpro-ui/vue/style.css'
```

Em Nuxt, monte no cliente (`ClientOnly`): o viewer fala com `document` /
`window`. No `nuxt.config`:

```ts
export default defineNuxtConfig({
  css: ['@henryavila/titan-chordpro-ui/vue/style.css'],
  vite: { optimizeDeps: { include: ['@henryavila/titan-chordpro-ui'] } },
  // se o bundler externalizar o pacote e quebrar o SFC:
  // nitro: { externals: { inline: ['@henryavila/titan-chordpro-ui'] } }
})
```

`vue` é peer. Uma segunda cópia de Vue no bundle quebra o componente.

---

## 2. O que o Titan é (e o que não é)

| É | Não é |
|---|---|
| Um SFC: `<ChordproViewer>` | Um `<iframe src="…">` |
| Superfície de **1 cifra** com scroller próprio | Um artigo que cresce com a página |
| Chrome do músico (tom, capo, rolagem, tema, export CHO/PDF/slides, ensaio, **diagrama do acorde**, áudio de referência) | Shell do app (login, nav, lista de músicas do site, player **sincronizado**) |
| Palco no celular, se o host der a geometria certa | Fullscreen nativo no Safari do iPhone (a plataforma não tem) |

Duas composições, o **mesmo** componente:

1. **Standalone** — rota só da cifra, `100dvh`, sem shell. Palco.
2. **Na página** — bloco `100dvh` no fluxo de uma ficha/detalhe que tem
   conteúdo acima e abaixo. O músico rola até a cifra; o frame estaciona.

Não existe terceira: cifra fluindo como texto da página. Auto-scroll, zen e
linha de leitura exigem viewport próprio. Achatar `.cpv-scroll` para
`overflow: visible` desmonta o produto.

Toque no acorde abre o diagrama (violão, ukulele, piano), em tela cheia no
ensaio. Ligado por omissão. Para desligar: `:capabilities="{ diagrams: false }"`.
O instrumento é preferência do aparelho, não da cifra. Só letra não abre o
modal.

---

## 3. Standalone — página só da cifra

Use quando o músico vai **tocar**: ensaio, culto, palco. A cifra já é a tela
do site. No iPhone não há botão de tela cheia (não há o que ganhar além da
moldura do Titan); o toque na cifra só esconde/mostra os controles.

### Vue (SPA)

```vue
<script setup lang="ts">
import { ChordproViewer } from '@henryavila/titan-chordpro-ui/vue'
import '@henryavila/titan-chordpro-ui/vue/style.css'

defineProps<{ source: string; songId: string }>()
</script>

<template>
  <div class="cifra-live">
    <ChordproViewer :source="source" :song-id="songId" edit-mode="local" />
  </div>
</template>

<style>
html, body, #app { height: 100%; margin: 0; overflow: hidden; }
.cifra-live { height: 100dvh; overflow: hidden; }
</style>
```

A página precisa de `viewport-fit=cover` no meta viewport. Sem isso o iOS
devolve `env(safe-area-inset-*)` = 0 no PWA / Add to Home Screen, e o dock
do Titan senta no indicador de início.

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

Se o host tem barra própria em cima da cifra:

```css
.cifra-live {
  height: 100dvh;
  overflow: hidden;
  padding-top: env(safe-area-inset-top);
}
```

O padding de baixo do dock é do Titan (`env(safe-area-inset-bottom)`). Não
some `padding-bottom` no frame — dobra a folga e empurra a cifra. `100dvh`
sozinho não liga os `env()`; só `viewport-fit=cover` faz o iOS devolver
inset ≠ 0.

### Nuxt (rota sem layout)

```vue
<!-- pages/cifras/[id].vue -->
<script setup lang="ts">
definePageMeta({ layout: false })
const route = useRoute()
const { data: song } = await useFetch(`/api/songs/${route.params.id}`)
</script>

<template>
  <ClientOnly>
    <div class="h-dvh overflow-hidden">
      <ChordproViewer
        v-if="song"
        :source="song.chordpro"
        :song-id="song.id"
        edit-mode="local"
      />
    </div>
  </ClientOnly>
</template>
```

A ficha do site **aponta** para essa rota (“Tocar ao vivo”). Não embutir o
palco num retângulo no meio do artigo.

---

## 4. Na página — componente no fluxo da ficha

Use quando a cifra convive com letra, vídeo, arquivos, histórico. A página
**não** é um header sozinho: tem conteúdo em cima e embaixo. O viewer é um
bloco `100dvh` no fluxo.

Na abertura a cifra nasce abaixo da dobra. Ao rolar, o frame estaciona no topo
da viewport (`scroll-snap`) e o dock senta na dobra. Aí o músico toca.

### Vue / Nuxt

```vue
<script setup lang="ts">
import { ChordproViewer } from '@henryavila/titan-chordpro-ui/vue'

const props = defineProps<{
  source: string
  songId: string
  title: string
}>()

const liveTo = computed(() => `/cifras/${props.songId}`)
</script>

<template>
  <div class="ficha">
    <section class="ficha-block">
      <h1>{{ title }}</h1>
      <!-- letra, vídeo, avisos da banda… -->
      <NuxtLink :to="liveTo">Tocar ao vivo</NuxtLink>
    </section>

    <div class="cifra-frame">
      <ClientOnly>
        <ChordproViewer :source="source" :song-id="songId" edit-mode="local" />
      </ClientOnly>
    </div>

    <section class="ficha-block">
      <!-- arquivos, histórico, escalas… -->
    </section>
  </div>
</template>

<style scoped>
.ficha {
  height: 100dvh;
  overflow-y: auto;
  scroll-snap-type: y proximity;
}
.cifra-frame {
  height: 100dvh;
  min-height: 560px;
  overflow: hidden;
  scroll-snap-align: start;
}
</style>
```

`min-height: 560px` é o piso útil (a folha do metrônomo mede ~552px). Os 460px
de `.cpv-root` são só o `min-height` interno — não use como altura do host.

### O que o host não deve fazer

| Não faça | Por quê |
|---|---|
| Ancestral sem altura (`height: auto`) | `height:100%` não resolve; a barra cai no fim da cifra |
| Frame `100dvh` que começa no meio da tela **sem** o músico poder estacioná-lo | O dock fica sob a dobra |
| Esvaziar a ficha para um header de 56px | Nunca é o caso real; a cifra convive com o resto da página |
| Sobrescrever `height` / `overflow` / `position` de `.cpv-root` ou `.cpv-scroll` | Desmonta o containing block |
| `<iframe>` | `position:fixed` não escapa do frame; no iPhone não há Fullscreen API |
| `position:fixed` no host para “resolver” a cifra | O viewer já pina a própria raiz |
| Standalone / PWA / `100dvh` **sem** `viewport-fit=cover` no viewport | `env(safe-area-inset-*)` fica 0 no iPhone; o dock do Titan senta no indicador de início e o toque em Rolar/Mais morre |
| Recortar `.cpv-swipe-rail` (`bottom: 180px` etc.) para “liberar o dock” | Geometria do trilho é do pacote; o recorte quebra quando o dock cresce |
| `padding-bottom: env(safe-area-inset-bottom)` no frame **e** no dock | Folga duplicada; a última linha da cifra sobe à toa |

Quando o ancestral não tem altura, o viewer avisa no console e na tela
(`surfaceGuard`, ligado por padrão).

---

## 5. Tela cheia e toque (celular)

Dois gestos **diferentes**. Misturá-los faz o músico cair da tela no meio do
coro.

| Gesto | Faz |
|---|---|
| Toque na cifra | Só mostra / esconde a moldura do Titan. **Não** entra nem sai da tela cheia |
| Botão **Tela cheia** | Cobre o resto da página do host (`position:fixed` no root). No iPhone some o chrome do **site**; a barra do Safari fica |
| Botão **Sair da tela cheia** | Única saída. Aparece com os controles visíveis |

O botão só existe onde há tela para ganhar:

- API nativa (Android, desktop, iPad) **ou**
- o box atual deixa ≥ 48px de viewport descobertos (ficha não estacionada)

E vive **sempre no cabeçalho** da cifra — celular, desktop, ficha estacionada
ou não. O dock é para tocar (Rolar, tipografia, metrônomo). Estacionar a
ficha em `100dvh`, ou girar para paisagem, não manda o botão para baixo.

Numa rota standalone, ou numa ficha já estacionada em `100dvh`, no iPhone o
botão some: o toque na cifra é o que esconde a moldura.

Safari no iPhone **não tem** Fullscreen API para elemento (só `<video>`; flag
experimental na 17.2, desligada). Os ~110px de chrome do Safari não são de
ninguém. PWA `display: standalone` é o único caminho, e é do host.

Em **toda** rota que monta o viewer em tela cheia / PWA / Add to Home Screen,
o meta viewport leva `viewport-fit=cover`. Sem isso o padding de safe-area
do dock do Titan é zero e Rolar/Mais caem na zona morta do indicador de
início. Header do host usa `env(safe-area-inset-top)`. `apple-mobile-web-app-capable`
e `display: standalone` no manifest são do host; o pacote não instala PWA.

**Tela ligada.** Enquanto o `<ChordproViewer>` está montado, o pacote pede
`navigator.wakeLock` (`screen`) para o aparelho não apagar no ensaio. Sem
botão, sem PWA, sem prop do host. Precisa de HTTPS e da página visível; ao
voltar para a aba, o pedido se repete. Sem a API (Safari antigo) ou com o
pedido recusado, é no-op. O consumer não implementa isso.

---

## 6. Ensaio (lista)

Duas ou mais entradas em `songs` ligam lista, anterior/próxima e lugar por
música. Com uma, ou nenhuma, o viewer é a cifra única de sempre.

```vue
<ChordproViewer
  :songs="repertorio"
  :load-song="buscarCifra"
  edit-mode="local"
/>
```

```ts
type Song = {
  id: string
  title: string
  subtitle?: string
  key?: string
  source?: string // se já veio, toca offline
}

async function buscarCifra(id: string): Promise<string> {
  const res = await fetch(`/api/chordpro/${id}`)
  return res.text()
}
```

Quem já tem o ChordPro manda em `source` na entrada; o resto é pedido por
`loadSong`. A atual e as duas vizinhas são buscadas na frente. Uma que não
chega vira painel *Não carregou*.

`{key:}` no `.cho` é o tom original. `{transpose:N}` hidrata o −/+ ao abrir
(não soma com o overlay). `{capo:}` no arquivo é dica de arranjo — o capotraste
ao vivo começa em 0, a não ser que o músico (setlist ou overlay)
já tenha ligado. Reescrever (import e ficha) é pergunta; o corpo só muda depois
do Sim.

Trocar de música guarda tom, capo, velocidade e posição de rolagem **daquela**
música. **Cifra | Letra** (`lens`) e `hideComments` são escolha do ensaio —
**não** resetam ao mudar de cifra. No celular, deslize **na borda** da cifra pinta
um fade + chevron e só confirma ao soltar depois do limiar — o centro só rola, não
troca de música. Trilho 64px no celular, 128px no tablet. `capabilities.debugSwipe`
pinta as zonas (demo: `?zonas=1`). No fim da auto-rolagem o viewer
**oferece** a próxima; nunca avança sozinho.

### Áudio de referência

Não é prop do `<ChordproViewer>` (não existe `audioUrl`). O host grava cantado,
playback e capa **no `.cho`** e passa o texto em `source`. O player aparece
sozinho quando há pelo menos uma faixa playable. Não sincroniza com a letra,
o Rolar nem `{duration:}` — player sincronizado continua sendo do host.

```ts
import { setRehearsalAudio, audioTracksOf, audioArtOf } from '@henryavila/titan-chordpro-ui'

cho = setRehearsalAudio(cho, {
  sung: 'https://cdn.example/nasce-voz.m4a?h=a1',
  playback: 'https://cdn.example/nasce-pb.m4a?h=b2', // opcional
  art: { url: 'https://cdn.example/nasce-512.jpg?h=c3', width: 512, height: 512 },
})
```

```vue
<ChordproViewer :source="cho" :song-id="id" @update:source="cho = $event" />
```

Chave omitida não mexe; `null` apaga. Qualquer combinação vale (os dois, só um,
ou nenhum). Sem faixa, o chrome não muda. Caminho same-origin (`/audio/nasce.m4a`)
também vale. Uma faixa só: `setAudioUrl(cho, url, 'sung' | 'playback')`.

Persistir é o fluxo de sempre (`update:source` / `save-content`). Não chame
`writeMeta(cho, { x_audio_sung })` sozinho — `writeMeta` substitui o header
inteiro; use `setRehearsalAudio`.

**Capa:** o host já entrega o arquivo no tamanho certo (quadrado **256–512 px**
basta; o card mostra 56 px). Passe `width` e `height` **desse arquivo**, não do
original de 3000 px. Sem `{x_audio_art:}`, o Titan usa uma arte genérica 512×512.

Diretivas (inglês no arquivo): `{x_audio_sung:}`, `{x_audio_playback:}`,
`{x_audio_art:}`, `{x_audio_art_w:}`, `{x_audio_art_h:}`. `{x_audio:}` /
`{x_audio_cantado:}` legado lê como sung. UI: Cantado / Playback.

O player mostra `{title:}` (sem o prefixo `001 - ` do hinário), `{artist:}`
ou `{subtitle:}`, e a capa. Com as duas faixas, Cantado / Playback são
pílulas clicáveis; com uma só, só o rótulo. No celular o recolhido é o ícone
de fone na linha de Cifra | Letra: toque abre o card (capa e transporte).
Enquanto toca, o fone anima uma onda. Recolher o chrome esconde o card e
deixa o fone. No desktop o chip continua acima do dock, com título. X fecha
o card (sem parar o áudio).

A origem da cifra no arquivo é `{x_source:}` (inglês). `{x_origem:}` legado
ainda lê; a próxima gravação reescreve. Na UI o campo continua **Origem** /
**Referência**.

YouTube, Spotify, Apple Music, `javascript:` e `data:` são recusados (throw).

Troca de faixa = **outra URL** (hash na query). O Titan guarda o arquivo no
Cache Storage keyed pela URL completa; a 1ª vez toca em stream e preenche o
cache atrás (CORS no GET). Sem CORS, toca e o cache vira no-op. Teto ~100 MB
LRU; arquivo > 20 MB toca e não guarda. Não usa `ChartStore` / `localStorage`.

O GET precisa de `Access-Control-Allow-Origin` e, na 1ª vez, `Accept-Ranges:
bytes` para o seek. URL assinada que muda de token a cada hora destrói o
cache — o hash só muda quando o áudio muda.

Demo: `/standalone.html?song=100-nasce-em-mim&audio=1` (cantado + playback a 65 BPM, 2:41). Arte genérica: `&capa=0`.

---

## 7. Tempo da cifra (`x///`)

Intro, interlúdio, solo e final **não têm letra**. O Titan não adivinha o
compasso por uma fileira `[G] [C] [D]`. Quem gera ou grava ChordPro para este
pacote escreve o tempo com a convenção `x///`:

```
{c:(INTRODUÇÃO)}
[A]x///    [E]x///    [F#m]x///    [D]x///
```

`x` é **sempre** a cabeça do tempo. `/` é um tempo que não é cabeça — pode
existir sozinho: `[Cm]//` em 4/4 são 2 tempos, inclusive no fim da frase.
Em 4/4, `[G]x///` é um compasso inteiro. No fim de uma linha **cantada**, as
marcas são cauda somada — não a duração da estrofe.

Rolar só parte com `{duration:}` na cifra. BPM sozinho não abre o gate.

SoT, gramática, 6/8, lente Só letra, lint e o que a IA **não** pode apagar:
[`docs/MARCAS-X.md`](./MARCAS-X.md).

---

## 8. Tema, fonte, acento, cifra ou letra

```vue
<ChordproViewer
  class="host-cifra"
  :source="cho"
  :song-id="id"
  :theme="hostTheme"
  theme-control="host"
  accent="verde"
/>
```

| `themeControl` | Quem manda |
|---|---|
| `preference` (default) | O músico; `theme` é fallback até a primeira escolha |
| `host` | A prop `theme` sempre vence. `update:theme` pede; o host aceita atualizando a prop |

`auto` segue o sistema, não o tema do site. Um site claro passa `light`.

### Cifra ou letra (cantores)

Na UI o músico troca com o interruptor **Cifra | Letra** (tecla `L`). Nashville
e os comentários de ensaio ficam na barra (desktop) ou no menu Mais (celular).
Não há mais um menu chamado “Lentes”.

| Prop | Valores | Papel |
|---|---|---|
| `lens` | `none` \| `letra` \| `nashville` | Projeção. `letra` = só a letra (sem acordes, tab, partitura nem marcas `x///`) |
| `hideComments` | `boolean` | Esconde `{c:}` de ensaio **só** na leitura |
| `rehearsalFocus` | `off` \| `batida` | Perfil de chrome **Ensaio Batida** (strip + som da batida no Rolar). Ortogonal a `lens`. Reseta ao trocar de música no setlist, salvo se o host mantiver a prop. |

`lens` / `hideComments` sobrevivem à troca de música no ensaio (`songs`) e emitem
`update:lens` / `update:hideComments` (dá para `v-model:lens`). `rehearsalFocus`
emite `update:rehearsalFocus`. O músico ainda pode mudar pelo UI. O `.cho`
**não** é reescrito — marcas e comentários continuam no arquivo.

**Som no ensaio:** no painel Metrônomo a **Fonte** é `Mudo | Click | Batida`
(prefs `metSound` / `metStrumSound`). O botão **Rolar** fora do Ensaio Batida
sobe o relógio **sem áudio**, para a Fonte de prática não vazar no palco. Para
ouvir batida ao rolar: entre em **Ensaio batida** ou inicie pelo metrônomo.

Na lente `letra`, `x///` / `//` / `/_` colados ao acorde **não** vazam na
letra (`razão.[E]//` → `razão.`). Detalhe e o que **não** se apaga:
[`MARCAS-X.md`](./MARCAS-X.md) § Lente Só letra.

URL típica para o cantor (o host lê a query e passa a prop):

```vue
<!-- /cifras/[id]?lens=letra  →  pages/cifras/[id].vue -->
<script setup lang="ts">
const route = useRoute()
const lens = computed(() =>
  route.query.lens === 'letra' || route.query.lens === 'nashville'
    ? route.query.lens
    : 'none',
)
</script>

<template>
  <ClientOnly>
    <div class="h-dvh overflow-hidden">
      <ChordproViewer
        v-if="song"
        :source="song.chordpro"
        :song-id="song.id"
        :lens="lens"
        edit-mode="none"
      />
    </div>
  </ClientOnly>
</template>
```

Na demo deste repo: `/standalone-lista.html?lens=letra` (opcional:
`&comentarios=0`).

```css
.host-cifra {
  --cpv-font-lyrics: Figtree, system-ui, sans-serif;
  --cpv-font-controls: Figtree, system-ui, sans-serif;
  --cpv-font-chords: 'Space Mono', monospace;
}
```

O pacote não baixa fontes. O host carrega as faces. Defaults: Sora + Space Mono.

---

## 9. Letra e slides — sem abrir a cifra

O viewer exporta `.slja` pelo menu **Exportar**. Numa lista de músicas o host
não precisa montar `<ChordproViewer>`: a string ChordPro basta.

```ts
import { exportSlja, NoSlideLyricsError } from '@henryavila/titan-chordpro-ui/slides'

async function baixarSlides(chordpro: string, capa?: Uint8Array, fundo?: Uint8Array) {
  const { bytes, filename } = await exportSlja(chordpro, {
    coverImage: capa,      // opcional — default do pacote
    slidesImage: fundo,    // opcional — default do pacote
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
```

`NoSlideLyricsError` é a cifra sem letra (só intro/`x///`). Serve no browser
e num handler Nitro/Node — não puxa Vue. A quebra de slide segue as linhas
da cifra.

A mesma cifra cadastra a letra — sem acordes, `x///` nem comentário de ensaio:

```ts
import { exportLyrics } from '@henryavila/titan-chordpro-ui'

const { title, artist, lyrics } = exportLyrics(chordpro)
// lyrics: plaintext, linha da cifra = linha; linha em branco = seção
```

Cifra só instrumental: `lyrics` vem `''`. Não puxa Vue.

No viewer, as mesmas imagens entram pelas props `coverImage` / `slidesImage`.

---

## 10. Edição e persistência

Um papel por mount — o host já sabe se é frontend ou backend. Prop:
`editMode` (ortogonal a `mode` view|edit).

| `editMode` | O que existe |
|---|---|
| `local` (default) | “Só para mim” neste aparelho; “Sugerir” opcional. Criar/editar batida grava overlay e pode ir na sugestão. |
| `persisted` | “Para todos” — emite `save-content`; fila de sugestões + Aceitar/Recusar. Criar/editar batida grava o oficial. |
| `none` | Sem edição |

```vue
<!-- App do músico (frontend) -->
<ChordproViewer
  edit-mode="local"
  :source="cho"
  :song-id="id"
  :actor-key="userId"
  :actor-name="displayName"
  :persist-suggestion="persistSuggestion"
  @suggestion-created="onSuggestionAck"
/>

<!-- Admin / PDP (backend) -->
<ChordproViewer
  edit-mode="persisted"
  :source="cho"
  :song-id="id"
  :suggestion-queue="queue"
  @save-content="persistOfficial"
  @suggestion-accepted="onAccepted"
  @suggestion-refused="onRefused"
  @update:suggestionQueue="queue = $event"
/>
```

```ts
import type { Suggestion } from '@henryavila/titan-chordpro-ui'

function persistSuggestion(s: Suggestion) {
  return api.post('/suggestions', s)
}

function onSuggestionAck(_s: Suggestion) {
  // depois do ack — analytics / refresh. O POST não é aqui.
}
```

O POST é `persistSuggestion` (`return` da Promise), lida na hora do envio. `@suggestion-created` dispara **depois** do ack — não é o save. Se o POST ainda está no handler do evento, mova. Sem `return`, o Titan pede retry e **não** enfileira; não tosta “enviada”. A fila (e `update:suggestionQueue`, se o host injeta) só muda depois do ack.

**Fluxo sugerir → revisar**

1. Músico edita em `local` (overlay no device).
2. **Sugerir alteração** pede o **nome** (identificação) e confirmação leve. Titan **espera** `persistSuggestion`: resolve → enfileira + emit `suggestion-created` (`actorName` + `actorKey` opcional) + toast “Sugestão enviada”; reject ou `void` (sem Promise) → nada na fila, mantém Minha versão, “Não foi possível enviar. Tente de novo.” Sem a prop, o toast “enviada” é otimista (só neste aparelho). Reverter fica bloqueado enquanto envia.
3. Admin em `persisted` abre **Sugestões dos músicos** → vê quem enviou, a faixa da batida só quando ela mudou, e encaixa / conflito → Aceitar lote ou item a item. Aceitar um item deixa a revisão aberta no que ainda falta.
4. Aceitar emite `save-content` **e** `suggestion-accepted` (`officialText` igual ao save). Devolver esse texto em `source` não troca de cifra: a revisão continua.
5. Status (`pendente` / `aceita` / `recusada` / `parcial`) aparece na Minha versão do músico na próxima visita (host devolve a fila).

**Deprecated:** `modes` (`content` → `persisted`; `both` → `local` + warning no console).

`storage` (default `localStorage`) é onde o Titan lembra preferências e a
versão pessoal. Um host com conta passa o próprio `ChartStore`. Chamadas
síncronas: o host responde do cache e grava atrás. Cross-app (músico → admin)
precisa de `ChartStore` compartilhado **ou** `suggestionQueue` + emits.

Identidade da música = `songId` (ou o `id` da entrada do ensaio). Overlays
antigos sob outro id **não** migram.

### Demo neste repo

| URL | Papel |
|---|---|
| `/standalone.html` ou `?editMode=local` | Músico — overlay + sugerir |
| `/standalone.html?editMode=persisted` | Admin — oficial + fila |
| `/standalone.html?editMode=none` | Só leitura |
| `/standalone.html?criar=1` | Cifra nova (`persisted`) |

Mesmo `songId` + mesmo browser: edite em `local`, sugira, abra `persisted` e revise.

---

## 11. Buscar no Cifra Club (`fetchChart`)

O Titan **não** busca o Cifra Club. `fetchChart(url)` devolve HTML. Na cifra
nova o Titan chama `convert` (cifra e meta). Em “Completar com Cifra Club” o
mesmo HTML passa por `fromCifraClubHtml` e só preenche meta — o corpo não
troca. Sem a prop, a aba Cifra Club diz “Buscar no Cifra Club não está
disponível” e “A página precisa ser buscada pelo servidor do site.” Na ficha:
“o site precisa buscar a página.”

O navegador não lê `cifraclub.com.br` nem `api.cifraclub.com.br` a partir do
seu domínio (CORS). A API só manda `Access-Control-Allow-Origin` para
`https://www.cifraclub.com.br`. `fetchChart` devolve **HTML**, não JSON. O link é `cifraclub.com.br` ou
`www.cifraclub.com.br`, em `http` ou `https`.

Se não houver cifra, **rejeite** a Promise. Não resolva com o corpo do erro.
O Titan mostra “Não deu para ler essa cifra no Cifra Club” (cifra nova) ou
“Não deu para ler essa página no Cifra Club” (ficha).

Um `GET` da página pública muitas vezes responde **403**, com
`<TITLE>Access Denied</TITLE>` e sem a cifra. Em outra rede o mesmo endereço
pode responder 200. 200 na sua máquina não é o contrato.

Quando a resposta não for a cifra, busque a versão e monte o HTML abaixo.
Não siga redirect dessa API.

```
GET https://api.cifraclub.com.br/v3/version/{artista}/{musica}
Referer: https://www.cifraclub.com.br/
Accept: application/json
```

`{artista}` e `{musica}` são os dois primeiros segmentos do path
(`/oasis/wonderwall/simplificada/` → `oasis` e `wonderwall`), em minúsculas,
só `[a-z0-9-]`. Fora isso, não monte a URL. `/v3/song/…` não é esse
endpoint. O terceiro segmento não entra: a resposta é a versão principal.
Sem o `Referer`, alguns servidores respondem 401.

| Campo da API | No HTML |
|---|---|
| `music.name` | JSON-LD com `name` logo depois de `@type`, sem espaço: `"@type":"MusicComposition","name":"…"`. Com espaço ou quebra, o título não entra |
| `artist.name` | `"byArtist":{"name":"…"}` no mesmo objeto. Aqui o espaço pode existir |
| `stdShapeKey` | `config.keyShape` e `<button data-anchor="--chord-tone">Em</button>`. Este é o tom da página. `key` e `shapeKey` divergem quando há capo (Wonderwall: a página mostra `Em`, a API manda `key` `A`) |
| `capo` | `config.capo` (número). `0` não vira `{capo:}` |
| `youtubeId` | `"youtubeID"` (ID maiúsculo), 11 caracteres, antes de um `videoLesson` |
| `strumming` | array `strummings`. Em cada item, `time_signature` vira `timeSignature`; `pattern`, `bpm` e `section` ficam. Sem `strummings`, tempo, compasso e `{x_strum:}` não entram. Sem `timeSignature`, o compasso cai em 4/4; tempo e batida continuam |
| `content` | o texto da API, dentro de `<pre>`, do jeito que veio |

O acorde em `content` já é `<b>Bm7</b>`. O parser usa o texto da tag.
`data-chord-original-text`, quando a tag traz, ganha desse texto. Não
reescreva para `data-chord-name`.

A tablatura vem entre `#t1#`…`#/t1#` e `#t2#`…`#/t2#`. O parser corta esses
blocos (teste `drops the raw #t1# block`). Não apague isso antes de devolver.

```html
<script type="application/ld+json">{"@type":"MusicComposition","name":"Wonderwall","byArtist":{"name":"Oasis"}}</script>
<script>{"config":{"capo":2,"keyShape":"Em"},"metadata":{"youtubeID":"6hzrDeceEKc"},"strummings":[{"timeSignature":["1","x","x","x","2","x","x","x","3","x","x","x","4","x","x","x"],"pattern":[7,23,23,19,23,19,7,23,23,19,23,19,7,23,7,19],"bpm":87,"section":"Ritmo Padrão"}]}</script>
<button data-anchor="--chord-tone">Em</button>
<pre>
[Intro] <b>Em7</b>  <b>G</b>

…o content da API, inclusive #t1#…
</pre>
```

O `pattern` do exemplo é um 4/4 de 16 passos que o parser aceita; na cifra
real, copie o array que a API mandou (`time_signature` renomeado para
`timeSignature`). A demo monta essa página em `src/core/cifraclub-api-html.ts`.

## 12. Checklist rápido

- [ ] Vue 3 único no bundle; CSS do pacote no app
- [ ] `ClientOnly` (Nuxt) / montar só no cliente
- [ ] Ancestral com altura (`100dvh` standalone, ou bloco `100dvh` no fluxo)
- [ ] Rota palco / PWA: `<meta name="viewport" … viewport-fit=cover>`
- [ ] Header do host usa `env(safe-area-inset-top)`; **não** duplicar inset inferior no frame
- [ ] Não sobrescrever `.cpv-swipe-rail` nem `.cpv-scroll { touch-action }`
- [ ] Não sobrescrever `.cpv-root` / `.cpv-scroll`
- [ ] Sem iframe
- [ ] Ficha real: conteúdo acima **e** abaixo; snap no frame
- [ ] Palco: rota própria + “Tocar ao vivo”
- [ ] Toque na cifra ≠ tela cheia
- [ ] Intros/solos no `.cho` com `x///` — não uma fileira de acordes sem marca ([`MARCAS-X.md`](./MARCAS-X.md))
- [ ] Áudio de referência: `setRehearsalAudio` no `.cho` → `source` (não existe prop `audioUrl`); GET com CORS se quiser cache/seek
- [ ] Cifra Club: `fetchChart` no backend; se a página não for a cifra, API `/v3/version/…` e o HTML da [§11](#11-buscar-no-cifra-club-fetchchart)

Props, emits e o resto da API: [README](../README.md).
