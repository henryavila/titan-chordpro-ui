# Sincronização com o template de design (2026-09-09)

O agente do Claude Design devolveu uma revisão respondendo aos dois handoffs abertos e
acrescentando duas features. Quatro frentes implementadas: guarda de superfície, colisão
de acordes, modo ensaio e importar cifra.

## Decisões de produto que o design fechou

- **Embed = Saída A.** Não existe modo "artigo" e não vai existir. O frame continua sendo
  a lei; quem compõe uma página que rola é o **host**, com o frame inteiro em
  `position:sticky`. O que mudou foi passar a **fiscalizar**: `useSurfaceGuard` acusa em
  console e na tela quando o ancestral não tem altura. Fecha a pergunta aberta de
  VISAO §9 Q2 dentro do frame.
- **Colisão de acordes: venceu a versão do design.** O pacote já tinha solução própria em
  `readingWords.ts`, mas dava `4px` de folga ao acorde dentro da palavra contra `0.8em`
  fora — e é exatamente dentro da palavra que o bug acontecia. Agora a reserva é
  **uniforme**, e a quebra de linha é a palavra (`cells` + `tail`).
- **Regra normativa** de ancoragem/folga entrou em `design-handoff/01-screens.md`.

## Decisões de arquitetura tomadas aqui (não vêm do template)

- **Não existe `fetch` em `src/`, e isso é regra.** `ChartStore` é síncrono de propósito.
  Tudo que é rede entra por callback do host: `loadSong`, `fetchChart`, `readPdf`.
  Rejeitada a proposta de uma prop de URL para a lista do ensaio — colocaria auth, CORS,
  retry, timeout e cache dentro de uma biblioteca de renderização, e não economiza viagem
  (o host já requisitou algo para saber *qual* ensaio mostrar).
- **`pdfjs-dist` é peer opcional + loader injetável**, não a URL de CDN fixa que o template
  usa. Idem `readPdf` como prop: quem nunca importa PDF não carrega a dependência.
- **Dois conversores OnSong, de propósito.** `onsong.ts` normaliza calado dentro do
  `parse()` e precisa continuar conservador (roda em toda fonte); `import-chordpro.ts` é o
  caminho explícito e faz mais (refrão, tabs, seções em português). `tests/core/import-chordpro.test.ts`
  trava a relação: falha se discordarem sobre o que é um cabeçalho OnSong.
- **`setlistDemo` do template não foi portado** — monta a lista a partir de fixtures
  embutidas, o que é andaime de prévia de canvas e seria lixo numa biblioteca publicada.

## Números que decidem o `loadSong`

Medido nas fixtures reais: **1.389 B por cifra (624 B gzip)**. 20 cifras ≈ **27 KB crus /
12 KB gzip**, contra 68 KB gzip do próprio bundle do viewer. Para 15–20 músicas, mandar
tudo inline em `songs` é irrelevante no peso. `loadSong` compensa em acervo grande ou
cifra com permissão por música — não num ensaio.

## Quebra de contrato aceita

Com `songs`, a identidade da música passa a ser o `id` da entrada, e é ela que forma a
chave do overlay pessoal (`cpv:my:{id}`). **Decisão do usuário: não migrar** a chave
antiga. Host com leitores que já têm versão pessoal deve escolher `id` iguais ao `songId`
que usava antes.

## Lacuna aberta — precisa de decisão

Não há como o host dizer *"esta música existe mas ainda não tem cifra"*. Omitir `source`,
`loadSong` devolver `""` e `loadSong` rejeitar **colapsam os três em "Não carregou"**
(falha de rede). Consequência: numa lista, uma música sem cifra nunca oferece o fluxo de
criar que a fase D construiu — que era o propósito dele.

O template faz igual (`if (!txt.trim()) throw new Error("vazio")`), então **não é
regressão**; é lacuna do desenho ratificado. Comportamento atual está fixado em
`tests/vue/setlist.test.ts` ("cannot yet tell 'no chart yet' apart from 'could not fetch'").

Saída proposta, não aplicada: **`loadSong` resolvendo vazio = "sem cifra ainda"** (oferece
Importar / Começar em branco) vs **rejeitar = falhou** (oferece Tentar de novo). Decidir
se aplicamos ou se volta ao agente de design.

## Ferramenta

O `DesignSync` serve **revisão desatualizada** do canvas; o MCP `claude-design` serve a
atual e tem `offset`/`limit` para passar do teto de 256 KiB. Detalhe e receita de leitura
em janelas: memória de usuário `design-canvas-location`.
