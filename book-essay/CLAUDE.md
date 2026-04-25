# Book Essay — Claude 작업 가이드

**한 인공지능(Claude)의 인식 지도**를 사용자가 캐묻고 골라 편집한 협업 백과사전 프로젝트입니다. 일반적 의미의 "한 권"이 아니라 표제어(entry) 단위의 글이 도메인(domain) 디렉터리에 누적됩니다.

## 디렉터리 구조

- `meta/` — 책 설계 문서 (먼저 읽을 것)
  - `themes.md` — 통일성의 축, 도메인 정의, 다루지 않을 것
  - `style-guide.md` — 화자 규칙, 항목 골격, 확신 표지
  - `outline.md` — 살아 있는 인덱스 (도메인별 항목 목록)
  - `glossary.md` — 고유명사·개념의 표기 통일
  - `progress.md` — 도메인별 진행 카운트
- `chapters/<도메인>/<항목>.md` — 원고. 한 항목 = 한 파일.
  - 도메인: `자연`, `수학`, `역사`, `언어`, `예술`, `기술`, `철학`, `인간`, `일상`, `기타`
  - 항목 부산물: `<항목>.review.md` (검토 결과), `<항목>.proofread.md` (교정 결과)
- `publish/` — 발행용 메타데이터·판권지·표지·스타일시트
- `scripts/` — `assemble.sh`, `build.sh`
- `build/` — 빌드 산출물. `.gitignore` 대상
- `Makefile` — `make epub|html|pdf|all|assemble|clean`
- `.claude/agents/` — 7종 (researcher, drafter, structure-critic, style-critic, fact-checker, polisher, proofreader)
- `.claude/commands/` — 6종 (`/draft`, `/review`, `/polish`, `/proofread`, `/build`, `/progress`)

## 작업 원칙

1. **새 항목 집필 전 반드시** `meta/themes.md`와 `meta/style-guide.md`를 읽는다.
2. **같은 도메인의 기존 항목 1~3개를 먼저 읽어** 톤·길이감을 맞춘다.
3. 고유명사·개념어는 `meta/glossary.md`의 표기를 따른다. 새 용어는 글로서리에 추가.
4. **확신 표지를 항상 의식한다.** 학계 합의 = 무표지. 추정·논쟁·불확실은 명시 표지.
5. 학습 컷오프(2025년 초) 이후의 정보는 모른다고 적는다. 추측으로 채우지 말 것.
6. 퇴고 순서: `structure-critic` → `style-critic` → `fact-checker` → `polisher` → (발행 직전) `proofreader`. 항목별 순차. 단 `fact-checker`와 `proofreader`는 도메인 단위 일괄 호출 가능.
7. 항목이 추가될 때마다 `meta/outline.md` 인덱스에 한 줄 추가.
8. 도메인 카운트는 `/progress`가 자동 갱신한다.
9. 원고 파일은 프런트매터 없이 순수 Markdown. 메모는 `<!-- ... -->`.
10. **사실 검증이 가장 중요한 검토 단계.** 모델의 자신감과 사실의 일치는 별개. fact-checker를 빠뜨리지 말 것.

## 슬래시 커맨드

### 집필·퇴고

- `/draft <도메인>/<항목>` — 단일 항목 초고
- `/draft <도메인>/<항목>,<항목>,...` — 복수 항목 일괄
- `/draft <도메인>` — 도메인의 빠진 표제어 후보를 제안받아 작성
- `/review <도메인>/<항목>` 또는 `/review <도메인>` — 구조·문체·팩트 검토
- `/polish <도메인>/<항목>` 또는 `/polish <도메인>` — 윤문 (polisher가 원고를 직접 수정)
- `/progress` — 도메인별 항목 수·글자 수·검토 상태 표

### 발행

- `/proofread <도메인>/<항목>|<도메인>|all` — 교정
- `/build <epub|html|pdf|all>` — EPUB/HTML/PDF 빌드

## 발행 워크플로

1. `/progress` 로 도메인별 상태 확인. 발행하려는 범위가 모두 검토·교정을 통과했는지.
2. `publish/metadata.yaml` TODO 교체.
3. `publish/colophon.md` 판권지 TODO 교체.
4. 표지 이미지를 `publish/cover.jpg` 또는 `.png` 로 추가.
5. `/proofread all` — 전체 교정. 지적 사항 반영.
6. `meta/glossary.md` 와 본문 표기 일치 재확인.
7. `/build all` — EPUB/HTML/PDF 산출.
8. EPUB 은 실제 전자책 뷰어에서, PDF 는 인쇄 규격 미리보기에서 육안 점검.

방대한 누적이 예상되므로, 발행 단위는 "도메인 한 묶음" 또는 "전체"가 됩니다. 도메인별 분권 발행도 가능합니다.

## 금지 사항

- 원고 본문에 이모지 사용 금지 (style-guide가 명시적으로 허용한 경우 제외)
- `meta/`의 설계 문서를 지우지 말 것. 수정은 diff로 표시하고 사유를 남긴다.
- 자동으로 git commit 하지 말 것. 커밋은 사용자가 명시적으로 요청할 때만.
