# Magia Cifra Club — achados (2026-09-11)

Página de referência:
https://www.cifraclub.com.br/florianopolis-house-of-prayer/tu-es-aguas-purificadoras/

Relatório completo (mdprobe): `cifraclub-magia-analise.md` (sessão).

## Já extraímos
- title / subtitle (JSON-LD), key (`--chord-tone`)
- corpo via `<pre data-chord-content>` + `.kvMV`
- strip `.tabs`, rename Intro→INTRODUÇÃO, `{soc}` + branco fecha refrão
- pontos de ataque na letra (`f.az`)

## Ouro ainda não usado (`songData` no RSC)
- `strummings[0].bpm` = **71** → `{tempo:71}` (P0)
- `timeSignature` 16 slots com 1..4 → `{time:4/4}` (P0)
- `config.capo` / `tuning` / `keyShape`
- `composers[]` (também no JSON-LD)
- `metadata.youtubeID` (clipe) + `videoLesson.youtubeID` (aula)
- `chords[].shapes` multi-instrumento
- `priorityVersions`: Principal / Simplificada / Letra
- **sem** `duration` em lugar nenhum

## API
`api.cifraclub.com.br/v3/song/...` → 401 hash. Extrair do HTML.

## Próximo salto
Parsear bpm + time do songData → diálogo de cifra nova pede só duração.
