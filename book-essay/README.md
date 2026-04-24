# Book Essay

장편 에세이/책 집필 워크스페이스. Claude Code와 함께 쓰도록 설계되어 있습니다.

## 빠르게 시작하기

```bash
cd book-essay
claude
```

1. `meta/themes.md`와 `meta/outline.md`의 자리표시자를 채워 책의 뼈대를 먼저 세운다.
2. `meta/style-guide.md`에 목소리·문체 규칙을 적는다.
3. `/draft 01`로 첫 꼭지 초고를 쓴다.
4. `/review 01`로 구조·문체·팩트 3중 검토를 받는다.
5. 피드백을 반영해 퇴고한 뒤 `/polish 01`로 마무리.
6. `/progress`로 전체 진행 상황을 확인한다.

## 디렉터리

- `meta/` — 책 설계 문서
- `chapters/` — 원고 본문
- `publish/` — 발행 메타데이터·판권지·표지·CSS
- `scripts/` — 빌드 스크립트 (`assemble.sh`, `build.sh`)
- `.claude/agents/` — 집필·교정 전담 서브에이전트
- `.claude/commands/` — 슬래시 커맨드

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
