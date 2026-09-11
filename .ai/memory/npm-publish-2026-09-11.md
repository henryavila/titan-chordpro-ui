# npm publish — modelo 2026 (2026-09-11)

Pacote **`@henryavila/titan-chordpro-ui@0.1.0`** publicado no registry.

## Regras

- **Não** usar GAT com **Bypass 2FA** (depreciado).
- Token **stage-only** não faz `npm publish` — só `npm stage publish`; maintainer promove com 2FA (`npm stage approve` ou UI).
- Pacote **novo** não pode ser staged: o nome precisa existir. Primeiro publish = sessão interativa + 2FA.
- `404` no PUT com token = auth/permissão mascarada, não “falta criar o pacote”.
- OIDC Trusted Publisher só depois que o pacote existe; preferir **só** `npm stage publish` na config; depois “disallow tokens”.

## Arquivos

- `scripts/publish-npm.sh` — first publish interativo ou stage
- `.github/workflows/publish.yml` — Node 22 + `npm stage publish` + summary de approve
- `README.md` § Publish

Ref: https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/
