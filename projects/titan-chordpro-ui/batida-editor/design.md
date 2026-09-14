# Design — Editor de batida (`titan-chordpro-ui`)

> Ratificado B2 (2026-03-26): síntese do debate gate (Priya / Aria / Uma / Tariq-contrário).  
> Paths: `projects/titan-chordpro-ui/batida-editor/` · contrato vivo: `src/core/strum.ts` · import CC: `.ai/memory/plano-import-cifraclub-2026-09-11.md`.

## Interview

| Campo | Decisão ratificada (B0) |
|---|---|
| **Problema** | Sem `{x_strum:}` (CC sem batida ou cifra à mão) a faixa/metrônomo de batida não existe; com `{x_strum:}` importado, não dá para criar nem ajustar o mapa. |
| **In-scope (mapa)** | Criar e editar padrões na UI da cifra; vários padrões nomeados (como CC); presets; mesmo vocabulário (↓↑, toca/passa/pausa, 4 essências); wireframes/UX neste design. |
| **Out-of-scope** | Amarração batida↔letra/seções da cifra; glyphs além das 4 essências; sync com player de áudio do host; som de raspagem (só click do metrônomo). |
| **Done-when (design)** | Este doc: decisões + abordagem + UX + gates; critic Approved + aprovação explícita do usuário. |
| **Stakes** | Formato `{x_strum:}` e modelo `StrumSlot` — não quebrar cifras já importadas/enriquecidas. |
| **Fontes** | Plano CC/batidas; `src/core/strum.ts`; `StrumStrip.vue`; metrônomo; `MetaDialog.vue`; design do editor E0–E4; `research-digest.md` deste slug. |
| **Onde** | Pacote `titan-chordpro-ui` — Source-SoT no ChordPro (não no host SDA). |

## Context

- Já existe **leitura** de batida: import/enrich CC → `{x_strum:}` → `parseXStrum` → `StrumStrip` sync com metrônomo no **view**. verified_by: `src/vue/ChordproViewer.vue` (`hasStrum`, `strumVisible`), `src/vue/StrumStrip.vue`, `tests/vue/strum-strip.test.ts`.
- **Não existe** UI de criação/edição de slots; MetaDialog preserva `x_strum` no `writeMeta` mas não o edita; enrich avisa `strumMissing`. verified_by: `src/vue/edit/MetaDialog.vue` (chip batida + aviso; sem campo de grade).
- Persistência = **um** padrão por arquivo. CC extrai N `strummings` e grava só o primeiro. verified_by: `src/core/import-chordpro.ts` (`page.strums[0]`), `tests/core/import-chordpro.test.ts` (Céu Azul: 2 no parse, 1 no arquivo).
- Plano CC §4.1 já previa seletor multi; **não implementado** no fio nem na UI (`canPick` stub, viewer nunca passa). verified_by: `.ai/memory/plano-import-cifraclub-2026-09-11.md` §4.1; `StrumStrip.vue` `canPick` default false.
- Corpus `fixtures/` / `fixtures/sda/`: **zero** `{x_strum:}` hoje — aceite precisará de fixture(s) novas. verified_by: research-digest + grep do corpus.
- Editor ChordPro (E0–E4) é Source-SoT; batida **não** é gate E0–E4 — fatia irmã. verified_by: `projects/titan-chordpro-ui/editor/design.md`.

## Decisions

1. **Source ChordPro continua SoT.** Toda criação/edição de batida escreve `{x_strum:…}` (via `formatXStrum` + `writeMeta` / patch de meta) e re-parseia. Sem modelo paralelo em Vue/storage do pacote. verified_by: editor design Decision 1; `strum.ts` encode/decode.

2. **Congelar o fio v1.** Tokens e gramática atuais (`bpm; meter; grid; label; pat=` + `D/U/!/m/a/d/u/-`) e `StrumSlot` **não mudam** na primeira fatia. Arquivos existentes round-trip idênticos em rewrite sem edição. verified_by: `tests/core/strum.test.ts`; stake da Interview.

