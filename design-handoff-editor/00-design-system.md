# Prompt — Design System · editor (`titan-chordpro-ui`)

> **Idioma:** pt-BR  
> **Produto:** UI 1-cifra — **view-only** e **edit** (SDA: página pública vs autenticada).  
> **Herança:** estenda o DS de `design-handoff/00-design-system.md`. Não reinvente tokens de leitura; acrescente edit / óculos / mídia.  
> Se o DS do viewer já existir no design agent, **estenda** o mesmo sistema.

---

## Preâmbulo (vinculante)

Tokens e componentes **por nome semântico**; forma visual é sua. Overlays **contíveis no frame** da cifra (embed).  
Dois contextos de produto (view-only vs edit) compartilham o **mesmo** DS — muda o que está ativo, não o vocabulário.

---

## 1. Tokens — herdar + acrescentar

**Herdar:** `surface/*`, `text/primary|muted|chord`, `action/*`, claro/escuro, tipografia acorde vs letra vs comentário vs meta, densidade de leitura.

**Acrescentar:**

| Papel | Intenção |
|---|---|
| `text/editable` | Conteúdo sob edição |
| `text/degree` | Grau Nashville (quando óculos Nashville ativo) |
| `state/dirty` | Mudanças locais ≠ source do host |
| `state/edit-active` | Modo edit distinto de view-only (**não só cor**) |
| `surface/source-pane` | Painel source ChordPro |
| `surface/edit-chrome` | Chrome contextual de edição (não nav de app) |
| `surface/secondary-tools` | Camada de ferramentas secundárias (Nashville, filtro comments, …) — sempre alcançável, **não** competir com controles principais |
| `media/score-snippet` | Imagem de partitura/solo embutida no fluxo da cifra |

---

## 2. Inventário de componentes

Herdar do viewer: `viewer/frame`, `viewer/chart`, `viewer/meta`, controles de leitura (tema, transpose se key, scroll, fit opt-in, type-bias, export), feedback empty/busy/error.

### Primários (edit / diferencial)

| Papel | Para quê |
|---|---|
| `control/mode` | Contexto edit vs view-only (host também define) |
| `edit/inplace-chord` | Acorde editável / arrastável na projeção |
| `edit/inplace-lyric` | Letra/sílaba editável |
| `edit/block` | Bloco arrastável (seção, comment, tab, imagem…) |
| `edit/meta-fields` | Título / key / meta |
| `edit/source-pane` | Source ChordPro assistido + sync com preview |
| `edit/copy-chords` | Copiar harmonia de um bloco → outro (verso→verso) |
| `edit/section-transpose` | Transpor **só** a seção selecionada |
| `edit/tab` | Ferramentas práticas de TAB (não suite completa) |
| `edit/insert-image` | Inserir ref de partitura/solo (host storage) |
| `edit/dirty-indicator` | Dirty perceptível |
| `edit/undo` | Undo na stack de source |

### Óculos de leitura (mutuamente exclusivos entre si)

| Papel | Para quê |
|---|---|
| `lens/concert-capo` | Dual: concert vs capoed shapes — **problema de banda** |
| `lens/nashville` | Mostrar graus (`1 4 5 6m`) em vez de nomes |

**Regra de produto (vinculante):** `lens/concert-capo` e `lens/nashville` são **excludentes**. Ativar um desativa o outro. Não empilhar “graus + capo”.

### Secundários (sempre disponíveis; **fora** do acesso rápido principal)

Mesmo nível de prioridade entre si — cabem em `surface/secondary-tools` (ou equivalente que você inventar):

| Papel | Para quê |
|---|---|
| Acesso a `lens/nashville` | Toggle óculos graus |
| Acesso a `lens/concert-capo` | Toggle óculos capo/concert (quando não Nashville) |
| `view/comments-filter` | Show/hide comments de ensaio no view |

Estados mínimos: default, hover, focus, active, disabled, error, selected.

**Não incluir:** shell, multicifra, login, player, collab, fretboard, seletor OnSong/ChordPro, simplify/freeloader, multi-coluna, gen.

---

## 3. Um template base

**Um** template: cifra 1-string exercitando:

1. **View-only** — leitura limpa (+ óculos secundários + filtro comments)  
2. **Edit** — WYSIWYG + source assistido + imagem + TAB prático + copy-chords + section transpose  

Mesmo sistema; contextos distintos, não dois produtos.

---

## 4. Acessibilidade (WCAG 2.2)

AA; foco visível; alvos ≥ 24×24; nada só por cor (edit ativo, dirty, óculos ativo, comments ocultos).  
WYSIWYG: arrastar acorde/bloco utilizável com polegar no tablet; source pane pode priorizar desktop sem excluir mobile.

---

## 5. Coerência

O DS **não** deve sugerir: IDE com tudo aberto no view-only; Nashville + capo juntos; simplify; chrome de app; source como default no ensaio público.
