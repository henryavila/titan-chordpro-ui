#!/usr/bin/env bash
# Catálogo canônico no Tailscale :10000 → 127.0.0.1:8765
cd "$(dirname "$0")"
exec python3 -m http.server 8765 --bind 127.0.0.1
