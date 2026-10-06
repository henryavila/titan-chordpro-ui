# Guia do consumer — `@henryavila/titan-chordpro-ui`

Como um app Vue 3 ou Nuxt **incorpora** a UI de 1 cifra. Este pacote não é um
iframe, não é um site, e **não amarra um consumer específico**. Quem consome
escolhe a composição; o Titan entrega o mesmo componente.

## Migração para `TitanChordpro`

Ao atualizar de uma versão que expõe `<ChordproViewer>`, troque o import e a
tag por `<TitanChordpro>`. No TypeScript, `ChordProView` passa a
`TitanChordproDocument` (com `TitanChordproSection` / `TitanChordproLine`),
`createViewerController` passa a `createTitanChordproController` e os tipos
`Viewer*` / `ChordproViewer*` passam a `TitanChordpro*`. O pacote não exporta
aliases antigos.

Atualize CSS e consultas ao DOM do host: `.cpv-*` → `.titan-chordpro-*`,
`--cpv-*` → `--titan-chordpro-*` e `data-cpv-*` → `data-titan-chordpro-*`.
A raiz do HTML estático (`renderHtml`) é `titan-chordpro` com o gancho de
tema `titan-chordpro--{tema}` — não `cpv` / `cpv--{tema}`. As classes sem
prefixo também saíram; a leitura no Vue usa os mesmos nomes estruturais:

| Antes | Agora |
|---|---|
| `cpv` | `titan-chordpro` |
| `cpv--{tema}` | `titan-chordpro--{tema}` |
| `chordpro-content`, `song-content` | saíram da raiz |
| `chord` | `titan-chordpro-chord` |
| `word` | `titan-chordpro-word` |
| `lyric` | `titan-chordpro-lyric` |
| `lyrics-line` | `titan-chordpro-row` |
| `comment-line` | `titan-chordpro-comment` |
| `chorus-section` | `titan-chordpro-chorus` |

Estrofe, nota, TAB, partitura e imagem: `titan-chordpro-stanza`,
`titan-chordpro-note`, `titan-chordpro-tab`, `titan-chordpro-score`,
`titan-chordpro-image`. Sem esses nomes, o CSS e as consultas do host
deixam de achar a cifra. O pacote não emite aliases.

Se o host chama o helper de ajuste fino da rolagem automática, troque
`viewerMulStep` por `adjustScrollMultiplier`. A assinatura continua
`(mul, 'up' | 'down')`: ±12% por passo, limitado a 0,3×–3×. O nome antigo
não é exportado.

Os valores de `STORE_KEYS` agora começam com `titan-chordpro:`. Se o host
guarda preferências, versões pessoais ou sugestões sob `cpv:*`, copie esses
valores para as novas chaves **antes** de atualizar o pacote; os nomes antigos
não são lidos automaticamente. Os modos `view` / `edit`, as diretivas
`x_titan_*` e as marcas de tempo `x///` permanecem iguais.

Uma música continua sendo **uma string**. Várias versões da mesma cifra
moram nela, entre `{start_of_x_chart:id}` e `{end_of_x_chart}`. O nome
visível é `{x_chart_label:}`. `{x_chart_default:id}` é a versão que abre
quando o programa não manda `songs[].chartId`. O músico troca no chip e o
componente emite `update:chartId`; isso não reescreve o programa até o host
gravar. `save-content` devolve o arquivo inteiro. O overlay pessoal é
`titan-chordpro:my:{songId}` na cifra única e
`titan-chordpro:my:{songId}:{chartId}` quando a versão tem id próprio.
**Minha versão** é esse overlay, não um bloco do arquivo. Sugestão leva o
`chartId` da versão em que o diff foi feito; aceitar altera só esse bloco.

---

Demo neste repo (`pnpm dev`): índice em `/`. O mesmo `<TitanChordpro>`;
**não** há iframe. Quatro estados (standalone × shell, uma cifra ×
apresentação ao vivo), mais criar, acento e um host errado. Cada card traz
a chamada resumida.

| URL | O que é |
|---|---|
| `/` | Índice das demos |
| `/standalone.html` | Standalone: a cifra é a página |
| `/standalone-lista.html` | Standalone com apresentação (`songs`) |
| `/media.html` | Host completo da Central de Mídia (leitura + áudio + capa 1024) |
| `/site.html` | Vue no shell do consumer (conteúdo acima e abaixo) |
| `/site-lista.html` | Shell com apresentação |

Query nas mesmas páginas: `criar=1`, `editMode` (local / persisted / none),
`ensaio=demanda` (fontes sob demanda), `song`, `tema`, `accent` (`verde` /
`teal` / `#hex`), `lens` (`none` / `letra` / `nashville`), `comentarios=0`
(oculta `{c:}` de ensaio), `quebrar=1`, `audio=1` (cantado+playback na demo;
`audio=cantado` / `audio=playback` só um; `capa=0` = arte genérica). Lista
com áudio e anterior/próxima na Central de Mídia:
`/standalone-lista.html?audio=1`. Host de uma cifra: `/media.html`.
Alias legado: `modes` (`content`→`persisted`).

Bookmarks antigos (`/?ficha=1`, `/?ensaio=juntas`) redirecionam para a página nova.

---

## 1. Instalar

```sh
pnpm add @henryavila/titan-chordpro-ui
# peers: vue ^3.5 (obrigatório para a UI)
#        vexflow (só se for desenhar {x_titan_start_of_score}/{sot})
#        pdfjs-dist (só se for importar PDF)
```

```ts
import { TitanChordpro } from '@henryavila/titan-chordpro-ui/vue'
// o pacote já puxa o CSS; importe de novo só para controlar a ordem:
import '@henryavila/titan-chordpro-ui/vue/style.css'
```

Em Nuxt, monte no cliente (`ClientOnly`): o TitanChordpro fala com `document` /
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
| Um SFC: `<TitanChordpro>` | Um `<iframe src="…">` |
| Superfície de **1 cifra** com scroller próprio | Um artigo que cresce com a página |
| Chrome do músico (tom, capo, rolagem, tema, export CHO/PDF/slides/ppsx, ensaio, **diagrama do acorde**, áudio de referência) | Shell do app (login, nav, lista de músicas do site, player **sincronizado**) |
| Palco no celular, se o host der a geometria certa | Fullscreen nativo no Safari do iPhone (a plataforma não tem) |

Duas composições, o **mesmo** componente:

1. **Standalone** — rota só da cifra, `100dvh`, sem shell. Palco.
2. **Na página** — bloco `100dvh` no fluxo de uma ficha/detalhe que tem
   conteúdo acima e abaixo. O músico rola até a cifra; o frame estaciona.

Não existe terceira: cifra fluindo como texto da página. Auto-scroll, zen e
linha de leitura exigem viewport próprio. Achatar `.titan-chordpro-scroll` para
`overflow: visible` desmonta o produto.

Toque no acorde abre o diagrama (violão, ukulele, piano), em tela cheia no
ensaio. Ligado por omissão. Para desligar: `:capabilities="{ diagrams: false }"`.
O instrumento é preferência do aparelho, não da cifra. Só letra não abre o
modal.

