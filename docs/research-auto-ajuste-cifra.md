# Research — auto-ajuste da cifra ao container

> Objetivo: grounding para decidir a feature no CP3 do design-brief.  
> Pedido do operador: otimizar leitura do músico no espaço disponível (tela/container), sem inventar regras no chute.

---

## 1. Problema (nas suas palavras)

Se a cifra “gasta” poucas palavras por linha e sobra espaço no container, o viewer deveria **aproveitar a largura/altura** — caber mais conteúdo na vista — até um limite que **não prejudique** a leitura no ensaio (tablet no stand, mãos ocupadas).

Isso **não** é a mesma coisa que “4 tamanhos de fonte Tailwind” do sda-v2 legado.

---

## 2. O que o mercado faz (evidência)

Três estratégias distintas aparecem nos produtos de music-stand:

### Estratégia α — **Auto-size tipográfico** (maior fonte sem quebrar linha)

| Produto | Comportamento |
|---|---|
| **MobileSheets** | “Auto-Size Font”: calcula a **maior fonte** tal que a **linha mais longa** caiba na largura **sem wrap**. Teto configurável (default max ~30). |
| Falha conhecida | Uma única linha longa **força** fonte pequena e sobra altura vazia (fórum MobileSheets: long outliers). |

**Essência:** maximiza legibilidade **por glifo**; **não** muda a estrutura das linhas do ChordPro.

### Estratégia β — **Multi-coluna** (mesmo conteúdo, menos scroll vertical)

| Produto | Comportamento |
|---|---|
| **Chord Chart Studio** | Screen view: `Columns` + `Font size`; objetivo explícito: *fit screen, avoid scroll while playing*. Opções de screen ≠ print. |
| **OnSong** | Two Column View — preenche “white space” lateral; menos scroll no ensaio. |
| **Songlib / WorshipTools / Chordastic / smartChord** | 2+ colunas para caber mais música na viewport/página. |
| **smartChord** | 1–4 colunas; *intelligent line breaks* **desligam** em multi-coluna (tradeoff documentado). |

**Essência:** reordena o fluxo em **colunas de seções/linhas**; tipografia pode ficar grande; risco: ordem de leitura L→R por coluna vs topo→baixo contínuo.

### Estratégia γ — **Reflow / densificar linhas** (juntar mais unidades por linha)

| Produto / padrão | Comportamento |
|---|---|
| **Guitar Scribble** | “Lines reflow to fit any screen” (chord-over-lyric responsivo). |
| **CSS flex wrap** (SO / demos) | Unidades `acorde+sílaba` embrulham conforme largura. |
| **smartChord editor** | “Merge short lines into longer lines” / optimize line length — sobretudo para modo colunas. |

**Essência:** muda **onde** a linha quebra; aproxima o que você descreveu (“mais itens por linha se houver espaço”).

Risco: acordes “andam” visualmente em relação ao ensaio mental do músico se o reflow for agressivo demais; comentários `{c:…}` e linhas instrumentais `[G]x///` precisam de regras próprias.

---

## 3. Texture das **nossas** fixtures (rung 1, in-repo)

Medido em `fixtures/*.cho` (linhas com `[acorde]`):

| Fixture | Linhas c/ acorde | Len linha min/avg/max | Segmentos/linha avg (máx) |
|---|---|---|---|
| jesus-1 / jesus-2 | 28 | 28 / 39 / **65** | ~4 (máx 8) |
| entrega-1 / 3 | 28 | 33 / 47 / **76–77** | ~4 (máx 9) |
| entrega-2 | 15 | 33 / 47 / **76** | ~4 (máx 9) |

Leitura: as cifras reais **já são densas** (~4 segmentos/linha, outliers ~65–77 chars). Em viewport estreita (phone) quase não “sobra” largura; em **tablet landscape / desktop embed largo** sobra espaço — aí α (fonte) e/ou β (colunas) ganham mais que “juntar ainda mais sílabas” (γ), que tem teto baixo nestas fixtures.

Comentários de ensaio (`INTRODUÇÃO`, `BEM SUAVE`) são linhas curtas — densificar γ **não** deve colá-las em letras.

---

## 4. Conflito com “passos de fonte” do legado

sda-v2: `FONT_SIZES = text-sm…text-xl` (4 degraus fixos) + `max-height: calc(100vh - 220px)` + scroll.

- Isso **não** resolve “aproveitar o container”.
- Uma escada fixa **compete** com auto-size (α): o algoritmo precisa de **continuum** (ou muitos degraus), e o humano deve **enviesar** o alvo (maior/menor), não escolher uma classe CSS nomeada.
- Auto-scroll continua relevante quando a música **não** cabe mesmo densificada — feature ortogonal.

