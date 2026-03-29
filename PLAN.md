# Satisfactory Planner — Implementation Plan

---

# Part 1: Multiple Factories Support

## Overview

Multiple Factories Support adds the ability to maintain several named factory "scenes" within a single browser session. Each factory is a fully independent canvas with its own objects, belts, layers, and viewport. The user can create, rename, duplicate, and delete factories, and switch between them via a tab strip. The current save/load system (File System Access API + `localStorage` autosave) is extended to persist the full multi-factory envelope.

---

## 1. Current State Analysis

### What constitutes "a factory" today

A factory is the union of five pieces of runtime state, all living in `App.jsx` and `LayersPanel.jsx`:

| State | Owner | localStorage key |
|---|---|---|
| `objects` | `App.jsx` | `sp-objects` |
| `belts` | `App.jsx` | `sp-belts` |
| `viewport` | `App.jsx` | `sp-viewport` |
| `layers` / `selectedLayerId` | `useLayers()` in `LayersPanel.jsx` | `sp-layers` |
| `fileName` | `App.jsx` | (none — only in memory) |

The file format captured in `buildStateBlob()` already bundles all five:

```js
{
  version: 1,
  objects, nextObjId,
  belts, nextBeltId,
  layers, selectedLayerId, nextLayerId, nextFloorNum,
  viewport,
}
```

The module-level counters `_nextObjId` and `_nextBeltId` (in `App.jsx`) and `_nextLayerId` / `_nextFloorNum` (in `LayersPanel.jsx`) are mutated in place whenever counters need to advance.

### What needs to change

- All five state pieces must be "snapshotable" per factory and restoreable on switch.
- The `localStorage` autosave must store the whole multi-factory envelope rather than flat keys.
- The tab strip UI must live somewhere above the canvas (new component) or inside the existing toolbar.
- `fileHandleRef` (the File System Access handle for overwrite saves) is per-workspace, not per-factory.
- The undo history stack (`historyRef`) is per-factory and should reset on switch.

---

## 2. Data Structures

### Factory snapshot (in-memory + persisted)

```js
{
  id:              number,          // auto-increment
  name:            string,          // "Iron Factory", "Oil Processing", …
  objects:         Object[],
  nextObjId:       number,
  belts:           Belt[],
  nextBeltId:      number,
  layers:          Layer[],
  selectedLayerId: number,
  nextLayerId:     number,
  nextFloorNum:    number,
  viewport:        { scale, x, y },
  // not persisted — runtime only:
  // fileHandle, history, clipboard are kept separate
}
```

### Root localStorage envelope

Replace the three flat keys (`sp-objects`, `sp-belts`, `sp-viewport`, `sp-layers`) with a single key:

```
sp-workspace  →  {
  version:           2,
  activeFactoryId:   number,
  factories:         FactorySnapshot[],
}
```

Keeping a single key makes atomic writes trivial and avoids partial-update races.

### New `useFactories()` hook (new file: `src/useFactories.js`)

This hook owns:
- `factories[]` — array of snapshots (persisted)
- `activeFactoryId` — which one is loaded
- `addFactory(name?)` — create blank factory, switch to it
- `duplicateFactory(id)` — clone snapshot with a new id/name
- `deleteFactory(id)` — remove; switch to neighbour; guard against last factory
- `renameFactory(id, name)`
- `switchFactory(id)` — saves current state back into `factories` array, then loads target
- `patchActiveFactory(snapshot)` — called from `App.jsx` whenever state changes (debounced autosave)

The hook is **not** responsible for the per-factory counters (`_nextObjId` etc.) — those remain as module-level variables in their current files, but are read/written during `switchFactory`.

---

## 3. UI Changes

### 3.1 Factory tab strip

A new component `FactoryTabBar` rendered between the toolbar and the canvas. It sits at full canvas width (`width: calc(100vw - PANEL_WIDTH)`).

Visual design following existing colour palette:

