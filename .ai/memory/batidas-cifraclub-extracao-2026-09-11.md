# Batidas visuais — o que dá para extrair do Cifra Club

Ideal que você descreveu: **movimento da mão dentro de cada compasso** — seta **cheia** quando a mão toca a corda, seta **vazia** quando passa direto.

**Conclusão curta:** isso mapeia quase 1:1 com o que o CC já grava. Dá para fazer bem.

---

## O que vem no `songData.strummings[]`

Cada item:

| Campo | Exemplo (Tu És) | Papel |
|-------|-----------------|-------|
| `bpm` | `71` | andamento (já no plano de meta) |
| `section` | `"Padrão - Sugestão"` | rótulo da levada (pode haver várias) |
| `timeSignature` | `['1','x','x','x','2',…]` | grade do compasso: número = tempo; `x` = subdivisão |
| `pattern` | `[7,23,23,19,23,19,…]` | um código por slot da grade |
| `id` | `1394` | id interno CC |

### Grade rítmica

- **16 slots** + tempos `1…4` → 4/4 em **semicolcheias** (Tu És, Wonderwall, Céu Azul…)
- **8 slots** + `1 x 2 x 3 x 4 x` → 4/4 em **colcheias** (Tempo Perdido, Ainda Gosto Dela)
- `pattern.length` pode ser **múltiplo** da grade (Wonderwall: 32 slots = 2 compassos; a numeração `1..4` cicla)

Isso é exatamente “movimentos dentro de cada compasso”.

---

## A tabela de códigos (enum do CC)

Extraída do JS `compasso-*.js`:

| Código | Label CC | Direção | Contato |
|--------|----------|---------|---------|
| **0–11** | batidas / palm / rasqueado / bordões / agudas **para baixo** | ↓ | toca (com técnica) |
| **12–21** | mesmas variantes **para cima** | ↑ | toca (com técnica) |
| **7** | Batida normal para baixo | ↓ | toca |
| **19** | Batida normal para cima | ↑ | toca |
| **22** | Abafada completa | — | abafa |
| **23** | *(sem label no mapa)* = `uX` no renderer | *(implícita)* | **passa direto** |
| **24** | Pausa | — | não toca / para |

### Por que o 23 é a seta vazia

- Não existe `23:{label:…}` no mapa (pula de 22 → 24).
- No React: se o tipo é `uX`, **não** renderiza texto acessível de batida.
- Nas cifras reais, o 23 aparece **entre** os toques, o tempo todo — padrão clássico de mão que continua o movimento sem encostar.

Amostras:

```text
Tu És (16ths):     7 23 23 19 23 19 | 7 23 23 19 23 19 | 7 23 7 19
Tempo Perdido (8): 7 23 7 19 23 19 7 19
Céu Azul parte 1:  7 23 23 23 7 23 23 23 23 23 19 23 0 23 19 23
                   (0 = meio abafada para baixo — ainda é “toca”)
```

Na prática do catálogo gospel/pop que vimos, **~95% dos slots são só 7, 19 e 23**.

---

## Como encaixa no seu ideal (seta cheia / vazia)

### Modelo mental Titan (v1)

Cada slot da batida vira:

```text
{ dir: 'down' | 'up', contact: 'hit' | 'ghost' | 'rest', technique?: ... }
```

**Direção**

1. Se o código é 0–11 → `down`; 12–21 → `up` (explícito).
2. Se o código é **23** (ghost) → direção pelo **índice do slot**, assumindo mão em alternância contínua:
   - slot par → ↓ vazia
   - slot ímpar → ↑ vazia  
   (validado nos padrões acima: os `7` caem em pares, os `19` em ímpares.)
3. `24` (pausa) → sem seta, ou slot vazio / respiração.

**Contato (o que você pediu)**

| Visual | Quando |
|--------|--------|
| Seta **cheia** ↓/↑ | código de batida (0–21), esp. 7 e 19 |
| Seta **vazia** ↓/↑ | código **23** (passa direto) |
| Sem seta / pausa | código **24** |

**Técnica (v2, opcional)** — não bloqueia o v1:

