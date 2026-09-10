# Embed do Titan UI no SDA

> **Status em 2026-09-09: o embed não está pronto.** O consumer implementa o
> Titan como **página dedicada (standalone)**, não dentro de um `<iframe>` da
> ficha. Tudo abaixo está implementado, testado e vale como contrato — mas os
> ajustes que faltam no embed (a moldura do viewer reserva 216px absolutos, o
> que num frame de ~500px são 43% dele; e o piso real de altura é 560px, não os
> 460px de `min-height`) ficaram para uma rodada posterior. Não tratar este
> documento como "pode integrar agora".

Contrato entregue pelo Titan UI. A integração real A6 (frontend local, Nova
content, snapshot instalado e bundles do SDA) está **fora do escopo e não foi
executada** nesta mudança. Nenhum arquivo do SDA foi modificado; builds e validação do host não foram executados.

## O frame: altura é responsabilidade do host

O viewer é uma **superfície com região rolável própria**. A raiz é
`position:relative; height:100%; min-height:460px; overflow:hidden`; a área de
leitura é `position:absolute; inset:0; overflow-y:auto`; e **toda** barra, folha
e diálogo é `position:absolute` contra essa mesma caixa.

Disso decorre uma regra única:

> **Dê ao ancestral imediato uma altura definida.** Sem ela, `height:100%` não
> resolve, o viewer cai no piso de `min-height:460px`, a cifra cresce além dele,
> a página do host passa a rolar — e `bottom:0` deixa de significar "base do
> frame" para significar "fim da música". A barra de controle vai para baixo da
> dobra e o músico não alcança tom nem rolagem enquanto lê o começo.

| Não faça | Por quê |
| --- | --- |
| Sobrescrever `height`, `overflow` ou `position` de `.cpv-root` | Desmonta o containing block de todo o chrome |
| Sobrescrever `.cpv-scroll` para `overflow: visible` | Remove a única região rolável; o auto-scroll, a linha de leitura e o ETA passam a medir o documento errado |
| `position: fixed` em qualquer UI para "resolver" o embed | Vaza para fora do frame — o design system proíbe |
| Tratar a barra no fim da cifra como bug de contraste | É geometria de containing block, não estilo |

### Embed em página que rola (ficha com letra, arquivos, histórico)

O viewer **não** tem modo "artigo", e não vai ter: auto-scroll, linha de leitura,
zen, ajuste e imersivo só fazem sentido com um viewport próprio. Quando a cifra
mora dentro de uma ficha longa, a composição é do host — o frame inteiro
acompanha a rolagem, e as barras continuam absolutas **dentro** dele:

```css
.sda-ficha {
  display: grid;
  gap: 24px;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
}
@media (max-width: 899px) {
  .sda-ficha { grid-template-columns: minmax(0, 1fr); }
}
.sda-cifra-frame {
  position: sticky;
  top: 72px;                      /* = altura do cabeçalho fixo do host */
  height: calc(100dvh - 88px);    /* top + respiro inferior */
  min-height: 460px;
  overflow: hidden;
  border-radius: 16px;
}
```

A posição do frame em fluxo deve **igualar** o `top` do sticky; se ela começar
mais abaixo, o retângulo nasce parcialmente fora da tela e a barra inferior fica
sob a dobra mesmo com o contrato respeitado.

### A guarda

Quando o ancestral não tem altura, o viewer **avisa em vez de falhar calado**:
`console.warn` com o remédio, mais um alerta na tela. Ele só acusa o que se
confirma numa segunda medição ~1,2 s depois — o primeiro layout (fontes,
VexFlow) colapsa o frame por um instante e daria falso positivo. Não acusa em
modo imersivo (a raiz vira `position:fixed`, nenhum pai manda) nem quando o
componente não foi renderizado (`display:none`, aba fechada, DOM sem layout).

`surfaceGuard={false}` desliga, para o host que compõe o frame de outro jeito
sabendo o que faz. Desligar não muda comportamento nenhum — só cala o aviso.

## Tela cheia: a permissão é responsabilidade do host

O modo imersivo tem **duas metades**, e só uma delas está na mão do viewer.

A primeira é a moldura do próprio viewer — cabeçalho e dock. Essa sempre
funciona: os dois saem e o vão que reservavam volta a ser papel de cifra.
Medido num telefone de 390×844, são 82px acima e 134px abaixo, **26% da tela**.

A segunda é o chrome do navegador (barra de endereço, barra de abas). Essa só
existe pela Fullscreen API, e não tem alternativa: `position:fixed` não escapa
de um iframe — o próprio viewer usa `position:fixed` na raiz em modo imersivo, e
dentro de um frame isso o eleva no máximo até as bordas do frame.

