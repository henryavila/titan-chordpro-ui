# Research digest — versoes-cifra

## Scope (from Interview)

- **Problema:** uma música tem várias cifras (simplificada, oferta, completa, apresentação vs louvor). Elas diferem em acordes, tom, repetições, arranjo, tamanho e trechos cantados/tocados. Hoje cada cifra é uma unidade isolada.
- **In:** arquivo único com N cifras nomeadas; troca clara no visualizador; criar/editar/alternar no editor; revisão de VISAO/SPEC/CONSUMER; mapa e redesenho das camadas que interagem (no mínimo envio e aceite de sugestão).
- **Out:** setlist de músicas diferentes; catálogo/biblioteca SDA; gerar versão automaticamente; collab realtime; áudio sincronizado.
- **Stakes:** formato no `.cho` é porta de uma via; demais o debate expõe.
- **Fontes:** `docs/VISAO.md`, `SPEC.md`, `docs/CONSUMER.md`, `docs/NAMING.md`; setlist; overlay/sugestão; spec ChordPro oficial (não está neste repo — ver risco 8).
- **Destino:** `projects/titan-chordpro-ui/versoes-cifra/`.

## Findings

- **`docs/VISAO.md` — multicifra é non-goal permanente e responsabilidade do host.** A unidade do produto é 1 cifra / 1 string. “Qual versão ativa” está na coluna do consumer. Evidence:

```15:16:docs/VISAO.md
| **Out-of-scope** | Collab realtime; multicifra; shell de app / login / nav; player áudio sync; shell do app `titan-chordpro`; geração áudio→ChordPro (`titan-chordpro-gen`); diagramas de braço (ainda later). |
```

```51:51:docs/VISAO.md
| Multi-cifra (qual versão ativa) | ❌ | ✅ passa 1 string |
```

```158:158:docs/VISAO.md
- Non-goals permanentes: multicifra, shell Titan neste repo, áudio sync, collab.
```

- **`SPEC.md` — o contrato de engenharia replica a mesma fronteira.** Host owns “which ChordPro string is active (multi-cifra)”. `parse(source: string): ChordProView` é 1→1. Trocar de string = o host re-parseia; a lib não lembra listas. Evidence: SPEC L28, L56 (“Multi-cifra selection UI | Host state”), L74, L227.

- **`docs/CONSUMER.md` + `src/vue/public.ts` — o SFC é superfície de 1 cifra.** Props: `source?: string`, `songId?: string` (“Identity of the chart, so a personal version follows the right song”), `songs?: SetlistSong[]` (lista de **músicas**, não versões da mesma), `version?: string` (“Version of the official chart: a bump asks the reader what to keep”), `persistSuggestion`, `suggestionQueue`. Emit `save-content` / `update:source` devolve **uma** string. Evidence: `src/vue/public.ts` L147–163, L225–255; CONSUMER L2–3, L67, L252–290, L505–558.

- **`readMeta` vs `parse` discordam em chaves duplicadas.** `parseRaw` é last-write-wins em `meta.title`/`key`/…. `readMeta` percorre o arquivo e a **primeira** chave canônica exata ganha. `writeMeta` depois reescreve um único header. Evidence: `src/core/parse.ts` L151–163; `src/core/import-chordpro.ts` L382–393, L443–459.

- **`src/core/parse.ts` — um source vira um `ChordProView`.** `DIR` casa `{nome: valor}`. Meta (`title`, `key`, `tempo`, `duration`, `capo`, `transpose`, …) é last-write-wins no objeto `meta`. Diretiva desconhecida que casa `DIR` é **consumida e descartada** (`continue` depois da cadeia if/else). Não há `{new_song}` / `{ns}` / envelope de segunda cifra. `{soc}`/`{eoc}` marcam refrão **dentro** da mesma cifra, não outra versão. Evidence:

```28:28:src/core/parse.ts
const DIR = /^\s*\{\s*([a-zA-Z_]+)\s*:?\s*([^}]*)\}\s*$/
```

