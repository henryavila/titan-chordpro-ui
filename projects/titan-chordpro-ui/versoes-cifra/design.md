# Design — Cifras nomeadas da mesma música

> **B2 ratificado** (usuário, 2026-09-20) · direção: um `.cho` = uma música, N cifras nomeadas, troca no viewer/editor.  
> Paths: `projects/titan-chordpro-ui/versoes-cifra/` · digest: `research-digest.md`.

## Interview

| Campo | Decisão ratificada (B0 + B2) |
|---|---|
| **Problema** | Uma música tem várias cifras (simplificada, oferta, completa, apresentação vs louvor). Elas diferem em acordes, tom, repetições, arranjo, tamanho e trechos cantados/tocados. Hoje cada cifra é uma unidade isolada — trocar de arranjo vira “outra música”. |
| **In-scope** | Arquivo único com N cifras nomeadas; troca clara no visualizador; criar/editar/alternar no editor; revisão de `VISAO` / `SPEC` / `CONSUMER`; mapa e redesenho das camadas que interagem (envio e aceite de sugestão no mínimo). |
| **Out-of-scope** | Setlist de músicas diferentes; catálogo/biblioteca do host (SDA); gerar versão automaticamente; collab em tempo real; áudio sincronizado com a letra. |
| **Done-when (design)** | Este doc: formato no arquivo, identidade música vs cifra vs overlay, UI de troca, contrato do consumer/docs, alternativas rejeitadas. Sem código neste ciclo. |
| **Stakes** | Formato no `.cho` é porta de uma via. Overlay/sugestão por índice de linha no arquivo inteiro. Debate expôs as outras portas (identidade, meta, export). |
| **Fontes** | `docs/VISAO.md`, `SPEC.md`, `docs/CONSUMER.md`, `docs/NAMING.md`; `src/core/parse.ts`; `src/core/overlay.ts`; `src/vue/public.ts`; `src/vue/use/useSetlist.ts`; `src/core/strum-multi.ts`; GAPS.md. Spec ChordPro oficial ausente do repo. |
| **B2** | Envelope Titan da **mesma** música; `songId` + `chartId`; meta sonora por cifra; seletor novo sob o título; editor na cifra ativa; save = arquivo, PDF = cifra ativa. Ravi (N strings no host) rejeitado. |

## Context

O produto trata **1 string ChordPro = 1 cifra = 1 `ChordProView`**. `parse(source)` devolve um `meta` e um `sections[]`. verified_by: `src/core/parse.ts` L300–311; `src/core/types.ts` L1–20.

`VISAO` e `SPEC` colocam “qual versão ativa” no host: o consumer passa 1 string. Multicifra está como non-goal permanente **deste pacote**. Esse termo, nos docs atuais, significa o host escolher **qual `.cho`/string** está na tela — catálogo SDA — não N cifras **dentro** de um arquivo. verified_by: `docs/VISAO.md` L15, L51, L158; `SPEC.md` L28, L56, L74.

O parser casa `{nome: valor}` com `DIR = [a-zA-Z_]+`. Meta (`title`, `key`, `duration`, `capo`, `transpose`, …) é last-write-wins. Diretiva desconhecida que casa `DIR` é consumida e **não** vira linha de letra. Não existe ramo `{new_song}` / `{ns}`. `{soc}`/`{eoc}` marcam refrão **dentro** da mesma cifra. verified_by: `src/core/parse.ts` L28, L117–163; `design-source/design_handoff_chordpro_viewer/GAPS.md` L32–35 (`{new_page}` dropada; `{new_song}` nem listada).

`writeMeta` reescreve **um** header canônico (`META_KEYS`) no topo e tira as chaves conhecidas do body. Dois `{key:}` não sobrevivem. `readMeta` (primeira canônica) e `parse` (última) discordam se houver duplicata. verified_by: `src/core/import-chordpro.ts` L344–363, L382–393, L443–459.

Overlay pessoal (“Minha versão”) é ops LCS com `TextOp.at` = índice de linha no **oficial inteiro**, chave `cpv:my:{songId}`. `Suggestion` carrega `songId` + `baseVersion` + `ops[]` — sem id de cifra. Aceitar aplica `applyOps(official, [op])` e emite `save-content` do texto inteiro; bump de publicação é `v${Date.now().toString(36)}`. verified_by: `src/core/storage.ts` L41–44; `src/core/overlay.ts` L20–50, L413–428; `src/vue/use/useOverlay.ts` L430–436, `acceptOp` / `setOfficial`.

