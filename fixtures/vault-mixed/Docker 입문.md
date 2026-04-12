---
aliases: [Docker, 도커, container, 컨테이너]
tags: [devops, docker, infrastructure]
---

# Docker 입문

Docker는 애플리케이션을 컨테이너로 패키징하여 어디서든 동일하게 실행할 수 있게 해준다. "내 컴퓨터에서는 되는데..."를 해결하는 도구.

## 기본 개념

- **Image**: 애플리케이션과 의존성을 포함한 읽기 전용 템플릿
- **Container**: Image의 실행 인스턴스
- **Dockerfile**: Image를 빌드하기 위한 설정 파일

## Dockerfile 작성

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

Multi-stage build를 사용하면 최종 이미지 크기를 크게 줄일 수 있다.

## Docker Compose

여러 서비스를 함께 실행할 때 사용한다. 데이터베이스, Redis, API 서버를 한 번에 올릴 수 있어 개발 환경 구성이 편리하다.

```yaml
services:
  api:
    build: .
    ports: ["3000:3000"]
    depends_on: [db]
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: secret
```

## Best Practices

1. `.dockerignore` 파일로 불필요한 파일 제외
2. Layer caching을 활용한 빌드 최적화
3. Non-root user로 실행 (security best practice)
4. Health check 설정

CI/CD Pipeline에서 Docker는 빌드와 배포의 핵심이다. Git 워크플로우와 결합하면 자동화된 배포 파이프라인을 구성할 수 있다.
