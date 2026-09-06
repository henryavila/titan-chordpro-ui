# Auditoria — afastamento da letra para evitar colisão de cifras

Data: 2026-09-06. Modo: audit. Profundidade: light. Eixos: product,residual. Cross: off.
**Veredito: OPEN.** Auditoria do requisito solicitado, não aceite global do produto.

## Pacote de intenção

- P1: cifras próximas devem ganhar espaço horizontal, afastando a letra quando necessário para impedir sobreposição (pedido do usuário).
- A1: o viewer deve reservar largura suficiente para cifras consecutivas, inclusive quando a transposição aumenta seus nomes.
- Decisões adicionais: nenhuma inventada. Vocabulário: none (additive); não há migração de nomes.
- Superfícies: core (`src/core/layout.ts`, `render-html.ts`); UI (`src/vue/chart/ChartBody.vue`, `cpv.css`); editor (`useBlockEdit.ts`); PDF (`src/pdf/render-pdf.ts`); testes (`tests/core/render-html.test.ts`, `vitest.config.ts`); documentação (`docs/VISAO.md`, `SPEC.md`).
- Fontes: pedido do usuário, VISAO §4.1, SPEC §4.2 e §6. Documentos lidos integralmente. A especificação exige acordes acima da letra, mas não contém aceite explícito de colisão geométrica.
- Fora do escopo: corrigir código, alterar fixtures, auditar todo o produto ou declarar SPEC §9 concluído.

## Critérios e matrizes

Critério: fixture real → parse/layout → largura reservada no Vue → ausência de interseção entre cifras. Transposição deve manter esse critério. Nenhuma alegação de entrega prévia foi usada como evidência.

Matriz A: N/A — nenhuma decisão adicional à solicitação.

| ID | Problema | S | C | U | O | T | X | Status | Evidência |
|---|---|---|---|---|---|---|---|---|---|
| P1 | Afastar letra diante de cifras próximas | ok (pedido) | fail | fail (implementação; pixels não medidos) | n/a | fail (sem aceite geométrico) | fail | NO | `src/core/layout.ts:84`, `src/vue/chart/ChartBody.vue:417`, `src/vue/cpv.css:390` |

O=n/a: auditoria de comportamento solicitado; os documentos não prometem explicitamente esse algoritmo. S provém do pedido, não de um requisito retroativamente atribuído ao SPEC.

| ID | Não deve ocorrer | Status | Evidência |
|---|---|---|---|
| MN1 | Acorde longo deixar de reservar espaço sem compensação de colisão | NO | `src/vue/cpv.css:390` e caminho de leitura de `ChartBody.vue:417` |
| MN2 | Inventar cifras para comprovar comportamento | RESOLVED | Execução utilizou `fixtures/jesus-tu-es-a-minha-vida-1.cho:50`; `git status --short` limpo antes deste relatório |

## Achados

| ID | Severidade | Eixo | Evidência | Impacto e próximo passo |
|---|---|---|---|---|
| F1 | HIGH | product | `src/core/layout.ts:84`, `src/vue/cpv.css:390`, `src/vue/chart/ChartBody.vue:425` | Cifras marcadas `tight` ficam com `width:0; overflow:visible; padding-right:0`, permitindo invasão da próxima cifra sem afastar letra. Reservar a largura necessária, ou medir colisão e expandir o segmento afetado. |
| F2 | MEDIUM | residual | `tests/core/render-html.test.ts:13`, `vitest.config.ts:21` | Snapshot e testes de conteúdo em jsdom não provam ausência de sobreposição. Acrescentar teste em navegador com retângulos de cifras, fixture real e transposição. |

### F1 — evidência e limite

`markTight` testa somente se o texto atual termina sem espaço e o próximo começa sem espaço. O comentário explicita a intenção de não separar uma palavra. Não há comparação entre largura do acorde e distância ao seguinte. No modo leitura, `ChartBody` aplica diretamente a classe de largura zero.

No caminho não `tight`, a pilha participa do fluxo flex e tem `padding-right:0.8em` (`cpv.css:380`). Há, portanto, espaçamento parcial; isso não cobre todos os segmentos.

Execução real de `parse` + `layoutChart` por `node --import tsx --input-type=module`, com a fixture original, linha 50:

