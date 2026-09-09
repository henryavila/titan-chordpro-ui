# Prompt — Telas · `titan-chordpro-ui` (view)

> Consome o Design System de `00-design-system.md` **por nome semântico** — nunca o redefina.  
> Se faltar algo no DS, **pare e sinalize**.

---

## Preâmbulo R9 (duas autoridades)

Há **duas autoridades distintas** neste briefing — não um carimbo único de "tudo vinculante":

- **Forma visual** (widget, cor, formato, espaçamento): é **sua** para decidir — não prescrevemos.
- **Filosofia / o que fica oculto / quem decide** (camada 3): **requisito de produto vinculante**, não negociável.
- **Comportamento de interação** (camada 2): é a **calibração** — a **banda comportamental vincula**, mas o **valor exato** (legado sda-v2 ou proposta) é **melhorável dentro da banda**, nunca um número congelado.

Consumimos o **Design System** pelo nome semântico e nunca o redefinimos.

---

## Contrato de “shell” / navegação (antes das telas)

Este produto **não** tem shell de aplicação.

| Classe de rota | Tratamento |
|---|---|
| **Viewer 1-cifra** | Superfície **focada / shell-less** — é a experiência inteira (standalone) ou o miolo embutido no host |
| Host SDA (multi-cifra, login, player) | **Fora do brief** |
| Demo “abrir arquivo” | **Fora desta rodada** (CP1: só a superfície da cifra + estados) |

**Grafo:** não há destinos laterais. Toda ação acontece **dentro** do viewer. Mobile e desktop usam o **mesmo sistema** (vocabulário/hierarquia), não necessariamente o mesmo arranjo.

**Nav ativa:** N/A (sem nav global).

---

## Ledger de cobertura (congelado CP2/CP3)

| Id | Existência | Notas |
|---|---|---|
| `viewer-1-cifra` | `[greenfield]` + testemunha legado sda-v2 `ChordproViewer.vue` | Única tela interativa |
| Estados: empty, loading, populated, error(export), fit-mode on/off, scroll on/off, transposed | especificar | offline/first-time: ver §7 |

---

# Tela: Viewer 1-cifra

## 1. Purpose

Permitir que o **músico** leia e use **uma** cifra no ensaio/ao vivo: ver letra+acordes com clareza, mudar o tom (se houver key), ajustar legibilidade, rolar automaticamente no ritmo, exportar, e **opcionalmente** ativar um modo que reflow/ajusta a cifra ao espaço do container — sempre podendo voltar ao layout padrão.

**Engine (fora da forma visual):** a entrada pode ser **ChordPro**, **OnSong** ou mista; o core normaliza para o mesmo modelo de leitura. A UI **não** expõe seletor/badge de formato — trata-se de uma única superfície de cifra. Detalhe: `docs/research-onsong-format.md`.

## 2. Visible information

Ver `02-fixtures.md` (conteúdo real). Em populated, a pessoa vê no mínimo:

- Meta da música quando existir (título; tom **exibido** se houver key; bpm/tempo se houver).
- Corpo da cifra: acordes alinhados à letra; comentários de ensaio preservados; tabs se existirem; linhas vazias como respiro.

**Regra de ancoragem e folga do acorde (R):** cada acorde começa na horizontal exata da sílaba a que pertence e reserva a própria largura mais uma folga mínima visível — nunca pinta sobre a letra nem encosta no acorde vizinho, inclusive dentro da mesma palavra; quando a largura do acorde excede a da sílaba, quem cede é o espaçamento das sílabas, nunca a folga. A unidade de quebra de linha é a **palavra**: a linha só quebra em espaço real do texto, e troca de acorde no meio da palavra nunca é ponto de quebra.

- Controles da cifra (não de app): tema; transpose (condicional); bias de tamanho; auto-scroll; **modo ajuste ao espaço**; export.

Texture: fixtures reais têm ~26–93 linhas, comments como `(INTRODUÇÃO…)`, `(BEM SUAVE)`, linhas de 28–94 chars, densidades ~2–5 segmentos/linha.

## 3. What the person needs to do

Intenções (atos-de-fala, sem copy literal obrigatória):

- Ler a cifra com conforto no device/container atual.
- Subir/descer o tom em semitons e voltar ao original (só se a cifra declara key).
- Preferir claro, escuro ou seguir o sistema.
- Ligar rolagem automática e afinar a velocidade ao ritmo real.
- Ligar/desligar o **modo ajuste ao espaço**.
- Puxar tipografia para maior/menor (enviesa a escala).
- Baixar CHO e/ou PDF da vista atual (tom exibido).

## 4. Interaction model

**Proveniência:** (b) legado sda-v2 onde marcado · (a) invariante de produto onde marcado · (greenfield) operador.

