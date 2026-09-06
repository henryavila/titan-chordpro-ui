# Handoff — qualidade visual do Titan embutido no SDA

Data: 2026-09-06. Estado: diagnóstico concluído; correções pendentes.
Base do viewer ao criar este documento: `716d81bf4484d847cf24da2f3ee5816f480890aa`.

## Objetivo e contexto

Corrigir cifras sobrepostas e disponibilizar um contrato de tema/tipografia adequado ao embed no SDA. O usuário relatou letra com fonte diferente, acordes embolados e viewer abrindo escuro dentro do site claro. Três agentes revisaram tema/fontes, layout dos acordes e contrato/distribuição; o responsável também inspecionou a música no Safari.

Página real: http://127.0.0.1:8000/musicas/adoradores-1/escuta-meu-clamor/29Py44qB
Música: **Escuta Meu Clamor**, Adoradores 1; cifra **id 86**.
Host: `/Volumes/External/code/sda`.

A integração usa o viewer em dois contextos: frontend em `modes="local"` (alterações pessoais), Nova/backend em `modes="content"` (cifra oficial compartilhada). Preservar essa separação.

Este documento transfere diagnóstico e trabalho proposto; não afirma que os bugs foram corrigidos nem que os critérios abaixo passaram. APIs novas e política definitiva de precedência são propostas, não decisões já ratificadas.

## Leituras e restrições

Seguir [AGENTS.md](../AGENTS.md), [VISAO.md](VISAO.md) e [SPEC.md](../SPEC.md). A visão de produto prevalece sobre trechos legados da SPEC. Core TypeScript sem Vue; lógica dependente de DOM pertence ao binding Vue. Não criar registry de adaptadores nem duplicar renderer no SDA. Usar cifras reais em fixtures.

## Evidência real preservada

[fixtures/escuta-meu-clamor-sda-86.cho](../fixtures/escuta-meu-clamor-sda-86.cho) contém exatamente o campo `chordpro` retornado pelo HTTP local ao gerar este handoff, sem reformatação. A resposta atual usa `props.song.chordpro` (lista); a auditoria anterior encontrou `chordpros`. Não depender desse nome sem inspecionar a resposta atual.

O campo contém sequências literais de escape de quebra de linha (`\r\n`). Foram preservadas deliberadamente; usar o caminho de normalização/parse do pacote, sem reescrever manualmente a música. Não inferir metadados corretos musicalmente a partir desta fixture: o foco é layout.

SHA-256 da fixture: `d7d80be43cac373bf4615b8c0413c14b96a62804a57972da1173054ed38b3be2`.

Trechos reais particularmente úteis:

```chordpro
Eu [D]oro [G]pela  [Bm]cu[E]ra
E [D7]por sa[Em]bedo[B]ri[E]a [E]x//
Ter [Em]mais [Em7/D] mo[A]tivos [Gm]pra louv[D]ar
Que eu [Eb7]seja um [C]instru[Fsus4]men[F]to [F]seu
```

## Separação de responsabilidades

| ID | Prioridade | Responsável | Diagnóstico |
|---|---|---|---|
| V1 | P1 | Viewer — bug | Colisão de acordes dentro de palavras na leitura. |
| I1 | P1 | SDA — integração | Host claro passa tema auto, que segue SO em vez do host. |
| V2 | P2 | Viewer — contrato/API | Preferência de tema salva ganha da prop; falta política explícita para controle pelo host. |
| I2 | P2 | SDA — integração | Fonte Figtree do site não foi harmonizada com Sora do viewer. |
| V3 | P2 | Viewer — oportunidade | Expor tipografia configurável para letra, controles e acordes. |
| I3 | P2 | SDA — distribuição | Alterar src do irmão não atualiza automaticamente snapshot instalado nem bundles SDA/Nova. |

## V1 — acordes colidem na leitura

**Confirmado:** Safari mostrou `Bm` e `E` colados/sobrepostos acima de “cura”. Parse/layoutChart do pacote instalado preservaram os acordes e sílabas. Não foi encontrada corrupção do ChordPro pelo host.

Cadeia causal (linhas referem-se à revisão, podem se deslocar):