**Se o viewer for servido de outra origem que a página do host, é o host que tem
de abrir a porta:**

```html
<iframe src="https://cifras.exemplo/juntas" allow="fullscreen" title="Cifra"></iframe>
```

A regra medida nos dois motores (Chromium e WebKit), porque a documentação
comum diz só metade dela:

| Frame | Sem atributo | Com `allow="fullscreen"` |
| --- | --- | --- |
| **Mesma origem** do host | **já funciona** | igual |
| **Cross-origin** | `fullscreenEnabled === false` | funciona |

A allowlist padrão da Permissions Policy para `fullscreen` é `self`, então um
frame de mesma origem herda a permissão e não precisa de nada. O atributo legado
`allowfullscreen`, sozinho, também serve. Quem precisa do atributo é o embed
cross-origin — que é o caso quando a cifra vem de um domínio próprio.

Sem ele, `document.fullscreenEnabled` é `false` **enquanto todos os métodos
estão presentes** — estado que nenhum documento de topo consegue ter, e que só um
frame cross-origin sem permissão produz. O viewer detecta exatamente isso e
emite um `console.warn` uma vez, com o remédio, em vez de deixar o botão falhar
calado.

| Onde | Tela cheia de verdade? | Como se entra |
| --- | --- | --- |
| Chrome/Edge/Firefox Android e desktop | sim, API nativa | botão do dock (`Tela cheia`) ou toque na cifra |
| Safari iPadOS e macOS ≥ 16.4 | sim, API nativa | idem |
| WebKit < 16.4 e WebViews in-app antigas | sim, no prefixo `webkit` | idem |
| **Safari no iPhone, página própria** | **não** | toque na cifra — não há botão |
| **Safari no iPhone, embed com host que cresce o frame** | **sim, pelo host** | botão do dock (`Tela cheia`) |
| iframe cross-origin sem permissão e sem host que cresça | não | toque na cifra — não há botão, + `console.warn` |

O iPhone é um teto de plataforma, não um bug a corrigir: a Fullscreen API para
elemento não-vídeo chegou ao iPhone na 17.2 **atrás de flag experimental,
desligada por padrão**, e só `<video>` tem saída garantida. Os ~110px de chrome
do Safari não são recuperáveis por nenhuma API web. O que dá para recuperar é a
moldura do viewer: dos 216px que ela reserva, 160px voltam para a cifra — os
outros 56px são a borda de cima e a faixa onde o aviso de saída é desenhado. E
isso o toque na cifra entrega em todo lugar, iPhone incluído.

**O botão de tela cheia só existe onde há uma tela cheia para ganhar.** Sem nada
a tomar, ele e o toque na cifra fazem a mesma coisa — escondem a moldura do
viewer — e dois controles para o mesmo ato são bagunça numa fileira que já estava
cheia. Onde há, o botão ganha o lugar porque leva também o que o gesto não leva.

A condição é essa, nunca "é celular". São duas estradas, e basta uma:

1. **A API nativa**, quando o navegador tem e a permissão está dada.
2. **O host crescendo o `<iframe>`**, quando ele declara que sabe — a única
   estrada de um iPhone dentro de um embed, descrita abaixo.

Para conferir do próprio aparelho, o demo traz `?embed=1` (permissão dada e host
que cresce o frame — no iPhone é a estrada 2 que atende) e `?embed=bloqueado`
(permissão negada com `allow="fullscreen 'none'"`, que é como se reproduz a
recusa a partir de uma única origem, e host que não declara nada).

### Tela cheia no iPhone dentro de um embed: o host cresce o frame

No iPhone o `allow="fullscreen"` **nunca foi o bloqueio** — o método não existe.
Com permissão ou sem, `Element.prototype.requestFullscreen` está ausente, e um
iframe não pinta fora da própria caixa. Dentro de um embed no iPhone, portanto,
o viewer não tem estrada nenhuma até a tela.

Quem tem é o host: ele é dono do `<iframe>`, e pôr **esse elemento** em
`position:fixed; inset:0` entrega a viewport inteira à cifra. O viewer pede, e
nunca supõe — o botão só aparece depois que um host declarou que sabe fazer isso.

O viewer **não** toca no DOM do host. Alcançar o `window.frameElement` daria
certo num embed de mesma origem e é exatamente o que a tabela lá em cima proíbe:
o dentro do frame é nosso, o fora é do host, e essa linha é o contrato inteiro.

