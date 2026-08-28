# Research — formato OnSong (requisito de **engine**, não UI)

> Decisão de produto: o viewer deve aceitar cifras **ChordPro** e **OnSong** (e misturas comuns).  
> A **tela** não escolhe formato — o **core/parse** normaliza para o mesmo `ChordProView`.

---

## 1. O que é OnSong File Format

Fonte oficial: [OnSong File Format](https://onsongapp.com/docs/features/formats/onsong/).

- Texto plano (extensão típica `.onsong`; OnSong também abre `.txt` / etc.).
- **Metadados** no primeiro bloco (antes da 1ª linha em branco), como `Name: Value` — ex. `Key: D`, `Tempo: 76`. Título/artista também podem ser só a 1ª e 2ª linhas.
- **Seções** separadas por linha em branco; label opcional `Verse 1:` / `Chorus:`.
- **Acordes** de dois jeitos:
  1. **Bracketed** — `[D]` inline na letra (igual ChordPro).
  2. **Chords over lyrics** — linha só de acordes alinhada por espaços **acima** da letra.
- Instruções musicais em `(parênteses)`.
- OnSong documenta que **sintaxe ChordPro pode ser usada de forma intercambiável** para opções avançadas (`{c:…}`, etc.).

ChordPro nativo no OnSong: extensões `.chordpro`, `.chopro`, `.cho`, `.crd`, `.pro` — tags `{title:}` / `{key:}` etc.

Biblioteca JS de referência comunitária: [`onsong` (chordbook/onsong)](https://github.com/chordbook/onsong) — `OnSong.parse(source)` → metadata + seções.

---

## 2. Diferença prática vs ChordPro

| Aspecto | ChordPro | OnSong |
|---|---|---|
| Meta | `{key:G}` | `Key: G` (ou 1ª/2ª linha título/artista) |
| Seção | `{soc}` / `{c:Chorus}` | `Chorus:` + blank lines |
| Acordes | Quase sempre `[C]` inline | Inline **ou** linha acima (monospace) |
| Extensão | `.cho` / `.chordpro` / `.pro` | `.onsong` / texto genérico |

**Mistura:** arquivos reais costumam ter brackets + algum meta/estilo OnSong, ou chords-over-lyrics sem `{…}`. A engine precisa **detectar / tolerar**, não exigir pureza.

---

## 3. Corpus Ministério Tons (amostra)

Heurística em 147 arquivos da pasta Tons (2026-08-28):

- Quase todos já usam meta `{title:}` / `{key:}` (ChordPro).
- Pouco/nenhum `Key:` estilo OnSong ou chords-over-lyrics óbvio **nessa** pasta.
- Mesmo assim o requisito vale: outras pastas / exports OnSong / SongSelect misturam formatos.

---

## 4. Implicação de arquitetura (engine)

```
source text (ChordPro | OnSong | mixed)
        → detect / normalize
        → parse() → ChordProView   // mesmo ViewModel
        → renderHtml / controller / Vue UI
```

| Camada | Responsabilidade |
|---|---|
| **Core** | Aceitar ambos; normalizar chords-over-lyrics → unidades acorde+letra; mapear `Key:`/`Tempo:` → `meta`; labels `Verse:` → sections |
| **CLI** | Aceitar `.onsong` além de `.cho`/`.chordpro` |
| **UI Vue** | **Nada de seletor de formato** — só recebe `source` / view já parseada |

Fixtures futuras: incluir pelo menos **1** arquivo OnSong puro (chords-over-lyrics + `Key:`) e **1** misto, quando disponíveis.

---

## 5. O que **não** fazer na UI (design-brief)

- Não adicionar controle “formato ChordPro / OnSong”.
- Não mostrar badge de formato (a menos que produto peça depois).
- A tela continua: mesma leitura, transpose (se key resolvida), scroll, fit opt-in, export.

Export CHO: preferir **ChordPro canônico** na saída (estável), mesmo que a entrada fosse OnSong — documentar no SPEC na implementação.

---

## 6. Fontes

- https://onsongapp.com/docs/features/formats/onsong/  
- https://onsongapp.com/docs/features/formats/onsong/chords/  
- https://onsongapp.com/docs/features/formats/onsong/metadata  
- https://onsongapp.com/docs/features/formats/chordpro/  
- https://github.com/chordbook/onsong  