Setlist (`songs[]`, 2+) é N **músicas**, cada uma 1 `source`. Ids duplicados são uniquificados porque compartilhariam overlay e cache. No ensaio a chave de overlay é `setlist.current.id`, não a prop `songId`. Trocar de música (`syncHostSource`) reseta sessão, overlay, capo, timeline. `lens` / `hideComments` sobrevivem. verified_by: `src/vue/use/useSetlist.ts` L5–14, L45–55, L80–82; `src/vue/public.ts` L147–163; `docs/CONSUMER.md` L252–290.

Precedente de N nomeados no mesmo arquivo: `{x_strum:}` (ativo, legado) + `{x_strum_set:}` quando N>1. Isso cobre batida, não letra/duração. Tags customizadas são `x_*` em inglês. verified_by: `src/core/strum-multi.ts` L1–14, L60–77; `docs/NAMING.md` L50–57.

Corpus SDA: 148 `.cho`, uma cifra viva por arquivo. verified_by: `tests/demo/sda-fixtures.test.ts` (“guarda uma cifra viva por arquivo”).

`exportCho` / PDF / filenames assumem um título e um tom. verified_by: `src/core/export-cho.ts` L3–25; `src/core/filenames.ts` L15–25.

## Non-goals

- Não reusar `songs[]` / swipe de borda / dock de setlist para trocar **cifra**. Setlist permanece N músicas.
- Não usar `{new_song}` / `{ns}` ChordPro. Essa diretiva (quando existe na spec) é outra **música** no stream, não outro arranjo da mesma.
- Não gerar cifra simplificada por IA nem “diff de letra compartilhada + camada de acordes”. Cada cifra é um corpo cheio.
- Não catálogo SDA, login, nav, collab, player sincronizado.
- Não mudar o host para passar N strings irmãs no lugar de um arquivo (B2 rejeitou Ravi).
- Não chamar o arranjo de “versão” na UI. “Minha versão” permanece overlay. Prop `version` permanece etag de publicação do documento.
- Não exportar só a cifra visível em `update:source` / `save-content` (perda silenciosa das irmãs).

## Decisions

1. **Unidade de arquivo = música; unidade de leitura/edição = cifra nomeada.** Um `.cho` / uma prop `source` contém a música. Dentro dela vivem 1..N cifras com `chartId` estável e rótulo curto (Oferta, Completa, Simplificada, Louvor). O músico troca de cifra **sem** sair do item da setlist e **sem** trocar `songId`.

2. **Envelope Titan, não `{new_song}`.** Blocos:
   - `{start_of_x_chart: <chartId>}` … `{end_of_x_chart}`
   - `chartId` = slug `[a-z0-9_][a-z0-9_-]{0,63}`
   - rótulo de UI: `{x_chart_label: Oferta}` **dentro** do bloco; se ausente, o viewer mostra o `chartId`
   - cifra default do arquivo: `{x_chart_default: <chartId>}` no header da música; se ausente, a **primeira** cifra do arquivo
   - `DIR` atual já casa `start_of_x_chart` (underscore). Sem hífen no nome da diretiva (o matcher `[a-zA-Z_]+` não come `define-guitar`; não repetir esse furo).
   Arquivo **sem** nenhum bloco = uma cifra implícita `chartId = default`. O texto atual continua válido. Writer só emite envelope quando N>1.

3. **Identidade tripla, sem colapso.**
   - `songId` — a música. Host, setlist, cache de `loadSong`. Não muda ao trocar cifra.
   - `chartId` — a cifra no arquivo.
   - Overlay — `cpv:my:{songId}:{chartId}`. Arquivo de 1 cifra implícita usa `chartId = default`, então a chave vira `cpv:my:{songId}:default`. Overlay legado `cpv:my:{songId}` (sem sufixo) **lê** como a cifra `default` e, no próximo write, grava a chave nova. Sem isso, 1-cifra perde “Minha versão” no ship.
   `Suggestion` ganha `chartId`. `TextOp.at` é índice de linha no **documento da cifra** (decisão 8), não no arquivo concatenado. Aceitar aplica ops só nesse documento e **splices** de volta no envelope; `save-content` emite o **arquivo inteiro**.

