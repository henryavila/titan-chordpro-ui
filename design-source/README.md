# Design source (Claude Design export)

Extracted from `Titan Chodpro UI.zip`. **Visual SoT** for the Vue package.

| File | Role |
|---|---|
| `Titan Chordpro UI v2.dc.html` | View + edit (phone &lt;640 vs wide ≥640) |
| `Chordpro Viewer v2.dc.html` | Ratified reading surface (chart, tokens, PDF) |
| `design_handoff_chordpro_viewer/README.md` | Interaction contract |
| `Titan Chordpro Breakpoints.dc.html` | Three chrome models |

Do not port `support.js` / DC runtime. Recreate in Vue.

**Escopo: o template é a fonte de verdade, não esta lista.** A exclusão que
estava aqui foi revista — o que o `.dc.html` faz, o pacote Vue faz.

| Recurso | Estado |
|---|---|
| Leitura + chrome E0 (meta, fonte, dirty, view↔edit) | pronto |
| Modo dual capo (forma acima, cifra real na letra) | pronto |
| Lente Nashville + comentários de ensaio | pronto |
| Metrônomo (click, pulso, BPM por música) | pronto |
| Auto-rolagem em tempo musical (`{duration}`, `x///`) | pronto |
| Overlay “só para mim” + fila de sugestões | pronto |
| Diagramas de acorde (violão, ukulele, piano) | pronto |
| Drag in-place de acorde (E1) | pronto |
| WYSIWYG de bloco: seleção, reordenar, capo/transpose por bloco (E2) | pronto |
| Editor de partitura VexFlow (`partitura.js`, `Editor Partitura.dc.html`) | pronto |
