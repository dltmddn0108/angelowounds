# CSS 레이아웃 정리

## Flexbox vs Grid

| 특성 | Flexbox | Grid |
|------|---------|------|
| 차원 | 1차원 | 2차원 |
| 용도 | 정렬, 배치 | 전체 레이아웃 |
| 지원 | IE11 부분 | IE11 부분 |

## 반응형 패턴

```css
.container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}
```

모바일 퍼스트 접근법을 따르면 `min-width` 미디어 쿼리를 사용한다.

## 성능 고려사항

레이아웃 변경은 리플로우를 유발한다. `transform`이나 `opacity`만 변경하면
GPU 가속 합성 레이어에서 처리돼 성능최적화에 유리하다.

## See also
- [[웹-접근성]]