4. **Meta: identidade da música no header; desenho sonoro na cifra.**
   - Header da música (topo, `writeMeta` de alvo `song`): `title`, `subtitle`, `artist`, `x_source`, `x_youtube`, `x_chart_default`.
   - Dentro do bloco (alvo `chart`): `key`, `transpose`, `tempo`, `time`, `duration`, `capo`, `x_audio_*`, `x_strum` / `x_strum_set`, corpo.
   - Áudio: se a cifra omite `x_audio_*`, herda as faixas do header da música **quando existirem**; senão, sem player. Cifra que declara áudio **substitui**, não mescla track a track.
   - `writeMeta(source, patch, { target: 'song' | 'chart', chartId? })`. Sem `target`, arquivo de 1 cifra implícita comporta-se como hoje (header único). Chamada que reescreve o header da música **não** apaga meta das cifras.

5. **`parse` fatiado.** `listCharts(source)` devolve `{ id, label, isDefault }[]`. `parse(source, { chartId? })` resolve a cifra (prop / default do arquivo / primeira / `default` implícito) e devolve `ChordProView` **dessa** cifra: `meta` = merge (song identity + chart sound), `sections` = corpo da cifra, `source` = **documento da cifra** (header da música + meta+corpo da cifra, sem irmãs). `parse(source)` sem opts em arquivo N>1 usa a cifra default — não concatena os corpos. Concatenar é o bug do parser atual com diretivas dropadas.

6. **Viewer: seletor novo colado no título.** Com N>1, um controle compacto mostra o rótulo da cifra ativa (chip / menu âncora no título). Um toque troca. **Proibido** reusar `SetlistSheet`, dock ◀ ▶, swipe de borda, `CpvEndOffer` para cifra. Swipe de borda permanece **próxima música**. O seletor **não** vive no dock. Prop opcional `chartId` (host escolhe a cifra inicial); o músico pode trocar; emit `update:chartId`. Com N=1 o controle **não** aparece.

7. **Troca de cifra no ensaio.** Trocar cifra **não** chama `syncHostSource` de música (não reseta overlay das irmãs, não troca `songId`). Reseta playhead / timeline / áudio / metrônomo **para a cifra nova** (`duration`/`tempo`/`x_audio_*` dela). Persiste por `(songId, chartId)`: offset de tom ao vivo, capo ao vivo, speed, `scrollTop`. `lens` e `hideComments` continuam escolha do ensaio (sobrevivem cifra e música). `TuneOp` de overlay vive na chave da cifra, não na música.

8. **Documento da cifra (alvo de overlay/edição).** O texto oficial contra o qual `diffOps` corre é o `ChordProView.source` da decisão 5 — um ChordPro de **uma** cifra, com title/artist da música. O editor visual e o source pane **padrão** editam esse documento. Reconstruir o `.cho` multi-cifra é função de core (`replaceChart(file, chartId, chartDocument)`). Source pane do **arquivo inteiro** (envelope visível) é modo avançado, fora do fluxo de ensaio, e não é o alvo de “Sugerir”.

9. **Editor: gestão de cifras é da música, não “arquivo novo”.** Ações: adicionar (duplica o documento da cifra ativa, pede rótulo + `chartId`), renomear rótulo, apagar (N>1; a última cifra **não** apaga — volta a arquivo sem envelope), marcar default. Undo da sessão cobre o documento da cifra ativa. Criar/apagar cifra é passo próprio (não um keystroke no body).

10. **Export e persistência — dois verbos.**
    - `update:source` / `save-content` / persistência do host = **arquivo inteiro** (envelope + todas as cifras).
    - PDF, slides, “baixar esta cifra” (CHO visível) = **documento da cifra ativa**. Filename de PDF/CHO da cifra ativa inclui o `chartId` quando N>1 (`cifra-{slug}-{chartId}-tom-{key}.pdf`).
    - API: `exportCho(source, { scope: 'file' | 'chart', chartId? })`. Default de `exportCho` **sem** opts em N>1 = `file` (não apagar irmãs num script/CLI). O botão PDF do viewer usa `chart`.

11. **Prop `version` = etag do documento (arquivo).** Continua bumpando o diálogo “cifra oficial mudou” só quando o host muda o arquivo. Conflito de **sugestão** não usa esse número sozinho: `Suggestion.baseVersion` compara com a revisão **da cifra** (hash do documento da cifra, ou `chartRevision` derivado). Publicar a Oferta não recusa a sugestão da Completa. Aceitar ops de uma cifra bumpa só a revisão dela; o host ainda recebe um `save-content` do arquivo e um `version` de arquivo se ele quiser.

