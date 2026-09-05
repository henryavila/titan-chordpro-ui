# Análise — passo grande demais? Vue-first vs multi-stack vs plugável

> Complementa [`research-stack.md`](./research-stack.md) e [`VISAO.md`](./VISAO.md).  
> Gatilho: uso principal = **sda-v2**; reuso comunidade é desejo, não obrigação do dia 1.

---

## 1. Resposta curta

**Sim — React + multi-camadas + ports agora é um passo grande demais** para o problema atual.

O caminho com melhor razão custo/benefício:

1. **Hoje:** Vue (sua stack) + **core TypeScript puro** (parse/transpose/PDF helpers/filenames/scroll math) — UI completa da cifra em Vue.
2. **Amanhã (se alguém pedir React):** port da UI **ou** thin wrapper — só quando houver demanda concreta.
3. **“Plugável”:** no máximo um **contrato estável** (ViewModel + HTML/CSS hooks + eventos), não um framework de plugins no v0.1.

Isso entrega valor no sda-v2 já, preserva reuso (core + contrato), e evita arquitetura especulativa.

---

## 2. O que você está otimizando (dois objetivos diferentes)

| Objetivo | Quando importa | Stack “ótima” |
|---|---|---|
| **A. Cortar/melhorar cifra no sda-v2** | Agora | **Vue** |
| **B. Pacote comunidade multi-framework** | Depois (downloads, issues, 2º host) | Core estável + ports *sob demanda* |

Misturar A e B no dia 1 costuma gerar: abstração prematura, DX pior, e atraso no consumer que realmente existe (Nuxt 4 + `ChordproViewer.vue` ~536 LOC).

Reuso “por mim” **não exige** React: um pacote Vue + CLI + core TS já serve Titan (Python gera `.cho`; preview pode ser página Vue mínima ou HTML gerado pelo core).

Reuso “pela comunidade” **não exige** multi-stack no lançamento: a maioria dos pacotes open-source nasce em **uma** stack e ganha adapters quando o tráfego aparece.

---

## 3. Três estratégias sob a lupa

### Estratégia 1 — Tudo em Vue (UI + app) + core TS opcional

```
┌─────────────────────────────┐
│  titan-chordpro-ui/vue      │  ← UI completa (controles + RAF + temas)
│  (SFC / composables)        │
├─────────────────────────────┤
│  titan-chordpro-ui (core)   │  ← parse, transpose, filenames, scroll math, pdf
└─────────────────────────────┘
        ↑ sda-v2 importa
        ↑ demo Vite/Nuxt standalone
```

| Prós | Contras |
|---|---|
| Alinha com sua stack favorita e com sda-v2 | Host React/vanilla não embute “nativo” no dia 1 |
| Menor time-to-done; menos conceitos novos (Lit/r2wc) | Comunidade React precisa portar ou montar Vue |
| Pode extrair o viewer atual do sda-v2 com pouca tradução | “Framework-agnostic” fica só no **core**, não na UI |
| Core TS ainda é reutilizável (CLI, testes, Titan smoke) | — |

**Risco de ficar preso?** Baixo, **se** o core e o HTML/CSS da cifra forem limpos (ViewModel estável). A UI Vue vira a implementação de referência; um port React copia contra o contrato, não contra o SFC.

---

### Estratégia 2 — React + multi-camadas “para a comunidade”

```
standalone React → UI React → (r2wc?) → CE → sda-v2 Vue
```

| Prós | Contras |
|---|---|
| Narrativa npm “moderno / React” | sda-v2 **paga React** num app Vue |
| Um dia facilita ports | Você desenvolve fora da stack favorita **e** do consumer principal |
| | Multi-camada = mais entries, CI, docs, bugs de bridge |

**Veredito:** otimiza o público hipotético; **piora** o caminho crítico (você + sda-v2).

---

### Estratégia 3 — Viewer “plugável” (várias implementações visuais)

Duas leituras:

#### 3a. Plugável de verdade (plugin API)

```
core → VisualAdapter { render, mountControls, destroy }
       ├── VueVisual
       ├── ReactVisual
       └── …
```

