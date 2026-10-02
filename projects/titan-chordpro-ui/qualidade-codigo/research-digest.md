# Research digest — qualidade-codigo

## Scope (from Interview)

- **Problema:** UI repetida, CSS/JS solto, lógica espalhada, risco de drift entre superfícies.
- **In-scope:** repo inteiro (`src/vue`, `src/core`, `src/pdf`, `src/slides`, `src/bundle`, `src/cli`, `demo/`, `functions/`, testes). Refatoração de qualidade: componentes reutilizáveis, DRY, coesão, acoplamento. Documentação por feature (em análise).
- **Out:** mudar lógica ou funcionalidade visível ao músico; unificar visual telefone/computador (densidade 44 vs 36 é intencional).
- **Done-when do design:** mapa de extrações + PRs incrementais + contrato de testes + (se ratificado) método de docs.
- **Stakes:** API pública `<TitanChordpro>` / barrels `"."` `./vue` `./pdf` `./slides` `./bundle`; CSS/DOM `titan-chordpro-*`; `data-*`; `STORE_KEYS`; `x_titan_*`; `x///`; `{duration:}` na rolagem; Vue fora de `src/core`.
- **Fontes:** `SPEC.md`, `docs/VISAO.md`, `docs/NAMING.md`, `docs/CONSUMER.md`, `src/`, `tests/`, relatórios em `/tmp/refactor-research/01`–`07`.

## Findings

### Vue — god script, não god template

- **`src/vue/TitanChordpro.vue`**: 3768 linhas; script 1–3053, template 3055–3768 (714). Census: 70 `ref`, 29 `let` de RAF/observers, 135 `computed`, 110 funções, 23 `watch`, 13 `use*`/`create*`, ~30 SFCs filhas. O markup já está fatiado; o peso restante é orquestração (RAF, `syncHostSource`, geometria, teclado, export, sessão de edição).
- Props públicas: 42 em `src/vue/public.ts:84–252` + 6 knobs de teste (`forceParseError`, `*ShouldFail`, `initialCapo`, `initialDual` em `TitanChordpro.vue:147–154`). Emits: 15 (`TitanChordpro.vue:202–233`).
- **Padrão bom já existe:** `viewHeadBind` (`TitanChordpro.vue:1945–1973`) + `v-bind` no head. Docks ainda furam 26–31 scalars. PhoneDock 26 binds/14 events (`:3308`); WideDock 31/22 (`:3231`); MoreSheet é o overflow do wide no telefone (`:3666`).
- `AudioRef` é um SFC, dois mounts mutuamente exclusivos (`:3287` wide vs `:3351` phone `inline`). Deduplicar o `v-bind` do pai, não os slots.

### Chrome — mesmo controle, duas receitas

- Idle Rolar alinhado em `--chord` / `--chord-ink` (telefone e wide). Live ink ainda foge: phone sempre `--chord-ink` (`TitanChordproPhoneDock.vue:113`); wide `--pill-ink` quando `rollLive` (`TitanChordproWideDock.vue:156`). Temas atuais mascaram (`--pill-ink` ≈ `--chord-ink`).
- Densidade intencional: phone 40–48px / weight 700; wide 36px / 600. Comentário SoT em `TitanChordpro.vue:513–518`. `ReadingSwitch.vue` já tem `variant: 'bar' | 'dock'` — o resto do chrome não seguiu.
- `.titan-chordpro-bar-btn` **não tem regra base**, só `:hover` (`titan-chordpro.css:1432`). WideDock copia `height:36px;padding:0 12px;border-radius:12px;font-size:12.5px;font-weight:600` em cada botão.
- Extrações de menor risco: `ChromeTypePair` (A± em 3 sítios), `ChromeRollButton` com `density`, `ChromeBarButton` com base CSS, `ChromeSetlistNav`, `audioRefBind`. **Não** fundir PhoneDock+WideDock no v1.
- Drift de comportamento (não unificar nesta leva, só anotar): phone Edit sem `dirty`/rascunho; “Graus” vs “Nashville”; wide Ajuste sem `aria-pressed`; `[data-met-btn]` só no wide; fila no telefone pode mostrar badge + Mais + chip juntos (`TitanChordpro.vue:3375` sem gate `phone`).

### Primítivas de sheet/dialog

