/**
 * Stroke icons for the cifra chrome. Lucide 24×24, round caps — the same
 * family as the pencil that already replaced `✎`. No npm icon package:
 * only the names the UI actually draws.
 *
 * Lucide `repeat` (circular arrows) is absent on purpose — it reads as
 * refresh. Chorus uses `repeatBar`, the |: barline.
 *
 * `check` is not Lucide's wide tick. Sora/Space Mono/Figtree are Latin
 * subsets, so Unicode `✓` (Dingbats U+2713) falls back to Apple Symbols /
 * Noto Sans Symbols / Segoe UI Symbol — three different glyphs. This path
 * is a compact ✓ so a long setlist stays quiet and identical on every OS.
 */
export type IconNode = { tag: string; attrs: Record<string, string> }

export const ICONS = {
  chevronsDown: [
    { tag: 'path', attrs: { d: 'm7 6 5 5 5-5' } },
    { tag: 'path', attrs: { d: 'm7 13 5 5 5-5' } },
  ],
  square: [
    {
      tag: 'rect',
      attrs: { width: '14', height: '14', x: '5', y: '5', rx: '2', fill: 'currentColor', stroke: 'none' },
    },
  ],
  maximize2: [
    { tag: 'polyline', attrs: { points: '15 3 21 3 21 9' } },
    { tag: 'polyline', attrs: { points: '9 21 3 21 3 15' } },
    { tag: 'line', attrs: { x1: '21', x2: '14', y1: '3', y2: '10' } },
    { tag: 'line', attrs: { x1: '3', x2: '10', y1: '21', y2: '14' } },
  ],
  pencil: [
    {
      tag: 'path',
      attrs: {
        d: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z',
      },
    },
    { tag: 'path', attrs: { d: 'm15.385 4.221 4.394 4.394' } },
  ],
  sunMoon: [
    { tag: 'path', attrs: { d: 'M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-4-4' } },
    { tag: 'path', attrs: { d: 'M12 2v2' } },
    { tag: 'path', attrs: { d: 'M12 20v2' } },
    { tag: 'path', attrs: { d: 'm4.9 4.9 1.4 1.4' } },
    { tag: 'path', attrs: { d: 'm17.7 17.7 1.4 1.4' } },
    { tag: 'path', attrs: { d: 'M2 12h2' } },
    { tag: 'path', attrs: { d: 'M20 12h2' } },
    { tag: 'path', attrs: { d: 'm6.3 17.7-1.4 1.4' } },
    { tag: 'path', attrs: { d: 'm19.1 4.9-1.4 1.4' } },
  ],
  sun: [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '4' } },
    { tag: 'path', attrs: { d: 'M12 2v2' } },
    { tag: 'path', attrs: { d: 'M12 20v2' } },
    { tag: 'path', attrs: { d: 'm4.93 4.93 1.41 1.41' } },
    { tag: 'path', attrs: { d: 'm17.66 17.66 1.41 1.41' } },
    { tag: 'path', attrs: { d: 'M2 12h2' } },
    { tag: 'path', attrs: { d: 'M20 12h2' } },
    { tag: 'path', attrs: { d: 'm6.34 17.66-1.41 1.41' } },
    { tag: 'path', attrs: { d: 'm19.07 4.93-1.41 1.41' } },
  ],
  moon: [{ tag: 'path', attrs: { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' } }],
  download: [
    { tag: 'path', attrs: { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' } },
    { tag: 'polyline', attrs: { points: '7 10 12 15 17 10' } },
    { tag: 'line', attrs: { x1: '12', x2: '12', y1: '15', y2: '3' } },
  ],
  ellipsis: [
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '1' } },
    { tag: 'circle', attrs: { cx: '19', cy: '12', r: '1' } },
    { tag: 'circle', attrs: { cx: '5', cy: '12', r: '1' } },
  ],
  scan: [
    { tag: 'path', attrs: { d: 'M3 7V5a2 2 0 0 1 2-2h2' } },
    { tag: 'path', attrs: { d: 'M17 3h2a2 2 0 0 1 2 2v2' } },
    { tag: 'path', attrs: { d: 'M21 17v2a2 2 0 0 1-2 2h-2' } },
    { tag: 'path', attrs: { d: 'M7 21H5a2 2 0 0 1-2-2v-2' } },
  ],
  glasses: [
    { tag: 'circle', attrs: { cx: '6', cy: '15', r: '4' } },
    { tag: 'circle', attrs: { cx: '18', cy: '15', r: '4' } },
    { tag: 'path', attrs: { d: 'M14 15a2 2 0 0 0-2-2 2 2 0 0 0-2 2' } },
    { tag: 'path', attrs: { d: 'M2.5 13 5 7c.7-1.3 1.4-2 3-2' } },
    { tag: 'path', attrs: { d: 'M21.5 13 19 7c-.7-1.3-1.5-2-3-2' } },
  ],
  metronome: [
    { tag: 'path', attrs: { d: 'M8.2 21h7.6L14.4 4.4a1.2 1.2 0 0 0-1.18-1.02h-2.44A1.2 1.2 0 0 0 9.6 4.4Z' } },
    { tag: 'path', attrs: { d: 'M12 7.2 17.2 3.4' } },
    { tag: 'circle', attrs: { cx: '18.2', cy: '2.7', r: '1.5' } },
    { tag: 'path', attrs: { d: 'M10.2 13h3.6' } },
  ],
  chevronLeft: [{ tag: 'path', attrs: { d: 'm15 18-6-6 6-6' } }],
  chevronRight: [{ tag: 'path', attrs: { d: 'm9 18 6-6-6-6' } }],
  chevronUp: [{ tag: 'path', attrs: { d: 'm18 15-6-6-6 6' } }],
  chevronDown: [{ tag: 'path', attrs: { d: 'm6 9 6 6 6-6' } }],
  listMusic: [
    { tag: 'path', attrs: { d: 'M21 15V6' } },
    { tag: 'path', attrs: { d: 'M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z' } },
    { tag: 'path', attrs: { d: 'M12 12H3' } },
    { tag: 'path', attrs: { d: 'M16 6H3' } },
    { tag: 'path', attrs: { d: 'M12 18H3' } },
  ],
  undo2: [
    { tag: 'path', attrs: { d: 'M9 14 4 9l5-5' } },
    { tag: 'path', attrs: { d: 'M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11' } },
  ],
  redo2: [
    { tag: 'path', attrs: { d: 'm15 14 5-5-5-5' } },
    { tag: 'path', attrs: { d: 'M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13' } },
  ],
  plus: [
    { tag: 'path', attrs: { d: 'M5 12h14' } },
    { tag: 'path', attrs: { d: 'M12 5v14' } },
  ],
  braces: [
    { tag: 'path', attrs: { d: 'M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1' } },
    { tag: 'path', attrs: { d: 'M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1' } },
  ],
  arrowLR: [
    { tag: 'path', attrs: { d: 'M8 3 4 7l4 4' } },
    { tag: 'path', attrs: { d: 'M4 7h16' } },
    { tag: 'path', attrs: { d: 'm16 21 4-4-4-4' } },
    { tag: 'path', attrs: { d: 'M20 17H4' } },
  ],
  music2: [
    { tag: 'circle', attrs: { cx: '8', cy: '18', r: '4' } },
    { tag: 'path', attrs: { d: 'M12 18V2l7 4' } },
  ],
  /** Lucide guitar — Ensaio Batida chrome (same stroke family as metronome). */
  guitar: [
    { tag: 'path', attrs: { d: 'm11.9 12.1 4.514-4.514' } },
    {
      tag: 'path',
      attrs: {
        d: 'M20.1 2.3a1 1 0 0 0-1.4 0l-1.114 1.114A2 2 0 0 0 17 4.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 17.828 7h1.344a2 2 0 0 0 1.414-.586L21.7 5.3a1 1 0 0 0 0-1.4z',
      },
    },
    { tag: 'path', attrs: { d: 'm6 16 2 2' } },
    {
      tag: 'path',
      attrs: {
        d: 'M8.2 9.9C8.7 8.8 9.8 8 11 8c2.8 0 5 2.2 5 5 0 1.2-.8 2.3-1.9 2.8l-.9.4A2 2 0 0 0 12 18a4 4 0 0 1-4 4c-3.3 0-6-2.7-6-6a4 4 0 0 1 4-4 2 2 0 0 0 1.8-1.2z',
      },
    },
    { tag: 'circle', attrs: { cx: '11.5', cy: '12.5', r: '.5', fill: 'currentColor' } },
  ],
  image: [
    { tag: 'rect', attrs: { width: '18', height: '18', x: '3', y: '3', rx: '2' } },
    { tag: 'circle', attrs: { cx: '9', cy: '9', r: '2' } },
    { tag: 'path', attrs: { d: 'm21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21' } },
  ],
  msgQuote: [
    { tag: 'path', attrs: { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' } },
    { tag: 'path', attrs: { d: 'M8 12h.01' } },
    { tag: 'path', attrs: { d: 'M12 12h.01' } },
    { tag: 'path', attrs: { d: 'M16 12h.01' } },
  ],
  alignLeft: [
    { tag: 'path', attrs: { d: 'M15 12H3' } },
    { tag: 'path', attrs: { d: 'M17 18H3' } },
    { tag: 'path', attrs: { d: 'M21 6H3' } },
  ],
  gripV: [
    { tag: 'circle', attrs: { cx: '9', cy: '12', r: '1' } },
    { tag: 'circle', attrs: { cx: '9', cy: '5', r: '1' } },
    { tag: 'circle', attrs: { cx: '9', cy: '19', r: '1' } },
    { tag: 'circle', attrs: { cx: '15', cy: '12', r: '1' } },
    { tag: 'circle', attrs: { cx: '15', cy: '5', r: '1' } },
    { tag: 'circle', attrs: { cx: '15', cy: '19', r: '1' } },
  ],
  copy: [
    { tag: 'rect', attrs: { width: '14', height: '14', x: '8', y: '8', rx: '2' } },
    { tag: 'path', attrs: { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' } },
  ],
  trash2: [
    { tag: 'path', attrs: { d: 'M3 6h18' } },
    { tag: 'path', attrs: { d: 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' } },
    { tag: 'path', attrs: { d: 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' } },
    { tag: 'line', attrs: { x1: '10', x2: '10', y1: '11', y2: '17' } },
    { tag: 'line', attrs: { x1: '14', x2: '14', y1: '11', y2: '17' } },
  ],
  eyeOff: [
    {
      tag: 'path',
      attrs: {
        d: 'M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49',
      },
    },
    { tag: 'path', attrs: { d: 'M14.084 14.158a3 3 0 0 1-4.242-4.242' } },
    {
      tag: 'path',
      attrs: {
        d: 'M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143',
      },
    },
    { tag: 'path', attrs: { d: 'm2 2 20 20' } },
  ],
  rotateCcw: [
    { tag: 'path', attrs: { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' } },
    { tag: 'path', attrs: { d: 'M3 3v5h5' } },
  ],
  x: [
    { tag: 'path', attrs: { d: 'M18 6 6 18' } },
    { tag: 'path', attrs: { d: 'm6 6 12 12' } },
  ],
  link: [
    { tag: 'path', attrs: { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' } },
    { tag: 'path', attrs: { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' } },
  ],
  fileInput: [
    { tag: 'path', attrs: { d: 'M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4' } },
    { tag: 'path', attrs: { d: 'M14 2v4a2 2 0 0 0 2 2h4' } },
    { tag: 'path', attrs: { d: 'M2 15h10' } },
    { tag: 'path', attrs: { d: 'm9 18 3-3-3-3' } },
  ],
  filePlus: [
    { tag: 'path', attrs: { d: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z' } },
    { tag: 'path', attrs: { d: 'M14 2v4a2 2 0 0 0 2 2h4' } },
    { tag: 'path', attrs: { d: 'M9 15h6' } },
    { tag: 'path', attrs: { d: 'M12 18v-6' } },
  ],
  alertTri: [
    {
      tag: 'path',
      attrs: {
        d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3',
      },
    },
    { tag: 'path', attrs: { d: 'M12 9v4' } },
    { tag: 'path', attrs: { d: 'M12 17h.01' } },
  ],
  check: [{ tag: 'path', attrs: { d: 'M6.4 12.3 10.2 16.5 17.6 7.8' } }],
  play: [{ tag: 'polygon', attrs: { points: '6 3 20 12 6 21 6 3', fill: 'currentColor', stroke: 'none' } }],
  pause: [
    { tag: 'rect', attrs: { x: '6', y: '4', width: '4', height: '16', rx: '1', fill: 'currentColor', stroke: 'none' } },
    { tag: 'rect', attrs: { x: '14', y: '4', width: '4', height: '16', rx: '1', fill: 'currentColor', stroke: 'none' } },
  ],
  layers: [
    {
      tag: 'path',
      attrs: {
        d: 'M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z',
      },
    },
    { tag: 'path', attrs: { d: 'm22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65' } },
    { tag: 'path', attrs: { d: 'm22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65' } },
  ],
  list: [
    { tag: 'path', attrs: { d: 'M8 6h13' } },
    { tag: 'path', attrs: { d: 'M8 12h13' } },
    { tag: 'path', attrs: { d: 'M8 18h13' } },
    { tag: 'path', attrs: { d: 'M3 6h.01' } },
    { tag: 'path', attrs: { d: 'M3 12h.01' } },
    { tag: 'path', attrs: { d: 'M3 18h.01' } },
  ],
  /** Lucide headphones — rehearsal reference, not a play triangle. */
  headphones: [
    {
      tag: 'path',
      attrs: {
        d: 'M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M8.3 12c1.05-3.3 2.1-3.3 3.15 0s2.1 3.3 3.15 0 2.1-3.3 3.15 0',
        fill: 'none',
        'stroke-width': '2.6',
        'data-audio-wave': '1',
      },
    },
    {
      tag: 'path',
      attrs: {
        d: 'M8.6 12c.9-2.2 1.8-2.2 2.7 0s1.8 2.2 2.7 0 1.8-2.2 2.7 0',
        fill: 'none',
        'stroke-width': '1.6',
        'data-audio-wave': '2',
      },
    },
  ],
  /** Music notation start-repeat |: — two dots and the thick bar. */
  repeatBar: [
    { tag: 'rect', attrs: { x: '7', y: '4', width: '1.4', height: '16', rx: '0.4', fill: 'currentColor', stroke: 'none' } },
    { tag: 'rect', attrs: { x: '10', y: '4', width: '2.4', height: '16', rx: '0.4', fill: 'currentColor', stroke: 'none' } },
    { tag: 'circle', attrs: { cx: '15.2', cy: '9', r: '1.5', fill: 'currentColor', stroke: 'none' } },
    { tag: 'circle', attrs: { cx: '15.2', cy: '15', r: '1.5', fill: 'currentColor', stroke: 'none' } },
  ],
} as const satisfies Record<string, IconNode[]>

export type CpvIconName = keyof typeof ICONS

/** Names the JSON selection locked. Type stays A−/A+. Chorus is `repeatBar`. */
export const PICKED_ICONS = [
  'chevronsDown',
  'square',
  'maximize2',
  'pencil',
  'sunMoon',
  'sun',
  'moon',
  'download',
  'ellipsis',
  'scan',
  'glasses',
  'metronome',
  'chevronLeft',
  'chevronRight',
  'listMusic',
  'undo2',
  'redo2',
  'plus',
  'braces',
  'arrowLR',
  'music2',
  'guitar',
  'image',
  'msgQuote',
  'alignLeft',
  'repeatBar',
  'gripV',
  'chevronUp',
  'chevronDown',
  'copy',
  'trash2',
  'eyeOff',
  'rotateCcw',
  'x',
  'fileInput',
  'filePlus',
  'alertTri',
  'check',
  'play',
  'pause',
] as const satisfies readonly CpvIconName[]