```151:163:src/core/parse.ts
      if (k === 'title' || k === 't') meta.title = v
      else if (k === 'subtitle' || k === 'st') meta.subtitle = v
      else if (k === 'artist' || k === 'composer') meta.artist = v
      else if (k === 'key') meta.key = v
      // …
      continue
```

```300:311:src/core/parse.ts
export function parse(source: string): ChordProView {
  const text = normalizeEol(source ?? '')
  const normalized = looksLikeOnSong(text) ? normalizeOnSong(text) : text
  const { meta, lines, eocOf } = parseRaw(normalized)
  return {
    meta,
    displayKey: meta.key ?? null,
    transposeSemitones: 0,
    source: normalized,
    sections: toSections(lines),
    eocOf,
  }
}
```

- **`src/core/types.ts` — o ViewModel não tem lista de cifras.** Um `meta` (title/key/tempo/duration/capo/transpose), um `source`, `sections[]` (verse/chorus/tab/…). Lens (`none`/`nashville`/`letra`) é projeção da **mesma** cifra, não outra arranjo.

- **`writeMeta` colapsa o header a um conjunto de chaves.** `META_KEYS` é uma lista plana (um `title`, um `key`, um `x_audio_sung`, um `x_strum` + opcional `x_strum_set`). Rewrite tira as linhas conhecidas do body e reescreve o topo. Duas `{key:}` no arquivo não sobrevivem. Evidence: `src/core/import-chordpro.ts` L344–363, L443–459.

- **Precedente interno de “N nomeados no mesmo `.cho`”: batida.** `{x_strum:}` = padrão ativo (legado); `{x_strum_set:}` = `activeIndex|pattern|pattern|…` quando N>1. Labels sanitizam `|` e `}`. Clientes velhos ainda lêem o ativo. Evidence: `src/core/strum-multi.ts` L1–14, L60–77; `writeStrumPatterns` em `import-chordpro.ts` L429–440. Isto **não** cobre letra/acordes/duração — só a batida.

- **Setlist ≠ versões da mesma música.** `SetlistSong` tem `id`, `title`, `source?`. Dois+ ligam lista, prev/next, swipe de borda, `SongSpot` (tom/capo/speed/scroll) **por id de música**. `lens` / `hideComments` sobrevivem a troca de música; `rehearsalFocus` reseta. Ids duplicados na lista são uniquificados **porque compartilhariam overlay e cache**. No ensaio, a chave de overlay **não** é a prop `songId`: é `setlist.current.id`. Trocar de música (`go` → `syncHostSource`) reseta sessão, overlay, capo, timeline e BPM do metrônomo. Evidence: `src/vue/use/useSetlist.ts` L5–14, L31–37, L45–55, L80–82; `src/vue/ChordproViewer.vue` `hostSource` / `songId` computed / `syncHostSource`; CONSUMER L252–290. Host `loadSong(id)` devolve **uma** string ChordPro por música.

- **BPM manual não usa `songId`.** Metrônomo persiste em `cpv:bpm` chaveado por `title|artist` (`songKey`). Overlay/sugestão chaveiam `songId`. Dois eixos de identidade já existem. Evidence: `src/vue/ChordproViewer.vue` `songKey`; `src/vue/use/useMetronome.ts` `loadBpm`.

- **Corpus: 1 cifra viva por arquivo.** `tests/demo/sda-fixtures.test.ts` trava 148 `.cho` e “guarda uma cifra viva por arquivo, sem inventar chart”. Não há fixture com duas cifras no mesmo arquivo.

- **“Versão” hoje = overlay pessoal + bump de publicação, não arranjo.** Overlay: ops LCS ancoradas em linhas do texto oficial, gravadas em `cpv:my:{songId}`. `baseVersion` compara com a prop `version` (default `'v1'`). Se o oficial mudou, `checkUpdate` pergunta item a item. Suggestion carrega `songId` + `baseVersion` + `ops[]` — **sem id de cifra/arranjo**. Aceitar aplica ops no texto oficial inteiro. Evidence:

```41:44:src/core/storage.ts
/** The key a given chart's personal version is stored under. */
export function overlayKey(songId: string): string {
  return `${STORE_KEYS.overlayPrefix}${songId}`
}
```

