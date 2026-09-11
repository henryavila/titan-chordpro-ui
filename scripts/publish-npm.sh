#!/usr/bin/env bash
# Publish flow aligned with npm 2026 security model
# (https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/):
#
#   · Do NOT use Granular Access Tokens with Bypass 2FA (deprecated).
#   · Stage-only tokens cannot `npm publish` — they must `npm stage publish`,
#     then a maintainer promotes with 2FA (`npm stage approve`).
#   · A brand-new package name cannot be staged: npm requires the package to
#     exist first. Create 0.1.0 once with an interactive session + 2FA.
#   · Later releases: GitHub Release → OIDC Trusted Publishing (stage-only)
#     → you approve with 2FA.
#
# Usage:
#   ./scripts/publish-npm.sh              # first publish (interactive) OR stage
#   ./scripts/publish-npm.sh --dry-run
#   NPM_KEY=npm_… ./scripts/publish-npm.sh   # optional: stage-only GAT (no bypass)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# `npm stage` needs CLI ≥ 11.15. Local npm may be older — prefer a pinned npx.
NPM=(npx --yes npm@11.19.1)

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run|-n) DRY_RUN=1 ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
    *)
      echo "error: unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

NAME="$(node -p 'require("./package.json").name')"
VERSION="$(node -p 'require("./package.json").version')"
SCOPE="${NAME%%/*}"
echo "→ ${NAME}@${VERSION}"

pnpm run build
pnpm test

# Optional stage-only GAT in an ephemeral userconfig (never written into the repo).
# Prefer an interactive `npm login` session when possible.
CLEANUP_CFG=
if [[ -n "${NPM_KEY:-}" ]]; then
  NPM_CONFIG_USERCONFIG="$(mktemp)"
  CLEANUP_CFG="$NPM_CONFIG_USERCONFIG"
  cat >"$NPM_CONFIG_USERCONFIG" <<EOF
//registry.npmjs.org/:_authToken=${NPM_KEY}
registry=https://registry.npmjs.org/
EOF
  export NPM_CONFIG_USERCONFIG
  echo "→ using NPM_KEY (must be stage-capable; Bypass 2FA must be OFF)"
fi
trap '[[ -n "$CLEANUP_CFG" ]] && rm -f "$CLEANUP_CFG"' EXIT

EXISTING="$("${NPM[@]}" view "$NAME" version 2>/dev/null || true)"

if [[ -z "$EXISTING" ]]; then
  cat <<EOF
→ package does not exist on the registry yet.

  npm stage cannot create a new package name (package must exist first).
  Do the first publish interactively — no Bypass-2FA token:

    npm login                          # account henryavila, with 2FA
    ${NPM[*]} publish --access public

  After 0.1.0 is live:
    1. npmjs.com → ${NAME} → Access → Trusted Publisher
       repo henryavila/titan-chordpro-ui · workflow publish.yml
       Allowed actions: npm stage publish only (do not allow direct publish)
    2. Publishing access → "Require two-factor authentication and disallow tokens"
    3. Later versions: GitHub Release → workflow stages → you approve with 2FA
EOF
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "→ dry-run: would run interactive first publish (skipped)"
    exit 0
  fi
  if [[ ! -t 0 ]]; then
    echo "error: first publish needs an interactive TTY for 2FA." >&2
    exit 1
  fi
  read -r -p "Run interactive first publish now? [y/N] " ans
  if [[ ! "$ans" =~ ^[Yy]$ ]]; then
    echo "aborted — run the commands above when ready"
    exit 1
  fi
  # Prefer the logged-in session over a long-lived key for the create step.
  unset NPM_CONFIG_USERCONFIG || true
  "${NPM[@]}" publish --access public
  echo "✓ created ${NAME}@${VERSION}"
  echo "  next: configure Trusted Publisher (stage-only) on the package page"
  exit 0
fi

echo "→ package already on registry at ${EXISTING} — staging ${VERSION}"

stage_hint() {
  cat >&2 <<EOF

Stage failed. Checklist:
  · npm CLI ≥ 11.15 (this script uses npx npm@11.19.1)
  · Authenticated as henryavila (\`npm login\` or a stage-only GAT)
  · Token is Read and write → **stage only** (or publish and stage)
  · Do NOT enable Bypass 2FA — deprecated; stage + approve replaces it
  · Packages: All packages or scope ${SCOPE}
  · ${VERSION} must not already be published or staged
EOF
}

STAGE_ARGS=(stage publish --access public)
if [[ "$DRY_RUN" -eq 1 ]]; then
  STAGE_ARGS+=(--dry-run)
  echo "→ dry-run (no upload)"
fi

if ! "${NPM[@]}" "${STAGE_ARGS[@]}"; then
  stage_hint
  exit 1
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  exit 0
fi

cat <<EOF
✓ staged ${NAME}@${VERSION} (not installable yet)

  Promote with your 2FA (interactive session — OIDC/tokens cannot approve):

    ${NPM[*]} stage list ${NAME}
    ${NPM[*]} stage view <stage-id>
    ${NPM[*]} stage approve <stage-id>    # prompts for OTP

  Or approve on https://www.npmjs.com/package/${NAME} → Staged packages.
EOF
