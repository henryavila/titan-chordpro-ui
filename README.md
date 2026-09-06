# titan-chordpro-ui

Viewer **+ editor** de cifra ChordPro (uma camada): core TypeScript + UI Vue + PDF.  
Repo / pacote npm: **`titan-chordpro-ui`**. Decisão: [`docs/NAMING.md`](docs/NAMING.md) · rebrand: [`docs/REBRAND-HANDOFF.md`](docs/REBRAND-HANDOFF.md).

- **Product SoT:** [`docs/VISAO.md`](docs/VISAO.md)
- **Engineering contract:** [`SPEC.md`](./SPEC.md) — acceptance = §9
- **Generator (sibling, repo separado):** **`titan-chordpro-gen`** — audio → `.chordpro`
- **App Titan:** nenhum por agora (`titan-chordpro` = host futuro)
- **Consumer:** sda-v2 Nuxt — consome **só** a UI

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

| Core | Vue package | Host (sda-v2) |
|---|---|---|
| parse, transpose, controller, HTML themes, PDF, filenames, scroll math + **timeline musical** | cifra toolbar, RAF auto-scroll, theme light/dark/auto, export UX, view↔edit E0, zen | shell, multi-cifra, sanitize, i18n, audio sync, **resolver de `{image:}`** |

Visual SoT: `design-source/` (Titan Chordpro UI v2 · Chordpro Viewer v2). Demo: `pnpm dev`.

## Consumer

```ts
import { parse, memoryStore } from 'titan-chordpro-ui'
import type { ChartStore } from 'titan-chordpro-ui'
import { renderPdf } from 'titan-chordpro-ui/pdf'
import { ChordproViewer } from 'titan-chordpro-ui/vue'
import type { ChordproViewerProps } from 'titan-chordpro-ui/vue'
```

`titan-chordpro-ui/vue` already pulls `./vue/style.css`. Import that path yourself only if you need to control order. `vue` and (for `{sos}`/`{sot}`) `vexflow` are peer dependencies. The UI expects **Sora** + **Space Mono**; remap `font-family` on `.cpv-root` if the host loads other faces.

### `<ChordproViewer>` props

| Prop | Default | Papel |
|---|---|---|
| `source` | `''` | Texto ChordPro/OnSong da cifra ativa (host escolhe qual) |
| `mode` | `'view'` | `view` \| `edit`; a UI também alterna sozinha (`update:mode`) |
| `theme` | `'auto'` | `auto` \| `light` \| `dark`; o leitor pode trocar |
| `canEdit` | `true` | `false` remove toda entrada para o editor |
| `fitDefault` / `autoHide` | `false` / `true` | Ajuste ao espaço inicial · esconder moldura na rolagem |
| `resolveImage` | identidade | `{image: assets/x.png}` → URL que o host serve |
| `autoInvertScores` | `true` | Inverte partitura escaneada quando o papel briga com o tema |
| `capabilities.sourcePane` | `true` | `false` esconde o painel de source no editor |
| `modes` | `'local'` | `none` \| `local` \| `content` \| `both`. Default = só local. `content` ou `both` liga **Para todos** (emite `save-content`) |
| `suggestions` | `true` | `false` tira do leitor o botão “Sugerir alteração” |
| `songId` | título da cifra | Identidade da música, chave da versão pessoal |
| `version` | `'v1'` | Versão do oficial; mudá-la pergunta ao leitor o que manter |
| `images` | `[]` | Partituras que o host serve — o que “Inserir · Imagem” oferece |
| `accent` | `'verde'` | `verde` \| `teal` \| `#hex` \| `rgb()`: a cor dos acordes e tudo que deriva dela |
| `accentStrength` | `1` | 0.5–1.5 sobre os preenchimentos derivados; a matiz não se move |
| `storage` | `localStorage` | Onde o que o viewer lembra é gravado — ver abaixo |

Emite `update:source`, `update:mode`, `save`, `save-content`, `dirty`, `state`.

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

A rolagem não é velocidade em pixels. Cada bloco recebe um **peso musical** — os
pulsos `x///` escritos na linha são exatos, tab e partitura contam compassos, o
resto é estimado por acorde e calibrado contra `{duration:}`. Um *playhead*
percorre a cifra nesse relógio e a página só anda quando ele passa da **linha de
leitura** (meio da tela): introdução e final ficam parados na tela, e o percurso
inteiro gasta a duração declarada. Matemática em `src/core/timeline.ts`
(framework-free); o RAF e a medição do DOM ficam no binding Vue.

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

### Tema e tipografia no embed

`<ChordproViewer :theme="hostTheme" theme-control="host" />` torna a prop
imediatamente autoritativa, mesmo com preferência antiga. O default
`theme-control="preference"` preserva a escolha do músico; `theme` é fallback.
`auto` segue o SO. Em modo host, `update:theme` solicita a mudança; o host
aceita atualizando a prop. Retornar ao modo livre retoma a preferência anterior.

```css
.sda-cifra {
  --cpv-font-lyrics: Figtree, system-ui, sans-serif;
  --cpv-font-controls: Figtree, system-ui, sans-serif;
  --cpv-font-chords: 'Space Mono', monospace;
}
```

Use `class="sda-cifra"` no componente; carregue as fontes no host. Para herdar
só a fonte dos controles, `font-family: inherit` na mesma classe é uma
alternativa ao token explícito. Source/TAB mantêm monospace. Defaults:
Sora para letra/controles e Space Mono para acordes, com fallback de sistema.

[Contrato completo, precedência, fontes e distribuição ao SDA](docs/EMBED-SDA.md).
A integração real SDA/Nova (A6) não foi executada nesta alteração.
[Testes de navegador e evidência da regressão](docs/SDA-VIEWER-VALIDATION.md):
`pnpm exec playwright install chromium webkit` e `pnpm test:browser`.
