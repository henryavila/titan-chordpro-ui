#!/usr/bin/env node
/**
 * Probe Cifra Club URLs for production chordpros (db/chordpros.json + db/songs.json).
 * Writes artifacts/cifraclub-url-map.json keyed by song_id + chordpro_id.
 *
 * Match key for the SDA batch: chordpro_id (preferred) / song_id — never internal_cod.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const SONGS = join(ROOT, 'db/songs.json')
const CHORDPROS = join(ROOT, 'db/chordpros.json')
const OUT = join(ROOT, 'artifacts/cifraclub-url-map.json')
const OUT_MD = join(ROOT, 'artifacts/cifraclub-url-map.md')
const SEED = join(ROOT, 'artifacts/cifraclub-url-map.seed.json') // optional prior map

function readMeta(t) {
  const m = {}
  for (const line of String(t ?? '').split(/\r?\n/)) {
    const d = line.match(/^\s*\{\s*([a-zA-Z_]+)\s*:\s*([^}]*)\}\s*$/)
    if (!d) continue
    m[d[1].toLowerCase()] = (d[2] || '').trim()
  }
  return m
}

function stripAccents(s) {
  return s.normalize('NFD').replace(/\p{M}/gu, '')
}

function slugify(s) {
  return stripAccents(String(s ?? ''))
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

/** "005 - Tua Vontade" / "017 - Não Tardará (H458)" → clean title */
function cleanTitle(title) {
  let t = String(title ?? '').trim()
  t = t.replace(/^\d{1,3}\s*[-–—:]\s*/, '')
  t = t.replace(/^h\d{1,4}\s*[-–—:]\s*/i, '')
  t = t.replace(/\s*\((?:H|HA)?\s*\d+[a-z]?\)\s*$/i, '')
  t = t.replace(/\s*-\s*(?:n[aã]o\s+)?sobe\s+o\s+tom.*$/i, '')
  t = t.replace(/\s*-\s*vers[aã]o\s+.+$/i, '')
  return t.trim()
}

function artistCandidates(subtitle, songTitle) {
  const s = String(subtitle ?? '').trim()
  const out = new Set()
  if (!s) {
    ;[
      'adoradores',
      'ministerio-jovem',
      'daniel-ludtke',
      'novo-tom',
      'alessandra-samadello',
      'sergio-saas',
      'joyce-carnassale',
    ].forEach((a) => out.add(a))
    return [...out]
  }
  if (/n[aã]o sobe|meio tom|ofert[oó]rio|semana santa|antigo|hin[aá]rio|cd jovem|serenata/i.test(s)) {
    out.add('adoradores')
  }
  const base = s
    .replace(/\s*\d+\s*$/, '')
    .replace(/\s+novo\s+tempo$/i, '')
  out.add(slugify(base))
  out.add(slugify(s))
  if (/adoradores/i.test(s)) {
    out.add('adoradores')
    out.add('adoradores-novo-tempo')
  }
  if (/l[uü]dtke/i.test(s)) out.add('daniel-ludtke')
  if (/minist[eé]rio\s+jovem/i.test(s)) out.add('ministerio-jovem')
  if (/joyce/i.test(s)) out.add('joyce-carnassale')
  if (/leonardo/i.test(s)) out.add('leonardo-goncalves')
  if (/samadello/i.test(s)) out.add('alessandra-samadello')
  if (/rafaela/i.test(s)) out.add('rafaela-pinho')
  if (/isadora/i.test(s)) out.add('isadora-pompeu')
  if (/s[eé]rgio\s+saas/i.test(s)) out.add('sergio-saas')
  if (/novo\s+tom/i.test(s)) out.add('novo-tom')
  if (/semana\s+santa/i.test(s)) out.add('semana-santa')
  void songTitle
  return [...out].filter(Boolean)
}

function titleSlugs(title) {
  const t = cleanTitle(title)
  const out = new Set()
  out.add(slugify(t))
  out.add(slugify(t.replace(/^(o|a|os|as|um|uma)\s+/i, '')))
  const s = slugify(t)
  if (s.includes('-lo') || s.includes('-la')) out.add(s.replace(/-l([oa])$/, 'l$1'))
  return [...out].filter(Boolean)
}