- **Cadência / esforço:** ações de ensaio são **gestos rápidos de uma mão** (polegar em tablet no stand); feedback **sub-segundo**. Paridade desktop: tão rápido **sem depender de mouse fino** (teclado quando fizer sentido).
- **Transpose (a + b):** um passo = **1 semitom**. Controles de tom **só existem quando a cifra tem key** (invariante confirmada). Reset aparece quando o offset ≠ 0 (legado). Reversível.
- **Tema (a):** claro / escuro / auto — decisão humana; `auto` segue preferência do ambiente.
- **Auto-scroll (a + b):**  
  - Velocidade **base automática** (prioridade legado: duração do conteúdo → BPM → default da ordem de dezenas de px/s).  
  - Humano **afina** enquanto rola (passos percetíveis; legado usava fator ~±15% com piso baixo — **calibração melhorável**).  
  - Para ao chegar ao fim; para e zera posição quando o conteúdo/tom muda (legado).  
  - Liga/desliga explícito.
- **Modo ajuste ao espaço (a — research + operador):**  
  - **Não é default.** Acionável; ida e volta a qualquer momento.  
  - No modo: **reflow** para aproveitar o container + **leve auto-size** a serviço do reflow.  
  - **Proibido multi-coluna** (ilegível para o músico).  
  - Fallback = layout padrão intacto → sem risco permanente de ilegibilidade.  
  - Comentários de ensaio / linhas instrumentais não devem ser “engolidos” de forma confusa.
- **Bias tipográfico (a):** maior/menor enviesa a escala; **não** travar em 4 classes nomeadas (conflitaria com auto-ajuste).
- **Export (b→melhorável):** CHO quase imediato; PDF com estado **ocupado** até terminar (legado async jsPDF). Falha deve ser **percebida** (legado só logava — redesign deve expor feedback de erro).
- **Densidade de navegação interna:** poucos destinos — todas as ações na mesma superfície; conjunto sempre alcançável sem “app nav”.

## 5. Philosophy / guardrails (vinculante)

| Decisão | Dono |
|---|---|
| Tom, tema, scroll on/off + afinação, modo ajuste on/off, bias tamanho, export | **Humano** |
| Parse, HTML da cifra, math da velocidade-base, layout do PDF, algoritmo de reflow **dentro** do modo ajuste | **Sistema** (oculto) |

**O que fica oculto:** detalhes do parser, fórmula exata de scroll, heurística interna de reflow/auto-size.

**Anti-padrões proibidos (R6):**

- Editor de acordes / drag-to-correct / fretboard.
- UI de multi-cifra ou shell de app (login, nav, player sync).
- **Multi-coluna** na cifra.
- Tornar o modo ajuste o **default silencioso**.
- Inventar cifras fake nos mocks (usar fixtures reais).
- Dashboard/métricas de uso na superfície da cifra.
- Oferecer transpose quando **não** há key.

## 6. Flow

1. Host (ou demo) entrega **uma** string ChordPro → viewer popula.  
2. Pessoa lê; opcionalmente muda tema / bias.  
3. Se há key: altera tom; cifra e tom exibido acompanham; reset volta.  
4. Opcional: liga auto-scroll; afina; para.  
5. Opcional: liga **modo ajuste**; avalia legibilidade; desliga se preferir padrão.  
6. Exporta CHO ou PDF (PDF mostra ocupado → sucesso ou erro).

## 7. States (ledger 6 estados)

| Estado | Tratamento |
|---|---|
| **empty** | Sem source / string vazia — mensagem de ausência + sem controles que exigem conteúdo (ou desabilitados). `parse('')` não explode (SPEC). |
| **loading** | Parser/render ainda não pronto (legado: spinner até ready). |
| **error** | Falha de export (obrigatório feedback). Parse inválido grave: se ocorrer, estado de erro legível — não tela em branco muda. |
| **offline** | Não aplicável (viewer local; sem rede obrigatória). |
| **first-time** | Não aplicável como onboarding de conta; opcional micro-descoberta do **modo ajuste** sem tutorial modal longo. |
| **populated** | Cifra legível + controles. Variantes: scroll on/off; fit-mode on/off; transposed; themes light/dark. |

Cada estado **especificado** em **mobile e desktop**, **claro e escuro**.

## 8. Constraints

- Uma mão / polegar no ensaio.  
- Instantâneo o suficiente para não perder o compasso.  
- Perdoa toque acidental (ações destrutivas mínimas; transpose/scroll/fit reversíveis).  
- Embed: não “vazar” UI para fora do frame do host.  
- Contraste AA; foco visível.

### Omission audit (R3)

Se omitíssemos: (1) “fit não é default”, (2) “sem colunas”, (3) “transpose só com key”, (4) “scroll base auto + afinação humana”, o agente tenderia a defaults errados (fit sempre on, colunas estilo OnSong, transpose sem key, só play/pause). **Por isso estão explícitos.**
