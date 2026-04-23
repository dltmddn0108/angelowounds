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
- `.claude/agents/` — 집필 전담 서브에이전트 6종
- `.claude/commands/` — 슬래시 커맨드 4종

## 작업 원칙

1. **새 꼭지 집필 전 반드시** `meta/outline.md`, `meta/themes.md`, `meta/style-guide.md`를 먼저 읽는다.
2. 고유명사·개념어는 `meta/glossary.md`의 표기를 따른다. 새 용어가 나오면 글로서리에 추가한다.
3. 퇴고는 `structure-critic` → `style-critic` → `fact-checker` → `polisher` 순서로 진행한다. 서로 다른 관점이므로 병렬로 돌리지 말고 순차 적용한다.
4. 장 하나가 끝나면 `meta/progress.md`를 갱신한다.
5. 원고 파일은 프런트매터 없이 순수 Markdown으로 쓴다. 메모·주석은 `<!-- ... -->`로.

## 슬래시 커맨드

- `/draft <장번호>` — 해당 꼭지의 초고를 작성
- `/review <장번호>` — 구조·문체·팩트 3중 검토
- `/polish <장번호>` — 최종 윤문
- `/progress` — 전체 진행 상황 요약

## 금지 사항

- 원고 본문에 이모지 사용 금지 (style-guide가 명시적으로 허용한 경우 제외)
- `meta/`의 설계 문서를 지우지 말 것. 수정은 diff로 표시하고 사유를 남긴다.
- 자동으로 git commit 하지 말 것. 커밋은 사용자가 명시적으로 요청할 때만.
