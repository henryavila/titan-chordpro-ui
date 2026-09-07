# Handoff — colisão de acordes na leitura (design template)

Data: 2026-09-07. Destinatário: **agent de design** (Claude Design), sobre os artboards de leitura em `design-source/`.
Origem: V1 do `docs/HANDOFF-SDA-VIEWER-2026-09-06.md` (confirmado em host real, Safari).
Este documento descreve **o problema e o aceite**. A solução de desenho é sua.

---

## 1. O problema

Na leitura, cada segmento (acorde + sílaba) é uma coluna própria dentro de uma linha que quebra por segmento. Quando o acorde cai **no meio de uma palavra** (`s.tight`), ele é desenhado sem ocupar largura (`width:0; overflow:visible`) e transborda sobre o que vem depois.

Sintomas, com exemplos reais da fixture:

| Fonte | O que acontece |
|---|---|
| `[Bm]cu[E]ra` (linha 12) | dois acordes na mesma palavra ficam colados/sobrepostos — foi o bug relatado pelo músico |
| `instru[E]mento` (linha 22) | o acorde pinta por cima das letras seguintes |
| `Ter [Em]mais [Em7/D] mo[A]tivos` (linha 21) | a palavra `motivos` pode **quebrar no meio** na virada de linha (`mo` numa linha, `tivos` na outra), porque a unidade de quebra é o segmento, não a palavra |
| `[Fsus4]men[F]to` (linha 42) | nome longo agrava os dois efeitos acima |

Piora com: transpose que aumenta o nome do acorde, capo duplo (a forma fica numa lane acima do acorde), fonte de letra trocada pelo host, fonte grande, tela estreita.

**Onde está no template** (mesmo padrão repetido):
- `design-source/Chordpro Viewer v2.dc.html` — ramos `s.tight` nas linhas ~106 (refrão) e ~128 (estrofe)
- `design-source/Titan Chordpro UI.dc.html` — ~179
- `design-source/Titan Chordpro UI v2.dc.html` — ~210, dentro de `line.isView`

O ramo `s.loose` (acorde no início de palavra) já reserva espaço e não é o problema.

---

## 2. O que precisa ser verdade depois (aceite)

1. Cada acorde continua **ancorado na sílaba a que pertence** — mesmo início horizontal.
2. Dois acordes vizinhos na mesma linha **nunca se tocam**: existe folga mínima visível entre eles, inclusive dentro de uma mesma palavra.
3. Acorde **nunca** pinta sobre a letra.
4. Uma palavra só quebra em **espaço real do texto**. Troca de acorde no meio da palavra não é ponto de quebra.
5. A linha **não estoura a largura do container**; a leitura não ganha rolagem horizontal.
6. Continua valendo com: capo duplo (forma acima do acorde), tom transposto para nomes maiores, fonte de letra/acorde definida pelo host, tamanho de fonte no máximo, phone e desktop.
7. Vale nos **três artboards** e nos dois blocos (estrofe e refrão).
8. A fonte ChordPro não muda: nada de reescrever token, mover acorde para outra sílaba ou encurtar letra para caber.

Validar com `fixtures/escuta-meu-clamor-sda-86.cho` (linhas 12, 21, 22, 42, 43), que é a cifra real onde o problema apareceu.

Se a sua solução exigir que o **ViewModel** entregue algo diferente para a UI (outra classificação além de `tight`/`loose`, outra unidade de agrupamento, medida de largura), diga isso explicitamente no retorno — é uma mudança de contrato e precisa ser decidida, não contornada no estilo.

Se a modelagem `tight`/`loose` de hoje for, na sua leitura, a origem errada do problema, proponha a substituição em vez de remendá-la.

---

## 3. Também esperado no retorno

Uma frase de regra no design system / screens sobre ancoragem e folga do acorde. Hoje `design-handoff/01-screens.md` diz apenas "acordes alinhados à letra", o que não proíbe nenhum dos sintomas acima.

---

## 4. Fora do escopo

Redesign de chrome, cores, tipografia ou controles; multi-coluna; modo ajuste/fit; editor (as pills de edição têm regra própria); print/export; o handoff de layout do embed (`docs/HANDOFF-CHROME-EMBED-LAYOUT-2026-09-06.md`), que é decisão separada.

---

## 5. Nota de processo

O pacote Vue já tem uma correção própria para isto. **Não consulte `src/vue/` nem os testes de layout** — queremos a sua solução pensada de forma independente; as duas serão comparadas depois.
