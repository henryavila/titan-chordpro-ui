# O que ainda falta implementar

Estado do protótipo `Chordpro Viewer v2.dc.html` em relação ao brief.
Itens resolvidos nesta rodada estão em `## Resolvido` no fim, para o revisor conferir.

## 1. Decisões que dependem do time (não são código)

**Contrato de entrada com o host.** O protótipo aceita a cifra por uma prop `source` (string
ChordPro) e cai nas fixtures locais quando ela está vazia. Falta fechar do lado do host: quem
controla o estado *loading*, se a entrega é síncrona ou promessa, e se o host manda também título e
tom quando o arquivo não declara (hoje o viewer só lê o que está na cifra).

**Tela cheia em embed.** `requestFullscreen` só funciona se o iframe do host tiver
`allow="fullscreen"`; sem isso o fallback usa `position:fixed`, que fica preso ao frame. É
configuração do host, não do viewer.

**Escopo da persistência.** Tema, bias e modo ajuste são gravados em `localStorage`
(`cpv:prefs`). No app real decidir se isso é por dispositivo ou por conta do usuário.

**Capo no cabeçalho do PDF.** Hoje o rótulo "Tom X · Capo n" aparece em todas as páginas.
Confirmar se é o desejado ou só na primeira.

## 2. Revisão de layout pendente

**Mobile 360–430px.** Existe agora um arranjo estreito (abaixo de 480px a meta BPM/compasso é
omitida e o grupo de tom ocupa a linha inteira), mas ele **não foi validado em dispositivo real** —
é o principal ponto de revisão desta rodada.

**Tabs em telas estreitas.** A tablatura mantém `overflow-x:auto` e não participa do modo ajuste:
em 360px exige rolagem horizontal. Aceitável ou precisa encolher?

## 3. Parser / export — limites conhecidos

- Diretivas não suportadas (`{define}`, `{chord}`, `{new_page}`, `{textfont}`) caem em `meta` e
  desaparecem silenciosamente.
- Enarmonia segue apenas a presença de `b` na `key`; depois de transpor, tons como F#/Gb podem sair
  com o acidente menos confortável para o instrumento.
- Sem fallback de título/subtítulo vindo do host quando a cifra não declara.
- Fixtures reais trazem hifenização manual de sílabas com espaços (`pala [Dsus]-  vra`). O viewer
  respeita o texto como está — se isso incomoda na leitura, é decisão de conteúdo, não de render.

## 4. Fora de escopo desta rodada

- Manter a tela ligada durante o ensaio (Wake Lock).
- Impressão direta (Ctrl+P) sem passar pelo PDF gerado.
- i18n: todas as strings estão em português no template.

---

## Resolvido

- **Export PDF real** (jsPDF 2.5.1 sob demanda, A4 sempre) com cabeçalho por página, refrão com
  régua, painel de execução, tab que nunca é cortada, e estado de erro visível.
- **Arraste durante a auto-rolagem**: a rolagem continua da posição do músico, sem puxar de volta.
- **Resize/reflow durante a rolagem**: preserva a fração lida em vez do pixel; velocidade base
  recalculada só quando a música ou a altura do conteúdo muda.
- **Erro de leitura grave**: fonte não-ChordPro ou sem linhas legíveis mostra tela de erro
  (prop `forceParseError` força o estado para revisão).
- **`{capo:}` do arquivo** é dica de arranjo; **não** pré-carrega o capotraste ao vivo (começa em 0). Export de leitura grava `{transpose:}` e não reescreve `{key:}`.
- **Acordes dentro de comentários** agora são transpostos junto.
- **Acorde no meio de palavra** sai do fluxo (largura zero) para não abrir buraco na letra.
- **Alvos de toque** do transpose: 40×34px dentro de uma pílula de 38px.
- **Micro-descoberta do modo ajuste**: dica única, dispensável, gravada em `localStorage`.
- **Acessibilidade**: `role="status"`/`aria-live` no toast, `role="alert"` nas faixas de erro,
  `role="dialog" aria-modal` na folha de export com foco inicial, Tab preso e retorno de foco ao
  fechar, e `prefers-reduced-motion` neutralizando animações.
- **Contraste verificado**: `#17713C` sobre `#F5F6F8` ≈ 5.3:1 e `--muted` `#5B6270` sobre o vidro
  claro ≈ 5.8:1 — ambos passam AA para texto normal.