| Prós | Contras |
|---|---|
| Ideia elegante no papel | **YAGNI extremo** no v0.1 — você vira mantenedor de framework |
| | Sem segundo adapter, a API é especulação |
| | Contratos de lifecycle/temas/a11y explodem cedo |

#### 3b. Plugável “pobre” (o que realmente basta)

Não é um plugin system. É um **contrato**:

| Camada | Estável | Troca-se |
|---|---|---|
| `ChordProView` (JSON) | sim | raramente |
| HTML da cifra + classes/`data-*` + CSS vars | sim | temas |
| Controles (toolbar da cifra) | implementação | Vue agora; React depois se precisar |
| Host (multi-cifra, shell) | fora | sda-v2 |

Isso **já** permite ports sem inventar `VisualAdapter` no dia 1.

---

## 4. Analogia útil (comunidade real)

Padrão comum em libs open-source:

1. **Core** framework-agnostic.
2. **Binding oficial** na stack do autor (`@scope/vue`).
3. Ports (`react`, `svelte`) **quando** issues/PRs pedem — ou a comunidade faz o port.

Exemplos de mentalidade (não clone a API): Headless UI / Chart libs / editores — core + wrappers, wrappers sob demanda.

Construir Vue + React + CE + plugin registry **antes** do primeiro release é o anti-padrão.

---

## 5. O que fazer com a VISAO (não jogar fora)

A VISAO continua válida:

- UI **completa** da cifra (transpose, rolagem, temas, export) — isso pode ser **Vue**.
- Consumer só shell + multi-cifra — sda-v2.
- Standalone — app Vue mínimo **neste** repo (não precisa ser React).

O que muda vs research “preferido Lit/CE”:

| Antes (research) | Agora (pragmatismo) |
|---|---|
| Lit CE para embed universal | **Vue** porque o embed #1 é Nuxt e é sua stack |
| Multi-framework day-1 | **Contrato + um binding** |
| React+r2wc como opção | Adiado até demanda |

Lit/CE continua ótimo **se** o objetivo #1 fosse widget drop-in em HTML aleatório. Com sda-v2 como âncora, Vue vence.

---

## 6. Custo de “alguém implementar um port React depois”

Se o core + HTML da cifra forem limpos:

| Trabalho do port | Estimativa relativa |
|---|---|
| Reusar `parse/transpose/pdf/filenames` | ~0 (import npm) |
| Reimplementar controles + RAF em React | médio (semanas, não meses) |
| Temas CSS | baixo (mesmos tokens) |
| Reescrever parser/HTML do zero | **evitar** — por isso o core importa |

Sem core limpo, o port vira fork. **Investimento certo agora = core + contrato HTML**, não = segunda UI.

---

## 7. Riscos se escolher só Vue sem disciplina

1. Lógica de transpose/PDF/filenames presa em SFC → port impossível → volta ao problema do SDA.
2. HTML acoplado a classes do Nuxt UI → tema não portável.
3. “Pacote” que só funciona dentro do monorepo sda-v2 → não é produto.

**Mitigação mínima (ainda Vue-first):**

- Pasta/`package` **core** sem Vue.
- UI Vue só monta ViewModel + emite eventos (`transpose`, `export`, `theme-change`).
- CSS da cifra com prefixo/`cpv` + CSS variables (como o SPEC legado já esboçava).
- Demo standalone no repo (prova que não depende do shell SDA).

---

## 8. Recomendação para ratificar

**Decisão proposta:**

> **Vue-first + core TypeScript.** Sem React, sem Lit, sem plugin registry no v0.1.  
> Reuso comunidade = publicar core + `@…/vue`. Ports = depois.  
> “Plugável” = contrato ViewModel/HTML/eventos, não multi-implementação visual.

**Não fazer agora:** React+r2wc, dual UI, VisualAdapter genérico.

**Fazer em seguida:** desenhar UI da cifra em Vue (1 cifra, fixtures reais) + esboçar boundary core/UI.

---

## 9. Pergunta de fechamento

Ratificar uma destas:

1. **Vue-first + core TS** (recomendado aqui).  
2. Ainda quero **Lit/CE** (priorizei embed HTML universal).  
3. Ainda quero **React** (aceito atrito no sda-v2).  
4. Quero só **Vue monolito** sem core separado (mais rápido, pior para port futuro).
