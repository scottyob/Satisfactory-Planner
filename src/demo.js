const DEMO_STATE = {
  version: 1,
  objects: [
    { id: 1, type: 'floor_input', layerId: 1, rotation: 0,   x: 4600, y: 5080, item: 'Iron Ore', ratePerMin: 120 },
    { id: 2, type: 'splitter',    layerId: 1, rotation: 90,  x: 4880, y: 5080 },
    { id: 3, type: 'splitter',    layerId: 1, rotation: 90,  x: 5120, y: 5080 },
    { id: 4, type: 'smelter',     layerId: 1, rotation: 0,   x: 4880, y: 4760, recipeId: 'ironIngot', clockSpeed: 1 },
    { id: 5, type: 'smelter',     layerId: 1, rotation: 0,   x: 5120, y: 4760, recipeId: 'ironIngot', clockSpeed: 1 },
    { id: 6, type: 'smelter',     layerId: 1, rotation: 180, x: 4880, y: 5400, recipeId: 'ironIngot', clockSpeed: 1 },
  ],
  nextObjId: 8,
  belts: [
    { id: 2,  layerId: 1, fromObjId: 1, fromPortIdx: 0, toObjId: 2, toPortIdx: 0 },
    { id: 4,  layerId: 1, fromObjId: 2, fromPortIdx: 0, toObjId: 3, toPortIdx: 0 },
    { id: 6,  layerId: 1, fromObjId: 2, fromPortIdx: 2, toObjId: 4, toPortIdx: 0 },
    { id: 8,  layerId: 1, fromObjId: 3, fromPortIdx: 2, toObjId: 5, toPortIdx: 0 },
    { id: 14, layerId: 1, fromObjId: 2, fromPortIdx: 1, toObjId: 6, toPortIdx: 0 },
  ],
  nextBeltId: 15,
  layers: [{ id: 1, name: 'Floor 1', visible: true }],
  selectedLayerId: 1,
  nextLayerId: 2,
  nextFloorNum: 2,
  viewport: { scale: 0.71, x: -2959, y: -3015 },
}

export default DEMO_STATE
