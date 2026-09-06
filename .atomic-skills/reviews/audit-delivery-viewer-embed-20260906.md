# Auditoria de entrega — qualidade do viewer embutido

Data: 2026-09-06. Modo: audit. Profundidade: light. Eixos: product,residual.
Fonte: `docs/HANDOFF-SDA-VIEWER-2026-09-06.md`, restringido pelo usuário a **somente Titan UI**.
**Veredito: CLOSED** no escopo Titan UI. A6 no SDA/Nova é N/A por restrição explícita do usuário.
Revisão verificada: `c4a4a5a` (código principal `2f49c49`, complementos `600d30f` e `85524bb`).

## Pacote de intenção

| ID | Decisão/problema | Aceite |
|---|---|---|
| P1 | Cifras no meio da palavra colidem na leitura | A1/A2: caixas separadas, sílabas ancoradas, texto e acordes preservados |
| D1 | Correção reage à geometria disponível | A3: desktop/móvel, transposição/capo, troca/carregamento de fonte e resize |
| D2 | Tema pode ser controlado pelo host sem perder preferências pessoais | A4: SO, prefs antigas, prop após mount e overlay preservado |
| D3 | Fonte configurável separadamente para letra, controles e acordes | A5: defaults standalone e exemplo de embed com regressão geométrica |

Vocabulário: none (additive), sem migração de nomes. Termos de busca: `tight`, `cpv-chord-stack`, `themeControl`, `themeMode`, `persistPrefs`, `STORE_KEYS.prefs`, `font-family`, `--cpv-font`, `getBoundingClientRect`.

Superfícies: core/layout; Vue/renderer/CSS; preferências/storage; testes jsdom; testes de navegador; README/documentação de embed; artefato dist/pacote.

Não objetivos: mudar SDA ou Nova, banco/cifras, limpar dados pessoais, registry de adaptadores, mover Vue para core. A6 do handoff original foi excluído da execução por ordem expressa do usuário; cabe entregar documentação de integração, sem alegar instalação ou teste no host real.

## Plano de verificação

1. Ler o diff comprometido e revisar dependentes diretos em agente independente.
2. Reexecutar no checkout de entrega: `rtk proxy pnpm typecheck`, `rtk proxy pnpm build`, `rtk proxy pnpm test`, `rtk proxy pnpm test:browser`.
3. Conferir testes de geometria e matriz de pares da fixture SDA 86, sem aceitar jsdom como prova visual.
4. Conferir fonte byte a byte pelo SHA-256 do handoff.
5. Buscar caminhos residuais de largura zero, mutações de tema que burlam a política e famílias fixas que burlam os tokens.
6. Registrar matriz final, resultados e limites; não declarar A6 executado.

## Registro de aceite

Nenhum risco aberto que exija aceite. Nenhuma validação humana de FINALIZE/ARCHIVE foi fabricada.

## Matriz final

S=fonte/critério; C=código; U=superfície do usuário; O=documentação; T=teste; X=busca de contraexemplos.

| ID | S | C | U | O | T | X | Status | Cadeia de evidências |
|---|---|---|---|---|---|---|---|---|
| P1 | ok | ok | ok | ok | ok | ok | RESOLVED | Handoff A1/A2 → `readingWords.ts:6` → `ChartBody.vue:418` / `cpv.css:407` → `tests/browser/layout.spec.ts:50` |
| D1 | ok | ok | ok | ok | ok | ok | RESOLVED | `cpv.css:379` / largura intrínseca → viewport/fontes/capo/transpose em `layout.spec.ts:50`; Chromium e WebKit passam |
| D2 | ok | ok | ok | ok | ok | ok | RESOLVED | `public.ts:21` → `ChordproViewer.vue:209` e `:518` → `theme-control.test.ts`, `storage-seam.test.ts` e `layout.spec.ts:109` → `docs/EMBED-SDA.md:27` |
| D3 | ok | ok | ok | ok | ok | ok | RESOLVED | `cpv.css:82`, `:402`, `:496`, `:1231`, `:1954` → testes fonte pronta/fallback e edição `layout.spec.ts:124` → `docs/EMBED-SDA.md:58` |

### Matriz negativa

