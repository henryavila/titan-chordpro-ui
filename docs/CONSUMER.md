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
(oculta `{c:}` de ensaio), `quebrar=1`, `audio=1` (grava cantado+playback na demo; `audio=cantado` / `audio=playback` só um).
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
| Chrome do músico (tom, capo, rolagem, tema, export CHO/PDF/slides, ensaio, áudio de referência) | Shell do app (login, nav, lista de músicas do site, player **sincronizado**) |
| Palco no celular, se o host der a geometria certa | Fullscreen nativo no Safari do iPhone (a plataforma não tem) |

Duas composições, o **mesmo** componente:

1. **Standalone** — rota só da cifra, `100dvh`, sem shell. Palco.
2. **Na página** — bloco `100dvh` no fluxo de uma ficha/detalhe que tem
   conteúdo acima e abaixo. O músico rola até a cifra; o frame estaciona.

Não existe terceira: cifra fluindo como texto da página. Auto-scroll, zen e
linha de leitura exigem viewport próprio. Achatar `.cpv-scroll` para
`overflow: visible` desmonta o produto.

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

Trocar de música guarda tom, capo, velocidade e posição de rolagem **daquela**
música. **Cifra | Letra** (`lens`) e `hideComments` são escolha do ensaio —
**não** resetam ao mudar de cifra. No celular, deslize **na borda** da cifra pinta
um fade + chevron e só confirma ao soltar depois do limiar — o centro só rola, não
troca de música. Trilho 64px no celular, 128px no tablet. `capabilities.debugSwipe`
pinta as zonas (demo: `?zonas=1`). No fim da auto-rolagem o viewer
**oferece** a próxima; nunca avança sozinho.

### Áudio de referência

O ensaio pode tocar um arquivo (ou um GET que faz stream) **sem** sincronizar
com a letra, o Rolar ou o `{duration:}`. A URL mora no ChordPro:

```ts
import { setAudioUrl, audioUrlOf, audioTracksOf, setAudioArt } from '@henryavila/titan-chordpro-ui'

let next = setAudioUrl(cho, 'https://cdn.example/nasce-voz.m4a?h=a1', 'cantado')
next = setAudioUrl(next, 'https://cdn.example/nasce-pb.m4a?h=b2', 'playback')
audioTracksOf(next) // { cantado, playback } — cada um string | null
setAudioUrl(next, null, 'playback') // tira só o playback
```

Dois tipos, independentes: **cantado** (`{x_audio_cantado:}`) e **playback**
(`{x_audio_playback:}`). Qualquer combinação vale — os dois, só um, ou
nenhum. `{x_audio:}` legado lê como cantado. Sem nenhuma faixa, o chrome
não muda. Com as duas, o card troca Cantado | Playback.

Capa opcional (mesma regra de URL):

```ts
const next = setAudioArt(cho, 'https://cdn.example/nasce.jpg?h=a1b2')
```

O player mostra `{title:}` (sem o prefixo `001 - ` do hinário), `{artist:}`
ou `{subtitle:}`, e a capa. Sem arte, um placeholder. O dock nasce com o
chip **Cantado** ou **Playback**; o card abre por ele e fecha no X (fechar
não para o áudio).

`writeMeta` substitui o header inteiro: use `setAudioUrl` / `setAudioArt`.
YouTube, Spotify, `javascript:` e `data:` são recusados (throw).

Troca de faixa = **outra URL** (hash na query). O Titan guarda o arquivo no
Cache Storage keyed pela URL completa; a 1ª vez toca em stream e preenche o
cache atrás (CORS no GET). Sem CORS, toca e o cache vira no-op. Teto ~100 MB
LRU; arquivo > 20 MB toca e não guarda.

O GET precisa de `Access-Control-Allow-Origin` e, na 1ª vez, `Accept-Ranges:
bytes` para o seek. URL assinada que muda de token a cada hora destrói o
cache — o hash só muda quando o áudio muda.

Demo: `/standalone.html?audio=1`.

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
3. Admin em `persisted` abre **Sugestões dos músicos** → vê quem enviou, preview da batida (faixa) e encaixa / conflito → Aceitar lote ou item a item.
4. Aceitar emite `save-content` **e** `suggestion-accepted` (`officialText` igual ao save).
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

## 11. Checklist rápido

- [ ] Vue 3 único no bundle; CSS do pacote no app
- [ ] `ClientOnly` (Nuxt) / montar só no cliente
- [ ] Ancestral com altura (`100dvh` standalone, ou bloco `100dvh` no fluxo)
- [ ] Não sobrescrever `.cpv-root` / `.cpv-scroll`
- [ ] Sem iframe
- [ ] Ficha real: conteúdo acima **e** abaixo; snap no frame
- [ ] Palco: rota própria + “Tocar ao vivo”
- [ ] Toque na cifra ≠ tela cheia
- [ ] Intros/solos no `.cho` com `x///` — não uma fileira de acordes sem marca ([`MARCAS-X.md`](./MARCAS-X.md))

Props, emits e o resto da API: [README](../README.md).
