# Performance TODO

Identified bottlenecks causing sluggishness on Linux Chrome, in priority order.

## 1. BeltObject rAF loop × N (CRITICAL)
Every belt runs its own `requestAnimationFrame` loop calling `batchDraw()` on the shared Konva layer. With 200 belts = 200 independent rAF loops, each triggering a full layer redraw. Should be a single shared rAF loop at the app level that updates all belt offsets then calls `batchDraw()` once per frame.
- **File:** `src/BeltObject.jsx` ~line 44

## 2. Middle-mouse pan calls `setViewport` on every pixel (CRITICAL)
Every pixel of middle-mouse panning triggers `setViewport` → full React re-render → all Konva layers re-render. Should update the Konva Stage `x`/`y` directly via `stageRef` and only commit to React state on mouseup.
- **File:** `src/App.jsx` ~line 409

## 3. `localStorage.setItem` is synchronous and unthrottled (HIGH)
Fires on every `objects`, `belts`, and `viewport` state change — serializing the full state to disk synchronously during drags. Needs a 500ms debounce.
- **File:** `src/App.jsx` ~line 241

## 4. Layer filter operations inside render (HIGH)
`objects.filter(...)` and `belts.filter(...)` run inside the render for each layer on every render, even unrelated ones. Should be a `useMemo` keyed on `[objects, belts, layers]`.
- **File:** `src/App.jsx` ~line 1585