- Vários shells: `titan-chordpro-sheet`+`dialog` (Export/Mine/Update), `bottom-sheet` (Tone/More), metrônomo ancorado **sem scrim**, Setlist no visualViewport, Meta/Nova workbench opaco `--canvas`, Diagram/Queue full-bleed.
- Close X: 24–44px. `aria-modal` falta em Tone/Metronome/Setlist/More. Focus trap só Export (botões) e ImportScore. **`novaOpen` não está no stack Escape** (`TitanChordpro.vue:2517`, `:2559`).
- MetaDialog (935) e NewChartDialog (659) compartilham duration / BPM± / tap / time chips / key pad. BatidaSheet 1126 (grade + dois confirms). ScoreEditor 768 (namespace `.edp*` fora de `titan-chordpro-*`).
- `.titan-chordpro-scrim` definido duas vezes (`titan-chordpro.css:1057` blur 6px e `:2581` blur 5px). Last wins.

### Composables — pares suspeitos são splits legítimos

- `song-swipe.ts` (puro) vs `useSongSwipe.ts` (pointer): **manter**.
- `src/core/audio-cache.ts` (LRU) vs `src/vue/use/audio-cache.ts` (Cache Storage): **não é cache duplo**.
- `src/vue/chart/readingWords.ts`: reexport de 2 linhas do core.
- `rehearsal-audio.ts` (Fonte/Rolar mute) ≠ `useAudioRef.ts` (`<audio>` de referência).
- Gods: `useOverlay.ts` 948 (persist + POST sugestão + router da fila); `useBlockEdit.ts` 902 (façade de `core/block-edit` + ponteiro + `layoutPills`).
- **Não há `useAutoScroll`:** RAF ainda no SFC (`TitanChordpro.vue:1368–1654`).
- Breakpoint `bp` no SFC (`TitanChordpro.vue:443`) vs `swipeBp` (`song-swipe.ts:26`) — risco de drift. Long-press de acorde usa `innerWidth < 600` (`useBlockEdit.ts:224`) vs phone `< 640`.
- Zero `from 'vue'` em `src/core/**` (A14). Vue não chama `createTitanChordproController`; a UI viva é uma segunda máquina de estado (`parse` + `layoutChartFull` + refs, `TitanChordpro.vue:882–890`).

### CSS + ChartBody + `renderHtml`

- `titan-chordpro.css` 3591 linhas, um dump global, seções por comentário, sem `@layer`. Phone vs wide é JS (`width < 640`), não CSS.
- Tokens curtos `--chord/--pill` no CSS; prefixados `--titan-chordpro-*` em `src/core/themes.ts`. `applyThemeVars` grava os dois. `--downbeat/--beat-rest` só no CSS (pulso do metrônomo).
- Classes mortas: `.titan-chordpro-tk-word/space`, `.titan-chordpro-song-skel-chev`. `.edp*` quebra o naming lock, vivo só dentro da raiz.
- `renderHtml` (`src/core/render-html.ts:58–67`) é o dump headless (CLI/snapshot A6). Vue **nunca** chama. Unificar com ChartBody muda HTML do CLI. Classes `--empty/--tight` do HTML estático o CSS da UI não estiliza.

### Core — duplicação real vs especialização

- Gods: `import-chordpro.ts` 1338 (detect/CC/OnSong/meta/strum/enrich/YouTube); `block-edit.ts` 679; `timeline.ts` 653; `layout.ts` 646.
- **Dois OnSong:** `normalizeOnSong` (`onsong.ts:55–105`, parse silencioso) vs `fromOnSong` (`import-chordpro.ts:258–295`, import explícito). Comentário `:6–12` pede para não driftar.
- **Três reconhecedores de acorde:** `isChord` A–H (`import-chordpro.ts:53–58`); `parseChordToken` A–G (`parse-chord.ts:75–112`); `HAS_CHORD_TOKEN` A–G (`onsong.ts:3`). `H7` cola no paste e o diagrama não resolve.
- **`beatsPerBar` NÃO unificar:** timeline 6/8 → 2 (`timeline.ts:225–228`); score 6/8 → 3 (`score.ts:90–94`). Barrel já exporta os dois nomes.
- Dois `writeMeta` vs `patchMeta` (`export-cho.ts:52–122`); `patchMeta` não vê `x_titan_*` (regex sem dígitos/hífens). Vue não chama `patchMeta`.
- `parse().meta` (`parse.ts:168–180`) descarta `x_titan_*`; `readMeta` é o `ChartMeta` completo. Vue chama os dois.
- Quatro walkers de região TAB/score (`parse.ts`, `define.ts`, `import-chordpro.ts`, `lint.ts`).
- Controller guarda `capo` mas `renderHtml(view)` não passa `LayoutOpts.capo` — capo no controller está morto.

### PDF / slides / demo / CLI