---

## 5. Opções de produto (para decidir)

| ID | O que o sistema faz | Humano controla | Complexidade | Fit às fixtures IASD |
|---|---|---|---|---|
| **A0** | Nada (só scroll + fonte manual) | Fonte + scroll | Baixa | Status quo sda-v2 |
| **A1** | **α Auto-size** até caber largura (com piso/teto de legibilidade) | Bias maior/menor; opcional wrap on/off | Média | Forte em phone; em desktop largo sobe fonte até teto |
| **A2** | **β Colunas** quando altura estoura e largura sobra (1→2, talvez 3) | Liga/desliga ou “auto colunas”; bias | Média–alta | Forte em tablet/desktop ensaio |
| **A3** | **γ Reflow** juntando unidades na linha | Bias denser/sparser + teto | Alta | **Ganho limitado** nestas fixtures (já densas); risco de legibilidade |
| **A1+A2** | Auto-size **e** colunas (ordem: primeiro α; se ainda scroll demais → β) | Bias tamanho; auto-colunas on/off | Alta | Melhor cobertura phone→desktop |
| **A1+A2+A3** | Tudo | Muitos knobs | Muito alta | Overkill v0 |

---

## 6. Riscos / anti-padrões (pesquisa)

1. **Outlier de linha longa** (α): uma linha de 77 chars dita a fonte de **toda** a cifra → resto “miúdo” + altura ociosa. Mitigação vista no mercado: permitir wrap **ou** quebrar outliers sem punir o resto (MobileSheets users pedem isso).
2. **Colunas sem quebra por seção** (β): verso partido no meio da coluna. Chord Chart Studio: “column break on section”.
3. **γ agressivo**: músico perde o “mapa” mental da linha. Preferir **não** fundir linhas de letra distintas do source; no máximo wrap visual de unidades já na mesma linha lógica.
4. **PDF ≠ screen**: Screen pode ser multi-coluna; PDF A4 fica em contrato print (1 coluna densa) — padrão CCS (settings por modo).

---

## 7. Decisão de produto (ratificada pelo operador — 2026-08-28)

| Item | Decisão |
|---|---|
| **Colunas (A2)** | **Jamais.** Legibilidade para o músico é péssima. |
| **Modo de ajuste** | **Reflow (A3)** como eixo, com **um pouco de auto-size (A1)** a serviço do reflow. |
| **Default** | Layout **normal** (estrutura de linhas do source / leitura clássica) — **não** o modo ajustado. |
| **Ativação** | **Opt-in explícito:** o músico **aciona** na UI e pode **voltar** quando quiser. |
| **Fallback** | Sempre disponível → **zero risco permanente de ilegibilidade**. |

### Implicações

1. Dois modos de visualização da mesma cifra: **Leitura padrão** ↔ **Ajuste ao espaço** (nome visual = design agent).
2. O algoritmo de reflow/auto-size só roda no modo ajustado; no padrão, tipografia segue bias manual simples (maior/menor) sem densificar linhas.
3. Comentários de ensaio e linhas instrumentais não devem ser “engolidos” pelo reflow de forma confusa.
4. PDF/print continua no contrato print (independente do modo de tela).
5. Auto-scroll permanece ortogonal (base automática; humano afina ritmo).

---

## 8. O que isso implica no design-brief (camada 2/3, sem forma visual)

- **Camada 2:** “há um **modo acionável** (não default) em que a cifra **reflow** para aproveitar o container, com ajuste tipográfico leve; o músico entra e sai desse modo a qualquer momento; o fallback é a leitura padrão intacta.”
- **Camada 3:** humano liga/desliga o modo e bias de tamanho; sistema só calcula o reflow **dentro** do modo. **Proibido:** multi-coluna; tornar o modo ajustado o default silencioso.
- **Camada 1:** silêncio total sobre forma do controle.

---

## 9. Fontes

- MobileSheets docs/fórum: Auto-Size Font, max auto font, wrap, outlier lines  
- Chord Chart Studio docs: Screen view, Columns, Font size, column break on section  
- OnSong: Two Column View (ensaio, menos scroll)  
- Songlib / WorshipTools / Chordastic / smartChord: multi-column music stand  
- Guitar Scribble / CSS chord-letter flex: reflow responsivo  
- Medição local: `fixtures/*.cho` (2026-08-28)

---

## 10. Decisão pedida (CP3 / este gate)

Escolher uma linha:

- **R1:** A1+A2 (recomendado)  
- **R2:** só A1  
- **R3:** só A2  
- **R4:** A0 (sem auto-ajuste neste brief; feature depois)  
- **R5:** incluir A3 também (contra a recomendação)
