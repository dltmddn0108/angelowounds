# publish/

발행용 메타데이터와 부속 페이지를 모아두는 디렉터리.

## 파일

- `metadata.yaml` — pandoc이 읽는 메타데이터 (제목, 저자, 발행일, 판권, ISBN, 표지 경로 등)
- `dedication.md` — 헌사. 필요 없으면 파일을 삭제하면 자동으로 빠진다.
- `colophon.md` — 판권지. 책 맨 뒤에 붙는다.
- `epub.css` — EPUB/HTML 공통 스타일시트
- `cover.jpg` (혹은 `.png`) — 표지 이미지. **git에 커밋할 것.** 없으면 EPUB 표지 생략.

## 표지 이미지 규격

- EPUB: 권장 1600×2560, 최소 1000×1600, 종횡비 1:1.5~1:1.6
- 인쇄용 PDF: 발행처 규격에 따름 (별도 PDF로 제공하는 편이 안전)
- 형식: JPG 또는 PNG, sRGB, 전자책은 2MB 이하 권장

## 추가할 수 있는 것

- `endorsements.md` — 추천사
- `about-author.md` — 저자 소개
- `acknowledgements.md` — 감사의 말

추가 파일은 `scripts/assemble.sh`에서 원고 앞뒤 어디에 끼울지 명시해 주면 빌드에 포함된다.
