# Handoff — Rebrand `chordpro-viewer` → `titan-chordpro-ui`

> **Audience:** agent or human executing the rename.  
> **Locked:** 2026-08-28 (NAMING); execution 2026-08-29.  
> **SoT:** [`NAMING.md`](./NAMING.md) · sibling gen: [`../titan-chordpro-gen/docs/REBRAND-HANDOFF.md`](../../titan-chordpro-gen/docs/REBRAND-HANDOFF.md).

---

## 1. Decision (do not re-litigate)

| Piece | Target name | Role |
|---|---|---|
| **This repo** | **`titan-chordpro-ui`** | Viewer **+** editor (one layer) |
| **Generator sibling** | **`titan-chordpro-gen`** | Audio → ChordPro — separate repo |
| **App / studio** | `titan-chordpro` | Future host — **not now** |
| **SDA** | `sda-v2` | First consumer — consumes **ui** only |

**Why `-ui`:** `viewer` undersells once the editor lives in the same package.

---

## 2. Locked API / identity choices (2026-08-29)

| Concern | Decision |
|---|---|
| npm package | **`@henryavila/titan-chordpro-ui`** (scoped; same publish pattern as `@henryavila/mdprobe`) |
| exports | `"."` (core), `"./pdf"`, `"./slides"`, `"./vue"` |
| CLI bin | **`titan-chordpro-ui`** |
| Vue SFC | **`ChordproViewer`** (keep — SDA mental model) |
| CSS / DOM prefix | **`cpv-*`**, `[data-cpv-scroll]` (keep — technical, stable) |
| Controller | `createViewerController` / `ViewerController` (keep — domain “view session”) |

---

## 3. Already done before this handoff

- [x] GitHub repo renamed → `henryavila/titan-chordpro-ui`
- [x] `git remote origin` → `https://github.com/henryavila/titan-chordpro-ui.git`
- [x] `projects/titan-chordpro-ui/` + `design-handoff-editor/` already use product name

---

## 4. Checklist (execute in order)

### 4.1 Preflight

- [x] Restore accidental local deletions (fixtures/images) if dirty
- [x] Decide worktree: remove `.worktrees/editor` before folder move
- [x] Note: no `package.json` yet — identity must land in docs **before** scaffold

### 4.2 Docs & branding (this repo)

- [x] `SPEC.md` — title, path, §4 exports, §8 CLI, §11 dep, §12.1 npm lock
- [x] `AGENTS.md` — title + Vue package path `@henryavila/titan-chordpro-ui/vue`
- [x] `README.md` — product title (not “seed → target”)
- [x] `docs/NAMING.md`, `docs/VISAO.md` — present tense; former name as one-line note only
- [x] `design-handoff/*` titles → `titan-chordpro-ui`
- [x] `docs/analysis-*.md`, `research-stack.md` — package diagrams to new name

### 4.3 Filesystem + GitHub

- [x] GitHub rename (operator — already done)
- [x] `git worktree remove` for `.worktrees/editor` (plan files rescued into `.atomic-skills/projects/…`)
- [x] `mv …/chordpro-viewer …/titan-chordpro-ui`
- [x] Recreate worktree: `git worktree add .worktrees/editor plan/editor`

### 4.4 Cross-repo docs (same window)

| Consumer | Action |
|---|---|
| **`titan-chordpro-gen`** | Paths → `../titan-chordpro-ui` in REBRAND-HANDOFF + roadmap — **done** |
| **`sda-v2` design-handoff** | Paths/SPEC pointers → `titan-chordpro-ui`; **no** Nuxt runtime edits — **done** |
| **`sda-v2` frontend** | Out of scope until cutover |

### 4.5 Verify

- [x] `rg chordpro-viewer` in this repo ≈ 0 (except “formerly” / handoff title notes)
- [x] `git remote -v` still `titan-chordpro-ui`
- [x] Local basename = `titan-chordpro-ui`
- [x] Sibling + SDA doc links updated

### 4.6 Done criteria

1. Local directory + GitHub = `titan-chordpro-ui`
2. SPEC/AGENTS/README/NAMING/VISAO/handoffs use product name
3. npm/CLI identity locked as above (scaffold will follow)
4. Sibling gen + sda design-handoff paths updated
5. Worktree healthy or intentionally removed

---

## 5. Explicit non-goals

- Do **not** rename generator here (own handoff).
- Do **not** create `titan-chordpro` app shell.
- Do **not** edit `sda-v2/frontend` runtime.
- Do **not** change `--cpv-*` / `ChordproViewer` symbol in this pass.
- Do **not** rewrite git history.

---

## 6. Suggested commit

```
chore: rebrand repository to titan-chordpro-ui

- Docs/SPEC/AGENTS/CLI/npm identity → titan-chordpro-ui
- Keep ChordproViewer + cpv-* technical names
- Sibling gen + sda design-handoff path updates
- See docs/REBRAND-HANDOFF.md
```