```
[+ New]  [ Iron Factory × ]  [ Oil Processing × ]  [ ← active, highlighted ]
```

- Active tab: `background: #1a3a5c`, `border-bottom: 2px solid #4a9eda`
- Inactive tabs: `background: #0a1520`, muted text
- Double-click a tab name to inline-rename (same pattern as `LayerItem`)
- `×` button on each tab deletes it (greyed out / disabled when only one factory)
- `+` button at the left creates a new blank factory
- Strip scrolls horizontally if there are many factories

Height: **32px**. Add `FACTORY_TAB_HEIGHT = 32` to `constants.js` and adjust the Stage container's top offset to `TOOLBAR_HEIGHT + FACTORY_TAB_HEIGHT`.

### 3.2 Toolbar `EditableTitle`

After this change, `EditableTitle` shows/edits the **active factory name** (not the on-disk filename). The workspace filename is tracked separately. `onRename` calls `renameFactory(activeFactoryId, newName)`.

### 3.3 File menu

The existing File menu gains workspace-level operations:

- **Save Workspace** (Ctrl+S) — saves the whole envelope (all factories) to the current file handle
- **Save Workspace As…** — prompts for a new file
- **Load Workspace** — loads a multi-factory file; replaces all in-memory factories
- **New Workspace** — clears all factories, starts with one blank
- **Load Demo** — loads demo into the active factory only (or replaces all)

The `.json` file format gains a `version: 2` envelope. A `version: 1` file (single factory) is detected on load and automatically wrapped into a single-factory workspace (no data loss).

### 3.4 Duplicate factory

Available from a right-click context menu on a tab, or a small icon button. Calls `duplicateFactory(id)` which deep-clones the snapshot and appends it with a name like `"Iron Factory (copy)"`.

---

## 4. State Changes in `App.jsx`

### 4.1 New `applyFactorySnapshot(snapshot)` function

Replaces the scattered restore calls inside `handleNew`, `handleLoad`, and `handleLoadDemo`:

```js
function applyFactorySnapshot(snapshot) {
  _nextObjId  = snapshot.nextObjId
  _nextBeltId = snapshot.nextBeltId
  setObjects(snapshot.objects ?? [])
  setBelts(snapshot.belts ?? [])
  setSelectedObjIds(new Set())
  setSelectedBeltIds(new Set())
  setPendingBelt(null)
  restoreLayerState(
    snapshot.layers,
    snapshot.selectedLayerId,
    snapshot.nextLayerId,
    snapshot.nextFloorNum,
  )
  setViewport(snapshot.viewport)
  historyRef.current = []     // clear undo stack on factory switch
}
```

### 4.2 `fileHandleRef` becomes per-workspace

A single `fileHandleRef` at the workspace level covers all factories in the file. Individual factories do not have their own file handles.

### 4.3 Consolidated auto-save

The three individual `useEffect` hooks that write to `localStorage` are replaced by a single debounced effect. When `objects`, `belts`, `layers`, `viewport`, or `selectedLayerId` change:
1. Call `buildFactorySnapshot()` (cheap, no debounce needed).
2. Pass the snapshot to `patchActiveFactory(activeFactoryId, snapshot)`.
3. `useFactories` persists the whole workspace to `localStorage` (one JSON write, debounced ~300ms).

---

## 5. `useLayers` Changes

`useLayers` in `LayersPanel.jsx` currently autonomously writes to `localStorage` via its own `useEffect`. This must be removed — persistence responsibility moves to `App.jsx`'s consolidated auto-save. The `restoreLayerState` callback remains the correct API for loading and is unchanged.

---

## 6. Save / Load File Format

### Version 2 workspace file

```js
{
  version: 2,
  activeFactoryId: number,
  factories: [
    {
      id:              number,
      name:            string,
      objects:         [...],
      nextObjId:       number,
      belts:           [...],
      nextBeltId:      number,
      layers:          [...],
      selectedLayerId: number,
      nextLayerId:     number,
      nextFloorNum:    number,
      viewport:        { scale, x, y },
    },
    // ...
  ]
}
```

