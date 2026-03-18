// Satisfactory 1.0 – Building definitions
// Source: satisfactory.wiki.gg (March 2026)
//
// Each building object:
//   key       – unique camelCase key (matches recipe.building)
//   label     – short display label
//   color     – hex color for canvas rendering
//   w         – width in grid cells (foundations)
//   h         – height in grid cells (foundations)
//   inputs    – [{ type, position }]   type: 'belt' | 'pipe'
//   outputs   – [{ type, position }]   type: 'belt' | 'pipe'
//
// position is { side: 'north'|'south'|'east'|'west', offset: number }
// where offset is in grid cells from the center of that side.
// Positive offset = east (on N/S sides) or south (on E/W sides).
// Convention: inputs enter from the south (bottom), outputs exit from the north (top).
// Positions are approximate — derived from game knowledge, not blueprint data.

const BUILDINGS = [

  {
    key:    'smelter',
    label:  'Smelter',
    color:  '#e87c13',
    w: 5,
    h: 9,
    inputs: [
      { type: 'belt', position: { side: 'south', offset: 0 } },
    ],
    outputs: [
      { type: 'belt', position: { side: 'north', offset: 0 } },
    ],
  },

  {
    key:    'foundry',
    label:  'Foundry',
    color:  '#c06a10',
    w: 10,
    h: 9,
    inputs: [
      { type: 'belt', position: { side: 'south', offset: -2 } },
      { type: 'belt', position: { side: 'south', offset:  2 } },
    ],
    outputs: [
      { type: 'belt', position: { side: 'north', offset: 0 } },
    ],
  },

  {
    key:    'constructor',
    label:  'Constructor',
    color:  '#e87c13',
    w: 8,
    h: 10,
    inputs: [
      { type: 'belt', position: { side: 'south', offset: 0 } },
    ],
    outputs: [
      { type: 'belt', position: { side: 'north', offset: 0 } },
    ],
  },

  {
    key:    'assembler',
    label:  'Assembler',
    color:  '#4a9eda',
    w: 10,
    h: 15,
    inputs: [
      { type: 'belt', position: { side: 'south', offset: -2 } },
      { type: 'belt', position: { side: 'south', offset:  2 } },
    ],
    outputs: [
      { type: 'belt', position: { side: 'north', offset: 0 } },
    ],
  },

  {
    key:    'manufacturer',
    label:  'Manufacturer',
    color:  '#3a7abf',
    w: 18,
    h: 20,
    inputs: [
      { type: 'belt', position: { side: 'south', offset: -6 } },
      { type: 'belt', position: { side: 'south', offset: -2 } },
      { type: 'belt', position: { side: 'south', offset:  2 } },
      { type: 'belt', position: { side: 'south', offset:  6 } },
    ],
    outputs: [
      { type: 'belt', position: { side: 'north', offset: 0 } },
    ],
  },

  {
    key:    'refinery',
    label:  'Refinery',
    color:  '#2a9d8f',
    w: 10,
    h: 20,
    inputs: [
      { type: 'belt', position: { side: 'south', offset: -2 } },
      { type: 'pipe', position: { side: 'south', offset:  2 } },
    ],
    outputs: [
      { type: 'belt', position: { side: 'north', offset: -2 } },
      { type: 'pipe', position: { side: 'north', offset:  2 } },
    ],
  },

  {
    key:    'blender',
    label:  'Blender',
    color:  '#21867a',
    w: 18,
    h: 16,
    inputs: [
      { type: 'belt', position: { side: 'south', offset: -6 } },
      { type: 'belt', position: { side: 'south', offset: -2 } },
      { type: 'pipe', position: { side: 'south', offset:  2 } },
      { type: 'pipe', position: { side: 'south', offset:  6 } },
    ],
    outputs: [
      { type: 'belt', position: { side: 'north', offset: -3 } },
      { type: 'pipe', position: { side: 'north', offset:  3 } },
    ],
  },

  {
    key:    'packager',
    label:  'Packager',
    color:  '#e9c46a',
    w: 8,
    h: 8,
    inputs: [
      { type: 'belt', position: { side: 'south', offset: -1 } },
      { type: 'pipe', position: { side: 'south', offset:  1 } },
    ],
    outputs: [
      { type: 'belt', position: { side: 'north', offset: -1 } },
      { type: 'pipe', position: { side: 'north', offset:  1 } },
    ],
  },

  {
    key:    'particleAccelerator',
    label:  'Part. Accel.',
    color:  '#9b5de5',
    w: 26,
    h: 38,
    inputs: [
      { type: 'belt', position: { side: 'south', offset: -8 } },
      { type: 'belt', position: { side: 'south', offset:  0 } },
      { type: 'pipe', position: { side: 'south', offset:  8 } },
    ],
    outputs: [
      { type: 'belt', position: { side: 'north', offset: 0 } },
    ],
  },

  {
    key:    'quantumEncoder',
    label:  'Quantum Enc.',
    color:  '#7b2d8b',
    w: 20,
    h: 20,
    inputs: [
      { type: 'belt', position: { side: 'south', offset: -6 } },
      { type: 'belt', position: { side: 'south', offset: -2 } },
      { type: 'belt', position: { side: 'south', offset:  2 } },
      { type: 'pipe', position: { side: 'south', offset:  6 } },
    ],
    outputs: [
      { type: 'belt', position: { side: 'north', offset: -3 } },
      { type: 'pipe', position: { side: 'north', offset:  3 } },
    ],
  },

  {
    key:    'converter',
    label:  'Converter',
    color:  '#f4a261',
    w: 10,
    h: 10,
    inputs: [
      { type: 'belt', position: { side: 'south', offset: -2 } },
      { type: 'belt', position: { side: 'south', offset:  2 } },
    ],
    outputs: [
      { type: 'belt', position: { side: 'north', offset: -2 } },
      { type: 'belt', position: { side: 'north', offset:  2 } },
    ],
  },

]

export default BUILDINGS
export const BUILDINGS_BY_KEY = Object.fromEntries(BUILDINGS.map(b => [b.key, b]))
