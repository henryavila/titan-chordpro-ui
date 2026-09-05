# Research digest — stack do `titan-chordpro-ui`

> Data: 2026-08-28 · Objetivo: dados sólidos para decidir stack (standalone + embed).  
> Produto (SoT): [`VISAO.md`](./VISAO.md) — UI completa de **1 cifra**, standalone **e** embutível.  
> Este doc **não decide**; alimenta a decisão.

---

## 1. Contexto local (evidência no disco)

| Sistema | Stack | Papel p/ o viewer |
|---|---|---|
| **sda** (legado) | Vue 3 + Inertia + Laravel + Vite; `chordproject-parser` | Consumer Vue clássico |
| **sda-v2** | **Nuxt 4.3** + Vue + Pinia + Tailwind 4; `ChordproViewer.vue` (~536 LOC) + `useChordpro.ts`; `jspdf` + `chordproject-parser` | **Consumer principal** — precisa embutir 1 cifra |
| **titan-chordpro-gen** | **Python** (`pyproject.toml`) | Gera `.chordpro`; preview pode ser HTML estático / CLI / página mínima — **não é app Vue/React** |

Implicação: o embed crítico é **Vue/Nuxt**. Standalone e Titan precisam de algo que rode **sem** o runtime do SDA. Dois “mundos” reais: **host Vue** e **shell sem framework** (HTML/CLI/demo).

---

## 2. O que o produto exige da stack (da VISAO)

- UI interativa: transpose, fonte, auto-rolagem (RAF), tema claro/escuro/auto, export CHO/PDF.
- **Uma** superfície de cifra (não multi-cifra).
- Standalone sem shell de app.
- Embutível em apps web (SDA-v2 primeiro).
- Contrato interno estável (ViewModel/HTML) — stake caro de reverter.

Isso é um **widget complexo**, não um design system de 80 átomos — mas também não é um SaaS full-page com roteamento.

---

## 3. Dados externos (tamanhos / embed)

Números aproximados de runtime / hello-world (fontes 2024–2026; medir de novo no scaffold).

| Runtime | Ordem de grandeza (gzip) | Notas |
|---|---|---|
| **Vanilla** custom element | ~1–3 KB | Mínimo absoluto; DX piora com UI complexa |
| **Lit** | ~5–17 KB | Lit ~5 KB citado (2026); setup Vite mínimo ~17 KB em um relato |
| **Preact** | ~4–10 KB | API próxima de React |
| **Vue 3** | ~26–57 KB | App Vite mínimo ~54 KB minificado em um benchmark |
| **React 19** | ~45–61 KB gzip runtime; ~140 KB JS minificado (Vite hello) | Ecossistema maior |
| **@r2wc/react-to-web-component** | ~1.3 KB gzip o wrapper | **Não remove** o React do bundle do embed |

**iframe vs Web Component** (benchmark 2025, 1 instância): WC load **~21 ms** vs iframe **~116 ms** (~4,5×); memória similar. Para widget **próprio/confiável**, WC > iframe. (iframe só se isolamento de terceiros for requisito — não é o nosso caso.)

**Lit vs React (Sparkbox):** Lit = componentes cross-framework / design systems; React = apps com estado complexo e ecossistema full-stack. São **complementares**, não substitutos 1:1.

**Vanilla vs Lit (medição T-CREATOR, 2025):** vanilla menor no first paint; Lit melhor em re-render e DX (código ~½); diferença gzip ~2 KB — para widget com reatividade (transpose/scroll), Lit ganha na prática.

---

## 4. Abordagens candidatas

### A — Lit (Web Component) como produto único

**Como:** `<titan-chordpro-ui source="…">` (ou property). Standalone = página HTML que carrega o mesmo CE. SDA-v2: `client-only` + import do CE.

| Ganha | Perde |
|---|---|
| Embed nativo em Vue **e** React **e** HTML | Ecossistema/UI libs menores que React |
| Bundle embed pequeno (sem React no SDA) | Shadow DOM: temas/CSS vars precisam de contrato explícito |
| Uma implementação = standalone + embed | SSR Nuxt: CE costuma ser client-only (ok p/ cifra) |
| Alinha com “widget autossuficiente” da VISAO | Time precisa aprender Lit (curva moderada) |

