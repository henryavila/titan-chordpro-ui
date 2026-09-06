# Regressão do viewer — 2026-09-06

Escopo executado: somente Titan UI; A6/SDA/Nova e banco não foram acessados.
Fixture: `fixtures/escuta-meu-clamor-sda-86.cho`, SHA-256
`d7d80be43cac373bf4615b8c0413c14b96a62804a57972da1173054ed38b3be2`.
O teste entrega o arquivo bruto ao parse/viewer. A inspeção binária confirmou
49 CRLF físicos; os bytes do arquivo governam o teste, apesar da descrição de
escapes literais no handoff diagnóstico original.

## Reprodução antes da correção

Comando: `rtk proxy pnpm test:browser` (exit 1), teste inicial
`real fixture reserves space between neighboring chords`, sem mudanças em
`ChartBody.vue` ou `cpv.css` em relação à base do handoff.
Playwright 1.63.0, Chromium 153.0.8010.12, WebKit 26.6, macOS arm64.
As distâncias são `próximo.left - anterior.right`; negativo é sobreposição.
Saída observada:

```text
[chromium] Expected Array []
Received [
  "Bm/E: -5.63px",
  "B/E: -2.30px",
  "Em7/D/A: -33.22px",
  "Bb7/Ab: -13.84px",
  "Fsus4/F: -28.11px"
]
[webkit] Expected Array []
Received [
  "Bm/E: -5.63px",
  "B/E: -2.28px",
  "Em7/D/A: -33.22px",
  "Bb7/Ab: -13.84px",
  "Fsus4/F: -28.11px"
]
2 failed
```

## Solução e limites

A largura intrínseca do maior texto (acorde/forma/letra) determina o avanço.
Acordes tight reservam mais 4px de respiro; isso pode afastar visualmente
sílabas, sem adicionar caracteres à letra ou ao source. Os fragmentos de uma
palavra permanecem juntos; a quebra continua permitida em cada espaço real,
mesmo em segmentos originais com várias palavras. Nenhuma medição DOM nem
cópia do algoritmo de pills foi necessária para leitura. O navegador recalcula
naturalmente com mudança de fonte, tom, capo e largura.

Uma palavra isolada maior que o container permanece inteira e pode exceder
esse container, com rolagem horizontal no fluxo da própria linha; o marcador
pessoal permanece fora desse fluxo, clicável. A fixture real passa também em 320px; não se aplica quebra
arbitrária de palavra como compensação para cifras excepcionalmente longas.

## Verificação reproduzível

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium webkit
pnpm typecheck
pnpm build
pnpm test
pnpm test:browser
```

Neste ambiente, prefixar os comandos com `rtk proxy`. O build precede a suíte
para os testes de export/dist não serem pulados. O harness próprio usa Vue/Vite
em `127.0.0.1:5187`, sem serviços do SDA nem fontes de rede no teste.
Fontes versionadas em devDependencies são carregadas sob demanda, permitindo
comparar fallback, webfonts prontas e tokens Figtree/inherit/Sora.

O teste geométrico compara caixas de cada acorde e forma de capo na mesma
linha, verifica respiro >=3.5px (tolerância subpixel para os 4px), ancoragem x,
letra/acordes/forma contra `layoutChartFull(parse(fixture))`, ausência de quebra
interna da palavra e overflow do `.cpv-reading-flow` (o scroller real da linha). Executa desktop e móvel, +2 semitons,
capo 2, resize posterior para 320px e retorno. A fixture é protegida pelo hash.
Screenshots são anexados à execução Playwright; falhas retêm trace local.

Tema: testes em jsdom cobrem livre/controlado, preferências antigas e ausentes,
requests do botão/teclado, prop após mount, retorno ao livre, escrita de outras
preferências e overlay real preservado. Browser testa mudança real de
`prefers-color-scheme` e precedência do host sobre preferência antiga.

## Ajuste do ambiente de testes

Node `v26.4.0` expõe `localStorage` global sem backing file. A suíte anterior
`tests/vue/storage-seam.test.ts` falhou em todos os seis casos existentes com
`Cannot read properties of undefined (reading 'clear')`, antes do mount.
`tests/setup.ts` agora aponta os globais de storage para a janela real do jsdom
fornecida pelo Vitest; não altera runtime nem usa armazenamento da máquina.

A primeira suíte completa passou 243/244 testes. O único erro restante era
`tests/core/blocks.test.ts:11`, cujo pré-requisito exigia CR na fixture Ele Vive
em Mim; o checkout Git contém LF. O teste agora cria apenas a codificação CRLF
em memória a partir da mesma música real, sem modificar qualquer fixture.

## Resultado da rodada de implementação

- `rtk proxy pnpm typecheck`: exit 0.
- `rtk proxy pnpm build`: exit 0, core/PDF/CLI/Vue e declarações produzidos.
- `rtk proxy pnpm test`: **30 arquivos, 244 testes passaram**, incluindo 12 de
  exports/consumo de dist (sem skips).
- `rtk proxy pnpm test:browser`: **10 testes passaram**, cinco em cada engine;
  inclui tipografia da edição/source e marcador pessoal com hit-test e reversão
  reais, além da matriz de leitura/tema.
- Screenshots desktop Chromium e mobile WebKit inspecionados visualmente.
  Na leitura a reserva de largura afasta sílabas quando necessária, sem colisão.

Esta evidência não substitui o aceite do host A6 nem os gates de lifecycle do
responsável pela entrega. WebKit automatizado não é uma validação no Safari
do SDA real; o teste não acessa esse host.

## Preservação no Git e em checkout novo

A revisão de distribuição identificou `core.autocrlf=input`: a fixture original
no working tree tinha 1276 bytes/49 CRLF e SHA d7d80…, mas o blob anterior no
Git tinha 1227 bytes/LF e SHA f7adbb…. `.gitattributes` agora define `-text`
somente para `fixtures/escuta-meu-clamor-sda-86.cho`, e o arquivo original foi
reindexado sem modificar seus bytes. A verificação captura o blob binário
diretamente e extrai `git archive` para conferir o SHA original também fora
do working tree. Isso evita depender de conversão de finais de linha local.
