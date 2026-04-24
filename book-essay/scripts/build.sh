#!/usr/bin/env bash
# build.sh <format>
# format: epub | html | pdf | all
#
# 필요 도구:
#   - pandoc (epub/html/pdf 모두)
#   - xelatex + CJK 폰트 (pdf)
# 폰트는 환경변수 FONT 로 덮어쓸 수 있다. 기본: Noto Serif CJK KR

set -euo pipefail

cd "$(dirname "$0")/.."

format="${1:-all}"
FONT="${FONT:-Noto Serif CJK KR}"
MONO_FONT="${MONO_FONT:-D2Coding}"

command -v pandoc >/dev/null 2>&1 || {
  echo "build: pandoc 이 필요하다. https://pandoc.org/installing.html" >&2
  exit 1
}

./scripts/assemble.sh

manuscript=build/manuscript.md
common_args=(
  "$manuscript"
  --metadata-file=publish/metadata.yaml
  --toc
  --toc-depth=2
  --top-level-division=chapter
)

build_epub() {
  local out=build/book.epub
  pandoc "${common_args[@]}" \
    --css=publish/epub.css \
    --split-level=1 \
    -o "$out"
  echo "built: $out"
}

build_html() {
  local out=build/book.html
  pandoc "${common_args[@]}" \
    --css=publish/epub.css \
    --standalone \
    --embed-resources \
    -o "$out"
  echo "built: $out"
}

build_pdf() {
  local out=build/book.pdf
  command -v xelatex >/dev/null 2>&1 || {
    echo "build: pdf 는 xelatex 이 필요하다 (TeX Live). 설치 후 재시도." >&2
    return 1
  }
  pandoc "${common_args[@]}" \
    --pdf-engine=xelatex \
    -V mainfont="$FONT" \
    -V CJKmainfont="$FONT" \
    -V monofont="$MONO_FONT" \
    -V geometry:a5paper \
    -V geometry:margin=2cm \
    -V linestretch=1.4 \
    -V documentclass=book \
    -V lang=ko-KR \
    -o "$out"
  echo "built: $out"
}

case "$format" in
  epub) build_epub ;;
  html) build_html ;;
  pdf)  build_pdf ;;
  all)
    build_epub
    build_html
    build_pdf || echo "build: pdf 건너뜀"
    ;;
  *)
    echo "usage: $0 {epub|html|pdf|all}" >&2
    exit 2
    ;;
esac