function normTitle(t) {
  return stripAccents(cleanTitle(t))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

async function probe(url) {
  try {
    const r = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; titan-chordpro-ui-discover)' },
      redirect: 'follow',
    })
    if (!r.ok) return { ok: false, status: r.status }
    const html = await r.text()
    const hasChord = /data-chord-content|data-chord-name\s*=/.test(html)
    // /letra/ pages often lack chord markup — still accept MusicComposition name
    const name =
      (html.match(/"@type":"MusicComposition","name":"([^"]+)"/) || [])[1] ||
      (html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || [])[1] ||
      ''
    const hasStrum = /"strummings"\s*:\s*\[/.test(html.replace(/\\"/g, '"'))
    const ok = hasChord || (Boolean(name) && /cifraclub\.com\.br/i.test(r.url || url))
    return { ok, status: r.status, name: name.trim(), hasStrum, finalUrl: r.url }
  } catch (e) {
    return { ok: false, status: 0, error: String(e.message || e) }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function loadSeedUrls() {
  const path = existsSync(SEED) ? SEED : join(ROOT, 'artifacts/cifraclub-url-map.json')
  if (!existsSync(path)) return new Map()
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    const byNorm = new Map()
    for (const row of raw.results || []) {
      if (!row?.url) continue
      const n = normTitle(row.title || row.cleanTitle || '')
      if (n && !byNorm.has(n)) byNorm.set(n, row.url)
      const n2 = normTitle(row.cleanTitle || '')
      if (n2 && !byNorm.has(n2)) byNorm.set(n2, row.url)
    }
    return byNorm
  } catch {
    return new Map()
  }
}

const songs = Object.fromEntries(
  JSON.parse(readFileSync(SONGS, 'utf8')).map((s) => [s.id, s]),
)
const chordpros = JSON.parse(readFileSync(CHORDPROS, 'utf8')).filter(
  (c) => !c.deleted_at && String(c.chordpro || '').trim(),
)
const seed = loadSeedUrls()

const results = []
let found = 0
let missing = 0

console.log(`Probing ${chordpros.length} chordpros…`)

for (const cp of chordpros) {
  const song = songs[cp.song_id] || {}
  const meta = readMeta(cp.chordpro)
  const titleRaw = meta.title || meta.t || song.title || cp.name || ''
  const subtitle = meta.subtitle || meta.st || ''
  const title = cleanTitle(titleRaw) || cleanTitle(song.title || '')
  const artists = artistCandidates(subtitle, song.title)
  const slugs = titleSlugs(title || titleRaw)
  const tried = []
  let hit = null

  const seedUrl = seed.get(normTitle(titleRaw)) || seed.get(normTitle(title))
  const seedFirst = seedUrl ? [seedUrl] : []

  const candidates = [
    ...seedFirst,
    ...artists.flatMap((a) => slugs.map((s) => `https://www.cifraclub.com.br/${a}/${s}/`)),
  ]

  for (const url of candidates) {
    if (!url || tried.includes(url)) continue
    tried.push(url)
    const res = await probe(url)
    await sleep(100)
    if (res.ok) {
      hit = {
        url: res.finalUrl || url,
        name: res.name,
        hasStrum: !!res.hasStrum,
        status: res.status,
      }
      break
    }
    // stop after many misses for this chart
    if (tried.length >= 12) break
  }

  const row = {
    song_id: cp.song_id,
    chordpro_id: cp.id,
    tenant_id: cp.tenant_id ?? song.tenant_id ?? null,
    internal_cod: song.internal_cod ?? null,
    chordpro_name: cp.name || null,
    title: titleRaw || title,
    subtitle,
    cleanTitle: title,
    song_title: song.title || null,
    tried: tried.length,
    url: hit?.url || null,
    ccName: hit?.name || null,
    hasStrum: hit?.hasStrum ?? null,
  }
  results.push(row)
  if (hit) {
    found++
    console.log(
      'OK',
      `song=${row.song_id}`,
      `cp=${row.chordpro_id}`,
      JSON.stringify(row.title),
      '→',
      hit.url,
      hit.hasStrum ? '(strum)' : '(no strum)',
    )
  } else {
    missing++
    console.log(
      'MISS',
      `song=${row.song_id}`,
      `cp=${row.chordpro_id}`,
      JSON.stringify(row.title),
      'artists=',
      artists.slice(0, 3).join(','),
    )
  }
}

mkdirSync(join(ROOT, 'artifacts'), { recursive: true })
const report = {
  generatedAt: new Date().toISOString(),
  source: 'db/chordpros.json+db/songs.json',
  matchKey: 'chordpro_id',
  total: results.length,
  found,
  missing,
  withStrum: results.filter((r) => r.hasStrum).length,
  results,
}
writeFileSync(OUT, JSON.stringify(report, null, 2))

const foundRows = results.filter((r) => r.url)
const md = [
  '# Mapa Cifra Club — chordpros de produção (db)',
  '',
  `Gerado: ${report.generatedAt}`,
  '',
  '| Total | Encontradas | Não achadas | Com batida |',
  '|------:|----------:|------------:|-----------:|',
  `| ${report.total} | ${found} | ${missing} | ${report.withStrum} |`,
  '',
  'Match no batch SDA: **`chordpro_id`** (fallback `song_id`). Não usar `internal_cod`.',
  '',
  `## Encontradas (${found})`,
  '',
  '| song_id | chordpro_id | título | URL |',
  '|--------:|------------:|--------|-----|',
  ...foundRows.map(
    (r) =>
      `| ${r.song_id} | ${r.chordpro_id} | ${String(r.title).replace(/\|/g, '\\|')} | ${r.url} |`,
  ),
  '',
  `## Não achadas (${missing})`,
  '',
  '| song_id | chordpro_id | título | internal_cod |',
  '|--------:|------------:|--------|--------------|',
  ...results
    .filter((r) => !r.url)
    .map(
      (r) =>
        `| ${r.song_id} | ${r.chordpro_id} | ${String(r.title).replace(/\|/g, '\\|')} | ${r.internal_cod ?? ''} |`,
    ),
  '',
].join('\n')
writeFileSync(OUT_MD, md)

console.log('\nDONE', {
  total: report.total,
  found,
  missing,
  withStrum: report.withStrum,
  out: OUT,
})
