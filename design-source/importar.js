// Entrada de cifra nova: reconhecer o que foi colado/aberto e devolver ChordPro.
// Três origens (URL, arquivo, texto) caem todas aqui — o resto da UI só mostra.

const CHORD = /^\(?[A-H](?:#|b)?(?:m|min|maj|M|dim|aug|sus|add|º|°|\+)?(?:\d{1,2})?(?:(?:sus|add|maj|min|dim|aug|no)\d{0,2}|[#b+-]\d{1,2}|\/[A-H](?:#|b)?)*\)?$/;
const SECTION = /^\s*(intro|introdu(?:ç|c)(?:ã|a)o|verso?|vers[eo]\s*\d*|estrofe\s*\d*|refr(?:ã|a)o|chorus|pr[eé][- ]?chorus|pr[eé][- ]?refr(?:ã|a)o|ponte|bridge|solo|instrumental|interl[uú]dio|final|ending|outro|tag|coda|parte\s*\d*|primeira parte|segunda parte|terceira parte|dedilhado|riff)\s*\d*\s*[:\]]?\s*$/i;
const CHORUS = /^(refr(?:ã|a)o|chorus)/i;

const isChord = t => CHORD.test(t) && /[A-H]/.test(t[0]);
export const isChordLine = l => {
  const t = l.trim();
  if (!t || t.length > 90) return false;
  const toks = t.split(/\s+/);
  if (toks.length > 14) return false;
  return toks.every(isChord);
};
const isTabLine = l => /\|/.test(l) && (l.match(/-/g) || []).length >= 5 && !/[a-z]{4}/i.test(l.replace(/^[eEADGBb]/, ""));
const clean = s => s.replace(/\r/g, "").replace(/ /g, " ").replace(/[ \t]+$/gm, "");

// Acordes acima da letra → colchetes na sílaba certa. A coluna manda: o acorde
// entra no índice em que estava escrito, e nunca antes do anterior.
function merge(chordLine, lyric) {
  const marks = [];
  const re = /\S+/g; let m;
  while ((m = re.exec(chordLine))) marks.push({ name: m[0], col: m.index });
  if (!marks.length) return lyric;
  let out = "", cur = 0;
  for (const c of marks) {
    let col = Math.max(cur, Math.min(c.col, lyric.length));
    out += lyric.slice(cur, col) + "[" + c.name.replace(/^\(|\)$/g, "") + "]";
    cur = col;
  }
  return out + lyric.slice(cur);
}

// Uma linha de acordes sozinha (intro, passagem) vira linha só de acordes.
const chordsOnly = l => l.trim().split(/\s+/).map(c => "[" + c.replace(/^\(|\)$/g, "") + "]").join(" ");

function sectionDirective(label, open) {
  const name = label.replace(/[:\]]\s*$/, "").replace(/^\[/, "").trim();
  return CHORUS.test(name) ? (open ? "{soc}" : "{eoc}") : "{c:" + name + "}";
}

// Corpo em texto puro → ChordPro. Tab da intro fica tab: {sot}…{eot}.
export function fromPlain(text) {
  const src = clean(text).split("\n");
  const out = []; let chorus = false, tab = null;
  const closeChorus = () => { if (chorus) { out.push("{eoc}"); chorus = false; } };
  for (let i = 0; i < src.length; i++) {
    const raw = src[i];
    if (isTabLine(raw)) { (tab = tab || []).push(raw.replace(/\s+$/, "")); continue; }
    if (tab) { out.push("{sot}", ...tab, "{eot}"); tab = null; }
    const bare = raw.trim();
    if (!bare) { out.push(""); continue; }
    const asSection = bare.replace(/^\[(.+)\]$/, "$1");
    if (SECTION.test(asSection) && !isChordLine(bare)) {
      closeChorus();
      const d = sectionDirective(asSection, true);
      if (d === "{soc}") { chorus = true; out.push("{soc}"); } else out.push(d);
      continue;
    }
    if (isChordLine(raw)) {
      const next = src[i + 1];
      if (next && next.trim() && !isChordLine(next) && !isTabLine(next) && !SECTION.test(next.trim())) {
        out.push(merge(raw, next)); i++;
      } else out.push(chordsOnly(raw));
      continue;
    }
    out.push(bare);
  }
  if (tab) out.push("{sot}", ...tab, "{eot}");
  closeChorus();
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// OnSong: cabeçalho Chave: valor, seções com dois-pontos, corpo já em colchetes
// (ou acordes acima da letra, que caem no conversor de texto puro).
const ONSONG_KEYS = {
  title: "title", t: "title", subtitle: "subtitle", artist: "subtitle", author: "subtitle",
  key: "key", tempo: "tempo", bpm: "tempo", time: "time", capo: "capo", duration: "duration"
};
export function fromOnSong(text) {
  const src = clean(text).split("\n");
  const head = []; const body = [];
  let inHead = true, firstSeen = false;
  for (let i = 0; i < src.length; i++) {
    const raw = src[i], bare = raw.trim();
    if (inHead) {
      if (!bare) { if (firstSeen) inHead = false; continue; }
      const kv = bare.match(/^([A-Za-zÀ-ú]+)\s*:\s*(.+)$/);
      const key = kv && ONSONG_KEYS[kv[1].toLowerCase()];
      if (key) { head.push("{" + key + ":" + kv[2].trim() + "}"); firstSeen = true; continue; }
      if (!firstSeen && !kv && !SECTION.test(bare)) { head.push("{title:" + bare + "}"); firstSeen = true; continue; }
      if (kv && !key && !SECTION.test(bare)) { firstSeen = true; continue; } // metadado que não usamos
      inHead = false;
    }
    body.push(raw);
  }
  const hasBrackets = /\[[^\]]+\]/.test(body.join("\n"));
  const converted = hasBrackets ? bodyWithSections(body) : fromPlain(body.join("\n"));
  return [head.join("\n"), converted].filter(Boolean).join("\n\n");
}

function bodyWithSections(lines) {
  const out = []; let chorus = false;
  const closeChorus = () => { if (chorus) { out.push("{eoc}"); chorus = false; } };
  for (const raw of lines) {
    const bare = raw.trim();
    if (!bare) { out.push(""); continue; }
    const asSection = bare.replace(/^\[(.+)\]$/, "$1");
    if (SECTION.test(asSection)) {
      closeChorus();
      const d = sectionDirective(asSection, true);
      if (d === "{soc}") { chorus = true; out.push("{soc}"); } else out.push(d);
      continue;
    }
    out.push(raw.replace(/\s+$/, ""));
  }
  closeChorus();
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function detect(text) {
  const t = clean(text);
  if (!t.trim()) return "vazio";
  if (/\{\s*(title|t|subtitle|st|artist|key|soc|start_of_chorus|c|comment|sot|start_of_tab)\s*:?/i.test(t)) return "chordpro";
  if (/^\s*(title|artist|key|tempo|time|flow|ccli|capo)\s*:/im.test(t)) return "onsong";
  const lines = t.split("\n").filter(l => l.trim());
  const above = lines.filter(isChordLine).length;
  if (/\[[^\]]{1,12}\]/.test(t) && above / Math.max(1, lines.length) < 0.15) return "chordpro";
  if (above) return "plain";
  return "plain";
}

const FORMAT_LABEL = { chordpro: "ChordPro", onsong: "OnSong", plain: "acordes sobre a letra" };

export function convert(text) {
  const fmt = detect(text);
  if (fmt === "vazio") return { source: "", format: fmt, label: "", changed: false };
  const source = fmt === "chordpro" ? clean(text).trim()
    : fmt === "onsong" ? fromOnSong(text)
    : fromPlain(text);
  return { source, format: fmt, label: FORMAT_LABEL[fmt] || fmt, changed: fmt !== "chordpro" };
}

// ——— metadados ———
export const META_KEYS = ["title", "subtitle", "key", "tempo", "time", "x_origem"];
export function readMeta(source) {
  const meta = {};
  String(source || "").split("\n").forEach(l => {
    const d = l.match(/^\s*\{\s*([a-zA-Z_]+)\s*:\s*([^}]*)\}\s*$/);
    if (!d) return;
    const k = d[1].toLowerCase();
    if (k === "t") meta.title = d[2].trim();
    else if (k === "st") meta.subtitle = d[2].trim();
    else if (META_KEYS.includes(k) || k === "capo") meta[k] = d[2].trim();
  });
  return meta;
}
// Reescreve o cabeçalho: as chaves conhecidas saem do corpo e voltam no topo,
// na ordem canônica. Nada de duas linhas {key:} disputando.
export function writeMeta(source, meta) {
  const body = String(source || "").split("\n").filter(l => {
    const d = l.match(/^\s*\{\s*([a-zA-Z_]+)\s*:\s*[^}]*\}\s*$/);
    if (!d) return true;
    const k = d[1].toLowerCase();
    return !(META_KEYS.includes(k) || k === "t" || k === "st");
  });
  const head = META_KEYS.filter(k => (meta[k] || "").trim()).map(k => "{" + k + ":" + meta[k].trim() + "}");
  return [head.join("\n"), body.join("\n").replace(/^\n+/, "")].filter(Boolean).join("\n");
}
export const MISSING_LABEL = { title: "título", subtitle: "artista", key: "tom", tempo: "andamento", time: "compasso" };
export function missingOf(meta) {
  return ["title", "key", "tempo", "time"].filter(k => !String(meta[k] || "").trim());
}

