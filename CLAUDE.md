# Satisfactory Planner — Codebase Guide

A factory layout planning tool for the game Satisfactory. Built with React + Vite, renders the canvas with Konva (react-konva).

## File Map

```
src/
  main.jsx          # Entry point — just renders <App />
  App.jsx           # Root component: canvas, viewport, objects, keyboard/mouse
  Toolbar.jsx       # Top toolbar (tool selection)
  LayersPanel.jsx   # Right panel: layer list + buildings palette
  constants.js      # Shared numeric constants
  recipes.js        # Full Satisfactory 1.0 recipe database (150 recipes)
```

## Constants (`constants.js`)

| Name | Value | Purpose |
|---|---|---|
| `CELL_SIZE` | 40px | One grid cell in canvas pixels |
| `GRID_CELLS` | 250 | Grid is 250×250 cells |
| `GRID_PX` | 10,000px | Total canvas size |
| `PANEL_WIDTH` | 236px | Right panel width |
| `TOOLBAR_HEIGHT` | 44px | Top toolbar height |

## Layout

```
┌──────────────────────────────────┬──────────┐
│  Toolbar (44px, fixed top)       │          │
├──────────────────────────────────┤  Layers  │
│                                  │  Panel   │
│  Konva Stage (canvas)            │  (236px, │
│  250×250 grid · zoomable · pan   │  fixed   │
│                                  │  right)  │
│  [coord HUD, bottom-left]        │          │
│  [zoom buttons, bottom-right]    │          │
└──────────────────────────────────┴──────────┘
```

- The Stage is `window.innerWidth - PANEL_WIDTH` × `window.innerHeight - TOOLBAR_HEIGHT`
- Viewport state = `{ scale, x, y }` — zoom range 5%–1000%

## App.jsx — Key State & Refs

| Name | Type | Purpose |
|---|---|---|
| `viewport` | `{ scale, x, y }` | Camera position/zoom |
| `objects` | `Object[]` | All placed buildings |
| `selectedObjId` | `number\|null` | Currently selected building |
| `tool` | `'pan'\|'pointer'` | Active tool |
| `layers` / `selectedId` | from `useLayers()` | Layer management |
| `draggingObjRef` | ref | ID of object currently being dragged (null otherwise) |
| `viewportRef` | ref | Mirror of viewport state for use in event handlers |

### Object shape
```js
{
  id:       number,   // auto-increment from _nextObjId
  type:     string,   // key into BUILDING_DEFS e.g. 'constructor'
  layerId:  number,   // which layer it lives on
  rotation: number,   // 0 | 90 | 180 | 270
  x:        number,   // canvas pixels (snapped to CELL_SIZE)
  y:        number,
}
```

### BUILDING_DEFS (in App.jsx — needs consolidation)
```js
const BUILDING_DEFS = {
  constructor: { w: 8, h: 10, color: '#e87c13', label: 'CNSTR' },
}
```
`w`/`h` are in grid cells. There is a duplicate in `LayersPanel.jsx` (as an array, using `w`/`h` in preview units 0.8×1.0 = 28px scale). These should eventually be consolidated.

## LayersPanel.jsx

Exports:
- **`useLayers()`** hook — manages `layers[]` and `selectedId` state, returned to `App.jsx`
- **`default LayersPanel`** — the right panel component

### Layer shape
```js
{ id: number, name: string, visible: boolean }
```

### Panel structure
- **Top**: "Layers" header + "+" add button
- **Middle** (flex-grows): scrollable layer list, drag-to-reorder
- **Bottom** (192px fixed): tab bar + tab content
  - Currently one tab: **Buildings** — shows `BuildingCard` grid
- **Footer**: keyboard hint text

Layer selection: click to select. Double-click opens inline rename. Drag handle on the left for reordering.

Active layer renders at full opacity; other visible layers render at 15% opacity and are **not** interactive (Konva layers only render objects for their layer).

## Canvas Rendering

Buildings are drawn as Konva `Group` objects containing:
1. A dashed selection `Rect` (only when selected)
2. A filled `Rect` (the building body, semi-transparent fill + solid stroke)
3. A `Text` label centered in the body

The grid is a separate base `Layer` with minor/major/axis lines. Buildings live in one `Layer` per UI layer, rendered bottom-to-top (array reversed).

## Interactions

| Action | Effect |
|---|---|
| Left drag (pan tool) | Pan viewport |
| Middle mouse drag | Pan viewport (always) |
| Scroll wheel | Zoom toward cursor |
| Scroll wheel while dragging | Rotate building (throttled 250ms) |
| `H` key | Switch to Pan tool |
| `V` key | Switch to Select/Pointer tool |
| `R` key while dragging | Rotate building 90° |
| `Escape` | Deselect |
| Click building (pointer) | Select it |
| Drag building (pointer) | Move, snapped to `CELL_SIZE` |
| Click canvas bg | Deselect |

## recipes.js — Recipe Database

150 standard (non-alternate) Satisfactory 1.0 recipes sourced from the official wiki.

### Recipe shape
```js
{
  id:        string,            // camelCase unique key e.g. 'ironRod'
  name:      string,            // display name e.g. 'Iron Rod'
  building:  string,            // building key e.g. 'constructor'
  craftTime: number,            // seconds per cycle
  inputs:    [{ item, perMin }], // amounts at 100% clock speed
  outputs:   [{ item, perMin }],
}
```

### Exports
```js
import RECIPES, { RECIPES_BY_ID, RECIPES_BY_OUTPUT, RECIPE_BUILDINGS } from './recipes.js'

RECIPES_BY_OUTPUT['Iron Rod']   // → [recipe, ...]  (all recipes that produce it)
RECIPES_BY_ID['ironRod']        // → recipe
RECIPE_BUILDINGS                // → ['smelter', 'constructor', ...]
```

### Buildings covered
`smelter`, `foundry`, `constructor`, `assembler`, `manufacturer`, `refinery`, `blender`, `packager`, `particleAccelerator`, `quantumEncoder`, `converter`

## Color Palette

Dark navy theme throughout:

| Usage | Hex |
|---|---|
| Canvas background | `#0a1118` |
| Panel background | `#0a1520` |
| Minor grid | `#141e28` |
| Major grid | `#1a2a38` |
| Axis line | `#1e3a54` |
| Border / divider | `#1e3a54` |
| Selected row bg | `#1a3a5c` |
| Active text | `#c8dff0` |
| Muted text | `#7aabcc` |
| Accent blue | `#4a9eda` |
| Constructor orange | `#e87c13` |

## Known TODOs (from TODO.md)

- Double-click activates layer — should use a click on an icon instead
- Transparent overlay layers should NOT be interactive
- Default zoom should be 25%, not 100%
- Zoom should re-center what was centered (zoom to screen center, not cursor)
- Snapping should be to other objects, not the grid
- Save / Load buttons in toolbar (state in memory/localStorage)
