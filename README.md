# titan-chordpro-ui

[![npm](https://img.shields.io/npm/v/@henryavila/titan-chordpro-ui)](https://www.npmjs.com/package/@henryavila/titan-chordpro-ui)
[![downloads](https://img.shields.io/npm/dm/@henryavila/titan-chordpro-ui)](https://www.npmjs.com/package/@henryavila/titan-chordpro-ui)
[![types](https://img.shields.io/npm/types/@henryavila/titan-chordpro-ui)](https://www.npmjs.com/package/@henryavila/titan-chordpro-ui)
[![vue](https://img.shields.io/npm/dependency-version/@henryavila/titan-chordpro-ui/peer/vue)](https://www.npmjs.com/package/@henryavila/titan-chordpro-ui)
[![license](https://img.shields.io/npm/l/@henryavila/titan-chordpro-ui)](LICENSE)
[![bundle](https://img.shields.io/bundlephobia/minzip/@henryavila/titan-chordpro-ui)](https://bundlephobia.com/package/@henryavila/titan-chordpro-ui)

<img width="1168" height="784" alt="EHoH3" src="https://github.com/user-attachments/assets/4738da56-2e3e-4f26-9160-05f4296741eb" />

**UI de uma cifra ChordPro** — ler no ensaio e editar o arquivo.  
Não é o site, o login nem a lista de músicas: o host embute `<ChordproViewer>`.

npm [`@henryavila/titan-chordpro-ui`](https://www.npmjs.com/package/@henryavila/titan-chordpro-ui) · Vue 3 + core TypeScript (sem Vue no core)

### Features

**Leitura**
- Acorde acima da letra; comentários de ensaio
- Transposição e capotraste
- **Modo dual (capo)** — o capo muda as *formas*, não o tom que a banda ouve. Sem dual, a cifra vira só as formas (quem toca sozinho). Com dual, cada acorde mostra os dois nomes na mesma linha: forma com capo + o que soa sem capo. Teclado, baixo e voz leem o tom real; o violão lê a forma. A legenda marca as duas cores.
- Cifra · só letra · Nashville
- Tema claro / escuro / auto; cor de acento do host
- Tipografia e ajuste ao espaço
- Auto-rolagem no relógio da cifra (`{duration:}`, `{tempo:}`, `x///`)
- Zen / tela cheia; chrome some na rolagem
- **Tela ligada** enquanto o viewer está aberto (Screen Wake Lock) — o aparelho não apaga no ensaio. Sem botão; HTTPS. Sem a API, no-op

**Ensaio**
- Metrônomo (tap tempo, contagem de entrada, vinculado à rolagem)
- Batida visual (setas + pulso) e ensaio com som
- Lista: anterior / próxima, lugar guardado por música
- **Swipe no ensaio:** troca de música na borda (64px no celular, 128px no tablet; esquerda depois dos 24px do Safari). O centro só rola. Sem flick, sem carimbo, sem a cifra deslizando
- Export ChordPro, PDF e slides LouvorJA (`.slja`)

**Edição**
- No lugar: letra, acorde, bloco (transpor, capo, reordenar)
- Versão pessoal (overlay) e **Sugerir** (nome obrigatório). O host confirma o POST com `persistSuggestion`; sem ack, não tosta “enviada”
- Fila do responsável: aceitar / recusar, lote, diff visual da batida
- **Editor de batida** — grade por tempo; cada pulso é ↓ / ↑, passa, pausa ou ×, com essência (normal, acento, mute, abafada). O primeiro toque ancora o sentido da mão; daí o picker só oferece o que a mão alcança. Vários padrões nomeados na mesma cifra, densidade 2 ou 4 por tempo, 6/8 em 2 compostos ou 6 colcheias. **Ouvir** toca o loop antes de gravar. Em *Só para mim* vai ao overlay + Sugerir; em *Para todos* grava `{x_strum:}` / `{x_strum_set:}`. Presets são do host — o pacote não embute catálogo. Na revisão, o diff é no visualizador (destaque + seta riscada), não no texto da diretiva.
- Partitura `{sos}` / TAB `{sot}`
- Import ChordPro, OnSong, cifra sobre letra, Cifra Club, PDF com texto, em branco
- Completar metadados / batida pelo Cifra Club sem substituir o corpo

**Pacote**
- Entradas `core` / `vue` / `pdf` / `slides` + CLI
- Persistência do host (`ChartStore`); auth fica fora

Fora: login, multicifra do site, player de áudio, diagramas de braço, collab em tempo real.

- **Product SoT:** [`docs/VISAO.md`](docs/VISAO.md)
- **Engineering contract:** [`SPEC.md`](./SPEC.md) — acceptance = §9
- **Generator (sibling, repo separado):** **`titan-chordpro-gen`** — audio → `.chordpro`
- **App Titan:** nenhum por agora (`titan-chordpro` = host futuro)
- **Consumer:** qualquer host Vue 3 / Nuxt — consome **só** a UI. Guia: [`docs/CONSUMER.md`](docs/CONSUMER.md)
- Naming: [`docs/NAMING.md`](docs/NAMING.md) · rebrand: [`docs/REBRAND-HANDOFF.md`](docs/REBRAND-HANDOFF.md)

## Status

`0.6.0` — leitura, ensaio (lista, swipe nas bordas, tela ligada), overlay, `persistSuggestion`, edição por bloco, batida, partitura e import/export. Visual SoT: `design-source/`. Gates do editor E3–E4 ainda não são DONE de produto.

```bash
pnpm install
pnpm test
pnpm dev          # índice das demos em :5173
pnpm build
pnpm build:pages  # demo estático → dist-demo/ (Cloudflare Pages)
```

Demo público (hub completo, sem persistência, proxy de import por link):  
[`docs/DEMO-PAGES.md`](docs/DEMO-PAGES.md).

## Core vs Vue vs host

| Core | Vue package | Host |
|---|---|---|
| parse, transpose, controller, HTML themes, PDF, filenames, scroll math + **timeline musical** + letra para slides | cifra toolbar, RAF auto-scroll, theme light/dark/auto, export UX (CHO / PDF / `.slja`), view↔edit E0, zen, setlist + swipe, wake lock | shell, multi-cifra, sanitize, i18n, audio sync, **resolver de `{image:}`**, override opcional das imagens de capa/fundo do `.slja` |

Visual SoT: `design-source/` (Titan Chordpro UI v2 · Chordpro Viewer v2). Demo: `pnpm dev`.

## Consumer

O Titan é um **componente Vue**. Duas composições, o mesmo SFC — **sem iframe**.
Exemplos completos (Nuxt/Vue, ficha real, palco, ensaio, gestos):
[`docs/CONSUMER.md`](docs/CONSUMER.md).

```vue
<!-- Standalone: rota só da cifra -->
<div class="h-dvh overflow-hidden">
  <ChordproViewer :source="cho" :song-id="id" />
</div>

<!-- Na página: bloco 100dvh no fluxo (conteúdo acima e abaixo) -->
<div class="ficha">
  <!-- letra, vídeo… -->
  <div class="cifra-frame">
    <ChordproViewer :source="cho" :song-id="id" />
  </div>
  <!-- arquivos, histórico… -->
</div>
```

```css
.ficha { height: 100dvh; overflow-y: auto; scroll-snap-type: y proximity; }
.cifra-frame { height: 100dvh; min-height: 560px; overflow: hidden; scroll-snap-align: start; }
```

```ts
import { parse, memoryStore } from '@henryavila/titan-chordpro-ui'
import type { ChartStore } from '@henryavila/titan-chordpro-ui'
import { renderPdf } from '@henryavila/titan-chordpro-ui/pdf'
import { ChordproViewer } from '@henryavila/titan-chordpro-ui/vue'
import type { ChordproViewerProps } from '@henryavila/titan-chordpro-ui/vue'
```

`@henryavila/titan-chordpro-ui/vue` already pulls `./vue/style.css`. Import that path yourself only if you need to control order. `vue` and (for `{sos}`/`{sot}`) `vexflow` are peer dependencies. The UI expects **Sora** + **Space Mono**; remap `font-family` on `.cpv-root` if the host loads other faces.

Guia: [`docs/CONSUMER.md`](docs/CONSUMER.md). Demo: `pnpm dev` — `/` índice
(standalone × shell, uma cifra × apresentação); `/standalone.html` a cifra
é a página; `/site.html` o Vue no shell do consumer.

### `<ChordproViewer>` props

| Prop | Default | Papel |
|---|---|---|
| `source` | `''` | Texto ChordPro/OnSong da cifra ativa (host escolhe qual) |
| `mode` | `'view'` | `view` \| `edit`; a UI também alterna sozinha (`update:mode`) |
| `theme` | `'auto'` | `auto` \| `light` \| `dark`; o leitor pode trocar |
| `lens` | `'none'` | `none` \| `letra` \| `nashville` — projeção de leitura; `letra` = só a letra (cantor). Persiste entre músicas do ensaio |
| `hideComments` | `false` | `true` esconde `{c:}` de ensaio só na leitura (mesmo lifetime que `lens`) |
| `canEdit` | `true` | `false` remove toda entrada para o editor |
| `fitDefault` / `autoHide` | `true` / `true` | Ajuste ao espaço inicial · esconder moldura na rolagem |
| `resolveImage` | identidade | `{image: assets/x.png}` → URL que o host serve |
| `autoInvertScores` | `true` | Inverte partitura escaneada quando o papel briga com o tema |
| `capabilities.sourcePane` | `true` | `false` esconde o painel de source no editor |
| `capabilities.debugSwipe` | `false` | `true` pinta as zonas do swipe no ensaio (Safari / anterior / rolar / próxima). Demo: `?zonas=1` |
| `editMode` | `'local'` | `local` \| `persisted` \| `none`. Um papel por mount (frontend vs backend). Ortogonal a `mode` view\|edit |
| `modes` | — | **Deprecated:** use `editMode`. `content`→`persisted`; `both`→`local` + warning |
| `suggestions` | `true` | `false` tira do leitor o botão “Sugerir alteração” |
| `persistSuggestion` | — | `(s) => Promise<void>` — o host confirma o POST (`return` da Promise), lida na hora do envio. reject ou sem Promise = nada na fila, retry. Fila só depois do ack. `@suggestion-created` é notify depois do ack, não o save |
| `songId` | título da cifra | Identidade da música, chave da versão pessoal |
| `songs` | — | Lista do ensaio (`{id,title,subtitle?,key?,source?}`). **Duas ou mais** ligam o modo |
| `loadSong` | — | `(id, song) => Promise<string> \| string` para as músicas que a lista não trouxe |
| `fetchChart` | — | `(url) => Promise<string>` — busca a página de um link (é o backend do host) |
| `readPdf` | — | `(file) => Promise<string>` — lê PDF com texto; use `pdfText` de `@henryavila/titan-chordpro-ui/pdf` |
| `coverImage` / `slidesImage` | default do pacote | JPEG/PNG (`Blob` / `Uint8Array`) da capa e do fundo de todos os slides LouvorJA. Lista sem abrir a cifra: `exportSlja` em `@henryavila/titan-chordpro-ui/slides` |
| `version` | `'v1'` | Versão do oficial; mudá-la pergunta ao leitor o que manter |
| `images` | `[]` | Partituras que o host serve — o que “Inserir · Imagem” oferece |
| `accent` | `'verde'` | `verde` \| `teal` \| `#hex` \| `rgb()`: a cor dos acordes e tudo que deriva dela |
| `accentStrength` | `1` | 0.5–1.5 sobre os preenchimentos derivados; a matiz não se move |
| `storage` | `localStorage` | Onde o que o viewer lembra é gravado — ver abaixo |
| `surfaceGuard` | `true` | Avisa (console + tela) quando o host embute sem dar altura ao pai |

Emite `update:source`, `update:mode`, `update:lens`, `update:hideComments`, `save`, `save-content`, `suggestion-created`, `suggestion-accepted`, `suggestion-refused`, `update:suggestionQueue`, `dirty`, `state`.

### Cifra nova: importar ou começar em branco

Música sem cifra não é beco. Com `edit-mode="persisted"` (e `canEdit`), o estado vazio
oferece **Importar** e **Começar em branco**. Na demo: índice → Escrever →
Cifra nova (`/standalone.html?criar=1`). O importador reconhece sozinho o
que recebe — ChordPro, OnSong ou acordes sobre a letra — e diz de qual formato
converteu. Depois vem a ficha (nome, artista, tom, andamento com **tap-tempo**,
compasso, referência); o que falta é dito, mas não bloqueia — é cobrado de novo
ao salvar para todos.

Três origens: **link**, **arquivo** (arrastar ou escolher) e **texto colado**.
As duas que dependem do mundo externo são props, não mágica do pacote:

```vue
<ChordproViewer
  edit-mode="persisted"
  :fetch-chart="(url) => api.buscarPagina(url)"
  :read-pdf="(file) => pdfText(file)"
/>
```

`fetchChart` é o **backend do host**: o navegador não alcança outro site de
dentro do viewer. Sem ela, a aba Link diz isso em vez de fingir. `readPdf` vem
de `@henryavila/titan-chordpro-ui/pdf`; é prop para que o `pdfjs-dist` (peer opcional) só
carregue em host que queira importar PDF. Sem ela, PDF é recusado na entrada —
e um PDF digitalizado é reconhecido como tal: *"Este PDF não tem texto"*.

Os conversores são públicos no core, se o host quiser usá-los direto:
`detect`, `convert`, `fromPlain`, `fromOnSong`, `readMeta`, `writeMeta`,
`missingOf`, `toPlain`.

### Modo ensaio: uma lista, não uma cifra por vez

Passe `songs` com **duas ou mais** músicas e o viewer ganha lista, anterior/próxima
e lugar guardado por música. Com uma, ou nenhuma, nada disso aparece e `source`
continua sendo a cifra na tela — o comportamento de hoje, intacto.

```vue
<ChordproViewer :songs="repertorio" :load-song="buscarCifra" />
```

Quem já tem o ChordPro manda em `source` na própria entrada; o resto é pedido por
`loadSong`, guardado, e a atual **mais as duas vizinhas** são buscadas na frente —
trocar de música num ensaio não pode esperar rede. Uma que não chega vira painel
*Não carregou*, com *Tentar de novo*; as outras seguem disponíveis.

Trocar de música guarda e devolve **tom, capo, velocidade e posição de rolagem**
daquela cifra. **Cifra | Letra** (e Nashville / comentários) são do ensaio —
prop `lens` / `hideComments` — **não** resetam ao mudar de música. No celular, um deslize
**na borda** da cifra (trilho 64px no celular, 128px no tablet; esquerda depois dos 24px do voltar do Safari)
mostra um fade + chevron (próxima/anterior) e só troca de música se o gesto cruzar o
limiar; o centro da cifra só rola. No fim da auto-rolagem o viewer
**oferece** a próxima; nunca avança sozinho.

**Página instantânea, cifras chegando depois.** É o formato normal: mande a lista
só com metadados (20 músicas ≈ 2 KB) e deixe o `loadSong` trazer o resto. O
cabeçalho, a lista e o prev/next funcionam desde o primeiro quadro, e o corpo
mostra *Buscando X…* — **com anterior/próxima e Lista disponíveis**, porque
esperar cifra é justamente quando se quer pular adiante. Não existe prop de URL:
o host já fez uma requisição para saber qual ensaio mostrar, e a lista cabe nessa
resposta. Rede é do host — não há `fetch` dentro do pacote.

Para referência, o repertório inteiro cabe inline sem drama: 20 cifras reais dão
~27 KB crus (~12 KB gzip), contra 68 KB gzip do próprio bundle do viewer. O
`loadSong` compensa em acervo grande ou cifra com permissão própria, não em 20.

`songs={[]}` é **lista vazia**, não "esta música não tem cifra": mostra *Nenhuma
música na lista* e não oferece criar cifra. Use `loading` enquanto você busca a
lista, se quiser o spinner.

> **Quebra de contrato:** com `songs`, a identidade da música passa a ser o `id`
> da entrada, e é ela que forma a chave da versão pessoal (`cpv:my:{id}`).
> Overlays gravados antes sob outra identidade (`songId` ou título) **não são
> migrados**. Se o host já tinha leitores com versão pessoal, escolha os `id`
> iguais ao `songId` que usava antes.

### O host dá a altura

O viewer é um **frame com região rolável própria**: raiz `height:100%` sobre um
piso `min-height:460px`, área de leitura `absolute; inset:0; overflow-y:auto`, e
todas as barras e folhas absolutas contra essa caixa.

**Dê ao ancestral imediato uma altura definida** e não sobrescreva
`height`/`overflow`/`position` de `.cpv-root` nem de `.cpv-scroll`. Sem altura,
`height:100%` não resolve, o viewer cai no piso, a página do host passa a rolar
e a barra de controle acaba no fim da música, fora da dobra.

Numa página que rola (ficha com letra, arquivos, histórico), o frame é um
bloco `100dvh` no fluxo: o músico rola até ele e o snap estaciona o dock na
dobra. Não há modo "artigo". Receita e o que a guarda faz:
[docs/CONSUMER.md](docs/CONSUMER.md).

### O acento é a cor que o host escolhe

Os dois nomes foram medidos contra os dois fundos: `#17713C` sobre `#F5F6F8`
dá ≈5,3:1 e `#0E6E7D` ≈5,1:1 — AA para texto normal nos dois casos.

Qualquer outra cor é um hex (`#4F46E5`) ou `rgb(79,70,229)`: a matiz fica, e
o par claro/escuro usa as mesmas luminosidades do verde. Os sete derivados
(`--chord-soft`, `--chord-edge`, `--chord-hover`, `--chord-fill`, `--block`,
`--block-line`, `--glow`) saem de **um** RGB em opacidades fixas, escaladas
por `accentStrength`. O host escolhe uma cor, não uma paleta. Em
`accentStrength: 1` os nomes `verde`/`teal` saem carácter por carácter iguais
aos tokens do handoff.

`accentVars(accent, mode, strength)` e `listAccents()` são exportados para quem
precisa das mesmas variáveis fora do componente — no HTML estático ou no PDF.

### Persistência é do host

O pacote é a **UI**. Toda a funcionalidade construída sobre estado guardado
vive aqui — a versão pessoal ancorada, o diálogo de atualização, a fila de
sugestões em três níveis com aceitar/recusar por item, o BPM por música. O que
**não** vive aqui é a decisão de onde esses bytes moram: por dispositivo, na
conta do usuário, ou em lugar nenhum. Isso é de quem incorpora o componente.

O default é o `localStorage` deste aparelho, então quem não passa nada
continua funcionando. Para assumir o controle, entregue um `ChartStore`:

```ts
import type { ChartStore } from '@henryavila/titan-chordpro-ui'
import { STORE_KEYS, overlayKey } from '@henryavila/titan-chordpro-ui'

const storage: ChartStore = {
  get: (key) => cache.get(key) ?? null,
  set: (key, value) => { cache.set(key, value); api.save(key, value) },
  remove: (key) => { cache.delete(key); api.remove(key) },
}
```

```vue
<ChordproViewer :source="cifra" :song-id="id" :storage="storage" />
```

As chamadas do `ChartStore` são **síncronas de propósito**. A leitura não pode
travar esperando rede no meio de um ensaio, então um host que persiste no
servidor responde do próprio cache e dispara a gravação por trás do `set`.

A sugestão **não** é fire-and-forget quando o host passa `persistSuggestion`:
Titan espera a Promise, só então enfileira e tosta “Sugestão enviada”. Sem a
prop, o toast é otimista neste aparelho (demo).

Falhar em silêncio é o contrato: `localStorage` negado numa janela anônima ou
num iframe bloqueado custa uma conveniência, nunca uma mensagem de erro ao
leitor. Um `set` que lança exceção é engolido do mesmo jeito.

#### As chaves

Todas declaradas em `STORE_KEYS`, para o host rotear ou prefixar:

| Chave | O que guarda | Escopo natural |
|---|---|---|
| `cpv:prefs` | tema, bias, ajuste ao espaço, metrônomo | dispositivo **ou** conta |
| `cpv:fitSeen` | dica do modo ajuste já vista | dispositivo |
| `cpv:bpm` | BPM manual por música | dispositivo **ou** conta |
| `cpv:my:{songId}` | **a versão pessoal do músico** | conta — ele troca de celular |
| `cpv:sug` | sugestões pendentes | servidor — atravessa pessoas |
| `cpv:actor-name` | último nome ao sugerir | dispositivo **ou** conta |

`overlayKey(songId)` monta a quarta. As duas últimas são as que realmente
pedem um host: mantidas no default, a versão pessoal morre quando o músico
limpa o navegador, e a sugestão só existe naquele navegador.

`memoryStore()` é exportado para SSR, testes e quiosque — esquece ao recarregar.

### Edição por bloco: o arquivo é a única verdade

Editar não abre um segundo documento. Cada ação reescreve o `.cho`, e o que
ela decidiu fica escrito lá — um bloco transposto guarda `#^±n`, um bloco com
capo próprio guarda `#capo:n` (`#capo:n!` = sem cifra dupla ali), e um bloco
fora da leitura guarda `#~` em cada linha. Sobrevive a recarregar, desfazer e
reparsear, porque não há estado paralelo para dessincronizar.

No modo edição a linha cantada vira sílabas mediáveis com o acorde flutuando
por cima: a pílula arrasta até a sílaba certa (no toque, segurando — o anel se
preenche antes de armar, senão o mesmo gesto rolaria a cifra), `←/→` ajusta de
uma em uma, e tocar nela abre o editor de nome com o vocabulário da própria
música. A letra e o comentário de ensaio se editam no lugar, com diff de
prefixo/sufixo: corrigir um typo não arrasta os acordes da linha.

O punho (`⋮⋮`) seleciona e reordena. Rótulo e estrofe são **uma unidade**: um
`{c:(REFRÃO)}` colado na linha de cima é o nome daquele bloco, então mover ou
apagar leva os dois. A barra da seleção só oferece o que cabe naquele tipo —
transpor/capo e harmonia num bloco cantado, “Trocar imagem” numa partitura
escaneada, “Editar partitura” num `{sos}`/`{sot}`. Em `modes: 'local'` não
existe apagar: ocultar **é** o remover, e o rótulo diz isso.

### Partitura: `{sos}`, e a TAB de texto entra pelo mesmo caminho

`{sos: time=4/4 key=D tempo=92 tuning=EADGBE}` guarda **altura + figura**, uma
linha por compasso; corda/casa é derivada e só vai para o arquivo quando o
dedilhado foi fixado à mão (`@corda/casa`). Uma figura maior do que o que resta
do compasso não estica a barra: é partida em figuras legais e ligada (`~l`),
e volta somada numa nota só na leitura.

O modelo é framework-free (`src/core/score.ts`); só o desenho usa **VexFlow**,
que é `peerDependency` **opcional** e entra por import tardio: quem nunca mostra
`{sos}` não embarca um gravador de partitura. Sem ele a leitura cai no texto da
fonte e o resto do pacote não muda.

```bash
pnpm add vexflow   # só se as cifras tiverem {sos} ou {sot}
```

A TAB de texto legada (`{sot}`) abre importada no mesmo editor — cada coluna
com dígito vira semínima, com o aviso de que o texto nunca trouxe ritmo — e sai
gravada como `{sos}`.

### Versão pessoal: overlay, não cópia

Guardar o texto inteiro congelaria a cifra — uma correção do responsável nunca
chegaria a quem personalizou. Cada ajuste vira uma **operação ancorada na linha
original** (`src/core/overlay.ts`, framework-free): dá para reverter um trecho
pelo ponto ao lado dele, reaplicar tudo sobre uma versão nova, e o que o
responsável aceitou **sai** do overlay em vez de virar conflito com o próprio
leitor.

**`editMode`** (um papel por mount — o host já sabe frontend vs backend):

| Valor | Papel |
|---|---|
| `local` (default) | Edição “Só para mim” no aparelho; botão opcional **Sugerir** |
| `persisted` | Edição “Para todos” (`save-content`) + fila de sugestões (Aceitar/Recusar, lote) |
| `none` | Sem edição |

Sugestões: o POST do músico é a prop `persistSuggestion` (`return` da Promise),
lida na hora do envio. Fila e emit `suggestion-created` só depois do ack
(notify, não o save);
`suggestion-accepted` / `suggestion-refused` na revisão.
Prop `suggestionQueue` (fila completa) para o host sincronizar entre apps.
Status do músico aparece na **Minha versão**. `modes` / `content` / `both` ficam
deprecados (ver CONSUMER §10).

### Auto-rolagem: tempo musical, não px/s

A rolagem não é velocidade em pixels. Cada bloco recebe um **peso musical**, e
ele é montado em duas camadas — a distinção entre elas é o ponto:

1. **O que a cifra declara**, lido no BPM dela. `x///` escrito numa linha que é
   *tocada e não cantada* — introdução, interlúdio, final — é contagem de
   compasso, e vira o tempo de rolagem daquele trecho diretamente. O mesmo vale
   para os compassos de uma tab ou partitura, e para a **cauda** segurada no fim
   de uma linha cantada. Esta camada nunca é calibrada: ela já é a resposta.
2. **O que ela deixa de fora.** Uma linha cantada sem marca é um espaço
   (`BEATS_PER_ROW` pulsos) que só esta camada estica ou comprime para fechar
   em `{duration:}`. Não estacionar o extra no último ecrã: em `009` isso
   mandava a primeira estrofe embora em 14 s, no meio do verso. Acorde sem
   `x///` / `//` **não é duração**: `[G] [A] [B] [C]` pode ser quatro compassos
   ou quatro tempos, e a engine não adivinha.

`{time:}` é lido inteiro, numerador **e** denominador. O `{tempo:}` nomeia o
*pulso sentido* e uma marca `x///` é uma unidade do denominador — em compasso
simples são a mesma coisa, em composto (6/8, 9/8, 12/8) o pulso é a semínima
pontuada e cabem **três** marcas nele. Por isso `beatsPerBar('6/8')` é `2`, não
`6`: um compasso de 6/8 são duas semínimas pontuadas. `marksPerBeat()` devolve a
outra metade da conta. Ler só o numerador dava a um compasso de 6/8 o triplo da
duração real, e tudo que o relógio deriva de compasso ia junto — tab, partitura
e a estimativa cantada. O metrônomo usa o mesmo `beatsPerBar()`, então o acento
cai uma vez por compasso em qualquer fórmula.

Uma marca no fim de uma linha cantada é cauda **somada** àquela linha, nunca o
tempo inteiro dela: um `[Am]x///` fechando a estrofe não faz a estrofe durar
quatro pulsos.

Notas de ensaio (`BEM SUAVE`), rótulos de seção (`INTRODUÇÃO`) e imagens soltas
não têm relógio próprio: o papel delas anda com o próximo bloco musical (ou com
o último, se vierem no fim). Dar-lhes o passo médio da página gastava 25 a 100 s
antes da intro em cifras reais, e um verso no celular ainda estava fora da tela
quando o músico chegava lá. O padding do título e a legenda do capo **não**
são esse papel: ficam na origem (`segs[0].top`), e compactar o chrome, ligar
ajuste ou dual não come segundos da intro.

**Hard gate:** Rolar só parte se a cifra declara `{duration:}` (m:ss, ≥ 20 s).
Sem duração, o botão fica morto — BPM e acordes sem `x///` não substituem.

Gramática da convenção, o que a engine **não** adivinha, lente Só letra (marcas
não vazam na projeção; `cami/nhar` e a letra x em palavras ficam), lint e regras
para agente: [`docs/MARCAS-X.md`](docs/MARCAS-X.md). Cantor via prop:
`lens="letra"` — [`docs/CONSUMER.md`](docs/CONSUMER.md) §8.

Um *playhead* percorre a cifra nesse relógio e o percurso inteiro gasta a
duração declarada. `Timeline.bars` é o total do percurso e `runSec()` devolve
exatamente ele — se os dois divergirem, **todo** segmento toca na razão entre
eles, inclusive os compassos contados. Matemática em `src/core/timeline.ts`
(framework-free); o RAF e a medição do DOM ficam no binding Vue.

#### Onde a página fica: âncora com rampa; intro compacta fica quieta

Na primeira nota a música está obrigatoriamente no topo do papel — não há nada
acima dela para rolar. A âncora define onde a música **descansa** na tela
(`ANCHOR_RATIO`, um terço: dois terços da tela ficam para o que vem, que é para
onde o olho do músico já está indo).

A dívida entre as duas coisas era paga **parando a página** até a música ter
percorrido uma âncora inteira de papel. Medido no corpus de `fixtures/`, isso
era de **25 a 96 segundos** de página morta em toda cifra — um terço de
`entrega-2`, metade de `088-minha-ofertinha`, que tem 29px de rolagem no total.
Meia tela de papel não é a introdução: é a introdução mais quase toda a primeira
estrofe.

Três correções:

1. `anchorPx(viewport, doc)` é limitado pela rolagem que a cifra **tem** para
   dar (`min(viewport, doc − viewport)`). Uma cifra que mal passa da moldura não
   consegue segurar a música um terço abaixo, e pedir isso congelava a página
   quase a música inteira por causa de algumas dezenas de pixels.
2. `scrollAtPx()` paga a dívida em rampa: a página anda a `1 − ANCHOR_RAMP` do
   passo da música enquanto a música desce até o lugar de descanso, e no passo
   da música dali em diante.
3. Introdução **tocada e não cantada** (acordes + `x///`, TAB) no topo não
   entra na rampa. A página fica em 0 até a primeira linha cantada — ou até a
   linha de leitura, se essa intro for mais alta que um terço da tela. Sem
   isso, *Nasce em Mim* (8 acordes / 2 linhas / 32 pulsos) mandava a letra ao
   topo durante a intro. Um `{c:INTRODUÇÃO}` sozinho não segura a página. O
   relógio e o metrônomo **não** pausam: só o `scrollTop`.

`pxAtScroll()` é a inversa, e é ela que lê de volta a posição quando o músico
arrasta a cifra com o dedo. `{tempo:65 BPM}` é 65 — o sufixo não cai no
default 100.

#### Movimento contínuo: o meio pixel vai no compositor

Um offset de rolagem é **encaixado em pixels inteiros** — medido, `scrollTop`
volta inteiro em todo frame, escreva-se o que escrever. Na velocidade em que uma
cifra realmente anda (5 px/s e menos), isso são onze frames imóveis e então um
teleporte de 1px, seis vezes por segundo. Parece calmo num screenshot e é
sofrível de olhar: salto discreto é o que o sistema vestibular lê como
movimento, e para quem tem labirintite isso é sintoma.

Os pixels inteiros vão para o `scrollTop`, que mantém a barra de rolagem, o
arrasto e todas as medições honestos; o resto anda num `translate3d` na coluna
da cifra, que o compositor **não** encaixa. Medido no mesmo trecho: de 34
posições distintas em 361 frames para **361 em 361**, passo de 0,091px, 60fps
nos dois casos. `measureBlocks()` zera o transform antes de medir — senão todo
retângulo voltaria deslocado pelo carregador.

Cifra que **cabe na moldura** não tem o que rolar, e o botão Rolar fica
desativado dizendo isso — antes ele ficava vivo, ligava a rolagem e nada se
movia até a música "acabar". O espaço é medido no DOM (`ResizeObserver` na
coluna da cifra, mais a moldura), porque ele muda com tipografia, ajuste ao
espaço e o tom em que a cifra foi transposta. O mesmo estado desliga o vínculo
do metrônomo: sem rolagem, não há contagem de entrada nem "Iniciar com a
rolagem". O botão continua vivo enquanto a rolagem corre — é a única forma de
pará-la.

Não há régua desenhada sobre a cifra. Uma linha de leitura permanente competia
com o texto e afirmava uma precisão que a estimativa não tem — o olho lê
adiantado da mão, então "a música está aqui" aponta para um lugar que ele já
deixou. Quem diz que a rolagem está viva é a própria página andando, e a barra
de progresso no topo (`.cpv-progress.is-live`) para as cifras que andam pouco.

### Metrônomo: um controle, não dois

Com **rolagem vinculada** (padrão), o click e a auto-rolagem são um só controle:
iniciar o click põe a cifra para andar, e parar **qualquer um dos dois** para os
dois — um click sobre cifra parada não serve para nada, e cifra andando sob um
click que foi silenciado, menos ainda. Todo caminho de saída da rolagem passa
por `stopScroll()`, então o fim da música, um transporte e uma troca de cifra
levam o click junto. `Rolagem independente` desliga o par.

Iniciar **fecha o painel**: ele cobre a cifra que acabou de pôr em movimento. O
que fica é a badge do pulso, ancorada na borda da **coluna de leitura** e não na
borda da janela — num monitor de 1600px a quina do vidro está a 300px de
qualquer coisa que o músico esteja olhando.

**Contagem de entrada** (padrão, só com a rolagem vinculada): um compasso de
click antes de a cifra andar, entrando no tempo forte junto com o acento. Conta
o compasso escrito na cifra, não quatro fixos.

**Tap tempo** resolve a cifra sem `{tempo:}`, que cai num 100 arbitrário. Média
móvel das últimas 5 batidas; um toque a menos de 200 ms do anterior é mão que
escorregou e é descartado **antes** da média — depois dela um toque duplo já
está dentro de qualquer faixa tocável e puxaria o andamento sem deixar rastro.
Pausa acima de 2,4 s começa medição nova.

## Modelo mental

```
.cho | .chordpro | .onsong | string (ChordPro, OnSong ou misto)
  → parse() → ChordProView          // a engine normaliza o formato
  → createViewerController / transpose
  → renderHtml({ theme: 'light' | 'dark' | 'print' })
  → Vue <ChordproViewer>  // UI completa de 1 cifra
  → renderPdf()           // entrada …/pdf
  → exportLyrics(source)  // letra plaintext (cadastro sem o viewer)
  → exportSlja(source)    // entrada …/slides — .slja sem montar o viewer
  → renderSlja(view)      // o mesmo ZIP, a partir do ViewModel
```

OnSong: `docs/research-onsong-format.md`. Expansão depois: `@…/react` ou CE — não é fork, não é registry de plugin.

## Fixtures

ChordPro real de produção: `fixtures/sda/` (lista do demo, ~148 `.cho`). Extra de partitura/imagem: `fixtures/013-ele-vive-em-mim-partitura.cho`.

## Tema e tipografia

`<ChordproViewer :theme="hostTheme" theme-control="host" />` torna a prop
imediatamente autoritativa, mesmo com preferência antiga. O default
`theme-control="preference"` preserva a escolha do músico; `theme` é fallback.
`auto` segue o SO. Em modo host, `update:theme` solicita a mudança; o host
aceita atualizando a prop. Retornar ao modo livre retoma a preferência anterior.

```css
.host-cifra {
  --cpv-font-lyrics: Figtree, system-ui, sans-serif;
  --cpv-font-controls: Figtree, system-ui, sans-serif;
  --cpv-font-chords: 'Space Mono', monospace;
}
```

Use uma classe no componente; carregue as fontes no host. Para herdar só a
fonte dos controles, `font-family: inherit` na mesma classe é uma alternativa
ao token explícito. Source/TAB mantêm monospace. Defaults: Sora para
letra/controles e Space Mono para acordes, com fallback de sistema.

[Guia do consumer: composições, tema, fontes](docs/CONSUMER.md).
[Testes de navegador](docs/SDA-VIEWER-VALIDATION.md):
`pnpm exec playwright install chromium webkit` e `pnpm test:browser`.

## Publicar (npm)

Modelo 2026 ([bypass2FA + staged publishing](https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/)):

- **Não** crie Granular Access Token com **Bypass 2FA** (deprecado).
- Token só de stage **não** faz `npm publish` — o GitHub Release sobe o tarball com OIDC; um maintainer aprova com 2FA na UI.
- Nome de pacote novo não entra em stage: o `0.1.0` já existe.

Mesmo padrão de [`@henryavila/mdprobe`](https://www.npmjs.com/package/@henryavila/mdprobe).

### Trusted Publisher (já ligado)

npmjs.com → pacote → **Access** → **Trusted Publisher**

- GitHub repo `henryavila/titan-chordpro-ui`
- workflow `publish.yml`
- **Allowed actions:** só `npm stage publish` (não `npm publish` direto)
- **Publishing access:** exigir 2FA e recusar tokens

### Releases

Chooser (feature = MINOR, não patch): [`scripts/release.ts`](scripts/release.ts) · skill [`.grok/skills/release/SKILL.md`](.grok/skills/release/SKILL.md).

```sh
pnpm release                       # imprime a próxima versão; não chute
pnpm test && pnpm typecheck
pnpm release:apply                 # package.json + CHANGELOG.md
# commit chore: release X.Y.Z, PR, merge, árvore limpa:
pnpm release:ship                  # tag anotada + GitHub Release
```

1. `--apply` grava `version` e move `CHANGELOG.md` `[Unreleased]` para `X.Y.Z`.
2. `--ship` empurra a tag `vX.Y.Z` e cria o GitHub Release (tem de bater com `package.json`). A árvore precisa estar limpa — rascunhos (PDF de teste, design-gates) ficam de fora.
3. O workflow [`.github/workflows/publish.yml`](.github/workflows/publish.yml) faz stage do tarball (OIDC, sem token).
4. **Você** aprova na UI (2FA) — OIDC não aprova:

[https://www.npmjs.com/package/@henryavila/titan-chordpro-ui?activeTab=versions](https://www.npmjs.com/package/@henryavila/titan-chordpro-ui?activeTab=versions)

Não use `npm stage approve` no CLI. Não rode `npm publish` / `pnpm publish` para uma versão que vai ter GitHub Release.

Re-stage de emergência (pacote que já existe): `./scripts/publish-npm.sh` (opcional `NPM_KEY` = GAT só de stage, **sem** bypass2FA).

Instalar:

```sh
pnpm add @henryavila/titan-chordpro-ui
```

Pre-1.0: `~0.6.0` (só patch) se o host não puder absorver minor. Feature sobe MINOR (`0.6.0`, não `0.5.1`).