**Encaixa VISAO:** alto.

---

### B — Vue 3 (SFC) como produto único

**Como:** pacote Vue + app Vite/Nuxt mínimo para standalone. SDA-v2 importa o SFC/composable.

| Ganha | Perde |
|---|---|
| Menor atrito com **sda-v2** (mesmo idioms) | Titan/HTML puro: precisa montar app Vue ou build IIFE |
| Reuso mental do `ChordproViewer.vue` atual | Consumer React futuro = bridge/iframe/outra UI |
| DX forte p/ quem já vive no Nuxt | “Duas stacks no mundo” se Titan quiser zero-Vue |

**Encaixa VISAO:** médio-alto se SDA for 90% do valor; médio se standalone/Titan forem first-class.

---

### C — React standalone + embed via `@r2wc` (a hipótese “2 stacks”)

**Como:** desenvolver a UI em React; exportar também `customElements.define('titan-chordpro-ui', r2wc(App, { props, shadow }))`.

**Resposta direta:** não são duas stacks de UI — é **uma stack React** com **fachada Web Component**. O embed em Vue **ainda baixa React** (~45 KB+ gzip só do runtime, mais o app).

| Ganha | Perde |
|---|---|
| DX React no desenvolvimento do standalone | SDA-v2 **paga imposto React** mesmo sendo Vue |
| Embed “funciona” em qualquer host HTML/Vue | Dois modos de API (props React vs attributes CE) a testar |
| Um codebase de UI | Shadow + r2wc: eventos/attrs/json props = superfície de bugs |
| | Duas cópias de React se algum host também for React (hoje não) |

**Quando faz sentido:** time só quer escrever React **e** aceita ~50–150 KB no host Vue.

**Quando não:** prioridade é embed leve no Nuxt + Titan sem runtime React.

---

### D — Core TypeScript headless + UI Lit (híbrido “SPEC + VISAO”)

**Como:** `parse/transpose/renderHtml/pdf/scroll math` em TS puro (testável, CLI); UI (controles + RAF) em Lit CE que consome o core.

| Ganha | Perde |
|---|---|
| ViewModel/HTML testáveis sem DOM | Dois pacotes/entries a versionar |
| CLI/PDF/Titan usam core sem UI | Mais cerimônia no início |
| UI embutível leve | — |
| Permite trocar só a UI depois | — |

**Encaixa VISAO + stakes:** alto (protege o contrato ViewModel).

---

### E — Vanilla Custom Elements (sem Lit)

| Ganha | Perde |
|---|---|
| Bundle mínimo, zero dep de UI lib | Boilerplate de reatividade, templates, TS |
| Máxima longevidade de plataforma | Manutenção da UI complexa (scroll, temas, toolbar da cifra) dói |

**Veredito pesquisa:** só se o widget fosse trivial. Para transpose + RAF + temas + PDF UX, **Lit > vanilla** na relação DX/tamanho.

---

### F — “Duas UIs de verdade” (React **e** Lit/Vue reescritos)

| Ganha | Perde |
|---|---|
| Cada host vê “nativo” | **2×** bugs, 2× design, 2× snapshots |
| | Viola o espírito de um viewer autossuficiente |

**Não recomendado.** Se precisar de duas *entradas*, use **uma UI + fachada** (C ou D), não duas implementações.

---

### G — Preact + custom element (meio-termo)

API parecida com React, runtime ~4–10 KB; dá para expor CE. Menos ecossistema que React; menos “padrão widget” que Lit. Opção válida se o time quer JSX sem peso do React.

---

## 5. Matriz de decisão (critérios × abordagens)

Pesos sugeridos pelo contexto local (ajustáveis):

| Critério (peso) | A Lit | B Vue | C React+r2wc | D Core+Lit | E Vanilla |
|---|---|---|---|---|---|
| Embed no **sda-v2 Nuxt** sem runtime estranho (5) | 5 | 5 | 2 | 5 | 5 |
| Standalone / Titan HTML sem host (5) | 5 | 3 | 5 | 5 | 5 |
| Bundle no host Vue (4) | 5 | 4 | 2 | 5 | 5 |
| Velocidade de entrega da UI (4) | 3 | 5 | 4 | 3 | 1 |
| Alinhamento VISAO “widget pronto” (5) | 5 | 3 | 4 | 5 | 3 |
| Proteção do contrato ViewModel (4) | 3 | 3 | 3 | 5 | 3 |
| Risco de manutenção longo prazo (3) | 4 | 4 | 3 | 4 | 2 |
| **Score ponderado (máx 150)** | **~128** | **~112** | **~98** | **~136** | **~100** |