| ID | Não deve ocorrer | Status | Evidência |
|---|---|---|---|
| MN1 | Alterar source para compensar geometria | RESOLVED | Helper de leitura faz cópias, não muta input; teste compara texto/acordes; fixture SHA/RAW/blob coincidem |
| MN2 | Perder overlay ou botão de reversão pessoal | RESOLVED | `tests/vue/storage-seam.test.ts` e teste de gesto + hit-test + reversão `layout.spec.ts:147` |
| MN3 | Tema host gravar valor na preferência pessoal | RESOLVED | Guard em `ChordproViewer.vue:528`; botão/atalho encaminham a `requestTheme`; prefs desconhecidas preservadas |
| MN4 | Adicionar Vue ao core | RESOLVED | Nenhuma mudança em src/core; gate `tests/core/no-vue-in-core.test.ts` passou |
| MN5 | Alterar SDA/Nova ou alegar A6 executado | RESOLVED | Diff contém apenas Titan UI; `docs/EMBED-SDA.md` declara A6 não executado e entrega instruções |

## Revisão e busca residual

Protocolo válido; OLD=nenhum, NEW=termos definidos no pacote de intenção. Busca em Vue, core, testes, README e docs de embed, com leitura dos hits.

- `tight` continua sendo classificação de texto no core; a pilha Vue deixou de usar largura zero. O nome não é uma implementação residual: a classe agora reserva 4px de respiro além da largura intrínseca.
- Caminhos de tema do botão/atalho convergem em `requestTheme`; host tem precedência na computed. Escrita de outros prefs conserva tema salvo e chaves desconhecidas; JSON corrompido tem recuperação coberta.
- Famílias fixas remanescentes em TAB/source/indicadores especializados são intencionais e documentadas; letra e controles gerais usam tokens distintos. A parte `inherit` está explicada em CSS, sem promessa incorreta para custom properties.
- HTML estático mantém suas regras globais anteriores de quebra; regras novas estão sob os grupos Vue. PDF e editor não foram substituídos pelo algoritmo de leitura.
- Classes de DB/jobs/recovery/admin: N/A; nenhum desses mecanismos é alterado neste escopo.
- Revisão independente achou R1 (clipping do marcador), R2 (prefs inválidas) e R3 (asserção no elemento de overflow errado). Todos corrigidos e retestados. Relatório: `review-code-viewer-embed-20260906.md`.
- Verificação de distribuição achou normalização CRLF pelo Git. `.gitattributes` protege exatamente a fixture; RAW e blob Git agora são `32a8082925ee2ea51708450cebacbf928635b3b2`, 1276 bytes, 49 CRLF; SHA-256 original `d7d80be43cac373bf4615b8c0413c14b96a62804a57972da1173054ed38b3be2`.
- Adendo concorrente do handoff foi preservado em `c4a4a5a`: o par visual Bm/E no teste significa dois tokens existentes, não validação musical. O viewer não infere um acorde com baixo nem corrige a cifra.

Achados abertos: 0 CRITICAL, 0 HIGH, 0 MEDIUM, 0 LOW. Não há aceites de risco.

## Execuções observadas pelo responsável após merge

| Comando | Resultado |
|---|---|
| `rtk proxy pnpm typecheck` | exit 0 |
| `rtk proxy pnpm build` | exit 0; core/PDF/Vue/types/CSS gerados |
| `rtk proxy pnpm test` | exit 0; 30 arquivos, 244 testes passaram; nenhum skip; 12 testes de exports/dist |
| `rtk proxy pnpm test:browser` | exit 0; 10 testes passaram (Chromium/WebKit), 4,3s |
| `rtk proxy pnpm pack --pack-destination artifacts` | exit 0; tarball de 335272 bytes, 15 arquivos |

Tarball: `artifacts/titan-chordpro-ui-0.1.0.tgz`.
SHA-256: `ab046e8e9b09bff3b70086ef840a91314493797ad30ab16921a64d6937f8719e`.
Inspeção do tarball confirmou core/PDF/Vue/CSS/types byte a byte iguais a dist, contrato novo em `public.d.ts` referenciado pelo `index.d.ts`, e ausência de src.

Screenshots finais do próprio harness (desktop Chromium/móvel WebKit) foram inspecionados pelo responsável. Os testes medem também 320px após resize, +2 semitons, capo 2, fontes carregadas/fallback, âncoras e conteúdo.

## Limites e autorrevisão

- Palavras isoladas maiores que o espaço disponível usam rolagem horizontal na linha; fonte original fica intacta.
- Integração/instalação real SDA/Nova não executada, conforme pedido. Não foi feito push ou publicação.
- A suíte local cobre os gates existentes de core+Vue; não se alega execução CI, tag/release ou aceite global de fases anteriores.
- G1: diff e saídas relidos; conclusão deriva das execuções no checkout principal.
- G2: veredito CLOSED restrito a este escopo; A6 não promovido por inferência.
- G6: cada linha RESOLVED possui cadeia código/UI/teste e referências. Confiança alta na matriz exercitada; não é prova para toda fonte/viewport possível.
