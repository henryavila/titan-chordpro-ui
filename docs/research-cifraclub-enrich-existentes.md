# Pesquisa — enriquecer cifras já existentes com Cifra Club

**Data:** 2026-09-11  
**Escopo:** pesquisa + implementação v1  
**Status das decisões:** **ratificadas** (ver §9) · **implementado** (`proposeCifraClubEnrich` / MetaDialog)

**Pedido:** para cifras **já existentes**, trazer metadados do Cifra Club **sem** usar o corpo da cifra do CC e **sem** passar pelo pipeline de `convert` / import de cifra nova.

---

## 1. Problema

O fluxo “Nova cifra → URL Cifra Club” importa **cifra + meta** (`convert` → `fromPlain` + `writeMeta`).

Cifras **já no catálogo** têm corpo curado (`x///`, partitura, tabs). O que falta são campos ricos do CC. Este enrich **não** é um segundo import: é só leitura de meta do HTML.

### Inventário SDA (`fixtures/sda/`, 148 `.cho`)

| Campo | Presente | Observação |
|-------|----------|------------|
| `tempo` / `time` / `duration` | ~138–145 | Já preenchidos na maioria |
| `key` / `title` | ~106–116 | Bom, mas não 100% |
| `capo` | 3 | Raro |
| `x_source` | **0** | Nenhuma amarra ao CC (`{x_origem:}` legado ainda lê) |
| `x_youtube` | **0** | Sem clipe |
| `x_strum` | **0** | Sem batida importada |

Ganho real: `x_youtube`, `x_strum`, `x_source` (+ fill-empty em buracos). Corpo local **nunca** tocado.

---

## 2. O que reutilizar do CC (só meta)

Usar `fromCifraClubHtml` **apenas** pelos campos de meta / strum / youtube. **Ignorar `page.body`.** Não chamar `convert`, `fromPlain`, nem strip/tabs do corpo.

| Origem CC | Campo Titan | Política ratificada |
|-----------|-------------|---------------------|
| JSON-LD name / byArtist | `title` / `subtitle` | fill-empty |
| tom UI / `keyShape` | `key` | fill-empty |
| `strummings[0].bpm` | `tempo` | fill-empty |
| `timeSignature` | `time` | fill-empty |
| `config.capo` | `capo` | **não aplicar** no v1 (aviso só) |
| `metadata.youtubeID` | `x_youtube` | **ask sempre** se houver candidato CC (ver §6) |
| `strummings[]` | `x_strum` | **prefer-cc** (sobrescreve local; hoje local não existe) |
| watch YT | `duration` | fill-empty após youtube escolhido |
| URL usada | `x_source` | sempre setar (`{x_origem:}` legado ainda lê) |

API CC v3 → 401. Busca por nome → não no v1. Discovery = colar URL.

---

## 3. Discovery

**v1 = colar URL** do Cifra Club + mesmo `fetchChart` do host.

Sem busca por nome, sem heurística de slug, sem mapa no pacote (mapa curado pode viver no consumer depois).

---

## 4. Merge — só meta, zero import de cifra

```
existente.source  ── corpo byte-igual ──┐
                                        ├─→ writeMeta(source, mergedMeta)
CC HTML → fromCifraClubHtml             │
          (só title/key/tempo/time/     │
           capo/youtube/strums) ────────┘
          page.body DESCARTADO
```

Regras:

- **Não** usar a cifra do CC.
- **Não** usar `convert` / import de cifra nova.
- Corpo ChordPro local permanece idêntico (teste: hash do body sem header meta).

---

## 5. Capo

Enrich **não** grava `{capo:}` automaticamente. Se CC reportar capo > 0: aviso informativo apenas. Corpo local não transpõe.

---

## 6. YouTube — ask sempre + página de validação

Quando o CC trouxer `youtubeID` (e/ou quando já existir `x_youtube` local e o remoto diferir — na prática SDA está vazio, mas a regra é **ask sempre** antes de gravar):

Mostrar:

1. **Nome da música** (title local e/ou title do CC)
2. **Os dois links** (quando existirem):
   - local: `https://www.youtube.com/watch?v={x_youtube}` (se houver)
   - CC: `https://www.youtube.com/watch?v={youtubeId}`
