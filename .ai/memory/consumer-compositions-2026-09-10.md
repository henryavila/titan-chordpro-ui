# Composições do consumer (2026-09-10)

Iframe **cancelado**. O Titan é um SFC Vue. Guia: `docs/CONSUMER.md`.

## Duas composições, o mesmo componente

- **Standalone:** rota `100dvh`, sem shell. Palco.
- **Na página:** bloco `100dvh` no fluxo de uma ficha **com conteúdo acima e abaixo**. Snap estaciona o frame. Não esvaziar a ficha para um header.

Não existe cifra-como-artigo (`overflow: visible` no scroller).

## Gestos no celular (não misturar)

- Toque na cifra = só moldura Titan (zen). **Não** pin/unpin.
- Botão Tela cheia = cobre o host (`position:fixed`). Única entrada/saída do pin.
- iPhone Safari: sem Fullscreen API para elemento. Pin cobre o site, não a barra do Safari.
- Botão só aparece se API nativa **ou** ≥48px de viewport descobertos (`viewportPin.ts`). Na ficha, enquanto o dock está sob a dobra, o botão vive no header do viewer (`canPinFill`).

## Armadilhas

- Ancestral sem altura → barra no fim da cifra (`useSurfaceGuard`).
- `TITAN_PREVIEW_DIR` com 1 arquivo **não pode** substituir os fixtures: **merge**. Senão o ensaio some.
- Tailscale `8452` já apontou para o Vite errado (5175 vs 5173). Conferir `tailscale serve status`.

## Demo

As **páginas** continuam 2×2 (palco/ficha × com/sem lista). O **índice** não é
essa grade + um laboratório: agrupa por o que se faz (tocar, escrever, host).

`pnpm dev` → `/`. Páginas: `/standalone.html`, `/standalone-lista.html`,
`/site.html`, `/site-lista.html`. Query: `?criar=1`, `?modes=`, `?ensaio=demanda`,
`?song=`, `?quebrar=1`. Bookmarks `/?ficha=1` / `/?ensaio=juntas` redirecionam.