3. **Mapa de produto = completo; entrega = gates B0–B3** (abaixo). Entrevista pediu multi + presets no mapa; painel cortou o fio agora. Resolvido: **mapa inclui** multi e presets; **só B0 (create/edit 1 padrão)** é shippable sem schema novo.

4. **Superfície: folha Batida dedicada** — não MetaDialog (meta “solta”), não StrumStrip como editor. Strip permanece **projeção de leitura** (+ atalho “abrir editor”). verified_by: debate Priya/Aria/Tariq; Uma detalha CTA no view.

5. **Entrada sem batida (view):** CTA `+ Criar batida` acessível sem exigir “Editar cifra” primeiro (job: ensaio precisa de batida agora). Abrir a folha Batida; ao salvar, grava `{x_strum:}` e o botão/toggle Batida passa a existir como hoje. verified_by: dissent Uma preservado na síntese B2.

6. **Entrada com batida:** strip + lápis / “Editar batida” → mesma folha. Em modo `edit` da cifra o strip continua oculto; acesso à batida via chrome (chip/lápis), não competindo com a letra.

7. **Gestos v1 (B0) — slot-first: toque → lista de estados (UX alta):**  
   Interação principal: **tocar um marco (slot) do tempo** abre um **seletor em lista**. Não é “paleta global + pintar”.  
   O seletor lista **somente estados compostos legalmente possíveis** naquele slot (física da mão — Decision 7d):  
   - **Sem âncora:** ↓ e ↑ disponíveis (primeira escolha define o sentido).  
   - **Com âncora:** só o sentido obrigatório × essências / passa.  
   - **Tocar:** sentido permitido × normal · acento · mute · abafada  
   - **Passar / não tocar:** sentido permitido × passa (`ghost`) — **uma só ideia**; o criador **não** oferece “pausa”/`rest` à parte.  
   | Camada | Valores no criador | Independência | Token `pat=` |
   |---|---|---|---|
   | Contato | toca · passa (não tocar) | exclusivo entre si | hit / `d`/`u` |
   | Direção | ↓ · ↑ | **determinada pela âncora + índice** (não livre) | `D`/`U` / `d`/`u` |
   | Essência | normal · acento · mute · abafada | **ortogonal** à direção; só no toque | `` · `!` · `m` · `a` |  
   - Parse legado: token `-` (`rest` do CC) continua legível; na UI vira vazio ou passa com sentido reparado pela cascata. O criador **não escreve** `-` novo.  
   - Phone: lista em **bottom sheet** (slot destacado). Wide: **dialog modal centrado** (não painel lateral estreito).  
   - Item = glyph grande + rótulo; atual marcado; um toque aplica e fecha. Sem drag multi-slot no B0.

7b. **Layout narrow (phone):** **cada tempo do compasso = 1 linha.**  
   Ex.: 4/4 com densidade 4 → `grid=16` → 4 linhas (tempos 1–4), cada uma com 4 slots. Wide: mesma semântica.

7c. **Mockup ≠ UI final.** `design-source/batida-editor-preview.html` é **só referência** do padrão de interação (1 tempo/linha, slot → lista). A implementação **deve melhorar a UI/UX** além do HTML (motion, hierarquia, a11y) — não portar pixel a pixel.

7d. **Física da mão (crítico — emenda ratificada):** impossível ↓↓ ou ↑↑ em slots sequenciais (hit **e** passa contam).  
   - Usuário marca **explicitamente** o sentido da âncora (primeira batida com direção).  
   - Até a âncora: grade **toda vazia** (`dir: null`). Definiu a âncora → **cascata preenche** o resto com o único sentido possível.  
   - Mudar a âncora / fase → **recalcula** todos os sentidos (preserva contato/essência).  
   - O **ciclo inteiro fecha** (último ↔ primeiro também alternam) — movimento mecânico contínuo.  
   - Densidade da grade = **2 ou 4 marcadores por tempo** (UI: “2 por tempo” / “4 por tempo”); total = tempos × densidade. Ex.: 4/4→8|16, 2/4→4|8, 3/4→6|12. Em **6/8** o usuário escolhe a interpretação do tempo (2 pulsos compostos → 4|8, ou 6 colcheias → 12|24).  
   - Import CC / presets / save: padrões ilegais **rejeitados**; save só com padrão completo e legal.  
   - Done-when: impossível persistir ↓↓/↑↑; picker só opções legais; UI completa.

