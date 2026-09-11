# Batidas — essência visual (contrato)

Não criar símbolo para cada código do CC. Colapsar em **4 essências** + direção + contato.

---

## Vocabulário visual (v1)

| Camada | Valores | Visual |
|--------|---------|--------|
| Direção | ↓ / ↑ | seta |
| Contato | toca / passa / pausa | seta **cheia** / seta **vazia** / vazio |
| Essência (só no toque) | **normal** · **acento** · **mute** · **abafada** | peso/marca na seta cheia |

Ghost (23) e pausa (24) **não** carregam essência — só contato.

### Como distinguir as 4 essências (proposta de UI)

| Essência | Leitura | Marca sugerida |
|----------|---------|----------------|
| **normal** | toque limpo | seta cheia padrão |
| **acento** | toque mais forte | seta cheia **mais grossa** / preenchimento duplo |
| **mute** | palm mute (mão direita abafa no cavalete) | seta cheia + **ponto** ou haste curta |
| **abafada** | cordas abafadas (mão esquerda / sem pressão) | seta cheia **tracejada** ou com **X** leve |

*(Glyph final na implementação — o contrato é só essas 4.)*\

---

## Mapa CC → essência

### Contato / direção (antes da essência)

| Código | Contato | Direção |
|--------|---------|---------|
| 0–11 | toca | ↓ |
| 12–21 | toca | ↑ |
| **23** | **passa** (seta vazia) | pelo índice do slot |
| **24** | **pausa** | — |
| **22** | toca (abafada) | — (sem ↑/↓; tratar como abafada centrada ou ↓ por convenção) |

### Essência nos toques

| Essência Titan | Códigos CC | Labels de origem |
|----------------|------------|------------------|
| **normal** | 7, 19 | Batida normal |
| | 3, 15 | Só agudas *(vira toque normal)* |
| | 6, 18 | Só bordões *(vira toque normal)* |
| | 11 | Rasqueado *(vira toque normal)* |
| **acento** | 1, 13 | Batida acentuada |
| | 2, 14 | Agudas acentuadas |
| | 5, 17 | Bordões acentuados |
| | 10 | Rasqueado acentuado |
| | 8, 20 | Palm acentuado → **acento** vence (toque forte; mute “por baixo” se um dia houver combinação) |
| **mute** | 9, 21 | Palm mutting |
| **abafada** | 0, 12 | Meio abafada |
| | 4, 16 | Abafada nos bordões |
| | **22** | Abafada completa |

### Regra de desempate (palm acentuado)

`8` / `20` = palm **e** acento. No v1: classificar como **acento** (a leitura mais importante no ritmo). Se no uso real incomodar, virar **mute** — um flag no mapa.

Agudas / bordões / rasqueado **sem** acento → **normal**: a essência “tocou” já basta; não inventar 5º símbolo.

---

## Tabela rápida (código → Titan)

```text
0,12     → hit + abafada + dir
1,13     → hit + acento + dir
2,14     → hit + acento + dir
3,15     → hit + normal + dir
4,16     → hit + abafada + dir
5,17     → hit + acento + dir
6,18     → hit + normal + dir
7,19     → hit + normal + dir
8,20     → hit + acento + dir   (palm+acento)
9,21     → hit + mute + dir
10       → hit + acento + down
11       → hit + normal + down
22       → hit + abafada
23       → ghost + dir(slot)
24       → rest
```

---

## Modelo interno (estável)

```ts
type StrumContact = 'hit' | 'ghost' | 'rest'
type StrumDir = 'down' | 'up' | null
type StrumEssence = 'normal' | 'accent' | 'mute' | 'muted' // muted = abafada

type StrumSlot = {
  dir: StrumDir
  contact: StrumContact
  essence: StrumEssence | null  // null se ghost/rest
}
```

No arquivo (`x_strum`), dá para compactar:

- `D` / `U` = normal cheia
- `D!` / `U!` = acento
- `Dm` / `Um` = mute (palm)
- `Da` / `Ua` = abafada
- `d` / `u` = ghost (vazia)
- `-` = pausa

---

## Encaixa no plano

Batida v1 = setas cheia/vazia + estas **4 essências**. Toggle para exibir. Sem símbolo por código CC.
