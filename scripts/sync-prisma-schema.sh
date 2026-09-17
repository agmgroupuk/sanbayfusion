#!/usr/bin/env bash
# Keeps frontend/prisma/schema.prisma and backend/prisma/schema.prisma
# in sync with the canonical packages/database/prisma/schema.prisma.
# Real file copies are required (not symlinks) because Railway scopes
# each service's build context to its Root Directory, so files outside
# frontend/ or backend/ are invisible to that service's build.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
canonical="$repo_root/packages/database/prisma/schema.prisma"
targets=(
  "$repo_root/frontend/prisma/schema.prisma"
  "$repo_root/backend/prisma/schema.prisma"
)

if [[ ! -f "$canonical" ]]; then
  echo "error: canonical schema not found at $canonical" >&2
  exit 1
fi

changed=0
for target in "${targets[@]}"; do
  mkdir -p "$(dirname "$target")"
  if [[ -L "$target" ]]; then
    echo "fixing: $target was a symlink, replacing with a real copy"
    rm "$target"
  fi
  if ! cmp -s "$canonical" "$target" 2>/dev/null; then
    cp "$canonical" "$target"
    echo "synced: $target"
    changed=1
  fi
done

if [[ "$changed" -eq 0 ]]; then
  echo "schema copies already in sync"
fi
