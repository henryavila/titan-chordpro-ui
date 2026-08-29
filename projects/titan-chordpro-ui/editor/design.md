# Design — Editor ChordPro (`titan-chordpro-ui`)

> Ratificado B2 (2026-08-29): síntese do debate gate (Priya / Aria / Uma / Tariq).  
> Paths: `projects/titan-chordpro-ui/editor/` · naming lock: `docs/NAMING.md`.

## Interview

| Campo | Decisão ratificada (B0) |
|---|---|
| **Problema** | Corrigir **e** criar cifras ChordPro: revisar pós-gen/import e autor do zero, sem medo de quebrar o arquivo. |
| **In-scope (mapa de produto)** | Acorde in-place + meta básica; source ChordPro + preview; WYSIWYG estrutural; tablatura; inserir imagens (ex. partitura); toggle view↔edit na mesma UI package. |
| **Out-of-scope** | Collab realtime; shell do app `titan-chordpro`; multicifra; sync com player; fretboard diagrams (não pedidos nesta entrevista). |
| **Done-when (design)** | Este doc: escopo + superfície UX + contrato host; critic Approved + aprovação explícita do usuário. |
| **Stakes** | (1) Modelo de edição source vs visual. (2) Contrato embed com SDA. |
| **Fontes** | `docs/VISAO.md`, `docs/NAMING.md`, `fixtures/`, `docs/research-onsong-format.md`, `docs/research-auto-ajuste-cifra.md`; SPEC/design-handoff como inventário (tensão SoT documentada no digest). |

## Context