// ——— origens ———
export function titleFromUrl(url) {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    const slug = parts[parts.length - 1] || "";
    const artist = parts.length > 1 ? parts[parts.length - 2] : "";
    const nice = s => s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    return { title: nice(slug), subtitle: nice(artist) };
  } catch (e) { return { title: "", subtitle: "" }; }
}
export const SUPPORTED_HOSTS = ["cifraclub.com.br", "www.cifraclub.com.br"];
export function hostOk(url) {
  try { return SUPPORTED_HOSTS.includes(new URL(url).hostname); } catch (e) { return false; }
}

// ChordPro → acordes sobre a letra. Serve ao mock da busca por URL: a página
// devolvida é texto puro, como o site entrega, e passa pelo conversor de verdade.
export function toPlain(source) {
  const out = [];
  String(source || "").split("\n").forEach(l => {
    const d = l.match(/^\s*\{\s*([a-zA-Z_]+)\s*:?\s*([^}]*)\}\s*$/);
    if (d) {
      const k = d[1].toLowerCase(), v = (d[2] || "").trim();
      if (k === "soc" || k === "start_of_chorus") out.push("[Refrão]");
      else if (k === "c" || k === "comment") out.push("[" + v.replace(/^\(|\)$/g, "") + "]");
      else if (k === "sot" || k === "start_of_tab" || k === "eot" || k === "end_of_tab") return;
      else if (k === "eoc" || k === "end_of_chorus") out.push("");
      return;
    }
    if (/^#/.test(l)) return;
    if (!/\[/.test(l)) { out.push(l); return; }
    let lyric = "", chords = "", i = 0;
    const re = /\[([^\]]*)\]/g; let last = 0, m;
    while ((m = re.exec(l))) {
      lyric += l.slice(last, m.index);
      while (chords.length < lyric.length) chords += " ";
      if (chords.length > lyric.length) { lyric += " ".repeat(chords.length - lyric.length); }
      chords += m[1] + " ";
      last = re.lastIndex;
    }
    lyric += l.slice(last);
    if (chords.trim()) out.push(chords.replace(/\s+$/, ""));
    if (lyric.trim()) out.push(lyric.replace(/\s+$/, ""));
  });
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// PDF com texto (não digitalizado). Sem pdf.js disponível, falha explícita.
export async function pdfText(blob) {
  const url = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.min.mjs";
  const pdfjs = await import(/* @vite-ignore */ url);
  pdfjs.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs";
  const buf = await blob.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    // Reagrupar por linha: y igual = mesma linha; x vira coluna aproximada.
    const rows = new Map();
    tc.items.forEach(it => {
      if (!it.str) return;
      const y = Math.round(it.transform[5]);
      const x = it.transform[4];
      const key = [...rows.keys()].find(k => Math.abs(k - y) <= 2);
      (rows.get(key ?? y) || rows.set(y, []).get(y)).push({ x, s: it.str });
    });
    const ys = [...rows.keys()].sort((a, b) => b - a);
    const widths = tc.items.map(it => it.width / Math.max(1, it.str.length)).filter(w => w > 0);
    const unit = widths.length ? widths.sort((a, b) => a - b)[Math.floor(widths.length / 2)] : 6;
    ys.forEach(y => {
      const parts = rows.get(y).sort((a, b) => a.x - b.x);
      let line = "";
      parts.forEach(p2 => {
        const col = Math.round(p2.x / unit);
        if (col > line.length) line += " ".repeat(col - line.length);
        line += p2.s;
      });
      pages.push(line.replace(/\s+$/, ""));
    });
    pages.push("");
  }
  const text = pages.join("\n").trim();
  if (!text) throw new Error("sem-texto");
  return text;
}
