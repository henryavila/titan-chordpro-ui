# Spec: dois modos de edição + sugestões

Decidido com o operador em 2026-08-30. Substitui o gancho único `onSave(source)` do protótipo
`Titan Chordpro UI.dc.html`, que hoje não distingue quem edita nem para quem a edição vale.

## 1. Modelo de dados: três camadas

```
oficial      cifra publicada no BD do consumer  ← modo "Para todos" escreve aqui
   ↓
overlay      patch ancorado no celular          ← modo "Só para mim" escreve aqui
   ↓
o que o músico lê
```

O overlay **não** é cópia da cifra. É lista de operações ancoradas, para que uma correção
oficial chegue a quem já personalizou. Cada operação guarda:

```js
{ id, type, anchor: { blockIdx, lineIdx, hash }, before, after,
  ctx: { transpose, capo, dual } }   // estado de leitura no momento da criação
```

`ctx` existe porque o ajuste foi feito sobre o que estava na tela: se eu troquei um acorde com
a cifra transposta +2 e capo 3, o `after` que eu digitei vale naquele contexto. Ao aplicar, a
operação é normalizada de volta para o tom escrito da cifra; se o contexto de leitura atual for
outro, o ajuste é reprojetado em vez de escrito cru.

`hash` é do conteúdo original ancorado (linha ou bloco). É o que permite, sem servidor:
reverter item por item, reverter tudo (o original nunca foi sobrescrito) e reaplicar sobre
uma versão nova, sabendo o que não encaixou.

Cópia integral da cifra foi descartada: congela o fork e as correções do responsável nunca
alcançam o músico.

## 2. Escopo de cada modo

**Só para mim (local, neste celular)** — tom e capo fixos por cifra, substituir acorde, mover
acorde de sílaba, comentário/anotação própria, ocultar bloco, reordenar blocos, editar a letra.

**Para todos (sistema)** — tudo o que o editor já faz: letra, estrutura, meta, TAB, partitura,
exclusão de bloco.

Consequência aceita: letra e reordenação no local são as operações de âncora frágil. Tratadas
em 5.

## 3. Disponibilidade e entrada

O consumer declara na inicialização quais modos existem para aquele usuário:

| Cenário | `modes` | Chip "Editar" |
| --- | --- | --- |
| Site público | `["local"]` | entra direto no local |
| Público + logado com permissão | `["local","content"]` | abre a escolha |
| Só leitura | `[]` | chip não aparece |

Com os dois ativos, tocar em **Editar** abre uma escolha explícita, sem terceiro caminho:

- **Só para mim** — "fica salvo neste celular, dá para desfazer a qualquer momento"
- **Para todos** — "altera a cifra do sistema; todos os músicos passam a ler assim"

Com um modo só, entra direto e o chrome indica qual é. **Não há alternador dentro da edição**:
para trocar, sai e entra de novo, escolhendo de novo. Sem memória da última escolha — a
escolha é a confirmação.

## 4. Chrome

**Local.** Badge "Minha versão · 3 ajustes" na barra. Ponto discreto em cada elemento
divergente do oficial; tocar nele oferece "voltar ao original desta linha". Botão **Voltar ao
original** sempre alcançável (dois toques, como o Descartar atual). Salva sozinho — não existe
botão salvar, é o celular do músico.

**Para todos.** Barra com cor/borda de alerta e rótulo permanente "Editando para todos".
Botão único **Salvar** — salvar já vale para todos, sem rascunho de servidor e sem freios
adicionais (decisão do operador). O rascunho local de sessão do protótipo continua, só para
não perder trabalho em queda de conexão.

Sem rede: o modo "Para todos" não abre, com aviso — melhor barrar a entrada que aceitar
edição que falha no save.

## 5. Quando o oficial muda e existe overlay

O app compara a versão publicada recebida com `baseVersion` do overlay. Se mudou, **pergunta
antes**, com granularidade item por item:

> **Esta cifra foi atualizada.** Escolha o que manter dos seus 3 ajustes.
> ☑ Acorde do verso 2 · ☑ Tom em Ré · ☐ Letra da linha 12 *(a linha oficial mudou)*
> [Manter os marcados] [Adotar a versão nova]

