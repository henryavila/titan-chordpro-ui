# titan-chordpro-ui

Viewer **+ editor** de cifra ChordPro (uma camada): core TypeScript + UI Vue + PDF.  
Repo / pacote npm: **`titan-chordpro-ui`**. Decisão: [`docs/NAMING.md`](docs/NAMING.md) · rebrand: [`docs/REBRAND-HANDOFF.md`](docs/REBRAND-HANDOFF.md).

- **Product SoT:** [`docs/VISAO.md`](docs/VISAO.md)
- **Engineering contract:** [`SPEC.md`](./SPEC.md) — acceptance = §9
- **Generator (sibling, repo separado):** **`titan-chordpro-gen`** — audio → `.chordpro`
- **App Titan:** nenhum por agora (`titan-chordpro` = host futuro)
- **Consumer:** qualquer host Vue 3 / Nuxt — consome **só** a UI. Guia: [`docs/CONSUMER.md`](docs/CONSUMER.md)

## Status

Scaffold v0.1: core + Vue `ChordproViewer` + CLI + PDF. Visual SoT: `design-source/` (Titan Chordpro UI v2 + Chordpro Viewer v2).
Leitura, overlay pessoal, edição por bloco (E1/E2) e editor de partitura (VexFlow) implementados.

```bash
pnpm install
pnpm test
pnpm dev      # demo em :5173
pnpm build
```

## Core vs Vue vs host

| Core | Vue package | Host |
|---|---|---|
| parse, transpose, controller, HTML themes, PDF, filenames, scroll math + **timeline musical** | cifra toolbar, RAF auto-scroll, theme light/dark/auto, export UX, view↔edit E0, zen | shell, multi-cifra, sanitize, i18n, audio sync, **resolver de `{image:}`** |

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
import { parse, memoryStore } from 'titan-chordpro-ui'
import type { ChartStore } from 'titan-chordpro-ui'
import { renderPdf } from 'titan-chordpro-ui/pdf'
import { ChordproViewer } from 'titan-chordpro-ui/vue'
import type { ChordproViewerProps } from 'titan-chordpro-ui/vue'
```

`titan-chordpro-ui/vue` already pulls `./vue/style.css`. Import that path yourself only if you need to control order. `vue` and (for `{sos}`/`{sot}`) `vexflow` are peer dependencies. The UI expects **Sora** + **Space Mono**; remap `font-family` on `.cpv-root` if the host loads other faces.

Guia: [`docs/CONSUMER.md`](docs/CONSUMER.md). Demo: `pnpm dev` (standalone) e `/?ficha=1` (componente na ficha, ensaio).

### `<ChordproViewer>` props

| Prop | Default | Papel |
|---|---|---|
| `source` | `''` | Texto ChordPro/OnSong da cifra ativa (host escolhe qual) |
| `mode` | `'view'` | `view` \| `edit`; a UI também alterna sozinha (`update:mode`) |
| `theme` | `'auto'` | `auto` \| `light` \| `dark`; o leitor pode trocar |
| `canEdit` | `true` | `false` remove toda entrada para o editor |
| `fitDefault` / `autoHide` | `true` / `true` | Ajuste ao espaço inicial · esconder moldura na rolagem |
| `resolveImage` | identidade | `{image: assets/x.png}` → URL que o host serve |
| `autoInvertScores` | `true` | Inverte partitura escaneada quando o papel briga com o tema |
| `capabilities.sourcePane` | `true` | `false` esconde o painel de source no editor |
| `modes` | `'local'` | `none` \| `local` \| `content` \| `both`. Default = só local. `content` ou `both` liga **Para todos** (emite `save-content`) |
| `suggestions` | `true` | `false` tira do leitor o botão “Sugerir alteração” |
| `songId` | título da cifra | Identidade da música, chave da versão pessoal |
| `songs` | — | Lista do ensaio (`{id,title,subtitle?,key?,source?}`). **Duas ou mais** ligam o modo |
| `loadSong` | — | `(id, song) => Promise<string> \| string` para as músicas que a lista não trouxe |
| `fetchChart` | — | `(url) => Promise<string>` — busca a página de um link (é o backend do host) |
| `readPdf` | — | `(file) => Promise<string>` — lê PDF com texto; use `pdfText` de `titan-chordpro-ui/pdf` |
| `version` | `'v1'` | Versão do oficial; mudá-la pergunta ao leitor o que manter |
| `images` | `[]` | Partituras que o host serve — o que “Inserir · Imagem” oferece |
| `accent` | `'verde'` | `verde` \| `teal` \| `#hex` \| `rgb()`: a cor dos acordes e tudo que deriva dela |
| `accentStrength` | `1` | 0.5–1.5 sobre os preenchimentos derivados; a matiz não se move |
| `storage` | `localStorage` | Onde o que o viewer lembra é gravado — ver abaixo |
| `surfaceGuard` | `true` | Avisa (console + tela) quando o host embute sem dar altura ao pai |

Emite `update:source`, `update:mode`, `save`, `save-content`, `dirty`, `state`.

### Cifra nova: importar ou começar em branco