### Migration: version 1 → version 2

On `handleLoad`, detect `state.version < 2` (or missing `factories` key) and wrap:

```js
if (!state.factories) {
  state = {
    version: 2,
    activeFactoryId: 1,
    factories: [{ id: 1, name: state.name ?? 'Factory 1', ...state }],
  }
}
```

Any existing `.json` save file continues to work with no data loss.

### localStorage migration

On first load, if old flat keys (`sp-objects`, `sp-belts`, etc.) exist and `sp-workspace` does not: read old keys, assemble a single-factory workspace, write `sp-workspace`, delete the old keys. One-time migration.

---

## 7. Step-by-Step Implementation Order (Part 1)

### Step 1 — Add `FACTORY_TAB_HEIGHT` constant
Add `export const FACTORY_TAB_HEIGHT = 32` to `constants.js`. Update the Stage container's top offset in `App.jsx` from `TOOLBAR_HEIGHT` to `TOOLBAR_HEIGHT + FACTORY_TAB_HEIGHT`.

### Step 2 — Create `src/useFactories.js`
Implement the `useFactories()` hook with a single blank factory and localStorage persistence under `sp-workspace`. Include the migration from old flat keys. No switching yet — just scaffolding.

### Step 3 — Wire `useFactories` into `App.jsx`
- Call `useFactories()` at the top of `App`.
- On mount, hydrate state from the active factory snapshot via `applyFactorySnapshot`.
- Replace the three separate `localStorage` `useEffect` hooks with a single debounced effect calling `patchActiveFactory(buildFactorySnapshot())`.
- Remove the `loadLayerState` auto-persist `useEffect` from `useLayers`.

### Step 4 — Add `applyFactorySnapshot()` and refactor handle functions
Replace the ad-hoc restore sequences in `handleNew`, `handleLoad`, and `handleLoadDemo` with `applyFactorySnapshot`. No behaviour change, just consolidation.

### Step 5 — Create `src/FactoryTabBar.jsx`
Implement the tab strip component:
```js
function FactoryTabBar({ factories, activeFactoryId, onSwitch, onAdd, onRename, onDelete, onDuplicate })
```
Use the existing `LayerItem` inline-rename pattern. Style matches the dark navy theme.

### Step 6 — Wire `FactoryTabBar` into `App.jsx`
Render `<FactoryTabBar>` between Toolbar and Stage. `onSwitch` handler:
1. Save current state: `patchActiveFactory(buildFactorySnapshot())`
2. Call `switchFactory(id)`
3. Call `applyFactorySnapshot(factories.find(f => f.id === id))`
4. Reset undo: `historyRef.current = []`

### Step 7 — Update File menu for workspace save/load
Update `buildStateBlob()` to produce a version 2 multi-factory blob. Update `handleLoad` to detect and migrate version 1. Update `handleNew` to create a fresh single-factory workspace.

### Step 8 — Wire `EditableTitle` to factory name
Change `onRename` to call `renameFactory(activeFactoryId, newName)` instead of `setFileName`.

### Step 9 — Polish and edge cases
- Guard `deleteFactory`: last factory cannot be deleted (show `×` greyed out)
- Cancel `pendingBelt` before switching factories
- When active factory is deleted, switch to the first remaining factory
- Clipboard (`clipboardRef`): keep shared across factories (useful for copying buildings between them)
- Undo history: clear on factory switch

---

## 8. What Does NOT Change (Part 1)

- Canvas rendering code, `BuildingObject`, `BeltObject`, all Konva layer logic
- `recipes.js`, `buildings.js`, `portUtils.js` (except the new constant in `constants.js`)
- All modals (`RecipeModal`, `FloorInputModal`, etc.)
- The layer system within a factory — layers continue to work exactly as today
- All keyboard shortcuts — work identically within the active factory

