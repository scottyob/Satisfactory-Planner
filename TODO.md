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