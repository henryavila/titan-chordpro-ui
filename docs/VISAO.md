# Visão do produto — `chordpro-viewer`

> **Fonte de verdade de produto:** esta entrevista (2026-08-28), ratificada pelo usuário.  
> **`SPEC.md`:** rascunho técnico legado (contrato de lib headless v0.1). Útil como inventário de comportamentos (parse, transpose, filenames, scroll math, fixtures), **não** como definição do produto.  
> **Próxima sessão:** desenhar a UI (1 cifra) — sem implementar consumers.

---

## 1. Entrevista (espinha ratificada)

| Campo | Decisão |
|---|---|
| **Problema** | Músicos precisam de um **viewer/player ChordPro profissional**: ler, transpor, rolar, exportar e trocar tema — com visual elegante. Reuso em SDA/Titan é **canal de distribuição**, não o problema. |
| **In-scope** | Camada **autossuficiente** de **1 cifra**: recebe ChordPro bruto → UI completa e funcional; roda **standalone** ou **embutida** em apps web. |
| **Out-of-scope** | Edição de acordes; diagramas de braço; multi-cifra; shell de app (login, nav, player áudio sync); geração áudio→ChordPro (Titan). |
| **Done-when (esta fase)** | Doc de visão ratificado: produto, fronteiras, temas, non-goals, opções de stack. |
| **Stakes (caros de reverter)** | (1) Formato de embed (Web Component vs React vs Vue). (2) Contrato ViewModel / HTML da cifra. |
| **Fontes** | Esta entrevista; `fixtures/` (cifras reais IASD Ermelinda); `SPEC.md` só como catálogo técnico legado; README atual descreve o modelo antigo. |

---

## 2. O que é este projeto

**chordpro-viewer** é um **viewer/player de uma cifra ChordPro**:

- Entrada: arquivo/texto `.cho` / `.chordpro` (ou string).
- Saída: superfície visual profissional + PDF + export de texto.
- Modos: **app standalone** (sem shell de produto) **e** **componente embutível** em outros projetos web.
- O consumer (ex.: SDA) só fornece **shell**, **qual cifra** está ativa (multi-cifra), e eventualmente player/login — **não** reimplementa a experiência do músico na cifra.

```
ChordPro (1 string)
    → chordpro-viewer (UI completa da cifra)
    → [opcional] host embute no app (shell / multi-cifra / áudio)
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
| Edição / fret diagrams | ❌ (futuro) | — |

**Leitura da entrevista:** “sem toolbar/shell de **app**” ≠ “sem controles da cifra”. Controles do **músico na cifra** (tom, rolagem, fonte, tema, export) são **nossos**. Chrome do **produto** (menu, lista de músicas, auth) é do consumer.

---

## 4. Funcionalidades da UI (visão v0 — 1 cifra)

Entregar **tudo que o músico precisa numa cifra**, sem edição:

1. **Leitura** elegante (acorde acima da letra, comentários de ensaio preservados, espaçamento).
2. **Transposição** (semitons; reset ao original).
3. **Tamanho de fonte** (passos documentados).
4. **Export** `.cho` e PDF (nomes estáveis; PDF com tom exibido).
5. **Auto-rolagem** com ajuste de velocidade (ensaio de pé).
6. **Temas:** claro e escuro, com opção de **troca automática** (preferência do sistema / toggle).

**Fixtures obrigatórias:** cifras reais em `fixtures/` — não inventar charts para demos/snapshots.

---

## 5. Temas (visão de produto)

| Tema | Papel |
|---|---|
| **Claro** | Leitura diurna / ensaio padrão |
| **Escuro** | Palco / baixa luz |
| **Auto** | Segue `prefers-color-scheme` (ou política equivalente) |

Nota vs SPEC legado: SPEC falava `default` / `print` / `stage`. Na visão de produto, **claro + escuro (+ auto)** são o eixo visual; **print** continua conceito útil para PDF/impressão (pode ser derivado do claro denso, não necessariamente um 3º “look” de tela).

---

## 6. Stack — direção pragmática (pendente ratificação formal)

Análises: [`research-stack.md`](./research-stack.md) · [`analysis-stack-pragmatismo.md`](./analysis-stack-pragmatismo.md) · [`analysis-expansao-futura.md`](./analysis-expansao-futura.md).

**Proposta atual (contrapondo acolhido):**

- **Hoje:** Vue-first (stack favorita + sda-v2) para a UI completa da cifra.
- **Expansão:** **não** fork e **não** plugin runtime multi-stack no v0.1.
- **Facilitar já:** core TypeScript sem Vue + controller agnóstico (`getState/subscribe/dispatch`) + HTML/CSS contrato → bindings (`/vue` agora; `/react` depois sob demanda).
- Padrão industrial: TipTap / Zag — core + packages por framework.

**Constraint `AGENTS.md` (“No Vue in `src/`”):** reinterpretar como **no Vue in core**; UI Vue vive em `src/vue` ou pacote `@…/vue`.

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
| **titan-chordpro-lib** | Gera ChordPro a partir de áudio — **fora**. Pode **consumir** o viewer para preview. |
| **Virtual SDA (Nuxt)** | Host: shell, multi-cifra, sanitize, i18n, player. Embute o viewer. |
| **Este repo** | Viewer/player 1-cifra + (futuro) artefatos de embed. |

---

## 9. Open questions (próxima sessão)

1. **Stack final** (A/B/C/D) e forma de embed no SDA.
2. Controles da cifra: barra embutida no miolo vs chrome mínimo fixo (ainda “não-shell”).
3. PDF: jsPDF vs print-CSS (SPEC sugeria jsPDF por parity SDA).
4. Nome npm / escopo do pacote.
5. Atualizar ou arquivar `SPEC.md` / `AGENTS.md` após a stack (evitar dois SoT).

---

## 10. Handoff — próxima sessão (desenhar UI)

**Objetivo da sessão:** desenhar a UI do **chordpro-viewer** (1 cifra), com cifras reais de `fixtures/`.

**Entrar com:**

- Este `docs/VISAO.md` como brief de produto.
- Decisão de stack (ou shortlist A vs C vs D).
- Inventário de controles: tom, fonte, rolagem, tema claro/escuro/auto, export CHO/PDF.
- Non-goals: sem multi-cifra, sem shell, sem edição, sem áudio sync.

**Não entrar com:** implementação SDA; inventar fixtures; tratar SPEC §3 como lei de UI.

---

## 11. Self-check

- Entrevista ratificada: sim (ajuste do problema → viewer para o músico; SDA/Titan = canal).
- Stack: aberta, tradeoffs registrados.
- SPEC legado: rebaixado a inventário técnico, não SoT.
- Artefato para outra sessão: este arquivo.