1. `src/core/layout.ts:84-92`, `markTight`, marca segmentos conforme espaços, sem considerar largura de acorde.
2. `src/vue/chart/ChartBody.vue:397-435` aplica essa classificação na leitura.
3. `src/vue/cpv.css:390-394`, `.cpv-chord-stack--tight`, define `width:0; overflow:visible; padding-right:0`.
4. O texto da sílaba define avanço horizontal, mas o acorde pode excedê-lo e invadir o próximo.

**Direção sugerida:** posicionar acordes com separação mínima e ancoragem nas sílabas, incluindo palavras com mais de uma troca de acorde. O editor já possui medição geométrica e afastamento de pills de 4px em `src/vue/use/useBlockEdit.ts:685-735`, chamado apenas em edição (`ChartBody.vue:184-190`). Avaliar uma política compartilhada; não copiar cegamente o algoritmo das pills para leitura.

Trocar fonte no SDA ou acrescentar espaços na música pode mascarar o problema, mas não resolve a causa. Não alterar conteúdo original para compensar layout. Investigar também quebra entre segmentos de uma palavra em largura estreita (`flex-wrap` e `overflow-wrap:anywhere`): é hipótese adicional, não bug visual já comprovado.

## I1/V2 — tema do host e preferência do músico

O SDA passa `theme="auto"` em `resources/js/chordpro/SdaChordproViewer.vue:49`; Nova usa default auto em `resources/js/chordpro/mount.ts:51`. O site possui `body.bg-gray-50` em `resources/views/layouts/inertia.blade.php:26`, sem transmitir estado de tema ao viewer.

No viewer, `src/vue/ChordproViewer.vue:207-215` resolve auto com preferência do SO, conforme VISAO/SPEC. Isso não é falha do comportamento auto. O erro da integração é assumir que auto significa seguir a aparência do site.

Porém `ChordproViewer.vue:1348` restaura `cpv:prefs.theme`, e `:207` dá prioridade a esse estado sobre `props.theme`. Apenas trocar auto por light no SDA não resolve necessariamente sessões existentes.

**Proposta de contrato a decidir:** separar valor inicial/preferência livre de tema controlado pelo host. Documentar quem vence entre host, escolha explícita do usuário, preferência persistida e SO; cobrir mudanças de prop depois do mount. Preservar o uso standalone e não apagar overlays para mudar tema. Não impor light globalmente na biblioteca.

**Limite da evidência:** na inspeção Safari desta revisão, o viewer já estava claro. A abertura escura é relato do usuário, sustentado pelo caminho de configuração; não houve limpeza de prefs nem reprodução visual de uma sessão virgem escura.

## I2/V3 — fonte da letra

Host declara Figtree em `resources/views/layouts/inertia.blade.php:11`/Tailwind. Viewer declara Sora em `src/vue/cpv.css:82`; a letra herda essa família. Acordes usam Space Mono. A diferença é explícita, não evidência de fonte ausente.

SDA já inclui import de Sora/Space Mono no CSS, inclusive compilado. Não foi comprovada falha de rede no carregamento de fontes. README do viewer já permite remapear `.cpv-root`; falta aplicar harmonização no host.

**Proposta:** tokens públicos separados para fonte da letra, controles e acordes, mantendo defaults standalone. Documentar exemplo de embed que herde Figtree do SDA sem exigir seletores internos frágeis. Escolha final da família visual pertence ao host. Depois de mudar fontes, repetir V1: a largura dos glifos muda.

## Critérios de aceite propostos

| ID | Verificação exigida |
|---|---|
| A1 | Fixture real sem interseção horizontal entre caixas de acordes vizinhos na mesma linha; separação visual positiva nos pares Bm/E, B/E, Em7/D/A e Fsus4/F. |
| A2 | Letra e acordes preservados; ancoragem nas sílabas coerente; sem inserir espaços no source para corrigir renderer. |
| A3 | Repetir A1/A2 em desktop e largura móvel, com transposição/capo, fontes prontas e fallback; redimensionar depois de montar. |
| A4 | Tema controlado/preferencial documentado e testado com SO dark/light, sem prefs, com prefs antigas e mudança de prop. Overlay pessoal preservado. |
| A5 | Exemplo de tipografia do host aplicado à letra sem quebrar acordes/controles, incluindo nova regressão geométrica. |
| A6 | Artefato atualizado consumido pelo SDA real e Nova; validar frontend local e backend content sem trocar responsabilidades. |

