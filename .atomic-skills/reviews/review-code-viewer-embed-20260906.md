# Revisão de código — viewer embed

Data: 2026-09-06. Modo: local, agente independente sem histórico de conversa.
Escopo: diff capturado em `viewer-embed-review.patch` (29.616 bytes), primeira revisão durante implementação. Não é revisão entre famílias de modelo.

## Resultado inicial

Duas passagens. 0 blocker, 0 critical, 1 major, 1 minor.

| ID | Severidade | Evidência inicial | Falha | Disposição |
|---|---|---|---|---|
| R1 | major | `src/vue/cpv.css:380`, `src/vue/chart/ChartBody.vue:410` | `overflow-x:auto` na linha recorta o botão de reversão pessoal com `left:-15px;width:16px` | Confirmado; correção solicitada ao escritor |
| R2 | minor | `src/vue/ChordproViewer.vue:522` | `JSON.parse` dentro do try de persistência impede todas as gravações futuras se `cpv:prefs` contém JSON inválido | Confirmado; correção solicitada ao escritor |

O revisor confirmou R1 em Chromium com CSS real: botão x=53..69, scrollport começa x=68; hit-test central retorna outro elemento. Para R2 executou função extraída: prefs `{`, theme dark e bias 1 resultam em zero gravações. O responsável releu ambos os trechos antes de solicitar ajustes. O revisor não executou a suíte completa.

## Autorrevisão

- G1: evidências de código conferidas antes de classificar os achados.
- G2: nenhum aceite de código emitido enquanto correções estão pendentes.
- G3: mutações que testes precisam detectar: recolocar overflow no ancestral do botão; lançar durante leitura de prefs inválidas.
- G4: fixture de cifra é a amostra real SDA 86, sem edição de conteúdo.
- G7: revisão sem proposta de abstração adicional; ajustes limitados aos mecanismos demonstrados.

## Follow-up final

Snapshot comprometido `2f49c49` revisado em `viewer-embed-final.patch` (53.713 bytes, incluindo docs e lockfile). R1 resolvido movendo overflow para `.cpv-reading-flow`, com marcador irmão externo. Reteste independente em Chromium/WebKit: centro do botão clicável mesmo com conteúdo 500px em fluxo de 250px. R2 resolvido com desserialização tolerante separada da escrita; reteste da função extraída converteu `{` em `{"theme":"dark","bias":1}` numa gravação.

R3 minor identificado: asserção de overflow ainda media `.cpv-row`, sem enxergar overflow do filho. Corrigido em `tests/browser/layout.spec.ts:34` para medir o flow. Follow-up independente confirmou: no caso 500px/250px a asserção anterior passa, a nova detecta overflow.

**Resultado final: clean.** 0 blocker/critical/major/minor remanescentes. Responsável reexecutou typecheck/build, 244 testes e 10 testes Chromium/WebKit no checkout principal `c4a4a5a`, todos exit 0. Os arquivos de fixture receberam proteção de CRLF no Git; nenhum novo runtime após o snapshot revisado.
