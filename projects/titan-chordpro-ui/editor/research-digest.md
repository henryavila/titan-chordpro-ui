# Research digest — editor

## Scope (from Interview)

- **Problema:** corrigir + criar cifras ChordPro (revisão pós-gen/import e autor do zero).
- **In-scope v0 (ratificado — tudo):** acorde in-place + meta; source ChordPro + preview; WYSIWYG completo; tablatura; inserir imagens (partitura); view↔edit na mesma UI.
- **Out:** collab realtime; shell `titan-chordpro`; multicifra; sync com player.
- **Stakes:** modelo source vs visual; contrato embed SDA.
- **Fontes:** `docs/VISAO.md`, `docs/NAMING.md`, `fixtures/`, `docs/research-onsong-format.md`, `docs/research-auto-ajuste-cifra.md` (+ SPEC / design-handoff / README).

## Findings

- **`docs/VISAO.md`**: SoT de produto ainda marca **edição de acordes** como out-of-scope; problema = viewer profissional. Conflita com o refocus de `docs/NAMING.md` (viewer → ui + editor).
- **`docs/NAMING.md`**: UI = view **+** edit num pacote (`titan-chordpro-ui`); editor em `./edit`; 1º host = `sda-v2`; app `titan-chordpro` depois; repos separados.
- **`SPEC.md`**: header já diz view+edit; §2 non-goals ainda: “ChordPro **editor** / drag-to-correct | Future”. ViewModel read-oriented (`source`, sections/lines); `exportCho` parte de **source string**; sem serialize ViewModel→source; seção `kind: 'tab'` existe, mas sem nó de imagem.
- **`design-handoff/01-screens.md`**: anti-padrão explícito — “Editor de acordes / drag-to-correct / fretboard.” Brief atual = superfície **só leitura**.
- **Sem `src/`:** repo ainda não scaffoldado; nada de implementação de editor/viewer para estender.
- **`docs/research-onsong-format.md`**: parse normaliza ChordPro|OnSong → mesmo ViewModel; UI sem seletor de formato; export preferencial **ChordPro canônico** — risco de perder fidelidade OnSong ao editar e reexportar.
- **`docs/research-auto-ajuste-cifra.md` + handoff:** modo ajuste = reflow opt-in (sem colunas); reflow faz acordes “andarem”; **editar no layout ajustado** ≠ linhas do source — seam perigoso para WYSIWYG.
- **`fixtures/`:** TAB real em `fixtures/ministerio-tons/013-ele-vive-em-mim.cho` (`{sot}`…`{eot}`); comentários de ensaio (`BEM SUAVE`, `INTRODUÇÃO`); densas; **zero** fixture de imagem/partitura; OnSong puro ainda “quando disponível”.
- **Embed SDA (`SPEC` §0/§3):** host passa 1 string; sanitize/i18n/multicifra/player no host; controller hoje é view-only — falta contrato `source` out / `mode` / mídia para editor.

## Open risks / seams

| Seam | Risco |
|---|---|
| SoT divergente (VISAO/handoff vs NAMING/entrevista) | Agentes continuam omitindo editor até emendar SoT |
| Modelo de edição source vs visual | Sem serialize, WYSIWYG puro quebra export/OnSong/comentários/TAB |
| Auto-ajuste vs WYSIWYG | Fit-mode não deve ser superfície de edição |
| Imagens | Fora do ViewModel/fixtures — invenção alta se não especificar |
| Escopo v0 “tudo” vs SPEC v0.1 viewer | Aceite A1–A17 sem critérios de edição; blast radius grande |
| Embed SDA | Precisa de eventos bidirecionais + política de mídia/sanitize |
