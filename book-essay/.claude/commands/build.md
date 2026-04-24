---
description: 원고를 EPUB/HTML/PDF 로 빌드한다
argument-hint: <epub|html|pdf|all>
---

`$ARGUMENTS` 포맷으로 책을 빌드해 주세요.

절차:

1. `$ARGUMENTS` 값 확인. 없으면 `all`로 간주.
2. 빌드 전 점검:
   - `chapters/`에 파일이 하나라도 있는가? 없으면 "본문이 아직 없다"고 알리고 빌드 진행 여부를 확인.
   - `publish/metadata.yaml`에 TODO가 남아 있는가? 있으면 경고한다 (빌드는 가능하지만 발행 불가).
   - `publish/cover.jpg` (또는 `.png`)가 있는가? 없으면 EPUB 표지가 빠진다고 알린다.
3. `pandoc`이 설치돼 있는지 확인. 없으면 설치 안내 후 중단.
4. PDF 빌드가 포함되면 `xelatex`도 확인한다.
5. `bash scripts/build.sh $ARGUMENTS` 실행.
6. 빌드 산출물 경로(`build/book.epub` 등)와 파일 크기를 보고한다.
7. EPUB의 경우 내부 목차가 제대로 생성됐는지 확인을 권한다 (EPUB 뷰어에서 열어 볼 것).

빌드 실패 시:
- pandoc 에러 메시지를 그대로 보여주고, 흔한 원인(메타데이터 YAML 문법 오류, 참조 이미지 누락, 폰트 미설치 등)을 체크리스트로 제시한다.