---

## 9. Open Design Decisions (Part 1)

1. **Clipboard across factories**: Shared (current plan) vs. per-factory. Shared is useful for copying buildings between factories.
2. **Tab overflow**: Horizontal scroll (simple, start here) vs. overflow dropdown (more polish).
3. **Toolbar title after change**: Show just the active factory name (simplest) vs. `workspaceName > factoryName` breadcrumb.
4. **Viewport reset on switch**: Restore factory's saved viewport (current plan).

---

## Critical Files (Part 1)

| File | What changes |
|---|---|
| `src/App.jsx` | Core logic: most changes land here — state, save/load, render tree |
| `src/LayersPanel.jsx` | Remove autonomous `localStorage` write from `useLayers` |
| `src/Toolbar.jsx` | `EditableTitle` rewired to factory name; `FileMenu` updated for workspace ops |
| `src/constants.js` | New `FACTORY_TAB_HEIGHT` constant |
| `src/useFactories.js` | **New file** — factory management hook |
| `src/FactoryTabBar.jsx` | **New file** — tab strip UI component |

---
---

# Part 2: World View

## Overview

World View is a second top-level canvas mode that shows all factories as interactive squares connected by directed bus lines. Each bus carries a single item type; factories tap in/out of buses at any point along their length. Flow rates are calculated segment-by-segment. The user switches between World View and the active factory view via a **View** menu item ("Show World"). Double-clicking a factory square in World View enters that factory's canvas.

---

## 10. Concepts

| Term | Meaning |
|---|---|
| **World canvas** | The Konva stage rendered in World View mode |
| **World factory** | A factory's representation in the world canvas — a rect with connectors and item icons |
| **Bus** | A straight horizontal or vertical line on the world canvas carrying one item type |
| **Tap** | A connection from a world factory's connector to a point on a bus |
| **Segment** | The portion of a bus between two adjacent taps (or between a tap and a bus endpoint) |
| **Flow** | Net items/min at a given segment, computed from all upstream taps |
| **Unplaced factory** | A factory that exists in `useFactories` but has no world position yet |

---

## 11. Data Structures

### WorldFactory

```js
{
  factoryId:  number,             // foreign key → FactorySnapshot.id
  x:          number,             // world canvas position (grid-snapped)
  y:          number,
  connectors: [                   // ordered list of inputs + outputs
    {
      id:       number,           // unique within this factory
      side:     'north'|'south'|'east'|'west',
      offset:   number,           // grid cells from center of that side
      kind:     'belt'|'pipe',
      flow:     'in'|'out',       // input (consumes) or output (produces)
      item:     string,           // item name e.g. 'Iron Plate'
      perMin:   number,           // rate at 100%
    },
  ],
}
```

Size (w/h in grid cells) is derived from the number of connectors, not fixed — see §12.

### Bus

```js
{
  id:        number,
  item:      string,             // item type this bus carries (e.g. 'Iron Plate')
  axis:      'h'|'v',           // horizontal or vertical
  // position defined by two endpoints on the world grid:
  x1: number, y1: number,
  x2: number, y2: number,
  // x1===x2 when axis='v'; y1===y2 when axis='h'
}
```

Buses are drawn as thick lines (same visual style as belts in factory view, but wider and labeled with the item name).

### Tap

```js
{
  id:          number,
  busId:       number,
  factoryId:   number,
  connectorId: number,           // which connector on the world factory
  snapPos:     number,           // snapped position along bus axis (grid cells)
  // flow direction is determined by connector.flow:
  //   'out' = factory puts items onto bus (adds to flow downstream)
  //   'in'  = factory takes items from bus (subtracts from flow downstream)
}
```

The short visual line from the factory connector to the bus snap point is drawn automatically (not user-controlled).

### WorldState (persisted in workspace)

```js
{
  worldFactories:  WorldFactory[],
  buses:           Bus[],
  taps:            Tap[],
  nextWorldId:     number,       // shared counter for bus/tap/connector ids
  viewport:        { scale, x, y },
}
```

