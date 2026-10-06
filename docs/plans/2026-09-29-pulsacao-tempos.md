# Pulsação dos tempos do compasso — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fazer todos os tempos do compasso visíveis na coluna (1 preto/branco, 2–4 na cor do tema) e corrigir a faixa do título para um pulso quadrado de meio tempo (ataque + contratempo).

**Architecture:** Uma função pura `metronomePulseHit(running, beat, beatClock)` decide `'' | '1' | 'n'` pela fração de `beatClock` (ataque se `< 0,5`). O viewer troca o `watch`+`nextTick` por essa função. A coluna continua em `met.beat` o pulso inteiro, só mudam as cores CSS. A faixa `cpv-head-hit-n` deixa o fade e pinta `--chord` como o 1 pinta `--downbeat`.

**Tech Stack:** Vue 3 + TypeScript, CSS tokens em `src/vue/cpv.css`, Vitest (`./node_modules/.bin/vitest run`). Sem Vue em `src/core`.

**Design:** `docs/plans/2026-09-29-pulsacao-tempos-design.md`

**Skills:** @superpowers:test-driven-development @impeccable (operate — coluna e faixa já existem; não redesenhar o mundo)

---

### Task 1: Função pura do pulso 50/50

**Files:**
- Create: `tests/vue/metronome-pulse.test.ts`
- Modify: `src/vue/use/useMetronome.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { metronomePulseHit } from '../../src/vue/use/useMetronome'

describe('metronomePulseHit', () => {
  it('is silent when the clock is stopped', () => {
    expect(metronomePulseHit(false, 0, 0)).toBe('')
  })

  it('marks beat 1 on the attack', () => {
    expect(metronomePulseHit(true, 0, 0)).toBe('1')
    expect(metronomePulseHit(true, 0, 0.49)).toBe('1')
  })

  it('rests on the off-beat half, including exactly 0.5', () => {
    expect(metronomePulseHit(true, 0, 0.5)).toBe('')
    expect(metronomePulseHit(true, 0, 0.99)).toBe('')
  })

  it('marks beats 2–4 as n on the attack', () => {
    expect(metronomePulseHit(true, 1, 1.0)).toBe('n')
    expect(metronomePulseHit(true, 2, 2.2)).toBe('n')
    expect(metronomePulseHit(true, 3, 3.49)).toBe('n')
  })

  it('rests on the off-beat of n', () => {
    expect(metronomePulseHit(true, 1, 1.5)).toBe('')
    expect(metronomePulseHit(true, 3, 3.8)).toBe('')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run tests/vue/metronome-pulse.test.ts`

Expected: FAIL — `metronomePulseHit` is not exported.

**Step 3: Write minimal implementation**

In `src/vue/use/useMetronome.ts`, above `useMetronome`:

```ts
/**
 * Attack (tempo) is the first half of the beat; the second half is the rest
 * (contratempo). Beat 0 is the downbeat ('1'); any other beat is 'n'.
 */
export function metronomePulseHit(
  running: boolean,
  beat: number,
  beatClock: number,
): '' | '1' | 'n' {
  if (!running) return ''
  const frac = beatClock - Math.floor(beatClock)
  if (frac >= 0.5) return ''
  return beat === 0 ? '1' : 'n'
}
```

**Step 4: Run the tests and make sure they pass**

Run: `./node_modules/.bin/vitest run tests/vue/metronome-pulse.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add tests/vue/metronome-pulse.test.ts src/vue/use/useMetronome.ts
git commit -m "feat: pulso 50/50 no relógio do metrônomo"
```

---

### Task 2: Cores da coluna 1–2–3–4

**Files:**
- Modify: `tests/vue/chrome-contrast.test.ts:19-33`
- Modify: `tests/vue/metronome.test.ts:774-819`
- Modify: `src/vue/cpv.css:1585-1596`

**Step 1: Write the failing test**

In `chrome-contrast.test.ts`, replace the pulse expectations:

```ts
it('beat numbers stay bare; beat 1 is ink, 2–4 wear the theme', () => {
  const idle = css.match(/\.cpv-met-beat\s*\{[^}]+\}/)?.[0] ?? ''
  expect(idle).toMatch(/background:\s*transparent/)
  expect(idle).toMatch(/border:\s*0/)
  const pulse = css.match(/\.cpv-met-beat\.is-now\s*\{[^}]+\}/)?.[0] ?? ''
  expect(pulse).toMatch(/background:\s*var\(--chord\)/)
  expect(pulse).toMatch(/color:\s*var\(--chord-ink\)/)
  const one = css.match(/\.cpv-met-beat\.is-now\.is-one\s*\{[^}]+\}/)?.[0] ?? ''
  expect(one).toMatch(/background:\s*var\(--downbeat\)/)
  expect(one).toMatch(/color:\s*var\(--downbeat-ink\)/)
  expect(css).toMatch(/--beat-rest:\s*#E8EAF0/)
  expect(css).toMatch(/\[data-theme='light'\][\s\S]*?--beat-rest:\s*#FFFFFF/)
  expect(css).not.toMatch(/\.cpv-met-hit-1\s+\.cpv-met-beat\.is-now/)
  expect(css).not.toMatch(/\.cpv-met-hit-n\s+\.cpv-met-beat\.is-now/)
})
```

In `metronome.test.ts`, rewrite the describe that still says “white chip”:

```ts
/**
 * The 1–2–3–4 column is numbers. A box on every cell fought the lyric
 * underneath; only the pulse fills. Beat 1 is ink (--downbeat); 2–3–4
 * wear the theme (--chord).
 */
describe('beat numbers are bare; only the pulse fills', () => {
  function transparent(bg: string) {
    return bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)' || bg === 'rgba(0,0,0,0)'
  }

  it('does not fade idle beats with opacity', async () => {
    const w = await viewerAt(390)
    const idle = w.findAll('.cpv-met-beat').filter((b) => !b.classes().includes('is-now'))
    expect(idle.length).toBeGreaterThan(0)
    const style = getComputedStyle(idle[0]!.element)
    expect(Number.parseFloat(style.opacity)).toBeGreaterThan(0.9)
  })

  it('leaves idle beats as numbers — no fill, no edge', async () => {
    const w = await viewerAt(390)
    const idle = w.findAll('.cpv-met-beat').filter((b) => !b.classes().includes('is-now'))
    const style = getComputedStyle(idle[0]!.element)
    expect(transparent(style.backgroundColor), `idle still boxed (${style.backgroundColor})`).toBe(true)
    expect(parseFloat(style.borderTopWidth) === 0 || style.borderTopStyle === 'none').toBe(true)
  })

  it('marks exactly one beat as the pulse', async () => {
    const w = await viewerAt(390)
    const now = w.findAll('.cpv-met-beat').filter((b) => b.classes().includes('is-now'))
    expect(now).toHaveLength(1)
    expect(getComputedStyle(now[0]!.element).fontWeight).toMatch(/700|bold/)
  })

  it('keeps is-one on beat 1 so the downbeat can wear ink', async () => {
    const w = await viewerAt(390)
    const cells = w.findAll('.cpv-met-beat')
    expect(cells.length).toBeGreaterThan(1)
    expect(cells[0]!.classes()).toContain('is-one')
    for (const cell of cells.slice(1)) {
      expect(cell.classes()).not.toContain('is-one')
    }
  })

  it('paints beat 1 with downbeat tokens, not the theme green', async () => {
    const w = await viewerAt(390)
    const one = w.get('.cpv-met-beat.is-now.is-one').element as HTMLElement
    const css = getComputedStyle(one)
    expect(css.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
    expect(css.getPropertyValue('background-color')).toBeTruthy()
    const raw = (one as HTMLElement).getAttribute('class') ?? ''
    expect(raw).toContain('is-one')
  })
})
```

The last test is weak in jsdom (tokens may not resolve). Prefer asserting the stylesheet like chrome-contrast; the class `is-one` + CSS contract is the gate. Drop the last test if computed color is `rgb()` from jsdom and cannot see the var. The chrome-contrast string match is the SoT.

**Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run tests/vue/chrome-contrast.test.ts tests/vue/metronome.test.ts`

Expected: FAIL — `.cpv-met-beat.is-now` still has `--beat-rest`.

**Step 3: Write minimal implementation**

In `src/vue/cpv.css`:

```css
.cpv-met-beat.is-now {
  font-weight: 700;
  background: var(--chord);
  color: var(--chord-ink);
  border: 1px solid transparent;
}
/* Downbeat is ink (black/white of the theme); 2–4 keep --chord above. */
.cpv-met-beat.is-now.is-one {
  background: var(--downbeat);
  color: var(--downbeat-ink);
  border-color: transparent;
}
```

**Step 4: Run the tests and make sure they pass**

Run: `./node_modules/.bin/vitest run tests/vue/chrome-contrast.test.ts tests/vue/metronome.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add tests/vue/chrome-contrast.test.ts tests/vue/metronome.test.ts src/vue/cpv.css
git commit -m "fix: 1 preto/branco e 2–4 na cor do tema na coluna"
```

---

### Task 3: Pontos do painel do metrônomo

**Files:**
- Modify: `src/vue/sheets/MetronomeSheet.vue:66-83`
- Test: `tests/vue/metronome.test.ts` (add a case that the sheet source no longer uses `--beat-rest` for live fill)

**Step 1: Write the failing test**

Add at the bottom of `tests/vue/metronome.test.ts` (or in chrome-contrast if you prefer reading the vue file):

```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('metronome sheet beat dots match the column', () => {
  const src = readFileSync(join(process.cwd(), 'src/vue/sheets/MetronomeSheet.vue'), 'utf8')

  it('paints beat 1 with downbeat, 2–4 with chord', () => {
    expect(src).toMatch(/liveFill = accent \? 'var\(--downbeat\)' : 'var\(--chord\)'/)
    expect(src).toMatch(/liveInk = accent \? 'var\(--downbeat\)' : 'var\(--chord\)'/)
    expect(src).not.toMatch(/liveFill = accent \? 'var\(--chord\)' : 'var\(--beat-rest\)'/)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run tests/vue/metronome.test.ts`

Expected: FAIL — still `--beat-rest`.

**Step 3: Write minimal implementation**

```ts
    const liveFill = accent ? 'var(--downbeat)' : 'var(--chord)'
    const liveInk = accent ? 'var(--downbeat)' : 'var(--chord)'
```

Update the comment above: “Beat 1 is ink; 2–3–4 wear the theme.”

Idle edge of the accent: `'var(--downbeat)'` instead of `'var(--chord-edge)'` so the resting 1 already reads as the ink beat.

```ts
      edge: live ? liveFill : accent ? 'var(--downbeat)' : 'var(--line)',
```

**Step 4: Run the tests and make sure they pass**

Run: `./node_modules/.bin/vitest run tests/vue/metronome.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/vue/sheets/MetronomeSheet.vue tests/vue/metronome.test.ts
git commit -m "fix: pontos do metrônomo na mesma língua da coluna"
```

---

### Task 4: Ligar a faixa e os acordes na função 50/50

**Files:**
- Modify: `src/vue/ChordproViewer.vue:1183-1202`
- Test: `tests/vue/metronome.test.ts` (existing “paints the title strip only after the panel asks for it” must still pass; add clock-driven off-half)

**Step 1: Write the failing test**

In `tests/vue/metronome-pulse.test.ts`, add a clock integration using the existing `met()` helper pattern — copy the small `met` + fake timers from `metronome.test.ts` *or* import nothing extra and keep this in `metronome.test.ts`:

```ts
it('the live clock is on the attack just after start and off at half a beat', () => {
  const { m } = met()
  m.countInOn.value = false
  m.start()
  settle()
  expect(metronomePulseHit(m.running.value, m.beat.value, m.beatClock.value)).toBe('1')
  vi.advanceTimersByTime(250) // 120 BPM → 500 ms beat
  expect(metronomePulseHit(m.running.value, m.beat.value, m.beatClock.value)).toBe('')
  m.stop()
  expect(metronomePulseHit(m.running.value, m.beat.value, m.beatClock.value)).toBe('')
})
```

Also grep-gate that the viewer no longer uses the nextTick retrigger for `metHit`:

```ts
it('the title hit follows beatClock, not a nextTick retrigger', () => {
  const src = readFileSync(join(process.cwd(), 'src/vue/ChordproViewer.vue'), 'utf8')
  expect(src).toMatch(/metronomePulseHit\(/)
  expect(src).not.toMatch(/metHit\.value = ''/)
})
```

Put that second test in `tests/vue/metronome-pulse.test.ts` — it will fail until wiring.

**Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run tests/vue/metronome-pulse.test.ts`

Expected: FAIL — viewer still assigns `metHit.value = ''`.

**Step 3: Write minimal implementation**

In `ChordproViewer.vue`:

- Import `metronomePulseHit` from `./use/useMetronome`.
- Replace the `metHit` ref + `watch` with:

```ts
const metHit = computed(() =>
  metronomePulseHit(met.running.value, met.beat.value, met.beatClock.value),
)
```

`headHitClass` / `rootHitClass` stay as they are (`pulseHead` still gates the title). `metHitMs` stays for chord CSS.

Do **not** remove other `nextTick` uses in this file.

**Step 4: Run the tests and make sure they pass**

Run: `./node_modules/.bin/vitest run tests/vue/metronome-pulse.test.ts tests/vue/metronome.test.ts tests/vue/head-chip.test.ts`

Expected: PASS. Title still paints only when the panel asked (`metPulseHead`).

**Step 5: Commit**

```bash
git add src/vue/ChordproViewer.vue tests/vue/metronome-pulse.test.ts
git commit -m "fix: faixa do título pulsa meio a meio no relógio"
```

---

### Task 5: Pintura estática de `cpv-head-hit-n`

**Files:**
- Modify: `tests/vue/chrome-contrast.test.ts` (new case next to beat-1 invert)
- Modify: `src/vue/cpv.css:1629-1635`

**Step 1: Write the failing test**

```ts
it('beat-n strip paints chord as a square pulse, chips stay a nested surface', () => {
  const head = css.match(/\.cpv-head-hit-n\s*\{[^}]+\}/)?.[0] ?? ''
  expect(head, 'n still fades via keyframes').not.toMatch(/animation:/)
  expect(head).toMatch(/--veil:\s*var\(--chord\)/)
  expect(head).toMatch(/--text:\s*var\(--chord-ink\)/)
  expect(head, 'remapping --chord on the strip eats the chips').not.toMatch(
    /--chord:\s*var\(--chord-ink\)/,
  )

  expect(css).toMatch(/\.cpv-head-hit-n\s+\.cpv-head-chip/)
  expect(css).not.toMatch(/@keyframes\s+cpv-head-n/)

  const chips = css.match(
    /\.cpv-head-hit-n\s+\.cpv-head-chip\s*\{[^}]+\}/,
  )?.[0] ?? ''
  expect(chips).toMatch(/--chord-soft:\s*var\(--chord-ink\)/)
  expect(chips).toMatch(/--text:\s*var\(--chord\)/)
  expect(chips).not.toMatch(/--chord:\s*var\(--downbeat\)/)
})
```

**Step 2: Run test to verify it fails**

Run: `./node_modules/.bin/vitest run tests/vue/chrome-contrast.test.ts`

Expected: FAIL — `.cpv-head-hit-n` still has `animation:` and `@keyframes cpv-head-n` exists.

**Step 3: Write minimal implementation**

Replace `.cpv-head-hit-n` + `@keyframes cpv-head-n` with:

```css
.cpv-head-hit-n {
  --veil: var(--chord);
  --line: var(--chord);
  --text: var(--chord-ink);
  --muted: color-mix(in srgb, var(--chord-ink) 72%, transparent);
  --sel: color-mix(in srgb, var(--chord-ink) 12%, transparent);
  --sel-line: color-mix(in srgb, var(--chord-ink) 28%, transparent);
  --hover: color-mix(in srgb, var(--chord-ink) 8%, transparent);
  color: var(--chord-ink);
}
.cpv-head-hit-n .cpv-head-chip {
  --text: var(--chord);
  --muted: color-mix(in srgb, var(--chord) 72%, transparent);
  --chord-soft: var(--chord-ink);
  --chord-fill: color-mix(in srgb, var(--chord) 16%, var(--chord-ink));
  --chord-hover: color-mix(in srgb, var(--chord-ink) 12%, transparent);
  --chord-edge: color-mix(in srgb, var(--chord-ink) 40%, transparent);
  --surface: color-mix(in srgb, var(--chord) 12%, var(--chord-ink));
  --line: color-mix(in srgb, var(--chord-ink) 40%, transparent);
  --sel: color-mix(in srgb, var(--chord-ink) 12%, transparent);
  --sel-line: color-mix(in srgb, var(--chord-ink) 28%, transparent);
  --hover: color-mix(in srgb, var(--chord-ink) 12%, transparent);
  color: var(--chord);
}
```

Do **not** remap `--chord` or `--chord-ink` on the chip (inherited values feed `--chord-soft`). Keep `.cpv-met-hit-1/.cpv-met-hit-n` chord animations.

**Step 4: Run the tests and make sure they pass**

Run: `./node_modules/.bin/vitest run tests/vue/chrome-contrast.test.ts tests/vue/head-chip.test.ts tests/vue/metronome.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add tests/vue/chrome-contrast.test.ts src/vue/cpv.css
git commit -m "fix: tempos 2–4 pintam a faixa na cor do tema"
```

---

### Task 6: Changelog e testes que ainda falam no chip branco

**Files:**
- Modify: `CHANGELOG.md` under `## [Unreleased]`
- Grep: `beat-rest` in vue/tests (piano + token definitions may remain)

**Step 1: Write the failing test**

```ts
// in chrome-contrast or metronome-pulse:
it('metronome pulse CSS does not fill 2–4 with --beat-rest', () => {
  const pulse = css.match(/\.cpv-met-beat\.is-now\s*\{[^}]+\}/)?.[0] ?? ''
  expect(pulse).not.toMatch(/--beat-rest/)
})
```

If Task 2 already forbids this, skip a new test — grep the tree:

```
rg "2–3–4 pulse as a white chip|só o tempo 1 usa a cor do tema" tests src
```

Replace leftover comments.

Add CHANGELOG under `### Changed` (visual language the musician sees) — this is a MINOR when released, not a patch:

```md
- **Pulsação do metrônomo:** na coluna à esquerda, o tempo 1 fica preto ou branco conforme o tema; 2, 3 e 4 pulsam na cor do tema e continuam visíveis. Com a faixa do título ligada, ela acende na cabeça de cada tempo e apaga no meio — o 1 deixa de ficar invertido até chegar o 2.
```

**Step 2:** No test-first for changelog. Write the entry. Grep must find no “white chip” pulse comments in vue/tests.

**Step 3:** Confirm `--beat-rest` remains in `diagram-draw.ts` and `:root` tokens.

**Step 4: Run**

```
./node_modules/.bin/vitest run tests/vue/chrome-contrast.test.ts tests/vue/metronome.test.ts tests/vue/metronome-pulse.test.ts tests/vue/head-chip.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add CHANGELOG.md tests src
git commit -m "docs: pulso visível em todos os tempos do compasso"
```

---

### Task 7: Verificar no browser

**Files:** none unless a bug shows up.

Demo already on `0.0.0.0:5173`. Open `http://127.0.0.1:5173/standalone.html` (any fixture with `{tempo:}` / `{time:}`).

1. Tecla `M` — coluna: 1 tinta do tema (preto no claro / branco no escuro); 2–4 verdes; ociosos só número.
2. Painel → ligar **Faixa do título** → Iniciar. Faixa inverte no 1 e pinta verde no 2–3–4; cada um apaga no meio do pulso.
3. Tema claro (`?tema=claro`) e escuro: mesmo contrato.
4. Rolar **sem** faixa do título: coluna pulsa, barra quieta.
5. Phone (390) e wide (1280).
6. 6/8 se houver cifra com `{time:6/8}`: dois números, não seis.

If something is wrong, write a failing test (Task 1–5 style) and fix — do not polish past one batched visual pass.

**Commit** only if a fix landed.

---

### Out of scope (do not touch)

- `src/core/diagram-draw.ts` piano `--beat-rest`
- Som, count-in, follow, Rolar silencioso
- `StrumStrip` / editor de batida
- Capar flash da faixa em BPM alto
- `package-lock.json` untracked