```413:428:src/core/overlay.ts
export type Suggestion = {
  id: string
  songId: string
  title: string
  at: number
  baseVersion: string
  ops: OverlayOp[]
  // …
}
```

```430:436:src/vue/use/useOverlay.ts
    const created: Suggestion = {
      id: `s${Date.now()}`,
      songId: opts.songId.value,
      title: opts.title.value || opts.songId.value,
      at: Date.now(),
      baseVersion: officialVersion.value,
      ops: ov.ops,
```

- **Identidade colide no vocabulário.** UI “Minha versão” = overlay do músico. Prop `version` = revisão do oficial. README: `songId` = “Identidade da música, chave da versão pessoal”. Este design precisa de um terceiro eixo (arranjo/cifra nomeada) sem reusar essas palavras à toa.

- **Editor = uma sessão sobre uma string.** `createSourceSession({ source })` parseia, `writeMeta`, undo, lint — um `source`. Evidence: `src/core/source-session.ts` L36–52. Overlay `TextOp.at` é índice de linha nesse texto. Se o arquivo passar a ter N cifras concatenadas, um op `at: 40` da cifra “Oferta” quebra quando a “Completa” acima ganha linhas.

- **Export/PDF/slides/filenames assumem 1 cifra.** `exportCho(source)`, `exportLyrics(source)`, `exportSlja(source)`, `parse` → PDF. Filename: `cifra-{slug}-tom-{key}.pdf` / `{slug}-{key}.cho` — um título, um tom. Evidence: `src/core/export-cho.ts` L3–25; `src/core/filenames.ts` L15–25; `src/core/lyrics-for-slides.ts` L61–62.

- **Meta de ensaio é por arquivo, não por cifra interna.** `META_KEYS` inclui `duration`, `tempo`, `time`, `key`, `transpose`, `capo`, `x_audio_*`, `x_strum(_set)`, `x_source`, `x_youtube`. Timeline (`src/core/timeline.ts`) usa `{duration:}` + `{tempo:}` + `x///` **do source ativo**. Áudio de referência vive no `.cho` (`setRehearsalAudio`), não em prop. Se N cifras compartilham um header, duração/áudio/tom da “Oferta” (3 min) vs “Completa” (7 min) colidem.

- **GAPS do parser (protótipo) já lista diretivas oficiais dropadas — sem `{new_song}`.** `{define}`, `{chord}`, `{new_page}`, `{textfont}` caem em meta e desaparecem. `{new_song}` / `{ns}` **não aparece** em código nem em GAPS. Evidence: `design-source/design_handoff_chordpro_viewer/GAPS.md` L32–35. Spec ChordPro oficial **não está no repo** (entrevista pediu; B0b é repo-only).

- **Demo carrega uma fixture por `songId`.** `demo/CifraDemo.vue` `loadSong` resolve `fixtures.value[songId]`. Lista (`?lista=1`) é N músicas, cada uma 1 `.cho`. Não há fixture com duas cifras no mesmo arquivo.

- **`docs/NAMING.md` — tags customizadas são `x_*` em inglês.** UI em português. Precedente: não inventar chave PT no arquivo (`x_origem` é legado de leitura). Qualquer envelope Titan de cifras nomeadas, se não for diretiva ChordPro oficial, cai neste padrão.

## Interacting layers (inventory)

Cada superfície abaixo assume 1 string = 1 cifra. O design tem de decidir o que é compartilhado (música) vs por cifra (arranjo) vs overlay (músico):

