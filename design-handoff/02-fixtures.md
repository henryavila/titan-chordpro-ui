# Fixtures · chordpro-viewer (R8 — dados reais)

**Fonte (rung 1, verified):**  
- `fixtures/jesus-*.cho`, `fixtures/entrega-*.cho` — IASD Ermelinda via SDA  
- `fixtures/ministerio-tons/*.cho` — Set A Ministério Tons (análise 147 arquivos; ver `docs/fixtures-selection-tons.md`)

Cada item: **`[real verbatim]`** salvo indicação. Copy de UI legado = lane **`copy (mutable)`**.

---

## Estados × conteúdo

### empty
- Cardinalidade: 0  
- Source: `""`  
- Texture: ausência total — sem título, sem linhas.

### loading
- Mesmo source que populated; UI ainda não mostrou o HTML.  
- Sem fixture de texto extra.

### error (export)
- Usar qualquer populated; o conteúdo da cifra permanece; o feedback de falha é de **ação**, não de corpus.  
- Não inventar mensagem — speech-act: “exportação falhou; tentar de novo”.

### offline / first-time
- N/A / micro-descoberta sem corpus extra.

### populated — set principal (usar nos mocks)

| Papel | Path | Key | Chars / linhas | Por quê |
|---|---|---|---|---|
| Primary + comments | `fixtures/jesus-tu-es-a-minha-vida-1.cho` | G | 1461 / 54 | SPEC; `BEM SUAVE`, introduções |
| Dense + comments | `fixtures/ministerio-tons/010-adoralo.cho` | F | 1487 / 52 | Densidade alta; Adoradores |
| Sparse | `fixtures/ministerio-tons/015-esconderijo.cho` | A | 1752 / 77 | Linhas longas, poucos segs — bom para modo ajuste |
| Short + fast | `fixtures/ministerio-tons/088-minha-ofertinha.cho` | C | 654 / 26 | Curta; 136 BPM |
| No key | `fixtures/ministerio-tons/002-em-gratidao.cho` | ∅ | 1118 / 46 | **Sem transpose UI** |
| 3/4 hinário | `fixtures/ministerio-tons/060-deixai-vir-pequeninos-h588.cho` | D# | 797 / 36 | Compass odd + sharp |
| Many comments | `fixtures/ministerio-tons/014-em-ti.cho` | A | 1836 / 93 | Ensaio densamente anotado |
| Long jovem | `fixtures/ministerio-tons/094-maranata-ja-2024.cho` | G | 2270 / 91 | Scroll / fit stress |
| Short Ermelinda | `fixtures/entrega-2.cho` | (meta parcial) | 878 / 32 | Edge curto |
| TAB | `fixtures/ministerio-tons/013-ele-vive-em-mim.cho` | G | ~2.8k | Contém `{sot}` tab |
| Infantil | `fixtures/ministerio-tons/im003-imagine-o-ceu.cho` | G | ~2.2k | Estilo distinto |
| Flat key | `fixtures/ministerio-tons/052-fidelidade-e-missao.cho` | Bb | ~2.1k | Bemol |

**Edge row (linha longa):** em `010-adoralo` / corpus Tons, linhas até ~92–94 chars — layout não pode assumir só versos curtos.

---

## Excertos verbatim (colar nos mocks)

### A — jesus-1 `[real verbatim]` · `fixtures/jesus-tu-es-a-minha-vida-1.cho`

```
{title:087 - Jesus, Tu És a minha vida}
{subtitle:Adoradores 1}
{key:G}
{tempo:60}
{time:4/4}

{c:(BEM SUAVE)}
{c:(BATERIA BATIDA ESPAÇADA, VIOLÃO ARPEJO E DEDILHADO)}

{c:(INTRODUÇÃO - SOLO GUITARRA E PADDING)}
[G]x///    [C]x///    [G]x///    [G]x///    

Je[G]sus, Tu És a minha [G]vida.
Je[G7]sus, Tu És o meu can[A7]tar.  [Cm]//
Tu [G]És a estrada mais bo[C]nita,
Por [G]onde eu [C]devo cami[G]nhar.
```

### B — Adorá-lo (densa) `[real verbatim]`

```
{title:010 - Adorá-lo}
{subtitle:Adoradores 2}
{key:F}
{tempo:70}

{c:(INTRODUÇÃO COM SOLO GUITARRA + STRINGS)}
…
{c:(TODOIS ENTRAM BEM SUAVES. BATERIA BATIDA ESPAÇADA)}
{soc}
Ale[F7M]luia, ale [Am]luia      Ale[F7M]luia, ale[C]lu[G/B]ia     …
{eoc}
```

(Arquivo completo no path acima.)

### C — Sem key `[real verbatim]` · `002-em-gratidao.cho`

```
{title: 002 - Em Gratidão}
{tempo: 70}
{time: 4/4}
{duration: 03:20}
```
*(sem `{key:}` — mocks de transpose devem omitir controles de tom.)*

### D — Curta `[real verbatim]` · `088-minha-ofertinha.cho` (arquivo completo ~26 linhas — usar inteiro).

### E — Empty

```
""
```

---

## Copy lane (mutable) — speech-acts do legado sda-v2

Texture apenas; **não** congelar as palavras:

| Speech-act | Exemplo legado (mutable) |
|---|---|
| Baixar tom | “transpose down” |
| Subir tom | “transpose up” |
| Reset tom | “transpose reset” |
| Diminuir/aumentar leitura | “decrease/increase font” |
| Auto-rolagem | “auto scroll” |
| Exportar | “export” / “PDF” / “ChordPro (.cho)” |

Novos speech-acts (sem literal legado): **ativar/desativar modo ajuste ao espaço**; **tema claro/escuro/auto**; **erro de export**.
