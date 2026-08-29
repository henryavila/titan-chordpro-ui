# Fixtures · editor (R8 — dados reais)

**Fonte ChordPro (rung 1):** mesmos paths de `design-handoff/02-fixtures.md`.  
**Fonte imagem/partitura:** exemplos reais em `design-handoff-editor/examples/` (fornecidos pelo operador 2026-08-29).  
**Não inventar** cifras nem partituras falsas.

---

## ChordPro — por estado

| Estado / papel | Path | Nota |
|---|---|---|
| Primary + comments | `fixtures/jesus-tu-es-a-minha-vida-1.cho` | `BEM SUAVE`, key G |
| Dense | `fixtures/ministerio-tons/010-adoralo.cho` | Densidade |
| No key | `fixtures/ministerio-tons/002-em-gratidao.cho` | Sem transpose UI |
| **TAB** | `fixtures/ministerio-tons/013-ele-vive-em-mim.cho` | `{sot}`…`{eot}` — obrigatório em mocks de TAB |
| Short | `fixtures/entrega-2.cho`, `088-minha-ofertinha.cho` | Edge curto |
| empty | `""` | |

Usar excertos verbatim de `design-handoff/02-fixtures.md` nos mocks de letra/acorde.

---

## Imagem / partitura — exemplos reais (MUST)

Estes arquivos mostram **o tipo de mídia** que o editor insere no fluxo da cifra (solo / trecho que ChordPro não expressa):

| Arquivo | O que é | Uso no mock |
|---|---|---|
| `examples/partitura-trecho-solo-letra.jpg` | Melodia em pauta + letra sob as notas (“tudo o que há em mim…”) | **Primário** — solo/partitura embutida entre seções ChordPro |
| `examples/partitura-trecho-melodia.jpg` | Trecho melódico curto em clave de sol | Snippet de solo |
| `examples/partitura-pagina-piano.jpg` | Página completa de piano | Edge: imagem alta; layout não pode assumir só thumbnails |
| `examples/tab-intro-guitarra.png` | Intro em TAB + nomes de acorde | Referência visual de TAB; o **editável** TAB continua sendo o bloco ChordPro `{sot}` da fixture 013 |

**No design:** a imagem aparece **no fluxo da música** (view-only e edit), não só numa galeria. Em edit: inserir / reposicionar bloco de imagem (ref no source; binário no host).

Ainda **não** há `.cho` de fixture com `{image:…}` no repo — o agente desenha o bloco de mídia com estes exemplos; a diretiva exata é engenharia depois.

---

## Óculos (só visual — mesmo source)

Para mocks de **capo/concert** e **Nashville**, usar a mesma fixture com key (ex. jesus-1 em G):

| Óculos | O que o mock deve mostrar (exemplo) |
|---|---|
| Concert | `G C D Em` |
| Capoed (ex. capo 3 → shapes E) | Formas no braço + indicação capo — **não** misturar com Nashville |
| Nashville | `1 4 5 6m` (ou convenção equivalente) — **não** misturar com capo |

Nunca um mock com Nashville **e** capo ativos.

---

## Copy-chords / section transpose

- **Copy-chords:** dois blocos na mesma fixture (verso 1 com acordes, verso 2 só letra ou harmonia diferente) — mock do gesto “aplicar harmonia”.  
- **Section transpose:** uma seção destacada (ex. refrão) com offset local vs resto da cifra.

---

## Texture

- Comments `(INTRODUÇÃO…)`, `(BEM SUAVE)` — densos nas fixtures IASD; filtro view hide/show não apaga do source.  
- Linhas 28–94 chars — WYSIWYG não assume só sílabas curtas.  
- Partitura embutida pode ser **larga/alta** (página piano) — ensaiar scroll e densidade.