Música sem cifra não é beco. Com `modes="content"` (e `canEdit`), o estado vazio
oferece **Importar** e **Começar em branco**. O importador reconhece sozinho o
que recebe — ChordPro, OnSong ou acordes sobre a letra — e diz de qual formato
converteu. Depois vem a ficha (nome, artista, tom, andamento com **tap-tempo**,
compasso, referência); o que falta é dito, mas não bloqueia — é cobrado de novo
ao salvar para todos.

Três origens: **link**, **arquivo** (arrastar ou escolher) e **texto colado**.
As duas que dependem do mundo externo são props, não mágica do pacote:

```vue
<ChordproViewer
  modes="content"
  :fetch-chart="(url) => api.buscarPagina(url)"
  :read-pdf="(file) => pdfText(file)"
/>
```

`fetchChart` é o **backend do host**: o navegador não alcança outro site de
dentro do viewer. Sem ela, a aba Link diz isso em vez de fingir. `readPdf` vem
de `titan-chordpro-ui/pdf`; é prop para que o `pdfjs-dist` (peer opcional) só
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
daquela música. No fim da auto-rolagem o viewer **oferece** a próxima; nunca
avança sozinho.

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
import type { ChartStore } from 'titan-chordpro-ui'
import { STORE_KEYS, overlayKey } from 'titan-chordpro-ui'

const storage: ChartStore = {
  get: (key) => cache.get(key) ?? null,
  set: (key, value) => { cache.set(key, value); api.save(key, value) },
  remove: (key) => { cache.delete(key); api.remove(key) },
}
```

```vue
<ChordproViewer :source="cifra" :song-id="id" :storage="storage" />
```

As chamadas são **síncronas de propósito**. A leitura não pode travar esperando
rede no meio de um ensaio, então um host que persiste no servidor responde do
próprio cache e dispara a gravação por trás do `set`. Vale para a sugestão
também: o SPEC define o envio como *fire-and-forget* — o músico vê
“Sugestão enviada” e nada mais, sem status e sem aviso de aceite.

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
leitor. `modes` é o interruptor do consumer: omitido ou `'local'` = só a edição
pessoal (salva no aparelho, sem botão de publicar). `'content'` ou `'both'`
liga a UI **Para todos** — salvar emite `save-content` para o host gravar a
cifra oficial. Uma sugestão do leitor (`suggestions`) entra na fila do
responsável (cifras → pedidos → ajustes), aceita item por item.

### Auto-rolagem: tempo musical, não px/s

A rolagem não é velocidade em pixels. Cada bloco recebe um **peso musical**, e
ele é montado em duas camadas — a distinção entre elas é o ponto:

1. **O que a cifra declara**, lido no BPM dela. `x///` escrito numa linha que é
   *tocada e não cantada* — introdução, interlúdio, final — é contagem de
   compasso, e vira o tempo de rolagem daquele trecho diretamente. O mesmo vale
   para os compassos de uma tab ou partitura, e para a **cauda** segurada no fim
   de uma linha cantada. Esta camada nunca é calibrada: ela já é a resposta.
2. **O que ela deixa de fora.** Uma linha cantada sem marca vale
   `BEATS_PER_ROW` pulsos, e só esta camada é esticada ou comprimida para
   fechar em `{duration:}`.

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

Um *playhead* percorre a cifra nesse relógio e o percurso inteiro gasta a
duração declarada. `Timeline.bars` é o total do percurso e `runSec()` devolve
exatamente ele — se os dois divergirem, **todo** segmento toca na razão entre
eles, inclusive os compassos contados. Matemática em `src/core/timeline.ts`
(framework-free); o RAF e a medição do DOM ficam no binding Vue.

#### Onde a página fica: âncora com rampa, nunca congelada

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

Duas correções:

1. `anchorPx(viewport, doc)` é limitado pela rolagem que a cifra **tem** para
   dar (`min(viewport, doc − viewport)`). Uma cifra que mal passa da moldura não
   consegue segurar a música um terço abaixo, e pedir isso congelava a página
   quase a música inteira por causa de algumas dezenas de pixels.
2. `scrollAtPx()` paga a dívida em rampa: a página anda a `1 − ANCHOR_RAMP` do
   passo da música enquanto a música desce até o lugar de descanso, e no passo
   da música dali em diante. Nada congela — no corpus, toda cifra está andando
   em **0,1 a 0,5 s**.

`pxAtScroll()` é a inversa, e é ela que lê de volta a posição quando o músico
arrasta a cifra com o dedo.

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

## Mental model

```
.cho | .chordpro | .onsong | string (ChordPro, OnSong, or mixed)
  → parse() → ChordProView          // engine normalizes formats
  → createViewerController / transpose
  → renderHtml({ theme: 'light' | 'dark' | 'print' })
  → Vue <ChordproViewer>  // UI completa 1 cifra (format-agnostic)
  → renderPdf()           // entry …/pdf
```

OnSong details: `docs/research-onsong-format.md`. Expansion later: `@…/react` or CE — not a fork, not a plugin registry.

## Fixtures

Real ChordPro (IASD Ermelinda via SDA design-handoff): `fixtures/`.

### Tema e tipografia

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
