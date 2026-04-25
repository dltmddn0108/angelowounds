#!/usr/bin/env bash
# chapters/<도메인>/<항목>.md + publish/ 앞뒤 자료를 읽어
# build/manuscript.md 한 파일로 병합한다.
# pandoc 의존 없음 — 순수 셸.

set -euo pipefail
shopt -s nullglob

cd "$(dirname "$0")/.."

out="build/manuscript.md"
mkdir -p build

# 도메인 순서 — meta/themes.md 와 일치해야 한다.
domains=( 자연 수학 역사 언어 예술 기술 철학 인간 일상 기타 )

# 항목 파일 카운트 (검토·교정 부산물 제외)
count_entries() {
  local domain="$1"
  local n=0
  for f in "chapters/$domain"/*.md; do
    [ -f "$f" ] || continue
    case "$f" in
      *.review.md|*.proofread.md) continue ;;
    esac
    n=$((n + 1))
  done
  echo "$n"
}

total_entries=0
for d in "${domains[@]}"; do
  n=$(count_entries "$d")
  total_entries=$((total_entries + n))
done

if [ "$total_entries" -eq 0 ]; then
  echo "assemble: chapters/<도메인>/ 가 모두 비어 있다." >&2
fi

{
  # 프런트 매터
  if [ -f publish/dedication.md ]; then
    cat publish/dedication.md
    printf '\n\n'
  fi

  # 도메인별 본문
  for domain in "${domains[@]}"; do
    n=$(count_entries "$domain")
    [ "$n" -eq 0 ] && continue

    # 도메인 제목 페이지 (1-레벨 헤딩)
    printf '\\newpage\n\n# %s\n\n' "$domain"

    # 항목 파일 — bash glob 이 이미 사전순. .review/.proofread 부산물 제외.
    # 도메인 헤딩(H1)과 항목 헤딩이 같은 레벨이 되지 않도록
    # 항목 안의 모든 ATX 헤딩(# ~ ######)을 한 단계 내린다.
    # 결과: 도메인=H1, 항목 제목=H2, 항목 내 절=H3+
    for f in "chapters/$domain"/*.md; do
      [ -f "$f" ] || continue
      case "$f" in
        *.review.md|*.proofread.md) continue ;;
      esac
      sed -E 's/^(#{1,6}) /\1# /' "$f"
      printf '\n\n'
    done
  done

  # 백 매터
  if [ -f publish/acknowledgements.md ]; then
    cat publish/acknowledgements.md
    printf '\n\n'
  fi
  if [ -f publish/about-author.md ]; then
    cat publish/about-author.md
    printf '\n\n'
  fi
  if [ -f publish/colophon.md ]; then
    cat publish/colophon.md
    printf '\n'
  fi
} > "$out"

lines=$(wc -l < "$out")
bytes=$(wc -c < "$out")
echo "assembled: $out (${lines} lines, ${bytes} bytes, ${total_entries} entries across ${#domains[@]} domains)"
