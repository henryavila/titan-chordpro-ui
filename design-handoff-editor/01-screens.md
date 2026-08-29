# Prompt — Telas · editor (`view-only` \| `edit`)

> Consome `00-design-system.md` por **nome semântico** — nunca redefina.  
> Se faltar algo no DS, **pare e sinalize**.  
> View limpa herda espírito de `design-handoff/01-screens.md` — não contradizer leitura sagrada.

---

## Preâmbulo R9 (duas autoridades)

Há **duas autoridades distintas**:

- **Forma visual:** sua para decidir.  
- **Filosofia / quem decide (camada 3):** vinculante.  
- **Comportamento (camada 2):** banda vincula; valor exato melhorável dentro da banda.

---

## Contrato de shell / navegação

**Sem** shell de aplicação.

| Classe | Tratamento |
|---|---|
| **Cifra 1-string** | Superfície focada / shell-less — demo standalone ou miolo no host |
| **SDA página pública** | Embute UI em **view-only** |
| **SDA página autenticada + permissão** | Embute UI em **edit** |
| Host (login, multicifra, player, file picker de mídia) | **Fora** — host manda `source` / mode / permissão; recebe source + dirty + media callbacks |

**Grafo:** sem destinos de app. Tudo na cifra. Mobile e desktop = mesmo sistema.

---

## Ledger de cobertura

| Id | Existência | Notas |
|---|---|---|
| `cifra-view-only` | Contexto SDA público | Leitura + óculos secundários + filtro comments |
| `cifra-edit` | Contexto SDA autenticado | WYSIWYG MUST + source assistido + imagem + TAB + copy-chords + section transpose |
| Estados | empty, loading, populated, error, dirty, óculos capo\|nashville, comments hidden, tab, image | Mobile + desktop; claro + escuro |

---

# Tela: Cifra 1-string

## 1. Purpose

Permitir **ler** e **editar** uma cifra ChordPro na mesma UI package:

- **View-only:** músico / visitante lê com clareza (tema, transpose se key, scroll, fit opt-in, export) e pode usar ferramentas **secundárias** (óculos, filtro comments).  
- **Edit:** autor autenticado **corrige e cria** com **WYSIWYG** (diferencial) e/ou source ChordPro assistido; insere partitura/solo por **imagem**; edita TAB quando houver; copia harmonia entre blocos; pode transpor só uma seção.

**Engine (fora da forma):** ChordPro ou OnSong na entrada; em edit, convert-on-edit → ChordPro canônico. UI **sem** seletor de formato.

## 2. Visible information

Ver `02-fixtures.md`.

**Sempre (populated):** meta; corpo (acordes+letra); comments de ensaio; tabs se existirem; **imagens de partitura/solo** no fluxo quando a música tiver.

**View-only:** controles de leitura do viewer; **não** chrome de edição. Ferramentas secundárias alcançáveis sem poluir o principal.

**Edit:** sinal de modo edit + dirty; alvos WYSIWYG (acorde, letra, blocos); meta; source pane sob demanda; insert image; TAB prático; copy-chords; section transpose.  
Ao entrar em edit: **fit off** + **transpose global reset** (não editar projeção reflow/transposta).

## 3. What the person needs to do

### View-only
- Ler; tema; transpose (se key); scroll; fit opt-in; export.  
- (Secundário) Ligar óculos **capo/concert** **ou** **Nashville** (exclusivos).  
- (Secundário) Ocultar/mostrar comments de ensaio.

### Edit
- Arrastar / reposicionar **acorde** sobre a letra.  
- Arrastar / reordenar **blocos** (seção, comment, tab, imagem…).  
- Editar letra e meta no lugar.  
- Abrir source ChordPro com assistência (inserir diretivas, validar) — não só textarea burra.  
- **Copiar acordes** de um verso/bloco para outro.  
- **Transpor só a seção** selecionada.  
- Inserir **imagem** de partitura/solo (host escolhe arquivo → ref no source).  
- Editar **TAB** com ferramentas práticas quando a cifra tiver tab.  
- Perceber dirty; undo; voltar a view-only sem IDE residual.

## 4. Interaction model

**Proveniência:** (a) decisão de produto 2026-08-29 · (b) herança viewer · (c) design Source-SoT.

