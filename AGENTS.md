# titan-chordpro-ui agent

1. Read [`docs/VISAO.md`](docs/VISAO.md) (product SoT) and [`SPEC.md`](SPEC.md) (engineering contract) end-to-end.
2. Stack **ratified:** Vue-first UI + TypeScript **core** (no Vue in core) + agnostic controller; React/CE bindings later under demand — see `docs/analysis-expansao-futura.md`.
3. Implement in the order of SPEC §10.
4. Claim DONE only when SPEC §9 acceptance table is green (core + Vue package rows).
5. Do not invent ChordPro fixtures — use `fixtures/`.
6. **No Vue imports in core** (`src/core/**` or equivalent). Vue UI lives in `src/vue/**` or package entry `titan-chordpro-ui/vue`.
7. Do not add a runtime `VisualAdapter` / multi-stack plugin registry in v0.1.
8. Naming lock: [`docs/NAMING.md`](docs/NAMING.md) · rebrand checklist: [`docs/REBRAND-HANDOFF.md`](docs/REBRAND-HANDOFF.md).
9. **`x///` is the clock, not lyrics.** `x` is always the **head** of the time; `/` is a beat that is not. `[Cm]//` with no `x` is two beats in 4/4 (also as a phrase tail). Voiceless stretches: `[G]x///`. SoT: [`docs/MARCAS-X.md`](docs/MARCAS-X.md). Do **not** strip those marks from the source to “clean” a lyric. Só letra hides them in the **reading projection** only. Do not guess bars from chord count. Do not treat a sung-line tail as the duration of the whole verse. Do not require `x` on every group.
