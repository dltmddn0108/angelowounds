---
aliases: [React hooks, hooks, 리액트 훅]
tags: [react, frontend, javascript]
---

# React Hooks

React Hooks let you use state and other React features in functional components. Introduced in React 16.8, they replaced most class component patterns.

## Core Hooks

### useState

```jsx
const [count, setCount] = useState(0);
const [user, setUser] = useState({ name: '', email: '' });
```

### useEffect

Handles side effects like data fetching, subscriptions, and DOM mutations. Always clean up subscriptions to avoid memory leaks.

### useCallback and useMemo

These are critical for [[Performance Optimization]]. Without memoization, child components re-render unnecessarily.

```jsx
const memoizedValue = useMemo(() => computeExpensive(a, b), [a, b]);
const handleClick = useCallback(() => doSomething(id), [id]);
```

> [!info] Common Pitfall
> Overusing `useMemo` and `useCallback` can actually hurt performance due to the overhead of memoization itself. Profile before optimizing.

## Custom Hooks

Custom hooks extract reusable stateful logic. They follow the `use` prefix convention and can call other hooks internally. This aligns well with [[함수형-프로그래밍]] principles since hooks encourage composition over inheritance.

## State Management

For complex state, consider `useReducer` over `useState`. For global state, combine with Context API or external libraries like Zustand or Jotai. The choice affects both code organization and runtime performance.

## See also

- [[TypeScript Basics]] for typing hooks
- [[Performance Optimization]]
