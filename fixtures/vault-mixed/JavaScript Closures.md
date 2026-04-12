---
aliases: [closures, JS closures, 클로저]
tags: [javascript, fundamentals]
---

# JavaScript Closures

A closure is a function that retains access to its lexical scope even when executed outside that scope. This is one of the most important concepts in JavaScript.

## How Closures Work

```javascript
function createCounter() {
  let count = 0;
  return {
    increment: () => ++count,
    getCount: () => count,
  };
}

const counter = createCounter();
counter.increment();
console.log(counter.getCount()); // 1
```

The inner functions close over `count`. This is the foundation for data encapsulation in JavaScript without classes.

## Common Use Cases

1. **Data privacy** - Module pattern for encapsulation
2. **Partial application** - Creating specialized functions from general ones
3. **Event handlers** - Capturing state at the time of binding
4. **Memoization** - Caching computed values in a closed-over map

Closures are fundamental to 함수형 프로그래밍 (functional programming). Higher-order functions like `map`, `filter`, and `reduce` all rely on closures.

## The Loop Problem

```javascript
// Classic gotcha
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // prints 3, 3, 3
}

// Fix with let (block scoping) or IIFE
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100); // prints 0, 1, 2
}
```

## Memory Implications

Closures keep references alive, which can lead to memory leaks if not managed. Be cautious with closures in long-lived objects, especially in React components where stale closures cause subtle bugs.