12. **Vocabulário.** UI e docs deste feature: **cifra** = arranjo nomeado; **música** = item da setlist / `songId`; **Minha versão** = overlay. Proibido rotular o chip de arranjo como “versão”. Docs atuais que dizem “multicifra = host passa 1 string” passam a distinguir: host escolhe **a música** (o `.cho`); o pacote escolhe **a cifra** dentro do arquivo.

13. **Host contract.** `source` continua uma string (o arquivo). Novos: `chartId?: string`, emit `update:chartId`. `songId` não ganha sufixo de cifra. `persistSuggestion` recebe `Suggestion` com `chartId`. Fila agrupa por `(songId, chartId)` — o revisor vê “Título · Oferta”. `loadSong` continua devolvendo o arquivo. Host SDA **não** precisa N endpoints por arranjo.

14. **Leitores velhos.** Pacote atual dropa `{start_of_x_chart}` e concatena os corpos; last-write-wins no `key`/`duration`. Arquivos N>1 **não** são escritos até o pacote que os lê estar no host (MINOR). Arquivos de 1 cifra não mudam. Teste de corpus “uma cifra viva por arquivo” permanece verdadeiro para `fixtures/sda`; fixtures **novas** (fora de `sda/`, ou uma só de exemplo) cobrem N>1 — não inventar cifra SDA.

15. **Docs neste ciclo de design (norma, não código).** `docs/VISAO.md` tabela L51 e non-goal “multicifra” : o non-goal permanente passa a ser **catálogo / qual música**; cifras nomeadas **dentro** do arquivo entram no in-scope da UI. `SPEC.md` §0/§2/§3: parse/listCharts; host ainda não escolhe a cifra salvo prop `chartId`. `docs/CONSUMER.md` + README: seletor, `chartId`, sugestão com cifra, save = arquivo. `docs/NAMING.md`: `start_of_x_chart` / `x_chart_label` / `x_chart_default` na lista `x_*`.

## Chosen approach

Quatro cortes pesados no debate (Aria, Priya, Uma, Dr. Ravi-contrário). O usuário ratificou **A** com meta sonora por cifra (não o header único da Priya) e save=arquivo / PDF=cifra (não o export-default=visível da Uma como persistência).

| | Abordagem | Veredito |
|---|---|---|
| **A** | Um `.cho` = uma música; blocos `{start_of_x_chart:}` da mesma música; parse fatiado; overlay/sugestão por `(songId, chartId)`; seletor novo. | **Escolhida.** |
| **B** | `{new_song}` oficial = N músicas no stream. | Rejeitada. Semântica de outra música; setlist já faz isso; `songId` mente. Spec oficial nem está no repo. |
| **C** | Host manda N strings / N `songId`s irmãos; Titan continua 1 corpo (Ravi). | Rejeitada em B2. Entrevista fechou mesmo arquivo; fragmenta overlay, áudio, item de setlist. |
| **D** | Reusar `songs[]` como lista de cifras da mesma música. | Rejeitada. Dois jobs no mesmo controle; swipe de borda vira acidente. |
| **E** | Uma letra compartilhada + camadas de acordes. | Rejeitada. Oferta vs completa divergem em trechos, não só em densidade de acorde. |

**Como A se implementa (sem lista de tarefas):** core ganha `listCharts` / `parse(..., { chartId })` / `replaceChart`; `writeMeta` ganha `target`; overlay key e `Suggestion.chartId`; Vue ganha seletor no título e sessão de edição no documento da cifra; persistência do host permanece 1 string.

Custo aceito: dialeto Titan (`x_chart`) no SoT do arquivo. Leitores ChordPro de terceiros e pacotes Titan antigos não fatiam. Contenção na Blast radius.

## Blast radius

Porta de uma via: **gramática do `.cho`**. Depois que arquivos N>1 existirem no host, reverter o envelope deixa corpos concatenados no parser velho (last-write `key`/`duration`, diretivas dropadas, overlay `at` no lugar errado).

Contenção:

