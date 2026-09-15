# Research digest — ensaio-batida

## Scope (from Interview)

- **Problema:** controlar o som da batida no ensaio (fora do editor) + modo Ensaio Batida focado em praticar batida olhando a cifra.
- **In:** prefs click/batida/mudo; quando rolar/metrônomo usa batida; modo/lens de ensaio batida; UX no chrome.
- **Out:** editor de batida; sync YouTube/host; scoring/mão; multi-instrumento.
- **Stakes:** modelo de prefs de som; lens/modo na API pública.

## Findings

- **`src/vue/sheets/MetronomeSheet.vue`**: dois toggles **independentes** — `sound` (click) e `strumSound` (só se `hasStrum`). Labels: “Click ligado / Só pulso visual” e “Som da batida / Batida sem som”. Não há seletor exclusivo nem estado “fonte do tempo”. Evidence: props `sound` / `strumSound` / `hasStrum`; emits `toggleSound` / `toggleStrumSound` (linhas ~15–39, 191–213).

- **`src/vue/ChordproViewer.vue` + `src/vue/use/useMetronome.ts`**: click e batida **podem soar juntos**. O loop do metrônomo chama `click()` se `sound.value`; em paralelo, um `watch` em `beatClock` chama `strumSound.sync(...)` se o metrônomo está `running` e `strumSound.enabled`. Evidence: `useMetronome.ts` ~148 `if (sound.value) click(b === 0)`; `ChordproViewer.vue` ~930–954 sync do strum no mesmo clock.

- **`src/vue/use/useStrumSound.ts`**: kit de one-shots acústicos; ghost/rest silenciosos; `enabled` opt-in; preload eager; playback com lookahead; vozes empilham (não cortam o ring anterior). Preview no editor é caminho separado (`previewRunning`). Evidence: `sampleIdForSlot`, `enabled` ref, `sync` no viewer.

- **Prefs (`STORE_KEYS.prefs` / `cpv:prefs`)**: já persistem `metSound`, `metStrumSound`, `metFollow`, `metCountIn`, `metPulseHead`, `lens`, `hideComments`. Defaults implícitos: click off até ligar; strum off até ligar; follow/countIn default on. Evidence: `ChordproViewer.vue` persistPrefs ~1032–1045; hydrate ~2335–2339; `src/core/storage.ts` `prefs: 'cpv:prefs'`.

- **`lens` público:** `Lens = 'none' | 'nashville' | 'letra'` (`src/core/types.ts`). Prop + `update:lens`; sobrevive entre músicas do ensaio; UI **Cifra | Letra** (não menu “Lentes”). `letra` = projeção só letra. Evidence: `docs/CONSUMER.md` §8; `public.ts` lens prop.

- **Strip de leitura:** `strumOn` + `hasStrum` → `StrumStrip` visível no view (não no edit). Toggle Batida no chrome; não é modo de ensaio — é overlay de padrão syncado ao metrônomo. Evidence: `ChordproViewer.vue` `strumVisible` ~433–434. **Som ≠ strip:** `strumSound.sync` roda com metrônomo ligado mesmo se a strip estiver oculta (`strumOn` false). `strumOn` **não** persiste em prefs.

- **Rolagem vinculada:** `follow` liga metrônomo ↔ auto-rolagem; count-in = 1 compasso de click antes da cifra andar. O som da batida **não** substitui o count-in click hoje — count-in usa o mesmo `click()`. Evidence: MetronomeSheet copy “Um compasso de click…”; `useMetronome` count-in + `sound.value` click.

- **Dois AudioContexts:** click (osciladores) e batida (WAVs) são engines separados, sem ducking mútuo. Defaults ambos off. Evidence: explore digest + `useMetronome` / `useStrumSound`.

- **BPM dual:** strip mostra `pattern.bpm` do `{x_strum:}`; áudio/highlight seguem BPM do metrônomo (`{tempo:}` / override). Risco de label mentir sobre o que se ouve.

- **Sem practiceMode nomeado:** ensaio no produto = setlist + lens/letra + metrônomo; não há flag `ensaioBatida`. `WriteMode` local/content é escrita, não prática.

- **Design irmão:** `projects/titan-chordpro-ui/batida-editor/design.md` — editor/folha Batida; Non-goals já citavam “Som da batida: one-shots locais”; out-of-scope sync player host. Este slug é a fatia **ensaio**, não o editor.

## Open risks / seams

1. **Dois booleans ≠ modelo mental “fonte do tempo”.** Click + batida simultâneos podem ser confusos no culto (click seco + guitarra) ou desejáveis no treino (pulse + groove). Design precisa decidir exclusividade vs camadas vs mixer.
2. **Novo `lens=batida` vs modo paralelo.** `lens` hoje é projeção tipográfica (acordes/letra/Nashville). “Ensaio Batida” pode ser layout/chrome (strip grande, foco rítmico) sem ser a mesma família — ou estender `Lens` (stake de API).
3. **Default ao ligar Rolar com batida presente.** Hoje nada muda: click/strum seguem prefs. Mudar default para “batida no lugar do click” é one-way de hábito.
4. **Count-in vs batida.** Se a fonte for batida, a entrada deve ser click, batida, ou híbrido?
5. **Sem `{x_strum:}`.** Modo Ensaio Batida e toggle de som precisam degradar (CTA criar batida? só click? ocultar modo?).
6. **API pública:** prefs locais já existem; lens novo toca `CONSUMER.md` + hosts SDA. Stake ratificado na Interview.

## External UX patterns (informam proposta; **não** são evidência do digest)

Pesquisa ampla (Yousician, UG Practice Mode, Groovr, Groove Gym, Spark Groove Looper, Progressive Guitar metronome-vs-backing):

- Apps separam **click (precisão)** de **groove/backing (musicalidade)** e oferecem toggle/fonte, não só on/off.
- Practice modes focam **uma dimensão** (ritmo, seção, velocidade) sem scoring obrigatório.
- Defaults conservadores: click como base; groove opt-in — evita surpresa no ensaio ao vivo.
- Mute/gap training e slow-down são avançados (fora do nosso out-of-scope de scoring).