---

## 3. Standalone — página só da cifra

Use quando o músico vai **tocar**: ensaio, culto, palco. A cifra já é a tela
do site. No iPhone não há botão de tela cheia (não há o que ganhar além da
moldura do Titan); o toque na cifra só esconde/mostra os controles. Link de
cantor (abrir já na letra): [§8](#8-tema-fonte-acento-cifra-ou-letra).

### Vue (SPA)

```vue
<script setup lang="ts">
import { TitanChordpro } from '@henryavila/titan-chordpro-ui/vue'
import '@henryavila/titan-chordpro-ui/vue/style.css'

defineProps<{ source: string; songId: string }>()
</script>

<template>
  <div class="cifra-live">
    <TitanChordpro :source="source" :song-id="songId" edit-mode="local" />
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
      <TitanChordpro
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
**não** é um header sozinho: tem conteúdo em cima e embaixo. O TitanChordpro é um
bloco `100dvh` no fluxo.

Na abertura a cifra nasce abaixo da dobra. Ao rolar, o frame estaciona no topo
da viewport (`scroll-snap`) e o dock senta na dobra. Aí o músico toca.

### Vue / Nuxt

```vue
<script setup lang="ts">
import { TitanChordpro } from '@henryavila/titan-chordpro-ui/vue'

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
        <TitanChordpro :source="source" :song-id="songId" edit-mode="local" />
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
de `.titan-chordpro-root` são só o `min-height` interno — não use como altura do host.

### O que o host não deve fazer

| Não faça | Por quê |
|---|---|
| Ancestral sem altura (`height: auto`) | `height:100%` não resolve; a barra cai no fim da cifra |
| Frame `100dvh` que começa no meio da tela **sem** o músico poder estacioná-lo | O dock fica sob a dobra |
| Esvaziar a ficha para um header de 56px | Nunca é o caso real; a cifra convive com o resto da página |
| Sobrescrever `height` / `overflow` / `position` de `.titan-chordpro-root` ou `.titan-chordpro-scroll` | Desmonta o containing block |
| `<iframe>` | `position:fixed` não escapa do frame; no iPhone não há Fullscreen API |
| `position:fixed` no host para “resolver” a cifra | O TitanChordpro já pina a própria raiz |
| Standalone / PWA / `100dvh` **sem** `viewport-fit=cover` no viewport | `env(safe-area-inset-*)` fica 0 no iPhone; o dock do Titan senta no indicador de início e o toque em Rolar/Mais morre |
| Recortar `.titan-chordpro-swipe-rail` (`bottom: 180px` etc.) para “liberar o dock” | Geometria do trilho é do pacote; o recorte quebra quando o dock cresce |
| `padding-bottom: env(safe-area-inset-bottom)` no frame **e** no dock | Folga duplicada; a última linha da cifra sobe à toa |

Quando o ancestral não tem altura, o TitanChordpro avisa no console e na tela
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

Em **toda** rota que monta o TitanChordpro em tela cheia / PWA / Add to Home Screen,
o meta viewport leva `viewport-fit=cover`. Sem isso o padding de safe-area
do dock do Titan é zero e Rolar/Mais caem na zona morta do indicador de
início. Header do host usa `env(safe-area-inset-top)`. `apple-mobile-web-app-capable`
e `display: standalone` no manifest são do host; o pacote não instala PWA.

**Offline.** O Titan lê, transpõe, rola e toca o metrônomo sem rede, desde que
o ChordPro já esteja no `source` (ou no cache da lista). Fontes Sora e Space
Mono vêm no CSS do pacote. O áudio de referência entra no Cache Storage ao
montar a cifra e nas duas vizinhas da lista, quando o ChordPro delas já chegou.
O host pré-carrega o repertório com `fillAudioCache` / `matchAudio` /
`putAudio` de `@henryavila/titan-chordpro-ui/vue`.

Reabrir a página sem internet é do **host**: service worker + precache da
casca (HTML/JS/CSS/fontes) + cifras em `songs[].source` ou `loadSong` que lê
IndexedDB primeiro + `persistAsset` local para GPX/imagem/áudio. O pacote não
registra service worker. Modelo: o demo deste repositório (PWA no GitHub
Pages). Cifra Club, duração do YouTube e o POST de sugestão pedem rede. Sem
internet o Titan marca esses itens (selo **Sem internet**) e, no toque,
explica: a sugestão fica na Minha versão; no Cifra Club, Arquivo ou Texto.
A leitura, o transpor, o Rolar e o exportar continuam. Passe `online` se o
host souber a conexão melhor que `navigator.onLine`.

**Tela ligada.** Enquanto o `<TitanChordpro>` está montado, o pacote pede
`navigator.wakeLock` (`screen`) para o aparelho não apagar no ensaio. Sem
botão, sem PWA, sem prop do host. Precisa de HTTPS e da página visível; ao
voltar para a aba, o pedido se repete. Sem a API (Safari antigo) ou com o
pedido recusado, é no-op. O consumer não implementa isso.

---

## 6. Ensaio (lista)

Duas ou mais entradas em `songs` ligam lista, anterior/próxima e lugar por
música. Com uma, ou nenhuma, o TitanChordpro é a cifra única de sempre.

```vue
<TitanChordpro
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
  tempo?: string | number // {tempo:} na lista, mesmo sem o ChordPro
  time?: string           // {time:} — 4/4, 6/8… — some se vazio
  source?: string // se já veio, toca offline
}

async function buscarCifra(id: string): Promise<string> {
  const res = await fetch(`/api/chordpro/${id}`)
  return res.text()
}
```

Quem já tem o ChordPro manda em `source` na entrada; o resto é pedido por
`loadSong`. A atual e as duas vizinhas são buscadas na frente. Com
`prefetch-all`, o Titan pede **todas** as cifras da lista e guarda o áudio
de cada uma no Cache Storage — para um ensaio curto (umas poucas músicas),
não um hinário. Uma que não chega vira painel *Não carregou*. `time` e
`tempo` rotulam a lista mesmo sem o arquivo; se faltarem, o Titan lê
`{time:}` e `{tempo:}` do ChordPro em cache. Sem `{time:}`, o chip de
compasso não aparece.

```vue
<TitanChordpro
  :songs="repertorio"
  :load-song="buscarCifra"
  prefetch-all
/>
```

`{key:}` no `.cho` é o tom original. `{transpose:N}` hidrata o −/+ ao abrir
(não soma com o overlay). `{capo:}` no arquivo é dica de arranjo — o capotraste
ao vivo começa em 0, a não ser que o músico (setlist ou overlay)
já tenha ligado. Reescrever (import e ficha) é pergunta; o corpo só muda depois
do Sim.

Trocar de música guarda tom, capo, velocidade e posição de rolagem **daquela**
música. **Cifra | Letra** (`lens`) e `hideComments` são escolha do ensaio —
**não** resetam ao mudar de cifra. No celular, deslize **na borda** da cifra pinta
um fade + chevron e o selo Próxima / Anterior sobe acima do dedo; só confirma ao
soltar depois do limiar — o centro só rola, não troca de música. Trilho 64px no celular, 128px no tablet. `capabilities.debugSwipe`
pinta as zonas (demo: `?zonas=1`). No fim da auto-rolagem o TitanChordpro
**oferece** a próxima; nunca avança sozinho.

### Áudio de referência

Não é prop do `<TitanChordpro>` (não existe `audioUrl`). O host grava cantado,
playback e capa **no `.cho`** e passa o texto em `source`. O player aparece
sozinho quando há pelo menos uma faixa playable. Não sincroniza com a letra,
o Rolar nem `{duration:}` — player sincronizado continua sendo do host.

```ts
import { setRehearsalAudio, audioTracksOf, audioArtOf } from '@henryavila/titan-chordpro-ui'

cho = setRehearsalAudio(cho, {
  sung: 'https://cdn.example/nasce-voz.m4a?h=a1',
  playback: 'https://cdn.example/nasce-pb.m4a?h=b2', // opcional
  art: { url: 'https://cdn.example/nasce-1024.jpg?h=c3', width: 1024, height: 1024 },
})
```

```vue
<TitanChordpro
  :source="cho"
  :song-id="id"
  :default-audio-art="{ url: '/marca-1024.jpg', width: 1024, height: 1024 }"
  @update:source="cho = $event"
/>
```

Chave omitida não mexe; `null` apaga. Qualquer combinação vale (os dois, só um,
ou nenhum). Sem faixa, o chrome não muda. Caminho same-origin (`/audio/nasce.m4a`)
também vale. Uma faixa só: `setAudioUrl(cho, url, 'sung' | 'playback')`.

Persistir é o fluxo de sempre (`update:source` / `save-content`). Não chame
`writeMeta(cho, { x_titan_audio_sung })` sozinho — `writeMeta` substitui o header
inteiro; use `setRehearsalAudio`.

**Capa da cifra:** quadrado **1024 × 1024 px** em `{x_titan_audio_art:}`. A Central
de Mídia mostra a capa em 1:1. Passe `width` e `height` **desse arquivo**,
não do original de 3000 px. A URL precisa ser fetchável (CORS).

**Capa padrão da marca:** prop `defaultAudioArt` (`{ url, width, height }`),
quadrado **1024 × 1024**. Vale quando a cifra não tem `{x_titan_audio_art:}`. A arte
da cifra vence. Sem as duas, o Titan usa a arte genérica 512×512.

Enquanto o áudio toca, o Titan publica na Central de Mídia o `{title:}` (sem
o prefixo `001 - ` do hinário), o `{artist:}` ou `{subtitle:}`, Cantado ou
Playback, e a capa. Play e pause nos botões do sistema controlam este
player. Sem lista, também ±10 s. Num ensaio (`songs` com duas ou mais
entradas), anterior e próxima no aparelho e no fone trocam a cifra da lista
— o mesmo caminho do dock. Pular recomeça o áudio do zero, mesmo se as duas
cifras apontam para o mesmo arquivo. O iPhone só mostra um dos dois pares:
no set valem anterior/próxima; os ±10 s ficam no player da cifra. No Chrome
do Android a notificação e a tela de bloqueio mostram o mesmo par. Sem
faixa na cifra da vez, a sessão some. O título da **página**
(`document.title`) continua sendo o do seu app — a Central de Mídia usa o
da música. No iOS, o toque no cartão (fora dos botões) pode abrir outro PWA
instalado — limitação do sistema; o Titan não escolhe esse destino.

Host de uma cifra: **`/media.html`**. Leitura (`edit-mode="none"`), cantado +
playback, capa 1024 px e `defaultAudioArt`. A faixa no topo mostra o nome da
página do consumer e, ao lado, o que a Central de Mídia recebeu. Sem arte
na cifra: `/media.html?capa=0`. Ensaio com lista: **`/standalone-lista.html?audio=1`**
(cada cifra leva uma faixa diferente, para ouvir a troca). No celular, toque
play e bloqueie a tela.

**BREAKING CHANGE — migração obrigatória antes de atualizar o pacote.**
Atualize as cifras já salvas e os campos lidos/enviados pelo consumer:

| Nome anterior | Nome obrigatório |
|---|---|
| `x_source`, `x_origem` | `x_titan_source` |
| `x_youtube` | `x_titan_youtube` |
| `x_audio_sung`, `x_audio`, `x_audio_cantado` | `x_titan_audio_sung` |
| `x_audio_playback` | `x_titan_audio_playback` |
| `x_audio_art` | `x_titan_audio_art` |
| `x_audio_art_w`, `x_audio_art_h` | `x_titan_audio_art_w`, `x_titan_audio_art_h` |
| `x_strum`, `x_strum_set` | `x_titan_strum`, `x_titan_strum_set` |
| `score` | `x_titan_score` |
| `sos`, `start_of_score` | `x_titan_start_of_score` |
| `eos`, `end_of_score` | `x_titan_end_of_score` |
| `parseXStrum`, `formatXStrum` | `parseTitanStrum`, `formatTitanStrum` |
| `parseXStrumSet`, `formatXStrumSet` | `parseTitanStrumSet`, `formatTitanStrumSet` |

As chaves novas também são as propriedades de `ChartMeta`, os valores de
`MetaKey` / `META_KEYS` e as chaves dos patches para os nove metadados.
As três diretivas de notação são blocos do documento. `ParsedScore.from`
passa de `sos` para `x_titan_start_of_score` quando a notação é interna.
Ajuste os leitores, escritores
e imports do consumer junto com a atualização das cifras. Não há aliases nem
conversão automática. Diretivas padrão e marcas de tempo `x///` não mudam.

Diretivas (inglês no arquivo): `{x_titan_audio_sung:}`, `{x_titan_audio_playback:}`,
`{x_titan_audio_art:}`, `{x_titan_audio_art_w:}`, `{x_titan_audio_art_h:}`. UI: Cantado / Playback.
Os nomes antigos não são interpretados nem convertidos. Arquivos e propriedades
de `ChartMeta` devem usar `x_titan_*`; veja [o contrato de nomes](NAMING.md#custom-chordpro-tags-x_titan_).

O player na cifra mostra o mesmo título, artista e capa. Com as duas faixas,
Cantado / Playback são pílulas clicáveis; com uma só, só o rótulo. No celular
o ícone de fone na linha de Cifra | Letra: toque abre o player
(capa e transporte). Enquanto toca, o fone anima uma onda. Esconder a barra
fecha o player grande e deixa o fone. No computador o chip continua acima da
barra, com título. X fecha o player (sem parar o áudio).

A origem da cifra no arquivo é `{x_titan_source:}` (inglês).
Na UI o campo continua **Origem** /
**Referência**.

YouTube, Spotify, Apple Music, `javascript:` e `data:` são recusados (throw).

Troca de faixa = **outra URL** (hash na query). O Titan guarda o arquivo no
Cache Storage keyed pela URL completa; a 1ª vez toca em stream e preenche o
cache atrás (CORS no GET). Sem CORS, toca e o cache vira no-op. Teto ~100 MB
LRU; arquivo > 20 MB toca e não guarda. Não usa `ChartStore` / `localStorage`.

O GET precisa de `Access-Control-Allow-Origin` e, na 1ª vez, `Accept-Ranges:
bytes` para o seek. URL assinada que muda de token a cada hora destrói o
cache — o hash só muda quando o áudio muda.

Demo: `/media.html` (host completo). Lab: `/standalone.html?song=100-nasce-em-mim&audio=1` (cantado + playback a 65 BPM, 2:41). Arte genérica: `&capa=0`.

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
<TitanChordpro
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

O músico troca no interruptor **Cifra | Letra** (tecla `L`). Você decide o que
aparece **ao abrir**: um link de cantor já chega na letra.

| Você passa | Abre em |
|---|---|
| `lens="letra"` | Letra — sem acordes, tab, partitura nem marcas `x///` |
| `lens="none"` | Cifra |
| `lens="nashville"` | Cifra com graus Nashville |
| omitir a prop | última escolha deste aparelho |

Nashville e os comentários de ensaio ficam na barra (desktop) ou no menu Mais
(celular). Não há menu chamado “Lentes”.

| Prop | Valores | Papel |
|---|---|---|
| `lens` | `none` \| `letra` \| `nashville` | Projeção ao abrir. `letra` = só a letra. `none` = cifra. Omitir = última escolha do aparelho |
| `hideComments` | `boolean` | Esconde `{c:}` de ensaio **só** na leitura |
| `rehearsalFocus` | `off` \| `batida` | Perfil de chrome **Ensaio Batida** (strip + som da batida no Rolar). Ortogonal a `lens`. Reseta ao trocar de música no setlist, salvo se o host mantiver a prop. |

`lens` / `hideComments` sobrevivem à troca de música no ensaio (`songs`) e emitem
`update:lens` / `update:hideComments` (dá para `v-model:lens`). `rehearsalFocus`
emite `update:rehearsalFocus`. O músico ainda pode mudar pelo interruptor. O
`.cho` **não** é reescrito — marcas e comentários continuam no arquivo.

**Som no ensaio:** no painel Metrônomo a **Fonte** é `Mudo | Click | Batida`
(prefs `metSound` / `metStrumSound`). O botão **Rolar** fora do Ensaio Batida
sobe o relógio **sem áudio**, para a Fonte de prática não vazar no palco. Para
ouvir batida ao rolar: entre em **Ensaio batida** ou inicie pelo metrônomo.

**Pulso visual:** a coluna 1–2–3–4 à esquerda marca o tempo do compasso. No
painel, **Faixa do título** faz a barra acender no tempo e apagar no
contratempo. Rolar não liga a faixa.

Na lente `letra`, `x///` / `//` / `/_` colados ao acorde **não** vazam na
letra (`razão.[E]//` → `razão.`). Detalhe e o que **não** se apaga:
[`MARCAS-X.md`](./MARCAS-X.md) § Lente Só letra.

URL típica para o cantor (o host lê a query e passa a prop):

```vue
<!-- /cifras/[id]?lens=letra  →  pages/cifras/[id].vue -->
<script setup lang="ts">
const route = useRoute()
const lens = computed(() => {
  const q = route.query.lens
  return q === 'letra' || q === 'nashville' || q === 'none' ? q : undefined
})
</script>

<template>
  <ClientOnly>
    <div class="h-dvh overflow-hidden">
      <TitanChordpro
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

`?lens=letra` abre na letra (cantor). `?lens=none` abre na cifra, mesmo se este
aparelho tinha ficado em Letra. Sem `lens` na URL, a prop fica omitida e vale
a última escolha.

Na demo deste repo: `/standalone.html?lens=letra` (opcional: `&comentarios=0`).
Lista: `/standalone-lista.html?lens=letra`.

```css
.host-cifra {
  --titan-chordpro-font-lyrics: Figtree, system-ui, sans-serif;
  --titan-chordpro-font-controls: Figtree, system-ui, sans-serif;
  --titan-chordpro-font-chords: 'Space Mono', monospace;
}
```

Sora e Space Mono vêm no CSS do pacote (`vue/style.css`). Remapeie os tokens só se o host quiser outras famílias.

---

## 9. Letra e slides — sem abrir a cifra

Cada arquivo baixável segue o mesmo contrato. O host passa a string ChordPro
e recebe `{ bytes, filename, mime, title }` (`ExportedFile`) — sem montar
`<TitanChordpro>`. O `mime` vem de `EXPORT_MIME` no núcleo. O writer pesado
fica na entrada do pacote (`./pdf`, `./slides`, `./bundle`). Não há registro
de plugins.

| Arquivo | Host (sem Vue) | Já tem o ViewModel |
|---|---|---|
| ChordPro | `exportChoFile(source)` em `.` | `exportCho(source)` reescreve o texto |
| Letra (cadastro) | `exportLyrics(source)` em `.` | — |
| PDF | `exportPdf(source)` em `./pdf` | `renderPdf(view)` |
| Louvor JA | `exportSlja(source)` em `./slides` | `renderSlja(view)` |
| PowerPoint | `exportPpsx(source)` em `./slides` | `renderPpsx(view)` |
| Cifra completa | `exportChartBundle(source)` / `importChartBundle(bytes)` em `./bundle` | — |

O TitanChordpro exporta `.slja` (Louvor JA) e `.ppsx` (PowerPoint, abre em
apresentação) pelo menu **Exportar**. Os dois usam o mesmo recorte da letra e
as mesmas imagens de capa e fundo. Numa lista de músicas o host não precisa
montar `<TitanChordpro>`: a string ChordPro basta.

```ts
import { EXPORT_MIME } from '@henryavila/titan-chordpro-ui'
import { exportSlja, exportPpsx, NoSlideLyricsError } from '@henryavila/titan-chordpro-ui/slides'

async function baixarSlides(chordpro: string, capa?: Uint8Array, fundo?: Uint8Array) {
  const { bytes, filename } = await exportSlja(chordpro, {
    coverImage: capa,      // opcional — default do pacote
    slidesImage: fundo,    // opcional — default do pacote
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([bytes], { type: EXPORT_MIME.slja }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

async function baixarPpsx(chordpro: string, capa?: Uint8Array, fundo?: Uint8Array) {
  const { bytes, filename } = await exportPpsx(chordpro, {
    coverImage: capa,
    slidesImage: fundo,
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([bytes], { type: EXPORT_MIME.ppsx }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
```

`NoSlideLyricsError` é a cifra sem letra (só intro/`x///`). Serve no browser
e num handler Nitro/Node — não puxa Vue. A quebra de slide segue as linhas
da cifra: uma linha da cifra que junta duas frases (maiúscula no meio) vira
um slide de duas linhas; duas linhas longas independentes não compartilham
o mesmo slide. No `.ppsx`, título e letra aparecem em caixa alta. O `.slja`
mantém a capitalização da cifra.

A mesma cifra cadastra a letra — sem acordes, `x///` nem comentário de ensaio:

```ts
import { exportLyrics } from '@henryavila/titan-chordpro-ui'

const { title, artist, lyrics } = exportLyrics(chordpro)
// lyrics: plaintext, linha da cifra = linha; linha em branco = seção
```

Cifra só instrumental: `lyrics` vem `''`. Não puxa Vue.

No TitanChordpro, as mesmas imagens entram pelas props `coverImage` / `slidesImage`.

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
<TitanChordpro
  edit-mode="local"
  :source="cho"
  :song-id="id"
  :version="version"
  :actor-key="userId"
  :actor-name="displayName"
  :suggestion-queue="queue"
  :upload-score="uploadScore"
  :resolve-score="resolveScore"
  :load-bundle-asset="loadAsset"
  :persist-suggestion="persistSuggestion"
  @suggestion-created="onSuggestionAck"
  @update:suggestionQueue="queue = $event"
/>

<!-- Admin / PDP (backend) -->
<TitanChordpro
  edit-mode="persisted"
  :source="cho"
  :song-id="id"
  :version="version"
  :suggestion-queue="queue"
  :upload-score="uploadScore"
  :resolve-score="resolveScore"
  @save-content="cho = $event"
  @save="persistDirectSave"
  @suggestion-accepted="onAccepted"
  @suggestion-refused="onRefused"
  @update:suggestionQueue="queue = $event"
/>
```

Para abrir no app um ZIP de **Cifra completa**, não há tela no Titan: o host
chama `importChartBundle` e implementa `persistAsset` com o mesmo
`uploadScore` / `uploadImage` / armazenamento de áudio da edição. Passo a passo
em [Cifra completa (.zip)](#cifra-completa-zip).

```ts
import type { Suggestion } from '@henryavila/titan-chordpro-ui'

const route = useRoute() // Nuxt; use o roteador do seu app
const id = String(route.params.songId)
const cho = ref('')
const version = ref('')
const queue = ref<Suggestion[]>([])

async function refresh() {
  const chart = await api.get(`/songs/${id}`)
  cho.value = chart.source
  version.value = chart.version
  queue.value = await api.get(`/songs/${id}/suggestions`)
}

async function uploadScore(file: File): Promise<{ ref: string }> {
  const body = new FormData()
  body.append('file', file, file.name)
  return api.post(`/songs/${id}/scores`, body) // resposta: { ref: 'solos/<id>.gpx' }
}

function resolveScore(ref: string): string {
  return `/api/songs/${id}/assets?kind=score&ref=${encodeURIComponent(ref)}`
}

async function loadAsset(ref: string, kind: 'score' | 'image' | 'audio') {
  const url = `/api/songs/${id}/assets?kind=${kind}&ref=${encodeURIComponent(ref)}`
  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) throw new Error('Anexo indisponível')
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') ?? undefined,
    filename: response.headers.get('x-filename') ?? undefined,
  }
}

async function persistSuggestion(s: Suggestion): Promise<void> {
  // Envie o objeto inteiro, inclusive scoreAttachments[].base64.
  await api.post(`/songs/${id}/suggestions`, s)
}

async function onSuggestionAck(_s: Suggestion) {
  // Depois do ack: atualize os status. O POST já ocorreu em persistSuggestion.
  queue.value = await api.get(`/songs/${id}/suggestions`)
}

async function persistDirectSave(text: string) {
  await api.put(`/songs/${id}`, { source: text })
  await refresh()
}

async function onAccepted(p: { id: string; opIds: string[]; officialText: string; status: string }) {
  try {
    // Uma transação no servidor grava texto oficial + status dos itens.
    await api.post(`/songs/${id}/suggestions/${p.id}/accept`, p)
  } finally { await refresh() }
}

async function onRefused(p: { id: string; opIds: string[]; status: string }) {
  try { await api.post(`/songs/${id}/suggestions/${p.id}/refuse`, p) }
  finally { await refresh() }
}

onMounted(refresh)
```

`api` e os caminhos HTTP acima são um exemplo de integração; o consumer cria esses endpoints. Use o **mesmo `songId`** no músico e no responsável. O `GET` da fila devolve sugestões com `ops`, `resolvedOps`, `status`, `actorName` e `scoreAttachments`: **apenas as próprias** ao músico e **todas** ao responsável. Autorize cada leitura/escrita no servidor, valide extensão/tamanho dos arquivos e guarde o texto oficial e o resultado da aceitação na mesma transação. O servidor deve devolver a fila atualizada após cada decisão; `update:suggestionQueue` atualiza a tela imediatamente. `save-content` reflete o texto na tela tanto em um save direto quanto numa aceitação; `save` é emitido apenas no save direto. `suggestion-accepted` traz o `officialText` já com a referência do arquivo aprovada.

| Endpoint do exemplo | Contrato mínimo no servidor |
|---|---|
| `POST /songs/:id/scores` | Recebe `multipart/form-data` (`file`), guarda os bytes originais e devolve `{ ref }` durável. É chamado no envio inicial pelo músico **e novamente** na aceitação pelo responsável. |
| `GET /songs/:id/assets?kind=score&ref=…` | Devolve bytes, `Content-Type` e, se a referência perder o nome original, `X-Filename`. Autorize acesso à música; se a API estiver em outra origem, exponha esses headers por CORS. |
| `POST /songs/:id/suggestions` | Guarda o objeto `Suggestion` completo, inclusive `scoreAttachments[].base64`; vincula a autoria à conta autenticada e só responde sucesso depois da gravação. O tamanho aceito pelo servidor deve cobrir o arquivo em base64. |
| `GET /songs/:id/suggestions` | Devolve abertos e resolvidos: somente pedidos do usuário autenticado no frontend; fila completa no papel de responsável. Inclui anexos para desenhar a prévia e status. |
| `POST /songs/:id/suggestions/:suggestionId/accept` | Confere ids dos itens, versão/encaixe contra a cifra oficial atual e a nova referência do solo. Grava cifra, status e itens resolvidos numa transação; devolve a cifra/fila atualizadas. |
| `POST /songs/:id/suggestions/:suggestionId/refuse` | Atualiza status e itens resolvidos sem mexer na cifra; devolve a fila atualizada. |

O servidor deve recalcular a aplicação dos `ops` sobre a cifra oficial atual
(helpers `applyOps`/`diffOps` do core), em vez de confiar apenas no
`officialText` recebido do navegador. Em caso de conflito ou falha de
persistência, devolva erro e recarregue `source`, `version` e a fila do servidor.
Passe `:version="version"` ao TitanChordpro para a versão pessoal detectar
mudanças no oficial. `ChartStore` guarda a versão pessoal e preferências;
`suggestionQueue` e os endpoints fazem a fila atravessar contas e aparelhos.

O POST é `persistSuggestion` (`return` da Promise), lida na hora do envio. `@suggestion-created` dispara **depois** do ack — não é o save. Se o POST ainda está no handler do evento, mova. Sem `return`, o Titan pede retry e **não** enfileira; não tosta “enviada”. A fila (e `update:suggestionQueue`, se o host injeta) só muda depois do ack.

**Fluxo sugerir → revisar**

1. Músico edita em `local` (overlay no device).
2. **Sugerir alteração** pede o **nome** (identificação) e confirmação leve. Titan **espera** `persistSuggestion`: resolve → enfileira + emit `suggestion-created` (`actorName` + `actorKey` opcional) + toast “Sugestão enviada”; reject ou `void` (sem Promise) → nada na fila, mantém Minha versão, “Não foi possível enviar. Tente de novo.” Sem a prop, o toast “enviada” é otimista (só neste aparelho). Reverter fica bloqueado enquanto envia.
3. Admin em `persisted` abre **Sugestões dos músicos** → vê quem enviou, a faixa da batida só quando ela mudou, o solo Guitar Pro/MusicXML em **Antes/Depois** com arquivo, faixa e compassos, e encaixa / conflito → Aceitar lote ou item a item. Aceitar um item deixa a revisão aberta no que ainda falta.
4. Aceitar emite `save-content` **e** `suggestion-accepted` (`officialText` igual ao save). Devolver esse texto em `source` não troca de cifra: a revisão continua.
5. Status (`pendente` / `aceita` / `recusada` / `parcial`) aparece na Minha versão do músico na próxima visita (host devolve a fila).

Quando um ajuste contém `{x_titan_score: …}`, a sugestão leva `scoreAttachments?: Array<{ src, filename, contentType?, base64 }>` com os **bytes originais** de cada arquivo proposto (inclusive ao alterar só faixa/compassos). O Titan obtém os bytes por `loadBundleAsset(ref, 'score')` ou `resolveScore(ref)` e impede o envio se não conseguir anexá-los. Se a referência não conservar a extensão original, `loadBundleAsset` pode devolver também `filename`. O host deve persistir esse campo junto de `ops` no POST e devolvê-lo em `suggestionQueue` para a revisão em outro aparelho. Na aceitação, o Titan reconstrói cada `File`, chama `uploadScore(file)` no lado do responsável e grava no ChordPro a nova referência devolvida; se esse upload faltar ou falhar, a sugestão permanece pendente e o texto oficial não muda. O mesmo vale para **Aceitar lote**. O fluxo suporta `.gp`, `.gp3`–`.gp5`, `.gpx`, `.xml`, `.musicxml` e `.mxl`.

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
Para testar um arquivo musical, abra `/standalone.html?editMode=local`, entre em
**Editar → + entre blocos → Guitar Pro / MusicXML**, escolha um `.gp`, `.gpx`
ou MusicXML, salve o trecho, volte à leitura e abra **Minha versão → Sugerir**.
Em outra aba do **mesmo navegador**, abra
`/standalone.html?editMode=persisted`, entre em **Sugestões dos músicos**,
confira o desenho do solo e aceite. Atualize a aba do responsável: o solo
continua na cifra oficial. O demo usa `localStorage` para a fila e o texto
oficial, e IndexedDB para os bytes, em
[`demo/CifraDemo.vue`](../demo/CifraDemo.vue),
[`suggestion-store.ts`](../demo/host/suggestion-store.ts) e
[`image-store.ts`](../demo/host/image-store.ts). Abas da mesma origem
compartilham esse estado; aparelhos diferentes exigem os endpoints do exemplo
acima. O demo **não** é um serviço de sugestões multiusuário.

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
| `strumming` | array `strummings`. Em cada item, `time_signature` vira `timeSignature`; `pattern`, `bpm` e `section` ficam. Sem `strummings`, tempo, compasso e `{x_titan_strum:}` não entram. Sem `timeSignature`, o compasso cai em 4/4; tempo e batida continuam |
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
- [ ] PWA offline: service worker no host; cifras em `songs[].source` ou `loadSong` local; `persistAsset` no aparelho; `fillAudioCache` para o repertório. Ensaio curto: `prefetch-all`. Modelo: demo deste repo
- [ ] Header do host usa `env(safe-area-inset-top)`; **não** duplicar inset inferior no frame
- [ ] Não sobrescrever `.titan-chordpro-swipe-rail` nem `.titan-chordpro-scroll { touch-action }`
- [ ] Não sobrescrever `.titan-chordpro-root` / `.titan-chordpro-scroll`
- [ ] Sem iframe
- [ ] Ficha real: conteúdo acima **e** abaixo; snap no frame
- [ ] Palco: rota própria + “Tocar ao vivo”
- [ ] Link de cantor: query `lens=letra` → prop `lens="letra"` ([§8](#8-tema-fonte-acento-cifra-ou-letra))
- [ ] Toque na cifra ≠ tela cheia
- [ ] Intros/solos no `.cho` com `x///` — não uma fileira de acordes sem marca ([`MARCAS-X.md`](./MARCAS-X.md))
- [ ] Áudio de referência: `setRehearsalAudio` no `.cho` → `source` (não existe prop `audioUrl`); GET com CORS se quiser cache/seek; capa da cifra **1024 × 1024**; `defaultAudioArt` para a marca. Uma cifra: `/media.html`. Lista + Central de Mídia: `/standalone-lista.html?audio=1`
- [ ] Cifra Club: `fetchChart` no backend; se a página não for a cifra, API `/v3/version/…` e o HTML da [§11](#11-buscar-no-cifra-club-fetchchart)
- [ ] Cifra completa (.zip): `loadBundleAsset` na exportação; `importChartBundle` + `persistAsset` para o app guardar GPX/áudio/imagem e receber o ChordPro já vinculado ([BUNDLE.md](./BUNDLE.md))

Props, emits e o resto da API: [README](../README.md).

## Solos em Guitar Pro / MusicXML

Em **Editar → + entre blocos → Guitar Pro / MusicXML**, escolha um arquivo no
aparelho, informe o **Nome do trecho** (começa como **Solo**), selecione a faixa
e o intervalo de compassos, confira o desenho e salve.
Arraste as duas alças para marcar início e fim, ou digite os números exatos.
O intervalo fica entre 1 e o total de compassos do arquivo; **Selecionar tudo**
inclui o arquivo inteiro. Os controles ficam ao lado da prévia no computador
e acima dela no celular, com as ações de salvar e cancelar sempre acessíveis.
Novos solos começam com **Ritmo na base** selecionado. Na criação ou em
**Ajustar trecho**, escolha o **Ritmo padrão da TAB**:
**Ritmo estendido** (hastes até as notas), **Ritmo na base** (hastes somente
abaixo das cordas) ou **Sem ritmo** (sem hastes e barras de duração).
Na leitura, a linha do trecho traz o nome, os três pontos e a seta. Um toque no nome ou na seta abre ou recolhe o trecho. Os três pontos abrem **TAB**, **Partitura**, **Ritmo da TAB**, **Notas**, **Zoom** e **Baixar**.
A escolha de ritmo na leitura vale para os solos neste navegador, persiste entre
visitas e não altera o source, o estado de edição nem o padrão definido pelo autor.
**Padrão do trecho** remove a preferência e volta a respeitar cada trecho.
A escolha fica em `STORE_KEYS.prefs` (`titan-chordpro:user-preferences`, campo `tabRhythm`) e usa o `storage` do host quando
fornecido; o host pode separá-la por conta. Por padrão, é uma preferência do navegador,
sem identificação de usuário. Se o armazenamento estiver bloqueado, vale na sessão.
**Notas** mostra os nomes acima de cada sistema da TAB ou da partitura. Por
padrão, aparecem como cifras (`C`, `D`, `E`); o consumer pode passar
`noteNameFormat="solfege"` ao `<TitanChordpro>` para usar `Dó`, `Ré`, `Mi`.
O formato é definido pelo consumer; o leitor só liga ou desliga a exibição.
A escolha de exibir fica no mesmo `STORE_KEYS.prefs` (campo `noteNames`, padrão
desligado), vale para os solos do leitor e não muda o arquivo nem o PDF.
A escolha TAB/Partitura e o estado aberto/recolhido de cada referência ficam em
`notationKey(songId)` (`titan-chordpro:notation:{songId}`), separados por música e por
trecho. Passe um `songId` estável; sem ele, o título é usado. Essas escolhas
não alteram o ChordPro, a versão pessoal, sugestões nem o PDF. As chaves
`cpv:*` anteriores, inclusive `cpv:user-preferences`, `cpv:prefs` e
`cpv:tab-rhythm`, não são lidas ou migradas automaticamente. Hosts que guardam
preferências na conta devem copiar os dados desejados para as chaves novas
antes de atualizar o pacote.
A prévia do editor sempre mostra o padrão que está sendo editado.
O desenho SVG reorganiza os compassos conforme a largura e mantém escala mínima
de 110%; um compasso muito denso pode rolar horizontalmente sem diminuir as notas.
O zoom manual vai até 200%. A notação conserva o tom do arquivo original.

Instale o peer opcional `@coderline/alphatab` (>=1.8.4 <2). Ele é carregado apenas
quando se abre um solo externo. A fonte Bravura acompanha o pacote, sem CDN,
worker ou SoundFont. O core continua sem Vue e sem alphaTab em runtime.

- `uploadScore(file): Promise<{ ref: string }>` habilita a opção de inserir
  Guitar Pro / MusicXML e escolher um arquivo do aparelho; o host guarda os bytes originais e devolve uma referência permanente.
- `resolveScore(ref): string` transforma essa referência em URL acessível ao
  navegador. URLs externas precisam permitir CORS. Sem resolver, usa a referência
  como URL relativa ou absoluta.
- `loadBundleAsset(ref, 'score')` fornece os bytes originais na hora de sugerir
  (e de exportar a cifra completa). Pode devolver também `filename` quando o
  identificador salvo não tem extensão; rejeitar bloqueia o envio da sugestão.
- Passe `uploadScore` também no mount do responsável: a aceitação envia o anexo
  outra vez e só então troca a referência no texto oficial. Preserve
  `scoreAttachments` no banco/fila; uma URL temporária sozinha não basta para
  revisar em outro aparelho.
- Formatos do importador: Guitar Pro `.gp3`, `.gp4`, `.gp5`, `.gpx`, `.gp` e
  MusicXML `.xml`, `.musicxml`, `.mxl`. A qualidade depende dos dados do arquivo.
  MusicXML sem posições de corda/casa fica em Partitura, com TAB indisponível.

O source usa uma diretiva única para cada referência externa:

```chordpro
{x_titan_score: src="solos/guitarra.gp" track=1 start=17 end=24 rhythm=base name="Solo de entrada"}
```

`{x_titan_score: ...}` não possui conteúdo interno nem tag de fechamento.
`{x_titan_start_of_score}…{x_titan_end_of_score}` fica reservado à notação escrita dentro da própria cifra.

O atributo opcional `name="Solo de entrada"` (`ScoreReference.name`) identifica
o trecho na cifra e no PDF. Referências antigas, sem nome, mostram **Solo**.
Na leitura, o cabeçalho mostra somente esse nome, sem faixa, intervalo ou aviso
de tom original. Nos três pontos, **Baixar** entrega o arquivo original no aparelho, com esse
mesmo nome e a extensão do Guitar Pro/MusicXML (`Solo de entrada.gp`). Sem
nome, o arquivo baixa como `Solo` mais a extensão original. A notação continua no tom do arquivo. A seta no canto do card
oculta ou mostra o conteúdo, mantendo o título visível; não flutua sobre a cifra.
O card aproveita uma área mais larga que a coluna da letra no desktop e respeita
a largura disponível no celular e no componente incorporado.

Faixa e compassos começam em 1; `end` omitido vai até o fim.
O atributo opcional `rhythm=extended|base|none` salva o padrão de apresentação;
omitido, mantém o ritmo estendido. `ScoreReference.rhythm` usa o tipo `TabRhythm`.
O padrão visual segue o perfil Guitar Pro do Titan: uma haste por nota;
na base, a mínima tem **50%** da altura da semínima. No modo estendido, a mínima
mantém o tamanho e a semínima cresce até a nota. A semibreve não tem haste.
A regra vale para tela e PDF; barras, pontos e quiálteras permanecem preservados.
Fontes, diferenças entre convenções e critérios de aceite estão em
[`NOTACAO-VISUAL.md`](NOTACAO-VISUAL.md).
O arquivo Guitar Pro/MusicXML e suas durações não são modificados. Os helpers
`readScoreReference`/`writeScoreReference` validam a referência. Não se converte
para a notação simplificada do editor; bends, vozes e durações permanecem no
arquivo. Alterar ou cancelar o trecho não modifica os bytes originais.

Limites desta entrega: a transposição da cifra não transpõe o arquivo externo;
o HTML estático identifica o trecho, sem desenhar a pauta externa.
A seleção de compassos não fornece sincronização de áudio nem tempo exato para
a auto-rolagem da cifra. Na lente Só letra, o trecho é ocultado como as outras partituras.

Quando o arquivo começa no compasso 1 e vai até o fim, o interruptor de leitura
ganha **Partitura**. Essa leitura tira a cifra em texto da página e mostra a
pauta na largura disponível. O Rolar anda no tempo dos compassos do arquivo
(andamento e fórmula de compasso), não nas marcas `x///` nem na duração da
cifra. O clique acompanha o andamento do compasso que está passando, na mesma
velocidade da rolagem. A− e A+ mudam o zoom da pauta. Transposição, capo,
graus, comentários e ajuste ao espaço ficam na leitura Cifra, porque não
alteram o arquivo. Um solo que não cobre o arquivo inteiro não abre esse modo.

Referência do motor: https://alphatab.net/docs/introduction


### Solos na exportação PDF

Ao tocar **Exportar → Documento PDF**, uma cifra com solos Guitar Pro/MusicXML
pede **TAB**, **Partitura** ou **Nenhum**, e só baixa após **Gerar PDF**. O desenho
é preparado para papel, em preto no branco, no tom original do arquivo, com os
compassos selecionados e quebra de página entre sistemas completos. Não depende
do zoom, tema ou da parte visível na tela. Em TAB, respeita a preferência pessoal de ritmo ou, sem ela, o padrão de cada trecho. Se um arquivo não tiver TAB, a escolha
continua aberta com uma mensagem para escolher Partitura ou Nenhum. Falhas de
leitura/desenho interrompem o download; não se gera um PDF com o solo faltando.
Nenhum omite os blocos TAB/partitura. TABs em texto e partituras da sintaxe antiga
mantêm a exportação anterior quando incluídas; a alternância é dos arquivos
Guitar Pro/MusicXML.

Para consumidores sem o componente Vue, `exportPdf(source)` devolve
`{ bytes, filename, mime, title }`. `renderPdf(view)` continua o writer a
partir do ViewModel:

- `notation: 'tab' | 'score' | 'none'` seleciona a exportação.
- `renderNotation(text, mode)` fornece uma Promise de imagens PNG dos sistemas
  (`{ data: string | Uint8Array, width: number, height: number }[]`). A largura e
  altura usam a mesma unidade; o PDF preserva a proporção e pagina os sistemas.
- O componente Vue fornece esse renderizador automaticamente. O `/pdf` continua
  utilizável no Node, sem Vue/DOM. Sem `notation`, preserva o comportamento anterior
  (referência textual); com TAB/Partitura e um solo externo, exige `renderNotation`.
- A renderização para papel usa alphaTab Canvas a pelo menos 288 pixels por
  polegada na largura útil A4, enquanto a cifra na tela continua em SVG.


### Apresentação do trecho (Titan)

A superfície é composta pelo Titan a partir dos sistemas musicais do motor,
sem montar o visualizador de documento do alphaTab. Importação e geometria de
notação continuam no motor; a seleção de faixa/compassos, disposição, controles,
cores, fontes e composição das linhas pertencem à UI Titan. Tela e PDF usam
`notation-renderer.ts`, com paletas separadas. Não aparecem capa, afinação,
diagramas, nomes de acordes do documento, créditos ou rodapé do importador.
Bends, ligaduras, pausas e indicações musicais permanecem.

Na tela o fundo é transparente, as notas seguem a cor de texto da cifra, as
linhas seguem a cor secundária e os números dos compassos seguem a cor dos
acordes. Alternar claro/escuro redesenha o trecho sem buscar novamente o arquivo.
O layout ignora a paginação original e reorganiza os sistemas na largura atual.
A importação de um arquivo novo abre os primeiros quatro compassos (ou menos,
se o arquivo for menor); o músico define o intervalo antes de salvar. Referências
já salvas continuam respeitando exatamente o intervalo original.


### Recolher referências durante a leitura

**Ocultar TAB / partitura** recolhe individualmente solos externos, partituras,
TABs em texto e imagens. **Mostrar TAB / partitura** reabre o mesmo bloco.
A preferência é lembrada por música e por trecho e não reescreve o source, não
remove os tempos do bloco e não muda a escolha da exportação PDF.

Enquanto Rolar está ativo, a UI conserva a posição musical e mede novamente o
layout depois de recolher/abrir. Mudanças de scroll causadas pelo navegador ao
encolher a página não são tratadas como um gesto para avançar na música. Parada,
a UI preserva o bloco/linha visível, dentro dos limites de rolagem disponíveis.
Se o próprio trecho em leitura for recolhido, seu tempo permanece no relógio;
o botão compacto o representa até o trecho seguinte. No editor, as referências
aparecem abertas para permitir ajustes; ao voltar à leitura, a escolha pessoal
reaparece. Ao trocar de música, valem as escolhas daquela música.


## Cifra completa (.zip)

**Exportar → Cifra completa** reúne ChordPro, solos, imagens, áudios e capas/fundos
em um pacote com referências locais. Para arquivos privados, o consumer pode
fornecer `loadBundleAsset(reference, kind)`. Serviços online ficam somente como
informação de origem. Contrato, inventário completo e limites: [BUNDLE.md](./BUNDLE.md).

**Importar o ZIP** é só código — o Titan não abre uma tela de importação. O
consumer escolhe o arquivo, chama `importChartBundle` e **guarda os bytes**. O
pacote devolve o ChordPro já apontando para as referências do app (Guitar Pro/GPX,
MusicXML, imagens, cantado, playback, capas), inclusive trechos ocultos com `#~`.
Sem `persistAsset` a importação falha; a cifra oficial não deve ser substituída.

```ts
import { importChartBundle } from '@henryavila/titan-chordpro-ui/bundle'

async function importarCifraCompleta(songId: string, zip: Uint8Array) {
  const imported = await importChartBundle(zip, {
    persistAsset: async (asset) => {
      const file = new File([asset.bytes], asset.filename, { type: asset.contentType })
      if (asset.kind === 'score') return uploadScore(file)          // { ref: 'solos/….gpx' }
      if (asset.kind === 'image') return uploadImage(file)          // { ref } do {image:}
      const url = await storage.putAudio(file)                      // URL tocável
      return { ref: url }
    },
  })
  await api.put(`/songs/${songId}`, { source: imported.source })
  return imported
}
```

`persistAsset` roda **uma vez** por arquivo, mesmo quando cantado e playback
são o mesmo áudio, ou o mesmo solo aparece duas vezes. Cada chamada traz
`path`, `kind` (`score` / `image` / `audio`), `roles`, `bytes`, `contentType`,
`filename` e, nas capas, `width` / `height`. A referência devolvida entra no
`{x_titan_score:}`, `{image:}`, `{x_titan_audio_sung:}` e demais diretivas; não
pode ser vazia nem conter `}` ou quebra de linha. Áudio precisa de um endereço
que o player aceite (`https://…` ou caminho `/…`, o mesmo contrato de
`setRehearsalAudio`). Se cantado, playback ou a capa do player voltarem com uma
referência que o player recusa (`storage/…`, `file://…`), a importação falha e a
cifra não entra. Capas de slides também passam por `persistAsset` (`roles`
inclui `slide-cover` / `slide-background`); o consumer pode guardá-las como
imagem.

YouTube e origem voltam para a cifra a partir de `ORIGEM.txt`. Para deixar só
nos metadados do retorno: `restoreProvenance: false`. `imported.source` é o
ChordPro a gravar; `imported.personal` indica versão pessoal; `imported.assets`
lista cada `ref` guardada. Se o manifesto, um anexo, o tipo, o ZIP cortado ou a
gravação falhar, a Promise rejeita e a cifra oficial não deve ser substituída.

O mesmo `loadBundleAsset` / `uploadScore` / `uploadImage` da edição serve aqui:
exportar lê os bytes; importar os grava de novo no armazenamento do app.

<!-- titan-features:start -->
## Na tela

- **Botões da cifra.** O músico vê Rolar, A−/A+, Ajuste, Graus, Comentários, Metrônomo, Editar e Mais.
- **Exportar a cifra.** No computador, o ícone de baixar na barra de baixo abre Exportar; no telefone, o item Exportar fica em Mais.
- **Ficha — campos da cifra.** Meta e Nova cifra usam a mesma ficha: nome, duração, andamento, compasso e tom.
<!-- titan-features:end -->