*(Scores são julgamento explícito sobre os dados acima — não benchmark de app chordpro.)*

---

## 6. “Podemos ter 2 stacks?”

| Interpretação | Viável? | Custo real |
|---|---|---|
| React p/ standalone **e** Lit/Vue **reescrito** p/ embed | Tecnicamente sim | **Alto** — duas UIs |
| React p/ tudo + **r2wc** como CE no Vue | Sim e comum | **Médio** — uma UI, bundle React no embed |
| Core TS único + **uma** UI (Lit) + entries `./` e `./react-wrapper` opcional depois | Sim | **Baixo–médio** — melhor ROI |
| Standalone React **sem** commit de embed | Sim, mas adia o hard requirement | Dívida: SDA continua com viewer legado |

**Conclusão:** “2 stacks” só vale como **React + fachada CE** se o time insistir em React. Não vale manter duas implementações visuais.

---

## 7. Riscos específicos do domínio cifra

1. **Shadow DOM vs CSS de tema** — claro/escuro/auto e override do host (tokens SDA) precisam de CSS variables no host ou `part`/`::part`, ou light DOM controlado.
2. **`innerHTML` + sanitize** — VISAO/SPEC: host pode sanitizar; widget embutido deve documentar política (DOMPurify dentro vs fora).
3. **Auto-scroll RAF** — precisa de root scrollável estável (`[data-cpv-scroll]`); ok em CE.
4. **PDF (jsPDF)** — pesado; lazy-load no export, entry separado (como SPEC `./pdf`).
5. **Nuxt SSR** — viewer client-only; não bloqueia.

---

## 8. Recomendação provisória (para ratificar)

Ordenada pelo research + consumers reais:

1. **Preferida: D (Core TS + UI Lit CE)**  
   - Protege o contrato ViewModel (stake).  
   - Embed leve no Nuxt.  
   - Standalone = demo HTML/Vite que monta o mesmo CE.  
   - CLI/PDF no core (Titan/smoke).

2. **Alternativa forte se DX Vue for prioridade absoluta: B (Vue package)**  
   - Mais rápido para cortar o `ChordproViewer.vue` do sda-v2.  
   - Aceitar que Titan/standalone montam Vue ou usam build IIFE.

3. **Só escolher C (React + r2wc) se** houver preferência explícita de time por React **e** aceite do imposto de bundle no SDA.

4. **Evitar:** F (duas UIs); E (vanilla puro) para este nível de interação.

---

## 9. Fontes

**Repo local**

- `/Volumes/External/code/sda/package.json` — Vue 3 + Inertia  
- `/Volumes/External/code/sda-v2/frontend/package.json` — Nuxt 4.3  
- `/Volumes/External/code/sda-v2/frontend/app/components/ChordproViewer.vue`  
- `/Volumes/External/code/titan-chordpro-gen/pyproject.toml` — Python  
- `docs/VISAO.md`, `SPEC.md` (legado técnico)

**Externas (amostra)**

- Sparkbox — Lit vs React (complementares)  
- Medium/Yuji — Lit ~17 KB vs React ~140 KB / Vue ~57 KB (Vite mínimo)  
- T-CREATOR — Vanilla WC vs Lit (DX vs ~2 KB gzip)  
- David Lewis (2025) — iframe vs WC load times  
- Bitovi / `@r2wc/react-to-web-component` 2.1.1 — React→CE; React permanece no bundle  
- PkgPulse / jsbenchmarks — ordens de grandeza React/Vue/Preact/vanilla  
- npm (consulta local 2026-08-28): `lit@3.3.3`, `react@19.2.8`, `vue@3.5.42`, `preact@10.29.8`, `@r2wc/react-to-web-component@2.1.1`

---

## 10. Próximo passo

Ratificar **uma** linha (D / B / C). Em seguida: desenhar UI da cifra e atualizar `AGENTS.md` / arquivar ou reescrever `SPEC.md` para não haver dois SoT.