Os testes existentes usam jsdom; teste de texto ou snapshot HTML não comprova ausência de colisão geométrica. Registrar verificação em navegador real e, quando implementado, teste visual/geométrico apropriado. Rodar scripts existentes `typecheck`, `test` e `build` pelo gerenciador do projeto, usando prefixo rtk neste ambiente. Não declarar entrega completa apenas por build verde; seguir também gates aplicáveis de AGENTS/SPEC.

## Distribuição e entrega ao SDA

Na revisão, `node_modules/titan-chordpro-ui/dist` e `../titan-chordpro-ui/dist` eram idênticos; o Nova compilado continha esses artefatos. O instalado é snapshot pnpm, não link direto a src. Foram encontradas alterações em src ainda não refletidas no dist (acentos e detalhes de capo); elas não explicam os três sintomas relatados. Conferir novamente antes de implementar, pois repos podem evoluir independentemente.

Sequência futura: corrigir viewer → compilar pacote → atualizar snapshot/dependência do SDA → reconstruir frontend e Nova → validar a página real. Fixar revisão/artefato reproduzível e registrar a versão efetivamente testada. Não assumir que build SDA reconstrói o repo irmão.

## Ordem de trabalho e retorno ao host

1. Reproduzir V1 com a fixture preservada e criar regressão real de layout.
2. Corrigir V1 no viewer, preservando leitura/edição e fonte original.
3. Definir e implementar, se adotados, os contratos V2/V3 com documentação e testes.
4. Entregar ao responsável SDA instruções concretas para I1/I2/I3: props/tokens, precedência de prefs, atualização do pacote e builds.
5. Validar no embed real e registrar resultados/limites. Não editar BD ou limpar preferências pessoais como parte do smoke.

Fora deste recorte: harmonização do shell do SDA, autenticação/Nova, redesign completo, atualização em massa das cifras, correção silenciosa de seus metadados. Rolagem aninhada/altura mínima do host merece revisão separada, mas não é causa comprovada de V1.

## Referências da auditoria

- `/Volumes/External/code/sda/.atomic-skills/reviews/titan-integracao-vs-viewer-20260906.md`: diagnóstico visual detalhado.
- `/Volumes/External/code/sda/.atomic-skills/reviews/audit-delivery-titan-chordpro-20260906.md`: auditoria anterior, com risco separado de confirmação de salvamento antes do PUT; não assumir que esse problema foi corrigido por este handoff.

Este arquivo e a fixture são a entrega desta solicitação. Nenhuma implementação ou correção foi executada ao gerá-los.


## Atualização — Bm/E em “cura” (2026-09-06)

O usuário esclareceu que o acorde musicalmente correto neste trecho é **Bm/E**, não uma mudança Bm → E entre “cu” e “ra”. Consulta direta à cifra id 86 no MySQL e resposta HTTP confirmaram que o conteúdo salvo é `Eu [D]oro [G]pela  [Bm]cu[E]ra`. O backup local `vsda_tenant.dump` também contém essa forma. Portanto a ausência da barra já está nos dados anteriores à renderização; esta investigação não determinou qual edição/importação introduziu o erro original.

Teste executado com `parse()` do pacote instalado:
- Fonte atual: tokens `{chord: "Bm", lyric: "cu"}` e `{chord: "E", lyric: "ra"}`.
- Substituição apenas em memória, conforme indicação do usuário, por `[Bm/E]cura`: token único `{chord: "Bm/E", lyric: "cura"}`.
- G/D, E/D, Gm/D e Em7/D da mesma cifra também mantêm a barra no parser.

**Correção do diagnóstico:** a colisão visual observada entre dois tokens continua evidência de layout, mas não explica a ausência de `/` nem valida musicalmente a fonte. Este trecho requer correção do conteúdo para `[Bm/E]cura`; não deve ser usado como expectativa musical de dois acordes em regressão. Não inferir automaticamente acordes com baixo a partir de tokens adjacentes no viewer. Fonte/fixture original preservada para rastreabilidade; nenhuma alteração feita na cifra do BD durante esta análise.