- **Dois contextos (a):** view-only vs edit — definidos pelo host/SDA (público vs autenticado+permissão), não por “prefs” soltas.  
- **WYSIWYG (a — MUST):** gesto primário no edit = visual (arrastar acorde, arrastar blocos). Source = caminho paralelo assistido, sob demanda.  
- **Cadência:** ensaio view-only = gestos rápidos uma mão; edit WYSIWYG = ainda thumb-friendly; source = mais deliberado (desktop-friendly).  
- **Ao entrar em edit (c):** fit/reflow off; transposeSemitones → 0; patches só no source original.  
- **Commit in-place:** blur/Enter (ou equivalente) → escreve source → re-parse.  
- **Copy-chords (a — diferencial):** seleciona bloco fonte → aplica harmonia no bloco destino (posições relativas); não apaga letra do destino sem intenção.  
- **Section transpose (a):** com seção selecionada, sobe/desce semitons **só** daquela seção; resto intacto.  
- **Imagem (a — MUST):** insert → host upload → ref no source → render no fluxo da cifra (entre seções / no ponto do solo).  
- **TAB (a):** ferramentas práticas criar/editar `{sot}`…`{eot}` — não DAW de tab.  
- **Óculos — exclusão (a):**  
  - **Capo/concert:** dual view nomes (concert vs shapes no braço).  
  - **Nashville:** graus em vez de nomes.  
  - **Nunca juntos.** Ativar um desliga o outro.  
  - Ambos na **UI secundária** (sempre disponíveis, não no cluster principal).  
- **Filtro comments (a):** show/hide no view; **mesma prioridade** que Nashville — secundário, sempre disponível, não acesso rápido principal.  
- **Comments no edit:** blocos arrastáveis no WYSIWYG (sem digitar `{c:}`); não é feature separada.  
- **Dirty / undo (c):** dirty perceptível; undo = stack de source.  
- **Embed (b):** overlays no frame; não vazar para viewport do host.

## 5. Philosophy / guardrails (vinculante)

| Decisão | Dono |
|---|---|
| Editar, arrastar, copiar acordes, section transpose, insert image, óculos, filtro comments | **Humano** |
| Parse, reparse, offsets, convert OnSong, storage de imagem | **Sistema** (oculto) |
| Público vs autenticado, qual música, sanitize, multicifra | **Host SDA** |

**Oculto:** parser, mapa source↔visual, lossy OnSong, paths de mídia no host.

**Anti-padrões (R6):**

- IDE no view-only público (source/TAB/structural gritantes).  
- Nashville **e** capo/concert ativos ao mesmo tempo.  
- Editar sob fit ativo ou transpose ≠ 0.  
- Simplify / freeloader / fretboard / collab / shell / multicifra / gen na UI.  
- Inventar cifras; inventar partitura falsa — usar fixtures / imagens reais fornecidas.  
- Seletor de formato OnSong vs ChordPro.  
- Colocar Nashville ou filtro comments no mesmo destaque que transpose/tema/export.  
- Prometer visual ≡ source sob fit/transpose.

## 6. Flow

### View-only (página pública)
1. Host entrega source em mode view.  
2. Pessoa lê; opcionalmente tema / transpose / scroll / fit / export.  
3. (Secundário) Escolhe óculos capo **ou** Nashville; e/ou oculta comments.  
4. Imagens e TAB da cifra aparecem no fluxo (fazem parte da música).

### Edit (autenticado)
1. Host entrega source em mode edit (+ capabilities se restringir fatias).  
2. Sistema: fit off + transpose reset.  
3. Autor WYSIWYG (acorde/blocos) e/ou source assistido.  
4. Copy-chords / section transpose / imagem / TAB conforme necessidade.  
5. Dirty → host; undo local; salvar é contrato do host.  
6. Sair para view-only → leitura limpa.

## 7. States

| Estado | Tratamento |
|---|---|
| empty / loading / error | Como viewer; feedback perceptível |
| view-only populated | Leitura + controles principais |
| view + comments hidden | Corpo sem comments; resto igual |
| view + lens capo \| nashville | Um óculos; nunca ambos |
| edit clean / edit dirty | Modo edit; dirty obrigatório se dirty |
| edit + source pane | Capability / progressive disclosure |
| edit + tab / edit + image | Ferramentas no contexto do bloco |
| edit + section selected | Section transpose disponível |

Mobile + desktop; claro + escuro.

## 8. Constraints

- View-only: uma mão / ensaio.  
- Edit: WYSIWYG thumb-friendly; source não é default do ensaio público.  
- Óculos e filtro comments: sempre acháveis, nunca gritantes.  
- Embed contido; AA; foco visível; perdão a toque acidental (commit explícito; undo).

### Omission audit (R3)

Se omitíssemos: (1) WYSIWYG como MUST, (2) exclusão capo↔Nashville, (3) copy-chords, (4) imagem de partitura, (5) secundários sem poluir principal, (6) fit/transpose off no edit — o agente viraria IDE genérica ou empilharia óculos. **Por isso estão explícitos.**
