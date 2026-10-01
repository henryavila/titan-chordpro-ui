# Demo público (Cloudflare Pages)

Demo real do `<ChordproViewer>`: hub + standalone + shell + lista.

**Persistência de lab:** o overlay pessoal, a fila de sugestões e a cifra
oficial usam `localStorage` do navegador (mesmo `songId`); os arquivos
Guitar Pro/MusicXML enviados ficam no IndexedDB. O demo passa explicitamente
`persistSuggestion`, `suggestionQueue`, `loadBundleAsset` e `uploadScore` ao
viewer. Isso permite validar **local → sugerir com arquivo → persisted →
revisar antes/depois → aceitar → recarregar** em abas do mesmo navegador.
Prefs de tema também sobrevivem ao reload. A demo não sincroniza aparelhos;
para isso, o consumer implementa a API descrita no [guia](./CONSUMER.md#10-edição-e-persistência).

**Papéis (`editMode`)**

| URL | Papel |
|---|---|
| `/standalone.html` ou `?editMode=local` | Músico — overlay + Sugerir |
| `?editMode=persisted` | Admin — oficial + fila |
| `?editMode=none` | Só leitura |
| `?criar=1` | Cifra nova (`persisted`) |

Teste do solo: em `/standalone.html?editMode=local`, importe um arquivo pelo
**+ entre blocos → Guitar Pro / MusicXML**, volte à leitura e envie em
**Minha versão → Sugerir**. Em outra aba, abra
`/standalone.html?editMode=persisted` e toque em **Sugestões dos músicos**.
Depois de aceitar, atualize a página: o arquivo e a cifra oficial continuam
disponíveis. A implementação do host de demonstração está em
[`CifraDemo.vue`](../demo/CifraDemo.vue),
[`suggestion-store.ts`](../demo/host/suggestion-store.ts) e
[`image-store.ts`](../demo/host/image-store.ts).

Query legado `?modes=` ainda funciona (`content`→`persisted`, `both`→`local`).

**Cifra ou letra (lab)**

| URL | O que abre |
|---|---|
| `?lens=letra` | Já na letra — link de cantor |
| `?lens=none` | Já na cifra, mesmo se este aparelho tinha ficado em Letra |
| sem `lens` | última escolha deste aparelho |

**Áudio de referência (lab)**

| URL | O que mostra |
|---|---|
| `/media.html` | Host completo: leitura, cantado + playback, capa **1024 × 1024** e `defaultAudioArt`. O título da página é o do consumer; a Central de Mídia mostra a música |
| `/media.html?capa=0` | Sem `{x_titan_audio_art:}` na cifra — vale a capa padrão do consumer |
| `?audio=1` | Cantado + playback (demo 2:41 / 65 BPM), capa 1024 |
| `?audio=cantado` / `?audio=playback` | Só uma faixa |
| `?audio=1&capa=0` | Sem capa do host — arte genérica do pacote (512) |
| `?song=100-nasce-em-mim&audio=1` | *Nasce em Mim* + as duas faixas |
| `/standalone-lista.html?audio=1` | Set com áudio: anterior/próxima na Central de Mídia; cada cifra uma faixa; pular recomeça do zero |

## O que o proxy faz

O navegador **não** consegue buscar `cifraclub.com.br` / YouTube direto (CORS).  
No `pnpm dev`, o Vite expõe:

| Rota | Papel |
|---|---|
| `/__cifra_fetch?url=` | HTML da cifra. Se a resposta não for a cifra, o proxy monta o HTML da [§11](./CONSUMER.md#11-buscar-no-cifra-club-fetchchart) |
| `/__youtube_duration?id=` | HTML do watch do YouTube (duração → `{duration:}`) |

No Pages, as mesmas rotas vivem em `functions/` (Pages Functions).  
A demo continua chamando os mesmos paths relativos — local e produção iguais.

Import por **arquivo / colar / PDF** não precisa de proxy.

## Free tier (Cloudflare)

| | Free |
|---|---|
| Static assets | ilimitado |
| Functions (Workers) | **100 000 req/dia**, ~10 ms CPU (espera de `fetch` não conta) |
| Domínio | `*.pages.dev` grátis |

Outras opções gratuitas (se um dia sair do CF): Deno Deploy (~1 M req/mês), Vercel Hobby (uso pessoal). Para este proxy fino, **Cloudflare** é o melhor custo/benefício.

## Build e deploy

```bash
pnpm install
pnpm build:pages          # → dist-demo/
pnpm pages:dev            # static + Functions local (Wrangler)
```

**Dashboard Cloudflare**

1. Workers & Pages → Create → Connect to Git (este repo).
2. Build command: `pnpm install && pnpm build:pages`
3. Build output directory: `dist-demo`
4. A pasta `functions/` na raiz é detectada automaticamente (não entra no `dist-demo`).

**CLI**

```bash
pnpm build:pages
npx wrangler pages deploy dist-demo
```

> Upload direto pelo dashboard **não** leva Functions — use Git ou Wrangler.

## Segurança do proxy

- Só `cifraclub.com.br` / `www.cifraclub.com.br` em `/__cifra_fetch`. Se a página não for a cifra, o proxy monta o HTML descrito na [§11](./CONSUMER.md#11-buscar-no-cifra-club-fetchchart).
- Só `id` de 11 chars YouTube em `/__youtube_duration`.
- Sem persistência de body.
