---
aliases: [performance, 성능 최적화, web performance, perf]
tags: [performance, frontend, optimization]
---

# Performance Optimization

Web performance directly impacts user experience and conversion rates. Every 100ms of latency costs ~1% in revenue.

## React Performance

### Avoid Unnecessary Re-renders

Use `React.memo`, `useMemo`, and `useCallback` judiciously. Profile with React DevTools before optimizing.

```jsx
// Expensive list - memoize the row component
const Row = React.memo(({ item, onSelect }) => (
  <div onClick={() => onSelect(item.id)}>{item.name}</div>
));
```

### Code Splitting

Use `React.lazy` and `Suspense` for route-level splitting. Dynamic imports reduce initial bundle size significantly.

## CSS Performance

- Avoid layout thrashing (read-then-write DOM patterns)
- Use `transform` and `opacity` for animations (GPU-accelerated)
- CSS Grid and Flexbox are faster than older layout methods
- `content-visibility: auto` for long scrolling pages

## JavaScript Performance

### Bundle Size

Tree-shaking with ESM imports. Analyze bundles with `webpack-bundle-analyzer` or `source-map-explorer`. JavaScript Closures can inadvertently retain large objects in memory.

### Runtime

- Debounce expensive event handlers
- Use Web Workers for CPU-heavy computation
- Virtual scrolling for large lists

## Core Web Vitals

| Metric | Good | Needs Improvement |
|--------|------|-------------------|
| LCP | < 2.5s | 2.5s - 4.0s |
| FID | < 100ms | 100ms - 300ms |
| CLS | < 0.1 | 0.1 - 0.25 |

## Network Optimization

- HTTP/2 multiplexing
- Brotli compression over gzip
- CDN for static assets
- Preload critical resources with `<link rel="preload">`

> [!info] Measure First
> Never optimize without measuring. Use Lighthouse, WebPageTest, and real user monitoring (RUM) data to identify actual bottlenecks.
