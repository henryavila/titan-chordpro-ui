# design-handoff-editor · `titan-chordpro-ui`

Brief para o **agente de design / UI** — superfície **view-only** e **edit** da cifra.

**Handoff para revisão humana** — não fechado até você anotar/corrigir e enviar ao design agent.  
Emissão ≠ “done”.

| Arquivo | Conteúdo |
|---|---|
| `00-design-system.md` | DS: herda viewer + papéis de edit / óculos / mídia |
| `01-screens.md` | Uma superfície; dois contextos SDA; mapa de features |
| `02-fixtures.md` | Fixtures reais + TAB 013; imagens de partitura (exemplos reais) |

## SoT (não reinventar)

- `docs/NAMING.md` · `docs/VISAO.md`
- Decisões técnicas: `projects/titan-chordpro-ui/editor/design.md` (Source-SoT, fit/transpose no edit)
- Viewer leitura: `design-handoff/` — este folder **acrescenta** edit; não contradiz view limpa

## Dois contextos SDA (produto)

| Contexto | Quem | Mode UI |
|---|---|---|
| **Página pública da música** | Qualquer visitante | **view-only** |
| **Página da música autenticada** | Usuário com permissão | **edit** |

Não são “flags soltas”: são **dois momentos** distintos. Capabilities do host só restringem fatias do edit (ex. sem TAB se o host quiser); o brief desenha o mapa completo do edit.

## Mapa de features (ratificado 2026-08-29)

### MUST / diferencial

| Feature | Nota |
|---|---|
| **WYSIWYG** | Diferencial: arrastar acorde, arrastar blocos; source ChordPro **também** editável com assistência intuitiva |
| **Imagem / partitura** | Trecho de solo/partitura que ChordPro não expressa; exemplos reais no fixtures |
| **Capo ↔ concert dual** | Problema constante de banda: violão capoed vs teclado concert — **óculos** mutuamente exclusivos com Nashville |
| **Copiar acordes verso → verso** | Grande usabilidade: aplicar harmonia de um bloco noutro |

### Deve ter (qualidade onde importa)

| Feature | Nota |
|---|---|
| **TAB prático** | Poucas músicas; quando houver, ferramentas boas (não suite Guitar Pro) |
| **Section-only transpose** | “Sonho” — entra no mapa: transpor só uma seção |
| **Meta / dirty / undo** | Source-SoT; stack de source; bridge host |

### UI secundária (mesmo peso entre si — sempre disponível, **não** no acesso rápido principal)

| Feature | Nota |
|---|---|
| **Nashville (graus)** | Toggle: mostrar `1 4 5 6m` em vez de `G C D Em`; **exclusivo** vs capo/concert |
| **Filtro de comments no view** | Show/hide comments de ensaio na leitura; não competir com controles principais |

**Exclusão capo ↔ Nashville:** não combinar. Ou óculos capo/concert **ou** óculos Nashville — nunca os dois juntos (graus + capo não empilham).

### Já coberto pelo WYSIWYG (não feature à parte)

- Comments `{c:…}`: criar/editar/arrastar bloco **sem digitar** a diretiva
- Comment ancorado a bloco / move junto = consequência do editor de blocos

### Fora deste brief

- Gen / ML · simplify / freeloader · collab · shell app · multicifra · player sync · fretboard diagrams · dual OnSong na UI

## Próximo passo

1. Revisar/anotar esta pasta.  
2. Corrigir.  
3. Enviar ao design agent.  
4. Trazer feedback.