8. **Enrich CC vs batida local:** se o arquivo **já tem** `{x_strum:}`, enrich **não** sobrescreve (keep-local). Prefer-cc de batida só quando a chave está ausente. Se o usuário pediu explicitamente “trazer batida do CC” com conflito, UI pergunta (Manter / Trazer CC). Sem inventar batida quando `strumMissing`. verified_by: debate Priya/Aria/Uma; Tariq “não inventar”.

9. **BPM:** metrônomo continua em `{tempo:}` / `{time:}`. Ao criar batida, `bpm` do padrão **espelha** `{tempo:}` se existir; editar BPM na folha pode oferecer “alinhar tempo da cifra” (opcional, não obrigatório no B0). Não dual-SoT silenciosa.

10. **Aceite por gate:** cada gate B0–B3 exige fixture(s) + testes green **antes** de claim DONE. Sem fixture `{x_strum:}` no corpus, B0 não fecha. verified_by: Tariq; AGENTS.md fixtures.

### Gates de entrega

| Gate | Capacidade | Critério de entrada / aceite |
|---|---|---|
| **B0** | Criar + editar **1** padrão no fio atual; folha Batida; CTA sem batida; strip leitura; keep-local no enrich | Fixture com `{x_strum:}`; round-trip; song sem batida → cria → reabre igual; token/slot tests verdes; arquivos antigos intactos em rewrite sem edição |
| **B1** | Presets embutidos (catálogo core) aplicados na folha | Catálogo versionado com IDs estáveis; aplicar = `formatXStrum`; confirmação se padrão já sujo |
| **B2** | Vários padrões **nomeados** na sessão + seletor (`canPick`) | Persistência multi **definida** (chave nova ou gramática documentada) **sem** quebrar parse do `{x_strum:}` legado; import CC passa a não descartar 2..N quando o schema multi existir |
| **B3** | Conflito enrich rico (diff / cópia nomeada) + polish gestos | Só após B0–B2 estáveis |

Capabilities flags (sketch): `{ batidaEditor?: boolean; batidaPresets?: boolean; batidaMulti?: boolean }` — host liga subconjunto.

## Chosen approach

**Abordagem escolhida: Source-SoT + folha Batida + mapa completo com gates B0–B3 + fio `{x_strum:}` congelado no B0.**

Peso do debate (2026-03-26):

- **Priya:** folha no edit/job create; single-pattern primeiro; tap-cycle; presets depois; keep-local.
- **Aria:** projeção editável do ChordPro; core dono do format; multi só com chave nova depois; API pura `setSlot` / `resizePattern`; presets data no core.
- **Uma:** CTA no view; sheet mobile / painel desktop; gestos e presets no desenho UX; dialog de conflito CC.
- **Tariq (contrário):** mínimo = 1 padrão + fixture + strip read-only; zero multi/presets no fio agora.

**Resolução B2 (usuário):** mapa completo + gates (não só o mínimo Tariq; não multi no fio na v1).

### UX — wireframes (normativos para o design)

#### A. View sem `{x_strum:}`

```
┌─ chrome (tom / metro / …) ─────────────────────┐
│  [ … ]  [+ Criar batida]                        │
└─────────────────────────────────────────────────┘
│  cifra …                                        │
```

- Toque em `+ Criar batida` → abre **folha Batida** (bottom sheet no phone; **modal centrado largo** no desktop, ~720px).
- Não exige entrar em `mode=edit` da cifra.