`WorldState` is stored at the workspace level (alongside `factories[]`), not inside any individual factory snapshot.

---

## 12. World Factory Visual Design

Each world factory is a Konva `Group` containing:

1. **Body rect** — width/height sized to fit connectors (minimum 6×6 grid cells; grows to accommodate connector count). Same semi-transparent fill + solid stroke style as buildings in factory view.
2. **Label** — factory name, centered in the body.
3. **Connectors** — small squares on the edges (same style as building connectors in factory view). Belt connectors are orange-tinted; pipe connectors are blue-tinted.
4. **Item icons** — text labels (item name abbreviation + `/min` rate) floating just outside each connector. Inputs shown on one side, outputs on the other.
5. **Selection rect** — dashed outline when selected, same as factory view.

### Connector layout rules
- Outputs on the **north** edge (top), inputs on the **south** edge (bottom) — matching the factory view convention.
- If a factory has both belt and pipe connectors on the same side, they are separated by 1 cell of padding.
- Minimum body size expands to never overlap connector labels.

---

## 13. Bus Visual Design

- Drawn as a thick Konva `Line` (4px stroke in factory view belt color, slightly wider for world scale).
- Label showing item name floats above/beside the midpoint of the bus.
- Each **segment** (between taps, or between a tap and an endpoint) displays its net flow rate (items/min) as a small label mid-segment.
- Segment color encodes flow:
  - Positive flow (items moving): belt orange `#e87c13`
  - Zero flow: muted `#7aabcc`
  - Negative flow (over-consumed — error state): red `#e84c13`
- Bus endpoints have small arrow indicators showing the flow direction.

---

## 14. Flow Calculation

For each bus, compute an ordered list of taps sorted by their `snapPos` along the bus axis. Then walk from position 0 to end, accumulating net flow:

```
segments = []
flow = 0
prevPos = busStart

for tap in sortedTaps:
  segments.push({ from: prevPos, to: tap.snapPos, flow })
  if tap.connector.flow === 'out':
    flow += tap.connector.perMin   // factory outputs to bus
  else:
    flow -= tap.connector.perMin   // factory inputs from bus
  prevPos = tap.snapPos

segments.push({ from: prevPos, to: busEnd, flow })
```

This is pure derived data — recomputed on any change to `buses`, `taps`, or `worldFactories`. No need to persist segment flow values.

---

## 15. Auto-Discovery of Factory I/O

When a factory is dragged from the right panel onto the world canvas for the first time, `discoverFactoryIO(snapshot)` runs:

1. For each `object` in the factory snapshot, look up `RECIPES_BY_ID[object.recipeId]` (if a recipe is assigned).
2. Sum all recipe `outputs` → candidate factory outputs (items produced per minute at 100%).
3. Sum all recipe `inputs` → candidate factory inputs (items consumed per minute).
4. Cross-check: if an item appears as both an output of one building and an input of another building in the same factory, it is an **internal** item — exclude it from the world-facing connectors.
5. Return `{ inputs: [{item, perMin}], outputs: [{item, perMin}] }`.

The result is used to populate the initial `connectors[]` on the `WorldFactory`. The user can then add, remove, or edit connectors via the right panel.

**Note:** If a factory has no recipes assigned yet, `discoverFactoryIO` returns empty arrays and the user sets connectors manually.

---

## 16. Right Panel in World View

When world view is active, the right panel (`LayersPanel`) is replaced by `WorldPanel`. Structure:

