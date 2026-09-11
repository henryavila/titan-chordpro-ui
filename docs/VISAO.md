# Visão do produto — `titan-chordpro-ui`

> **Fonte de verdade de produto:** entrevista viewer (2026-08-28) + **refocus naming/editor** (2026-08-28/29), ratificados.  
> **Naming:** [`docs/NAMING.md`](./NAMING.md). **Design do editor:** [`projects/titan-chordpro-ui/editor/design.md`](../projects/titan-chordpro-ui/editor/design.md).  
> **`SPEC.md`:** contrato de engenharia / inventário técnico — alinhar §2/§9 ao editor em follow-up; não redefine o produto sozinho.

---

## 1. Entrevista (espinha ratificada)

| Campo | Decisão |
|---|---|
| **Problema** | Músicos precisam de uma **UI ChordPro profissional**: **ler** (transpor, rolar, exportar, tema) **e editar** (corrigir pós-gen/import e criar do zero). Reuso em SDA / futuro `titan-chordpro` é **canal**, não o problema. |
| **In-scope** | Camada **autossuficiente** de **1 cifra**: ChordPro (engine também aceita OnSong) → superfície **view + edit**; standalone demo ou **embutida** (`sda-v2` primeiro). Editor: in-place, meta, source+preview, WYSIWYG, TAB, imagens — mapa completo com **gates de entrega** (ver design do editor). |
| **Out-of-scope** | Collab realtime; multicifra; shell de app / login / nav; player áudio sync; shell do app `titan-chordpro`; geração áudio→ChordPro (`titan-chordpro-gen`); diagramas de braço (ainda later). |
| **Done-when (esta fase)** | Visão + naming + design do editor alinhados; implementação segue SPEC + gates E0–E4. |
| **Stakes (caros de reverter)** | (1) Binding Vue-first: um `<ChordproViewer>`, duas composições (ficha na página **ou** rota `100dvh`); **iframe cancelado**. (2) Contrato ViewModel / HTML de **leitura**. (3) **Source ChordPro como SoT de edição** + contrato host (`source` out, mode, dirty, media). |
| **Fontes** | Esta visão; `docs/NAMING.md`; design do editor; `fixtures/`; researches OnSong / auto-ajuste; `SPEC.md` como catálogo técnico. |

---

## 2. O que é este projeto

**`titan-chordpro-ui`** é a **UI de uma cifra ChordPro** — **leitura + edição** numa camada:

- Entrada: arquivo/texto **ChordPro** (`.cho` / `.chordpro` / …) **ou OnSong** (normalização na **engine**; a UI não escolhe formato). Em edição, OnSong = **convert-on-edit** → sessão/export ChordPro canônico.
- Saída: superfície visual profissional + PDF + export de texto + **source editado** de volta ao host.
- Modos de superfície: **`view`** (leitura limpa) e **`edit`** (visual-first; source pane sob demanda).
- Hosts: **`sda-v2`** (primeiro) embute a UI; depois app **`titan-chordpro`** (shell próprio — fora deste repo). O consumer fornece shell, multicifra, player/login — **não** reimplementa a experiência da cifra.

```
ChordPro (1 string)
    → titan-chordpro-ui (view + edit da cifra)
    → host (sda-v2 agora; titan-chordpro depois)
```

---

## 3. Fronteira: viewer vs consumer

| Responsabilidade | Viewer (nós) | Consumer (SDA / outros) |
|---|---|---|
| Parse / modelo interno da cifra | ✅ | |
| Render visual da cifra | ✅ | |
| Transposição | ✅ (UI + lógica) | |
| Tamanho de fonte | ✅ | |
| Auto-rolagem (controles + timer/RAF) | ✅ | |
| Export CHO / PDF | ✅ | Trigger de download pode ser do host se embutido |
| Temas claro / escuro (+ auto) | ✅ | Pode remapear tokens se precisar |
| Seletor de tema | ✅ | |
| Multi-cifra (qual versão ativa) | ❌ | ✅ passa 1 string |
| Shell, login, navegação | ❌ | ✅ |
| Player áudio sincronizado | ❌ | ✅ |
| Edição (source SoT; gates E0–E4) | ✅ | recebe `source` atualizado / dirty / media |
| Fret diagrams | ❌ (later) | — |

**Leitura da entrevista:** “sem toolbar/shell de **app**” ≠ “sem controles da cifra”. Controles do **músico na cifra** (tom, rolagem, fonte, tema, export) são **nossos**. Chrome do **produto** (menu, lista de músicas, auth) é do consumer.

---

## 4. Funcionalidades da UI (visão — 1 cifra)

### 4.1 Leitura (view)

1. **Leitura** elegante (acorde acima da letra, comentários de ensaio preservados, espaçamento).
2. **Transposição** (semitons; reset ao original).
3. **Tamanho de fonte** / bias (passos ou continuum — ver research auto-ajuste).
4. **Export** `.cho` e PDF (nomes estáveis; PDF com tom exibido).
5. **Auto-rolagem** com ajuste de velocidade (ensaio de pé).
6. **Temas:** claro e escuro, com opção de **troca automática**.
7. **Modo ajuste ao espaço** opt-in (reflow + leve auto-size; sem colunas) — **só em view**; em edit o layout fica estável.

### 4.2 Edição (edit) — mapa + gates

Detalhe normativo: [`projects/titan-chordpro-ui/editor/design.md`](../projects/titan-chordpro-ui/editor/design.md).

