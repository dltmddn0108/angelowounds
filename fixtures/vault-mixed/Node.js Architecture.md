---
aliases: [Node.js, Node, 노드]
tags: [backend, javascript, architecture]
---

# Node.js Architecture

Node.js is built on Chrome's V8 engine and uses an event-driven, non-blocking I/O model. Understanding its architecture is essential for writing performant server-side JavaScript.

## The Event Loop

The event loop is the heart of Node.js. It processes callbacks in phases: timers, pending callbacks, poll, check, close.

```javascript
const fs = require('fs');

console.log('1: start');

setTimeout(() => console.log('2: timeout'), 0);

fs.readFile(__filename, () => {
  console.log('3: file read');
  setImmediate(() => console.log('4: immediate inside I/O'));
});

setImmediate(() => console.log('5: immediate'));

console.log('6: end');
// Output order: 1, 6, 5, 2, 3, 4 (2 and 5 may swap)
```

## Async Patterns

### Callbacks to Promises to Async/Await

The evolution from callback hell to clean async/await code. This progression mirrors functional programming concepts where composition is key.

```javascript
// Modern approach
async function fetchUserData(id) {
  const user = await db.users.findById(id);
  const orders = await db.orders.findByUserId(user.id);
  return { ...user, orders };
}
```

## Cluster and Worker Threads

Node.js is single-threaded by default. Use the cluster module to fork multiple processes, or worker threads for CPU-intensive tasks. This is critical for REST API servers handling high concurrency.

## Module System

ESM (`import/export`) is the future, but CommonJS (`require`) remains prevalent. TypeScript helps bridge the gap with consistent module resolution.

## Error Handling

Unhandled promise rejections crash the process in Node 15+. Always use try/catch with async/await and set up global error handlers.