| Camada | Hoje | Se o arquivo tem N cifras |
|---|---|---|
| `parse` / `ChordProView` | 1 meta + 1 body | precisa split ou view da cifra ativa |
| `writeMeta` / `patchMeta` | 1 header canônico | header da música vs da cifra |
| `createSourceSession` | 1 source | editar cifra ativa vs arquivo inteiro |
| Overlay `cpv:my:{songId}` | 1 overlay / música | 1 overlay / música, ou / cifra, ou ops com âncora de cifra |
| `Suggestion.songId` + `baseVersion` | ops contra o oficial inteiro | aceitar na cifra X sem deslocar linhas da cifra Y |
| `version` (publicação) | bump do oficial | bump por cifra? por arquivo? |
| Setlist `songs[].source` | 1 cho / música | o mesmo arquivo nas N entradas vs 1 entrada + switch interno |
| Áudio / duration / tempo / timeline | meta do arquivo | por cifra (oferta ≠ completa) |
| Tom/capo/transpose + `SongSpot` | por `songId` da lista | por cifra? compartilhado? |
| `{x_strum_set:}` | N batidas, 1 cifra | batida por cifra ou compartilhada |
| Export CHO/PDF/SLJA | 1 arquivo de saída | só a cifra ativa vs pacote |
| Cifra Club import / CLI | 1 cho | onde a 2ª cifra entra |
| VISAO/SPEC/CONSUMER | host escolhe a string | host passa o arquivo; Titan escolhe a cifra |

## Open risks / seams

1. **Colisão de vocabulário “versão”.** Overlay (“Minha versão”), `version` (publicação), e arranjo (simplificada/oferta) são três eixos. Misturar no formato ou na UI reabre o diálogo de update e o POST de sugestão no alvo errado.
2. **Ops de overlay são índices de linha no texto oficial inteiro.** Concatenar cifras no mesmo source sem âncora de cifra torna aceite/reaplicação instável (cifra A cresce → ops da B deslocam).
3. **`writeMeta` é last-one-header.** Não dá para ter dois `{duration:}` / dois `{key:}` no modelo atual sem envelope (blocos) ou chaves novas.
4. **Setlist já é o gesto de “trocar o que está na tela”.** Reusar `songs[]` para versões da mesma música mistura repertório com arranjo e viola o out-of-scope da entrevista. UI de troca de cifra tem de ser outro controle.
5. **Host SDA hoje trata 1 música = 1 `.cho` = 1 `songId`.** Mesmo que o arquivo passe a conter N cifras, o consumer ainda escolhe **qual arquivo**; o switch interno é novo no pacote. Docs atuais mentem se não forem revisados.
6. **Precedente `{x_strum_set:}` é compacto e retrocompatível, mas não escala para letra.** Empacotar N cifras numa meta-line estoura ChordPro e o overlay por linha.
7. **Arquivos atuais (1 cifra, sem envelope) têm de continuar parseando.** Qualquer `{new_song}` ou `{x_chart:}` precisa de default: 1 bloco implícito.
8. **Spec ChordPro oficial ausente do repo.** O parser dropa diretivas desconhecidas; GAPS cita `{new_page}`, não `{new_song}`. O debate não pode afirmar a gramática oficial sem evidência local — o fork “usar `{new_song}` oficial vs envelope Titan `x_*` vs `{start_of_*}`” fica em aberto até o design citar a spec ou rejeitar o gancho oficial por restrição de produto (N cifras da **mesma** música, não N músicas no arquivo).
9. **Áudio + `{duration:}` + Rolar.** Trocar de cifra no ensaio sem recarregar a música tem de resetar playhead/duração/faixas — senão a oferta herda o relógio da completa.
10. **Aceite de sugestão em `editMode=persisted`.** Admin vê ops no oficial. Sem `chartId` no `Suggestion`, o revisor não sabe se o ajuste é da oferta ou da completa.

## Agenda seeds for debate

1. Envelope no arquivo: `{new_song}` ChordPro (N músicas) vs bloco nomeado da **mesma** música (Titan `x_*` / `start_of_chart`) vs host continua com N arquivos (rejeitado pela entrevista: mesmo arquivo).
2. Identidade: `songId` (música) vs `chartId` (cifra nomeada) vs overlay; o que a sugestão carrega; o que `cpv:my:` chaveia.
3. Meta compartilhada vs por cifra: title/artist vs key/duration/audio/strum/body.
4. Viewer: controle novo (chip/seletor de cifra) vs reuso disfarçado de setlist.
5. Editor: edita só a cifra ativa (source da fatia) vs source pane do arquivo inteiro.
6. Retrocompat: arquivo sem envelope = 1 cifra; o que `exportCho` emite (ativo vs tudo).
7. Publicação `version`: um bump do arquivo ou bump por cifra.
