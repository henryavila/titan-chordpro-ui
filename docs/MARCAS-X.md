# Marcas `x///` — tempo em trecho sem voz

> **SoT desta convenção.** Consumer, gerador de ChordPro e agente leem daqui.
> Implementação: `src/core/timeline.ts` (`lineBeats`, `isPlayedLine`, `marksPerBeat`,
> `buildTimeline`), peso em `BlockMusic`, lente em `src/core/layout.ts`.
> Entrevista ratificada 2026-09-11. Furos conhecidos estão em [Quirks](#quirks-não-consertar-nesta-rodada):
> nesta rodada o código vence; o doc os nomeia em vez de escondê-los.

## Entrevista

| Campo | Decisão |
|---|---|
| **Problema** | `x///` é a forma oficial de marcar tempo em trecho sem voz. Faltava um lugar canônico para consumer e para IA — o erro da lente Só letra foi tratar marca de relógio como lixo visual. |
| **In-scope** | Gramática `x`/`/`; linha tocada vs cauda cantada; o que a engine **não** adivinha; compasso composto 6/8–12/8; lente Só letra; lint no `lintSource` se faltar marca. |
| **Fora** | Não consertar nesta rodada os quirks do relógio (ver abaixo). Sem UI de ensino no viewer. Sem segunda sintaxe de duração. |
| **Done-when** | Página canônica (`docs/MARCAS-X.md`) + seção no `CONSUMER.md` + ponte em `AGENTS.md`/`SPEC.md` + aviso no `lintSource`. |
| **Stakes** | Cifras de produção e qualquer host/gerador que passe a escrever ou apagar `x///` com base neste doc. Mentir aqui quebra relógio e lente. |
| **Fontes** | `src/core/timeline.ts`, `BlockMusic` em `src/core/types.ts`, README (auto-rolagem), `db/RELATORIO-CHORDPRO-PRODUCAO.md` §8, fixtures, `src/core/layout.ts` (lente), `src/core/lint.ts`. |

---

## O que é

`x///` **não é letra**. É a única duração **exata** que uma linha ChordPro deste dialeto oferece, e existe para trechos **tocados e não cantados**: introdução, interlúdio, solo, final — papel sem voz.

Quem canta não precisa ver isso. Quem toca, e o relógio da auto-rolagem, precisam. O arquivo guarda as marcas; a leitura é que escolhe se as mostra.

## Gramática

| Marca | Significado |
|---|---|
| `x` | **Sempre** a cabeça do tempo (o 1 do compasso / o downbeat daquele grupo) |
| `/` | Um tempo que **não** é cabeça |

Não precisa de `x` em todo grupo. Só `//` é válido: em 4/4 são **2 tempos**. No fim de uma frase, continuam 2 tempos **ali** — não se descarta por faltar a cabeça.

A âncora é o acorde: a marca vem **depois** do `]`.

```
[G]x///                 cabeça + 3 — em 4/4, um compasso inteiro de G
[Dsus]x/ [D]//          cabeça em Dsus, 3 tempos seguintes (o último grupo sem x)
[Gsus]x [G]/ [G9]/ [G]/ um acorde por tempo; só o primeiro é cabeça
[G]x                    1 tempo, e é cabeça
[Cm]//                  2 tempos, sem cabeça — resto da frase em 4/4
[D]/  [G]/              2 tempos, nenhum é cabeça
```

`lineBeats('[Cm]//')` é `2`. `lineBeats('…cantar.  [Cm]//')` também é `2` (cauda).

A engine só conta `x` e `/` quando o vizinho é o que um músico escreveria: depois de `]`, espaço, outro `x` ou outro `/`; e o próximo é fim, `/` ou espaço. Barra **dentro** de acorde (`[G/B]`) ou de palavra (`cami/nhar`) **não** conta. Hífen de sílaba (`pala [Dsus]- vra`) **não** é marca de tempo.

## Dois lugares (não misturar)

### 1. Linha tocada — sem letra

```
{c:(INTRODUÇÃO)}
[A]x///    [E]x///    [F#m]x///    [D]x///
```

Depois de tirar os `[acordes]`, sobra só `x`, `/` e espaço. Essa linha **é** o tempo daquele papel, no BPM da cifra. Intro, interlúdio e final se escrevem assim. O relógio **não calibra** esse trecho: as marcas já são a resposta.

### 2. Cauda no fim de uma linha **cantada**

```
[D]Preciso ouvir Tua [A]voz a me falar [B]x///
Je[G7]sus, Tu És o meu can[A7]tar.  [Cm]//
```

As marcas **somam** tempo à estimativa da linha. **Não** substituem a estrofe. Um `[Am]x///` no fim do verso não faz o verso durar quatro pulsos; um `[Cm]//` no fim da frase ainda são **2 tempos ali**.

## O que a engine não adivinha

| Escrito | O que o Titan faz |
|---|---|
| `[G] [C] [D]` numa linha sem letra e sem `x///` | Linha **tocada**, mas **0 tempos**. O relógio não inventa compassos. O `lintSource` avisa. |
| Linha cantada sem marca | Estimativa (`BEATS_PER_ROW` pulsos), esticada/comprimida para fechar em `{duration:}`. |
| BPM sozinho, sem `{duration:}` | **Não** liga o Rolar. Gate duro: `{duration:}` (m:ss, ≥ 20 s). |
| Contar acordes e chamar de compassos | Proibido. `[G] [A] [B] [C]` pode ser quatro compassos ou quatro tempos. |

## Compasso composto

`{time:}` entra inteiro (numerador **e** denominador). `{tempo:}` nomeia o **pulso sentido**. Uma marca `x///` é uma unidade do **denominador**.

| `{time:}` | Pulsos por compasso (`beatsPerBar`) | Marcas por pulso (`marksPerBeat`) |
|---|---|---|
| 4/4, 3/4, 2/4 | 4, 3, 2 | 1 |
| 6/8 | **2** (não 6) | **3** |
| 9/8 | 3 | 3 |
| 12/8 | 4 | 3 |

Em 6/8, `[E]x// [F#m7]x// [D9]x// [D9]x//` são dois compassos (quatro grupos de três marcas). Lido como 1 marca = 1 pulso, vira o triplo do tempo — e o músico vê o acorde mudar fora da barra.

Uma cifra 6/8 **escrita** como `{time: 3/4}` distorce toda intro com `x///`. Isso é erro de cifra, não da engine.

## Lente Só letra

Quem canta com a banda não lê acorde nem relógio. A lente `letra`:

- some acordes, tab, partitura e imagem
- some **linhas** só de ritmo / só de acorde
- **apaga as marcas** (`x///`, `/`, `x` de compasso) das linhas cantadas que restam
- **não reescreve o arquivo**

O relógio do músico que **toca** continua a ver as marcas (lente desligada). Agente: esconder na leitura ≠ apagar no source.

## Lint

`lintSource` avisa `trecho sem voz sem x/// (N linha(s))` quando uma linha tem acorde, não tem letra, e `lineBeats` é 0. Tab (`{sot}`) e partitura (`{sos}`) ficam de fora — o `x` da TAB é mudo de corda, não marca de tempo.

Linha cantada sem cauda **não** é erro.

## Quirks (não consertar nesta rodada)

Documentados para ninguém “corrigir” no escuro:

1. **`x///` na coluna 0** (sem `[acorde]` antes): `lineBeats('x///')` conta **3**, não 4 — o `x` inicial exige `]` ou espaço atrás. Escreva `[G]x///`.
2. **`[G] [C] [D]`** é tocada (`isPlayedLine`) e tem 0 tempos. O lint avisa; o relógio continua sem adivinhar.
3. **`{time:}` errado** vs o pulso sentido (6/8 no arquivo como 3/4) distorce as intros. Corrigir a cifra, não a engine.

## Regras para agentes

**Fazer**

- Tratar `x///` como relógio da cifra, não como letra.
- Em intro/solo/final: preservar `[Acorde]x///` no source.
- Na lente Só letra: ocultar marcas na **projeção**; o `.cho` fica intacto.
- Tempo de trecho sem voz: `lineBeats` + `isPlayedLine`, nunca “número de acordes”.
- Composto: `beatsPerBar` + `marksPerBeat`, nunca só o numerador de `{time:}`.

**Não fazer**

- Apagar `x///` / `//` / `x` de compasso do source para “limpar a letra”.
- Inventar outra sintaxe de duração (`|`, `%`, `—`, contar compassos no comentário).
- Usar `x///` no fim do verso como duração da estrofe inteira.
- Exigir `x` em todo grupo. `//` sem cabeça é 2 tempos; no fim da frase continua 2 tempos ali.
- Ligar Rolar sem `{duration:}`.
- Adivinhar tempo de `[G] [C] [D]`.
- Contar `x` de `{sot}` (TAB) como marca de tempo.
- “Corrigir” os quirks acima sem decisão de produto.

## Fontes no código

| Peça | Onde |
|---|---|
| Contar marcas | `lineBeats` — `src/core/timeline.ts` |
| Tocada vs cantada | `isPlayedLine` — mesmo arquivo |
| Pulso vs marca | `beatsPerBar`, `marksPerBeat` |
| Peso do bloco | `BlockMusic.beats` (tocada) e `.tail` (cauda) — `src/core/types.ts` |
| Relógio | `buildTimeline` |
| Lente Só letra | `lyricsOnlyBlocks` / `stripBeatMarks` — `src/core/layout.ts` |
| Aviso | `lintSource` — `src/core/lint.ts` |
