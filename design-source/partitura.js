// Modelo único de partitura/tablatura, compartilhado pelo editor e pela leitura.
// O que fica guardado é sempre altura + figura; corda/casa é derivada, e só é
// gravada quando o dedilhado foi fixado à mão.

export const STR_MIDI = [64, 59, 55, 50, 45, 40];
export const STR_LBL = ["e", "B", "G", "D", "A", "E"];
export const NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
export const PT = { c: "Dó", d: "Ré", e: "Mi", f: "Fá", g: "Sol", a: "Lá", b: "Si" };
export const BEATS = { w: 4, h: 2, q: 1, "8": 0.5, "16": 0.25 };
export const DUR_OF = { 4: "w", 2: "h", 1: "q", 0.5: "8", 0.25: "16" };
export const DURS = [
  { d: "w", b: 4, name: "Semibreve", hollow: true, stem: false, flags: 0 },
  { d: "h", b: 2, name: "Mínima", hollow: true, stem: true, flags: 0 },
  { d: "q", b: 1, name: "Semínima", hollow: false, stem: true, flags: 0 },
  { d: "8", b: 0.5, name: "Colcheia", hollow: false, stem: true, flags: 1 },
  { d: "16", b: 0.25, name: "Semicolcheia", hollow: false, stem: true, flags: 2 }
];

export function toTab(midi) {
  let best = null;
  for (let s = 0; s < 6; s++) {
    const fret = midi - STR_MIDI[s];
    if (fret < 0 || fret > 15) continue;
    if (!best || fret < best.fret) best = { str: s, fret };
  }
  return best;
}
export function tabOf(n) {
  if (!n || n.rest) return null;
  if (typeof n.str === "number") return { str: n.str, fret: n.fret };
  return toTab(n.midi);
}
export function beatsOf(notes) { return notes.reduce((a, n) => a + (BEATS[n.dur] || 1), 0); }
export function keyOf(midi) { return NAMES[midi % 12] + "/" + (Math.floor(midi / 12) - 1); }

// Uma figura maior do que o que resta do compasso não estica a barra: é partida
// em figuras legais e ligada, para a barra cair sempre no tempo certo.
function decompose(beats) {
  const out = []; let r = Math.round(beats * 4);
  for (const q of [16, 8, 4, 2, 1]) while (r >= q) { out.push(q / 4); r -= q; }
  return out;
}
export function layout(notes, perBar) {
  const bar = perBar || 4;
  const items = []; let acc = 0;
  notes.forEach((n, i) => {
    let left = BEATS[n.dur] || 1;
    const frags = []; let a = acc;
    while (left > 0.0001) {
      const take = Math.min(left, bar - (a % bar));
      for (const p of decompose(take)) frags.push(p);
      a += take; left -= take;
    }
    frags.forEach((p, k) => {
      items.push({ kind: "note", i, n, dur: DUR_OF[p], tieNext: k < frags.length - 1 });
      acc += p;
      if (Math.abs(acc % bar) < 0.001) items.push({ kind: "bar" });
    });
  });
  return items;
}

export const DEFAULT_META = { time: "4/4", key: "D", tempo: 92, tuning: "EADGBE" };

// Extensão ChordPro: uma linha por compasso, altura:figura, ~s = slide,
// r = pausa, @corda/casa só quando o dedilhado foi fixado à mão, ~l = ligadura.
export function serialize(notes, meta) {
  const m = Object.assign({}, DEFAULT_META, meta || {});
  const head = "{sos: time=" + m.time + " key=" + m.key + " tempo=" + m.tempo + " tuning=" + m.tuning + "}";
  const perBar = beatsPerBar(m.time);
  const lines = []; let bar = [];
  for (const it of layout(notes, perBar)) {
    if (it.kind === "bar") { if (bar.length) { lines.push("| " + bar.join(" ") + " |"); bar = []; } continue; }
    const n = it.n;
    if (n.rest) { bar.push("r:" + it.dur); continue; }
    let tok = NAMES[n.midi % 12] + (Math.floor(n.midi / 12) - 1) + ":" + it.dur;
    if (n.slide) tok += "~s";
    if (typeof n.str === "number") tok += "@" + (n.str + 1) + "/" + n.fret;
    if (it.tieNext) tok += "~l";
    bar.push(tok);
  }
  if (bar.length) lines.push("| " + bar.join(" ") + " |");
  return head + "\n" + lines.join("\n") + "\n{eos}";
}

