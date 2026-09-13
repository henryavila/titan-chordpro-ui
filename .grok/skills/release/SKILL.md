---
name: release
description: >
  Cut a @henryavila/titan-chordpro-ui release: choose the semver bump, write
  CHANGELOG + package.json, tag, and create the GitHub Release that OIDC-stages
  npm. Use when the user says release, lançar, bump, version, publish, npm,
  GitHub release, or /release. Never pick patch/minor/major by hand.
---

# Release

The chooser is `scripts/semver-bump.ts`. Do not invent the bump.

## Rule (why 0.1.1–0.1.3 were wrong)

| Signal | Bump |
|---|---|
| `feat:` · changelog **Added** / **Changed** / **Deprecated** | **MINOR** (`0.1.3` → `0.2.0`) |
| `fix:` / `perf:` · **Fixed** / **Security** only | **PATCH** |
| `!:` / `BREAKING CHANGE` / **Removed** | **MAJOR** on 1.x; **MINOR** on 0.x (never auto `1.0.0`) |

Feature **is not** a patch. `~0.1.0` must only receive bugfixes. Baseline is **npm latest**, not the last GitHub tag (GH can lag).

Do not backfill a GitHub Release for a version already on npm — `publish.yml` would re-stage it.

## Run

```sh
pnpm release                       # plan; refuse to guess
pnpm exec tsx scripts/release.ts --json
pnpm test && pnpm typecheck
pnpm release:apply                 # package.json + CHANGELOG.md
```

Commit everything that belongs in the tag (`chore: release X.Y.Z`), then:

```sh
pnpm release:ship                  # annotated tag, push, gh release create
```

`--ship` requires a clean tree and notes under `## [X.Y.Z]`. It does **not** `npm publish`.

## After GitHub Release

`.github/workflows/publish.yml` stages via OIDC. The human promotes with **2FA na UI do npm** — never tell them to `npm stage approve` on the CLI.

Give the direct Versions tab URL (where the staged version is approved):

```
https://www.npmjs.com/package/@henryavila/titan-chordpro-ui?activeTab=versions
```

Open that page → **Approve** (2FA). Do not paste CLI `stage list` / `stage approve` as the handoff.

Do not run `npm publish`, `pnpm publish`, or `scripts/publish-npm.sh` for a version that will get a GitHub Release.

## Refuse

- `--apply` when kind is `none`
- GitHub Release whose version is already on npm
- Jump to `1.0.0` unless the user said so
- Empty Unreleased + no `feat`/`fix` commits (docs/chore only)
