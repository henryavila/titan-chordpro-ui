# Demo público (Cloudflare Pages)

Demo real do `<ChordproViewer>`: hub + standalone + shell + lista.

**Persistência de lab:** overlay e fila de sugestões usam `localStorage` do
navegador (mesmo `songId`), para validar **local → sugerir → persisted →
revisar**. Prefs de tema também sobrevivem ao reload.

**Papéis (`editMode`)**

| URL | Papel |
|---|---|
| `/standalone.html` ou `?editMode=local` | Músico — overlay + Sugerir |
| `?editMode=persisted` | Admin — oficial + fila |
| `?editMode=none` | Só leitura |
| `?criar=1` | Cifra nova (`persisted`) |

Query legado `?modes=` ainda funciona (`content`→`persisted`, `both`→`local`).

**Áudio de referência (lab)**

| URL | O que mostra |
|---|---|
| `?audio=1` | Cantado + playback (demo 2:41 / 65 BPM) |
| `?audio=cantado` / `?audio=playback` | Só uma faixa |
| `?audio=1&capa=0` | Sem capa do host — arte genérica do pacote |
| `?song=100-nasce-em-mim&audio=1` | *Nasce em Mim* + as duas faixas |

## O que o proxy faz

O navegador **não** consegue buscar `cifraclub.com.br` / YouTube direto (CORS).  
No `pnpm dev`, o Vite expõe:

| Rota | Papel |
|---|---|
| `/__cifra_fetch?url=` | HTML da cifra (só hosts em `SUPPORTED_HOSTS`) |
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

- Só `cifraclub.com.br` / `www.cifraclub.com.br` em `/__cifra_fetch`.
- Só `id` de 11 chars YouTube em `/__youtube_duration`.
- Sem persistência de body; pass-through.