```
┌─────────────────────────┐
│  [🔍 Search factories]  │
├─────────────────────────┤
│  UNPLACED               │
│  ┌──────────────────┐   │  ← drag these onto canvas
│  │ Iron Factory     │   │
│  │ Oil Processing   │   │
│  └──────────────────┘   │
├─────────────────────────┤
│  ALL FACTORIES          │
│  ● Iron Factory    ↗    │  ← click ↗ to jump to factory view
│  ● Oil Processing  ↗    │
│  ● Steel Works     ↗    │
├─────────────────────────┤
│  BUSES           [+ Add]│
│  ─── Iron Plate         │
│  ─── Steel Beam         │
│  ─── [empty]            │
├─────────────────────────┤
│  SELECTED FACTORY       │  ← shown only when a factory is selected
│  Name: Iron Factory     │
│  OUTPUTS:               │
│    Iron Plate  120/min  │
│    [+ Add output]       │
│  INPUTS:                │
│    Iron Ore   120/min   │
│    [+ Add input]        │
└─────────────────────────┘
```

- **Search** filters both Unplaced and All Factories lists.
- **Unplaced** cards are draggable onto the world canvas (HTML drag-and-drop → Konva drop zone).
- **All Factories** list: clicking a row selects it; clicking ↗ switches to that factory's canvas.
- **Buses** list: clicking a bus selects it on canvas; `+ Add` opens a small dialog to pick item type and orientation.
- **Selected Factory** section: inline-editable item names and rates; `+ Add` appends a new connector.

---

## 17. Interactions in World View

| Action | Effect |
|---|---|
| Left drag (pan tool) | Pan world viewport |
| Middle drag | Pan world viewport |
| Scroll | Zoom world viewport |
| Click factory square | Select it; show details in right panel |
| Double-click factory square | Exit world view, enter that factory's canvas |
| Drag unplaced factory card → canvas | Place factory; run `discoverFactoryIO`; create `WorldFactory` |
| Click-drag factory square | Move factory (grid-snapped); taps recompute snap positions |
| Drag factory connector → bus | Create tap; snaps to nearest grid point on bus |
| Click bus | Select bus; show in right panel |
| Click-drag bus endpoint | Extend or shorten bus |
| `Delete` / `Backspace` | Delete selected factory (removes from world, not from `useFactories`) or bus (removes all taps on it) |
| `Escape` | Deselect |

---

## 18. Navigation

### View menu (new addition to Toolbar `FileMenu` or a separate `ViewMenu`)

```
View
  ✓ Factory View    (active factory canvas)
    World View
```

- Switching to World View saves the current factory viewport, then renders `<WorldCanvas>` in place of the factory canvas.
- The factory tab bar remains visible (to show which factory is "active" for when you return).
- Switching back to Factory View restores the active factory.

### Keyboard shortcut

`W` — toggle World View / Factory View (analogous to `H`/`V` for pan/pointer).

---

## 19. Step-by-Step Implementation Order (Part 2)

**Prerequisites:** Part 1 (Steps 1–9) must be complete before starting Part 2.

### Step 10 — Add world state to workspace data model
- Extend `useFactories` to also persist `WorldState` in `sp-workspace`.
- Add `worldFactories: []`, `buses: []`, `taps: []`, `nextWorldId: 1`, `worldViewport: { scale: 0.25, x: 0, y: 0 }` to the root workspace (not inside any factory snapshot).
- Add updater functions: `setWorldFactories`, `setBuses`, `setTaps`, `patchWorldState`.

### Step 11 — Create `src/WorldCanvas.jsx`
- Konva Stage with its own viewport state (separate from factory viewport).
- Renders `WorldFactoryNode` and `BusNode` components (see below).
- Accepts `worldFactories`, `buses`, `taps` as props; dispatches updates via callbacks.
- Initially renders nothing (no factories placed yet).

### Step 12 — Create `src/WorldFactoryNode.jsx`
- Konva Group rendering the factory body, connectors, and item icon labels.
- Connector hit targets are large enough to click/drag from.
- Props: `worldFactory`, `factoryName`, `selected`, `onSelect`, `onDoubleClick`, `onMove`, `onConnectorDragStart`.

