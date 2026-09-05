# Análise — expansão futura a partir de Vue-first

> Responde ao contrapondo: *“hoje Vue-first; e amanhã? Fork? View plugável multi-stack?”*  
> Base: pesquisa de padrões reais (TipTap, Zag/Ark, relation-graph, pricing-renderer, SDKs agnósticos) + domínio cifra.

---

## 1. Resposta direta

| Pergunta | Resposta |
|---|---|
| Vue-first resolve o que preciso **hoje**? | **Sim.** |
| Expansão futura exige React/Lit **agora**? | **Não.** |
| Expansão = **fork** do nosso app? | **Não deveria.** Fork do monólito é o pior caminho. |
| Dá para ter “view plugável” com várias stacks? | **Sim, em teoria** — mas o desenho *certo* para nós **não** é um plugin runtime de UI; é **core + bindings oficiais** (padrão TipTap/Zag). |
| O que facilitar **já**? | Contrato duro: **core sem Vue**, ViewModel, `renderHtml`, store/controller agnóstico, CSS tokens, pacote `@…/vue` fino. |

---

## 2. O que “expansão” significa no nosso caso

Há **três** expansões diferentes (não misturar):

| # | Expansão | Quem pede | Custo se core estiver limpo |
|---|---|---|---|
| E1 | Mais hosts **Vue** (outro Nuxt, demo standalone) | Você / SDA | Baixo — só publicar o pacote Vue |
| E2 | Host **React** (ou vanilla HTML) | Comunidade / você depois | Médio — **novo binding**, não fork |
| E3 | Temas / PDF / CLI / Titan preview | Já na VISAO | Baixo–médio — quase tudo no **core** |

O medo de “ficar preso no Vue” só se materializa se transpose/PDF/HTML/scroll viverem **dentro** do SFC. Aí um “port React” vira **reescrita** (= fork informal).

---

## 3. Três arquiteturas de expansão (pesquisa)

### A) Core headless + bindings por framework *(padrão vencedor na indústria)*

```
titan-chordpro-ui          → parse, transpose, renderHtml, pdf, scroll math, createViewerController()
titan-chordpro-ui/vue      → SFC/composables (oficial, v0.1)
titan-chordpro-ui/react    → hooks/components (só quando houver demanda — binding futuro)
titan-chordpro-ui/element  → CE opcional (só se HTML drop-in virar requisito)
```

**Exemplos reais:** TipTap (`@tiptap/core` + `@tiptap/vue-3` / `react`); Zag/Ark (machine core + bindings); relation-graph (core TS + packages por plataforma); pricing-renderer (ViewModel → element/React adapter).

| Complexidade | Quando pagar |
|---|---|
| Baixa no dia 1 (só core + vue) | Sempre |
| Média ao adicionar React | Na 1ª issue/PR real |

**Não é fork:** é segundo pacote no mesmo monorepo (ou repo), dependendo do core versionado.

---

### B) View plugável em runtime (`VisualAdapter` / plugin registry)

```
core.createViewer({ visual: VueVisual | ReactVisual | Custom })
```

**Exemplos extremos:** React reconciler multi-host, Uniview (RPC + UINode + workers), microfrontends com slots.

| Ganha | Perde |
|---|---|
| Trocar visual sem republicar “app” | Você vira mantenedor de **framework de plugins** |
| | Contrato gigante: mount/update/unmount, a11y, focus, scroll root, SSR, temas |
| | Sem 2º adapter, a API é especulação (YAGNI) |
| | Debugging e tipagem pioram cedo |

**Veredito para cifra:** overkill. Um viewer de 1 cifra não precisa de marketplace de skins multi-framework no v0.1.

---

### C) Fork / port comunitário do app inteiro

Alguém copia o repo Vue e reescreve em React.

| Ganha | Perde |
|---|---|
| Zero trabalho seu no curto prazo | Divergência de bugs, temas, PDF, fixtures |
| | Você não controla qualidade do “React titan-chordpro-ui” |
| | Comunidade sofre; você herda issues “por que o fork não tem X?” |

**Só aceitável** se o monólito Vue **não** tiver core — e aí o fork é sintoma de falha de arquitetura, não estratégia.

---

## 4. Desafios concretos da expansão (E2 React) — se Vue-first estiver bem feito

| Desafio | Gravidade | Mitigação **agora** (sem escrever React) |
|---|---|---|
| Lógica presa em `ref`/`watch` Vue | Alta | Core TS + `createViewerController()` com `getState/subscribe/dispatch` |
| HTML só existe como template Vue | Alta | `renderHtml(view, { theme })` → **string** estável; Vue só injeta |
| CSS acoplado a Nuxt UI / Tailwind do SDA | Alta | Tokens `--cpv-*`, classes `cpv`, tema claro/escuro documentados |
| Auto-scroll assume DOM do SFC | Média | Contrato: root `[data-cpv-scroll]`; controller expõe `attachScroll(el)` ou host passa el |
| Eventos (“tom mudou”, “export”) | Média | Callbacks/DOM events no contrato do shell, não só `emit` Vue |
| PDF/jsPDF no bundle Vue | Média | Entry `core/pdf` lazy; bindings só chamam |
| Duas UIs de controles a manter | Alta **depois** | Aceitar: toolbar React ≠ copy-paste do SFC; reusa **controller + HTML cifra** |
| Testes só no Vue | Média | 80% dos testes no core (fixtures jesus/entrega) |
| Versionamento multi-package | Baixa–média | Monorepo depois; no v0.1 pode ser `exports`: `.` core e `./vue` |

