---
aliases: [TypeScript, TS, 타입스크립트]
tags: [typescript, javascript, programming]
---

# TypeScript Basics

TypeScript adds static typing to JavaScript. It catches errors at compile time and improves IDE support dramatically.

## Type Fundamentals

```typescript
// Primitives
let name: string = "Angelo";
let age: number = 30;
let active: boolean = true;

// Objects and interfaces
interface User {
  id: number;
  name: string;
  email?: string;  // optional
}

// Generics
function identity<T>(arg: T): T {
  return arg;
}
```

## Type Narrowing

TypeScript narrows types through control flow analysis. This is where JavaScript Closures concepts interact with the type system since closures capture narrowed types.

## With React

TypeScript pairs exceptionally well with React. Typing props, state, and hooks prevents a huge class of runtime bugs.

```tsx
interface Props {
  items: string[];
  onSelect: (item: string) => void;
}

const List: React.FC<Props> = ({ items, onSelect }) => (
  <ul>{items.map(i => <li key={i} onClick={() => onSelect(i)}>{i}</li>)}</ul>
);
```

## Utility Types

`Partial<T>`, `Required<T>`, `Pick<T, K>`, `Omit<T, K>` are essential for daily work. They reduce boilerplate and keep types DRY, which aligns with design patterns like the adapter pattern.

> [!info] Tip
> Use `as const` assertions for literal types. They pair well with discriminated unions.
