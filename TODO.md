# TODO

## Bugs
- [x] Marquee select doesn't select

## Next
- [x] Last known state should be in memory
- [x] Save and Load buttons in the toolbar
        On loading, we should replace "Satisfactory Planner" with the file name.  Save should default to this.
- [x] Shown-but-transparent (overlay) layers from other floors should NEVER be interactive.  Don't let us select or move them.
- [x] Buildings should be a tab in an "Add" section at the bottom, and, just show up as a list (with icon preview to their right)
- [x] Add section should also include "Connectors" section with "Floor Input" and "Floor output" building (2x2)
- [x] "Connectors" should also have pipe and conveyor splitters/mergers.  These will likely needed to be added as additional special buildings?

## Belt Connections
- [x] Port position utility (getPortWorldPos)
- [x] Connection point building definition
- [x] Belt data model + save/load
- [x] Port click detection (make connector markers interactive)
- [x] Belt creation drag (pending belt preview)
- [x] Port snap + highlight during drag
- [x] Belt rendering (BeltObject, thick rect)
- [x] Belt animation (flowing chevrons via rAF + direct Konva node mutation)
- [x] Connection point auto-creation on empty drop
- [x] Belt selection + Delete key
- [x] Occupied port enforcement

## Belt System Notes (for future work)

### How it works
Belts are stored as `{ id, layerId, fromObjId, fromPortIdx, toObjId, toPortIdx }` in `belts[]` state
(persisted to localStorage under `sp-belts`). They are separate from `objects[]`.

**Drawing flow:**
1. Mousedown on an output port connector → `handlePortMouseDown` sets `pendingBelt` state
   (start world pos, port type, current cursor pos)
2. Native `window` mousemove updates `pendingBelt.cx/cy` — the orange preview line follows
3. Native `window` mouseup runs `findNearestInputPort` within `SNAP_DISTANCE = 3 cells`.
   - Snap found → push a new belt to `belts[]`
   - No snap → auto-create a `connection_point` object and belt to it

**Rendering:**
- `BeltObject` takes `{ fromObjId, fromPortIdx, toObjId, toPortIdx }`, resolves world positions
  via `getPortWorldPos`, then renders a rotated `Rect` centered between the two endpoints.
- Chevrons are drawn each rAF frame via a Konva `Shape` sceneFunc that reads `offsetRef.current`
  directly — no React state touched, so it never causes re-renders.

**Port positions:**
- `getPortWorldPos(obj, portDef)` computes the world-space attachment point from the building's
  center + rotation + `{ side, offset }` — all in `portUtils.js`.
- `connection_point` is a special case: always returns the object's own center (belts run to the
  middle of the circle).

**Key gotcha fixed during dev:**
- `ConnectorMarker` Group had `listening={false}` which silently blocked its child `Rect` from
  receiving clicks — the bug that made output ports unclickable. Fix: `listening={interactive}`.

### Potential future improvements
- Belt routing: straight lines look wrong when buildings are close/overlapping. Consider elbow
  routing (L-shaped or S-curved paths) using a custom `sceneFunc` or SVG path.
- Multi-segment belts: right now each belt is one straight segment. Waypoint chains work but
  require chaining multiple connection_points manually. Could auto-route around buildings.
- Belt labels: show items/min on the belt at zoom levels above ~50%.
- Pipe belts: currently pipes use the same BeltObject renderer. Could differentiate visually
  (rounded ends, blue tint, flow bubbles instead of chevrons).