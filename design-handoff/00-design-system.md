# Prompt — Design System · `titan-chordpro-ui` (view)

> **Idioma:** pt-BR  
> **Produto:** viewer/player de **1 cifra** ChordPro (standalone ou embutido).  
> **SoT:** `docs/VISAO.md` · stack Vue-first + core TS · sem shell de app.

---

## Preâmbulo (vinculante)

Construa um **Design System** que herdaremos sem alteração em todas as telas. Defina tokens e componentes **uma vez, por nome semântico**; o prompt de telas os referencia e **não** redefine cor, tipografia, espaçamento, raio, sombra nem componentes. Onde houver requisito abaixo, é **constraint mensurável**, nunca solução visual — a forma é sua.

**Contexto de embedding:** a UI vive dentro de um **frame de app** (host) **ou** de um demo mínimo. Overlays/folhas devem ser **contíveis no frame do viewer**, não fixas na viewport do browser do host.

---

## 1. Contrato de tokens (semântico, sem literais)

Nomeie por **papel/intenção**, não por valor — ex.: `surface/canvas`, `surface/raised`, `text/primary`, `text/muted`, `text/chord`, `action/primary`, `action/subtle`, `state/danger`, `state/busy`, `space/inset-sm`, `space/stack-md`, `motion/quick`, `motion/settle`.

Cobrir obrigatoriamente:

- Cores / superfícies em **claro e escuro** (o produto tem tema claro / escuro / auto).
- Escala tipográfica (incluir papel distinto para **acorde** vs **letra** vs **comentário de ensaio** vs **meta** título/tom).
- Escala de espaçamento, raios, elevação, durações de movimento.
- Tokens de **leitura musical** (densidade de linha no modo padrão vs modo ajuste) — semânticos, sem px.

**Separação perceptual:** o **tom exibido** (quando há key) e o estado **auto-scroll ativo** precisam ser distinguíveis do resto dos controles **sem depender só de cor** (forma/posição/rótulo também).

---

## 2. Inventário de componentes (com estados)

Derivado dos **verbos do produto** (ler, transpor, ajustar leitura, rolar, exportar, tema) — não do shell SDA.

Para cada um, defina estados: default, hover, focus, active, disabled, loading, error, empty, selected (quando couber).

Inventário mínimo (nomes semânticos — **você** escolhe a forma):

| Papel semântico | Para quê |
|---|---|
| `viewer/frame` | Contêiner da experiência 1-cifra (controles + área de leitura) |
| `viewer/controls` | Conjunto de ações do músico na cifra (não é nav de app) |
| `control/transpose` | Baixar / subir tom + reset (só quando há key) |
| `control/theme` | Claro / escuro / auto |
| `control/scroll` | Liga/desliga auto-rolagem + afinação de velocidade |
| `control/fit-mode` | Liga/desliga **modo ajuste ao espaço** (opt-in; default off) |
| `control/type-bias` | Maior / menor (enviesa escala; não escada fixa de classes) |
| `control/export` | Exportar CHO e PDF (pode ser um agrupador) |
| `viewer/chart` | Superfície de leitura da cifra (acorde sobre letra, comments, tabs) |
| `viewer/meta` | Título / tom exibido / bpm quando existirem |
| `feedback/busy` | Export PDF em andamento |
| `feedback/empty` | Sem fonte ChordPro |
| `feedback/error` | Falha de export (ou parse, se exposto) |

**Não incluir:** seletor multi-cifra, login, nav de app, player de áudio, editor de acordes, fretboard, dashboard/métricas, layout multi-coluna da cifra.

---

## 3. Exatamente 1 template base

Produza **um** template composto: o **viewer 1-cifra** completo (controles + área de leitura + meta), exercitando tokens claro/escuro e os componentes acima.  
Isso é o ponto de fork das telas — não um catálogo de page types.

Lembre: a superfície é **shell-less** (sem chrome de aplicação); o template é o próprio viewer.

---

## 4. Acessibilidade (WCAG 2.2 — mensurável)

- Contraste texto/fundo AA (≥ 4,5:1 corpo; ≥ 3:1 texto grande).
- Foco sempre visível (focus-appearance 2.2).
- Alvos de toque ≥ 24×24 CSS px (ou espaçamento equivalente) — ensaio com polegar.
- Nenhum estado só por cor (scroll ativo, tom alterado, modo ajuste ligado).

---

## 5. Coerência com decisões de produto

O DS **não** deve reintroduzir:

- multi-coluna de cifra,
- modo ajuste como default silencioso,
- shell/toolbar de aplicação,
- edição de acordes / fret / métricas.

O modo **ajuste ao espaço** é um **estado explícito** do `control/fit-mode` + `viewer/chart`, com fallback imediato ao layout padrão.
