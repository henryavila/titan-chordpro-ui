# Design — Demo PWA full offline

> **Aprovado** (usuário, 2026-10-02) · transformar o **demo atual** em PWA offline.
> Pacote Titan: fontes + cache de áudio. Service worker e manifest: só o demo.

## Problema

Depois de abrir a cifra com rede, o músico precisa continuar lendo, rolando e
trocando de música se a internet cair; e reabrir o ícone da tela inicial sem
rede. O demo hoje busca Sora/Space Mono no Google Fonts, não tem service
worker, e os links são `/standalone.html` (quebram no GitHub Pages).

## Decisão

Uma demo só. Hub, standalone, lista, site, media e a Central de Mídia passam a
ser o PWA. Não há uma segunda página “offline”.

| Peça | Onde |
|---|---|
| `@font-face` Sora / Space Mono (woff2) | Pacote Vue (`src/vue/fonts.css`) |
| Cache Storage de áudio ao montar a cifra e as vizinhas da lista | Pacote Vue |
| `matchAudio` / `putAudio` / `fillAudioCache` públicos | `@henryavila/titan-chordpro-ui/vue` |
| Service worker, manifest, ícones | Demo (`vite-plugin-pwa`) |
| `loadSong` / Cifra Club / YouTube | Continuam do host; no Pages falham com o erro já existente |
| Registrar SW no npm | Não |

## Demo

- Workbox `generateSW`, `navigateFallback: null` (MPA: seis HTML).
- Precache `js,css,html,woff2,png,jpg,jpeg,svg,m4a,wav,ico,webmanifest`.
- `display: standalone`, `viewport-fit=cover` (já no HTML), tema `#0B0D12`.
- Links do hub e redirects usam `import.meta.env.BASE_URL`.
- Cloudflare (`base=/`, proxy Cifra Club) permanece. GitHub Pages usa
  `VITE_BASE=/titan-chordpro-ui/`.

Primeira visita com rede instala o SW. Fecha, abre o ícone, cifras do corpus,
tipografia, metrônomo, áudio/solos já no precache ou no Cache Storage.

## Fora

- Service worker dentro do pacote npm.
- IndexedDB genérico no core (o demo já guarda uploads no IDB).
- Desligar o Cloudflare.
- Cifra Club / duração do YouTube sem proxy (continuam online).
