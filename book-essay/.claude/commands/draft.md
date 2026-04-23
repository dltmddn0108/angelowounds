---
description: 지정한 꼭지의 초고를 작성한다
argument-hint: <장번호 또는 파일명>
---

꼭지 `$ARGUMENTS`의 초고를 작성해 주세요.

절차:

1. `meta/outline.md`를 읽고 `$ARGUMENTS`에 해당하는 꼭지의 요지·역할을 확인한다.
2. `meta/themes.md`, `meta/style-guide.md`, `meta/glossary.md`를 읽는다.
3. `chapters/` 디렉터리에 이미 해당 번호의 파일이 있으면 내용을 확인하고, 덮어쓸지 물어본다.
4. 리서치가 필요해 보이면 `researcher` 서브에이전트를 먼저 호출해 자료를 모은다.
5. `drafter` 서브에이전트를 호출해 초고를 작성한다.
6. 작성한 파일 경로와, `drafter`가 남긴 미결 사항(`<!-- drafter note: ... -->`)을 사용자에게 요약해 보고한다.
7. `meta/progress.md`에 상태를 "초고 작성됨"으로 기록한다.

주의: 임의로 commit 하지 말 것.
