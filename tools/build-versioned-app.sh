#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${1:-}"

if [[ -z "$version" ]]; then
  version="$(node -e "console.log(require('$repo_root/version.json').appVersion)")"
fi

ldflags="-X plotkitycat/internal/version.appVersion=$version"
wails_bin="${WAILS_BIN:-wails}"

if ! command -v "$wails_bin" >/dev/null 2>&1; then
  if [[ -x "$HOME/go/bin/wails" ]]; then
    wails_bin="$HOME/go/bin/wails"
  else
    echo "Missing Wails CLI. Install it with: go install github.com/wailsapp/wails/v2/cmd/wails@v2.10.2" >&2
    exit 1
  fi
fi

echo "Building PlotKityCat with version $version"
cd "$repo_root"
"$wails_bin" build -clean -ldflags "$ldflags"