- **SoT:** source ChordPro; visual é projeção que escreve no source e re-parseia.
- **Mapa:** in-place + meta; source+preview; WYSIWYG estrutural; TAB; imagens (ref + host storage).
- **Entrega:** gates **E0–E4** (não um único DONE sem aceite/fixtures).
- **UX:** visual-first no ensaio; source sob demanda; progressive disclosure.

**Fixtures obrigatórias:** cifras reais em `fixtures/` — não inventar charts; E4 exige fixture de imagem antes de DONE.

---

## 5. Temas (visão de produto)

| Tema | Papel |
|---|---|
| **Claro** | Leitura diurna / ensaio padrão |
| **Escuro** | Palco / baixa luz |
| **Auto** | Segue `prefers-color-scheme` (ou política equivalente) |

Nota vs SPEC legado: SPEC falava `default` / `print` / `stage`. Na visão de produto, **claro + escuro (+ auto)** são o eixo visual; **print** continua conceito útil para PDF/impressão (pode ser derivado do claro denso, não necessariamente um 3º “look” de tela).

---

## 6. Stack — **ratificada** (2026-08-28)

Análises: [`research-stack.md`](./research-stack.md) · [`analysis-stack-pragmatismo.md`](./analysis-stack-pragmatismo.md) · [`analysis-expansao-futura.md`](./analysis-expansao-futura.md).

**Decisão:**

- **Hoje:** Vue-first (stack favorita + sda-v2) para a UI completa da cifra.
- **Core:** TypeScript sem Vue — parse, transpose, `renderHtml`, PDF, filenames, scroll math + **controller agnóstico** (`getState` / `subscribe` / `dispatch`).
- **Expansão:** bindings oficiais sob demanda (`/vue` agora; `/react` ou CE depois). **Não** fork do app. **Não** `VisualAdapter` runtime no v0.1.
- Padrão: TipTap / Zag — core + packages por framework.

**Constraint `AGENTS.md` (“No Vue in `src/`”):** **no Vue in core**; UI Vue em `src/vue` ou pacote `@…/vue`.

---

## 7. O que aproveitar do SPEC legado

Mesmo não sendo SoT de produto, o SPEC ainda lista comportamentos testáveis úteis:

- ViewModel JSON-serializável e imutável na transposição.
- Filenames (`buildChoFilename` / `buildPdfFilename`) e scroll math (§4.5–4.6).
- Fixtures `jesus-*` / `entrega-*`; comentários de ensaio (`INTRODUÇÃO`, `BEM SUAVE`) não podem sumir.
- CLI útil para smoke (`html` / `pdf` / `parse`) — pode coexistir com a UI.
- Entrada `.cho` e `.chordpro` equivalentes.

**Descartar / substituir como definição de produto:**

- “Framework-free library; toolbar/RAF só no host.”
- Fronteira lib vs host da tabela §3 como lei (invertida pela entrevista para controles da cifra).
- Aceite A1–A14 como Definition of Done do **produto** (são DoD de um pacote headless).

---

## 8. Ecossistema (canais, não o core)

| Peça | Papel |
|---|---|
| **titan-chordpro-gen** | Gera ChordPro a partir de áudio — **fora**. Pode consumir a UI para preview. |
| **sda-v2 (Nuxt)** | **Primeiro host:** shell, multi-cifra, sanitize, i18n, player. Importa `<ChordproViewer>` na ficha e/ou numa rota `100dvh`. Sem iframe. |
| **titan-chordpro** (futuro) | App standalone Titan (shell + extras) — **repo separado**; consome a mesma UI. |
| **Este repo → `titan-chordpro-ui`** | UI 1-cifra view+edit como componente Vue. |

---

## 9. Open questions

1. Sintaxe da diretiva de imagem + default capabilities no host SDA (ver design do editor).
2. Controles da cifra: barra no miolo vs chrome mínimo fixo (ainda “não-shell”).
   ~~Host: iframe vs página.~~ **Locked 2026-09-10:** componente Vue na ficha **e/ou** rota `100dvh`; iframe cancelado (`docs/CONSUMER.md`).
3. PDF: jsPDF vs print-CSS (SPEC sugeria jsPDF por parity SDA).
4. ~~Nome npm / escopo do pacote no rename~~ — **locked:** `@henryavila/titan-chordpro-ui` + exports `./vue` `./pdf` (`docs/REBRAND-HANDOFF.md`).
5. Alinhar `SPEC.md` §2/§9 e `design-handoff/` ao editor (aceite por gate E0–E4) — §2 ainda marca editor como Future (stale vs VISAO/NAMING).

---

## 10. Handoff

- **Design do editor:** aprovado via brainstorm → `projects/titan-chordpro-ui/editor/design.md`.
- **Próximo:** `project new plan editor` (ou equivalente) a partir do design Approved; scaffold core+Vue; gates E0→…  
- Non-goals permanentes: multicifra, shell Titan neste repo, áudio sync, collab.

**Não entrar com:** implementação SDA; inventar fixtures; tratar SPEC §3 como lei de UI.

---

## 11. Self-check

- Entrevista ratificada: sim (ajuste do problema → viewer para o músico; SDA/Titan = canal).
- Stack: aberta, tradeoffs registrados.
- SPEC legado: rebaixado a inventário técnico, não SoT.
- Artefato para outra sessão: este arquivo.
