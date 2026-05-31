#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="${1:-}"

if [[ -z "$version" ]]; then
  version="$(node -e "console.log(require('$repo_root/version.json').appVersion)")"
fi

release_name="PlotKityCat-v$version-macos-arm64"
release_root="$repo_root/build/release/$release_name"
release_zip="$release_root.zip"
app_bundle="$repo_root/build/bin/PlotKityCat.app"
runtime_zip="$repo_root/resources/runtime/runtime.zip"
scripts_dir="$repo_root/Scripts"

if [[ ! -d "$app_bundle" ]]; then
  echo "Missing built app bundle: $app_bundle" >&2
  exit 1
fi

if [[ ! -f "$runtime_zip" ]]; then
  echo "Missing runtime archive: $runtime_zip" >&2
  exit 1
fi

rm -rf "$release_root" "$release_zip"
mkdir -p "$release_root/resources/runtime"

cp -R "$app_bundle" "$release_root/PlotKityCat.app"
cp "$runtime_zip" "$release_root/resources/runtime/runtime.zip"

if [[ -d "$scripts_dir" ]]; then
  cp -R "$scripts_dir" "$release_root/Scripts"
fi

(
  cd "$(dirname "$release_root")"
  zip -qry "$release_zip" "$(basename "$release_root")"
)

echo "Packaged macOS release:"
echo "  Directory: $release_root"
echo "  Zip:       $release_zip"
