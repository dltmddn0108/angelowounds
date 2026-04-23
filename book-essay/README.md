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
- `.claude/agents/` — 집필 전담 서브에이전트
- `.claude/commands/` — 슬래시 커맨드

상세한 작업 규칙은 `CLAUDE.md` 참고.
