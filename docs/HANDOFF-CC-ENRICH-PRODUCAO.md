# Handoff — enrich Cifra Club em produção (SDA)

**Objetivo:** aplicar as URLs encontradas (`artifacts/cifraclub-url-map.json`) nas cifras do consumer, com enrich completo (meta only — corpo intacto).

O mapa é gerado a partir de **`db/chordpros.json` + `db/songs.json`** e casa por **`chordpro_id`** (não por `internal_cod` — cod pode duplicar no tenant).

---

## Visão do fluxo

```text
1. Publicar @henryavila/titan-chordpro-ui (release com enrich)
2. Consumer (sda) sobe a versão + rebuild frontend
3. Deploy do sda em produção
4. No servidor Linux: artisan + mapa → fetch CC → applyCifraClubEnrich → UPDATE chordpros
```

UI MetaDialog (“Completar com Cifra Club”) fica disponível no admin após o deploy — útil para misses e para YouTube com ask humano. O **batch** cobre as URLs já mapeadas no JSON.

---

## 1. Publicar o Titan

O enrich (`proposeCifraClubEnrich` / `applyCifraClubEnrich` + MetaDialog) precisa estar num release npm (hoje está no working tree / Unreleased).

```bash
# neste repo titan-chordpro-ui
# bump 0.1.2 → 0.1.3 (CHANGELOG + package.json)
./scripts/publish-npm.sh
# promover stage com 2FA conforme o script
```

Conferir no npm: `@henryavila/titan-chordpro-ui@0.1.3` exporta `proposeCifraClubEnrich`, `applyCifraClubEnrich`, e o bin `titan-chordpro-ui enrich-cc`.

---

## 2. Consumer pega o release

No repo `sda`:

```bash
npm install @henryavila/titan-chordpro-ui@0.1.3
# rebuild inertia / nova-chordpro conforme o pipeline habitual
npm run build   # ou o script de produção que vocês usam
```

Garantir (já existe no mount Nova):

- `fetchChart` → endpoint `/admin/sda/chordpros/fetch` (ou equivalente)
- `fetchYoutubeDuration` se quiser duração automática na UI

Deploy do frontend+backend como de costume.

---

## 3. Gerar o mapa (IDs de produção) e levar ao servidor

No Titan, a partir de dumps atuais:

```bash
# db/songs.json + db/chordpros.json devem refletir o tenant
node scripts/discover-cifraclub-urls-from-db.mjs
# → artifacts/cifraclub-url-map.json  (matchKey: chordpro_id)
```

Cada entrada com URL traz `song_id` + `chordpro_id`. O batch **não** usa `internal_cod` (evita colisão tipo Digno/Fala Comigo ambos `101`).

```bash
scp artifacts/cifraclub-url-map.json user@prod:/var/www/sda/storage/app/cifraclub-url-map.json
```

---

## 4. Rodar o batch em produção

### Comando (SDA)

```bash
cd /var/www/sda   # path real do consumer

php artisan chordpro:enrich-cifraclub \
  --tenant=ID_DO_TENANT \
  --map=storage/app/cifraclub-url-map.json \
  --youtube=remote \
  --dry-run
```

Conferir o relatório. Depois, sem dry-run:

```bash
php artisan chordpro:enrich-cifraclub \
  --tenant=ID_DO_TENANT \
  --map=storage/app/cifraclub-url-map.json \
  --youtube=remote
```

### O que grava (enrich completo)

| Campo | Política |
|-------|----------|
| corpo ChordPro | **nunca** altera |
| `x_source` | URL do mapa (`{x_origem:}` legado ainda lê) |
| `x_strum` / `x_strum_set` | **keep-local**: só preenche quando a cifra **não tem** batida; se o CC trouxer N>1 padrões, grava o conjunto completo (ver schema abaixo). No mapa SDA: 0 páginas com batida local |
| `tempo` / `time` / `key` / título… | fill-empty |
| `capo` | não aplica |
| `x_youtube` | com `--youtube=remote`: grava o do CC se existir; se local já tem e difere, mantém local |

`--youtube=skip` — não grava YouTube (só resto da meta).

### Multi-batida — schema `x_strum_set` (blast radius)

- **Legado (sempre):** `{x_strum: bpm=…; meter=…; grid=…; label=…; pat=…}` — um padrão ativo. Leitores antigos continuam vendo só isso.
- **Multi (novo):** `{x_strum_set: <activeIndex>|<pattern>|<pattern>|…}` — encoding compacto **sem JSON/chaves `{}`**. Cada `<pattern>` usa a mesma gramática de `{x_strum:}`. Pipe `|` separa índice e padrões; labels sanitizam `|` → `/` e `}` → `)`.
- **Writer:** N==1 → só `{x_strum:}`; N>1 → `{x_strum:}` (ativo) **+** `{x_strum_set:}`. Import/enrich CC com vários `strummings` passa a guardar todos (ex.: Céu Azul = 2).
- **Blast radius:** clients que só leem `x_strum` ignoram o set e usam o padrão ativo. Não há binding de batida a verso/refrão — o músico escolhe o ativo na UI.

### CLI puro (debug / um arquivo)

```bash
npx titan-chordpro-ui enrich-cc \
  --url 'https://www.cifraclub.com.br/adoradores/tua-vontade/' \
  --in cifra.cho \
  --out cifra-enriched.cho \
  --youtube remote
```

---

## 5. Pós-batch

1. Amostrar 3–5 cifras no admin (Metadados → origem preenchida).
2. Misses (87): enriquecer sob demanda na UI MetaDialog quando achar o link.
3. Batida: a maioria do repertório SDA no CC **não tem** `strummings`; o aviso na UI é esperado.

---

## Arquivos

| Onde | O quê |
|------|--------|
| Titan `artifacts/cifraclub-url-map.json` | URLs keyed por `chordpro_id` / `song_id` |
| Titan `scripts/discover-cifraclub-urls-from-db.mjs` | rediscovery a partir de `db/` |
| Titan `docs/HANDOFF-CC-ENRICH-PRODUCAO.md` | este handoff |
| Titan CLI `enrich-cc` | um chart |
| SDA `chordpro:enrich-cifraclub` | batch tenant + mapa (match por id) |