**Complexidade típica de um binding React bem preparado:** da ordem de **dias a poucas semanas** (controles + wiring), não meses — **se** o core existir. Sem core: **reescrita** (mês+).

---

## 5. O que *não* facilita expansão (armadilhas)

1. **“Deixar plugável” sem consumidor** → inventar `VisualAdapter` vazio.  
2. **Web Component wrapping do app Vue inteiro** cedo → possível, mas muda o problema (ainda Vue dentro); não substitui core limpo.  
3. **Duplicar HTML no Vue e no core** → drift.  
4. **Publicar só um SFC monolítico** “titan-chordpro-ui” sem core exportável → comunidade React = fork.

---

## 6. O que *sim* facilitar agora (checklist de “portabilidade latente”)

Investimento pequeno, alto retorno — **compatível com Vue-first total na UI**:

### Camada 1 — Core (obrigatório)

- [ ] Zero imports Vue/React em `src/core` (grep/CI, como o AGENTS já intuía).
- [ ] `ChordProView` JSON-serializável (já no SPEC legado).
- [ ] `parse` / `transpose` / `setKey?` / `renderHtml` / filenames / scroll math / `renderPdf`.
- [ ] Fixtures + testes de aceite no core.

### Camada 2 — Controller agnóstico (forte recomendação)

Algo no espírito:

```ts
const c = createViewerController({ source })
c.subscribe((state) => { /* displayKey, html, theme, scrollSpeed */ })
c.dispatch({ type: 'transpose', semitones: 1 })
c.dispatch({ type: 'setTheme', theme: 'dark' | 'light' | 'auto' })
c.attachScroll(element) // opcional
```

Vue v0.1: composable fino `useChordproViewer()` → só adapta controller ↔ `ref`/`computed`.  
React depois: `useChordproViewer()` hooks → **mesmo** controller.

Isso é a forma *leve* de “view plugável”: **a view é plugável porque o estado não é Vue**.

### Camada 3 — Contrato visual da cifra (obrigatório)

- [ ] HTML estável + classes `cpv*` / legacy opcional.
- [ ] CSS variables documentadas (claro/escuro/auto).
- [ ] Controles **fora** do HTML da cifra (shell do viewer), para ports refazerem botões sem tocar o miolo.

### Camada 4 — Pacote Vue (oficial)

- [ ] `titan-chordpro-ui/vue` = UI completa da VISAO.
- [ ] Demo standalone Vue no repo (prova de vida sem sda-v2).

### Camada 5 — Adiar com consciência

- [ ] `titan-chordpro-ui/react` (binding futuro)  
- [ ] Custom Element  
- [ ] `VisualAdapter` registry  
- [ ] Marketplace de temas JS  

Documentar no README: *“React binding: planned when there’s demand; PRs welcome against core controller + HTML contract.”*

---

## 7. “App com view plugável multi-stack” — quando faria sentido?

Só se **no mesmo runtime** o host precisasse carregar visuais de stacks diferentes (plugin store, white-label de terceiros). Isso **não** é o sda-v2 nem o Titan.

Para “eu quero React um dia / comunidade quer React”:

→ **bindings**, não plugin runtime.

Diagrama alvo:

```
                 ┌──────────────────────┐
  .cho/.chordpro │  CORE (TS)           │
  ─────────────► │  viewmodel + html    │
                 │  + controller        │
                 └──────────┬───────────┘
           ┌────────────────┼────────────────┐
           ▼                ▼                ▼
     package /vue     package /react    CLI / pdf
     (agora)          (depois)          (agora no core)
           │
           ▼
        sda-v2
```

---

## 8. Síntese para decisão

| Opção | Expansão futura | Custo hoje | Recomendação |
|---|---|---|---|
| Vue monolito sem core | Fork quase certo | Mais baixo hoje | Evitar |
| **Vue-first + core + controller** | Binding React limpo | Baixo–médio | **Escolher** |
| Vue-first + VisualAdapter genérico | “Plugável” cedo | Alto, especulativo | Evitar no v0.1 |
| React/Lit day-1 | Multi-host cedo | Alto no caminho sda-v2 | Só se E2 for requisito já |

**Contrapondo acolhido:** Vue-first é certo para hoje.  
**Complemento:** expansão ≠ fork e ≠ plugin multi-stack; expansão = **core + controller + contrato HTML**, com Vue como primeiro binding.

---

## 9. Fontes (amostra)

- TipTap: core headless + `@tiptap/vue-3` / `@tiptap/react`  
- Zag / Ark UI: state core + bindings React/Vue/Solid/Svelte  
- relation-graph: `relation-graph-models` + packages por plataforma  
- pricing-renderer: ViewModel → element / React adapter  
- Cheesecake Labs / hexagonal frontend: core + adapters  
- Uniview / Repluggable: mostram o **teto** de complexidade de UI verdadeiramente plugável cross-framework — desproporcional para este produto  

---

## 10. Próximo passo sugerido

1. Ratificar: **Vue-first + core TS + controller agnóstico** (sem React, sem plugin registry).  
2. Atualizar `VISAO.md` §6 com essa decisão.  
3. Sessão seguinte: desenhar UI Vue da cifra (1 cifra) já respeitando o boundary.