#### B. View com `{x_strum:}`

```
┌─ StrumStrip (leitura) ──────────────────────────┐
│  Padrão · 71 BPM                    [✎]         │
│  1  ·  ·  ·  2  ·  ·  ·  3 …                   │
│  ↓  ↑  ·  ↓  …   (highlight do metrônomo)       │
└─────────────────────────────────────────────────┘
```

- `✎` / “Editar batida” → mesma folha.
- Toggle Batida existente permanece (mostrar/ocultar strip).

#### C. Folha Batida (B0) — phone: 1 tempo/linha; toque no slot → lista

```
┌─ Batida ──────────────────────────── [Fechar] ─┐
│  Nome: [ Padrão ]   Densidade: [4 por tempo ▾] │
│  (6/8:) Pulsos: [2 compostos ▾ | 6 colcheias]  │
│                                                │
│  1  │ [·] [·] [·] [·]   ← vazios até âncora    │
│  2  │  …                                       │
│                                                │
│  [ Apagar ]                      [ Salvar ]    │
└────────────────────────────────────────────────┘
         ↓ toque no slot (com âncora: só ↑)
┌─ Escolher batida · tempo 2 · só ↑ ─────────────┐
│  TOCAR                                         │
│  ○  ↑  Normal     ○  ↑  Acento                 │
│  ○  ↑  Mute       ○  ↑  Abafada                │
│  PASSAR / NÃO TOCAR                            │
│  ○  ↑  Passa                                   │
└────────────────────────────────────────────────┘
```

- Lista = **só opções legais** do sentido permitido. Sem item “pausa” separado.
- Wide: modal centrado (folha + picker); phone: bottom sheet. Mockup = referência (7c).
- **Salvar:** só se completo+legal; `formatXStrum` → `writeMeta`.
- **Apagar:** remove `x_strum`; CTA `+ Criar` volta.
- **B1:** seção Presets (só padrões legais); **B2:** picker multi-nome.

#### D. Enrich com batida local (B0 regra; B3 UI rica)

- B0: se `x_strum` presente → patch enrich **omite** batida (keep-local); demais campos fill-empty inalterados.
- B3 (opcional): dialog Manter / Trazer CC / Cancelar.

### Core API mínima (B0 + 7d)

Funções puras em `src/core/strum.ts` (ou adjacente), sem Vue:

- manter `parseXStrum` / `formatXStrum` / `encodeStrumPat` / `decodeStrumPat`
- `listSlotChoices(pattern?, index?) → StrumSlot[]` — contextual: sem âncora = 8 hit + 2 ghost; com âncora = 4 hit + 1 ghost do sentido obrigatório; **sem** `rest`
- `setSlot` (baixo nível) + `setSlotCascading` (âncora + preenchimento + recálculo de fase)
- `emptySlot` / `isEmptySlot` / `hasStrumAnchor` / `requiredDir` / `isLegalStrumPattern` / `isCompleteStrumPattern` / `repairStrumPattern`
- `beatsInMeter` / `gridFromDensity` / `densityFromGrid` / `inferSixEightPulse` (densidade 2|4 por tempo)
- `slotEquals` / `resizePattern` / `emptyPattern` (slots **vazios** até âncora)

Vue: folha + wiring `writeMeta`; strip inalterado como leitura; import CC descarta padrões ilegais.

## Non-goals

- Amarração automática batida ↔ seções/letra da cifra.
- Novos glyphs / 24 técnicas do CC além das 4 essências.
- Sync com player de áudio do host.
- Som de raspagem (só click do metrônomo existente).
- Mudança do alfabeto `pat=` ou do shape `StrumSlot` no B0.
- Persistência multi-padrão no B0 (fica no mapa B2).
- Presets no B0 (mapa B1).
- Editor inline no StrumStrip como SoT de edição.

## Rejected alternatives

