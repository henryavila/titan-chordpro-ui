#!/usr/bin/env node
/**
 * Probe Cifra Club URLs for fixtures/sda by artist/title slug heuristics.
 * Writes artifacts/cifraclub-url-map.json
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const DIR = join(ROOT, 'fixtures/sda')
const OUT = join(ROOT, 'artifacts/cifraclub-url-map.json')

function readMeta(t) {
  const m = {}
  for (const line of t.split('\n')) {
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
function cleanTitle(title, file) {
  let t = String(title ?? '').trim()
  t = t.replace(/^\d{1,3}\s*[-–—:]\s*/, '')
  t = t.replace(/\s*\((?:H|HA)?\s*\d+[a-z]?\)\s*$/i, '')
  t = t.replace(/\s*-\s*vers[aã]o\s+.+$/i, '')
  if (!t) {
    t = file.replace(/\.cho$/i, '').replace(/^\d{3}-/, '').replace(/-h\d+.*$/, '')
  }
  return t.trim()
}

function artistCandidates(subtitle) {
  const s = String(subtitle ?? '').trim()
  const out = new Set()
  if (!s) {
    // common gospel artists in this catalog
    ;['adoradores', 'ministerio-jovem', 'daniel-ludtke', 'novo-tom', 'alessandra-samadello'].forEach((a) => out.add(a))
    return [...out]
  }
  // drop non-artist notes
  if (/n[aã]o sobe|meio tom|ofert[oó]rio|semana santa|antigo|hin[aá]rio|cd jovem|serenata/i.test(s)) {
    ;['adoradores'].forEach((a) => out.add(a))
  }
  let base = s
    .replace(/\s*\d+\s*$/, '') // Adoradores 2 → Adoradores
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
  return [...out].filter(Boolean)
}

function titleSlugs(title) {
  const t = cleanTitle(title, '')
  const out = new Set()
  out.add(slugify(t))
  // without leading articles
  out.add(slugify(t.replace(/^(o|a|os|as|um|uma)\s+/i, '')))
  // á-lo → a-lo already via accents; also try without hyphens in middle edge cases
  const s = slugify(t)
  if (s.includes('-lo') || s.includes('-la')) out.add(s.replace(/-l([oa])$/, 'l$1'))
  return [...out].filter(Boolean)
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
    const name =
      (html.match(/"@type":"MusicComposition","name":"([^"]+)"/) || [])[1] ||
      (html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || [])[1] ||
      ''
    const hasStrum = /"strummings"\s*:\s*\[/.test(html.replace(/\\"/g, '"'))
    return { ok: hasChord, status: r.status, name: name.trim(), hasStrum, finalUrl: r.url }
  } catch (e) {
    return { ok: false, status: 0, error: String(e.message || e) }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

const files = readdirSync(DIR).filter((f) => f.endsWith('.cho')).sort()
const results = []
let found = 0
let missing = 0

for (const f of files) {
  const raw = readFileSync(join(DIR, f), 'utf8')
  const meta = readMeta(raw)
  const title = cleanTitle(meta.title || '', f)
  const artists = artistCandidates(meta.subtitle)
  const songs = titleSlugs(title)
  const tried = []
  let hit = null
  outer: for (const a of artists) {
    for (const s of songs) {
      if (!a || !s) continue
      const url = `https://www.cifraclub.com.br/${a}/${s}/`
      if (tried.includes(url)) continue
      tried.push(url)
      const res = await probe(url)
      await sleep(120)
      if (res.ok) {
        hit = { url: res.finalUrl || url, name: res.name, hasStrum: !!res.hasStrum, status: res.status }
        break outer
      }
    }
  }
  const row = {
    file: f,
    title: meta.title || title,
    subtitle: meta.subtitle || '',
    cleanTitle: title,
    tried: tried.length,
    url: hit?.url || null,
    ccName: hit?.name || null,
    hasStrum: hit?.hasStrum ?? null,
  }
  results.push(row)
  if (hit) {
    found++
    console.log('OK', f, '→', hit.url, hit.hasStrum ? '(strum)' : '(no strum)')
  } else {
    missing++
    console.log('MISS', f, 'title=', title, 'artists=', artists.slice(0, 3).join(','))
  }
}

mkdirSync(join(ROOT, 'artifacts'), { recursive: true })
const report = {
  generatedAt: new Date().toISOString(),
  total: results.length,
  found,
  missing,
  withStrum: results.filter((r) => r.hasStrum).length,
  results,
}
writeFileSync(OUT, JSON.stringify(report, null, 2))
console.log('\nDONE', { total: report.total, found, missing, withStrum: report.withStrum, out: OUT })