```js
const frame = document.querySelector('#cifra')
const tell = (msg) =>
  frame.contentWindow?.postMessage({ source: 'titan-chordpro-host', ...msg }, '*')

window.addEventListener('message', (e) => {
  if (e.source !== frame.contentWindow) return
  const m = e.data
  if (m?.source !== 'titan-chordpro') return

  // 1. O viewer se apresenta. Responda dizendo se você sabe crescer o frame.
  if (m.type === 'hello') return tell({ type: 'capabilities', expandFrame: true })

  // 2. O viewer pede a tela. Mova o seu elemento e confirme.
  if (m.type === 'expand') {
    frame.classList.toggle('is-full', m.on)
    tell({ type: 'expanded', on: m.on })
  }
})

// O viewer pode ter carregado antes deste listener existir: diga sem ser
// perguntado também. As duas ordens chegam no mesmo lugar.
tell({ type: 'capabilities', expandFrame: true })
```

```css
#cifra.is-full { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 2147483000; }
```

Regras do protocolo:

| Regra | Por quê |
| --- | --- |
| `expandFrame: true` só se você **realmente** move o frame | É o que decide se o botão é desenhado. Declarar sem implementar devolve o bug de origem: um controle que acende e não move nada |
| Confirme sempre com `expanded` | É como o viewer segue um frame que **você** encolheu — gesto de voltar, botão de fechar seu |
| Encolheu por conta própria? Mande `{ type: 'expanded', on: false }` | Sem isso o viewer fica em imersivo dentro de um frame que já voltou ao lugar |
| O viewer só lê dois booleanos das suas mensagens | Tudo que chega de outro documento é dado, nunca instrução |
| Mensagens de qualquer `source` que não seja o `contentWindow` do frame são ignoradas | Nos dois sentidos |

O viewer manda o `hello` para `'*'` — nenhum documento emoldurado consegue ler a
origem do pai — e passa a endereçar tudo depois disso à origem exata que respondeu.

Para experimentar do próprio celular, o demo traz o host implementado:
`?embed=1` (host declara e cresce) e `?embed=bloqueado` (host não declara nada —
é o que um host que não implementou isso parece: nenhum botão).

A saída, no celular, é o toque na cifra: em imersivo o dock foi embora junto com
o resto da moldura, e é o aviso permanente na tela que diz isso. Um toque
devolve a moldura **e** o frame ao host.

Um controle não anuncia o que não pode cumprir: no desktop sem API nativa o
rótulo é `Modo imersivo`, não `Tela cheia`.

## Tema controlado pelo host

```vue
<script setup lang="ts">
import { ChordproViewer } from 'titan-chordpro-ui/vue'
import 'titan-chordpro-ui/vue/style.css'
// activeCho, hostTheme ('light' | 'dark') e songId vêm do host.
</script>
<template>
  <ChordproViewer
    class="sda-cifra"
    :source="activeCho"
    :song-id="songId"
    :theme="hostTheme"
    theme-control="host"
    modes="local"
  />
</template>
```

`themeControl` aceita `preference` (default compatível) ou `host` (opt-in).

| Política | Precedência e atualização |
| --- | --- |
| `preference` | Escolha do músico / `cpv:prefs.theme` restaurado → prop `theme` como fallback → default `auto`. Enquanto não há preferência, mudanças da prop alteram o fallback. Depois de uma escolha, a preferência vence. |
| `host` | A prop `theme` sempre vence a preferência salva. Mudanças da prop após mount aplicam imediatamente; o viewer não grava esse valor como escolha pessoal. |
| `auto` em qualquer política | Segue `prefers-color-scheme`, inclusive alterações do SO durante a sessão. Não significa herdar a aparência do site. Um site claro deve passar `light`. |
| Retorno de `host` para `preference` | Retoma a preferência livre anterior; se não havia uma, usa a prop atual como fallback. |

No modo host, botão e atalho T emitem `update:theme` com o próximo valor,
sem mudar a aparência ou persistir a solicitação. O controle mostra o valor
atual e informa que o tema é controlado pelo site. Para aceitar a solicitação,
o host atualiza sua prop (pode usar `v-model:theme`); se não aceitar, permanece
com seu valor. Não é necessário ouvir o evento para impor a política do site.

Alterar tema, fit, tamanho de fonte ou preferências do metrônomo não apaga
`cpv:prefs.theme` antigo no modo host, outros campos persistidos ou overlays
pessoais. Não limpe localStorage como etapa de adoção. `storage` continua sendo
o ponto de integração para preferências e overlays gerenciados pelo host.

No frontend mantenha `modes="local"`; no editor oficial/Nova use
`modes="content"` e o contrato existente de source/save do host. A política de
tema não altera responsabilidades de salvamento.

## Tipografia

Tokens públicos aceitam listas CSS de famílias. Podem ser definidos na classe
do próprio componente ou em um ancestral (as custom properties são herdadas).

