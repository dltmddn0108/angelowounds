---
aliases: [CI/CD, CI CD, 배포 파이프라인]
tags: [devops, cicd, automation]
---

# CI/CD Pipeline

Continuous Integration and Continuous Deployment automate the path from code commit to production. A solid pipeline catches bugs early and enables rapid, reliable releases.

## Pipeline Stages

1. **Build** - Compile, transpile, bundle
2. **Test** - Unit, integration, and E2E tests
3. **Analyze** - Linting, type checking, security scanning
4. **Deploy** - Staging, then production

## GitHub Actions Example

```yaml
name: CI/CD
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test -- --coverage

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker build -t myapp:${{ github.sha }} .
      - run: docker push myapp:${{ github.sha }}
```

## Docker in CI/CD

[[Docker 입문]] covers the basics. In CI/CD, Docker ensures consistent build environments. Multi-stage builds keep images lean for production deployment.

## Git Integration

The pipeline triggers are tied to [[Git-워크플로우]]. Branch protection rules enforce that all tests pass before merging to main.

## Deployment Strategies

- **Blue-Green**: Zero downtime, instant rollback
- **Canary**: Gradual rollout to subset of users
- **Rolling**: Update instances one at a time

## Monitoring

Post-deployment monitoring is as important as the pipeline itself. Set up alerts for error rates, latency spikes, and resource utilization.