- Este repo é a semente de **`titan-chordpro-ui`** (view **+** edit). Primeiro host: **`sda-v2`**. Depois: app standalone **`titan-chordpro`** (host separado; consome a mesma UI). verified_by: `docs/NAMING.md` Refocus.
- Hoje **não há `src/`** — greenfield. verified_by: research-digest + listagem do repo.
- **Digest-era:** VISAO/handoff tratavam edição como out/anti-padrão enquanto NAMING/README já apontavam ui+editor. verified_by: `research-digest.md` G1. **Presente:** `docs/VISAO.md` emendada (editor in-scope + Source-SoT + gates); `design-handoff/` e `SPEC.md` §2/§9 ainda atrasam (Open Q #4).
- ViewModel atual (SPEC) é caminho de **leitura**; `exportCho` opera sobre **source string**. verified_by: `SPEC.md` §4 / research-digest G3.

## Decisions

1. **Source ChordPro é a source-of-truth de edição.** Operações de UI (in-place, WYSIWYG, source pane, TAB, imagens) **escrevem no source** (patch ou substituição) e **re-parseiam** → ViewModel derivado. ViewModel **não** é SoT; não se trava `VM → serialize` como caminho feliz do v0.
2. **Mapa de produto = superfície completa** da entrevista (in-place + meta + source/preview + WYSIWYG + TAB + imagens + view↔edit). **Entrega = gates verticais E0–E4** (abaixo) — “tudo no design” ≠ “tudo shippable num único DONE”.
3. **UX hierarchy:** em ensaio (SDA), **visual-first** (edit rápido in-place); **source pane sob demanda** (escape hatch / edit-autor). View mode permanece leitura limpa (zero chrome de edição). Progressive disclosure evita IDE de cifra no set.
4. **Modos de superfície: só `view` | `edit`.** Painel source **não** é um terceiro mode — é a capability `sourcePane` **dentro** de `edit` (toggle UI / progressive disclosure). Controles de edição são contextuais; chrome do **produto** continua do host.
5. **Fit-mode / auto-ajuste:** em `edit`, layout **estável** (fit/reflow off ou congelado). Fit volta no `view`. Não se edita “a linha visual” do reflow como se fosse o source. verified_by: `docs/research-auto-ajuste-cifra.md` + handoff (acordes “andam”).
5b. **Transpose / displayKey em edit:** mesma classe de risco que fit — projeção ≠ source. Ao entrar em `edit`, **resetar transposição** para o source original (`transposeSemitones === 0` / displayKey = key do source). Patches in-place/WYSIWYG **sempre** contra o source não-transposto. Rejeitado: “patchar o que se vê quando transposed” (regravaria acordes transpostos no arquivo do host).
6. **OnSong:** **convert-on-edit** na borda — ao entrar em `edit` (ou no commit de edição), normaliza para ChordPro canônico; sessão de edição e export = ChordPro. Sem dual-SoT OnSong/ChordPro no editor. Lossy de conversão é **política explícita** (lista fechada no plan/SPEC de implementação). verified_by: `docs/research-onsong-format.md`.
7. **Contrato host (SDA primeiro):** string in/out + mode (`view`|`edit`) + dirty + media callbacks + **capabilities** no init. Host **não** recebe HTML/DOM da cifra. Sanitize permanece no boundary do host. Undo: **stack de source** na UI package (reason `'undo'` no change); dirty = source local ≠ último `source` prop commitado pelo host (semântica fina no plan se precisar).
8. **Imagens:** diretiva/ref estável no source (ex. `{image: ref}` ou equivalente ChordPro estendido a fechar no plan); binário/storage é do **host** (`resolveImageUrl` / `uploadImage`). Sem fixture de imagem hoje — E4 exige fixture + aceite antes de claim DONE. verified_by: research-digest G6 (zero image fixtures).
9. **Tablatura:** edição no domínio do source (`{sot}`…`{eot}` / `kind: 'tab'`). Corpus existe (`fixtures/ministerio-tons/013-ele-vive-em-mim.cho`). Gate E3.
10. **Emenda de SoT:** `docs/VISAO.md` (e alinhamento futuro SPEC/handoff) admite editor com as decisões acima e non-goals; handoff de **view** continua válido para leitura — superfície de edição é contrato separado (modes).
11. **Aceite:** cada gate E0–E4 precisa de linhas na tabela de aceite (SPEC) + fixtures relevantes **antes** de claim DONE da fatia. Sem isso, não se afirma “editor completo”. (Dissent Tariq preservado.)

### Gates de entrega (mesmo pacote UI)

| Gate | Capacidade | Critério de entrada |
|---|---|---|
| **E0** | `view`↔`edit`; source pane + preview sync; meta editável | String SoT + reparse; dirty para o host |
| **E1** | Acorde/letra in-place → patch no source | Mapping caret/seleção → offsets de source; oracle string-diff |
| **E2** | WYSIWYG estrutural (seções, quebras, diretivas comuns) | Command bus sobre source; sem fingir pixel-perfect = arquivo |
| **E3** | Tablatura editável | Fixture TAB existente; round-trip source das diretivas tab |
| **E4** | Inserir imagens (partitura) | Fixture de imagem + bridge media do host + diretiva documentada |

Capabilities flags no init (`{ sourcePane, inPlace, wysiwyg, tab, images }`) permitem SDA ligar subconjunto no dia 1 sem mentir no mapa.

### Contrato host mínimo (sketch)

```ts
// Conceptual — names may follow Vue emit conventions in the Vue package.
type EditorCapabilities = {
  sourcePane?: boolean;
  inPlace?: boolean;
  wysiwyg?: boolean;
  tab?: boolean;
  images?: boolean;
};

type EditorHostBridge = {
  source: string;                    // in — ChordPro SoT
  mode: 'view' | 'edit';             // source pane = capability, not a 3rd mode
  capabilities?: EditorCapabilities;
  readonly?: boolean;
  onSourceChange: (next: string, meta?: { reason: 'edit' | 'import' | 'undo' }) => void;
  onDirtyChange?: (dirty: boolean) => void; // local source ≠ last host-committed source
  onModeChange?: (mode: 'view' | 'edit') => void;
  resolveImageUrl?: (ref: string) => string | Promise<string>;
  uploadImage?: (file: Blob) => Promise<{ ref: string; url: string }>;
};
```

## Chosen approach

**Abordagem escolhida: Source-SoT + projeções editáveis + mapa completo com gates E0–E4 + UX visual-first.**

Peso das vozes (debate 2026-08-29):

- **Priya / Aria:** source string como verdade; host fala uma string; VM derivado; fases/gates sem cortar o mapa de produto.
- **Uma:** hierarquia visual-first no ensaio; source sob demanda; view sagrada vs edit fatiado; fit estável no edit.
- **Tariq (contrarian):** sem aceite/fixtures, “tudo num DONE” é falso verde — preservado via gates + política lossy + não travar VM↔serialize.

### Rejected alternatives

| Alternativa | Por que rejeitada | Quem |
|---|---|---|
| ViewModel como SoT + serialize como caminho feliz | Blast radius no read path congelado; round-trip sem política; exportCho já é source-based; risco de falso verde | Aria, Priya, Tariq |
| Um único DONE shippable com WYSIWYG+TAB+imagens+source no dia 1 | Sem linhas de aceite editor; zero fixture imagem; matriz de testes explode | Tariq (dissent), Priya |
| Design só F0 (cortar mapa) | Usuário ratificou mapa completo na entrevista e opção A na síntese; fases resolvem honestidade sem amputar o produto | User B2 |
| Editar OnSong nativo em paralelo | Dual-SoT; export canônico ChordPro; testes lossy subjetivos | Priya, Aria, Tariq |
| Editar sob fit-mode/reflow ativo | Linha visual ≠ source; oracle de teste dividido | Uma, Aria, Tariq |
| Patchar cifra **transposta** (gravar displayKey no source) | Corrompe o arquivo do host; mesma seam que fit | Critic F-001 |
| Terceiro mode `edit-source` no contrato host | Duplica `sourcePane` capability; ambíguo para SDA | Critic F-002 |
| Editor em 3º repo | NAMING lock: editor dentro de `titan-chordpro-ui` (`./edit`) | NAMING |

## Blast radius

| One-way door | Contenção |
|---|---|
| Source ChordPro como SoT de edição | Todo comando de edit deve ser expressável como mutação de string + reparse; evita segundo canal AST persistido para o host |
| Contrato embed SDA (`source` out, `view`\|`edit`, dirty, media, capabilities) | Bridge mínimo; sem mode `edit-source`; sem mandar HTML; sanitize no host |
| Convert-on-edit OnSong → ChordPro | Documentar lossy allowlist; golden lossy versionado no plan; não prometer lossless |
| Transpose vs edit | Reset transpose ao entrar em `edit`; patches só no source original |
| Extensão de diretiva de imagem | Fechar sintaxe no plan **antes** de E4; host owns storage; fixture obrigatória |
| Emenda VISAO (editor in-scope) | Patch curto + este design; SPEC/handoff alinham em follow-up sem reescrever viewer read path |

## Non-goals

- Collab realtime / CRDT.
- Shell do app `titan-chordpro` (host futuro separado).
- Multicifra na UI package (host escolhe a string ativa).
- Sync com player de áudio.
- Fretboard / chord diagrams (não na entrevista; SPEC legado já marcava later).
- Runtime VisualAdapter multi-stack.
- Prometer `visual ≡ source` sob fit-mode **ou sob transpose**, ou round-trip bit-a-bit via ViewModel.
- Gravar acordes do display transposto de volta no source do host.
- Inventar fixtures de cifra (usar `fixtures/`; imagens: adicionar fixture real antes de E4 DONE).

## Open questions

1. **Sintaxe exata** da diretiva de imagem neste produto (ChordPro `{image…}` vs extensão própria) — fechar no plan com evidência de parsers/alvo SDA.
2. **Allowlist lossy** OnSong→ChordPro e pós-edit (whitespace, ordem de meta, chords-over-lyrics) — lista fechada + testes golden.
3. **Default capabilities** no embed SDA dia 1 (provável E0+E1; E2–E4 via flag ou Titan) — confirmar com host SDA.
4. Alinhar `SPEC.md` §2/§9 e `design-handoff/01-screens.md` (anti-padrão editor) ao novo SoT — follow-up doc, não bloqueia este design se VISAO+design estiverem alinhados.
5. Edit estende `ViewerController` (`dispatch`) ou bridge Vue/host paralelo ao controller de leitura? — fechar no plan/scaffold.
6. Detalhe de dirty clear (a cada `onSourceChange` vs só em save explícito do host) — default deste design: dirty limpa quando prop `source` do host iguala o local após change.

## Self-review against code-quality gates

- G1 read-before-claim: applied — claims sobre ausência de `src/`, ViewModel read-oriented, OnSong export canônico, fit-mode, TAB fixture, zero image fixtures, tensão VISAO/NAMING citam `research-digest.md` / docs nomeados.
- G2 soft-language: applied — decisões em imperativo (“é SoT”, “não se trava”, “em edit layout estável”); 0 hedge de “talvez/idealmente” nas Decisions.
- G6 reference-or-strike: applied — assertions de estado do repo carregam `verified_by`; open questions marcadas como não resolvidas.
