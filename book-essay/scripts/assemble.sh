#!/usr/bin/env bash
# chapters/ + publish/ 앞뒤 자료를 읽어 build/manuscript.md 한 파일로 병합한다.
# 이 스크립트는 pandoc에 의존하지 않는다 — 순수 셸.

set -euo pipefail
shopt -s nullglob

cd "$(dirname "$0")/.."

out="build/manuscript.md"
mkdir -p build

# 챕터 목록 — 파일명 사전순 (01-, 02-, ... 99-)
chapters=( chapters/[0-9]*.md )

if [ ${#chapters[@]} -eq 0 ]; then
  echo "assemble: chapters/ 가 비어 있다. 초고가 한 꼭지도 없다." >&2
  # 그래도 front/back matter만이라도 뭉쳐 둔다 — 템플릿 점검 용도로.
fi

{
  # 프런트 매터
  if [ -f publish/dedication.md ]; then
    cat publish/dedication.md
    printf '\n\n'
  fi

  # 챕터
  for f in "${chapters[@]}"; do
    cat "$f"
    printf '\n\n'
  done

  # 백 매터 — 감사의 말 같은 것이 있으면 여기 끼우면 됨
  if [ -f publish/acknowledgements.md ]; then
    cat publish/acknowledgements.md
    printf '\n\n'
  fi
  if [ -f publish/about-author.md ]; then
    cat publish/about-author.md
    printf '\n\n'
  fi

  # 판권지는 맨 끝
  if [ -f publish/colophon.md ]; then
    cat publish/colophon.md
    printf '\n'
  fi
} > "$out"

lines=$(wc -l < "$out")
bytes=$(wc -c < "$out")
echo "assembled: $out (${lines} lines, ${bytes} bytes, ${#chapters[@]} chapters)"