| Token | Default standalone | Aplicação |
| --- | --- | --- |
| `--cpv-font-lyrics` | `Sora, system-ui, -apple-system, sans-serif` | Letra de leitura, edição visual e input da letra |
| `--cpv-font-controls` | `Sora, system-ui, -apple-system, sans-serif` | Controles gerais e painéis |
| `--cpv-font-chords` | `'Space Mono', monospace` | Acordes, formas de capo e pills de edição |

Exemplo Figtree, usando o token de fonte que o host já carrega:

```css
.sda-cifra {
  --app-font-sans: Figtree, system-ui, sans-serif;
  --cpv-font-lyrics: var(--app-font-sans);
  --cpv-font-controls: var(--app-font-sans);
  --cpv-font-chords: 'Space Mono', monospace;
}
```

Se preferir herdar diretamente a fonte do ancestral nos controles, aplique
`font-family: inherit` na classe pública `sda-cifra`, mantendo o token de letra
explícito. `--cpv-font-controls: inherit` é uma palavra global CSS que herda o
**token**, não a propriedade `font-family`; não é equivalente. Não é preciso
usar seletores internos. Source, TAB e indicadores numéricos especializados
mantêm monospace; símbolos musicais mantêm a fonte apropriada.

O pacote não baixa fontes. O host carrega Figtree/Sora/Space Mono conforme sua
política; os fallbacks funcionam antes e se o carregamento falhar. A leitura
reserva largura intrínseca para acorde/forma e recalcula naturalmente quando
muda fonte, tom, capo ou container. Não inserir espaços na cifra para ajustar
layout. Palavras maiores que o container têm rolagem horizontal na própria
linha; transições internas de acorde não viram pontos de quebra.

## Artefato reproduzível e adoção pelo responsável SDA

No checkout Titan UI da revisão aprovada, com árvore limpa:

```sh
rtk proxy pnpm install --frozen-lockfile
rtk proxy pnpm exec playwright install chromium webkit
rtk proxy pnpm typecheck
rtk proxy pnpm build
rtk proxy pnpm test
rtk proxy pnpm test:browser
rtk proxy git rev-parse HEAD
rtk proxy pnpm pack --pack-destination artifacts
rtk proxy shasum -a 256 artifacts/titan-chordpro-ui-0.1.0.tgz
```

Guarde o SHA do commit, o tarball e seu SHA-256 juntos. O pacote contém `dist`,
exports core/PDF/Vue e CSS; `src` do repo irmão não é uma dependência viva.
Use diretório/nome de artefato único por revisão para evitar cache de tarball
com a mesma versão `0.1.0`. Não publique no registry apenas para testar local.

A partir daqui, passos **a executar pelo responsável SDA**, sem execução nesta
entrega:

1. Copiar/identificar o tarball aprovado; conferir o SHA-256 antes da instalação.
2. No checkout SDA, atualizar a dependência com
   `pnpm add /caminho/absoluto/artefato-unico/titan-chordpro-ui-0.1.0.tgz`.
   Versionar a mudança esperada de manifest/lockfile ou usar o mecanismo de
   artefatos do projeto. Para distribuição remota, usar URL de artefato imutável
   ou versão publicada aprovada; não deixar caminho local inacessível no CI.
3. Conferir `pnpm list titan-chordpro-ui` e o conteúdo instalado de
   `node_modules/titan-chordpro-ui/dist` (prop `themeControl` e tokens novos).
   Não assumir que editar/buildar Titan atualiza o snapshot instalado.
4. Aplicar props/tokens acima nos dois pontos de embed, respeitando `local`
   no frontend e `content` no Nova. Não apagar preferências nem overlays.
5. Inspecionar os `package.json` responsáveis pelo frontend e pelo componente
   Nova (`pnpm run` lista scripts) e executar **ambos** os builds declarados.
   Seus nomes/caminhos não foram consultados nesta execução; não se afirma que
   um build da aplicação também reconstrói o Nova. Registrar comando, revisão
   e hash do artefato de cada bundle.
6. Validar no navegador real a página e o editor oficial: tema host claro com
   SO escuro e preferência antiga dark; troca prop light/dark; Figtree pronta e
   fallback; pares Bm/E, B/E, Em7/D/A, Fsus4/F em desktop/móvel e transpose/capo.
   Conferir persistência pessoal versus conteúdo oficial sem atualizar banco
   por smoke nem apagar dados. Registrar separadamente o resultado A6.

Evidência e matriz executada exclusivamente no Titan:
[SDA-VIEWER-VALIDATION.md](SDA-VIEWER-VALIDATION.md).
