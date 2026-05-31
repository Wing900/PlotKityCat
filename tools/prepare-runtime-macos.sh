#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_zip="${OUTPUT_ZIP:-$repo_root/resources/runtime/runtime.zip}"
work_dir="${WORK_DIR:-$repo_root/.runtime-pack/macos}"
cache_dir="${CACHE_DIR:-$repo_root/.runtime-cache}"
python_standalone_url="${PYTHON_STANDALONE_URL:-https://github.com/astral-sh/python-build-standalone/releases/download/20260510/cpython-3.13.13+20260510-aarch64-apple-darwin-install_only.tar.gz}"
python_standalone_archive="$cache_dir/$(basename "$python_standalone_url")"
venv_dir="$work_dir/runtime"
runtime_dir="$venv_dir"
libomp_root="${LIBOMP_ROOT:-/opt/homebrew/opt/libomp}"

rm -rf "$work_dir"
mkdir -p "$work_dir" "$cache_dir" "$(dirname "$output_zip")"

if [[ ! -f "$python_standalone_archive" ]]; then
  curl -L "$python_standalone_url" -o "$python_standalone_archive"
fi

tar -xzf "$python_standalone_archive" -C "$work_dir"
cp -R "$work_dir/python" "$runtime_dir"

"$runtime_dir/bin/python3" -m pip install --upgrade pip setuptools wheel pybind11
"$runtime_dir/bin/python3" -m pip install \
  numpy==2.3.5 \
  matplotlib==3.10.8 \
  scipy==1.16.3 \
  PyQt5==5.15.11

if [[ ! -f "$libomp_root/lib/libomp.dylib" ]]; then
  echo "Missing libomp at $libomp_root. Install it with: brew install libomp" >&2
  exit 1
fi

cp "$libomp_root/lib/libomp.dylib" "$runtime_dir/lib/libomp.dylib"

(
  cd "$repo_root/thirdparty/matplotlib_surface_fastpath"
  CPPFLAGS="-I$libomp_root/include ${CPPFLAGS:-}" \
  LDFLAGS="-L$libomp_root/lib ${LDFLAGS:-}" \
  "$runtime_dir/bin/python3" -m pip install .
)

fastpath_ext="$(find "$runtime_dir/lib/python3.13/site-packages/mpl_surface_fastpath" -name '_surface_fastpath*.so' -print -quit)"
if [[ -z "$fastpath_ext" ]]; then
  echo "Compiled fastpath extension was not installed" >&2
  exit 1
fi
install_name_tool -change "$libomp_root/lib/libomp.dylib" "@loader_path/../../../libomp.dylib" "$fastpath_ext" 2>/dev/null || true

"$runtime_dir/bin/python3" - <<'PY'
import matplotlib
import numpy
import scipy
import PyQt5
import mpl_surface_fastpath
print("runtime import check ok")
PY

while IFS= read -r link_path; do
  target_path="$(readlink "$link_path")"
  if [[ "$target_path" != /* ]]; then
    target_path="$(cd "$(dirname "$link_path")" && pwd)/$target_path"
  fi
  rm "$link_path"
  if [[ -d "$target_path" ]]; then
    cp -R "$target_path" "$link_path"
  else
    cp "$target_path" "$link_path"
    if [[ -x "$target_path" ]]; then
      chmod +x "$link_path"
    fi
  fi
done < <(find "$runtime_dir" -type l)

find "$runtime_dir" -type d -name "__pycache__" -prune -exec rm -rf {} +
find "$runtime_dir" -type f -name "*.pyc" -delete

rm -f "$output_zip"
(
  cd "$work_dir"
  zip -qry "$output_zip" runtime
)

echo "Prepared macOS runtime:"
echo "  Python: $("$runtime_dir/bin/python3" --version)"
echo "  Zip:    $output_zip"
