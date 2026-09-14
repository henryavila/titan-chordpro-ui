# Research digest — batida-editor

## Scope (from Interview)

- **Problema:** sem `{x_strum:}` a faixa/metrônomo de batida não aparece; com import do CC, não dá para criar/ajustar.
- **In-scope:** criar + editar padrões na UI da cifra; vários padrões nomeados (como CC); presets; mesmo vocabulário; UX detalhada no design.
- **Out:** amarração batida↔letra; glyphs novos; sync player áudio; som de raspagem.
- **Stakes:** formato `{x_strum:}` / `StrumSlot` — não quebrar cifras já enriquecidas.
- **Onde:** `titan-chordpro-ui`, Source-SoT no ChordPro.

## Findings

- **`src/core/strum.ts`:** modelo = **um** `StrumPattern` (`bpm`, `meter`, `grid`, `label`, `slots[]`). Vocabulário fechado: contato `hit|ghost|rest`, dir `down|up|null`, essências `normal|accent|mute|muted`. `formatXStrum` / `parseXStrum` = **uma** string meta com um `pat=`; **não** há lista de padrões na gramática. Tokens: `D`/`U`, `D!`/`U!`, `Dm`/`Um`, `Da`/`Ua`, `d`/`u`, `-`.

- **`src/core/import-chordpro.ts`:** `extractCcStrums` devolve **todos** os `strummings[]` do CC; `convert` / enrich gravam só `page.strums[0]` em `{x_strum:}`. `META_KEYS` tem um único `'x_strum'`. `writeMeta` emite no máximo uma diretiva. `strumMissing` = `page.strums.length === 0`. Enrich **prefer-cc** sobrescreve `x_strum` local.

- **Plano vs código:** `.ai/memory/plano-import-cifraclub-2026-09-11.md` §4.1 pedia “importar todas; seletor se length > 1”. Extração = todas; persistência/UI = só a primeira. Teste explícito em `tests/core/import-chordpro.test.ts` (Céu Azul: 2 strums no parse, 1 no arquivo).

- **`src/vue/StrumStrip.vue`:** faixa **somente leitura**. Props `pattern` + `beatClock` (highlight) + `canPick` (default false). Emite só `pick`. Viewer **nunca** passa `canPick`. Glyphs ↓/↑/×/vazio + ponto mute.

- **`src/vue/ChordproViewer.vue`:** `hasStrum` ⇔ `parseXStrum(readMeta.x_strum)` com slots; botão Batida só se `hasStrum`; strip **oculta em `edit`** (`!isEdit`). Sync: `:beat-clock` do `useMetronome` quando rodando.

- **`src/vue/edit/MetaDialog.vue`:** meta editável (title, tempo, time, key, duration, enrich CC). **Sem UI** para criar/editar `x_strum`. Enrich mostra chip “batida” e aviso se `strumMissing`. `apply()` via `writeMeta` **preserva** `x_strum` existente, mas não o autor.

- **Metrônomo:** `useMetronome` / `MetronomeSheet` usam `{tempo:}` / `{time:}` (+ override). Strip **mostra** `pattern.bpm` do `x_strum` — pode divergir do BPM do metrônomo.

- **Editor E0–E4** (`projects/titan-chordpro-ui/editor/design.md`): Source-SoT; E0 = meta editável; **nenhum gate** “batida editor”. Qualquer edição deve patchar o source ChordPro e re-parsear.

- **Fixtures `fixtures/` / `fixtures/sda/`:** **zero** `{x_strum:}` hoje. Exemplos só em testes (inline + HTML helpers CC).

- **Presets:** nenhum catálogo de batidas prontas no repo — só padrões vindos do CC / strings de teste.

## Open risks / seams

1. **Multi-padrão exige mudança de persistência** (nova gramática / chave / multi-diretiva) — stake explícito da entrevista; import/enrich hoje descartam 2..N.
2. **prefer-cc** no enrich pode apagar edição local de batida se não houver política (merge / keep-local / ask).
3. **Strip escondida em edit** — superfície de edição precisa de regra nova (sheet em edit, dock editável, MetaDialog, etc.).
4. **`canPick` stub** — seletor de seções planejado, não ligado.
5. **Sem fixture de batida no corpus** — aceite do editor precisará de fixture(s) novas (sem inventar cifra: enriquecer fixture existente ou fixture mínima de meta).
6. **BPM dual** (`{tempo:}` vs `x_strum bpm=`) — editor deve decidir se alinha, espelha ou deixa independente.