- Ship do **leitor** (parse fatiado + seletor + overlay keyed) **antes** de qualquer writer (editor “adicionar cifra”) gravar N>1 na natureza.
- Arquivo sem bloco = caminho idêntico ao de hoje (cifra `default`). Overlay legado `cpv:my:{songId}` migra na leitura para `…:default`.
- `save-content` nunca emite só a fatia visível.
- Fixtures `sda/` permanecem 1 cifra. Feature = MINOR (`0.x`).
- Docs separam “multicifra do host” (qual música) de “cifras nomeadas” (qual arranjo). Sem isso o consumer SDA implementa o eixo errado.
- Overlay `TextOp.at` no arquivo inteiro é **incompatível** com N>1. Sem `chartId` + documento da cifra, não se escreve envelope.

O que **não** é porta de uma via: posição do chip no título, rótulo da UI, herança de áudio (dá para estreitar depois), `chartRevision` vs hash.

## Rejected alternatives

- **N strings no host, Titan 1 corpo (Dr. Ravi).** Dissenso preservado: o “mesmo arquivo” da entrevista é ficha de catálogo, não gramática; envelope explode overlay/sugestão/meta/export; VISAO já deu multicifra ao host; `{x_strum_set:}` não escala para letra. **Por que não:** B2 ratificou arquivo único; o job é um item de setlist com N cifras, um `songId`, um `loadSong`. O aviso do Ravi sobre **índice de linha** entra na decisão 3/8 (ops no documento da cifra), não como recusa do envelope.
- **`{new_song}` ChordPro (Aria/Priya contra).** Semântica de outra música. Parser atual droparia e concatenaria do mesmo jeito. Host SDA 1 música = 1 `.cho` = 1 `songId` passaria a ver N títulos.
- **Meta sonora no header da música (Priya).** title/artist/key/tempo/duration/áudio compartilhados; cifra = rótulo + corpo. **Por que não:** a entrevista lista tom, tamanho e trechos cantados/tocados como diferença. Header único mente na Oferta de 3 min vs Completa de 7 min. Capo/transpose **ao vivo** na sessão ficam por cifra (decisão 7), não hidratados do arquivo da irmã.
- **Export/CHO padrão = só a cifra visível como persistência (Uma).** Correto para PDF e “baixar esta cifra”. **Por que não no save:** `update:source` só da aba apaga irmãs. Dois verbos (decisão 10).
- **Setlist/swipe como switcher.** Mistura próxima música com próximo arranjo. Swipe de borda já é o gesto de música (design swipe-ensaio).
- **Ops de overlay no arquivo concatenado.** Um insert na Completa desloca `at` da Oferta. Aceitar vira merge de documento.

## Open questions

- **Teto de N.** unverified: quantas cifras uma música SDA realmente tem. Design não impõe teto; UI de chip cabe em 2–5 rótulos curtos. Se N for grande, o chip vira menu — evidência: corpus real depois do writer existir.
- **`chartId` estável vs rótulo.** Renomear rótulo não muda `chartId` (overlay/sugestão continuam). unverified: o editor oferece “mudar id” (quebra overlay). Evidência: um músico que criou `oferta` e quer `offer` no arquivo.
- **Herança de áudio vs herança de `{x_strum_set:}`.** Decisão 4 herda áudio do header da música. Batida **não** herda do header: omitida = sem batida naquela cifra. Reabrir só se o ensaio mostrar que Completa e Oferta compartilham a mesma batida na prática.
- **Prop `chartId` controlada pelo host vs preferência do músico.** Como `themeControl`: default = músico (persiste último `chartId` por `songId` no ChartStore). Host que precisa forçar Oferta no culto passa `chartId` + política `host`. unverified até o consumer SDA dizer se o culto escolhe a cifra ou o músico.

## Self-review against code-quality gates

- G1 read-before-claim: applied — parse 1:1, DIR drop, writeMeta um header, overlay `cpv:my:{songId}`, Suggestion sem chartId, setlist ≠ cifra, strum_set precedente, VISAO multicifra=host, cada um com path em Context.
- G2 soft-language: applied — varrido `should/probably/typically/usually/maybe/perhaps` nas seções Interview / Context / Non-goals / Decisions / Chosen approach; 0 ocorrências. Open questions usam `unverified:`.
- G6 reference-or-strike: applied — comportamento atual com `verified_by`; teto de N, rename de `chartId`, herança de batida, política host vs músico no `chartId` marcados `unverified` em Open questions.
