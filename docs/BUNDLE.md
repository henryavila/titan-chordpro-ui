# Cifra completa (.zip) — documento offline

O pacote transporta **uma cifra e todos os seus anexos**, sem buscar conteúdo no
servidor original depois de exportado. É um documento portátil, não uma cópia do
aplicativo Titan. A exportação não altera o source do consumer.

## Inventário e decisões

| Conteúdo | Onde está hoje | O que vai no ZIP |
|---|---|---|
| Letra, acordes, seções, comentários, marcas `x///`, ritmo, `{define}`, TAB em texto e partitura própria | ChordPro | `.cho` UTF-8, preservando o conteúdo |
| Guitar Pro / MusicXML | `{x_titan_score: src="…" track=… start=… end=…}` + `resolveScore` | Arquivo original em `solos/`; referência relativa no `.cho`; faixa e compassos preservados |
| Imagens da cifra | `{image:…}` / `{img:…}` + `resolveImage` | Arquivo original em `imagens/`; referência relativa no `.cho` |
| Cantado e playback | `{x_titan_audio_sung:…}`, `{x_titan_audio_playback:…}` | Arquivos completos em `audios/`; referência relativa no `.cho` |
| Capa da música | `{x_titan_audio_art:…}` e dimensões | Imagem local; dimensões preservadas |
| Capa do player vinda do consumer | `defaultAudioArt`, quando há áudio sem capa própria | Incluída como imagem e materializada no `.cho` exportado |
| Capa padrão do player | Recurso empacotado no Titan | Incluída quando for a capa efetivamente usada pelo áudio |
| Capa/fundo dos slides | `coverImage`, `slidesImage`, ou imagens padrão do Titan | Arquivos locais; papéis `slide-cover`/`slide-background` no manifesto |
| YouTube, Spotify e outros serviços | IDs/links online | Apenas informação em `ORIGEM.txt`; sem botão, player ou dependência online no `.cho` exportado |
| Origem da cifra | `{x_titan_source:…}` | Informação em `ORIGEM.txt` |
| Blocos ocultos pelo editor | Linhas `#~` no source | Seus anexos também entram; o bloco permanece oculto |
| Blocos recolhidos na leitura | Estado transitório da UI | O conteúdo completo entra; recolher não exclui anexos |
| Versão pessoal | Overlay de edição selecionado em Exportar | Exporta a versão escolhida, com identificação de versão pessoal |
| Tom/capo de leitura | Estado do viewer | Usa a mesma preparação do export ChordPro; binários musicais mantêm o tom original |

O áudio **já está representado no ChordPro**: `setRehearsalAudio` grava os
endereços em diretivas. Não há prop `audioUrl`. O que chega somente por props
são algumas capas/fundos; por isso a exportação precisa capturá-los também.

Fontes da interface, código do aplicativo, samples do metrônomo e preferências
do aparelho não são anexos da música. A interpretação da notação ainda precisa
de um aplicativo compatível, assim como um PDF precisa de um leitor de PDF.
Não se exportam login, lista inteira de músicas, fila de sugestões nem caches.

## Estrutura e referências

- Um `.cho` na raiz, com nome derivado do título/tom.
- `solos/`, `imagens/`, `audios/`: somente os arquivos necessários.
- `manifest.json`: `format: titan-chordpro-bundle`, `version: 1`, `offline: true`,
  caminho do `.cho`, lista de anexos e seus papéis.
- `ORIGEM.txt`: referências informativas, quando existirem.
- `LEIA-ME.txt`: instruções de extração e escopo do pacote.

Nomes internos são gerados, relativos, sem `..`, barras invertidas ou nomes
vindos diretamente de URLs assinadas. Os endereços de download dos anexos não
entram no manifesto. Uma mesma referência usada várias vezes é baixada uma vez;
o manifesto registra seus diferentes papéis. Todos os binários são preservados.

## Contrato do consumer

A UI usa os resolvers atuais para solos/imagens e busca os áudios por seus
endereços. Para armazenamento privado ou que exige autenticação especial,
forneça `loadBundleAsset(reference, kind)`, devolvendo `{ bytes, contentType? }`.
`kind` é `score`, `image` ou `audio`. O callback deve entregar o arquivo completo,
não uma URL, página de login ou playlist. Não é necessário enumerar cada anexo
na montagem: o Titan descobre as referências da cifra escolhida.

API independente de Vue/DOM:

```ts
import { exportChartBundle } from '@henryavila/titan-chordpro-ui/bundle'
const file = await exportChartBundle(source, {
  loadAsset: async (reference, kind) => storage.read(reference, kind),
  onlineReferences: 'provenance',
  extras: [
    { role: 'slide-cover', data: { bytes: coverBytes, contentType: 'image/jpeg' } },
  ],
})
// file.bytes, file.filename, file.chart, file.assetCount
```

`extras` também aceita referência a uma imagem (`reference`) e dimensões. A capa
própria da música prevalece sobre a capa de áudio adicional. Consumidores da API
headless devem passar suas capas/fundos se fizerem parte da apresentação.

## Integridade e limites explícitos

- Falha de rede, CORS, autenticação, arquivo vazio ou resposta HTML/JSON interrompe
  a exportação. Não há download de um ZIP parcial sob o nome “Cifra completa”.
- HLS/DASH e playlists não são arquivos de áudio completos. O consumer precisa
  fornecer um arquivo consolidado; o exportador não copia só a playlist.
- SVG com imagens/fontes/estilos externos é recusado. Use SVG autocontido ou
  imagem raster. URLs de namespaces XML não são dependências de mídia.
- Um anexo em diretiva de mídia ainda não suportada gera erro, em vez de afirmar
  que aquela referência foi empacotada.
- Serviços online são guardados apenas como origem, conforme decisão do usuário;
  seu vídeo/áudio não é apresentado como incluído. Arquivos de áudio diretos
  são obrigatoriamente incluídos.
- O ZIP padrão é montado em memória, para uma cifra. ZIP64 e exportações em lote
  não fazem parte deste contrato.
- **Importação direta do ZIP ainda não foi implementada.** A estrutura está
  versionada para esse passo. Hoje é possível extrair os arquivos e o consumer
  servir/resolver as referências a partir da pasta extraída, sem o servidor de
  origem. Não basta passar o texto do `.cho` para um viewer e perder sua pasta.

## Verificação

Testes abrem o ZIP com um leitor independente, verificam referências locais,
presença de cada anexo, bytes originais de áudio/imagem/Guitar Pro, deduplicação,
blocos ocultos, capas externas, links informativos e falha sem download parcial.
O fluxo de download e tentativa após falha é exercitado em Chromium e WebKit.