Regras:
- Ajuste cuja âncora sobreviveu (hash igual) vem marcado.
- Âncora perdida vem desmarcado, com o motivo.
- **Colisão de letra** (eu editei a linha 12 e o responsável também) abre comparação lado a
  lado daquela linha: minha versão / versão nova, e eu escolho.
- Enquanto não decidir, o músico lê a versão que já conhecia — nada muda debaixo dele no meio
  de um ensaio.

Idade do overlay não invalida nada: um overlay antigo é sempre reaplicado, e o que não encaixar
aparece na lista como não aplicável.

## 5b. Alternar original / minha versão

Existindo overlay, a leitura tem um switch entre **Original** e **Minha versão** — na barra de
leitura, ao lado do badge. É leitura, não edição: alternar não apaga nem cria ajustes, só troca
o que está na tela. Serve para conferir o que mudou e para tocar pelo oficial num ensaio de
equipe sem desfazer nada. O estado do switch é por cifra e persiste.

O overlay convive com o transpose e o capo de sessão: o tom fixo da personalização é o ponto de
partida, e o ajuste de sessão continua funcionando por cima dele.

## 6. Sugerir alteração

Qualquer usuário, inclusive sem login, pode enviar a **personalização local inteira** como
sugestão. O consumer liga ou desliga o recurso; contenção de abuso (rate limit, captcha,
moderação) é responsabilidade dele — risco aceito pelo operador.

- Botão **Sugerir alteração** na barra do modo local, ativo quando há ao menos um ajuste.
- Envia o pacote de operações + a versão base. Sem campo de justificativa.
- O músico vê "Sugestão enviada" e nada mais: sem status, sem aviso de aceite ou recusa. Os
  ajustes seguem locais e funcionando.

**Fila do admin (nossa tela, a desenhar).** Um lugar único, agrupado por cifra, em três níveis:

1. **Cifras com pedidos** — lista das cifras que têm sugestão pendente, com a contagem.
2. **Pedidos daquela cifra** — os vários envios, cada um com data e quantos ajustes traz.
3. **Revisão do pedido** — cada operação com antes/depois no contexto da linha; aceitar ou
   recusar item por item. Aceitar grava direto no oficial.

**Efeito no autor:** ajuste aceito sai do overlay dele — virou oficial, não faz sentido seguir
marcado como personalizado. Cai no fluxo da seção 5, com os itens aceitos já resolvidos.

## 7. Contrato com o host

Requisitos novos para o consumer:

```js
songId        // id estável por cifra
version       // versão/timestamp da última publicação  (confirmado: existe)
modes         // ["local"] | ["local","content"] | []
suggestions   // boolean
onSaveContent(source)            // modo para todos, já vale para todos
onSuggest({ baseVersion, ops })  // sugestão
```

Storage local: `cpv:my:{songId}` = `{ baseVersion, ops[] }`, por cifra. As preferências de
leitura seguem em `cpv:prefs`, global — são coisas diferentes e não devem se misturar.

## 8. Export

O músico com personalização escolhe na hora do export: **minha versão** ou **oficial**.
Vale para PDF e `.cho`. A versão pessoal sai com marca no cabeçalho, para não circular na
equipe como se fosse a cifra oficial.

## 9. Impacto no protótipo

1. `mode` deixa de ser booleano view/edit: passa a `view | edit-local | edit-content`.
2. Camada de patch — aplicar, reverter item, reverter tudo, reaplicar com relatório. É a peça
   nova de maior peso; hoje todo o editor opera sobre a string de source.
3. Restringir as ferramentas no `edit-local` (nada de excluir bloco, TAB, partitura, meta).
4. Tela de escolha de modo, chrome distinto por modo, marcadores de divergência.
5. Diálogo de atualização com caixas e a comparação lado a lado de linha.
6. Switch Original / Minha versão na barra de leitura.
7. Botão e confirmação de sugestão; fila do admin em três níveis.
8. Export com escolha de versão.

Ocultar bloco segue o comportamento atual: deixa a faixa fina que traz o bloco de volta. Quem
não quer o bloco remove — mas remover é operação do modo "para todos".