| Transposição | Segmento | Letra | tight |
|---|---|---|---|
| 0 | A | de | true |
| 0 | Dm | dico o meu vi | true |
| +1 | A# | de | true |
| +1 | D#m | dico o meu vi | true |

A transposição aumenta o nome e mantém a regra sem reserva de largura. Este é um caso candidato real para reprodução visual; não se afirma que uma interseção em pixels foi observada nesta sessão.

## Busca residual

- Protocolo válido; executado localmente conforme profundidade light.
- OLD: nenhum (sem rename). NEW: `tight`, `markTight`, `cpv-chord-box`, `cpv-chord-stack`, `layoutPills`, `collision`, `overlap`, `sobrepo`, `colis`, `getBoundingClientRect`, `offsetWidth`.
- Buscas `rg` em core, Vue, PDF, testes, docs, README e demo; snapshots HTML excluídos das buscas de algoritmos para evitar ruído.
- Caminhos distintos encontrados: leitura/HTML, editor e PDF. Não são aliases nem código morto; são implementações ativas com políticas diferentes.
- Editor: `src/vue/use/useBlockEdit.ts:685` retorna quando não está editando; mede as cifras e desloca suas posições com folga de 4px. Não expande a letra nem corrige o caminho de leitura. Sem alegação de ausência universal de colisões no editor.
- PDF: `src/pdf/render-pdf.ts:11` adiciona espaços à letra quando a faixa de cifras já ultrapassou sua posição. Evidência estática de política diferente; não foi feita auditoria visual do PDF.
- HTML estático: `src/core/render-html.ts:17` emite `cpv-chord--tight`, enquanto o Vue usa `cpv-chord-stack--tight`. O core não fornece medição de colisões; não se presume paridade visual entre os caminhos.
- Ensino: comentário em `layout.ts:89` documenta preservação da palavra, sem exceção por colisão. Classificação teaching; evidência complementar de F1, não novo achado.
- Falso verde: testes de HTML verificam conteúdo/snapshot, não geometria (F2).
- Configuração: `vitest.config.ts` usa jsdom; nenhuma garantia de layout real decorre do teste executado.
- Classes de banco/estado, recovery e force/admin: N/A ao algoritmo de layout, sem migração ou jobs neste escopo.

## Verificações observadas

| Verificação | Resultado |
|---|---|
| `npm test -- tests/core/render-html.test.ts` (via rtk) | 6/6 testes passaram |
| Fixture original, parse/layout, semitons 0 e +1 | Segmentos e flags acima confirmados |
| Servidor Vite local | Iniciou normalmente; encerrado após tentativa de inspeção |
| Navegador CUA | Indisponível: `No browser is available` |

Não verificados: geometria em navegador, responsividade visual, fontes carregadas, exportação visual PDF e suíte global SPEC §9. Nenhuma correção realizada.

## Registro de aceite

Nenhum risco aceito pelo usuário. Abertos: 0 CRITICAL, 1 HIGH, 1 MEDIUM, 0 LOW. Problemas: 0 RESOLVED, 0 PARTIAL, 1 NO, 0 N/A. Rodadas de correção: 0.

## Autorrevisão

G1: arquivos lidos e execução observada antes das conclusões. G2: veredito OPEN pela falha do requisito no caminho `tight`. G6: evidências com arquivo/linha; não há alegação de colisão visual medida. Confiança alta (95%) na ausência da garantia de afastamento; incidência e dimensão visual permanecem não verificadas. Após correção, repetir auditoria com teste geométrico em navegador.

## Reauditoria após implementação — 2026-09-06

O diagnóstico OPEN acima é histórico. A correção Vue e as regressões geométricas foram implementadas; no checkout `c4a4a5a`, typecheck/build, 244 testes e 10 testes Chromium/WebKit passaram. A fixture real SDA 86 reproduziu a falha antes da correção e passou depois, com transposição/capo, fontes e resize. Veredito atualizado do requisito de leitura: **CLOSED**. Relatório completo com matriz, busca residual e limites: [audit-delivery-viewer-embed-20260906.md](audit-delivery-viewer-embed-20260906.md). SDA não modificado.
