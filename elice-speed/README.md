# Elice Speed Control

엘리스(elice.io) 강의 영상에 커스텀 배속을 적용하는 도구. 모바일 브라우저 대응.

## 제공 파일

| 파일 | 용도 |
|------|------|
| `bookmarklet.min.js` | 북마크릿 (복붙용, `javascript:` 접두어 포함) |
| `bookmarklet.src.js` | 북마크릿 원본 소스 (가독성용) |
| `elice-speed.user.js` | 유저스크립트 (Tampermonkey/Violentmonkey) |

## 설치 가이드

### iOS Safari (북마크릿)

1. Safari에서 아무 페이지나 북마크에 추가
2. 북마크 편집 → URL을 `bookmarklet.min.js` 내용으로 교체
3. 엘리스 강의 페이지에서 북마크 탭 → 배속 패널 표시

### Android Kiwi Browser / Firefox (유저스크립트)

1. Kiwi Browser에서 Tampermonkey, 또는 Firefox에서 Violentmonkey 설치
2. `elice-speed.user.js` raw 파일 접속 → 자동 설치
3. 엘리스 접속 시 UI 자동 표시

### Android Chrome (제한적)

Chrome은 주소창에서 `javascript:` 를 차단함. PC Chrome에서 북마크 생성 후 계정 동기화로 모바일에 내려받기.

## 사용법

- 패널에서 원하는 배속을 직접 입력하거나 프리셋(1x~4x) 탭
- 유저스크립트는 마지막 배속을 자동 저장/복원
- 패널 접기: 상단 토글 버튼 탭 (유저스크립트)
- 패널 닫기: ✕ 버튼 탭 (북마크릿)

## 제한 사항

- cross-origin iframe 내 플레이어는 제어 불가
- 4x 이상에서 음성 품질 저하 가능
- DRM 보호 콘텐츠는 브라우저 허용 범위 내에서만 동작

## 본 도구가 하지 않는 것

- 서버 진도/시청시간 API 조작 안 함
- 로그인/인증 정보 접근 안 함
- 외부로 데이터 전송 안 함 (순수 클라이언트 사이드)