- **Não há measure compartilhado.** Tela = CSS wrap (`titan-chordpro.css:741–757`); PDF = `getTextWidth` (`render-pdf.ts:151–224`); slides = orçamento de caracteres (`slides/layout.ts:16–19`). SoT compartilhado: `layoutChartFull` + `readingWords`.
- ZIP writer único (`src/slides/zip.ts`) já serve SLJA, PPSX e bundle. Unzip de produção só no bundle.
- CLI e `src/vue/export/run-export.ts` são dois orquestradores de propósito (Node vs `<a download>`). Vue PDF/slides remontam `ExportedFile` em vez de chamar `exportX`; bundle chama `exportChartBundle`.
- Drift de filename com título vazio (`cifra-.pdf` vs `cifra-cifra.pdf`) — **não “consertar”** numa passa sem mudança de comportamento.
- Demo: quatro HTMLs copiam o boot; `CifraDemo.vue` duplica o bind de `<TitanChordpro>`; `recipe.ts` é o catálogo. Hub diz “Sem persistência” e usa localStorage/IndexedDB.

### Testes de caracterização (armadilhas)

| Teste | O que trava |
|---|---|
| `tests/vue/metronome-pulse.test.ts:102–106` | `readFileSync(TitanChordpro.vue)` deve conter `metronomePulseHit(` |
| `tests/vue/metronome.test.ts:841–851` | grep de strings em `MetronomeSheet.vue` |
| `tests/vue/chrome-contrast.test.ts` / `comments-read.test.ts` | regex no **arquivo** CSS (reformatar regra quebra) |
| `tests/vue/dock-play.test.ts` | fill idle **inline** `var(--chord)`; monta WideDock com ~30 props |
| `tests/vue/TitanChordpro.test.ts:73–74` | `[data-scroll]` style `/--text|--pill-ink|--chord-ink/` |
| `tests/browser/layout.spec.ts:88–91` | phone `<640` sonda `[data-fit]`; desktop `[data-theme-btn]` |
| `tests/vue/edit-on-dock.test.ts` | exatamente um `[data-edit]` |
| `tests/core/render-html.test.ts` | snapshot jesus-1 = A6 |
| `tests/core/autoscroll-no-estimates.test.ts` | segundos vêm da fixture, nunca `BEATS_PER_ROW` |
| `tests/package/consumer-exports.test.ts` | Vue não importa `../core/`; dist sem aliases velhos |

### Documentação (mesma falha DRY)

- Sem gerador (zero TypeDoc/VitePress). `README.md` 730, `docs/CONSUMER.md` 1195, `docs/VISAO.md` 174, `SPEC.md` 435, `CHANGELOG.md` 271, designs em `projects/titan-chordpro-ui/*/design.md`.
- A mesma feature (áudio, Cifra/Letra, batida, solos) está escrita três vezes. JSDoc em `public.ts` é inglês técnico; CONSUMER/CHANGELOG são português de pessoa.
- CHANGELOG já tem método (`AGENTS.md` item 12 + skill release): não gerar a partir de commit.
- VISAO / SPEC / NAMING / MARCAS-X são cadeado — não gerar.

## Open risks / seams

- Extrair `useAutoScroll` sem levar os `let` de RAF/`lastSrc`/`swipePeekHold` → cifra que salta ou draft que some.
- Unificar `beatsPerBar` ou wrap PDF/CSS/slides → comportamento muda.
- Mover pulso para um filho sem atualizar o grep de `TitanChordpro.vue`.
- Pintar Rolar só com classe CSS sem atualizar `dock-play.test.ts` (assert inline).
- “Consertar” filename vazio, ink do Parar no telefone, ou rascunho no Edit do phone — são mudanças de comportamento, fora desta leva.
- TypeDoc como guia do host: público e língua errados.
- Painel de debate e `design.md` ainda não escritos — este digest alimenta B1.

## Extract ranking (qualidade, baixo risco de comportamento)

1. Base CSS de `.titan-chordpro-bar-btn` + `ChromeTypePair` / `ChromeBarButton` / `ChromeRollButton` com `density`.
2. Bind objects nos docks (copiar `viewHeadBind`) + `audioRefBind`.
3. `useExport`, `useChromeLayout`, `useNotationPrefs`.
4. Partir `useOverlay` (fila vs persist) e `useBlockEdit` (gestos vs source).
5. `useAutoScroll` / `useEditSession` por último.
6. Core: fatiar `import-chordpro.ts` por pasta interna; walker de `{sot}`/`x_titan_start_of_score` compartilhado; **não** fundir OnSong silencioso vs explícito sem fixture na frente.
7. ZIP interno `src/zip/` (já único); template HTML da demo; `v-bind` do `CifraDemo`.
8. Docs: pacote `docs/features/<id>.md` por extração; gerador CONSUMER/README quando existirem ≥3 pacotes.

## Agent reports (scratch)

Relatórios brutos em `/tmp/refactor-research/01-god-sfc.md` … `07-pdf-slides-demo.md` (sessão 2026-10-01).