### Step 13 — Create `src/BusNode.jsx`
- Konva Group rendering the bus line, segment flow labels, and endpoint arrows.
- Computes segment flow from taps on render (pure derived data).
- Props: `bus`, `taps`, `worldFactories`, `selected`, `onSelect`.

### Step 14 — Implement tap drawing interaction
- When user drags from a `WorldFactoryNode` connector, show a preview line.
- On release over a bus, compute `snapPos` (nearest grid point on bus axis within bus bounds), create a `Tap`, update state.
- Validate: connector item must match bus item (show error indicator if mismatch).

### Step 15 — Create `src/WorldPanel.jsx`
- Right panel component for world view.
- Sections: Search, Unplaced, All Factories, Buses, Selected Factory details.
- Wires `discoverFactoryIO` on factory drop.

### Step 16 — Implement `discoverFactoryIO`
- Pure function in `src/worldUtils.js`.
- Input: `FactorySnapshot`. Output: `{ inputs, outputs }`.
- Logic: scan objects → recipes → net external items (excluding internal flows).

### Step 17 — Wire View menu toggle
- Add `viewMode: 'factory'|'world'` state to `App.jsx`.
- Add View menu (or extend existing toolbar menu) with "Show World" / "Show Factory" option and `W` keybinding.
- Render `<WorldCanvas>` + `<WorldPanel>` when `viewMode === 'world'`; existing canvas + `<LayersPanel>` otherwise.

### Step 18 — Implement drag-from-panel to canvas (place factory)
- Drag a card from `WorldPanel` unplaced list → drop on `WorldCanvas`.
- Convert drop coordinates to world canvas coordinates.
- Run `discoverFactoryIO`, create `WorldFactory` entry, add to `worldFactories`.

### Step 19 — Bus creation flow
- `+ Add` in panel: opens inline form to pick item name and H/V orientation.
- After confirm, user clicks-and-drags on the world canvas to draw the bus line (snapped to grid).

### Step 20 — Polish and edge cases
- Deleting a factory from `useFactories` also removes its `WorldFactory` entry and all its taps.
- Moving a factory re-renders tap connection lines immediately.
- Negative-flow segments show red color + warning icon.
- Bus label collision avoidance (offset label if it overlaps a tap label).
- Persist `worldViewport` in `sp-workspace` so world view position is restored on reload.

---

## 20. What Does NOT Change (Part 2)

- All factory view rendering, interactions, and state — untouched.
- `recipes.js`, `buildings.js` — read-only by `discoverFactoryIO`.
- The layer system, undo/redo — world view has no undo (keep it simple initially).
- Save/load file format versioning — `WorldState` is additive; old version 2 files load fine (world state defaults to empty).

---

## 21. Open Design Decisions (Part 2)

1. **Bus length extension**: Can a bus be extended after creation by dragging its endpoint, or is it fixed-length and the user deletes/redraws it?
2. **Tap connection line style**: Should the short line from factory connector to bus be straight (90° elbow) or diagonal? Elbow is cleaner.
3. **Undo in world view**: Initially skipped; add later if needed.
4. **Factory size in world view**: Auto-sized from connector count (current plan) vs. user-resizable.
5. **Bus item validation on tap**: Hard-reject (prevent connection) vs. soft-warn (allow but show error). Soft-warn is more flexible during planning.

---

## Critical Files (Part 2)

| File | What changes |
|---|---|
| `src/App.jsx` | `viewMode` state; View menu; conditional render of world vs factory canvas |
| `src/useFactories.js` | Add `WorldState` persistence |
| `src/constants.js` | Any new world view constants (world grid size, bus line width, etc.) |
| `src/WorldCanvas.jsx` | **New file** — world view Konva stage |
| `src/WorldFactoryNode.jsx` | **New file** — factory square Konva component |
| `src/BusNode.jsx` | **New file** — bus line Konva component |
| `src/WorldPanel.jsx` | **New file** — right panel for world view |
| `src/worldUtils.js` | **New file** — `discoverFactoryIO`, flow calculation helpers |