export function beatsPerBar(time) {
  const m = String(time || "4/4").match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return 4;
  return (Number(m[1]) * 4) / Number(m[2]);
}

function midiOf(name, oct) {
  const i = NAMES.indexOf(name.toLowerCase());
  return i < 0 ? 60 : (oct + 1) * 12 + i;
}

// Aceita o formato {sos}, TAB em texto (legado {sot}) ou nada.
export function parseScore(text) {
  const src = String(text || "").trim();
  if (!src) return { meta: Object.assign({}, DEFAULT_META), notes: [], from: "novo" };
  if (/\{\s*sos\b/i.test(src)) return parseSos(src);
  return parseAscii(src);
}

function parseSos(src) {
  const meta = Object.assign({}, DEFAULT_META);
  const notes = [];
  const head = src.match(/\{\s*sos\s*:?([^}]*)\}/i);
  if (head) {
    const kv = head[1] || "";
    const g = (k) => { const m = kv.match(new RegExp(k + "\\s*=\\s*([^\\s}]+)")); return m ? m[1] : null; };
    meta.time = g("time") || meta.time;
    meta.key = g("key") || meta.key;
    meta.tempo = Number(g("tempo")) || meta.tempo;
    meta.tuning = g("tuning") || meta.tuning;
  }
  let pendTie = false;
  for (const raw of src.split("\n")) {
    const line = raw.trim();
    if (!line || /^\{/.test(line)) continue;
    for (const tok of line.replace(/\|/g, " ").trim().split(/\s+/)) {
      if (!tok) continue;
      const rest = tok.match(/^r:(\w+)$/i);
      if (rest) { notes.push({ rest: true, dur: rest[1] }); continue; }
      const m = tok.match(/^([a-g]#?)(-?\d+):(\w+)((?:~[sl])*)(?:@(\d)\/(\d+))?$/i);
      if (!m) continue;
      const midi = midiOf(m[1], Number(m[2]));
      const flags = m[4] || "";
      const n = { midi, dur: m[3], slide: flags.indexOf("s") > -1 };
      if (m[5]) { n.str = Number(m[5]) - 1; n.fret = Number(m[6]); }
      // Ligadura de compasso é fragmento do mesmo som: soma de volta numa nota só.
      if (pendTie && notes.length) {
        const p = notes[notes.length - 1];
        if (p.midi === n.midi) {
          const total = (BEATS[p.dur] || 1) + (BEATS[n.dur] || 1);
          p.dur = DUR_OF[total] || p.dur;
          pendTie = flags.indexOf("l") > -1;
          continue;
        }
      }
      pendTie = flags.indexOf("l") > -1;
      notes.push(n);
    }
  }
  return { meta, notes, from: "sos" };
}

// TAB em texto do formato antigo: cada coluna com dígito vira uma semínima.
// Perde ritmo (o texto nunca teve) — a figura pode ser corrigida no editor.
function parseAscii(src) {
  const rows = src.split("\n").filter(r => /-{2,}/.test(r));
  if (!rows.length) return { meta: Object.assign({}, DEFAULT_META), notes: [], from: "vazio" };
  const bodies = rows.slice(0, 6).map(r => r.replace(/^\s*[eBGDAE]?\s*\|?/, ""));
  const width = Math.max(...bodies.map(b => b.length));
  const notes = [];
  for (let c = 0; c < width; c++) {
    for (let s = 0; s < bodies.length; s++) {
      const ch = bodies[s][c];
      if (!/[0-9]/.test(ch || "")) continue;
      let fret = Number(ch);
      const nxt = bodies[s][c + 1];
      if (/[0-9]/.test(nxt || "")) { fret = fret * 10 + Number(nxt); bodies[s] = bodies[s].slice(0, c + 1) + "-" + bodies[s].slice(c + 2); }
      const str = Math.min(5, s);
      notes.push({ midi: STR_MIDI[str] + fret, str, fret, dur: "q" });
      break;
    }
  }
  return { meta: Object.assign({}, DEFAULT_META), notes, from: "tab-texto" };
}

// Desenho. O mesmo caminho serve o editor (com seleção e clique) e a leitura.
export function draw(host, notes, opts) {
  const V = window.Vex && window.Vex.Flow;
  if (!V || !host) return null;
  const o = opts || {};
  const ink = o.ink || "#EAECF2";
  const accent = o.accent || "#84DFA6";
  const dim = o.dim || "#888F9E";
  const perBar = beatsPerBar(o.time);
  host.innerHTML = "";
  if (!notes.length) return null;
  const grand = !!o.grand;
  const view = grand ? "score" : (o.view || "both");
  const both = view === "both";
  const cols = layout(notes, perBar);
  const inkS = { fillStyle: ink, strokeStyle: ink };
  const selS = { fillStyle: accent, strokeStyle: accent };
  const minW = o.minWidth || 620;
  const W = Math.max(minW, cols.length * 46 + 150);
  const H = grand ? 218 : (both ? 226 : 146);
  const r = new V.Renderer(host, V.Renderer.Backends.SVG);
  r.resize(W, H);
  const ctx = r.getContext();
  ctx.setFillStyle(ink); ctx.setStrokeStyle(ink);
  const total = beatsOf(notes) || perBar;
  const mk = (arr) => new V.Voice({ num_beats: total, beat_value: 4 }).setStrict(false).addTickables(arr);
  const styleFor = (c) => (c.i === o.playIdx ? selS : (c.i === o.sel ? selS : inkS));
  const mkNote = (c, clef) => {
    if (c.n.rest) {
      const rn = new V.StaveNote({ keys: [clef === "bass" ? "d/3" : "b/4"], duration: c.dur + "r", clef });
      rn.setStyle(styleFor(c)); return rn;
    }
    const sn = new V.StaveNote({ keys: [keyOf(c.n.midi)], duration: c.dur, clef });
    if (NAMES[c.n.midi % 12].indexOf("#") > -1) sn.addModifier(new V.Accidental("#"), 0);
    sn.setStyle(styleFor(c)); return sn;
  };

  if (grand) {
    const tre = [], bas = [];
    for (const c of cols) {
      if (c.kind === "bar") { tre.push(new V.BarNote().setStyle(inkS)); bas.push(new V.BarNote().setStyle(inkS)); continue; }
      const low = !c.n.rest && c.n.midi < 60;
      tre.push(low ? new V.GhostNote({ duration: c.dur }) : mkNote(c, "treble"));
      bas.push(low ? mkNote(c, "bass") : new V.GhostNote({ duration: c.dur }));
    }
    const s1 = new V.Stave(26, 2, W - 44);
    s1.addClef("treble").addTimeSignature(o.time || "4/4").setStyle(inkS).setContext(ctx).draw();
    const s2 = new V.Stave(26, 100, W - 44);
    s2.addClef("bass").addTimeSignature(o.time || "4/4").setStyle(inkS).setContext(ctx).draw();
    new V.StaveConnector(s1, s2).setType(V.StaveConnector.type.BRACE).setContext(ctx).draw();
    new V.StaveConnector(s1, s2).setType(V.StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
    const v1 = mk(tre), v2 = mk(bas);
    new V.Formatter().joinVoices([v1]).joinVoices([v2]).format([v1, v2], W - 150);
    v1.draw(ctx, s1); v2.draw(ctx, s2);
    return { width: W, height: H };
  }

  const sN = [], tN = [], ties = [], marks = [], hit = [];
  let pend = null;
  for (const c of cols) {
    if (c.kind === "bar") {
      const b1 = new V.BarNote().setStyle(inkS), b2 = new V.BarNote().setStyle(inkS);
      sN.push(b1); tN.push(b2); marks.push(b1);
      continue;
    }
    const sn = mkNote(c, "treble");
    if (pend) { ties.push({ first: pend, last: sn }); pend = null; }
    if (c.tieNext) pend = sn;
    sN.push(sn);
    const pos = tabOf(c.n);
    const tn = new V.TabNote({ positions: [pos ? { str: pos.str + 1, fret: pos.fret } : { str: 3, fret: 0 }], duration: c.dur });
    tn.setStyle(styleFor(c)); tN.push(tn);
    hit.push({ i: c.i, sn, tn });
  }
  let stave = null, tabstave = null, v1 = null, v2 = null;
  if (view !== "tab") {
    stave = new V.Stave(10, both ? 2 : 14, W - 24);
    stave.addClef("treble").addTimeSignature(o.time || "4/4").setStyle(inkS).setContext(ctx).draw();
    v1 = mk(sN);
  }
  if (view !== "score") {
    tabstave = new V.TabStave(10, both ? 106 : 12, W - 24);
    tabstave.addClef("tab").addTimeSignature(o.time || "4/4").setStyle(inkS).setContext(ctx).draw();
    v2 = mk(tN);
  }
  // As duas pautas precisam do mesmo x inicial: senão o mesmo tick cai em
  // colunas diferentes e a tab deixa de estar sob a nota.
  if (stave && tabstave) {
    const x = Math.max(stave.getNoteStartX(), tabstave.getNoteStartX());
    stave.setNoteStartX(x); tabstave.setNoteStartX(x);
  }
  const fm = new V.Formatter(); const vs = [];
  if (v1) { fm.joinVoices([v1]); vs.push(v1); }
  if (v2) { fm.joinVoices([v2]); vs.push(v2); }
  fm.format(vs, W - 120);
  if (v1) v1.draw(ctx, stave);
  if (v2) v2.draw(ctx, tabstave);
  if (v1) for (const t of ties) new V.StaveTie({ first_note: t.first, last_note: t.last }).setContext(ctx).draw();

  // Número do compasso acima da barra, como em partitura impressa.
  const topY = (stave || tabstave).getYForTopText(1) - (stave ? 6 : 2);
  ctx.save();
  ctx.setFont("Space Mono, monospace", 9, "bold");
  ctx.setFillStyle(dim);
  ctx.fillText("1", (stave || tabstave).getNoteStartX() + 2, topY);
  const trailing = cols.length > 0 && cols[cols.length - 1].kind === "bar";
  const last = marks.length - (trailing ? 1 : 0);
  marks.forEach((b, k) => {
    if (k >= last) return;
    let x = 0;
    try { x = b.getAbsoluteX(); } catch (e) { x = 0; }
    if (x > 0) ctx.fillText(String(k + 2), x + 5, topY);
  });
  ctx.restore();

  // Os números da tab saem em Arial pelo VexFlow: passam para a mono do app.
  try {
    host.querySelectorAll("text").forEach(t => {
      if ((t.getAttribute("font-family") || "").indexOf("Arial") > -1) {
        t.setAttribute("font-family", "'Space Mono', monospace");
        t.setAttribute("font-weight", "700");
      }
    });
  } catch (e) { /* sem SVG */ }

  // Clicar na nota desenhada seleciona — a pauta deixa de ser só saída.
  if (o.onPick) {
    for (const h of hit) {
      for (const n of [h.sn, h.tn]) {
        let el = null;
        try { el = n.getSVGElement ? n.getSVGElement() : (n.attrs && n.attrs.el); } catch (e) { el = null; }
        if (!el) continue;
        el.style.cursor = "pointer";
        el.addEventListener("click", (ev) => { ev.stopPropagation(); o.onPick(h.i); });
      }
    }
  }
  return { width: W, height: H };
}