- acentuada, palm mute, só agudas, só bordões, meio abafada, rasqueado, abafada completa  
- dá para variar espessura, muting mark, ou um segundo glyph — **depois**

### Leitura humana (Tu És, 1º tempo)

```text
Tempo:  1     e     e     e
Mão:    ↓■    ↑□    ↓□    ↑■
        toca  passa passa toca
```

(`■` cheia, `□` vazia — só ilustração.)

---

## O que dá para extrair com confiança

| Extrair | Confiança | Uso |
|---------|-----------|-----|
| Grade por compasso (8 ou 16 slots) | alta | UI da batida |
| BPM | alta | `{tempo:}` + sync visual |
| Toque ↓/↑ vs passa direto (7/19/23) | **alta** | seta cheia/vazia |
| Várias batidas por seção (`section`) | média-alta | abas / seletor “Padrão”, “Refrão…” |
| Compasso 4/4 a partir da grade | alta | `{time:4/4}` |
| Técnicas finas (palm, bordões…) | média | v2 |
| Sync seta a seta com a rolagem da cifra | média | produto (metrônomo/ensaio) |
| Qual batida vale em qual trecho da letra | **baixa** | CC só rotula a levada (`section`), não amarra slot↔acorde |

**Não vem do CC:** dedilhado dedo a dedo, “qual corda” além do hint bordões/agudas, nem batida por compasso diferente no meio do verso sem outra entrada em `strummings[]`.

---

## Várias batidas na mesma música

Ex.: Céu Azul tem 2 (`Refrão - Parte 1/2`). Outras têm 1 (“Ritmo Padrão”).

Proposta de produto:

- Importar **todas** as entradas de `strummings[]`
- Mostrar a primeira como padrão
- Seletor discreto se `length > 1`
- Não inventar amarração automática na letra (o CC também não faz)

---

## Formato no ChordPro / Titan (proposta para o plano)

Ainda não é implementação — só contrato possível:

```text
{x_batida: 71 4/4 D-x-x-U-x-U D-x-x-U-x-U D-x-D-U}
```

ou JSON compacto em meta / bloco lateral:

```text
{x_strum: bpm=71; meter=4/4; grid=16; pat=D.g.g.U.g.U.D.g.g.U.g.U.D.g.D.U; label=Padrão}
```

Legenda sugerida no arquivo:

- `D` / `U` = toque cheio ↓/↑
- `d` / `u` ou `.` com direção implícita = ghost (seta vazia)
- `-` = pausa

A UI renderiza setas; o arquivo fica legível em texto.

*(Nome final da diretiva a decidir — `x_strum` / `x_batida`.)*

---

## Encaixe no plano aprovado

Somar ao plano anterior:

1. **P0 meta** — tempo, time, capo, youtube, duration (inalterado)
2. **P0.5 batida (novo)** — extrair `strummings[]` → modelo `{dir, contact}` → meta/arquivo + **UI mínima de setas cheia/vazia** na ficha ou no viewer (faixa acima da cifra / sheet do metrônomo)
3. **P2** — técnicas (palm, acento…), highlight no slot ativo com o metrônomo, multi-seção

Fora continua: shapes de acorde, Simplificada, `( Am G )`.

---

## Riscos / decisões

1. **Ghost sem direção no código 23** — confiar na alternância por índice (padrão violão). Se um dia aparecer padrão “dois downs seguidos sem ghost”, os códigos 0–11 já trazem direção explícita.
2. **Wonderwall 32 slots / 16 na grade** — tratar como 2 compassos; UI com quebra de compasso.
3. **Onde mostrar** — ficha na importação? sempre visível no reader? só no metrônomo? (precisa sua escolha)
4. **Sem batida no HTML** — algumas páginas podem ter `strummings` vazio; UI some, sem erro.

---

## Perguntas para você fechar

1. No v1, basta **cheia/vazia + ↓/↑** (ignorar palm/acento), certo?
2. Onde a batida aparece primeiro: **só no reader** (faixa fixa), **só na ficha de import**, ou **nos dois**?
3. Com várias batidas, seletor simples resolve, ou quer amarrar rótulo (`Refrão`) à seção da cifra depois?