3. **Página web de comparação** com os dois embeds lado a lado (ou um só se o outro não existir), para dar play e validar qual clipe é o certo — sem abrir abas às cegas.

Aceitar → grava o `x_youtube` escolhido; depois tenta `duration` via `fetchYoutubeDuration` (fill-empty).

Se só existir o do CC e o local estiver vazio: ainda assim **ask** (mostrar nome + link + player), não gravar silencioso.

---

## 7. Superfície / escopo de versão

Hoje **só existe 1 versão** da cifra (canônica). Enrich aplica nela.

Sem overlay / “minha versão” neste corte.

### Confirmação — UI no Titan (ratificado)

**v1 = UI no MetaDialog**, não “só código”.

Fluxo para cifra já cadastrada:

1. Abrir **Metadados** na cifra atual  
2. **Completar com Cifra Club** → colar URL  
3. Host `fetchChart` → core extrai **só meta** (sem `convert`)  
4. Preview do que vai entrar (`x_strum`, buracos fill-empty, `x_source`)  
5. YouTube: **ask** com nome + links + página/embed dos dois vídeos → usuário escolhe  
6. Confirmar → `writeMeta` no source atual (corpo intacto)

O consumer **não** precisa montar essa confirmação: só injeta `fetchChart` / `fetchYoutubeDuration` como na cifra nova. A API pura no core existe para testes/fixtures, mas a confirmação humana do v1 é a UI do Titan.

---

## 8. Validação antes de produção

Ordem obrigatória:

1. **Fixtures** — HTML CC em `tests/helpers/cifraclub-*.html` + `.cho` SDA sem `x_*`
2. Assert: corpo idêntico; `x_strum` / `x_source` aplicados; fluxo YT ask não grava sem escolha
3. Demo / página de comparação YT exercitada com fixtures (ou IDs conhecidos)
4. **Só então** rodar enrich em produção / catálogo real

Nada de batch em prod sem essa validação verde.

---

## 9. Decisões ratificadas

| # | Tema | Decisão |
|---|------|---------|
| — | Cifra / import | **Não** usar cifra do CC; **não** usar `convert`/import |
| — | Merge | Só metadados no source local |
| 1 | `x_youtube` | **Ask sempre**; nome da música + links; página web com os dois vídeos para play/validar |
| 2 | `x_strum` | **Sobrescreve** o local (hoje não existe `{x_strum:}` nas fixtures) |
| 3 | Versões | Só a **versão única** atual (canônica) |
| 4 | Rollout | Validar nas **fixtures** antes de produção |
| — | Discovery | Colar URL |
| — | Capo | Não automático |
| — | `tempo`/`time`/`duration`/`key`/título | fill-empty |
| — | Confirmação | **UI no MetaDialog** (consumer só passa `fetchChart`) |

---

## 10. API core sugerida (quando implementar)

```ts
export type EnrichResult = {
  source: string          // após apply das escolhas
  patch: ChartMeta
  proposed: ChartMeta     // o que o CC ofereceu
  conflicts: EnrichConflict[]
  youtube: {
    songTitle: string
    localId: string
    remoteId: string
    localUrl: string
    remoteUrl: string
  } | null
}

/** Só meta. Nunca toca o corpo. Não chama convert. */
export function enrichMetaFromCifraClubHtml(
  source: string,
  html: string,
  opts?: { url?: string },
): EnrichResult
```

Página de validação YT: artefato de demo/host (HTML estático ou rota Vite) alimentada pelos IDs do `EnrichResult.youtube` — não precisa viver no core.

---

## 11. Critérios de pronto

- [x] Corpo da fixture SDA idêntico antes/depois do enrich
- [x] Não passa por `convert` / não escreve acordes do CC
- [x] `x_strum` do CC sobrescreve; `x_source` gravado
- [x] `x_youtube` só após escolha explícita; página com nome + links + embeds
- [x] Capo CC não altera source
- [x] Suite de fixtures verde **antes** de qualquer corrida em produção

---

## 12. Fora de escopo

Busca por nome · batch automático em prod · sobrescrever corpo · capo automático · overlay · API CC autenticada · Simplificada / shapes
