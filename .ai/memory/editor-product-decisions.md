# Editor — decisões de produto (2026-08-29)

## Naming / hosts
- Repo seed → **`titan-chordpro-ui`** (view + edit).
- 1º host: **`sda-v2`** (página pública = view-only; autenticado+permissão = edit).
- **`modes` default = `local`.** “Para todos” (`content` / `both`) é opt-in do consumer; emite `save-content`. Sugestão ao responsável é o flag `suggestions`.
- Pacote npm: exports `.` / `./pdf` / `./vue` (+ `./vue/style.css`). Tipos Vue em `dist/vue`. CLI sem chunks.
- App futuro: **`titan-chordpro`** (host separado).
- Gen = **`titan-chordpro-gen`** — fora do escopo de UI.

## MUST / diferencial
- **WYSIWYG** (arrastar acorde/blocos) + source ChordPro assistido.
- **Imagem/partitura** no fluxo (ChordPro não expressa solo).
- **Capo ↔ concert dual** (problema constante de banda).
- **Copiar acordes verso → verso**.

## Deve ter
- TAB **prático** (não suite Guitar Pro).
- **Section-only transpose**.
- Meta / dirty / undo; Source-SoT; fit off + transpose reset ao entrar em edit.

## UI secundária (sempre disponível, não acesso rápido)
- **Nashville** (graus) e **filtro show/hide comments** — mesma prioridade.
- **Capo/concert e Nashville são excludentes** — nunca juntos.

## Fora
- Gen/ML, simplify/freeloader, collab, shell, multicifra no pacote, fretboard.
- Plan Atomic F0–F4 antigo: cerimônia excessiva; handoff visual primeiro. Reabrir plan só quando for codar o pacote, reescrito.

## Artefato
- Handoff aprovado: `design-handoff-editor/` (+ `examples/` reais).
