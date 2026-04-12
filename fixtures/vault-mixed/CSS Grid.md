---
aliases: [CSS grid, grid layout, 그리드 레이아웃]
tags: [css, frontend, layout]
---

# CSS Grid

CSS Grid is a two-dimensional layout system. Unlike Flexbox (one-dimensional), Grid handles both rows and columns simultaneously.

## Basic Grid Setup

```css
.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto;
  gap: 1rem;
}

.item-wide {
  grid-column: 1 / -1;  /* spans full width */
}
```

## Grid vs Flexbox

Use Grid for page-level layout and two-dimensional arrangements. Use Flexbox for component-level alignment and one-dimensional flows. In practice, they complement each other.

## Named Grid Areas

```css
.layout {
  grid-template-areas:
    "header header header"
    "sidebar main main"
    "footer footer footer";
}
```

This approach makes responsive design much clearer. Combine with media queries to rearrange areas at different breakpoints.

## Performance Considerations

Grid layout calculations are generally fast, but deeply nested grids can cause layout thrashing. For dynamic content, consider `content-visibility: auto` to reduce rendering cost. See Performance Optimization for more tips on layout performance.

## Subgrid

`subgrid` allows child grids to inherit track sizing from parents. Browser support is now solid across modern browsers.
