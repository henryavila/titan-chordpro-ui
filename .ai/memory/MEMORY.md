# Memory index — chordpro-viewer / titan-chordpro-ui

| Topic | File |
|---|---|
| Editor product decisions (2026-08-29) | [editor-product-decisions.md](./editor-product-decisions.md) |
| Preview dir from titan-chordpro-gen (2026-09-05) | [preview-from-gen.md](./preview-from-gen.md) |
| Sincronização com o template de design (2026-09-09) | [design-sync-2026-09-09.md](./design-sync-2026-09-09.md) |
| Relógio da auto-rolagem: camadas, invariante, pontas soltas (2026-09-09) | [autoscroll-clock-2026-09-09.md](./autoscroll-clock-2026-09-09.md) |
| `fitDefault` virou `true` (2026-09-09) | [fit-default-2026-09-09.md](./fit-default-2026-09-09.md) |
| Composições do consumer: palco × ficha, com/sem lista; iframe cancelado (2026-09-10) | [consumer-compositions-2026-09-10.md](./consumer-compositions-2026-09-10.md) |
| Importar Cifra Club: HTML, pontos de ataque, agrupamento de verso/refrão (2026-09-11) | [cifraclub-import-2026-09-11.md](./cifraclub-import-2026-09-11.md) |

Consult before changing editor scope or handoff.
Antes de mexer em integração (componente na página / standalone): leia
`consumer-compositions-2026-09-10.md`.
Antes de mexer em colisão de acordes, setlist ou importação: leia
`design-sync-2026-09-09.md` — tem a lacuna aberta ("sem cifra ainda" vs "falhou").
Antes de mexer no import por URL / Cifra Club: leia
`cifraclub-import-2026-09-11.md`.
Antes de mexer no relógio da rolagem (`timeline.ts`, `ANCHOR_RATIO`, fórmula de
compasso): leia `autoscroll-clock-2026-09-09.md` — valide em segundos e px/s
sobre `fixtures/`, nunca em `bars` de segmento.
