# Padrão visual de tablatura e partitura

Referência de produto e engenharia para os trechos Guitar Pro/MusicXML do
Titan. Pesquisa em fontes primárias consultadas em **30/09/2026**.

**Decisão do projeto:** seguir o perfil visual Guitar Pro solicitado pelo usuário:
**mínima com uma haste curta; semínima com uma haste longa**. Isso vale para
**Ritmo na base**, **Ritmo estendido** e PDF. A haste dupla da tablatura completa
do LilyPond não é o padrão escolhido para o Titan.

**Regra geométrica ratificada pelo usuário:** no modo na base, a haste da mínima
mede **50%** da haste da semínima. Ao estender o ritmo, a mínima conserva tamanho
e posição; a semínima cresce em direção à nota. A semibreve permanece sem haste.
As figuras menores mantêm suas barras/bandeirolas e a extensão já aplicável.

O adaptador em `src/vue/chart/notation-renderer.ts` aplica a regra nos dois modos
e nos dois motores de desenho. `tests/browser/rhythm-audit.spec.ts` verifica a
haste única, a proporção de 50% e a invariância da mínima ao alternar o modo.

## Evidência e limites da pesquisa

Não existe uma única apresentação que possa ser adotada por analogia entre
programas. As fontes consultadas distinguem os seguintes casos:

