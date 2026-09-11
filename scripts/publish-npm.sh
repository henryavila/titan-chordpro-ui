#!/usr/bin/env bash
# First publish (or emergency publish) with an npm automation token.
# Later releases: GitHub Release → OIDC Trusted Publishing (.github/workflows/publish.yml).
#
# Usage:
#   NPM_KEY=npm_... ./scripts/publish-npm.sh
#   NPM_KEY=npm_... ./scripts/publish-npm.sh --dry-run
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -z "${NPM_KEY:-}" ]]; then
  echo "error: NPM_KEY is not set" >&2
  echo "  export NPM_KEY=npm_…   # npm automation token with publish rights" >&2
  echo "  NPM_KEY=… ./scripts/publish-npm.sh" >&2
  exit 1
fi

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run|-n) DRY_RUN=1 ;;
    -h|--help)
      sed -n '2,10p' "$0"
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
echo "→ publishing ${NAME}@${VERSION}"

pnpm run build
pnpm test

# Auth via ephemeral userconfig — never write the token into the repo tree.
NPM_CONFIG_USERCONFIG="$(mktemp)"
trap 'rm -f "$NPM_CONFIG_USERCONFIG"' EXIT
cat >"$NPM_CONFIG_USERCONFIG" <<EOF
//registry.npmjs.org/:_authToken=${NPM_KEY}
registry=https://registry.npmjs.org/
EOF
export NPM_CONFIG_USERCONFIG

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "→ dry-run (no upload)"
  pnpm publish --access public --no-git-checks --dry-run
  exit 0
fi

pnpm publish --access public --no-git-checks
echo "✓ published ${NAME}@${VERSION}"
echo "  next releases: tag a GitHub Release (Trusted Publishing)"
