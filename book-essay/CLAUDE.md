# Book Essay — Claude 작업 가이드

장편 에세이/책 집필 프로젝트입니다. 이 디렉터리에서 Claude Code 세션을 시작하면, 아래 규칙과 구조에 따라 작업합니다.

## 디렉터리 구조

- `meta/` — 책 설계 문서 (먼저 읽을 것)
  - `outline.md` — 장·절 목차와 각 꼭지의 요지
  - `themes.md` — 중심 테제, 반복 모티프, 논증의 축
  - `style-guide.md` — 목소리, 시점, 문체, 금칙어
  - `glossary.md` — 고유명사·핵심 개념의 표기 통일
  - `progress.md` — 장별 진행 상태 (초고/퇴고/완료)
- `chapters/` — 원고 본문. `NN-제목.md` 형식으로 저장
- `publish/` — 발행용 메타데이터·판권지·표지·스타일시트
- `scripts/` — `assemble.sh` (원고 병합), `build.sh` (포맷 변환)
- `build/` — 빌드 산출물. `.gitignore` 대상
- `Makefile` — `make epub|html|pdf|all|assemble|clean`
- `.claude/agents/` — 집필·교정 전담 서브에이전트 7종
- `.claude/commands/` — 슬래시 커맨드 6종

## 작업 원칙

1. **새 꼭지 집필 전 반드시** `meta/outline.md`, `meta/themes.md`, `meta/style-guide.md`를 먼저 읽는다.
2. 고유명사·개념어는 `meta/glossary.md`의 표기를 따른다. 새 용어가 나오면 글로서리에 추가한다.
3. 퇴고는 `structure-critic` → `style-critic` → `fact-checker` → `polisher` → (발행 직전) `proofreader` 순서로 진행한다. 병렬로 돌리지 말고 순차 적용한다. 단, `proofreader`는 꼭지별로 독립이므로 여러 꼭지를 병렬 교정해도 된다.
4. 장 하나가 끝나면 `meta/progress.md`를 갱신한다.
5. 원고 파일은 프런트매터 없이 순수 Markdown으로 쓴다. 메모·주석은 `<!-- ... -->`로.
6. **발행 준비**는 본문과 별개의 단계로 취급한다. `publish/metadata.yaml`의 TODO를 실제 값으로 채우기 전에는 `/build`가 성공해도 발행 품질이 아니다.

## 슬래시 커맨드

### 집필·퇴고

- `/draft <장번호>` — 해당 꼭지의 초고를 작성
- `/review <장번호>` — 구조·문체·팩트 3중 검토 (순차)
- `/polish <장번호>` — 문장 윤문 (polisher 가 원고를 직접 수정)
- `/progress` — 전체 진행 상황 요약

### 발행

- `/proofread <장번호|all>` — 맞춤법·띄어쓰기·표기 일관성 교정
- `/build <epub|html|pdf|all>` — 최종 파일 빌드

## 발행 워크플로

1. 본문이 전부 `/polish` 까지 마친 상태인지 `/progress`로 확인.
2. `publish/metadata.yaml`의 TODO를 실제 값으로 바꾼다 (제목, 저자, 발행일, 판권, ISBN 등).
3. `publish/colophon.md`의 판권지 TODO도 채운다.
4. 표지 이미지를 `publish/cover.jpg` (또는 `.png`)로 넣는다.
5. `/proofread all`로 전체 교정. 지적된 오류를 저자가 반영.
6. `meta/glossary.md`와 본문 표기가 일치하는지 재확인.
7. `/build all`로 EPUB/HTML/PDF 산출.
8. 산출된 EPUB은 **실제 전자책 뷰어**에서, PDF는 **인쇄 규격 미리보기**에서 반드시 육안 점검.

## 금지 사항

- 원고 본문에 이모지 사용 금지 (style-guide가 명시적으로 허용한 경우 제외)
- `meta/`의 설계 문서를 지우지 말 것. 수정은 diff로 표시하고 사유를 남긴다.
- 자동으로 git commit 하지 말 것. 커밋은 사용자가 명시적으로 요청할 때만.