| Alternativa | Por que rejeitada | Voz |
|---|---|---|
| Editar batida só dentro do MetaDialog | Meta é título/tempo/tom; grade de slots não cabe; job errado | Priya, Aria |
| StrumStrip editável como editor principal | Mistura leitura de ensaio com authoring; toque acidental; strip some no edit | Priya, Tariq |
| Multi-padrão no fio já na v1 | Breaking / schema sem fixtures; CC já descarta 2..N; stake Interview | Priya, Aria, Tariq |
| Presets no B0 | Não valida o job create/edit; catálogo inexistente = opinião | Priya, Tariq |
| Enrich prefer-cc sempre sobrescreve batida | Destrói edição local; one-way door de confiança | Priya, Aria, Uma |
| Design só do mínimo sem mapa multi/presets | Entrevista pediu mapa; usuário ratificou mapa+gates | B2 usuário vs Tariq |
| Direção e essência como ferramentas exclusivas | Quebra o contrato (`↓` abafada + `↑` normal coexistem); corrigido Decision 7 | Feedback usuário no mockup |
| Paleta global + pintar slots | UX ruim no ensaio; trocado por slot → lista de estados compostos | Feedback usuário |
| “Pausa”/`rest` separado de “passa” no criador | Usuário: passar e não tocar são a mesma ideia; criador só oferece passa ↓/↑ | Aprovação design |
| Portar o mockup HTML como UI final | Mockup = referência; implementação deve melhorar UX (7c) | Aprovação mockup |
| Direção livre em todo slot (Decision 7 original) | Fisicamente impossível ↓↓/↑↑; mão precisa alternar — emenda 7d | Feedback usuário (erro grave) |
| Rótulo de grade fixo “8 / 16” | Assume 4/4; densidade real = 2|4 marcadores/tempo × compassos | Feedback usuário |
| Deixar correção da física para polish B3 | Regra crítica do domínio da batida, não polish | Feedback usuário |

## Blast radius

- **B0 (contido):** só escreve/apaga a diretiva `{x_strum:}` já suportada. Rewrite sem edição de slots deve preservar string canônica (teste). Enrich leave-local muda comportamento prefer-cc **só para `x_strum`** — documentar no CHANGELOG; demais prefer-cc inalterado.
- **B2 (porta de mão):** introduzir schema multi (`x_strum_set` ou equivalente) é one-way para leitores externos. Contenção: parse legado de `{x_strum:}` permanece; multi opt-in; migração documentada; import deixa de dropar 2..N só quando o writer multi existir.
- **Tokens / StrumSlot:** mudança = breaking de todas as cifras enriquecidas — **proibido** sem major + migração (fora deste design).

## Open questions

1. ~~Gestos / vocabulário no criador~~ — **fechado** na Decision 7 + 7b (paleta completa; 1 tempo/linha no phone).
2. ~~Física da mão / densidade por tempo / 6/8~~ — **fechado** na Decision 7d (ratificado 2026-03-26+; âncora explícita, cascata, loop, 2|4 por tempo, 6/8 com escolha de pulso).
2. Fixture canônica: enriquecer uma cifra SDA existente via CC (com rede) vs fixture mínima só-meta no `fixtures/` — plan escolhe sem inventar letra (AGENTS.md).
3. Capability default no host SDA: `batidaEditor` on/off no embed do dia 1.
4. Alinhar BPM da folha ↔ `{tempo:}` com um toque “usar tempo da cifra” — B0 opcional ou B1.

## Self-review against code-quality gates

- G1 read-before-claim: applied — claims sobre `strum.ts`, import `strums[0]`, StrumStrip read-only, MetaDialog, zero fixtures, `canPick` stub, cada um com path em Context/Decisions / research-digest.
- G2 soft-language: applied — decisões em imperativo (“congela”, “grava”, “não sobrescreve”); 0 “talvez/idealmente” nas Decisions.
- G6 reference-or-strike: applied — asserts de código com verified_by; Open questions marcadas como não resolvidas.