| Referência | Evidência encontrada | Consequência para o Titan |
|---|---|---|
| Partitura convencional | Mínima com cabeça vazada e semínima com cabeça preenchida; ambas têm haste. O exemplo do manual GP7 mostra pauta e TAB sem ritmo na TAB. | Não transportar a distinção pela cabeça da nota para números de casas. [GP7, §2/4/2, página 11 do PDF](https://blog.guitar-pro.com/wp-content/uploads/2018/10/GuitarPro7-user-guide.pdf#page=11). |
| Guitar Pro 8 | A folha de estilo controla extensão das hastes para dentro da TAB, ocultação do ritmo, círculos em mínimas/semibreves e posição do ritmo por voz. | Tratar essas escolhas como opções distintas, não como uma única convenção imutável. [Manual de notação da folha de estilo](https://www.guitar-pro.com/docs/gp8/preferences-stylesheet/stylesheet/notation). |
| LilyPond | `tabFullNotation` distingue a mínima por haste dupla; a TAB simples pode omitir a notação de duração. | É uma convenção válida desse sistema, mas não autoriza mudar o perfil solicitado para o Titan. [Tablaturas do LilyPond](https://lilypond.org/doc/v2.26/Documentation/notation/common-notation-for-fretted-strings#default-tablatures). |
| alphaTab | `Hidden`, `ShowWithBeams`, `ShowWithBars` e `Automatic` controlam ocultação, agrupamento e detecção automática. | São opções do motor, não prova de fidelidade ao Guitar Pro. [Enum TabRhythmMode](https://www.alphatab.net/docs/reference/types/tabrhythmmode). |

**Limite importante:** as páginas e imagens oficiais consultadas não fornecem uma
medida de haste curta/longa nem um comparativo isolado de mínima e semínima nos
dois modos de TAB. A regra curta/longa acima vem da referência de uso indicada
pelo usuário e é normativa para o projeto; não é uma citação textual do manual.
A proporção de **50%** é uma decisão explícita do usuário para o Titan, não uma
medição extraída dessas fontes. Não declarar paridade com todas as versões e
folhas de estilo do Guitar Pro sem uma captura de referência verificável.

A imagem de valores rítmicos do manual GP8 mostra **pauta com ritmo e TAB sem
hastes**. Ela confirma valores musicais, mas não serve como prova da geometria de
hastes na TAB. [Exemplo oficial inspecionado](https://www.guitar-pro.com/img/gp-docs/gp8/en/rhythm_notions.webp).

## Contrato dos três modos do Titan

| Modo | Resultado esperado | O que deve continuar distinguível |
|---|---|---|
| Ritmo na base (`base`) | Hastes e barras rítmicas abaixo das cordas; nenhuma haste invade os números das casas. É o padrão ao cadastrar. | Mínima com 50% da haste da semínima, subdivisões por barras/bandeirolas, pontos e quiálteras. |
| Ritmo estendido (`extended`) | Hastes das figuras aplicáveis se prolongam em direção às notas na TAB, com interrupções para não riscar os números. | A mínima mantém exatamente a haste curta do modo na base. A semínima se estende até a nota. Não acrescentar segunda haste. |
| Sem ritmo (`none`) | Esconde a camada de hastes, barras/bandeirolas, pontos de duração e indicações de quiáltera da TAB. | Casas, cordas, compassos e técnicas continuam legíveis. As durações do arquivo permanecem intactas. |

**Decisão Titan:** a projeção sem ritmo não apaga automaticamente pausas ou
articulações que o motor já desenha. Essa política não deve ser confundida com
uma equivalência exata à TAB mínima de outro programa.

Os três modos são preferências de apresentação, não modos de reprodução nem
conversão de conteúdo. A escolha do autor fica em `ScoreReference.rhythm`; a
preferência de leitura usa `STORE_KEYS.tabRhythm`, sem editar o source. Ver
[contrato do consumer](CONSUMER.md#solos-em-guitar-pro--musicxml).

## Vocabulário das durações

Valores abaixo são relativos à **semínima = 1**. Não significam que todo compasso
ou todo BPM usa semínima como pulso. O desenho não pode ser deduzido da quantidade
de acordes ou da largura ocupada na tela.

| Figura | Valor relativo | Pauta convencional | TAB com ritmo desejada no Titan |
|---|---:|---|---|
| Semibreve | 4 | Cabeça vazada, sem haste | Sem haste rítmica; não acrescentar uma haste de mínima. |
| Mínima | 2 | Cabeça vazada e haste | **Uma haste de 50% da semínima na base**, sem barra/bandeirola; não cresce no modo estendido. |
| Semínima | 1 | Cabeça preenchida e haste | **Uma haste longa**, sem barra/bandeirola. |
| Colcheia | 1/2 | Uma bandeirola ou nível de barra | Um nível de barra/bandeirola. |
| Semicolcheia | 1/4 | Dois níveis | Dois níveis. |
| Fusa | 1/8 | Três níveis | Três níveis. |
| Semifusa | 1/16 | Quatro níveis | Quatro níveis. |

Os valores musicais são confirmados pelo [manual de fundamentos do GP8](https://www.guitar-pro.com/docs/gp8/score/musical-notation).
A geometria curta/longa na última coluna é a decisão Titan descrita acima.
O número de barras se refere à subdivisão de duração, não à quantidade de vozes.

O agrupamento pode ligar notas de valores diferentes e conter barras parciais.
Não substituir grupos por bandeirolas individuais só para simplificar o desenho.
A interpretação de agrupamento deve preservar o arquivo e a métrica.

Um ponto acrescenta metade do valor original; dois acrescentam metade mais um
quarto. O ponto não transforma a mínima em semínima: conserva-se a figura e
acrescenta-se o sinal. Nas quiálteras, respeitar a razão do arquivo: `3:2` é três
no tempo de duas figuras equivalentes; `5:4` é cinco no tempo de quatro.
Não assumir que toda quintina cabe em um pulso. Pausas têm seus próprios sinais,
não são números de casa nem notas com a haste apagada.
[Fundamentos, pontos e pausas](https://www.guitar-pro.com/docs/gp8/score/musical-notation),
[quiálteras no GP8](https://www.guitar-pro.com/docs/gp8/score/note/tuplet).

## Opções do Guitar Pro que não devem ser confundidas

O manual GP8 permite mostrar ou esconder ritmo quando há pauta, estender hastes
para dentro da TAB e escolher ritmo acima/abaixo/oculto por voz. Também documenta
círculos em mínimas/semibreves, barras sobre pausas e a variante de pausa de
semínima como traço. Essas opções não são sinônimos entre si.
[Configuração oficial](https://www.guitar-pro.com/docs/gp8/preferences-stylesheet/stylesheet/notation).

Referências visuais inspecionadas, hospedadas pelo fabricante:

- [Ritmo estendido ligado](https://www.guitar-pro.com/img/gp-docs/gp8/en/extend_rhythmic_inside_tablature_example_on.webp).
- [Ritmo estendido desligado](https://www.guitar-pro.com/img/gp-docs/gp8/en/extend_rhythmic_inside_tablature_example_off.webp): mostra hastes/barras abaixo das cordas.
- [Círculos ligados](https://www.guitar-pro.com/img/gp-docs/gp8/en/display_circles_on.webp) e [desligados](https://www.guitar-pro.com/img/gp-docs/gp8/en/display_circles_off.webp): exemplos da opção; não comprovam sozinhos o comprimento das hastes.
- [Posição do ritmo por voz](https://www.guitar-pro.com/img/gp-docs/gp8/en/rhythmic_position_in_voices.webp).

**Decisão Titan:** não introduzir círculos ou novas opções de direção de voz para
compensar a distinção ausente entre mínima e semínima. Essas extensões precisam
de uma decisão própria. A referência de interface é o Guitar Pro, mas não estamos
prometendo implementar todas as opções da sua folha de estilo.

## Restrições para o motor

`ShowWithBars` controla barras conectadas; `ShowWithBeams` usa marcas individuais.
Trocar um pelo outro não implementa “hastes curtas” nem “não estender para dentro
da TAB”. `rhythmHeight` controla o espaço rítmico abaixo da TAB; reduzir esse
valor globalmente também não distingue figuras.
[TabRhythmMode](https://www.alphatab.net/docs/reference/types/tabrhythmmode),
[rhythmHeight](https://alphatab.net/docs/reference/settings/notation/rhythmheight/).

O adaptador local deve preservar agrupamentos, pontos, pausas, ligaduras, técnicas,
quiálteras e vozes. Distinguir durações alterando o espaçamento horizontal ou a
cor é insuficiente. O comprimento relevante deve ser comparado com notas na
mesma corda, no mesmo zoom e com a mesma direção de haste.

Tela SVG e PDF canvas devem compartilhar a regra de geometria. Não corrigir só o
SVG com CSS, nem modificar durações do modelo para obter outro desenho. Tema,
zoom e largura não mudam a figura musical. Continuam válidas as regras de
[`MARCAS-X.md`](MARCAS-X.md): essas marcas de ChordPro não são uma tradução da
notação rítmica dos arquivos Guitar Pro.

## Verificação do padrão

O corpus musical existente tem origem rastreável em
[`fixtures/notation/README.md`](../fixtures/notation/README.md):

| Fixture | Cobertura útil |
|---|---|
| `notes.gp` / `notes.gp5` | Semibreve a semifusa e pausas; comparar mínimas/semínimas na mesma corda. |
| `rhythm.gp` | Agrupamentos, bandeirolas, ponto de aumento e tercinas. |
| `tuplets.gp` | Tercinas e quintinas, além de mínima. |
| `chords.gp` | Várias notas simultâneas; hastes não podem riscar casas. |
| `bends.gp` / `bends.musicxml` | Técnicas e ligaduras junto ao ritmo. |

Esses arquivos são evidência dos **dados musicais**, não imagens de referência
geradas pelo Guitar Pro. Uma captura produzida pelo alphaTab/Titan não pode ser
usada como prova da convenção visual do Guitar Pro.

Critérios de aceite:

1. Mínima e semínima têm **uma** haste cada. Na base, para notas equivalentes
   na mesma corda, `altura(mínima) = 0,5 × altura(semínima)`.
2. A mínima mantém altura e posição entre `base` e `extended`. A semínima fica
   maior quando há distância adicional até a nota (na última corda, pode não haver
   extensão extra). As pontas inferiores permanecem alinhadas na mesma
   referência rítmica; encurta-se a mínima pela ponta superior.
3. Semibreves não ganham haste. Colcheias a semifusas mantêm de um a quatro
   níveis de barras/bandeirolas; pontos, pausas e quiálteras não desaparecem.
4. Verificar operações efetivas de desenho em SVG e no canvas usado pelo PDF,
   além de inspecionar capturas. Comparar no mesmo zoom, corda e direção.
   Não usar espaçamento horizontal como substituto do sinal de duração.
5. Conferir acordes, vozes, temas e escalas para não riscar números, duplicar
   sinais ou cortar hastes. `Sem ritmo` continua sem a camada de duração,
   preservando o arquivo e a política de pausas documentada.

**Limite de equivalência externa:** uma futura comparação pixel a pixel com
Guitar Pro deve registrar versão, zoom, vozes e folha de estilo. Isso não bloqueia
a regra de 50% já ratificada, mas impede chamar medidas arbitrárias de padrão
universal do GP. Não aceitar snapshots que consolidem a antiga haste dupla.

## Ordem de autoridade

A decisão de produto deste documento e as instruções explícitas do usuário
fixam o perfil Titan. Fontes oficiais sustentam afirmações sobre cada programa;
exemplos de outro programa não substituem o perfil escolhido. Defaults do motor
e snapshots existentes são verificações subordinadas, não a especificação.
