# Revisão: criar/editar partitura e tablatura

Feita em 2026-09-01 sobre `Editor Partitura.dc.html`, `Titan Chordpro UI v2.dc.html` e
`fixtures.js`. Decisão do operador nesta rodada: **o editor de partitura passa a ser o único
jeito de criar e editar TAB e partitura**, com Salvar/Descartar explícitos, valendo igual em
celular e desktop.

## 1. O que estava errado

**Três caminhos para a mesma coisa.** A TAB era um `textarea` de texto ASCII num diálogo, a
partitura era um PNG escolhido num picker, e o editor VexFlow era um protótipo solto que não
abria de lugar nenhum e cujo botão "Salvar no bloco" não fazia nada. Nada do que o editor
produzia chegava à cifra.

**A partitura em imagem não é música, é figura.** Não transpõe, não segue o capo, não entra no
PDF, não dá para corrigir uma nota, e a auto-rolagem tinha de chutar a duração do trecho pela
altura do PNG.

**Editar TAB era editar desenho ASCII.** Alinhar traço com o dedo, em fonte monoespaçada, num
campo de 190px. As ferramentas ("compasso vazio", "repetir último", "limpar casas") operavam
sobre texto, então nada garantia que o compasso fechasse — e não havia edição por casa, que é o
gesto natural de quem escreve tab.

**Não dava para ver o mesmo trecho como pauta e como tab.** Eram blocos de tipos diferentes.

**Entrada e saída.** Entrar exigia selecionar o bloco pela alça `⋮⋮` e achar "Editar TAB" na
barra contextual — o toque no próprio bloco não fazia nada. Sair pelo Esc descartava o que
tinha sido digitado, sem aviso e sem checar se havia alteração.

**Editor não cabia no celular.** Cabeçalho de seis controles numa linha só, rodapé de painéis
lado a lado: abaixo de ~900px a barra quebrava e a pauta era espremida a zero. O alvo é
celular e desktop igualmente.

**Seleção invisível na pauta.** A nota selecionada só aparecia na grade de cordas; na partitura
desenhada, nada. E clicar numa nota do desenho não fazia nada.

**Detalhes que corrompiam a escrita.** Trocar a corda de uma nota já escrita reescrevia também
a figura e o slide dela; a digitação de casa com dois dígitos (1 depois 2 = casa 12) continuava
valendo depois de mudar de nota; o teclado global engolia dígitos, setas e espaço mesmo com o
foco em outro campo; não havia desfazer dentro do editor.

## 2. O que mudou

**Modelo único — `partitura.js`.** Um arquivo com o modelo (altura + figura; corda/casa
derivada), a serialização ChordPro (`{sos}…{eos}`), a leitura do formato e o desenho VexFlow.
Editor e leitura usam o mesmo código: o que é escrito é exatamente o que é lido.

Formato salvo, uma linha por compasso:

```
{sos: time=4/4 key=G tempo=72 tuning=EADGBE}
| d4:8 e4:8 g4:q a4:8~s b4:8 |
| g4:h d4:q e4:q |
{eos}
```

`~s` slide, `~l` ligadura de compasso, `r:` pausa, `@corda/casa` só quando o dedilhado foi
fixado à mão. Figura maior do que o resto do compasso é partida e ligada, então a barra cai
sempre no tempo certo.

**Leitura desenha a partitura.** O bloco `{sos}` é renderizado na cifra com pauta e tab, e traz
um seletor por bloco: Pauta / TAB / Ambos. O trecho passa a ser contável pela auto-rolagem.

**Uma porta só para editar.** O bloco de partitura tem "Editar" na própria legenda, no modo
"para todos"; a barra do bloco continua funcionando. O editor abre em tela cheia sobre a cifra
— em 390px não sobra espaço útil para uma gaveta com pauta, palheta de figuras e braço.

**TAB antiga entra e sai convertida.** Um `{sot}` de texto abre no editor importado (cada
coluna com dígito vira uma semínima) com um aviso explícito de que o texto não trazia ritmo, e
sai gravado como `{sos}`.

**Inserir → Partitura ou solo** cria um bloco vazio e abre o editor nele; cancelar desfaz a
inserção, sem bloco fantasma. "Imagem de partitura" continua no menu como caminho separado,
para quem só tem o PNG.

**Salvar/Descartar explícitos.** Selo "alterado" na barra, Descartar em dois toques quando há
trabalho novo, Salvar grava no bloco e fecha. Esc = Descartar. Com o editor aberto, o teclado é
dele: o viewer não responde a nada.

**Responsivo de verdade.** Abaixo de 860px a barra vira duas linhas (título + ações em cima,
visão embaixo), a pauta tem altura mínima garantida e rola na horizontal, e os painéis de
entrada empilham. Nada de alvo abaixo de 26px.

**Correções no editor.** Seleção verde na pauta e na tab; clicar na nota desenhada seleciona;
trocar a corda preserva figura e slide; dois dígitos só valem na mesma nota; teclado ignora
campos de texto; Desfazer (Ctrl+Z) com 60 passos; compasso incompleto aparece em vermelho na
faixa de status; `aria-pressed` nos controles de estado e rótulo de célula com corda e casa.

## 3. Aberto

- **`Chordpro Viewer v2.dc.html`** (leitura ratificada) ainda não renderiza `{sos}` — hoje só o
  `Titan Chordpro UI v2`. Precisa do mesmo bloco de leitura.
- **PDF** não desenha o bloco `{sos}` (o export herdado escreve TAB em texto). Com o modelo
  pronto, dá para gerar as duas pautas no PDF — é a próxima peça óbvia.
- **Transposição não alcança a partitura.** O `{sos}` guarda alturas absolutas; transpor a
  cifra deveria transpor o solo junto (e o capo, deslocar as casas). Decisão de produto: seguir
  o transpose da leitura ou ficar fixo no tom escrito.
- **Modo local** continua sem partitura/TAB, conforme o spec; hoje o toque avisa por toast.
- **Compasso e tom** do bloco só mudam pelo source — o editor lê `time`/`key`/`tempo`, mas não
  oferece controle para trocá-los.
- **Acordes sobre a pauta** (dedilhado com harmonia escrita em cima) não existem no modelo.
- **Toque real no celular** não foi validado em dispositivo: a grade de cordas depende de
  arrasto horizontal dentro de uma página que rola na vertical.
