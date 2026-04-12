---
aliases: [Git 워크플로우, Git workflow, 깃]
tags: [git, devops, workflow]
---

# Git 워크플로우

효과적인 Git 브랜치 전략은 팀 협업의 기본이다.

## 브랜치 전략

### Git Flow

`main`, `develop`, `feature/*`, `release/*`, `hotfix/*` 브랜치를 사용하는 전통적인 방식. 릴리스 주기가 긴 프로젝트에 적합하다.

### GitHub Flow

`main`에서 feature 브랜치를 따고, PR을 통해 머지하는 단순한 방식. CI/CD와 잘 맞는다.

### Trunk-Based Development

짧은 수명의 브랜치만 사용하고 자주 main에 머지. Feature flag와 함께 사용해야 효과적.

## 커밋 컨벤션

```
feat: 사용자 프로필 페이지 추가
fix: 로그인 시 세션 만료 버그 수정
refactor: 인증 모듈 구조 개선
docs: API 문서 업데이트
test: 결제 모듈 단위 테스트 추가
```

Conventional Commits를 사용하면 자동 버전 관리(semantic versioning)와 CHANGELOG 생성이 가능하다.

## Rebase vs Merge

- **Merge**: 히스토리 보존, 머지 커밋 생성
- **Rebase**: 깔끔한 히스토리, 하지만 force push 필요

팀에서 하나를 정해서 일관되게 사용하는 것이 중요하다.

## CI/CD와의 연계

브랜치 전략은 CI/CD Pipeline 설계와 직결된다. main 브랜치 push 시 자동 배포, PR 생성 시 자동 테스트 실행 등의 자동화가 핵심이다. 테스트 자동화에 대해서는 테스트 전략 노트 참고.
