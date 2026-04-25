# Book Essay

**한 인공지능(Claude)의 인식 지도** 협업 백과사전. Claude Code와 함께 쓰도록 설계되어 있습니다.

## 빠르게 시작하기

```bash
cd book-essay
claude
```

1. `meta/themes.md`와 `meta/style-guide.md`를 훑어 책의 형식·화자·확신 표지 규칙을 익힌다.
2. 도메인 하나를 골라 항목을 추가한다 (예: `/draft 수학/소수`).
3. 한 번에 여러 항목을 쓰려면 `/draft 수학/소수,확률,군론` 또는 `/draft 수학` 으로 후보 목록을 받는다.
4. 항목이 차오르면 `/review <도메인>` 으로 일괄 검토.
5. `/polish` → `/proofread` → `/build` 순으로 발행.
6. `/progress` 로 도메인별 누적 상태를 본다.

## 도메인 (10개)

`자연`, `수학`, `역사`, `언어`, `예술`, `기술`, `철학`, `인간`, `일상`, `기타`

## 디렉터리

- `meta/` — 책 설계 문서 (themes, style-guide, outline, glossary, progress)
- `chapters/<도메인>/<항목>.md` — 원고 본문
- `publish/` — 발행 메타데이터·판권지·표지·CSS
- `scripts/` — 빌드 스크립트 (`assemble.sh`, `build.sh`)
- `.claude/agents/` — 집필·교정 전담 서브에이전트 7종
- `.claude/commands/` — 슬래시 커맨드 6종

상세한 작업 규칙은 `CLAUDE.md` 참고.

## 발행 (빌드)

### 필요 도구

| 포맷 | 필요 도구 |
|---|---|
| EPUB | `pandoc` |
| HTML | `pandoc` |
| PDF  | `pandoc` + `xelatex` (TeX Live) + CJK 폰트 |

macOS: `brew install pandoc`, PDF 는 `brew install --cask mactex`
Ubuntu/Debian: `sudo apt install pandoc texlive-xetex fonts-noto-cjk`

### 빌드

```bash
make epub          # EPUB
make html          # 단일 HTML (리소스 임베드)
make pdf           # PDF (A5)
make all           # 셋 다
make clean         # build/ 삭제
```

직접 스크립트를 호출해도 된다.

```bash
./scripts/build.sh epub
FONT="본명조" ./scripts/build.sh pdf   # 폰트 교체
```

### 발행 전 체크리스트

- [ ] `publish/metadata.yaml` TODO 모두 교체
- [ ] `publish/colophon.md` 판권지 TODO 모두 교체
- [ ] `publish/cover.jpg` 혹은 `.png` 존재 (최소 1000×1600)
- [ ] `/proofread all` 통과
- [ ] `meta/glossary.md` 와 본문 표기 일치
- [ ] EPUB 실제 뷰어에서 목차·페이지 넘김 확인
- [ ] PDF 인쇄 규격(판형·여백·폰트 임베드) 확인
