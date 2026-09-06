# Embed do Titan UI no SDA

Contrato entregue pelo Titan UI. A integração real A6 (frontend local, Nova
content, snapshot instalado e bundles do SDA) está **fora do escopo e não foi
executada** nesta mudança. Nenhum arquivo do SDA foi modificado; builds e validação do host não foram executados.

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
